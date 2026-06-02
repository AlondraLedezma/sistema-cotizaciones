<?php

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/database.php';
requireAuth();

$input  = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $input['action'] ?? '';

try {
    switch ($action) {
        case 'list':
            handleList();
            break;
        case 'create':
            handleCreate($input);
            break;
        case 'update':
            handleUpdate($input);
            break;
        case 'delete':
            handleDelete($input);
            break;
        case 'reorder':
            handleReorder($input);
            break;
        default:
            jsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}

function handleList(): void
{
    $seccionId = intval($_GET['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("SELECT * FROM sub_secciones WHERE seccion_id = ? ORDER BY orden ASC");
    $stmt->execute([$seccionId]);
    $subSecciones = $stmt->fetchAll();

    jsonResponse(['success' => true, 'sub_secciones' => $subSecciones]);
}

function handleCreate(array $input): void
{
    $seccionId = intval($input['seccion_id'] ?? 0);
    $titulo    = trim($input['titulo'] ?? '');
    $color     = trim($input['color']  ?? '#DAA520');

    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }
    if ($titulo === '') {
        jsonResponse(['success' => false, 'error' => 'El título es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT COALESCE(MAX(orden), 0) AS max_ord FROM sub_secciones WHERE seccion_id = ?");
    $stmt->execute([$seccionId]);
    $orden = intval($stmt->fetchColumn()) + 1;

    if (isset($input['orden'])) {
        $orden = intval($input['orden']);
    }

    $stmt = $pdo->prepare(
        "INSERT INTO sub_secciones (seccion_id, titulo, color, orden) VALUES (?, ?, ?, ?)"
    );
    $stmt->execute([$seccionId, $titulo, $color, $orden]);
    $id = intval($pdo->lastInsertId());

    $stmt = $pdo->prepare("SELECT * FROM sub_secciones WHERE id = ?");
    $stmt->execute([$id]);
    $subSeccion = $stmt->fetch();

    jsonResponse(['success' => true, 'sub_seccion' => $subSeccion]);
}

function handleUpdate(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM sub_secciones WHERE id = ?");
    $stmt->execute([$id]);
    $current = $stmt->fetch();
    if (!$current) {
        jsonResponse(['success' => false, 'error' => 'Sub-sección no encontrada'], 404);
    }

    $titulo = isset($input['titulo']) ? trim($input['titulo']) : $current['titulo'];
    $color  = isset($input['color'])  ? trim($input['color'])  : $current['color'];

    $stmt = $pdo->prepare("UPDATE sub_secciones SET titulo = ?, color = ? WHERE id = ?");
    $stmt->execute([$titulo, $color, $id]);

    jsonResponse(['success' => true]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("UPDATE partidas_equipo SET sub_seccion_id = NULL WHERE sub_seccion_id = ?");
    $stmt->execute([$id]);

    $stmt = $pdo->prepare("DELETE FROM sub_secciones WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

function handleReorder(array $input): void
{
    $items = $input['items'] ?? [];
    if (empty($items) || !is_array($items)) {
        jsonResponse(['success' => false, 'error' => 'items es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("UPDATE sub_secciones SET orden = ? WHERE id = ?");

    $pdo->beginTransaction();
    try {
        foreach ($items as $item) {
            $itemId = intval($item['id']    ?? 0);
            $orden  = intval($item['orden'] ?? 0);
            if ($itemId <= 0) continue;
            $stmt->execute([$orden, $itemId]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['success' => true]);
}

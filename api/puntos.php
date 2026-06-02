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
        case 'batch_update':
            handleBatchUpdate($input);
            break;
        default:
            jsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}

function validTipos(): array
{
    return ['prese_alcance1', 'prese_alcance2', 'listas'];
}

function generarNumeroPunto(string $tipo, int $nextOrden): string
{
    switch ($tipo) {
        case 'prese_alcance1':
            return 'A1.' . $nextOrden;
        case 'prese_alcance2':
            return 'A2.' . $nextOrden;
        case 'listas':
        default:
            return (string) $nextOrden;
    }
}

function renumberPuntos(PDO $pdo, int $proyectoId, string $tipo): void
{
    $stmt = $pdo->prepare(
        "SELECT id FROM puntos_texto WHERE proyecto_id = ? AND tipo = ? ORDER BY orden ASC"
    );
    $stmt->execute([$proyectoId, $tipo]);
    $rows = $stmt->fetchAll();

    $updateStmt = $pdo->prepare(
        "UPDATE puntos_texto SET numero_punto = ?, orden = ? WHERE id = ?"
    );

    foreach ($rows as $index => $row) {
        $newOrden = $index + 1;
        $newNum   = generarNumeroPunto($tipo, $newOrden);
        $updateStmt->execute([$newNum, $newOrden, $row['id']]);
    }
}

function handleList(): void
{
    $proyectoId = intval($_GET['proyecto_id'] ?? 0);
    $tipo       = $_GET['tipo'] ?? '';

    if ($proyectoId <= 0) {
        jsonResponse(['success' => false, 'error' => 'proyecto_id es requerido'], 400);
    }
    if (!in_array($tipo, validTipos(), true)) {
        jsonResponse(['success' => false, 'error' => 'tipo no válido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare(
        "SELECT * FROM puntos_texto WHERE proyecto_id = ? AND tipo = ? ORDER BY orden ASC"
    );
    $stmt->execute([$proyectoId, $tipo]);
    $puntos = $stmt->fetchAll();

    jsonResponse(['success' => true, 'puntos' => $puntos]);
}

function handleCreate(array $input): void
{
    $proyectoId = intval($input['proyecto_id'] ?? 0);
    $tipo       = $input['tipo']      ?? '';
    $contenido  = $input['contenido'] ?? '';

    if ($proyectoId <= 0) {
        jsonResponse(['success' => false, 'error' => 'proyecto_id es requerido'], 400);
    }
    if (!in_array($tipo, validTipos(), true)) {
        jsonResponse(['success' => false, 'error' => 'tipo no válido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare(
        "SELECT COALESCE(MAX(orden), 0) AS max_ord FROM puntos_texto WHERE proyecto_id = ? AND tipo = ?"
    );
    $stmt->execute([$proyectoId, $tipo]);
    $nextOrden   = intval($stmt->fetchColumn()) + 1;
    $numeroPunto = generarNumeroPunto($tipo, $nextOrden);

    $stmt = $pdo->prepare(
        "INSERT INTO puntos_texto (proyecto_id, tipo, numero_punto, contenido, orden)
         VALUES (?, ?, ?, ?, ?)"
    );
    $stmt->execute([$proyectoId, $tipo, $numeroPunto, $contenido, $nextOrden]);
    $id = intval($pdo->lastInsertId());

    $stmt = $pdo->prepare("SELECT * FROM puntos_texto WHERE id = ?");
    $stmt->execute([$id]);
    $punto = $stmt->fetch();

    jsonResponse(['success' => true, 'punto' => $punto]);
}

function handleUpdate(array $input): void
{
    $id        = intval($input['id'] ?? 0);
    $contenido = $input['contenido'] ?? null;

    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }
    if ($contenido === null) {
        jsonResponse(['success' => false, 'error' => 'contenido es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("UPDATE puntos_texto SET contenido = ? WHERE id = ?");
    $stmt->execute([$contenido, $id]);

    jsonResponse(['success' => true]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT proyecto_id, tipo FROM puntos_texto WHERE id = ?");
    $stmt->execute([$id]);
    $row = $stmt->fetch();
    if (!$row) {
        jsonResponse(['success' => false, 'error' => 'Punto no encontrado'], 404);
    }

    $stmt = $pdo->prepare("DELETE FROM puntos_texto WHERE id = ?");
    $stmt->execute([$id]);

    renumberPuntos($pdo, intval($row['proyecto_id']), $row['tipo']);

    jsonResponse(['success' => true]);
}

function handleBatchUpdate(array $input): void
{
    $puntos = $input['puntos'] ?? [];
    if (empty($puntos) || !is_array($puntos)) {
        jsonResponse(['success' => false, 'error' => 'puntos es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("UPDATE puntos_texto SET contenido = ? WHERE id = ?");

    $pdo->beginTransaction();
    try {
        foreach ($puntos as $p) {
            $pid       = intval($p['id'] ?? 0);
            $contenido = $p['contenido'] ?? '';
            if ($pid <= 0) continue;
            $stmt->execute([$contenido, $pid]);
        }
        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['success' => true]);
}

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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $_POST['action'] ?? $input['action'] ?? '';

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

function handleList(): void
{
    $proyectoId = intval($_GET['proyecto_id'] ?? 0);
    if ($proyectoId <= 0) {
        jsonResponse(['success' => false, 'error' => 'proyecto_id es requerido'], 400);
    }

    $pdo = getConnection();
    $stmt = $pdo->prepare("SELECT * FROM condiciones_comerciales WHERE proyecto_id = ? ORDER BY orden ASC");
    $stmt->execute([$proyectoId]);
    $condiciones = $stmt->fetchAll();

    jsonResponse(['success' => true, 'condiciones' => $condiciones]);
}

function handleCreate(array $input): void
{
    $proyectoId = intval($input['proyecto_id'] ?? 0);
    $contenido = trim($input['contenido'] ?? '');

    if ($proyectoId <= 0) {
        jsonResponse(['success' => false, 'error' => 'proyecto_id es requerido'], 400);
    }
    if (empty($contenido)) {
        jsonResponse(['success' => false, 'error' => 'contenido es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT COALESCE(MAX(orden), 0) as max_orden FROM condiciones_comerciales WHERE proyecto_id = ?");
    $stmt->execute([$proyectoId]);
    $maxOrden = intval($stmt->fetch()['max_orden']);
    $newOrden = $maxOrden + 1;

    $codigo = 'A3.' . $newOrden;

    $stmt = $pdo->prepare("INSERT INTO condiciones_comerciales (proyecto_id, codigo, contenido, orden) VALUES (?, ?, ?, ?)");
    $stmt->execute([$proyectoId, $codigo, $contenido, $newOrden]);

    $id = $pdo->lastInsertId();

    $stmt = $pdo->prepare("SELECT * FROM condiciones_comerciales WHERE id = ?");
    $stmt->execute([$id]);
    $condicion = $stmt->fetch();

    jsonResponse(['success' => true, 'condicion' => $condicion]);
}

function handleUpdate(array $input): void
{
    $id = intval($input['id'] ?? 0);
    $contenido = trim($input['contenido'] ?? '');

    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }
    if (empty($contenido)) {
        jsonResponse(['success' => false, 'error' => 'contenido es requerido'], 400);
    }

    $pdo = getConnection();
    $stmt = $pdo->prepare("UPDATE condiciones_comerciales SET contenido = ? WHERE id = ?");
    $stmt->execute([$contenido, $id]);

    if ($stmt->rowCount() === 0) {
        jsonResponse(['success' => false, 'error' => 'Condición no encontrada'], 404);
    }

    jsonResponse(['success' => true]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM condiciones_comerciales WHERE id = ?");
    $stmt->execute([$id]);
    $condicion = $stmt->fetch();

    if (!$condicion) {
        jsonResponse(['success' => false, 'error' => 'Condición no encontrada'], 404);
    }

    $stmt = $pdo->prepare("DELETE FROM condiciones_comerciales WHERE id = ?");
    $stmt->execute([$id]);

    $stmt = $pdo->prepare("SELECT id FROM condiciones_comerciales WHERE proyecto_id = ? ORDER BY orden ASC");
    $stmt->execute([$condicion['proyecto_id']]);
    $remaining = $stmt->fetchAll();

    $updateStmt = $pdo->prepare("UPDATE condiciones_comerciales SET orden = ?, codigo = ? WHERE id = ?");
    foreach ($remaining as $index => $row) {
        $newOrden = $index + 1;
        $newCodigo = 'A3.' . $newOrden;
        $updateStmt->execute([$newOrden, $newCodigo, $row['id']]);
    }

    jsonResponse(['success' => true]);
}

function handleBatchUpdate(array $input): void
{
    $condiciones = $input['condiciones'] ?? [];

    if (empty($condiciones)) {
        jsonResponse(['success' => false, 'error' => 'No se proporcionaron condiciones'], 400);
    }

    $pdo = getConnection();
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("UPDATE condiciones_comerciales SET contenido = ?, codigo = ?, orden = ? WHERE id = ?");

        foreach ($condiciones as $condicion) {
            $id = intval($condicion['id'] ?? 0);
            $contenido = trim($condicion['contenido'] ?? '');
            $codigo = trim($condicion['codigo'] ?? '');
            $orden = intval($condicion['orden'] ?? 0);

            if ($id > 0 && !empty($contenido)) {
                $stmt->execute([$contenido, $codigo, $orden, $id]);
            }
        }

        $pdo->commit();
        jsonResponse(['success' => true]);
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

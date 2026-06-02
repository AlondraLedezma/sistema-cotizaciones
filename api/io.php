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

function handleList(): void
{
    $seccionId = intval($_GET['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("SELECT * FROM partidas_io WHERE seccion_id = ? ORDER BY orden ASC");
    $stmt->execute([$seccionId]);
    $partidas = $stmt->fetchAll();

    jsonResponse(['success' => true, 'partidas' => $partidas]);
}

function handleCreate(array $input): void
{
    $seccionId = intval($input['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT COALESCE(MAX(orden), 0) AS max_ord FROM partidas_io WHERE seccion_id = ?");
    $stmt->execute([$seccionId]);
    $orden = intval($stmt->fetchColumn()) + 1;

    $entrada             = trim($input['entrada']             ?? '');
    $descripcionEntrada  = trim($input['descripcion_entrada'] ?? '');
    $salida              = trim($input['salida']              ?? '');
    $descripcionSalida   = trim($input['descripcion_salida']  ?? '');

    $stmt = $pdo->prepare(
        "INSERT INTO partidas_io (seccion_id, entrada, descripcion_entrada, salida, descripcion_salida, orden)
         VALUES (?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([$seccionId, $entrada, $descripcionEntrada, $salida, $descripcionSalida, $orden]);
    $id = intval($pdo->lastInsertId());

    $stmt = $pdo->prepare("SELECT * FROM partidas_io WHERE id = ?");
    $stmt->execute([$id]);
    $partida = $stmt->fetch();

    jsonResponse(['success' => true, 'partida' => $partida]);
}

function handleUpdate(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM partidas_io WHERE id = ?");
    $stmt->execute([$id]);
    $current = $stmt->fetch();
    if (!$current) {
        jsonResponse(['success' => false, 'error' => 'Partida I/O no encontrada'], 404);
    }

    $merged = array_merge($current, $input);

    $stmt = $pdo->prepare(
        "UPDATE partidas_io SET
            entrada             = ?,
            descripcion_entrada = ?,
            salida              = ?,
            descripcion_salida  = ?,
            orden               = ?
         WHERE id = ?"
    );
    $stmt->execute([
        trim($merged['entrada']             ?? ''),
        trim($merged['descripcion_entrada'] ?? ''),
        trim($merged['salida']              ?? ''),
        trim($merged['descripcion_salida']  ?? ''),
        intval($merged['orden']             ?? $current['orden']),
        $id,
    ]);

    jsonResponse(['success' => true]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("DELETE FROM partidas_io WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

function handleBatchUpdate(array $input): void
{
    $partidas = $input['partidas'] ?? [];
    if (empty($partidas) || !is_array($partidas)) {
        jsonResponse(['success' => false, 'error' => 'partidas es requerido'], 400);
    }

    $pdo = getConnection();
    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("SELECT * FROM partidas_io WHERE id = ?");
        $updateStmt = $pdo->prepare(
            "UPDATE partidas_io SET
                entrada             = ?,
                descripcion_entrada = ?,
                salida              = ?,
                descripcion_salida  = ?,
                orden               = ?
             WHERE id = ?"
        );

        foreach ($partidas as $p) {
            $pid = intval($p['id'] ?? 0);
            if ($pid <= 0) continue;

            $stmt->execute([$pid]);
            $current = $stmt->fetch();
            if (!$current) continue;

            $merged = array_merge($current, $p);

            $updateStmt->execute([
                trim($merged['entrada']             ?? ''),
                trim($merged['descripcion_entrada'] ?? ''),
                trim($merged['salida']              ?? ''),
                trim($merged['descripcion_salida']  ?? ''),
                intval($merged['orden']             ?? $current['orden']),
                $pid,
            ]);
        }

        $pdo->commit();
    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }

    jsonResponse(['success' => true]);
}

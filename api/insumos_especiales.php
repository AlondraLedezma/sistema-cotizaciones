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
        default:
            jsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}

function getTipoCambio(PDO $pdo, int $seccionId): float
{
    $stmt = $pdo->prepare(
        "SELECT p.tipo_cambio_usd
         FROM secciones s
         JOIN proyectos p ON s.proyecto_id = p.id
         WHERE s.id = ?"
    );
    $stmt->execute([$seccionId]);
    $row = $stmt->fetch();
    if (!$row) {
        jsonResponse(['success' => false, 'error' => 'Sección no encontrada'], 404);
    }
    return floatval($row['tipo_cambio_usd']);
}

function calcInsumo(array $data, float $tipoCambio): array
{
    $numPersonas     = intval(floatval($data['num_personas']      ?? 1));
    $costoPorPersona = floatval($data['costo_por_persona'] ?? 0);
    $numVeces        = intval(floatval($data['num_veces']          ?? 1));

    $subtotal = $numPersonas * $costoPorPersona * $numVeces;
    $totalMn  = $subtotal;
    $totalUsd = ($tipoCambio > 0) ? round($totalMn / $tipoCambio, 2) : 0;

    return [
        'num_personas'      => $numPersonas,
        'costo_por_persona' => round($costoPorPersona, 2),
        'num_veces'         => $numVeces,
        'subtotal'          => round($subtotal, 2),
        'total_mn'          => round($totalMn, 2),
        'total_usd'         => $totalUsd,
    ];
}

function handleList(): void
{
    $seccionId = intval($_GET['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare(
        "SELECT * FROM partidas_insumos_especiales WHERE seccion_id = ? ORDER BY orden ASC"
    );
    $stmt->execute([$seccionId]);
    $partidas = $stmt->fetchAll();

    jsonResponse(['success' => true, 'partidas' => $partidas]);
}

function handleCreate(array $input): void
{
    $seccionId = intval($input['seccion_id'] ?? 0);
    $tipo      = $input['tipo'] ?? '';

    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }
    if (!in_array($tipo, ['hospedaje', 'imss'], true)) {
        jsonResponse(['success' => false, 'error' => 'tipo debe ser hospedaje o imss'], 400);
    }

    $pdo       = getConnection();
    $tipoCambio = getTipoCambio($pdo, $seccionId);
    $calc      = calcInsumo($input, $tipoCambio);

    $stmt = $pdo->prepare(
        "SELECT COALESCE(MAX(orden), 0) AS max_ord FROM partidas_insumos_especiales WHERE seccion_id = ?"
    );
    $stmt->execute([$seccionId]);
    $orden = intval($stmt->fetchColumn()) + 1;

    $descripcion = trim($input['descripcion'] ?? '');

    $stmt = $pdo->prepare(
        "INSERT INTO partidas_insumos_especiales
            (seccion_id, tipo, descripcion, num_personas, costo_por_persona, num_veces, subtotal, total_mn, total_usd, orden)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)"
    );
    $stmt->execute([
        $seccionId, $tipo, $descripcion,
        $calc['num_personas'], $calc['costo_por_persona'], $calc['num_veces'],
        $calc['subtotal'], $calc['total_mn'], $calc['total_usd'],
        $orden,
    ]);
    $id = intval($pdo->lastInsertId());

    $stmt = $pdo->prepare("SELECT * FROM partidas_insumos_especiales WHERE id = ?");
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

    $stmt = $pdo->prepare("SELECT * FROM partidas_insumos_especiales WHERE id = ?");
    $stmt->execute([$id]);
    $current = $stmt->fetch();
    if (!$current) {
        jsonResponse(['success' => false, 'error' => 'Insumo especial no encontrado'], 404);
    }

    $seccionId  = intval($current['seccion_id']);
    $tipoCambio = getTipoCambio($pdo, $seccionId);
    $merged     = array_merge($current, $input);
    $calc       = calcInsumo($merged, $tipoCambio);

    $descripcion = trim($merged['descripcion'] ?? $current['descripcion'] ?? '');
    $tipo        = in_array($merged['tipo'] ?? '', ['hospedaje', 'imss'], true)
                    ? $merged['tipo']
                    : $current['tipo'];

    $stmt = $pdo->prepare(
        "UPDATE partidas_insumos_especiales SET
            tipo              = ?,
            descripcion       = ?,
            num_personas      = ?,
            costo_por_persona = ?,
            num_veces         = ?,
            subtotal          = ?,
            total_mn          = ?,
            total_usd         = ?
         WHERE id = ?"
    );
    $stmt->execute([
        $tipo, $descripcion,
        $calc['num_personas'], $calc['costo_por_persona'], $calc['num_veces'],
        $calc['subtotal'], $calc['total_mn'], $calc['total_usd'],
        $id,
    ]);

    $stmt = $pdo->prepare("SELECT * FROM partidas_insumos_especiales WHERE id = ?");
    $stmt->execute([$id]);
    $partida = $stmt->fetch();

    jsonResponse(['success' => true, 'partida' => $partida]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo  = getConnection();
    $stmt = $pdo->prepare("DELETE FROM partidas_insumos_especiales WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

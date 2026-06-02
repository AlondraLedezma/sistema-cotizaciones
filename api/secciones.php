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
        case 'get':
            handleGet();
            break;
        case 'update_totals':
            handleUpdateTotals($input);
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
    $stmt = $pdo->prepare("SELECT * FROM secciones WHERE proyecto_id = ? ORDER BY orden ASC");
    $stmt->execute([$proyectoId]);
    $secciones = $stmt->fetchAll();

    jsonResponse(['success' => true, 'secciones' => $secciones]);
}

function handleGet(): void
{
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();
    $stmt = $pdo->prepare("SELECT * FROM secciones WHERE id = ?");
    $stmt->execute([$id]);
    $seccion = $stmt->fetch();

    if (!$seccion) {
        jsonResponse(['success' => false, 'error' => 'Sección no encontrada'], 404);
    }

    $table = $seccion['tipo'] === 'mano_obra' ? 'partidas_mano_obra' : 'partidas_equipo';
    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE seccion_id = ? ORDER BY orden ASC");
    $stmt->execute([$id]);
    $partidas = $stmt->fetchAll();

    $seccion['partidas'] = $partidas;

    jsonResponse(['success' => true, 'seccion' => $seccion]);
}

function handleUpdateTotals(array $input): void
{
    $seccionId = intval($input['seccion_id'] ?? $_GET['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM secciones WHERE id = ?");
    $stmt->execute([$seccionId]);
    $seccion = $stmt->fetch();

    if (!$seccion) {
        jsonResponse(['success' => false, 'error' => 'Sección no encontrada'], 404);
    }

    $table = $seccion['tipo'] === 'mano_obra' ? 'partidas_mano_obra' : 'partidas_equipo';

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(total_usd), 0) as sum_usd, COALESCE(SUM(total_mn), 0) as sum_mn FROM {$table} WHERE seccion_id = ?");
    $stmt->execute([$seccionId]);
    $sums = $stmt->fetch();

    $stmt = $pdo->prepare("UPDATE secciones SET subtotal_usd = ?, subtotal_mn = ? WHERE id = ?");
    $stmt->execute([$sums['sum_usd'], $sums['sum_mn'], $seccionId]);

    jsonResponse([
        'success' => true,
        'totals' => [
            'subtotal_usd' => floatval($sums['sum_usd']),
            'subtotal_mn'  => floatval($sums['sum_mn']),
        ]
    ]);
}

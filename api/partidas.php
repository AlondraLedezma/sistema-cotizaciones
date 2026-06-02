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

function getSeccion(PDO $pdo, int $seccionId): array
{
    $stmt = $pdo->prepare("SELECT s.*, p.tipo_cambio_usd FROM secciones s JOIN proyectos p ON s.proyecto_id = p.id WHERE s.id = ?");
    $stmt->execute([$seccionId]);
    $seccion = $stmt->fetch();

    if (!$seccion) {
        jsonResponse(['success' => false, 'error' => 'Sección no encontrada'], 404);
    }

    return $seccion;
}

function isEMecanico(array $seccion): bool
{
    return isset($seccion['codigo']) && $seccion['codigo'] === 'E_MECANICO';
}

function getTableName(string $tipo): string
{
    return $tipo === 'mano_obra' ? 'partidas_mano_obra' : 'partidas_equipo';
}

function calcManoObra(array $data, float $tipoCambio): array
{
    $horasMo = floatval($data['horas_mo'] ?? 0);
    $diasTrabajo = floatval($data['dias_trabajo'] ?? 1);
    $costoHoraUsd = floatval($data['costo_hora_usd'] ?? 0);
    $porcentajeMgn = floatval($data['porcentaje_mgn'] ?? 1.05);

    $subtotal = $horasMo * $diasTrabajo * $costoHoraUsd;
    $totalUsd = $subtotal * $porcentajeMgn;
    $totalMn = $totalUsd * $tipoCambio;

    return [
        'horas_mo'       => $horasMo,
        'dias_trabajo'   => $diasTrabajo,
        'costo_hora_usd' => $costoHoraUsd,
        'porcentaje_mgn' => $porcentajeMgn,
        'subtotal'       => round($subtotal, 2),
        'total_usd'      => round($totalUsd, 2),
        'total_mn'       => round($totalMn, 2),
    ];
}

function calcEquipo(array $data, float $tipoCambio): array
{
    $cantidad = intval($data['cantidad'] ?? 1);
    $precioLista = floatval($data['precio_lista'] ?? 0);
    $moneda = ($data['moneda'] ?? 'MN') === 'USD' ? 'USD' : 'MN';
    $porcentajeMgn = floatval($data['porcentaje_mgn'] ?? 1.0);

    $subtotal = $cantidad * $precioLista;

    if ($moneda === 'MN') {
        $totalMn = $subtotal * $porcentajeMgn;
        $totalUsd = $tipoCambio > 0 ? $totalMn / $tipoCambio : 0;
    } else {
        $totalUsd = $subtotal * $porcentajeMgn;
        $totalMn = $totalUsd * $tipoCambio;
    }

    return [
        'cantidad'       => $cantidad,
        'precio_lista'   => $precioLista,
        'moneda'         => $moneda,
        'porcentaje_mgn' => $porcentajeMgn,
        'subtotal'       => round($subtotal, 2),
        'total_mn'       => round($totalMn, 2),
        'total_usd'      => round($totalUsd, 2),
    ];
}

function extractMecanicoFields(array $data): array
{
    return [
        'material'           => round(floatval($data['material']           ?? 0), 2),
        'mano_obra_mecanico' => round(floatval($data['mano_obra_mecanico'] ?? 0), 2),
        'diseno'             => round(floatval($data['diseno']             ?? 0), 2),
        'transporte'         => round(floatval($data['transporte']         ?? 0), 2),
    ];
}

function handleList(): void
{
    $seccionId = intval($_GET['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo     = getConnection();
    $seccion = getSeccion($pdo, $seccionId);
    $table   = getTableName($seccion['tipo']);

    if ($seccion['tipo'] === 'mano_obra') {
        $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE seccion_id = ? ORDER BY orden ASC");
        $stmt->execute([$seccionId]);
    } else {
        $stmt = $pdo->prepare(
            "SELECT pe.*, ss.titulo AS sub_seccion_titulo, ss.color AS sub_seccion_color
             FROM {$table} pe
             LEFT JOIN sub_secciones ss ON pe.sub_seccion_id = ss.id
             WHERE pe.seccion_id = ?
             ORDER BY pe.orden ASC"
        );
        $stmt->execute([$seccionId]);
    }
    $partidas = $stmt->fetchAll();

    jsonResponse(['success' => true, 'partidas' => $partidas, 'tipo' => $seccion['tipo'], 'es_mecanico' => isEMecanico($seccion)]);
}

function handleCreate(array $input): void
{
    $seccionId = intval($input['seccion_id'] ?? 0);
    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }

    $pdo = getConnection();
    $seccion = getSeccion($pdo, $seccionId);
    $table = getTableName($seccion['tipo']);
    $tipoCambio = floatval($seccion['tipo_cambio_usd']);

    $stmt = $pdo->prepare("SELECT COALESCE(MAX(numero_partida), 0) as max_num, COALESCE(MAX(orden), 0) as max_ord FROM {$table} WHERE seccion_id = ?");
    $stmt->execute([$seccionId]);
    $maxes = $stmt->fetch();
    $numeroPartida = intval($maxes['max_num']) + 1;
    $orden = intval($maxes['max_ord']) + 1;

    if ($seccion['tipo'] === 'mano_obra') {
        $calc = calcManoObra($input, $tipoCambio);
        $descripcion = trim($input['descripcion'] ?? '');

        $stmt = $pdo->prepare("
            INSERT INTO partidas_mano_obra (seccion_id, numero_partida, descripcion, horas_mo, dias_trabajo, costo_hora_usd, subtotal, porcentaje_mgn, total_usd, total_mn, orden)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $seccionId, $numeroPartida, $descripcion,
            $calc['horas_mo'], $calc['dias_trabajo'], $calc['costo_hora_usd'],
            $calc['subtotal'], $calc['porcentaje_mgn'],
            $calc['total_usd'], $calc['total_mn'], $orden,
        ]);
    } else {
        $calc        = calcEquipo($input, $tipoCambio);
        $descripcion = trim($input['descripcion'] ?? '');
        $marca       = trim($input['marca']       ?? '');
        $modelo      = trim($input['modelo']      ?? '');
        $subSeccionId = isset($input['sub_seccion_id']) && intval($input['sub_seccion_id']) > 0
                        ? intval($input['sub_seccion_id'])
                        : null;

        if (isEMecanico($seccion)) {
            $mec = extractMecanicoFields($input);
            $stmt = $pdo->prepare("
                INSERT INTO partidas_equipo
                    (seccion_id, sub_seccion_id, numero_partida, descripcion, marca, modelo,
                     cantidad, precio_lista, moneda, subtotal, material, mano_obra_mecanico,
                     diseno, transporte, porcentaje_mgn, total_mn, total_usd, orden)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $seccionId, $subSeccionId, $numeroPartida, $descripcion, $marca, $modelo,
                $calc['cantidad'], $calc['precio_lista'], $calc['moneda'],
                $calc['subtotal'],
                $mec['material'], $mec['mano_obra_mecanico'], $mec['diseno'], $mec['transporte'],
                $calc['porcentaje_mgn'], $calc['total_mn'], $calc['total_usd'], $orden,
            ]);
        } else {
            $stmt = $pdo->prepare("
                INSERT INTO partidas_equipo
                    (seccion_id, sub_seccion_id, numero_partida, descripcion, marca, modelo,
                     cantidad, precio_lista, moneda, subtotal, porcentaje_mgn, total_mn, total_usd, orden)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ");
            $stmt->execute([
                $seccionId, $subSeccionId, $numeroPartida, $descripcion, $marca, $modelo,
                $calc['cantidad'], $calc['precio_lista'], $calc['moneda'],
                $calc['subtotal'], $calc['porcentaje_mgn'],
                $calc['total_mn'], $calc['total_usd'], $orden,
            ]);
        }
    }

    $id = intval($pdo->lastInsertId());

    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    $partida = $stmt->fetch();

    jsonResponse(['success' => true, 'partida' => $partida]);
}

function handleUpdate(array $input): void
{
    $id = intval($input['id'] ?? 0);
    $seccionId = intval($input['seccion_id'] ?? 0);

    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    if ($seccionId <= 0) {
        $stmt = $pdo->prepare("SELECT seccion_id FROM partidas_mano_obra WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $seccionId = intval($row['seccion_id']);
        } else {
            $stmt = $pdo->prepare("SELECT seccion_id FROM partidas_equipo WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                $seccionId = intval($row['seccion_id']);
            } else {
                jsonResponse(['success' => false, 'error' => 'Partida no encontrada'], 404);
            }
        }
    }

    $seccion = getSeccion($pdo, $seccionId);
    $table = getTableName($seccion['tipo']);
    $tipoCambio = floatval($seccion['tipo_cambio_usd']);

    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    $current = $stmt->fetch();

    if (!$current) {
        jsonResponse(['success' => false, 'error' => 'Partida no encontrada'], 404);
    }

    $merged = array_merge($current, $input);

    if ($seccion['tipo'] === 'mano_obra') {
        $calc = calcManoObra($merged, $tipoCambio);
        $descripcion = trim($merged['descripcion'] ?? $current['descripcion'] ?? '');

        $stmt = $pdo->prepare("
            UPDATE partidas_mano_obra SET
                descripcion = ?, horas_mo = ?, dias_trabajo = ?, costo_hora_usd = ?,
                subtotal = ?, porcentaje_mgn = ?, total_usd = ?, total_mn = ?
            WHERE id = ?
        ");
        $stmt->execute([
            $descripcion, $calc['horas_mo'], $calc['dias_trabajo'], $calc['costo_hora_usd'],
            $calc['subtotal'], $calc['porcentaje_mgn'], $calc['total_usd'], $calc['total_mn'],
            $id,
        ]);
    } else {
        $calc        = calcEquipo($merged, $tipoCambio);
        $descripcion = trim($merged['descripcion'] ?? $current['descripcion'] ?? '');
        $marca       = trim($merged['marca']       ?? $current['marca']       ?? '');
        $modelo      = trim($merged['modelo']      ?? $current['modelo']      ?? '');
        $subSeccionId = array_key_exists('sub_seccion_id', $input)
                        ? (intval($input['sub_seccion_id']) > 0 ? intval($input['sub_seccion_id']) : null)
                        : ($current['sub_seccion_id'] ?? null);

        if (isEMecanico($seccion)) {
            $mec = extractMecanicoFields($merged);
            $stmt = $pdo->prepare("
                UPDATE partidas_equipo SET
                    sub_seccion_id = ?, descripcion = ?, marca = ?, modelo = ?,
                    cantidad = ?, precio_lista = ?, moneda = ?, subtotal = ?,
                    material = ?, mano_obra_mecanico = ?, diseno = ?, transporte = ?,
                    porcentaje_mgn = ?, total_mn = ?, total_usd = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $subSeccionId, $descripcion, $marca, $modelo,
                $calc['cantidad'], $calc['precio_lista'], $calc['moneda'], $calc['subtotal'],
                $mec['material'], $mec['mano_obra_mecanico'], $mec['diseno'], $mec['transporte'],
                $calc['porcentaje_mgn'], $calc['total_mn'], $calc['total_usd'],
                $id,
            ]);
        } else {
            $stmt = $pdo->prepare("
                UPDATE partidas_equipo SET
                    sub_seccion_id = ?, descripcion = ?, marca = ?, modelo = ?,
                    cantidad = ?, precio_lista = ?, moneda = ?, subtotal = ?,
                    porcentaje_mgn = ?, total_mn = ?, total_usd = ?
                WHERE id = ?
            ");
            $stmt->execute([
                $subSeccionId, $descripcion, $marca, $modelo,
                $calc['cantidad'], $calc['precio_lista'], $calc['moneda'], $calc['subtotal'],
                $calc['porcentaje_mgn'], $calc['total_mn'], $calc['total_usd'],
                $id,
            ]);
        }
    }

    $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);
    $partida = $stmt->fetch();

    jsonResponse(['success' => true, 'partida' => $partida]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    $seccionId = intval($input['seccion_id'] ?? 0);

    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    if ($seccionId > 0) {
        $seccion = getSeccion($pdo, $seccionId);
        $table = getTableName($seccion['tipo']);
    } else {
        $stmt = $pdo->prepare("SELECT seccion_id FROM partidas_mano_obra WHERE id = ?");
        $stmt->execute([$id]);
        $row = $stmt->fetch();
        if ($row) {
            $seccionId = intval($row['seccion_id']);
            $table = 'partidas_mano_obra';
        } else {
            $stmt = $pdo->prepare("SELECT seccion_id FROM partidas_equipo WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch();
            if ($row) {
                $seccionId = intval($row['seccion_id']);
                $table = 'partidas_equipo';
            } else {
                jsonResponse(['success' => false, 'error' => 'Partida no encontrada'], 404);
            }
        }
    }

    $stmt = $pdo->prepare("DELETE FROM {$table} WHERE id = ?");
    $stmt->execute([$id]);

    $stmt = $pdo->prepare("SELECT id FROM {$table} WHERE seccion_id = ? ORDER BY orden ASC");
    $stmt->execute([$seccionId]);
    $remaining = $stmt->fetchAll();

    $updateStmt = $pdo->prepare("UPDATE {$table} SET numero_partida = ?, orden = ? WHERE id = ?");
    foreach ($remaining as $index => $row) {
        $newNum = $index + 1;
        $updateStmt->execute([$newNum, $newNum, $row['id']]);
    }

    jsonResponse(['success' => true]);
}

function handleBatchUpdate(array $input): void
{
    $seccionId = intval($input['seccion_id'] ?? 0);
    $partidas = $input['partidas'] ?? [];

    if ($seccionId <= 0) {
        jsonResponse(['success' => false, 'error' => 'seccion_id es requerido'], 400);
    }
    if (empty($partidas)) {
        jsonResponse(['success' => false, 'error' => 'No se proporcionaron partidas'], 400);
    }

    $pdo = getConnection();
    $seccion = getSeccion($pdo, $seccionId);
    $table = getTableName($seccion['tipo']);
    $tipoCambio = floatval($seccion['tipo_cambio_usd']);

    $pdo->beginTransaction();

    try {
        $updatedPartidas = [];

        foreach ($partidas as $partidaInput) {
            $partidaId = intval($partidaInput['id'] ?? 0);
            if ($partidaId <= 0) continue;

            $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ?");
            $stmt->execute([$partidaId]);
            $current = $stmt->fetch();
            if (!$current) continue;

            $merged = array_merge($current, $partidaInput);

            if ($seccion['tipo'] === 'mano_obra') {
                $calc = calcManoObra($merged, $tipoCambio);
                $descripcion = trim($merged['descripcion'] ?? '');

                $stmt = $pdo->prepare("
                    UPDATE partidas_mano_obra SET
                        descripcion = ?, horas_mo = ?, dias_trabajo = ?, costo_hora_usd = ?,
                        subtotal = ?, porcentaje_mgn = ?, total_usd = ?, total_mn = ?
                    WHERE id = ?
                ");
                $stmt->execute([
                    $descripcion, $calc['horas_mo'], $calc['dias_trabajo'], $calc['costo_hora_usd'],
                    $calc['subtotal'], $calc['porcentaje_mgn'], $calc['total_usd'], $calc['total_mn'],
                    $partidaId,
                ]);
            } else {
                $calc        = calcEquipo($merged, $tipoCambio);
                $descripcion = trim($merged['descripcion'] ?? '');
                $marca       = trim($merged['marca']       ?? '');
                $modelo      = trim($merged['modelo']      ?? '');
                $subSeccionId = array_key_exists('sub_seccion_id', $partidaInput)
                                ? (intval($partidaInput['sub_seccion_id']) > 0 ? intval($partidaInput['sub_seccion_id']) : null)
                                : ($current['sub_seccion_id'] ?? null);

                if (isEMecanico($seccion)) {
                    $mec = extractMecanicoFields($merged);
                    $stmt = $pdo->prepare("
                        UPDATE partidas_equipo SET
                            sub_seccion_id = ?, descripcion = ?, marca = ?, modelo = ?,
                            cantidad = ?, precio_lista = ?, moneda = ?, subtotal = ?,
                            material = ?, mano_obra_mecanico = ?, diseno = ?, transporte = ?,
                            porcentaje_mgn = ?, total_mn = ?, total_usd = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $subSeccionId, $descripcion, $marca, $modelo,
                        $calc['cantidad'], $calc['precio_lista'], $calc['moneda'], $calc['subtotal'],
                        $mec['material'], $mec['mano_obra_mecanico'], $mec['diseno'], $mec['transporte'],
                        $calc['porcentaje_mgn'], $calc['total_mn'], $calc['total_usd'],
                        $partidaId,
                    ]);
                } else {
                    $stmt = $pdo->prepare("
                        UPDATE partidas_equipo SET
                            sub_seccion_id = ?, descripcion = ?, marca = ?, modelo = ?,
                            cantidad = ?, precio_lista = ?, moneda = ?, subtotal = ?,
                            porcentaje_mgn = ?, total_mn = ?, total_usd = ?
                        WHERE id = ?
                    ");
                    $stmt->execute([
                        $subSeccionId, $descripcion, $marca, $modelo,
                        $calc['cantidad'], $calc['precio_lista'], $calc['moneda'], $calc['subtotal'],
                        $calc['porcentaje_mgn'], $calc['total_mn'], $calc['total_usd'],
                        $partidaId,
                    ]);
                }
            }

            $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE id = ?");
            $stmt->execute([$partidaId]);
            $updatedPartidas[] = $stmt->fetch();
        }

        $pdo->commit();

        jsonResponse(['success' => true, 'partidas' => $updatedPartidas]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

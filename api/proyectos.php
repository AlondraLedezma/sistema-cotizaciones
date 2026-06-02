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
        case 'create':
            handleCreate($input);
            break;
        case 'update':
            handleUpdate($input);
            break;
        case 'delete':
            handleDelete($input);
            break;
        case 'stats':
            handleStats();
            break;
        case 'next_number':
            handleNextNumber();
            break;
        case 'recalculate':
            handleRecalculate($input);
            break;
        default:
            jsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}

function handleList(): void
{
    $pdo = getConnection();

    $where = [];
    $params = [];

    $search = trim($_GET['search'] ?? '');
    if ($search !== '') {
        $where[] = "(nombre_proyecto LIKE ? OR empresa_cliente LIKE ? OR numero_proyecto LIKE ?)";
        $searchParam = "%{$search}%";
        $params[] = $searchParam;
        $params[] = $searchParam;
        $params[] = $searchParam;
    }

    $fechaDesde = $_GET['fecha_desde'] ?? '';
    if ($fechaDesde !== '') {
        $where[] = "fecha_creacion >= ?";
        $params[] = $fechaDesde;
    }

    $fechaHasta = $_GET['fecha_hasta'] ?? '';
    if ($fechaHasta !== '') {
        $where[] = "fecha_creacion <= ?";
        $params[] = $fechaHasta;
    }

    $sortMap = [
        'created_at_desc'  => 'p.created_at DESC',
        'created_at_asc'   => 'p.created_at ASC',
        'numero_asc'       => 'p.numero_proyecto ASC',
        'numero_desc'      => 'p.numero_proyecto DESC',
        'total_desc'       => 'p.total_mn DESC',
        'total_asc'        => 'p.total_mn ASC',
    ];
    $sortParam = $_GET['sort'] ?? 'created_at_desc';
    $orderBy = $sortMap[$sortParam] ?? 'p.created_at DESC';

    $sql = "SELECT p.*, u.nombre as usuario_nombre FROM proyectos p LEFT JOIN usuarios u ON p.usuario_id = u.id";
    if (!empty($where)) {
        $sql .= " WHERE " . implode(' AND ', $where);
    }
    $sql .= " ORDER BY {$orderBy}";

    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $proyectos = $stmt->fetchAll();

    jsonResponse(['success' => true, 'proyectos' => $proyectos, 'data' => $proyectos]);
}

function handleGet(): void
{
    $id = intval($_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT p.*, u.nombre as usuario_nombre FROM proyectos p LEFT JOIN usuarios u ON p.usuario_id = u.id WHERE p.id = ?");
    $stmt->execute([$id]);
    $proyecto = $stmt->fetch();

    if (!$proyecto) {
        jsonResponse(['success' => false, 'error' => 'Proyecto no encontrado'], 404);
    }

    $stmt = $pdo->prepare("SELECT * FROM secciones WHERE proyecto_id = ? ORDER BY orden ASC");
    $stmt->execute([$id]);
    $secciones = $stmt->fetchAll();

    foreach ($secciones as &$seccion) {
        $table = $seccion['tipo'] === 'mano_obra' ? 'partidas_mano_obra' : 'partidas_equipo';
        $stmt = $pdo->prepare("SELECT * FROM {$table} WHERE seccion_id = ? ORDER BY orden ASC");
        $stmt->execute([$seccion['id']]);
        $seccion['partidas'] = $stmt->fetchAll();
    }
    unset($seccion);

    $proyecto['secciones'] = $secciones;

    $stmt = $pdo->prepare("SELECT * FROM condiciones_comerciales WHERE proyecto_id = ? ORDER BY orden ASC");
    $stmt->execute([$id]);
    $proyecto['condiciones'] = $stmt->fetchAll();

    jsonResponse(['success' => true, 'proyecto' => $proyecto]);
}

function handleCreate(array $input): void
{
    $pdo = getConnection();

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM proyectos");
    $count = intval($stmt->fetch()['total']);
    $nextNum = $count + 1;
    $dateStr = date('ymd');
    $numeroProyecto = str_pad($nextNum, 3, '0', STR_PAD_LEFT) . '-' . $dateStr;

    $stmt = $pdo->prepare("SELECT id FROM proyectos WHERE numero_proyecto = ?");
    $stmt->execute([$numeroProyecto]);
    if ($stmt->fetch()) {
        $suffix = 1;
        do {
            $nextNum++;
            $numeroProyecto = str_pad($nextNum, 3, '0', STR_PAD_LEFT) . '-' . $dateStr;
            $stmt->execute([$numeroProyecto]);
        } while ($stmt->fetch());
    }

    $nombreProyecto = trim($input['nombre_proyecto'] ?? 'Nuevo Proyecto');
    $referencia = trim($input['referencia'] ?? '');
    $descripcionSolucion = trim($input['descripcion_solucion'] ?? '');
    $empresaCliente = trim($input['empresa_cliente'] ?? '');
    $contactoCliente = trim($input['contacto_cliente'] ?? '');
    $telefonoCliente = trim($input['telefono_cliente'] ?? '');
    $emailCliente = trim($input['email_cliente'] ?? '');
    $atencion = trim($input['atencion'] ?? '');
    $fechaCreacion = $input['fecha_creacion'] ?? date('Y-m-d');
    $fechaVencimiento = $input['fecha_vencimiento'] ?? null;
    $tipoCambioUsd = floatval($input['tipo_cambio_usd'] ?? 20.00);
    $carpetaLink = trim($input['carpeta_link'] ?? '');
    $usuarioId = $_SESSION['user_id'];

    $pdo->beginTransaction();

    try {
        $stmt = $pdo->prepare("
            INSERT INTO proyectos (
                numero_proyecto, nombre_proyecto, referencia, descripcion_solucion,
                empresa_cliente, contacto_cliente, telefono_cliente, email_cliente,
                atencion, fecha_creacion, fecha_vencimiento, tipo_cambio_usd,
                carpeta_link, usuario_id
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([
            $numeroProyecto, $nombreProyecto, $referencia, $descripcionSolucion,
            $empresaCliente, $contactoCliente, $telefonoCliente, $emailCliente,
            $atencion, $fechaCreacion, $fechaVencimiento, $tipoCambioUsd,
            $carpetaLink, $usuarioId,
        ]);
        $proyectoId = intval($pdo->lastInsertId());

        $defaultSections = [
            ['codigo' => 'ING_MO',       'titulo' => 'ING. MANO DE OBRA',  'tipo' => 'mano_obra', 'orden' => 1, 'color' => '#2196F3'],
            ['codigo' => 'E_CONTROL',    'titulo' => 'EQUIPO CONTROL',     'tipo' => 'equipo',    'orden' => 2, 'color' => '#DAA520'],
            ['codigo' => 'E_ELECTRICO',  'titulo' => 'EQUIPO ELÉCTRICO',   'tipo' => 'equipo',    'orden' => 3, 'color' => '#4CAF50'],
            ['codigo' => 'E_NEUMATICO',  'titulo' => 'EQUIPO NEUMÁTICO',   'tipo' => 'equipo',    'orden' => 4, 'color' => '#00BCD4'],
            ['codigo' => 'E_MECANICO',   'titulo' => 'EQUIPO MECÁNICO',    'tipo' => 'equipo',    'orden' => 5, 'color' => '#9C27B0'],
            ['codigo' => 'INSUMOS',      'titulo' => 'INSUMOS',            'tipo' => 'equipo',    'orden' => 6, 'color' => '#FF5722'],
            ['codigo' => 'IO',           'titulo' => 'I/O',                'tipo' => 'equipo',    'orden' => 7, 'color' => '#607D8B'],
        ];

        $sectionStmt = $pdo->prepare("INSERT INTO secciones (proyecto_id, codigo, titulo, tipo, orden, color) VALUES (?, ?, ?, ?, ?, ?)");
        foreach ($defaultSections as $sec) {
            $sectionStmt->execute([
                $proyectoId, $sec['codigo'], $sec['titulo'], $sec['tipo'], $sec['orden'], $sec['color']
            ]);
        }

        $defaultCondiciones = [
            ['codigo' => 'A3.1', 'contenido' => 'Se maneja una garantía en piezas de fabricación de un año y garantía de servicio de 8-12 meses depending el alcance de programación.', 'orden' => 1],
            ['codigo' => 'A3.2', 'contenido' => 'Los precios son firmes en Pesos Mexicanos y podrán ser cubiertos en la misma moneda.', 'orden' => 2],
            ['codigo' => 'A3.3', 'contenido' => 'No se incluye el 16% de IVA.', 'orden' => 3],
            ['codigo' => 'A3.4', 'contenido' => 'Todos los precios son LAB en su planta respectivamente.', 'orden' => 4],
            ['codigo' => 'A3.5', 'contenido' => 'Tiempo de entrega del Proyecto: Aproximadamente de 2-3 semanas', 'orden' => 5],
            ['codigo' => 'A3.6', 'contenido' => 'Condiciones de pago: 90 Días', 'orden' => 6],
            ['codigo' => 'A3.7', 'contenido' => 'En el caso de cancelación del pedido se cargarán todos los gastos incurridos hasta el momento de la fecha de aviso de cancelación.', 'orden' => 7],
            ['codigo' => 'A3.8', 'contenido' => 'Vigencia de la propuesta: 30 días, siempre que no exista una variación del tipo de cambio mayor del 1% de acuerdo al Diario Oficial de la Federación.', 'orden' => 8],
        ];

        $condStmt = $pdo->prepare("INSERT INTO condiciones_comerciales (proyecto_id, codigo, contenido, orden) VALUES (?, ?, ?, ?)");
        foreach ($defaultCondiciones as $cond) {
            $condStmt->execute([$proyectoId, $cond['codigo'], $cond['contenido'], $cond['orden']]);
        }

        $pdo->commit();

        jsonResponse(['success' => true, 'proyecto_id' => $proyectoId, 'numero_proyecto' => $numeroProyecto]);

    } catch (Exception $e) {
        $pdo->rollBack();
        throw $e;
    }
}

function handleUpdate(array $input): void
{
    $id = intval($input['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM proyectos WHERE id = ?");
    $stmt->execute([$id]);
    $proyecto = $stmt->fetch();

    if (!$proyecto) {
        jsonResponse(['success' => false, 'error' => 'Proyecto no encontrado'], 404);
    }

    $allowedFields = [
        'nombre_proyecto', 'referencia', 'descripcion_solucion',
        'empresa_cliente', 'contacto_cliente', 'telefono_cliente', 'email_cliente',
        'atencion', 'fecha_creacion', 'fecha_vencimiento', 'tipo_cambio_usd',
        'total_letras', 'carpeta_link', 'clave_eliminacion',
    ];

    $updates = [];
    $params = [];

    foreach ($allowedFields as $field) {
        if (array_key_exists($field, $input)) {
            $updates[] = "{$field} = ?";
            $params[] = $input[$field];
        }
    }

    if (!empty($updates)) {
        $params[] = $id;
        $sql = "UPDATE proyectos SET " . implode(', ', $updates) . " WHERE id = ?";
        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
    }

    $tipoCambio = floatval($input['tipo_cambio_usd'] ?? $proyecto['tipo_cambio_usd']);

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(subtotal_mn), 0) as total_mn FROM secciones WHERE proyecto_id = ?");
    $stmt->execute([$id]);
    $subtotalMn = floatval($stmt->fetch()['total_mn']);

    $stmt = $pdo->prepare("SELECT valor FROM configuracion WHERE clave = 'iva_porcentaje'");
    $stmt->execute();
    $ivaRow = $stmt->fetch();
    $ivaPct = $ivaRow ? floatval($ivaRow['valor']) / 100 : 0.16;

    $iva = $subtotalMn * $ivaPct;
    $totalMn = $subtotalMn + $iva;
    $totalUsd = $tipoCambio > 0 ? $totalMn / $tipoCambio : 0;

    $stmt = $pdo->prepare("UPDATE proyectos SET subtotal_mn = ?, iva = ?, total_mn = ?, total_usd = ? WHERE id = ?");
    $stmt->execute([$subtotalMn, $iva, $totalMn, $totalUsd, $id]);

    jsonResponse([
        'success' => true,
        'totals' => [
            'subtotal_mn' => $subtotalMn,
            'iva'         => $iva,
            'total_mn'    => $totalMn,
            'total_usd'   => $totalUsd,
        ]
    ]);
}

function handleDelete(array $input): void
{
    $id = intval($input['id'] ?? 0);
    $clave = $input['clave'] ?? '';

    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }
    if (empty($clave)) {
        jsonResponse(['success' => false, 'error' => 'Clave de eliminación es requerida'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT clave_eliminacion FROM proyectos WHERE id = ?");
    $stmt->execute([$id]);
    $proyecto = $stmt->fetch();

    if (!$proyecto) {
        jsonResponse(['success' => false, 'error' => 'Proyecto no encontrado'], 404);
    }

    if ($clave !== $proyecto['clave_eliminacion']) {
        jsonResponse(['success' => false, 'error' => 'Clave incorrecta'], 403);
    }

    $stmt = $pdo->prepare("DELETE FROM proyectos WHERE id = ?");
    $stmt->execute([$id]);

    jsonResponse(['success' => true]);
}

function handleStats(): void
{
    $pdo = getConnection();

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM proyectos");
    $totalProyectos = intval($stmt->fetch()['total']);

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM proyectos WHERE MONTH(fecha_creacion) = MONTH(CURRENT_DATE()) AND YEAR(fecha_creacion) = YEAR(CURRENT_DATE())");
    $proyectosMes = intval($stmt->fetch()['total']);

    $stmt = $pdo->query("SELECT COALESCE(SUM(total_mn), 0) as monto_mn, COALESCE(SUM(total_usd), 0) as monto_usd FROM proyectos");
    $montos = $stmt->fetch();

    $stmt = $pdo->query("
        SELECT
            MONTH(fecha_creacion) as month,
            YEAR(fecha_creacion) as year,
            COUNT(*) as count,
            COALESCE(SUM(total_mn), 0) as total
        FROM proyectos
        WHERE fecha_creacion >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
        GROUP BY YEAR(fecha_creacion), MONTH(fecha_creacion)
        ORDER BY year ASC, month ASC
    ");
    $monthlyData = $stmt->fetchAll();

    $stmt = $pdo->query("
        SELECT numero_proyecto, nombre_proyecto, total_mn, total_usd, fecha_creacion
        FROM proyectos
        ORDER BY created_at DESC
        LIMIT 20
    ");
    $proyectosRecientes = array_reverse($stmt->fetchAll());

    jsonResponse([
        'success' => true,
        'data' => [
            'total_proyectos'     => $totalProyectos,
            'proyectos_mes'       => $proyectosMes,
            'monto_total_mn'      => floatval($montos['monto_mn']),
            'monto_total_usd'     => floatval($montos['monto_usd']),
            'monthly_data'        => $monthlyData,
            'proyectos_recientes' => $proyectosRecientes,
        ]
    ]);
}

function handleNextNumber(): void
{
    $pdo = getConnection();

    $stmt = $pdo->query("SELECT COUNT(*) as total FROM proyectos");
    $count = intval($stmt->fetch()['total']);
    $nextNum = $count + 1;
    $dateStr = date('ymd');
    $numero = str_pad($nextNum, 3, '0', STR_PAD_LEFT) . '-' . $dateStr;

    $stmt = $pdo->prepare("SELECT id FROM proyectos WHERE numero_proyecto = ?");
    $stmt->execute([$numero]);
    while ($stmt->fetch()) {
        $nextNum++;
        $numero = str_pad($nextNum, 3, '0', STR_PAD_LEFT) . '-' . $dateStr;
        $stmt->execute([$numero]);
    }

    jsonResponse(['success' => true, 'numero' => $numero]);
}

function handleRecalculate(array $input): void
{
    $id = intval($input['id'] ?? $_GET['id'] ?? 0);
    if ($id <= 0) {
        jsonResponse(['success' => false, 'error' => 'id es requerido'], 400);
    }

    $pdo = getConnection();

    $stmt = $pdo->prepare("SELECT * FROM proyectos WHERE id = ?");
    $stmt->execute([$id]);
    $proyecto = $stmt->fetch();

    if (!$proyecto) {
        jsonResponse(['success' => false, 'error' => 'Proyecto no encontrado'], 404);
    }

    $tipoCambio = floatval($proyecto['tipo_cambio_usd']);

    $stmt = $pdo->prepare("SELECT * FROM secciones WHERE proyecto_id = ?");
    $stmt->execute([$id]);
    $secciones = $stmt->fetchAll();

    foreach ($secciones as $seccion) {
        $table = $seccion['tipo'] === 'mano_obra' ? 'partidas_mano_obra' : 'partidas_equipo';

        $partStmt = $pdo->prepare("SELECT * FROM {$table} WHERE seccion_id = ?");
        $partStmt->execute([$seccion['id']]);
        $partidas = $partStmt->fetchAll();

        foreach ($partidas as $partida) {
            if ($seccion['tipo'] === 'mano_obra') {
                $subtotal = $partida['horas_mo'] * $partida['dias_trabajo'] * $partida['costo_hora_usd'];
                $totalUsd = $subtotal * $partida['porcentaje_mgn'];
                $totalMn = $totalUsd * $tipoCambio;

                $updStmt = $pdo->prepare("UPDATE partidas_mano_obra SET subtotal = ?, total_usd = ?, total_mn = ? WHERE id = ?");
                $updStmt->execute([$subtotal, $totalUsd, $totalMn, $partida['id']]);
            } else {
                $subtotal = $partida['cantidad'] * $partida['precio_lista'];
                if ($partida['moneda'] === 'MN') {
                    $totalMn = $subtotal * $partida['porcentaje_mgn'];
                    $totalUsd = $tipoCambio > 0 ? $totalMn / $tipoCambio : 0;
                } else {
                    $totalUsd = $subtotal * $partida['porcentaje_mgn'];
                    $totalMn = $totalUsd * $tipoCambio;
                }

                $updStmt = $pdo->prepare("UPDATE partidas_equipo SET subtotal = ?, total_mn = ?, total_usd = ? WHERE id = ?");
                $updStmt->execute([$subtotal, $totalMn, $totalUsd, $partida['id']]);
            }
        }

        $sumStmt = $pdo->prepare("SELECT COALESCE(SUM(total_usd), 0) as sum_usd, COALESCE(SUM(total_mn), 0) as sum_mn FROM {$table} WHERE seccion_id = ?");
        $sumStmt->execute([$seccion['id']]);
        $sums = $sumStmt->fetch();

        $secUpdStmt = $pdo->prepare("UPDATE secciones SET subtotal_usd = ?, subtotal_mn = ? WHERE id = ?");
        $secUpdStmt->execute([$sums['sum_usd'], $sums['sum_mn'], $seccion['id']]);
    }

    $stmt = $pdo->prepare("SELECT COALESCE(SUM(subtotal_mn), 0) as total_mn FROM secciones WHERE proyecto_id = ?");
    $stmt->execute([$id]);
    $subtotalMn = floatval($stmt->fetch()['total_mn']);

    $stmt = $pdo->prepare("SELECT valor FROM configuracion WHERE clave = 'iva_porcentaje'");
    $stmt->execute();
    $ivaRow = $stmt->fetch();
    $ivaPct = $ivaRow ? floatval($ivaRow['valor']) / 100 : 0.16;

    $iva = $subtotalMn * $ivaPct;
    $totalMn = $subtotalMn + $iva;
    $totalUsd = $tipoCambio > 0 ? $totalMn / $tipoCambio : 0;

    $stmt = $pdo->prepare("UPDATE proyectos SET subtotal_mn = ?, iva = ?, total_mn = ?, total_usd = ? WHERE id = ?");
    $stmt->execute([$subtotalMn, $iva, $totalMn, $totalUsd, $id]);

    jsonResponse([
        'success' => true,
        'totals' => [
            'subtotal_mn' => $subtotalMn,
            'iva'         => $iva,
            'total_mn'    => $totalMn,
            'total_usd'   => $totalUsd,
        ]
    ]);
}

<?php

$host = 'localhost';
$username = 'root';
$password = '';
$dbname = 'cotizaciones_dematiq';

$messages = [];
$hasError = false;

try {
    $pdo = new PDO("mysql:host={$host};charset=utf8mb4", $username, $password, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
    ]);

    $stmt = $pdo->query("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = '{$dbname}'");
    $dbExists = $stmt->fetch();

    if ($dbExists) {
        $pdo->exec("USE {$dbname}");
        $stmt = $pdo->query("SHOW TABLES");
        $tables = $stmt->fetchAll(PDO::FETCH_COLUMN);

        if (count($tables) >= 7) {
            $messages[] = ['type' => 'warning', 'text' => "La base de datos '{$dbname}' ya existe y contiene " . count($tables) . " tablas."];
            $messages[] = ['type' => 'info', 'text' => 'El sistema ya está configurado. No se realizaron cambios.'];
        } else {
            $messages[] = ['type' => 'info', 'text' => "La base de datos existe pero tiene tablas incompletas. Creando tablas faltantes..."];
            createTables($pdo);
            insertDefaults($pdo);
            $messages[] = ['type' => 'success', 'text' => 'Tablas y datos por defecto creados correctamente.'];
        }
    } else {
        $pdo->exec("CREATE DATABASE {$dbname} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $messages[] = ['type' => 'success', 'text' => "Base de datos '{$dbname}' creada correctamente."];

        $pdo->exec("USE {$dbname}");

        createTables($pdo);
        $messages[] = ['type' => 'success', 'text' => 'Todas las tablas creadas correctamente.'];

        insertDefaults($pdo);
        $messages[] = ['type' => 'success', 'text' => 'Usuario administrador y configuración por defecto insertados.'];
    }
} catch (PDOException $e) {
    $hasError = true;
    $messages[] = ['type' => 'error', 'text' => 'Error de conexión: ' . $e->getMessage()];
}

function createTables(PDO $pdo): void
{
    $sql = "
    CREATE TABLE IF NOT EXISTS usuarios (
        id INT AUTO_INCREMENT PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        nombre VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS proyectos (
        id INT AUTO_INCREMENT PRIMARY KEY,
        numero_proyecto VARCHAR(50) UNIQUE NOT NULL,
        nombre_proyecto VARCHAR(255) NOT NULL,
        referencia TEXT,
        descripcion_solucion TEXT,
        empresa_cliente VARCHAR(255),
        contacto_cliente VARCHAR(255),
        telefono_cliente VARCHAR(100),
        email_cliente VARCHAR(255),
        atencion VARCHAR(255),
        fecha_creacion DATE NOT NULL,
        fecha_vencimiento DATE,
        tipo_cambio_usd DECIMAL(10,2) DEFAULT 20.00,
        subtotal_mn DECIMAL(15,2) DEFAULT 0,
        iva DECIMAL(15,2) DEFAULT 0,
        total_mn DECIMAL(15,2) DEFAULT 0,
        total_usd DECIMAL(15,2) DEFAULT 0,
        total_letras TEXT,
        carpeta_link TEXT,
        usuario_id INT NOT NULL,
        clave_eliminacion VARCHAR(255) DEFAULT 'dematiq2026',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS secciones (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proyecto_id INT NOT NULL,
        codigo VARCHAR(20) NOT NULL,
        titulo VARCHAR(255) NOT NULL,
        tipo ENUM('mano_obra', 'equipo') NOT NULL,
        orden INT NOT NULL,
        color VARCHAR(20),
        subtotal_usd DECIMAL(15,2) DEFAULT 0,
        subtotal_mn DECIMAL(15,2) DEFAULT 0,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS partidas_mano_obra (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seccion_id INT NOT NULL,
        numero_partida INT NOT NULL,
        descripcion VARCHAR(500),
        horas_mo DECIMAL(10,2) DEFAULT 0,
        dias_trabajo DECIMAL(10,2) DEFAULT 1,
        costo_hora_usd DECIMAL(10,2) DEFAULT 0,
        subtotal DECIMAL(15,2) DEFAULT 0,
        porcentaje_mgn DECIMAL(5,2) DEFAULT 1.05,
        total_usd DECIMAL(15,2) DEFAULT 0,
        total_mn DECIMAL(15,2) DEFAULT 0,
        orden INT NOT NULL,
        FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS partidas_equipo (
        id INT AUTO_INCREMENT PRIMARY KEY,
        seccion_id INT NOT NULL,
        numero_partida INT NOT NULL,
        descripcion VARCHAR(500),
        marca VARCHAR(255),
        modelo VARCHAR(255),
        cantidad INT DEFAULT 1,
        precio_lista DECIMAL(15,2) DEFAULT 0,
        moneda ENUM('MN', 'USD') DEFAULT 'MN',
        subtotal DECIMAL(15,2) DEFAULT 0,
        porcentaje_mgn DECIMAL(5,2) DEFAULT 1.0,
        total_mn DECIMAL(15,2) DEFAULT 0,
        total_usd DECIMAL(15,2) DEFAULT 0,
        orden INT NOT NULL,
        FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS condiciones_comerciales (
        id INT AUTO_INCREMENT PRIMARY KEY,
        proyecto_id INT NOT NULL,
        codigo VARCHAR(20) NOT NULL,
        contenido TEXT NOT NULL,
        orden INT NOT NULL,
        FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

    CREATE TABLE IF NOT EXISTS configuracion (
        id INT AUTO_INCREMENT PRIMARY KEY,
        clave VARCHAR(100) UNIQUE NOT NULL,
        valor TEXT NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
    ";

    $statements = array_filter(array_map('trim', explode(';', $sql)));
    foreach ($statements as $statement) {
        if (!empty($statement)) {
            $pdo->exec($statement);
        }
    }
}

function insertDefaults(PDO $pdo): void
{
    $adminEmail = 'admin@dematiq.com';
    $adminPassword = password_hash('admin123', PASSWORD_DEFAULT);
    $adminNombre = 'Administrador DEMATIQ';

    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
    $stmt->execute([$adminEmail]);
    if (!$stmt->fetch()) {
        $stmt = $pdo->prepare("INSERT INTO usuarios (email, password_hash, nombre) VALUES (?, ?, ?)");
        $stmt->execute([$adminEmail, $adminPassword, $adminNombre]);
    }

    $defaults = [
        'iva_porcentaje'            => '16',
        'empresa_nombre'            => 'DEMATIQ',
        'empresa_subtitulo'         => 'AUTOMATIZACIÓN',
        'empresa_servicios'         => "Integración de sistemas Automatizados\nProgramación de PLC, HMI\nServicio de Diseño y Armado Tableros\nPólizas de Mantenimiento",
        'vendedor'                  => 'Jose Moreno Rangel',
        'empresa_telefono'          => '442 229 4936',
        'empresa_email'             => 'integraqro07@outlook.com',
        'tiempo_entrega_default'    => '8 DIAS HABILES',
        'condiciones_pago_default'  => '90 DIAS',
    ];

    $stmt = $pdo->prepare("INSERT IGNORE INTO configuracion (clave, valor) VALUES (?, ?)");
    foreach ($defaults as $clave => $valor) {
        $stmt->execute([$clave, $valor]);
    }
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Setup - Sistema de Cotizaciones DEMATIQ</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #0a0e27 0%, #1a1a3e 50%, #0d1b2a 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #e0e0e0;
        }
        .container {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            backdrop-filter: blur(10px);
            border-radius: 16px;
            padding: 40px;
            max-width: 600px;
            width: 90%;
            box-shadow: 0 20px 60px rgba(0,0,0,0.5);
        }
        h1 {
            text-align: center;
            margin-bottom: 8px;
            color: #60a5fa;
            font-size: 1.8rem;
        }
        .subtitle {
            text-align: center;
            color: #94a3b8;
            margin-bottom: 30px;
            font-size: 0.9rem;
        }
        .message {
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 12px;
            font-size: 0.95rem;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        .message.success { background: rgba(34,197,94,0.15); border-left: 4px solid #22c55e; color: #86efac; }
        .message.error { background: rgba(239,68,68,0.15); border-left: 4px solid #ef4444; color: #fca5a5; }
        .message.warning { background: rgba(234,179,8,0.15); border-left: 4px solid #eab308; color: #fde047; }
        .message.info { background: rgba(59,130,246,0.15); border-left: 4px solid #3b82f6; color: #93c5fd; }
        .icon { font-size: 1.2rem; }
        .actions {
            margin-top: 30px;
            text-align: center;
        }
        .btn {
            display: inline-block;
            padding: 12px 32px;
            background: linear-gradient(135deg, #2563eb, #3b82f6);
            color: white;
            text-decoration: none;
            border-radius: 8px;
            font-weight: 600;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(37,99,235,0.4);
        }
        .btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(37,99,235,0.6);
        }
        .credentials {
            background: rgba(255,255,255,0.05);
            border: 1px solid rgba(255,255,255,0.1);
            border-radius: 8px;
            padding: 16px;
            margin-top: 20px;
        }
        .credentials h3 { color: #60a5fa; margin-bottom: 10px; font-size: 1rem; }
        .credentials p { margin-bottom: 6px; font-size: 0.9rem; }
        .credentials code {
            background: rgba(255,255,255,0.1);
            padding: 2px 8px;
            border-radius: 4px;
            font-family: 'Consolas', monospace;
            color: #fde047;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>⚙️ Setup del Sistema</h1>
        <p class="subtitle">Sistema de Cotizaciones - DEMATIQ Automatización</p>

        <?php foreach ($messages as $msg): ?>
            <div class="message <?= $msg['type'] ?>">
                <span class="icon">
                    <?php
                    switch ($msg['type']) {
                        case 'success': echo '✅'; break;
                        case 'error':   echo '❌'; break;
                        case 'warning': echo '⚠️'; break;
                        case 'info':    echo 'ℹ️'; break;
                    }
                    ?>
                </span>
                <span><?= htmlspecialchars($msg['text']) ?></span>
            </div>
        <?php endforeach; ?>

        <?php if (!$hasError): ?>
            <div class="credentials">
                <h3>🔑 Credenciales de Administrador</h3>
                <p><strong>Email:</strong> <code>admin@dematiq.com</code></p>
                <p><strong>Contraseña:</strong> <code>admin123</code></p>
            </div>

            <div class="actions">
                <a href="index.html" class="btn">Ir al Sistema →</a>
            </div>
        <?php endif; ?>
    </div>
</body>
</html>

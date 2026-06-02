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

$input = json_decode(file_get_contents('php://input'), true) ?? [];
$action = $_GET['action'] ?? $_POST['action'] ?? $input['action'] ?? '';

try {
    switch ($action) {
        case 'login':
            handleLogin($input);
            break;
        case 'logout':
            handleLogout();
            break;
        case 'check':
            handleCheck();
            break;
        case 'register':
            handleRegister($input);
            break;
        case 'update_credentials':
            handleUpdateCredentials($input);
            break;
        default:
            jsonResponse(['success' => false, 'error' => 'Acción no válida'], 400);
    }
} catch (Exception $e) {
    jsonResponse(['success' => false, 'error' => 'Error del servidor: ' . $e->getMessage()], 500);
}

function handleRegister(array $input): void
{
    $nombre = trim($input['nombre'] ?? '');
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($nombre) || empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'error' => 'Todos los campos son requeridos'], 400);
    }

    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        jsonResponse(['success' => false, 'error' => 'El formato del correo es inválido'], 400);
    }

    $pdo = getConnection();
    
    $stmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        jsonResponse(['success' => false, 'error' => 'El correo electrónico ya está registrado'], 400);
    }

    $passwordHash = password_hash($password, PASSWORD_DEFAULT);

    $stmt = $pdo->prepare("INSERT INTO usuarios (nombre, email, password_hash) VALUES (?, ?, ?)");
    $stmt->execute([$nombre, $email, $passwordHash]);

    $userId = $pdo->lastInsertId();
    $_SESSION['user_id'] = $userId;
    $_SESSION['user_name'] = $nombre;
    $_SESSION['user_email'] = $email;

    jsonResponse([
        'success' => true,
        'message' => 'Usuario registrado exitosamente',
        'user' => [
            'id' => $userId,
            'nombre' => $nombre,
            'email' => $email
        ]
    ]);
}

function handleLogin(array $input): void
{
    $email = trim($input['email'] ?? '');
    $password = $input['password'] ?? '';

    if (empty($email) || empty($password)) {
        jsonResponse(['success' => false, 'error' => 'Email y contraseña son requeridos'], 400);
    }

    $pdo = getConnection();
    $stmt = $pdo->prepare("SELECT id, email, password_hash, nombre FROM usuarios WHERE email = ?");
    $stmt->execute([$email]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonResponse(['success' => false, 'error' => 'Credenciales incorrectas'], 401);
    }

    $_SESSION['user_id'] = $user['id'];
    $_SESSION['user_name'] = $user['nombre'];
    $_SESSION['user_email'] = $user['email'];

    jsonResponse([
        'success' => true,
        'user' => [
            'id'     => $user['id'],
            'nombre' => $user['nombre'],
            'email'  => $user['email'],
        ]
    ]);
}

function handleLogout(): void
{
    $_SESSION = [];

    if (ini_get('session.use_cookies')) {
        $params = session_get_cookie_params();
        setcookie(session_name(), '', time() - 42000,
            $params['path'], $params['domain'],
            $params['secure'], $params['httponly']
        );
    }

    session_destroy();
    jsonResponse(['success' => true]);
}

function handleCheck(): void
{
    if (isAuthenticated()) {
        jsonResponse([
            'success' => true,
            'authenticated' => true,
            'user' => [
                'id'     => $_SESSION['user_id'],
                'nombre' => $_SESSION['user_name'],
                'email'  => $_SESSION['user_email'] ?? '',
            ]
        ]);
    } else {
        jsonResponse([
            'success' => true,
            'authenticated' => false,
            'user' => null
        ]);
    }
}

function handleUpdateCredentials(array $input): void
{
    requireAuth();

    $currentPassword = $input['current_password'] ?? '';
    $newEmail = trim($input['new_email'] ?? '');
    $newPassword = $input['new_password'] ?? '';

    if (empty($currentPassword)) {
        jsonResponse(['success' => false, 'error' => 'La contraseña actual es requerida'], 400);
    }

    $pdo = getConnection();
    $stmt = $pdo->prepare("SELECT id, email, password_hash FROM usuarios WHERE id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $user = $stmt->fetch();

    if (!$user || !password_verify($currentPassword, $user['password_hash'])) {
        jsonResponse(['success' => false, 'error' => 'Contraseña actual incorrecta'], 401);
    }

    $updates = [];
    $params = [];

    if (!empty($newEmail) && $newEmail !== $user['email']) {
        $checkStmt = $pdo->prepare("SELECT id FROM usuarios WHERE email = ? AND id != ?");
        $checkStmt->execute([$newEmail, $user['id']]);
        if ($checkStmt->fetch()) {
            jsonResponse(['success' => false, 'error' => 'El email ya está en uso'], 400);
        }
        $updates[] = "email = ?";
        $params[] = $newEmail;
    }

    if (!empty($newPassword)) {
        $updates[] = "password_hash = ?";
        $params[] = password_hash($newPassword, PASSWORD_DEFAULT);
    }

    if (empty($updates)) {
        jsonResponse(['success' => false, 'error' => 'No se proporcionaron cambios'], 400);
    }

    $params[] = $user['id'];
    $sql = "UPDATE usuarios SET " . implode(', ', $updates) . " WHERE id = ?";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);

    if (!empty($newEmail)) {
        $_SESSION['user_email'] = $newEmail;
    }

    jsonResponse(['success' => true, 'message' => 'Credenciales actualizadas correctamente']);
}

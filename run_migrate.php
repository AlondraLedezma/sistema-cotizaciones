<?php
require 'config/database.php';
$pdo = getConnection();
$sql = file_get_contents('migrate.sql');
$statements = array_filter(array_map('trim', explode(';', $sql)));
$ok = 0; $err = 0;
foreach ($statements as $s) {
    if (empty($s)) continue;
    try {
        $pdo->exec($s);
        $ok++;
    } catch (Exception $e) {
        echo 'WARN: ' . $e->getMessage() . PHP_EOL;
        $err++;
    }
}
echo "Done: $ok ok, $err warnings\n";

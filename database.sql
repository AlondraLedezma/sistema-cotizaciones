CREATE DATABASE  `cotizaciones_dematiq` ;

USE `cotizaciones_dematiq`;

DROP TABLE IF EXISTS `condiciones_comerciales`;
CREATE TABLE `condiciones_comerciales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `contenido` text NOT NULL,
  `orden` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `condiciones_comerciales_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `condiciones_comerciales` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `configuracion`;
CREATE TABLE `configuracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `configuracion` WRITE;
INSERT INTO `configuracion` VALUES (1,'iva_porcentaje','16'),(2,'empresa_nombre','DEMATIQ'),(3,'empresa_subtitulo','AUTOMATIZACI├ôN'),(4,'empresa_servicios','Integraci├│n de sistemas Automatizados\nProgramaci├│n de PLC, HMI\nServicio de Dise├▒o y Armado Tableros\nP├│lizas de Mantenimiento'),(5,'vendedor','Jose Moreno Rangel'),(6,'empresa_telefono','442 229 4936'),(7,'empresa_email','integraqro07@outlook.com'),(8,'tiempo_entrega_default','8 DIAS HABILES'),(9,'condiciones_pago_default','90 DIAS');
UNLOCK TABLES;

DROP TABLE IF EXISTS `partidas_equipo`;
CREATE TABLE `partidas_equipo` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_id` int(11) NOT NULL,
  `sub_seccion_id` int(11) DEFAULT NULL,
  `numero_partida` int(11) NOT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `marca` varchar(255) DEFAULT NULL,
  `modelo` varchar(255) DEFAULT NULL,
  `cantidad` int(11) DEFAULT 1,
  `precio_lista` decimal(15,2) DEFAULT 0.00,
  `moneda` enum('MN','USD') DEFAULT 'MN',
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `material` decimal(15,2) DEFAULT 0.00,
  `mano_obra_mecanico` decimal(15,2) DEFAULT 0.00,
  `diseno` decimal(15,2) DEFAULT 0.00,
  `transporte` decimal(15,2) DEFAULT 0.00,
  `porcentaje_mgn` decimal(5,2) DEFAULT 1.00,
  `total_mn` decimal(15,2) DEFAULT 0.00,
  `total_usd` decimal(15,2) DEFAULT 0.00,
  `orden` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `seccion_id` (`seccion_id`),
  KEY `fk_equipo_sub_seccion` (`sub_seccion_id`),
  CONSTRAINT `fk_equipo_sub_seccion` FOREIGN KEY (`sub_seccion_id`) REFERENCES `sub_secciones` (`id`) ON DELETE SET NULL,
  CONSTRAINT `partidas_equipo_ibfk_1` FOREIGN KEY (`seccion_id`) REFERENCES `secciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `partidas_equipo` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `partidas_insumos_especiales`;
CREATE TABLE `partidas_insumos_especiales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_id` int(11) NOT NULL,
  `tipo` enum('hospedaje','imss') NOT NULL,
  `descripcion` varchar(255) DEFAULT NULL,
  `num_personas` int(11) DEFAULT 1,
  `costo_por_persona` decimal(15,2) DEFAULT 0.00,
  `num_veces` int(11) DEFAULT 1,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `total_mn` decimal(15,2) DEFAULT 0.00,
  `total_usd` decimal(15,2) DEFAULT 0.00,
  `orden` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `seccion_id` (`seccion_id`),
  CONSTRAINT `partidas_insumos_especiales_ibfk_1` FOREIGN KEY (`seccion_id`) REFERENCES `secciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `partidas_insumos_especiales` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `partidas_io`;
CREATE TABLE `partidas_io` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_id` int(11) NOT NULL,
  `entrada` varchar(255) DEFAULT '',
  `descripcion_entrada` varchar(500) DEFAULT '',
  `salida` varchar(255) DEFAULT '',
  `descripcion_salida` varchar(500) DEFAULT '',
  `orden` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `seccion_id` (`seccion_id`),
  CONSTRAINT `partidas_io_ibfk_1` FOREIGN KEY (`seccion_id`) REFERENCES `secciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `partidas_io` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `partidas_mano_obra`;
CREATE TABLE `partidas_mano_obra` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_id` int(11) NOT NULL,
  `numero_partida` int(11) NOT NULL,
  `descripcion` varchar(500) DEFAULT NULL,
  `horas_mo` decimal(10,2) DEFAULT 0.00,
  `dias_trabajo` decimal(10,2) DEFAULT 1.00,
  `costo_hora_usd` decimal(10,2) DEFAULT 0.00,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `porcentaje_mgn` decimal(5,2) DEFAULT 1.05,
  `total_usd` decimal(15,2) DEFAULT 0.00,
  `total_mn` decimal(15,2) DEFAULT 0.00,
  `orden` int(11) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `seccion_id` (`seccion_id`),
  CONSTRAINT `partidas_mano_obra_ibfk_1` FOREIGN KEY (`seccion_id`) REFERENCES `secciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `partidas_mano_obra` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `proyectos`;
CREATE TABLE `proyectos` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `numero_proyecto` varchar(50) NOT NULL,
  `nombre_proyecto` varchar(255) NOT NULL,
  `referencia` text DEFAULT NULL,
  `referencia_id` varchar(100) DEFAULT NULL,
  `descripcion_solucion` text DEFAULT NULL,
  `empresa_cliente` varchar(255) DEFAULT NULL,
  `contacto_cliente` varchar(255) DEFAULT NULL,
  `telefono_cliente` varchar(100) DEFAULT NULL,
  `email_cliente` varchar(255) DEFAULT NULL,
  `atencion` varchar(255) DEFAULT NULL,
  `fecha_creacion` date NOT NULL,
  `fecha_vencimiento` date DEFAULT NULL,
  `tipo_cambio_usd` decimal(10,2) DEFAULT 20.00,
  `factor_insumos` decimal(10,2) DEFAULT 1.20,
  `subtotal_mn` decimal(15,2) DEFAULT 0.00,
  `iva` decimal(15,2) DEFAULT 0.00,
  `total_mn` decimal(15,2) DEFAULT 0.00,
  `total_usd` decimal(15,2) DEFAULT 0.00,
  `total_letras` text DEFAULT NULL,
  `carpeta_link` text DEFAULT NULL,
  `usuario_id` int(11) NOT NULL,
  `clave_eliminacion` varchar(255) DEFAULT 'dematiq2026',
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_proyecto` (`numero_proyecto`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `proyectos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `proyectos` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `puntos_texto`;
CREATE TABLE `puntos_texto` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `tipo` enum('prese_alcance1','prese_alcance2','listas') NOT NULL,
  `numero_punto` varchar(20) DEFAULT NULL,
  `contenido` text DEFAULT NULL,
  `orden` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `puntos_texto_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `puntos_texto` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `secciones`;
CREATE TABLE `secciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `codigo` varchar(20) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `tipo` enum('mano_obra','equipo') NOT NULL,
  `orden` int(11) NOT NULL,
  `color` varchar(20) DEFAULT NULL,
  `subtotal_usd` decimal(15,2) DEFAULT 0.00,
  `subtotal_mn` decimal(15,2) DEFAULT 0.00,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `secciones_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `secciones` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `sub_secciones`;
CREATE TABLE `sub_secciones` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_id` int(11) NOT NULL,
  `titulo` varchar(255) NOT NULL,
  `color` varchar(20) DEFAULT '#DAA520',
  `orden` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `seccion_id` (`seccion_id`),
  CONSTRAINT `sub_secciones_ibfk_1` FOREIGN KEY (`seccion_id`) REFERENCES `secciones` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `sub_secciones` WRITE;
UNLOCK TABLES;

DROP TABLE IF EXISTS `usuarios`;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
LOCK TABLES `usuarios` WRITE;
INSERT INTO `usuarios` VALUES (1,'admin@dematiq.com','$2y$10$8PTeSUxma61.VgTUNGrG2.CcZ2W3vBTshPyXScboMKqO8ruRxugKa','Administrador DEMATIQ','2026-05-27 18:55:01'),(2,'monse@dematiq.com','2e217432b4ef3fafa9511a29b893ddab658651ffff7ecf36f931cf8d22fcd17f','Alondra Monserrat','2026-06-19 15:44:56');
UNLOCK TABLES;

DROP TABLE IF EXISTS `listas_predefinidas`;
CREATE TABLE `listas_predefinidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_codigo` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=42 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

LOCK TABLES `listas_predefinidas` WRITE;
INSERT INTO `listas_predefinidas` VALUES 
(1, 'E_CONTROL', 'ALLEN BRADLEY', 1),
(2, 'E_CONTROL', 'SIEMENS', 2),
(3, 'E_CONTROL', 'MOELLER', 3),
(4, 'E_CONTROL', 'AUTONICS', 4),
(5, 'E_CONTROL', 'IFM', 5),
(6, 'E_CONTROL', 'WENGLOR', 6),
(7, 'E_CONTROL', 'SICK', 7),
(8, 'E_CONTROL', 'FESTO', 8),
(9, 'E_CONTROL', 'SMC', 9),
(10, 'E_CONTROL', 'OMRON', 10),
(11, 'E_CONTROL', 'PEPPERL+FUCHS', 11),
(12, 'E_CONTROL', 'KEYENCE', 12),
(13, 'E_CONTROL', 'PILZ', 13),
(14, 'E_ELECTRICO', 'RITTAL', 1),
(15, 'E_ELECTRICO', 'MOELLER', 2),
(16, 'E_ELECTRICO', 'SIEMENS', 3),
(17, 'E_ELECTRICO', 'ALLEN BRADLEY', 4),
(18, 'E_ELECTRICO', 'OMRON', 5),
(19, 'E_ELECTRICO', 'SCHNEIDER ELECTRIC', 6),
(20, 'E_ELECTRICO', 'WEIMULLER', 7),
(21, 'E_ELECTRICO', 'FINDER', 8),
(22, 'E_ELECTRICO', 'PILZ', 9),
(23, 'E_ELECTRICO', 'KEYENCE', 10),
(24, 'ING_MO', 'PROGRAMADOR PLC', 1),
(25, 'ING_MO', 'PROGRAMADOR DE HMI', 2),
(26, 'ING_MO', 'PROGRAMADOR DE SERVOS', 3),
(27, 'ING_MO', 'DISEÑO ELECTRICO', 4),
(28, 'ING_MO', 'DISEÑO MECANICO', 5),
(29, 'ING_MO', 'INSTALADOR ELECTRICO', 6),
(30, 'ING_MO', 'ARMADO DE TABLEROS ELEC', 7),
(31, 'ING_MO', 'MONTAJE MECANICO', 8),
(32, 'ING_MO', 'INGENIERO DE SERVICIO', 9),
(33, 'ING_MO', 'LEVANTAMIENTO PLANTA', 10),
(34, 'ING_MO', 'PUESTA EN MARCHA PLANTA', 11),
(35, 'ING_MO', 'PROGRAMACION DE S. VISION', 12),
(36, 'E_NEUMATICO', 'SMC', 1),
(37, 'E_NEUMATICO', 'FESTO', 2),
(38, 'E_NEUMATICO', 'ASCO NEUMATICS', 3),
(39, 'E_NEUMATICO', 'PARKER', 4),
(40, 'E_NEUMATICO', 'NORGREN', 5),
(41, 'E_NEUMATICO', 'BOSCH REXROTH', 6);
UNLOCK TABLES;

DROP TABLE IF EXISTS `subtemas_prese`;
CREATE TABLE `subtemas_prese` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `titulo` varchar(500) NOT NULL,
  `contenido` text DEFAULT NULL,
  `indice` varchar(20) NOT NULL,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `subtemas_prese_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

DROP TABLE IF EXISTS `cotizaciones_mecanico`;
CREATE TABLE `cotizaciones_mecanico` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `partida` int(11) NOT NULL,
  `descripcion` varchar(500) DEFAULT '',
  `precio` decimal(15,2) DEFAULT 0.00,
  `cantidad` int(11) DEFAULT 1,
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `cotizaciones_mecanico_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;



CREATE TABLE `partidas_mecanico` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `numero_partida` int(11) NOT NULL,
  `descripcion_pieza` varchar(500) DEFAULT '',
  `material` varchar(255) DEFAULT '',
  `costo_material` decimal(15,2) DEFAULT 0.00,
  `mano_obra` varchar(255) DEFAULT '',
  `costo_mano_obra` decimal(15,2) DEFAULT 0.00,
  `cantidad` int(11) DEFAULT 1,
  `moneda` enum('MN','USD') DEFAULT 'MN',
  `subtotal` decimal(15,2) DEFAULT 0.00,
  `porcentaje_mgn` decimal(5,2) DEFAULT 0.00,
  `total_mn` decimal(15,2) DEFAULT 0.00,
  `total_usd` decimal(15,2) DEFAULT 0.00,
  `orden` int(11) NOT NULL DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `partidas_mecanico_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
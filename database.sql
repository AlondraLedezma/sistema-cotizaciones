-- MariaDB dump 10.19  Distrib 10.4.32-MariaDB, for Win64 (AMD64)
--
-- Host: localhost    Database: cotizaciones_dematiq
-- ------------------------------------------------------
-- Server version	10.4.32-MariaDB

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Current Database: `cotizaciones_dematiq`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `cotizaciones_dematiq` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;

USE `cotizaciones_dematiq`;

--
-- Table structure for table `condiciones_comerciales`
--

DROP TABLE IF EXISTS `condiciones_comerciales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `condiciones_comerciales`
--

LOCK TABLES `condiciones_comerciales` WRITE;
/*!40000 ALTER TABLE `condiciones_comerciales` DISABLE KEYS */;
/*!40000 ALTER TABLE `condiciones_comerciales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `configuracion`
--

DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `configuracion`
--

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (1,'iva_porcentaje','16'),(2,'empresa_nombre','DEMATIQ'),(3,'empresa_subtitulo','AUTOMATIZACI├ôN'),(4,'empresa_servicios','Integraci├│n de sistemas Automatizados\nProgramaci├│n de PLC, HMI\nServicio de Dise├▒o y Armado Tableros\nP├│lizas de Mantenimiento'),(5,'vendedor','Jose Moreno Rangel'),(6,'empresa_telefono','442 229 4936'),(7,'empresa_email','integraqro07@outlook.com'),(8,'tiempo_entrega_default','8 DIAS HABILES'),(9,'condiciones_pago_default','90 DIAS');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidas_equipo`
--

DROP TABLE IF EXISTS `partidas_equipo`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidas_equipo`
--

LOCK TABLES `partidas_equipo` WRITE;
/*!40000 ALTER TABLE `partidas_equipo` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas_equipo` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidas_insumos_especiales`
--

DROP TABLE IF EXISTS `partidas_insumos_especiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidas_insumos_especiales`
--

LOCK TABLES `partidas_insumos_especiales` WRITE;
/*!40000 ALTER TABLE `partidas_insumos_especiales` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas_insumos_especiales` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidas_io`
--

DROP TABLE IF EXISTS `partidas_io`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidas_io`
--

LOCK TABLES `partidas_io` WRITE;
/*!40000 ALTER TABLE `partidas_io` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas_io` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partidas_mano_obra`
--

DROP TABLE IF EXISTS `partidas_mano_obra`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partidas_mano_obra`
--

LOCK TABLES `partidas_mano_obra` WRITE;
/*!40000 ALTER TABLE `partidas_mano_obra` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas_mano_obra` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `proyectos`
--

DROP TABLE IF EXISTS `proyectos`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `proyectos`
--

LOCK TABLES `proyectos` WRITE;
/*!40000 ALTER TABLE `proyectos` DISABLE KEYS */;
/*!40000 ALTER TABLE `proyectos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `puntos_texto`
--

DROP TABLE IF EXISTS `puntos_texto`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `puntos_texto`
--

LOCK TABLES `puntos_texto` WRITE;
/*!40000 ALTER TABLE `puntos_texto` DISABLE KEYS */;
/*!40000 ALTER TABLE `puntos_texto` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `secciones`
--

DROP TABLE IF EXISTS `secciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `secciones`
--

LOCK TABLES `secciones` WRITE;
/*!40000 ALTER TABLE `secciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `secciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sub_secciones`
--

DROP TABLE IF EXISTS `sub_secciones`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sub_secciones`
--

LOCK TABLES `sub_secciones` WRITE;
/*!40000 ALTER TABLE `sub_secciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `sub_secciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

DROP TABLE IF EXISTS `usuarios`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `usuarios` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `email` varchar(255) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `nombre` varchar(255) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,'admin@dematiq.com','$2y$10$8PTeSUxma61.VgTUNGrG2.CcZ2W3vBTshPyXScboMKqO8ruRxugKa','Administrador DEMATIQ','2026-05-27 18:55:01'),(2,'monse@dematiq.com','2e217432b4ef3fafa9511a29b893ddab658651ffff7ecf36f931cf8d22fcd17f','Alondra Monserrat','2026-06-19 15:44:56');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-06-22 18:55:59

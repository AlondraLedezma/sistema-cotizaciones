
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
) ENGINE=InnoDB AUTO_INCREMENT=74 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `condiciones_comerciales` WRITE;
/*!40000 ALTER TABLE `condiciones_comerciales` DISABLE KEYS */;
INSERT INTO `condiciones_comerciales` VALUES (11,3,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(12,3,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(13,3,'C3','Anticipo del 50% para iniciar trabajos.',3),(14,3,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(15,3,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5),(26,6,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(27,6,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(28,6,'C3','Anticipo del 50% para iniciar trabajos.',3),(29,6,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(30,6,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5),(48,9,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(49,9,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(50,9,'C3','Anticipo del 50% para iniciar trabajos.',3),(51,9,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(52,9,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5),(53,10,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(54,10,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(55,10,'C3','Anticipo del 50% para iniciar trabajos.',3),(56,10,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(57,10,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5),(58,11,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(59,11,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(60,11,'C3','Anticipo del 50% para iniciar trabajos.',3),(61,11,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(62,11,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5),(63,12,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(64,12,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(65,12,'C3','Anticipo del 50% para iniciar trabajos.',3),(66,12,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(67,12,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5),(68,12,'A4.6','',6),(69,13,'C1','Precios expresados en Moneda Nacional con IVA incluido.',1),(70,13,'C2','Tiempo de entrega seg├║n especificaciones del proyecto.',2),(71,13,'C3','Anticipo del 50% para iniciar trabajos.',3),(72,13,'C4','Garant├¡a de 12 meses en equipos instalados.',4),(73,13,'C5','Cotizaci├│n v├ílida por 30 d├¡as naturales.',5);
/*!40000 ALTER TABLE `condiciones_comerciales` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `configuracion`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `configuracion` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `clave` varchar(100) NOT NULL,
  `valor` text NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `clave` (`clave`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `configuracion` WRITE;
/*!40000 ALTER TABLE `configuracion` DISABLE KEYS */;
INSERT INTO `configuracion` VALUES (10,'clave_listas','dematiq123'),(11,'vendedor','Jose Moreno Rangel '),(14,'vendedor_correo','ventas@dematiq.com'),(16,'vendedor_telefono','4427214891');
/*!40000 ALTER TABLE `configuracion` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `cotizaciones_mecanico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `cotizaciones_mecanico` WRITE;
/*!40000 ALTER TABLE `cotizaciones_mecanico` DISABLE KEYS */;
/*!40000 ALTER TABLE `cotizaciones_mecanico` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `insumos_gastos_admin`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `insumos_gastos_admin` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `descripcion` varchar(300) DEFAULT '',
  `costo` float DEFAULT 0,
  `subtotal` float DEFAULT 0,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `iga_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `insumos_gastos_admin` WRITE;
/*!40000 ALTER TABLE `insumos_gastos_admin` DISABLE KEYS */;
INSERT INTO `insumos_gastos_admin` VALUES (9,3,'',0,0,1),(13,9,'',0,0,1),(14,10,'',0,0,1),(17,11,'',0,0,1),(19,12,'KKKK',200,200,1),(20,12,'',0,0,2),(21,13,'',0,0,1);
/*!40000 ALTER TABLE `insumos_gastos_admin` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `insumos_imss`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `insumos_imss` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `num_personal` varchar(200) DEFAULT '',
  `personas` float DEFAULT 0,
  `costo_dia` float DEFAULT 0,
  `dias` float DEFAULT 0,
  `subtotal` float DEFAULT 0,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `imss_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `insumos_imss` WRITE;
/*!40000 ALTER TABLE `insumos_imss` DISABLE KEYS */;
INSERT INTO `insumos_imss` VALUES (13,3,'1',0,0,0,0,1),(19,9,'',0,0,0,0,1),(20,10,'',0,0,0,0,1),(24,11,'',0,0,0,0,1),(25,12,'INGENIERO',2,550,2,2200,1),(26,12,'',0,0,0,0,2),(27,12,'',0,0,0,0,3),(28,13,'',0,0,0,0,1);
/*!40000 ALTER TABLE `insumos_imss` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `insumos_transporte`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `insumos_transporte` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `descripcion` varchar(300) DEFAULT '',
  `costo` float DEFAULT 0,
  `no_veces` float DEFAULT 0,
  `subtotal` float DEFAULT 0,
  `orden` int(11) DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `it_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=64 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `insumos_transporte` WRITE;
/*!40000 ALTER TABLE `insumos_transporte` DISABLE KEYS */;
INSERT INTO `insumos_transporte` VALUES (16,6,'CAMIONETA CARGA',0,0,0,1),(19,6,'',0,0,0,4),(28,3,'CAMIONETA CARGA',0,0,0,1),(29,3,'ENVIO PAQUETERIA',0,0,0,2),(30,3,'IMSS',0,0,0,3),(31,3,'',0,0,0,4),(41,9,'CAMIONETA CARGA',0,0,0,1),(42,9,'ENVIO PAQUETERIA',0,0,0,2),(43,9,'IMSS',0,0,0,3),(44,9,'',0,0,0,4),(45,10,'CAMIONETA CARGA',0,0,0,1),(46,10,'ENVIO PAQUETERIA',0,0,0,2),(47,10,'IMSS',0,0,0,3),(48,10,'',0,0,0,4),(51,11,'CAMIONETA CARGA',0,0,0,1),(52,11,'ENVIO PAQUETERIA',0,0,0,2),(53,11,'IMSS',0,0,0,3),(54,11,'',0,0,0,4),(55,12,'CAMIONETA CARGA',600,2,1200,1),(56,12,'ENVIO PAQUETERIA',4000,1,4000,2),(57,12,'IMSS',800,3,2400,3),(58,12,'',0,0,0,4),(59,12,'',0,0,0,5),(60,13,'CAMIONETA CARGA',0,0,0,1),(61,13,'ENVIO PAQUETERIA',0,0,0,2),(62,13,'IMSS',0,0,0,3),(63,13,'',0,0,0,4);
/*!40000 ALTER TABLE `insumos_transporte` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `insumos_viaticos_cd`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `insumos_viaticos_cd` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `persona` varchar(200) DEFAULT '',
  `personas` float DEFAULT 0,
  `viajes_cd` float DEFAULT 0,
  `autobus` float DEFAULT 0,
  `taxis` float DEFAULT 0,
  `subtotal_mn` float DEFAULT 0,
  `autocasetas` float DEFAULT 0,
  `gasolina` float DEFAULT 0,
  `subtotal_mn2` float DEFAULT 0,
  `orden` int(11) DEFAULT 0,
  `renta_auto` float DEFAULT 0,
  `dias` float DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `ivc_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=81 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `insumos_viaticos_cd` WRITE;
/*!40000 ALTER TABLE `insumos_viaticos_cd` DISABLE KEYS */;
INSERT INTO `insumos_viaticos_cd` VALUES (16,6,'INGENIERO',0,0,0,0,0,0,0,0,1,0,0),(17,6,'TECNICO',0,0,0,0,0,0,0,0,2,0,0),(18,6,'ELECTRICO',0,0,0,0,0,0,0,0,3,0,0),(19,6,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0),(28,3,'INGENIERO',0,0,0,0,0,0,0,0,1,0,0),(29,3,'TECNICO',0,0,0,0,0,0,0,0,2,0,0),(30,3,'ELECTRICO',0,0,0,0,0,0,0,0,3,0,0),(31,3,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0),(47,9,'INGENIERO',0,0,0,0,0,0,0,0,1,0,0),(48,9,'TECNICO',0,0,0,0,0,0,0,0,2,0,0),(49,9,'ELECTRICO',0,0,0,0,0,0,0,0,3,0,0),(50,9,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0),(52,10,'INGENIERO',0,0,0,0,0,0,0,0,1,0,0),(53,10,'TECNICO',0,0,0,0,0,0,0,0,2,0,0),(54,10,'ELECTRICO',0,0,0,0,0,0,0,0,3,0,0),(55,10,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0),(63,11,'INGENIERO',0,0,0,0,0,0,0,0,1,0,0),(64,11,'TECNICO',0,0,0,0,0,0,0,0,2,0,0),(65,11,'ELECTRICO',0,0,0,0,0,0,0,0,3,0,0),(66,11,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0),(71,12,'INGENIERO',2,2,100,100,800,550,600,3300,1,500,2),(72,12,'TECNICO',3,4,400,200,7200,600,300,9500,2,1000,5),(73,12,'ELECTRICO',4,2,150,100,2000,0,0,0,3,0,0),(74,12,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0),(75,12,'',0,0,0,0,0,0,0,0,5,0,0),(76,12,'',0,0,0,0,0,0,0,0,6,0,0),(77,13,'INGENIERO',0,0,0,0,0,0,0,0,1,0,0),(78,13,'TECNICO',0,0,0,0,0,0,0,0,2,0,0),(79,13,'ELECTRICO',0,0,0,0,0,0,0,0,3,0,0),(80,13,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,4,0,0);
/*!40000 ALTER TABLE `insumos_viaticos_cd` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `insumos_viaticos_en_cd`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `insumos_viaticos_en_cd` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `proyecto_id` int(11) NOT NULL,
  `persona` varchar(200) DEFAULT '',
  `personas` float DEFAULT 0,
  `dias` float DEFAULT 0,
  `alimentos` float DEFAULT 0,
  `hotel` float DEFAULT 0,
  `transporte` float DEFAULT 0,
  `subtotal_mn` float DEFAULT 0,
  `renta_coche` float DEFAULT 0,
  `meses` float DEFAULT 0,
  `renta_casa` float DEFAULT 0,
  `subtotal_mn2` float DEFAULT 0,
  `orden` int(11) DEFAULT 0,
  `gasolina` float DEFAULT 0,
  `dias_auto` float DEFAULT 0,
  `casetas` float DEFAULT 0,
  `renta_auto` float DEFAULT 0,
  PRIMARY KEY (`id`),
  KEY `proyecto_id` (`proyecto_id`),
  CONSTRAINT `ivec_ibfk_1` FOREIGN KEY (`proyecto_id`) REFERENCES `proyectos` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=57 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `insumos_viaticos_en_cd` WRITE;
/*!40000 ALTER TABLE `insumos_viaticos_en_cd` DISABLE KEYS */;
INSERT INTO `insumos_viaticos_en_cd` VALUES (13,6,'INGENIERO',0,0,0,0,0,0,0,0,0,0,1,0,0,0,0),(14,6,'TECNICO',0,0,0,0,0,0,0,0,0,0,2,0,0,0,0),(15,6,'ELECTRICO',0,0,0,0,0,0,0,0,0,0,3,0,0,0,0),(16,6,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0),(20,3,'INGENIERO',0,0,0,0,0,0,0,0,0,0,1,0,0,0,0),(21,3,'TECNICO',0,0,0,0,0,0,0,0,0,0,2,0,0,0,0),(22,3,'ELECTRICO',0,0,0,0,0,0,0,0,0,0,3,0,0,0,0),(23,3,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0),(33,9,'INGENIERO',0,0,0,0,0,0,0,0,0,0,1,0,0,0,0),(34,9,'TECNICO',0,0,0,0,0,0,0,0,0,0,2,0,0,0,0),(35,9,'ELECTRICO',0,0,0,0,0,0,0,0,0,0,3,0,0,0,0),(36,9,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0),(37,10,'INGENIERO',0,0,0,0,0,0,0,0,0,0,1,0,0,0,0),(38,10,'TECNICO',0,0,0,0,0,0,0,0,0,0,2,0,0,0,0),(39,10,'ELECTRICO',0,0,0,0,0,0,0,0,0,0,3,0,0,0,0),(40,10,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0),(45,11,'INGENIERO',0,0,0,0,0,0,0,0,0,0,1,0,0,0,0),(46,11,'TECNICO',0,0,0,0,0,0,0,0,0,0,2,0,0,0,0),(47,11,'ELECTRICO',0,0,0,0,0,0,0,0,0,0,3,0,0,0,0),(48,11,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0),(49,12,'INGENIERO',1,2,100,500,600,2400,600,2,500,3200,1,500,2,0,0),(50,12,'TECNICO',2,3,400,600,500,9000,0,0,0,0,2,0,0,0,0),(51,12,'ELECTRICO',4,5,900,1000,200,42000,0,0,0,0,3,0,0,0,0),(52,12,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0),(53,13,'INGENIERO',0,0,0,0,0,0,0,0,0,0,1,0,0,0,0),(54,13,'TECNICO',0,0,0,0,0,0,0,0,0,0,2,0,0,0,0),(55,13,'ELECTRICO',0,0,0,0,0,0,0,0,0,0,3,0,0,0,0),(56,13,'AYUDANTE GENERAL',0,0,0,0,0,0,0,0,0,0,4,0,0,0,0);
/*!40000 ALTER TABLE `insumos_viaticos_en_cd` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `listas_predefinidas`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `listas_predefinidas` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_codigo` varchar(50) NOT NULL,
  `valor` varchar(255) NOT NULL,
  `orden` int(11) DEFAULT 0,
  `factor` float DEFAULT 1.2,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=68 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `listas_predefinidas` WRITE;
/*!40000 ALTER TABLE `listas_predefinidas` DISABLE KEYS */;
INSERT INTO `listas_predefinidas` VALUES (1,'E_CONTROL','ALLEN BRADLEY',1,1.2),(2,'E_CONTROL','SIEMENS',2,1.2),(3,'E_CONTROL','MOELLER',3,1.2),(4,'E_CONTROL','AUTONICS',4,1.2),(5,'E_CONTROL','IFM',5,1.2),(6,'E_CONTROL','WENGLOR',6,1.2),(7,'E_CONTROL','SICK',7,1.2),(8,'E_CONTROL','FESTO',8,1.2),(9,'E_CONTROL','SMC',9,1.2),(10,'E_CONTROL','OMRON',10,1.2),(11,'E_CONTROL','PEPPERL+FUCHS',11,1.2),(12,'E_CONTROL','KEYENCE',12,1.2),(13,'E_CONTROL','PILZ',13,1.2),(14,'E_ELECTRICO','RITTAL',1,1.2),(15,'E_ELECTRICO','MOELLER',2,1.2),(16,'E_ELECTRICO','SIEMENS',3,1.2),(17,'E_ELECTRICO','ALLEN BRADLEY',4,1.2),(18,'E_ELECTRICO','OMRON',5,1.2),(19,'E_ELECTRICO','SCHNEIDER ELECTRIC',6,1.2),(20,'E_ELECTRICO','WEIMULLER',7,1.2),(21,'E_ELECTRICO','FINDER',8,1.2),(22,'E_ELECTRICO','PILZ',9,1.2),(23,'E_ELECTRICO','KEYENCE',10,1.2),(24,'ING_MO','PROGRAMADOR PLC',1,1.2),(25,'ING_MO','PROGRAMADOR DE HMI',2,1.2),(26,'ING_MO','PROGRAMADOR DE SERVOS',3,1.2),(27,'ING_MO','DISE├æO ELECTRICO',4,1.2),(28,'ING_MO','DISE├æO MECANICO',5,1.2),(29,'ING_MO','INSTALADOR ELECTRICO',6,1.2),(30,'ING_MO','ARMADO DE TABLEROS ELEC',7,1.2),(31,'ING_MO','MONTAJE MECANICO',8,1.2),(32,'ING_MO','INGENIERO DE SERVICIO',9,1.2),(33,'ING_MO','LEVANTAMIENTO PLANTA',10,1.2),(34,'ING_MO','PUESTA EN MARCHA PLANTA',11,1.2),(35,'ING_MO','PROGRAMACION DE S. VISION',12,1.2),(36,'E_NEUMATICO','SMC',1,1.2),(37,'E_NEUMATICO','FESTO',2,1.2),(38,'E_NEUMATICO','ASCO NEUMATICS',3,1.2),(39,'E_NEUMATICO','PARKER',4,1.2),(40,'E_NEUMATICO','NORGREN',5,1.2),(41,'E_NEUMATICO','BOSCH REXROTH',6,1.2),(42,'INSUMOS','FACTOR VIATICOS A CD',1,1.2),(43,'INSUMOS','FACTOR VIATICOS EN CD',2,1.9),(44,'INSUMOS','FACTOR TRANSPORTE',3,1.2),(45,'INSUMOS','FACTOR GASTOS ADMIN',4,1.5),(46,'INSUMOS','FACTOR IMSS',5,1.6),(48,'INSUMOS','FACTOR AUTO FORANEO',2,1.3),(49,'INSUMOS','FACTOR HOSPEDAJE',5,1.4),(50,'INSUMOS','FACTOR AUTO LOCAL',4,1.2),(51,'T_ELECTRICO','Llave',1,1.2),(52,'E_MECANICO','ACERO A36',1,1.2),(53,'E_MECANICO','ALUMINIO 6061',2,1.2),(54,'E_MECANICO','ACERO INOXIDABLE 304',3,1.2),(55,'E_MECANICO','ACERO INOXIDABLE 316',4,1.2),(56,'E_MECANICO','NYLAMID',5,1.2),(57,'E_MECANICO','DELRIN',6,1.2),(58,'E_MECANICO','BRONCE',7,1.2),(59,'E_MECANICO','PLACA ACERO 1018',8,1.2),(60,'MO_MECANICO','MAQUINADO CNC',1,1.2),(61,'MO_MECANICO','MAQUINADO CONVENCIONAL',2,1.2),(62,'MO_MECANICO','CORTE POR LASER/CHORRO DE AGUA',3,1.2),(63,'MO_MECANICO','DOBLADO DE LAMINA',4,1.2),(64,'MO_MECANICO','SOLDADURA Y HERRERIA',5,1.2),(65,'MO_MECANICO','DISE├æO MECANICO',6,1.2),(66,'MO_MECANICO','MONTAJE Y AJUSTE',7,1.2);
/*!40000 ALTER TABLE `listas_predefinidas` ENABLE KEYS */;
UNLOCK TABLES;
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
) ENGINE=InnoDB AUTO_INCREMENT=120 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `partidas_equipo` WRITE;
/*!40000 ALTER TABLE `partidas_equipo` DISABLE KEYS */;
INSERT INTO `partidas_equipo` VALUES (8,51,NULL,1,'EQUIPO DE CONTROL','','',1,250.00,'MN',250.00,0.00,0.00,0.00,0.00,10.00,275.00,13.75,1),(9,51,NULL,2,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,2),(10,52,NULL,1,'EQUIPO ELECTRICO','','',1,500.00,'MN',500.00,0.00,0.00,0.00,0.00,0.00,500.00,25.00,1),(21,22,NULL,1,'Sistema','ALLEN BRADLEY','3DE',1,456.00,'MN',456.00,0.00,0.00,0.00,0.00,5.00,478.80,23.87,1),(22,22,NULL,2,'OTRO','PEPPERL+FUCHS','7ER',1,458.00,'MN',458.00,0.00,0.00,0.00,0.00,8.00,494.64,24.66,2),(37,81,NULL,1,'Tipo de cambio Me gusta  No me gusta Los textos largos son relatos extensos que permiten una inmersi├│n profunda en la historia, ideales para ni├▒os, j├│venes y adultos, y se encuentran disponibles en m├║ltiples colecciones en l├¡nea. Qu├® son los textos largos Los textos largos son narraciones m├ís extensas que los cuentos breves, dise├▒adas para ofrecer una experiencia literaria m├ís completa. Pueden incluir cuentos de aventuras, fantas├¡a, terror, amor o historias de la vida cotidiana, y permiten desar','','',5,852.00,'MN',4260.00,0.00,0.00,0.00,0.00,0.00,4260.00,210.89,1),(38,81,NULL,2,'TIPO','','',5,9.00,'MN',45.00,0.00,0.00,0.00,0.00,0.00,45.00,2.23,2),(53,81,NULL,3,'HHH','','',110,555.00,'MN',61050.00,0.00,0.00,0.00,0.00,0.00,61050.00,3022.28,3),(59,88,NULL,1,'mmm','','',71,451.00,'MN',32021.00,0.00,0.00,0.00,0.00,0.00,32021.00,1601.05,1),(62,88,NULL,2,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,2),(65,102,NULL,1,'EQUIPO DE CONTROL','ALLEN BRADLEY','4BS',6,250.00,'MN',1500.00,0.00,0.00,0.00,0.00,10.00,1650.00,82.50,1),(66,102,NULL,2,'EQUIPO ELECTRICO ','SIEMENS','3ER',9,456.00,'MN',4104.00,0.00,0.00,0.00,0.00,5.00,4309.20,215.46,2),(67,102,NULL,3,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,3),(68,103,NULL,2,'ELECTRICO','','75Y',1,200.00,'MN',200.00,0.00,0.00,0.00,0.00,5.00,210.00,10.50,2),(69,103,NULL,3,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,3),(70,103,NULL,4,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(71,104,NULL,1,'LLANTAS ','SMC','S34',2,45.00,'MN',90.00,0.00,0.00,0.00,0.00,5.00,94.50,4.73,1),(72,104,NULL,2,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,2),(73,104,NULL,3,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,3),(74,104,NULL,4,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(75,105,NULL,1,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,1),(76,109,NULL,1,'bvhb','Llave','bn7',1,20.00,'MN',20.00,0.00,0.00,0.00,0.00,10.00,22.00,1.10,1),(87,95,NULL,1,'HAHHA','','',1,1000.00,'MN',1000.00,0.00,0.00,0.00,0.00,0.00,1000.00,50.00,1),(88,95,NULL,2,'HAHAH','','',5,100.00,'MN',500.00,0.00,0.00,0.00,0.00,0.00,500.00,25.00,2),(92,95,NULL,3,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,3),(96,81,NULL,4,'hh','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(99,81,NULL,5,'nnnn','','',15,100.00,'MN',1500.00,0.00,0.00,0.00,0.00,0.00,1500.00,74.26,5),(100,109,NULL,2,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,2),(101,81,NULL,6,'jjjj','','',2,100.00,'MN',200.00,0.00,0.00,0.00,0.00,0.00,200.00,9.90,6),(102,81,NULL,7,'nmbjj','','',1,1000.00,'MN',1000.00,0.00,0.00,0.00,0.00,0.00,1000.00,49.50,7),(103,95,NULL,4,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(104,102,NULL,4,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(107,103,NULL,4,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(108,102,NULL,5,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,5),(109,104,NULL,5,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,5),(110,109,NULL,3,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,3),(111,109,NULL,4,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,4),(112,109,NULL,5,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,5),(113,102,NULL,6,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,6),(114,103,NULL,5,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,5),(115,103,NULL,6,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,6),(116,104,NULL,6,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,6),(117,109,NULL,6,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,6),(118,95,NULL,5,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,5),(119,113,NULL,1,'','','',1,0.00,'MN',0.00,0.00,0.00,0.00,0.00,0.00,0.00,0.00,1);
/*!40000 ALTER TABLE `partidas_equipo` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `partidas_insumos_especiales`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `partidas_insumos_especiales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `seccion_id` int(11) NOT NULL,
  `tipo` enum('hospedaje','imss') NOT NULL,
  `num_personal` int(11) DEFAULT 1,
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

LOCK TABLES `partidas_insumos_especiales` WRITE;
/*!40000 ALTER TABLE `partidas_insumos_especiales` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas_insumos_especiales` ENABLE KEYS */;
UNLOCK TABLES;
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

LOCK TABLES `partidas_io` WRITE;
/*!40000 ALTER TABLE `partidas_io` DISABLE KEYS */;
/*!40000 ALTER TABLE `partidas_io` ENABLE KEYS */;
UNLOCK TABLES;
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
) ENGINE=InnoDB AUTO_INCREMENT=62 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `partidas_mano_obra` WRITE;
/*!40000 ALTER TABLE `partidas_mano_obra` DISABLE KEYS */;
INSERT INTO `partidas_mano_obra` VALUES (6,50,1,'PROGRAMADOR PLC',0.00,1.00,45.00,0.00,0.00,0.00,0.00,1),(7,50,2,'',0.00,1.00,0.00,0.00,0.00,0.00,0.00,2),(42,101,1,'DISE├æO ELECTRICO',13.00,41.00,9.00,4797.00,9.00,5228.73,104574.60,1),(43,101,2,'PUESTA EN MARCHA PLANTA',9.00,1.00,5.00,45.00,8.00,48.60,972.00,2),(44,101,3,'PUESTA EN MARCHA PLANTA',7.00,1.00,5.00,35.00,2.00,35.70,714.00,3),(45,101,4,'PROGRAMADOR DE SERVOS',10.00,17.00,20.00,3400.00,7.00,3638.00,72760.00,4),(46,101,5,'ARMADO DE TABLEROS ELEC',10.00,1.50,0.00,0.00,0.00,0.00,0.00,5),(47,101,6,'LEVANTAMIENTO PLANTA',45.00,1.00,8.00,360.00,4.00,374.40,7488.00,6),(48,101,7,'PUESTA EN MARCHA PLANTA',3.00,1.00,10.00,30.00,0.00,30.00,600.00,7),(49,101,8,'LEVANTAMIENTO PLANTA',45.00,15.00,10.00,6750.00,5.00,7087.50,141750.00,8),(50,101,9,'PUESTA EN MARCHA PLANTA',0.00,1.00,0.00,0.00,0.00,0.00,0.00,9),(60,101,10,'',0.00,1.00,0.00,0.00,0.00,0.00,0.00,10),(61,101,11,'',0.00,1.00,0.00,0.00,0.00,0.00,0.00,11);
/*!40000 ALTER TABLE `partidas_mano_obra` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `partidas_mecanico`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `partidas_mecanico` WRITE;
/*!40000 ALTER TABLE `partidas_mecanico` DISABLE KEYS */;
INSERT INTO `partidas_mecanico` VALUES (4,12,1,'llena','ACERO A36',231.00,'MAQUINADO CNC',102.00,1,'MN',333.00,10.00,366.30,18.32,1),(5,12,2,'PIEZA DE METAL','ACERO A36',622.00,'MAQUINADO CNC',100.00,3,'MN',2166.00,6.00,2295.96,114.80,2),(10,12,3,'dhhhhshs','DELRIN',500.00,'MAQUINADO CNC',100.00,2,'MN',1200.00,10.00,1320.00,66.00,3),(12,12,4,'','',0.00,'',0.00,1,'MN',0.00,0.00,0.00,0.00,4),(14,12,5,'','',0.00,'',0.00,1,'MN',0.00,0.00,0.00,0.00,5),(15,12,6,'','',0.00,'',0.00,1,'MN',0.00,0.00,0.00,0.00,6);
/*!40000 ALTER TABLE `partidas_mecanico` ENABLE KEYS */;
UNLOCK TABLES;
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
  `tipo_proyecto` enum('completo','mecanico','cotizacion') DEFAULT 'completo',
  `tiempo_entrega` varchar(255) DEFAULT '8 DIAS HABILES',
  `condiciones_pago` varchar(255) DEFAULT '90 DIAS',
  `porcentaje_iva` decimal(5,2) DEFAULT 16.00,
  `factor_insumos` decimal(10,2) DEFAULT 1.20,
  `logo_data` longtext DEFAULT NULL,
  `empresa_slogan` text DEFAULT NULL,
  `dias_vigencia` int(11) DEFAULT 30,
  `nota_bullet_1` text DEFAULT NULL,
  `nota_bullet_2` text DEFAULT NULL,
  `nota_bullet_3` text DEFAULT NULL,
  `nota_bullet_4` text DEFAULT NULL,
  `nota_bullet_5` text DEFAULT NULL,
  `nota_aclaracion` text DEFAULT NULL,
  `notas_json` text DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `numero_proyecto` (`numero_proyecto`),
  KEY `usuario_id` (`usuario_id`),
  CONSTRAINT `proyectos_ibfk_1` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `proyectos` WRITE;
/*!40000 ALTER TABLE `proyectos` DISABLE KEYS */;
INSERT INTO `proyectos` VALUES (3,'DM-002','SISTEMA 2','PROYECTO DE AUTOMATIZACION',NULL,NULL,'EATON',NULL,'4421354875','perez.01@.com','IG. PEREZ','2026-07-10','2026-08-09',20.06,0.00,0.00,973.44,48.53,NULL,'C:/Users/monse/Downloads',1,'dematiq2026','2026-07-10 22:28:02','2026-08-06 03:48:03','completo','8 DIAS HABILES','90 DIAS',16.00,1.20,NULL,NULL,30,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(6,'DM-2026-2116','COPIA - maquina torque','',NULL,NULL,'eaton',NULL,'4427489562','ventas@dematiq.com','ing. pedro','2026-07-10','0000-00-00',20.00,0.00,0.00,775.00,38.75,NULL,'',1,'dematiq2026','2026-07-11 00:42:27','2026-07-30 04:33:26','completo','8 DIAS HABILES','90 DIAS',16.00,1.20,NULL,NULL,30,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(9,'COT-5 DEM','PRUEBA','PRUEBA DE COTIZACION',NULL,'','DEMATIQ',NULL,'4421257896','DEMA@123.COM','ING LUIS','2026-06-04','2026-07-05',20.20,0.00,0.00,68055.00,3369.06,NULL,'C:/Users/monse/Downloads',1,'dematiq2026','2026-08-06 03:20:10','2026-08-17 20:59:22','cotizacion','10- DIAS HABILES','Condiciones de Pago : 90 DIAS',16.00,1.20,'','',31,'Tiempo de Entrega: Los d├¡as de entrega ser├ín considerados a partir de la recepci├│n de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.','Si esta cotizaci├│n es en pesos y el tipo de cambio sufre una variaci├│n mayor al 2%, esta cotizaci├│n pierde su validez.','Vigencia: 30 d├¡as para cotizaciones en Pesos y D├│lares.','Vigencia destinada ','Estado de vigencia ','','[\"Tiempo de Entrega: Los d├¡as de entrega ser├ín considerados a partir de la recepci├│n de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.\",\"Si esta cotizaci├│n es en pesos y el tipo de cambio sufre una variaci├│n mayor al 2%, esta cotizaci├│n pierde su validez.\",\"Vigencia: 30 d├¡as para cotizaciones en Pesos y D├│lares.\",\"Vigencia destinada \",\"Estado de vigencia \"]'),(10,'COT-69M','SISTEMA','buen',NULL,'','INTEL',NULL,'4487563200','123@mc.com','ING JOSE','2026-08-05','2026-10-02',20.00,0.00,0.00,32021.00,1601.05,NULL,'C:/Users/monse/Downloads',1,'dematiq2026','2026-08-06 04:51:50','2026-08-12 20:35:23','cotizacion','8 DIAS HABILES','90 DIAS',0.00,1.20,'','',58,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(11,'COT-2','DOS','dos',NULL,'','BUBULUBU',NULL,'4451231458','ing@23.com.','ING.PEDRO','2026-08-06','2026-08-16',20.00,0.00,0.00,1500.00,75.00,NULL,'C:/Users/monse/Downloads',1,'dematiq2026','2026-08-06 18:39:19','2026-08-17 21:46:08','cotizacion','8 DIAS HABILES','90 DIAS',0.00,1.20,'','',10,'Tiempo de Entrega: Los d├¡as de entrega ser├ín considerados a partir de la recepci├│n de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.','Si esta cotizaci├│n es en pesos y el tipo de cambio sufre una variaci├│n mayor al 2%, esta cotizaci├│n pierde su validez.','Vigencia: 30 d├¡as para cotizaciones en Pesos y D├│lares.','hhh','','','[\"Tiempo de Entrega: Los d├¡as de entrega ser├ín considerados a partir de la recepci├│n de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.\",\"Si esta cotizaci├│n es en pesos y el tipo de cambio sufre una variaci├│n mayor al 2%, esta cotizaci├│n pierde su validez.\",\"Vigencia: 30 d├¡as para cotizaciones en Pesos y D├│lares.\",\"hhh\"]'),(12,'COT-DM09','SISTEMA','programa de sistema de cotizaciones',NULL,'De acuerdo a la soluci├│n planteada ','INTEL',NULL,'4421201548','intel@12.com','ING LUIS','2026-05-03','2026-07-28',20.00,0.00,0.00,486206.56,24310.34,NULL,'C:/Users/monse/Downloads',1,'dematiq2026','2026-08-06 19:32:22','2026-08-17 21:35:55','completo','8- DIAS HABILES','90 DIAS',16.00,1.20,'','',86,NULL,NULL,NULL,NULL,NULL,NULL,NULL),(13,'COT1818','HOLAMUNDO','ESTE PROYECTO FUE CREADO PARA COTIZACIONES',NULL,'','INTEL',NULL,'4454623152','INGELUIS@19.COM','ING LUIS','2026-08-18','0000-00-00',20.00,0.00,0.00,0.00,0.00,NULL,'C:/Users/monse/Downloads',1,'dematiq2026','2026-08-18 19:21:12','2026-08-18 19:21:22','cotizacion','8 DIAS HABILES','90 DIAS',16.00,1.20,'','',30,'Tiempo de Entrega: Los d├¡as de entrega ser├ín considerados a partir de la recepci├│n de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.','Si esta cotizaci├│n es en pesos y el tipo de cambio sufre una variaci├│n mayor al 2%, esta cotizaci├│n pierde su validez.','Vigencia: 30 d├¡as para cotizaciones en Pesos y D├│lares.','Hola','','','[\"Tiempo de Entrega: Los d├¡as de entrega ser├ín considerados a partir de la recepci├│n de su orden de compra. Este tiempo de entrega es SALVO PREVIA VENTA.\",\"Si esta cotizaci├│n es en pesos y el tipo de cambio sufre una variaci├│n mayor al 2%, esta cotizaci├│n pierde su validez.\",\"Vigencia: 30 d├¡as para cotizaciones en Pesos y D├│lares.\",\"Hola\"]');
/*!40000 ALTER TABLE `proyectos` ENABLE KEYS */;
UNLOCK TABLES;
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

LOCK TABLES `puntos_texto` WRITE;
/*!40000 ALTER TABLE `puntos_texto` DISABLE KEYS */;
/*!40000 ALTER TABLE `puntos_texto` ENABLE KEYS */;
UNLOCK TABLES;
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
) ENGINE=InnoDB AUTO_INCREMENT=117 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `secciones` WRITE;
/*!40000 ALTER TABLE `secciones` DISABLE KEYS */;
INSERT INTO `secciones` VALUES (19,3,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(20,3,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(21,3,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',0.00,0.00),(22,3,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',48.53,973.44),(23,3,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',0.00,0.00),(24,3,'E_NEUMATICO','EQUIPO NEUM├üTICO','equipo',6,'#0891b2',0.00,0.00),(25,3,'E_MECANICO','EQUIPO MEC├üNICO','equipo',7,'#ea580c',0.00,0.00),(26,3,'T_ELECTRICO','TABLERO EL├ëCTRICO','equipo',8,'#6366f1',0.00,0.00),(27,3,'INSUMOS','INSUMOS','equipo',9,'#dc2626',0.00,0.00),(28,3,'LISTAS','LISTAS','equipo',10,'#7c3aed',0.00,0.00),(29,3,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',11,'#475569',0.00,0.00),(48,6,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(49,6,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(50,6,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',0.00,0.00),(51,6,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',13.75,275.00),(52,6,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',25.00,500.00),(53,6,'E_NEUMATICO','EQUIPO NEUM├üTICO','equipo',6,'#0891b2',0.00,0.00),(54,6,'E_MECANICO','EQUIPO MEC├üNICO','equipo',7,'#ea580c',0.00,0.00),(55,6,'INSUMOS','INSUMOS','equipo',8,'#dc2626',0.00,0.00),(56,6,'LISTAS','LISTAS','equipo',9,'#7c3aed',0.00,0.00),(58,6,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',11,'#475569',0.00,0.00),(75,6,'T_ELECTRICO','TABLERO EL├ëCTRICO','equipo',12,'#6366f1',0.00,0.00),(78,9,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(79,9,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(80,9,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',0.00,0.00),(81,9,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',3369.06,68055.00),(82,9,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',0.00,0.00),(83,9,'INSUMOS','INSUMOS','equipo',6,'#dc2626',0.00,0.00),(84,9,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',7,'#475569',0.00,0.00),(85,10,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(86,10,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(87,10,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',0.00,0.00),(88,10,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',1601.05,32021.00),(89,10,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',0.00,0.00),(90,10,'INSUMOS','INSUMOS','equipo',6,'#dc2626',0.00,0.00),(91,10,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',7,'#475569',0.00,0.00),(92,11,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(93,11,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(94,11,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',0.00,0.00),(95,11,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',75.00,1500.00),(96,11,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',0.00,0.00),(97,11,'INSUMOS','INSUMOS','equipo',6,'#dc2626',0.00,0.00),(98,11,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',7,'#475569',0.00,0.00),(99,12,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(100,12,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(101,12,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',16442.93,328858.60),(102,12,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',297.96,5959.20),(103,12,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',10.50,210.00),(104,12,'E_NEUMATICO','EQUIPO NEUM├üTICO','equipo',6,'#0891b2',4.73,94.50),(105,12,'E_MECANICO','EQUIPO MEC├üNICO','equipo',7,'#ea580c',199.12,3982.26),(106,12,'INSUMOS','INSUMOS','equipo',8,'#dc2626',7354.00,147080.00),(107,12,'LISTAS','LISTAS','equipo',9,'#7c3aed',0.00,0.00),(108,12,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',11,'#475569',0.00,0.00),(109,12,'T_ELECTRICO','TABLERO EL├ëCTRICO','equipo',12,'#6366f1',1.10,22.00),(110,13,'PRESE','PRESENTACI├ôN','mano_obra',1,'#64748b',0.00,0.00),(111,13,'REPORTE','REPORTE GENERAL','mano_obra',2,'#16a34a',0.00,0.00),(112,13,'ING_MO','ING. MANO DE OBRA','mano_obra',3,'#2563eb',0.00,0.00),(113,13,'E_CONTROL','EQUIPO DE CONTROL','equipo',4,'#0d47a1',0.00,0.00),(114,13,'E_ELECTRICO','EQUIPO EL├ëCTRICO','equipo',5,'#0284c7',0.00,0.00),(115,13,'INSUMOS','INSUMOS','equipo',6,'#dc2626',0.00,0.00),(116,13,'CONDICIONES','CONDICIONES COMERCIALES','mano_obra',7,'#475569',0.00,0.00);
/*!40000 ALTER TABLE `secciones` ENABLE KEYS */;
UNLOCK TABLES;
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

LOCK TABLES `sub_secciones` WRITE;
/*!40000 ALTER TABLE `sub_secciones` DISABLE KEYS */;
/*!40000 ALTER TABLE `sub_secciones` ENABLE KEYS */;
UNLOCK TABLES;
DROP TABLE IF EXISTS `subtemas_prese`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
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
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

LOCK TABLES `subtemas_prese` WRITE;
/*!40000 ALTER TABLE `subtemas_prese` DISABLE KEYS */;
INSERT INTO `subtemas_prese` VALUES (5,6,'A1 NUEVO SUBTEMA','','A1',1),(7,3,'A1 NUEVO SUBTEMA','A1.1 \nA1.2 \nA1.3 ','A1',1),(9,3,'A2 NUEVO SUBTEMA','A2.1 ','A2',2),(13,12,'A1 SISTEMA ','A1.1 Este sistema fue dise├▒ado para la captura de datos de cotizaciones y proyectos\nA1.2 Los cuentos largos son ideales para quienes buscan lecturas m├ís extensas y envolventes, permitiendo a los lectores sumergirse en aventuras, personajes y mundos imaginarios. Estos relatos pueden incluir historias de princesas, piratas, magos, animales fant├ísticos o cuentos de miedo adaptados para todas las edades. La extensi├│n de estos textos ayuda a los ni├▒os y j├│venes a desarrollar la imaginaci├│n, la empat├¡a y la comprensi├│n de valores importantes, adem├ís de fomentar la concentraci├│n y el h├íbito de la lectura  solocuentos.com solocuentos.com +2 . Algunos portales ofrecen versiones interactivas o en audio para hacer la experiencia m├ís atractiva  Mundo Primaria Mundo Primaria .  Textos Largos para Copiar y Pegar Existen textos largos dise├▒ados para uso pr├íctico, como en trabajos escolares, proyectos de escritura o dise├▒o web. Estos textos pueden incluir citas famosas, extractos de libros o contenido de ejemplo (como \"lorem ipsum\"). Sus ventajas incluyen ahorro de tiempo, pr├íctica de escritura y generaci├│n de ideas, ya que permiten a los usuarios copiar y adaptar el contenido seg├║n sus necesidades  dudasytextos.com dudasytextos.com . Es importante revisar estos textos antes de utilizarlos para evitar errores gramaticales o incoherencias  dudasytextos.com dudasytextos.com .  Beneficios de Leer Textos Largos Desarrollo intelectual y emocional: La lectura prolongada estimula el pensamiento cr├¡tico y la comprensi├│n de distintas perspectivas  Cultura Genial Cultura Genial . Mejora de habilidades ling├╝├¡sticas: Permite familiarizarse con estructuras complejas y vocabulario m├ís amplio  Cultura Genial Cultura Genial . Entretenimiento y creatividad: Los relatos extensos ofrecen experiencias inmersivas que fomentan la imaginaci├│n y la creatividad  solocuentos.com solocuentos.com +1 . En resumen, los textos largos son recursos valiosos tanto para el aprendizaje como para el entretenimiento, y pueden adaptarse a diferentes edades y prop├│sitos, desde cuentos literarios hasta textos pr├ícticos para copiar y pegar.\nA1.3 \nA1.4 ','A1',1),(14,12,'A2 NUEVO SUBTEMA','A2.1 \nA2.2 \nA2.3 ','A2',2),(15,12,'A3 NUEVO SUBTEMA','A3.1 \nA3.2 \nA3.3 ','A3',3);
/*!40000 ALTER TABLE `subtemas_prese` ENABLE KEYS */;
UNLOCK TABLES;
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


-- =============================================================
-- Sistema de Cotizaciones - DEMATIQ Automatización
-- Migration Script: New Features
-- Run this against the cotizaciones_dematiq database.
-- =============================================================

USE cotizaciones_dematiq;

-- -------------------------------------------------------------
-- 1. Add E. MECÁNICO special columns to partidas_equipo
-- -------------------------------------------------------------
ALTER TABLE partidas_equipo
  ADD COLUMN IF NOT EXISTS material            DECIMAL(15,2) DEFAULT 0 AFTER subtotal,
  ADD COLUMN IF NOT EXISTS mano_obra_mecanico  DECIMAL(15,2) DEFAULT 0 AFTER material,
  ADD COLUMN IF NOT EXISTS diseno              DECIMAL(15,2) DEFAULT 0 AFTER mano_obra_mecanico,
  ADD COLUMN IF NOT EXISTS transporte          DECIMAL(15,2) DEFAULT 0 AFTER diseno;

-- -------------------------------------------------------------
-- 2. Sub-sections (dynamic grouping inside E. ELÉCTRICO, etc.)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sub_secciones (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  seccion_id INT          NOT NULL,
  titulo     VARCHAR(255) NOT NULL,
  color      VARCHAR(20)  DEFAULT '#DAA520',
  orden      INT          NOT NULL DEFAULT 0,
  FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
);

-- Link partidas_equipo rows to an optional sub-section
ALTER TABLE partidas_equipo
  ADD COLUMN IF NOT EXISTS sub_seccion_id INT DEFAULT NULL AFTER seccion_id;

-- Add FK only if it doesn't exist yet (safe re-run)
SET @fk_exists = (
  SELECT COUNT(*)
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'cotizaciones_dematiq'
    AND TABLE_NAME        = 'partidas_equipo'
    AND CONSTRAINT_NAME   = 'fk_equipo_sub_seccion'
    AND CONSTRAINT_TYPE   = 'FOREIGN KEY'
);

SET @sql = IF(
  @fk_exists = 0,
  'ALTER TABLE partidas_equipo ADD CONSTRAINT fk_equipo_sub_seccion FOREIGN KEY (sub_seccion_id) REFERENCES sub_secciones(id) ON DELETE SET NULL',
  'SELECT 1'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

-- -------------------------------------------------------------
-- 3. Free-text numbered points (PRESE and LISTAS tabs)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS puntos_texto (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  proyecto_id  INT          NOT NULL,
  tipo         ENUM('prese_alcance1','prese_alcance2','listas') NOT NULL,
  numero_punto VARCHAR(20),
  contenido    TEXT,
  orden        INT NOT NULL DEFAULT 0,
  FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 4. Add referencia_id to proyectos
-- -------------------------------------------------------------
ALTER TABLE proyectos
  ADD COLUMN IF NOT EXISTS referencia_id VARCHAR(100) DEFAULT NULL AFTER referencia;

-- -------------------------------------------------------------
-- 5. Special insumos rows (HOSPEDAJE, IMSS)
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidas_insumos_especiales (
  id                INT AUTO_INCREMENT PRIMARY KEY,
  seccion_id        INT          NOT NULL,
  tipo              ENUM('hospedaje','imss') NOT NULL,
  descripcion       VARCHAR(255),
  num_personas      INT          DEFAULT 1,
  costo_por_persona DECIMAL(15,2) DEFAULT 0,
  num_veces         INT          DEFAULT 1,
  subtotal          DECIMAL(15,2) DEFAULT 0,
  total_mn          DECIMAL(15,2) DEFAULT 0,
  total_usd         DECIMAL(15,2) DEFAULT 0,
  orden             INT          NOT NULL DEFAULT 0,
  FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
);

-- -------------------------------------------------------------
-- 6. I/O points table
-- -------------------------------------------------------------
CREATE TABLE IF NOT EXISTS partidas_io (
  id                   INT AUTO_INCREMENT PRIMARY KEY,
  seccion_id           INT          NOT NULL,
  entrada              VARCHAR(255) DEFAULT '',
  descripcion_entrada  VARCHAR(500) DEFAULT '',
  salida               VARCHAR(255) DEFAULT '',
  descripcion_salida   VARCHAR(500) DEFAULT '',
  orden                INT          NOT NULL DEFAULT 0,
  FOREIGN KEY (seccion_id) REFERENCES secciones(id) ON DELETE CASCADE
);

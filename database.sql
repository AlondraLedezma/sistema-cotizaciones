
-- Sistema de Cotizaciones - DEMATIQ Automatización
-- Database Schema


CREATE DATABASE IF NOT EXISTS cotizaciones_dematiq CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE cotizaciones_dematiq;


-- tabla: usuarios

CREATE TABLE IF NOT EXISTS usuarios (
    id INT AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    nombre VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- tabla: proyectos

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


-- tabla: secciones


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


-- tabla: partidas_mano_obra

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


-- tabla: partidas_equipo

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


-- tabla: condiciones_comerciales

CREATE TABLE IF NOT EXISTS condiciones_comerciales (
    id INT AUTO_INCREMENT PRIMARY KEY,
    proyecto_id INT NOT NULL,
    codigo VARCHAR(20) NOT NULL,
    contenido TEXT NOT NULL,
    orden INT NOT NULL,
    FOREIGN KEY (proyecto_id) REFERENCES proyectos(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- tabla: configuracion

CREATE TABLE IF NOT EXISTS configuracion (
    id INT AUTO_INCREMENT PRIMARY KEY,
    clave VARCHAR(100) UNIQUE NOT NULL,
    valor TEXT NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

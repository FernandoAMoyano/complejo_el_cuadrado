-- =====================================================================
-- MVP Complejo El Cuadrado - Script de creación de la base de datos
-- Práctica Profesionalizante · ISPC
--
-- Respeta el Modelo Relacional de docs/MR.md: mismas tablas, columnas,
-- tipos, nulos, CHECK y acciones ON DELETE.
--
-- Después de correrlo: python manage.py migrate --fake-initial
-- =====================================================================

-- El script tiene tildes y eñes ('Pendiente de seña'): sin esta línea, la
-- consola de MySQL en Windows las lee con otra codificación y las guarda mal,
-- y el CHECK de reserva.estado rechazaría después los valores correctos.
SET NAMES utf8mb4;

CREATE DATABASE IF NOT EXISTS complejo_el_cuadrado
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE complejo_el_cuadrado;

-- ---------------------------------------------------------------------
-- Componente Administradores (HU-01)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS administrador (
    id_administrador INT          NOT NULL AUTO_INCREMENT,
    nombre           VARCHAR(50)  NOT NULL,
    apellido         VARCHAR(50)  NOT NULL,
    email            VARCHAR(100) NOT NULL,
    clave_acceso     VARCHAR(100) NOT NULL,
    PRIMARY KEY (id_administrador),
    UNIQUE KEY uq_administrador_email (email)
);

-- ---------------------------------------------------------------------
-- Componente Unidades (HU-02)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS unidad (
    id_unidad   INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(30)  NOT NULL,
    capacidad   INT          NOT NULL,
    estado      VARCHAR(20)  NOT NULL DEFAULT 'Disponible',
    descripcion VARCHAR(500) NULL,
    PRIMARY KEY (id_unidad),
    UNIQUE KEY uq_unidad_nombre (nombre),
    CONSTRAINT ck_unidad_capacidad CHECK (capacidad BETWEEN 1 AND 4),
    CONSTRAINT ck_unidad_estado    CHECK (estado IN ('Disponible', 'Ocupada', 'En limpieza', 'En mantenimiento'))
);

-- ---------------------------------------------------------------------
-- Componente Pasajeros (titular de la reserva, HU-04)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pasajero (
    id_pasajero INT          NOT NULL AUTO_INCREMENT,
    nombre      VARCHAR(50)  NOT NULL,
    apellido    VARCHAR(50)  NOT NULL,
    dni         VARCHAR(8)   NOT NULL,
    telefono    VARCHAR(20)  NOT NULL,
    email       VARCHAR(100) NULL,
    PRIMARY KEY (id_pasajero),
    UNIQUE KEY uq_pasajero_dni (dni)
);

-- ---------------------------------------------------------------------
-- Componente Reservas (HU-03 a HU-05, HU-07 a HU-09)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS reserva (
    id_reserva          INT            NOT NULL AUTO_INCREMENT,
    id_unidad           INT            NOT NULL,
    id_pasajero         INT            NOT NULL,
    fecha_ingreso       DATE           NOT NULL,
    fecha_egreso        DATE           NOT NULL,
    cantidad_huespedes  INT            NOT NULL,
    importe_acordado    DECIMAL(10, 2) NOT NULL,
    estado              VARCHAR(20)    NOT NULL DEFAULT 'Pendiente de seña',
    fecha_registro      DATETIME       NOT NULL,
    fecha_limite_pago   DATETIME       NULL,
    motivo_cancelacion  VARCHAR(100)   NULL,
    fecha_hora_checkin  DATETIME       NULL,
    fecha_hora_checkout DATETIME       NULL,
    PRIMARY KEY (id_reserva),
    CONSTRAINT ck_reserva_fechas    CHECK (fecha_egreso > fecha_ingreso),
    CONSTRAINT ck_reserva_huespedes CHECK (cantidad_huespedes >= 1),
    CONSTRAINT ck_reserva_importe   CHECK (importe_acordado > 0),
    CONSTRAINT ck_reserva_estado    CHECK (estado IN ('Pendiente de seña', 'Confirmada', 'En curso', 'Finalizada', 'Cancelada')),
    CONSTRAINT fk_reserva_unidad   FOREIGN KEY (id_unidad)   REFERENCES unidad (id_unidad)     ON DELETE RESTRICT,
    CONSTRAINT fk_reserva_pasajero FOREIGN KEY (id_pasajero) REFERENCES pasajero (id_pasajero) ON DELETE RESTRICT
);

-- ---------------------------------------------------------------------
-- Componente Pagos (HU-06)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pago (
    id_pago    INT            NOT NULL AUTO_INCREMENT,
    id_reserva INT            NOT NULL,
    monto      DECIMAL(10, 2) NOT NULL,
    fecha      DATE           NOT NULL,
    medio_pago VARCHAR(20)    NOT NULL,
    PRIMARY KEY (id_pago),
    CONSTRAINT ck_pago_monto CHECK (monto > 0),
    CONSTRAINT ck_pago_medio CHECK (medio_pago IN ('Efectivo', 'Transferencia')),
    CONSTRAINT fk_pago_reserva FOREIGN KEY (id_reserva) REFERENCES reserva (id_reserva) ON DELETE RESTRICT
);

-- =====================================================================
-- DATOS DE PRUEBA
-- Las fechas se calculan desde el día en que se corre el script
-- (CURDATE() y NOW()), así los datos siempre sirven para la demo.
-- =====================================================================

-- Administrador de prueba: admin@elcuadrado.com / admin123
INSERT INTO administrador (id_administrador, nombre, apellido, email, clave_acceso) VALUES
    (1, 'Administrador', 'El Cuadrado', 'admin@elcuadrado.com', 'admin123');

-- Una unidad en cada estado
INSERT INTO unidad (id_unidad, nombre, capacidad, estado, descripcion) VALUES
    (1, 'Apart 1', 2, 'Ocupada',          'Apart para dos personas con cama matrimonial y cocina equipada.'),
    (2, 'Apart 2', 4, 'Disponible',       'Apart familiar con una cama matrimonial y dos individuales.'),
    (3, 'Apart 3', 3, 'En limpieza',      'Apart con cama matrimonial, una individual y galería.'),
    (4, 'Apart 4', 4, 'En mantenimiento', 'Apart familiar con dos dormitorios. En reparación del calefactor.'),
    (5, 'Apart 5', 2, 'Disponible',       'Apart para dos personas con vista a las sierras.');

-- Pasajeros (datos ficticios)
INSERT INTO pasajero (id_pasajero, nombre, apellido, dni, telefono, email) VALUES
    (1, 'Mariana', 'Quiroga',  '30111222', '351 555-0101', 'mariana.quiroga@example.com'),
    (2, 'Javier',  'Bustos',   '28333444', '351 555-0102', NULL),
    (3, 'Lucía',   'Peralta',  '35555666', '3548 55-0103', 'lucia.peralta@example.com'),
    (4, 'Ramiro',  'Olmedo',   '40777888', '11 5555-0104', NULL),
    (5, 'Sofía',   'Cabrera',  '37999000', '351 555-0105', 'sofia.cabrera@example.com'),
    (6, 'Tomás',   'Ledesma',  '33222111', '341 555-0106', NULL);

-- Una reserva en cada estado:
--  1 Finalizada: egresó hoy del Apart 3 (por eso está En limpieza), sin saldo.
--  2 En curso: está en el Apart 1 (Ocupada) y debe saldo.
--  3 Confirmada: con seña, ingresa en 5 días.
--  4 Pendiente de seña: registrada recién, vence en 48 h.
--  5 Pendiente de seña YA VENCIDA: al primer listado pasa a Cancelada (HU-07).
--  6 Cancelada por el administrador.
INSERT INTO reserva (id_reserva, id_unidad, id_pasajero, fecha_ingreso, fecha_egreso, cantidad_huespedes,
                     importe_acordado, estado, fecha_registro, fecha_limite_pago, motivo_cancelacion,
                     fecha_hora_checkin, fecha_hora_checkout) VALUES
    (1, 3, 1, CURDATE() - INTERVAL 3 DAY, CURDATE(),                   3, 180000.00, 'Finalizada',
        NOW() - INTERVAL 15 DAY, NULL, NULL, NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 2 HOUR),
    (2, 1, 2, CURDATE() - INTERVAL 1 DAY, CURDATE() + INTERVAL 2 DAY,  2, 150000.00, 'En curso',
        NOW() - INTERVAL 10 DAY, NULL, NULL, NOW() - INTERVAL 1 DAY, NULL),
    (3, 2, 3, CURDATE() + INTERVAL 5 DAY, CURDATE() + INTERVAL 8 DAY,  4, 240000.00, 'Confirmada',
        NOW() - INTERVAL 4 DAY, NULL, NULL, NULL, NULL),
    (4, 5, 4, CURDATE() + INTERVAL 10 DAY, CURDATE() + INTERVAL 12 DAY, 2, 110000.00, 'Pendiente de seña',
        NOW(), NOW() + INTERVAL 48 HOUR, NULL, NULL, NULL),
    (5, 2, 5, CURDATE() + INTERVAL 15 DAY, CURDATE() + INTERVAL 17 DAY, 3, 160000.00, 'Pendiente de seña',
        NOW() - INTERVAL 3 DAY, NOW() - INTERVAL 1 DAY, NULL, NULL, NULL),
    (6, 5, 6, CURDATE() + INTERVAL 20 DAY, CURDATE() + INTERVAL 22 DAY, 1, 100000.00, 'Cancelada',
        NOW() - INTERVAL 6 DAY, NULL, 'Cancelada por el administrador', NULL, NULL);

-- Pagos: la reserva 1 pagó todo, la 2 debe 100.000 y la 3 tiene solo la seña
INSERT INTO pago (id_pago, id_reserva, monto, fecha, medio_pago) VALUES
    (1, 1,  60000.00, CURDATE() - INTERVAL 14 DAY, 'Transferencia'),
    (2, 1, 120000.00, CURDATE() - INTERVAL 3 DAY,  'Efectivo'),
    (3, 2,  50000.00, CURDATE() - INTERVAL 9 DAY,  'Transferencia'),
    (4, 3,  80000.00, CURDATE() - INTERVAL 3 DAY,  'Transferencia');

-- Ajuste de los autoincrementables
ALTER TABLE administrador AUTO_INCREMENT = 2;
ALTER TABLE unidad        AUTO_INCREMENT = 6;
ALTER TABLE pasajero      AUTO_INCREMENT = 7;
ALTER TABLE reserva       AUTO_INCREMENT = 7;
ALTER TABLE pago          AUTO_INCREMENT = 5;

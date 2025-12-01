-- =====================================================
-- MIGRACIÓN: Modificar columna IMEI para aceptar identificadores sin IMEI
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Eliminar vistas que dependen de la columna imei
DROP VIEW IF EXISTS ldu_vista_completa;
DROP VIEW IF EXISTS ldu_pendientes_devolucion;
DROP VIEW IF EXISTS ldu_sin_responsable;
DROP VIEW IF EXISTS ldu_stats_por_region;

-- 2. Cambiar el tamaño de la columna IMEI para aceptar identificadores más largos
-- El formato SIN_IMEI_xxx_timestamp puede tener hasta 30+ caracteres
ALTER TABLE ldu_registros 
ALTER COLUMN imei TYPE VARCHAR(50);

-- 3. También actualizar en tablas relacionadas
ALTER TABLE ldu_historial_responsables 
ALTER COLUMN ldu_imei TYPE VARCHAR(50);

ALTER TABLE ldu_auditoria 
ALTER COLUMN imei TYPE VARCHAR(50);

ALTER TABLE ldu_import_errors 
ALTER COLUMN imei_intentado TYPE VARCHAR(50);

-- 4. Recrear las vistas
CREATE OR REPLACE VIEW ldu_vista_completa AS
SELECT 
    r.id,
    r.imei,
    r.modelo,
    r.region,
    r.punto_venta,
    r.nombre_ruta,
    r.cobertura_valor,
    r.canal,
    r.tipo,
    r.estado,
    r.uso,
    r.observaciones,
    r.responsable_dni,
    r.responsable_nombre,
    r.responsable_apellido,
    CONCAT(r.responsable_nombre, ' ', r.responsable_apellido) as responsable_nombre_completo,
    r.presente_en_ultima_importacion,
    r.fecha_registro,
    r.fecha_actualizacion,
    r.activo
FROM ldu_registros r
WHERE r.activo = TRUE;

CREATE OR REPLACE VIEW ldu_pendientes_devolucion AS
SELECT * FROM ldu_registros 
WHERE estado IN ('Pendiente devolución', 'Devuelto') 
AND activo = TRUE;

CREATE OR REPLACE VIEW ldu_sin_responsable AS
SELECT * FROM ldu_registros 
WHERE (responsable_dni IS NULL OR responsable_dni = '')
AND activo = TRUE;

CREATE OR REPLACE VIEW ldu_stats_por_region AS
SELECT 
    region,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE estado = 'Activo') as activos,
    COUNT(*) FILTER (WHERE estado = 'Dañado') as danados,
    COUNT(*) FILTER (WHERE estado = 'En reparación') as en_reparacion,
    COUNT(*) FILTER (WHERE estado IN ('Pendiente devolución', 'Devuelto')) as pendientes_devolucion,
    COUNT(*) FILTER (WHERE responsable_dni IS NULL OR responsable_dni = '') as sin_responsable
FROM ldu_registros
WHERE activo = TRUE
GROUP BY region;

-- Comentario actualizado
COMMENT ON COLUMN ldu_registros.imei IS 'IMEI del dispositivo o identificador generado (SIN_IMEI_xxx para registros sin IMEI)';

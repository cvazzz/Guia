-- =====================================================
-- SISTEMA LDU - ESQUEMA DE BASE DE DATOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. TABLA PRINCIPAL DE REGISTROS LDU
CREATE TABLE IF NOT EXISTS ldu_registros (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    imei VARCHAR(20) UNIQUE NOT NULL,
    modelo VARCHAR(100),
    
    -- Campos de cuenta y ubicación (nuevos)
    account VARCHAR(100),           -- Account (CLARO, OM, etc.)
    account_int VARCHAR(100),       -- Account_int (CLARO, RETAIL, PLAZA VEA, etc.)
    supervisor VARCHAR(200),        -- Supervisor asignado
    zone VARCHAR(100),              -- Zona (Lima 2, etc.)
    departamento VARCHAR(100),      -- Departamento
    city VARCHAR(100),              -- Ciudad
    
    -- Ubicación (legacy)
    region VARCHAR(100),
    punto_venta VARCHAR(200),
    nombre_ruta VARCHAR(200),
    cobertura_valor DECIMAL(10,2),
    
    -- Clasificación
    canal VARCHAR(100),
    tipo VARCHAR(100),
    
    -- Campos originales del Excel
    campo_reg VARCHAR(50),
    campo_ok VARCHAR(50),
    uso VARCHAR(100),
    observaciones TEXT,
    
    -- Estado deducido
    estado VARCHAR(50) DEFAULT '',
    estado_anterior VARCHAR(50),
    
    -- Responsable actual (referencia)
    responsable_dni VARCHAR(20),
    responsable_nombre VARCHAR(200),
    responsable_apellido VARCHAR(200),
    
    -- Trazabilidad de importación
    raw_row JSONB,
    raw_excel_reference VARCHAR(200),
    archivo_origen_id VARCHAR(200),
    fila_origen INTEGER,
    
    -- Referencia a archivo en Drive para sync bidireccional
    drive_file_id VARCHAR(200),
    drive_file_name VARCHAR(500),
    drive_row_index INTEGER,
    
    -- Control de sincronización
    presente_en_ultima_importacion BOOLEAN DEFAULT TRUE,
    fecha_ultima_verificacion TIMESTAMPTZ,
    fecha_registro TIMESTAMPTZ DEFAULT NOW(),
    fecha_actualizacion TIMESTAMPTZ DEFAULT NOW(),
    
    -- Soft delete
    activo BOOLEAN DEFAULT TRUE
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_ldu_imei ON ldu_registros(imei);
CREATE INDEX IF NOT EXISTS idx_ldu_responsable_dni ON ldu_registros(responsable_dni);
CREATE INDEX IF NOT EXISTS idx_ldu_region ON ldu_registros(region);
CREATE INDEX IF NOT EXISTS idx_ldu_punto_venta ON ldu_registros(punto_venta);
CREATE INDEX IF NOT EXISTS idx_ldu_estado ON ldu_registros(estado);
CREATE INDEX IF NOT EXISTS idx_ldu_modelo ON ldu_registros(modelo);
CREATE INDEX IF NOT EXISTS idx_ldu_presente ON ldu_registros(presente_en_ultima_importacion);
CREATE INDEX IF NOT EXISTS idx_ldu_responsable_nombre ON ldu_registros(responsable_nombre);

-- 2. TABLA DE HISTORIAL DE RESPONSABLES
CREATE TABLE IF NOT EXISTS ldu_historial_responsables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    ldu_imei VARCHAR(20) NOT NULL REFERENCES ldu_registros(imei),
    
    -- Responsable anterior
    responsable_anterior_dni VARCHAR(20),
    responsable_anterior_nombre VARCHAR(200),
    
    -- Responsable nuevo
    responsable_nuevo_dni VARCHAR(20),
    responsable_nuevo_nombre VARCHAR(200),
    
    -- Detalles del cambio
    motivo VARCHAR(100), -- 'cese', 'rotacion', 'reasignacion', 'importacion'
    comentarios TEXT,
    
    -- Auditoría
    usuario_cambio VARCHAR(200),
    fecha_cambio TIMESTAMPTZ DEFAULT NOW(),
    
    -- Referencia a importación si aplica
    importacion_id UUID
);

CREATE INDEX IF NOT EXISTS idx_ldu_hist_imei ON ldu_historial_responsables(ldu_imei);
CREATE INDEX IF NOT EXISTS idx_ldu_hist_dni_anterior ON ldu_historial_responsables(responsable_anterior_dni);
CREATE INDEX IF NOT EXISTS idx_ldu_hist_dni_nuevo ON ldu_historial_responsables(responsable_nuevo_dni);

-- 3. TABLA DE AUDITORÍA GENERAL
CREATE TABLE IF NOT EXISTS ldu_auditoria (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Identificación
    imei VARCHAR(20),
    accion VARCHAR(50) NOT NULL, -- 'create', 'update', 'reasignacion', 'no_en_excel', 'delete'
    
    -- Usuario y tiempo
    usuario_sistema VARCHAR(200),
    fecha_hora TIMESTAMPTZ DEFAULT NOW(),
    
    -- Origen
    archivo_origen VARCHAR(200),
    fila_numero INTEGER,
    modulo_origen VARCHAR(100), -- 'importacion', 'web', 'api'
    
    -- Cambios
    campos_previos JSONB,
    campos_nuevos JSONB,
    raw_row JSONB,
    
    -- Metadatos
    comentarios TEXT,
    operacion_id UUID,
    importacion_id UUID
);

CREATE INDEX IF NOT EXISTS idx_ldu_audit_imei ON ldu_auditoria(imei);
CREATE INDEX IF NOT EXISTS idx_ldu_audit_fecha ON ldu_auditoria(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_ldu_audit_accion ON ldu_auditoria(accion);
CREATE INDEX IF NOT EXISTS idx_ldu_audit_usuario ON ldu_auditoria(usuario_sistema);

-- 4. TABLA DE ERRORES DE IMPORTACIÓN
CREATE TABLE IF NOT EXISTS ldu_import_errors (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Referencia
    importacion_id UUID,
    archivo_id VARCHAR(200),
    fila_numero INTEGER,
    
    -- Error
    tipo_error VARCHAR(100), -- 'invalid_imei', 'missing_required', 'validation_error', 'duplicate'
    mensaje_error TEXT,
    
    -- Datos originales
    raw_row JSONB,
    imei_intentado VARCHAR(50),
    
    -- Tiempo
    fecha_error TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ldu_errors_importacion ON ldu_import_errors(importacion_id);
CREATE INDEX IF NOT EXISTS idx_ldu_errors_tipo ON ldu_import_errors(tipo_error);

-- 5. TABLA DE IMPORTACIONES (LOG DE CADA PROCESO)
CREATE TABLE IF NOT EXISTS ldu_importaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    
    -- Archivo
    archivo_id VARCHAR(200),
    archivo_nombre VARCHAR(300),
    
    -- Estadísticas
    total_filas INTEGER DEFAULT 0,
    insertados INTEGER DEFAULT 0,
    actualizados INTEGER DEFAULT 0,
    invalidos INTEGER DEFAULT 0,
    sin_cambios INTEGER DEFAULT 0,
    marcados_ausentes INTEGER DEFAULT 0,
    
    -- Estado
    estado VARCHAR(50) DEFAULT 'en_proceso', -- 'en_proceso', 'completado', 'error', 'cancelado'
    mensaje_error TEXT,
    
    -- Tiempos
    fecha_inicio TIMESTAMPTZ DEFAULT NOW(),
    fecha_fin TIMESTAMPTZ,
    duracion_segundos INTEGER,
    
    -- Usuario
    usuario_ejecutor VARCHAR(200),
    
    -- Resumen JSON completo
    resumen JSONB
);

CREATE INDEX IF NOT EXISTS idx_ldu_import_estado ON ldu_importaciones(estado);
CREATE INDEX IF NOT EXISTS idx_ldu_import_fecha ON ldu_importaciones(fecha_inicio);

-- 6. TABLA DE UBICACIONES/COBERTURAS (catálogo)
CREATE TABLE IF NOT EXISTS ldu_ubicaciones (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    region VARCHAR(100),
    provincia VARCHAR(100),
    distrito VARCHAR(100),
    cobertura VARCHAR(100), -- 'Lima Norte', 'Lima Sur', 'Provincias', etc.
    activo BOOLEAN DEFAULT TRUE,
    UNIQUE(region, provincia, distrito)
);

-- 7. TABLA DE RESPONSABLES (catálogo)
CREATE TABLE IF NOT EXISTS ldu_responsables (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    dni VARCHAR(20) UNIQUE,
    nombre VARCHAR(100),
    apellido VARCHAR(200),
    nombre_completo VARCHAR(300),
    cargo VARCHAR(100), -- 'promotor', 'supervisor', 'coordinador'
    estado VARCHAR(50) DEFAULT 'activo', -- 'activo', 'cesado', 'vacaciones'
    fecha_ingreso DATE,
    fecha_cese DATE,
    supervisor_dni VARCHAR(20),
    region VARCHAR(100),
    activo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ldu_resp_dni ON ldu_responsables(dni);
CREATE INDEX IF NOT EXISTS idx_ldu_resp_nombre ON ldu_responsables(nombre_completo);
CREATE INDEX IF NOT EXISTS idx_ldu_resp_estado ON ldu_responsables(estado);

-- 8. FUNCIÓN PARA ACTUALIZAR fecha_actualizacion AUTOMÁTICAMENTE
CREATE OR REPLACE FUNCTION update_ldu_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para ldu_registros
DROP TRIGGER IF EXISTS trigger_ldu_updated_at ON ldu_registros;
CREATE TRIGGER trigger_ldu_updated_at
    BEFORE UPDATE ON ldu_registros
    FOR EACH ROW
    EXECUTE FUNCTION update_ldu_updated_at();

-- Trigger para ldu_responsables
DROP TRIGGER IF EXISTS trigger_ldu_resp_updated_at ON ldu_responsables;
CREATE TRIGGER trigger_ldu_resp_updated_at
    BEFORE UPDATE ON ldu_responsables
    FOR EACH ROW
    EXECUTE FUNCTION update_ldu_updated_at();

-- 9. VISTAS ÚTILES

-- Vista de LDU con responsable completo
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

-- Vista de LDU pendientes de devolución
CREATE OR REPLACE VIEW ldu_pendientes_devolucion AS
SELECT * FROM ldu_registros 
WHERE estado IN ('Pendiente devolución', 'Devuelto') 
AND activo = TRUE;

-- Vista de LDU sin responsable
CREATE OR REPLACE VIEW ldu_sin_responsable AS
SELECT * FROM ldu_registros 
WHERE (responsable_dni IS NULL OR responsable_dni = '')
AND activo = TRUE;

-- Vista de LDU por región con conteos
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

-- 10. POLÍTICAS RLS (Row Level Security) - Opcional
-- Habilitar RLS
ALTER TABLE ldu_registros ENABLE ROW LEVEL SECURITY;
ALTER TABLE ldu_auditoria ENABLE ROW LEVEL SECURITY;
ALTER TABLE ldu_importaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE ldu_import_errors ENABLE ROW LEVEL SECURITY;
ALTER TABLE ldu_historial_responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE ldu_responsables ENABLE ROW LEVEL SECURITY;
ALTER TABLE ldu_ubicaciones ENABLE ROW LEVEL SECURITY;

-- Política para lectura pública (ajustar según necesidades)
CREATE POLICY "Allow read access" ON ldu_registros FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ldu_auditoria FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ldu_importaciones FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ldu_import_errors FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ldu_historial_responsables FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ldu_responsables FOR SELECT USING (true);
CREATE POLICY "Allow read access" ON ldu_ubicaciones FOR SELECT USING (true);

-- Política para escritura (service role o authenticated)
CREATE POLICY "Allow insert" ON ldu_registros FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON ldu_registros FOR UPDATE USING (true);
CREATE POLICY "Allow insert" ON ldu_auditoria FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON ldu_importaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON ldu_importaciones FOR UPDATE USING (true);
CREATE POLICY "Allow insert" ON ldu_import_errors FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON ldu_historial_responsables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert" ON ldu_responsables FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON ldu_responsables FOR UPDATE USING (true);
CREATE POLICY "Allow insert" ON ldu_ubicaciones FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update" ON ldu_ubicaciones FOR UPDATE USING (true);

-- =====================================================
-- VERIFICACIÓN FINAL
-- =====================================================
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'ldu_%'
ORDER BY table_name;

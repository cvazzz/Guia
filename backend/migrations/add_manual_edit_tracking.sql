-- =====================================================
-- SISTEMA LDU - TRACKING DE CAMBIOS MANUALES Y CONFLICTOS
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. Agregar columnas para tracking de campos editados manualmente
ALTER TABLE ldu_registros 
ADD COLUMN IF NOT EXISTS campos_editados_manualmente JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS fecha_ultima_edicion_manual TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS usuario_ultima_edicion VARCHAR(200);

-- 2. Crear tabla de conflictos de importación
CREATE TABLE IF NOT EXISTS ldu_conflictos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    imei VARCHAR(50) NOT NULL,
    importacion_id UUID NOT NULL,
    
    -- Datos del conflicto
    campo VARCHAR(100) NOT NULL,
    valor_actual TEXT,               -- Lo que tiene el registro actualmente
    valor_excel TEXT,                -- Lo que viene en el Excel
    valor_original TEXT,             -- El valor antes de la edición manual
    
    -- Metadatos
    fecha_edicion_manual TIMESTAMPTZ,
    usuario_edicion VARCHAR(200),
    fecha_conflicto TIMESTAMPTZ DEFAULT NOW(),
    
    -- Resolución
    estado VARCHAR(20) DEFAULT 'pendiente', -- pendiente, resuelto_mantener, resuelto_sobrescribir
    resuelto_por VARCHAR(200),
    fecha_resolucion TIMESTAMPTZ,
    valor_final TEXT,
    
    -- Contexto adicional
    archivo_origen VARCHAR(500),
    fila_origen INTEGER
);

-- Índices para conflictos
CREATE INDEX IF NOT EXISTS idx_conflictos_imei ON ldu_conflictos(imei);
CREATE INDEX IF NOT EXISTS idx_conflictos_estado ON ldu_conflictos(estado);
CREATE INDEX IF NOT EXISTS idx_conflictos_importacion ON ldu_conflictos(importacion_id);
CREATE INDEX IF NOT EXISTS idx_conflictos_fecha ON ldu_conflictos(fecha_conflicto DESC);

-- 3. Vista para conflictos pendientes con información del registro
CREATE OR REPLACE VIEW ldu_conflictos_pendientes AS
SELECT 
    c.*,
    r.modelo,
    r.responsable_nombre,
    r.responsable_apellido,
    r.punto_venta,
    r.region
FROM ldu_conflictos c
JOIN ldu_registros r ON r.imei = c.imei
WHERE c.estado = 'pendiente';

-- 4. Función para marcar campo como editado manualmente
CREATE OR REPLACE FUNCTION marcar_campo_editado_manualmente(
    p_imei VARCHAR,
    p_campo VARCHAR,
    p_usuario VARCHAR DEFAULT 'system'
)
RETURNS void AS $$
DECLARE
    campos_actuales JSONB;
BEGIN
    -- Obtener campos actuales
    SELECT COALESCE(campos_editados_manualmente, '[]'::jsonb)
    INTO campos_actuales
    FROM ldu_registros
    WHERE imei = p_imei;
    
    -- Agregar campo si no existe
    IF NOT campos_actuales ? p_campo THEN
        campos_actuales = campos_actuales || to_jsonb(p_campo);
    END IF;
    
    -- Actualizar registro
    UPDATE ldu_registros
    SET 
        campos_editados_manualmente = campos_actuales,
        fecha_ultima_edicion_manual = NOW(),
        usuario_ultima_edicion = p_usuario
    WHERE imei = p_imei;
END;
$$ LANGUAGE plpgsql;

-- 5. Función para resolver conflicto
CREATE OR REPLACE FUNCTION resolver_conflicto(
    p_conflicto_id UUID,
    p_accion VARCHAR,  -- 'mantener' o 'sobrescribir'
    p_usuario VARCHAR DEFAULT 'system'
)
RETURNS void AS $$
DECLARE
    v_imei VARCHAR;
    v_campo VARCHAR;
    v_valor_excel TEXT;
    v_valor_actual TEXT;
BEGIN
    -- Obtener datos del conflicto
    SELECT imei, campo, valor_excel, valor_actual
    INTO v_imei, v_campo, v_valor_excel, v_valor_actual
    FROM ldu_conflictos
    WHERE id = p_conflicto_id AND estado = 'pendiente';
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Conflicto no encontrado o ya resuelto';
    END IF;
    
    IF p_accion = 'sobrescribir' THEN
        -- Aplicar valor del Excel
        EXECUTE format(
            'UPDATE ldu_registros SET %I = $1 WHERE imei = $2',
            v_campo
        ) USING v_valor_excel, v_imei;
        
        -- Quitar campo de la lista de editados manualmente
        UPDATE ldu_registros
        SET campos_editados_manualmente = campos_editados_manualmente - v_campo
        WHERE imei = v_imei;
        
        -- Marcar conflicto como resuelto
        UPDATE ldu_conflictos
        SET 
            estado = 'resuelto_sobrescribir',
            resuelto_por = p_usuario,
            fecha_resolucion = NOW(),
            valor_final = v_valor_excel
        WHERE id = p_conflicto_id;
    ELSE
        -- Mantener valor actual
        UPDATE ldu_conflictos
        SET 
            estado = 'resuelto_mantener',
            resuelto_por = p_usuario,
            fecha_resolucion = NOW(),
            valor_final = v_valor_actual
        WHERE id = p_conflicto_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 6. Comentarios
COMMENT ON TABLE ldu_conflictos IS 'Almacena conflictos entre cambios manuales y datos del Excel';
COMMENT ON COLUMN ldu_registros.campos_editados_manualmente IS 'Array JSON de nombres de campos que fueron editados manualmente';

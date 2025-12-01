-- =====================================================
-- MIGRACIÓN: Agregar nuevos campos LDU
-- Ejecutar si la tabla ya existe
-- =====================================================

-- Agregar campos de cuenta y ubicación
ALTER TABLE ldu_registros 
ADD COLUMN IF NOT EXISTS account VARCHAR(100),
ADD COLUMN IF NOT EXISTS account_int VARCHAR(100),
ADD COLUMN IF NOT EXISTS supervisor VARCHAR(200),
ADD COLUMN IF NOT EXISTS zone VARCHAR(100),
ADD COLUMN IF NOT EXISTS departamento VARCHAR(100),
ADD COLUMN IF NOT EXISTS city VARCHAR(100);

-- Agregar campos para sincronización con Drive
ALTER TABLE ldu_registros 
ADD COLUMN IF NOT EXISTS drive_file_id VARCHAR(200),
ADD COLUMN IF NOT EXISTS drive_sheet_name VARCHAR(200),
ADD COLUMN IF NOT EXISTS drive_row_index INTEGER;

-- Crear índices para nuevos campos
CREATE INDEX IF NOT EXISTS idx_ldu_account ON ldu_registros(account);
CREATE INDEX IF NOT EXISTS idx_ldu_account_int ON ldu_registros(account_int);
CREATE INDEX IF NOT EXISTS idx_ldu_supervisor ON ldu_registros(supervisor);
CREATE INDEX IF NOT EXISTS idx_ldu_zone ON ldu_registros(zone);
CREATE INDEX IF NOT EXISTS idx_ldu_city ON ldu_registros(city);
CREATE INDEX IF NOT EXISTS idx_ldu_drive_file ON ldu_registros(drive_file_id);

-- Comentarios para documentación
COMMENT ON COLUMN ldu_registros.account IS 'Cuenta principal (CLARO, OM, etc.)';
COMMENT ON COLUMN ldu_registros.account_int IS 'Cuenta interna (CLARO, RETAIL, PLAZA VEA)';
COMMENT ON COLUMN ldu_registros.supervisor IS 'Nombre del supervisor asignado';
COMMENT ON COLUMN ldu_registros.zone IS 'Zona geográfica (Lima 2, etc.)';
COMMENT ON COLUMN ldu_registros.departamento IS 'Departamento';
COMMENT ON COLUMN ldu_registros.city IS 'Ciudad';
COMMENT ON COLUMN ldu_registros.drive_file_id IS 'ID del archivo en Google Sheets para sync bidireccional';
COMMENT ON COLUMN ldu_registros.drive_sheet_name IS 'Nombre de la hoja en Google Sheets';
COMMENT ON COLUMN ldu_registros.drive_row_index IS 'Número de fila en el Sheet de Drive';

-- Ejecutar este SQL en el SQL Editor de Supabase
-- Dashboard: https://supabase.com/dashboard/project/lmeoauzdfpnyfhrrrhxb/sql

-- Agregar columna de notas
ALTER TABLE documentos_guia 
ADD COLUMN IF NOT EXISTS notas TEXT;

-- Agregar columna de revisado
ALTER TABLE documentos_guia 
ADD COLUMN IF NOT EXISTS revisado BOOLEAN DEFAULT FALSE;

-- Crear índice para búsquedas de documentos no revisados
CREATE INDEX IF NOT EXISTS idx_revisado ON documentos_guia(revisado);

-- Verificar que las columnas se crearon
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'documentos_guia' 
AND column_name IN ('notas', 'revisado');

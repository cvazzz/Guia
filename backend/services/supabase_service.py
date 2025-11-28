"""
Servicio de conexión y operaciones con Supabase.
Maneja almacenamiento de documentos y consultas.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

from supabase import create_client, Client

from config.settings import SUPABASE_URL, SUPABASE_KEY, SUPABASE_TABLE

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class SupabaseService:
    """Servicio para interactuar con Supabase."""
    
    def __init__(self):
        if not SUPABASE_URL or not SUPABASE_KEY:
            raise ValueError("SUPABASE_URL y SUPABASE_KEY son requeridos")
        
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.table = SUPABASE_TABLE
        logger.info("Conexión a Supabase establecida.")
    
    def document_exists(self, drive_file_id: str) -> bool:
        """
        Verifica si un documento ya existe en la base de datos.
        """
        try:
            result = self.client.table(self.table).select("id").eq(
                "drive_file_id", drive_file_id
            ).execute()
            return len(result.data) > 0
        except Exception as e:
            logger.error(f"Error verificando documento: {e}")
            return False
    
    def save_document(self, document_data: Dict) -> Optional[Dict]:
        """
        Guarda o actualiza un documento en Supabase.
        """
        try:
            drive_file_id = document_data.get('drive_file_id')
            
            if self.document_exists(drive_file_id):
                # Actualizar documento existente
                logger.info(f"Actualizando documento: {drive_file_id}")
                result = self.client.table(self.table).update(
                    document_data
                ).eq("drive_file_id", drive_file_id).execute()
            else:
                # Insertar nuevo documento
                logger.info(f"Insertando nuevo documento: {drive_file_id}")
                result = self.client.table(self.table).insert(
                    document_data
                ).execute()
            
            if result.data:
                logger.info("Documento guardado exitosamente.")
                return result.data[0]
            return None
            
        except Exception as e:
            logger.error(f"Error guardando documento: {e}")
            return None
    
    def get_document_by_id(self, doc_id: int) -> Optional[Dict]:
        """
        Obtiene un documento por su ID.
        """
        try:
            result = self.client.table(self.table).select("*").eq(
                "id", doc_id
            ).single().execute()
            return result.data
        except Exception as e:
            logger.error(f"Error obteniendo documento: {e}")
            return None
    
    def get_document_by_drive_id(self, drive_file_id: str) -> Optional[Dict]:
        """
        Obtiene un documento por su ID de Google Drive.
        """
        try:
            result = self.client.table(self.table).select("*").eq(
                "drive_file_id", drive_file_id
            ).single().execute()
            return result.data
        except Exception as e:
            logger.error(f"Error obteniendo documento: {e}")
            return None
    
    def search_documents(
        self,
        numero_guia: Optional[str] = None,
        fecha_desde: Optional[str] = None,
        fecha_hasta: Optional[str] = None,
        proveedor: Optional[str] = None,
        producto: Optional[str] = None,
        palabra_clave: Optional[str] = None,
        dummy_phone: Optional[str] = None,
        firmado: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict]:
        """
        Busca documentos con múltiples filtros.
        """
        try:
            query = self.client.table(self.table).select("*")
            
            # Aplicar filtros
            if numero_guia:
                query = query.ilike("numero_guia", f"%{numero_guia}%")
            
            if fecha_desde:
                query = query.gte("fecha_documento", fecha_desde)
            
            if fecha_hasta:
                query = query.lte("fecha_documento", fecha_hasta)
            
            if proveedor:
                query = query.ilike("proveedor", f"%{proveedor}%")
            
            if producto:
                query = query.contains("productos", [producto])
            
            if palabra_clave:
                query = query.ilike("raw_text", f"%{palabra_clave}%")
            
            if dummy_phone:
                query = query.contains("dummy_phones", [dummy_phone])
            
            if firmado is not None:
                query = query.eq("firmado", firmado)
            
            # Ordenar y paginar
            query = query.order("created_at", desc=True)
            query = query.range(offset, offset + limit - 1)
            
            result = query.execute()
            return result.data
            
        except Exception as e:
            logger.error(f"Error buscando documentos: {e}")
            return []
    
    def get_all_documents(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        Obtiene todos los documentos paginados.
        """
        try:
            result = self.client.table(self.table).select("*").order(
                "created_at", desc=True
            ).range(offset, offset + limit - 1).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error obteniendo documentos: {e}")
            return []
    
    def get_document_count(self) -> int:
        """
        Obtiene el conteo total de documentos.
        """
        try:
            result = self.client.table(self.table).select(
                "id", count="exact"
            ).execute()
            return result.count or 0
        except Exception as e:
            logger.error(f"Error contando documentos: {e}")
            return 0
    
    def get_recent_documents(self, limit: int = 10) -> List[Dict]:
        """
        Obtiene los documentos más recientes.
        """
        try:
            result = self.client.table(self.table).select("*").order(
                "created_at", desc=True
            ).limit(limit).execute()
            return result.data
        except Exception as e:
            logger.error(f"Error obteniendo documentos recientes: {e}")
            return []
    
    def get_unique_proveedores(self) -> List[str]:
        """
        Obtiene lista de proveedores únicos.
        """
        try:
            result = self.client.table(self.table).select("proveedor").execute()
            proveedores = set()
            for doc in result.data:
                if doc.get('proveedor'):
                    proveedores.add(doc['proveedor'])
            return sorted(list(proveedores))
        except Exception as e:
            logger.error(f"Error obteniendo proveedores: {e}")
            return []
    
    def get_statistics(self) -> Dict:
        """
        Obtiene estadísticas generales de los documentos.
        """
        try:
            total = self.get_document_count()
            
            # Documentos firmados
            firmados = self.client.table(self.table).select(
                "id", count="exact"
            ).eq("firmado", True).execute()
            
            # Documentos con errores de OCR
            con_errores = self.client.table(self.table).select(
                "id", count="exact"
            ).eq("ocr_status", "error").execute()
            
            return {
                'total_documentos': total,
                'documentos_firmados': firmados.count or 0,
                'documentos_no_firmados': total - (firmados.count or 0),
                'documentos_con_errores': con_errores.count or 0,
                'proveedores_unicos': len(self.get_unique_proveedores())
            }
        except Exception as e:
            logger.error(f"Error obteniendo estadísticas: {e}")
            return {}
    
    def delete_document(self, doc_id: int) -> bool:
        """
        Elimina un documento por ID.
        """
        try:
            self.client.table(self.table).delete().eq("id", doc_id).execute()
            logger.info(f"Documento {doc_id} eliminado.")
            return True
        except Exception as e:
            logger.error(f"Error eliminando documento: {e}")
            return False


def get_supabase_service() -> SupabaseService:
    """Factory para obtener servicio de Supabase."""
    return SupabaseService()


# SQL para crear la tabla en Supabase
CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS documentos_guia (
    id BIGSERIAL PRIMARY KEY,
    drive_file_id TEXT UNIQUE NOT NULL,
    drive_file_name TEXT,
    drive_url TEXT,
    drive_embed_url TEXT,
    
    numero_guia TEXT,
    fecha_documento TEXT,
    proveedor TEXT,
    direccion_destino TEXT,
    productos TEXT[],
    cantidades TEXT[],
    unidad_medida TEXT[],
    firmado BOOLEAN DEFAULT FALSE,
    nombre_firmante TEXT,
    observaciones TEXT,
    numero_paginas INTEGER DEFAULT 1,
    codigo_interno TEXT,
    dummy_phones TEXT[],
    transportista TEXT,
    ruc TEXT,
    direccion_remitente TEXT,
    placa TEXT,
    
    raw_text TEXT,
    ocr_status TEXT DEFAULT 'pending',
    campos_faltantes TEXT[],
    
    procesado_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsqueda eficiente
CREATE INDEX IF NOT EXISTS idx_numero_guia ON documentos_guia(numero_guia);
CREATE INDEX IF NOT EXISTS idx_fecha_documento ON documentos_guia(fecha_documento);
CREATE INDEX IF NOT EXISTS idx_proveedor ON documentos_guia(proveedor);
CREATE INDEX IF NOT EXISTS idx_firmado ON documentos_guia(firmado);
CREATE INDEX IF NOT EXISTS idx_drive_file_id ON documentos_guia(drive_file_id);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_documentos_guia_updated_at ON documentos_guia;
CREATE TRIGGER update_documentos_guia_updated_at
    BEFORE UPDATE ON documentos_guia
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS (Row Level Security)
ALTER TABLE documentos_guia ENABLE ROW LEVEL SECURITY;

-- Política para permitir lectura pública
CREATE POLICY "Permitir lectura pública" ON documentos_guia
    FOR SELECT USING (true);

-- Política para permitir inserción/actualización desde el servicio
CREATE POLICY "Permitir escritura desde servicio" ON documentos_guia
    FOR ALL USING (true);
"""

# Crear instancia singleton del servicio
supabase_service = SupabaseService()

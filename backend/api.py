"""
API REST con FastAPI para el sistema de gestión de documentos.
"""
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
import asyncio

from services.supabase_service import get_supabase_service
from services.drive_service import get_drive_service
from services.ocr_service import get_ocr_service

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Crear aplicación FastAPI
app = FastAPI(
    title="Sistema de Gestión de Documentos - Guías de Remisión",
    description="API para procesar y consultar guías de remisión mediante OCR",
    version="1.0.0"
)

# Configurar CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # En producción, especificar dominios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Servicios globales
supabase_service = None
drive_service = None
ocr_service = None


@app.on_event("startup")
async def startup_event():
    """Inicializa servicios al arrancar."""
    global supabase_service, drive_service, ocr_service
    try:
        supabase_service = get_supabase_service()
        logger.info("Supabase conectado")
    except Exception as e:
        logger.error(f"Error conectando Supabase: {e}")
    
    try:
        ocr_service = get_ocr_service()
        logger.info("OCR inicializado")
    except Exception as e:
        logger.error(f"Error inicializando OCR: {e}")


# Modelos Pydantic
class DocumentoResponse(BaseModel):
    id: int
    drive_file_id: str
    drive_file_name: Optional[str]
    drive_url: Optional[str]
    drive_embed_url: Optional[str]
    numero_guia: Optional[str]
    fecha_documento: Optional[str]
    proveedor: Optional[str]
    direccion_destino: Optional[str]
    productos: Optional[List[str]]
    cantidades: Optional[List[str]]
    unidad_medida: Optional[List[str]]
    firmado: bool
    nombre_firmante: Optional[str]
    observaciones: Optional[str]
    numero_paginas: int
    codigo_interno: Optional[str]
    dummy_phones: Optional[List[str]]
    transportista: Optional[str]
    ruc: Optional[str]
    placa: Optional[str]
    raw_text: Optional[str]
    ocr_status: str
    created_at: Optional[str]


class SearchParams(BaseModel):
    numero_guia: Optional[str] = None
    fecha_desde: Optional[str] = None
    fecha_hasta: Optional[str] = None
    proveedor: Optional[str] = None
    producto: Optional[str] = None
    palabra_clave: Optional[str] = None
    dummy_phone: Optional[str] = None
    firmado: Optional[bool] = None
    limit: int = 50
    offset: int = 0


class StatsResponse(BaseModel):
    total_documentos: int
    documentos_firmados: int
    documentos_no_firmados: int
    documentos_con_errores: int
    proveedores_unicos: int


# Endpoints
@app.get("/")
async def root():
    """Endpoint raíz."""
    return {
        "message": "API de Gestión de Documentos",
        "version": "1.0.0",
        "status": "active"
    }


@app.get("/health")
async def health_check():
    """Verificación de salud del servicio."""
    return {
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "services": {
            "supabase": supabase_service is not None,
            "ocr": ocr_service is not None
        }
    }


@app.get("/api/documentos", response_model=List[DocumentoResponse])
async def get_documentos(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Obtiene lista de documentos paginada."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    documentos = supabase_service.get_all_documents(limit=limit, offset=offset)
    return documentos


@app.get("/api/documentos/{doc_id}", response_model=DocumentoResponse)
async def get_documento(doc_id: int):
    """Obtiene un documento por ID."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    documento = supabase_service.get_document_by_id(doc_id)
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    return documento


@app.get("/api/documentos/drive/{drive_id}", response_model=DocumentoResponse)
async def get_documento_by_drive_id(drive_id: str):
    """Obtiene un documento por ID de Google Drive."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    documento = supabase_service.get_document_by_drive_id(drive_id)
    if not documento:
        raise HTTPException(status_code=404, detail="Documento no encontrado")
    
    return documento


@app.post("/api/documentos/buscar", response_model=List[DocumentoResponse])
async def buscar_documentos(params: SearchParams):
    """Busca documentos con filtros múltiples."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    documentos = supabase_service.search_documents(
        numero_guia=params.numero_guia,
        fecha_desde=params.fecha_desde,
        fecha_hasta=params.fecha_hasta,
        proveedor=params.proveedor,
        producto=params.producto,
        palabra_clave=params.palabra_clave,
        dummy_phone=params.dummy_phone,
        firmado=params.firmado,
        limit=params.limit,
        offset=params.offset
    )
    
    return documentos


@app.get("/api/documentos/buscar/simple")
async def buscar_documentos_simple(
    q: Optional[str] = Query(None, description="Búsqueda general"),
    numero_guia: Optional[str] = None,
    fecha_desde: Optional[str] = None,
    fecha_hasta: Optional[str] = None,
    proveedor: Optional[str] = None,
    producto: Optional[str] = None,
    dummy_phone: Optional[str] = None,
    firmado: Optional[bool] = None,
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """Búsqueda simple con query params."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    documentos = supabase_service.search_documents(
        numero_guia=numero_guia,
        fecha_desde=fecha_desde,
        fecha_hasta=fecha_hasta,
        proveedor=proveedor,
        producto=producto,
        palabra_clave=q,
        dummy_phone=dummy_phone,
        firmado=firmado,
        limit=limit,
        offset=offset
    )
    
    return documentos


@app.get("/api/estadisticas", response_model=StatsResponse)
async def get_estadisticas():
    """Obtiene estadísticas generales."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    stats = supabase_service.get_statistics()
    return stats


@app.get("/api/proveedores")
async def get_proveedores():
    """Obtiene lista de proveedores únicos."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    proveedores = supabase_service.get_unique_proveedores()
    return {"proveedores": proveedores}


@app.get("/api/documentos/recientes")
async def get_documentos_recientes(limit: int = Query(10, ge=1, le=50)):
    """Obtiene los documentos más recientes."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    documentos = supabase_service.get_recent_documents(limit=limit)
    return documentos


@app.delete("/api/documentos/{doc_id}")
async def delete_documento(doc_id: int):
    """Elimina un documento."""
    if not supabase_service:
        raise HTTPException(status_code=503, detail="Servicio no disponible")
    
    success = supabase_service.delete_document(doc_id)
    if not success:
        raise HTTPException(status_code=500, detail="Error eliminando documento")
    
    return {"message": "Documento eliminado", "id": doc_id}


@app.post("/api/sync/trigger")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Dispara sincronización manual con Google Drive."""
    background_tasks.add_task(sync_drive_files)
    return {"message": "Sincronización iniciada en segundo plano"}


async def sync_drive_files():
    """Sincroniza archivos desde Google Drive."""
    global drive_service, ocr_service, supabase_service
    
    try:
        if not drive_service:
            drive_service = get_drive_service()
        
        files = drive_service.list_tif_files()
        
        for file_info in files:
            # Verificar si ya existe
            if supabase_service.document_exists(file_info['id']):
                logger.info(f"Documento ya existe: {file_info['name']}")
                continue
            
            # Descargar y procesar
            local_path = drive_service.download_file(
                file_info['id'], 
                file_info['name']
            )
            
            if local_path:
                # Procesar con OCR
                ocr_result = ocr_service.process_document(local_path)
                
                # Preparar datos para Supabase
                doc_data = {
                    'drive_file_id': file_info['id'],
                    'drive_file_name': file_info['name'],
                    'drive_url': drive_service.get_file_url(file_info['id']),
                    'drive_embed_url': drive_service.get_file_embed_url(file_info['id']),
                    **ocr_result
                }
                
                # Guardar en Supabase
                supabase_service.save_document(doc_data)
                
                # Limpiar archivo temporal
                if local_path.exists():
                    local_path.unlink()
        
        logger.info("Sincronización completada")
        
    except Exception as e:
        logger.error(f"Error en sincronización: {e}")


if __name__ == "__main__":
    import uvicorn
    from config.settings import API_HOST, API_PORT
    
    uvicorn.run(app, host=API_HOST, port=API_PORT)

"""
API REST con FastAPI para el sistema de gestión de documentos.
"""
from fastapi import FastAPI, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import logging
import asyncio
import io

from services.supabase_service import get_supabase_service
from services.drive_service import get_drive_service
from services.ocr_service import get_ocr_service

# Importar router de LDU
from api_ldu import router as ldu_router

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

# Incluir router de LDU
app.include_router(ldu_router, prefix="/api")


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


@app.get("/api/documentos/download/{drive_file_id}")
async def download_document_image(drive_file_id: str):
    """Descarga la imagen TIF de un documento desde Google Drive."""
    global drive_service
    
    try:
        if not drive_service:
            drive_service = get_drive_service()
        
        # Descargar archivo a memoria
        file_content = drive_service.download_file_to_memory(drive_file_id)
        
        if not file_content:
            raise HTTPException(status_code=404, detail="Archivo no encontrado en Google Drive")
        
        # Obtener nombre del archivo
        file_info = drive_service.get_file_info(drive_file_id)
        filename = file_info.get('name', f'{drive_file_id}.tif') if file_info else f'{drive_file_id}.tif'
        
        # Retornar como streaming response
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="image/tiff",
            headers={
                "Content-Disposition": f'attachment; filename="{filename}"',
                "Access-Control-Expose-Headers": "Content-Disposition"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error descargando archivo {drive_file_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Error descargando archivo: {str(e)}")


@app.post("/api/sync/trigger")
async def trigger_sync(background_tasks: BackgroundTasks):
    """Dispara sincronización manual con Google Drive."""
    background_tasks.add_task(sync_drive_files)
    return {"message": "Sincronización iniciada en segundo plano"}


@app.get("/api/drive/files")
async def get_drive_files():
    """Lista todos los archivos TIF en Drive y su estado de procesamiento."""
    global drive_service, supabase_service
    
    try:
        if not drive_service:
            drive_service = get_drive_service()
        
        # Obtener archivos de Drive
        drive_files = drive_service.list_tif_files()
        
        # Obtener IDs ya procesados de Supabase
        processed_ids = set()
        if supabase_service:
            docs = supabase_service.get_all_documents(limit=1000)
            processed_ids = {doc['drive_file_id'] for doc in docs}
        
        # Clasificar archivos
        result = {
            "total": len(drive_files),
            "processed": 0,
            "pending": 0,
            "files": []
        }
        
        for file in drive_files:
            is_processed = file['id'] in processed_ids
            if is_processed:
                result["processed"] += 1
            else:
                result["pending"] += 1
            
            result["files"].append({
                "id": file['id'],
                "name": file['name'],
                "createdTime": file.get('createdTime'),
                "webViewLink": file.get('webViewLink'),
                "processed": is_processed
            })
        
        # Ordenar: pendientes primero
        result["files"].sort(key=lambda x: (x["processed"], x["name"]))
        
        return result
        
    except Exception as e:
        logger.error(f"Error listando archivos de Drive: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


@app.post("/api/drive/process")
async def process_drive_files(
    background_tasks: BackgroundTasks,
    file_ids: List[str] = None,
    count: int = Query(5, ge=1, le=50)
):
    """Procesa archivos específicos o una cantidad de archivos pendientes."""
    global drive_service, supabase_service
    
    try:
        if not drive_service:
            drive_service = get_drive_service()
        
        # Si no se especifican IDs, obtener los pendientes
        if not file_ids:
            drive_files = drive_service.list_tif_files()
            processed_ids = set()
            if supabase_service:
                docs = supabase_service.get_all_documents(limit=1000)
                processed_ids = {doc['drive_file_id'] for doc in docs}
            
            # Filtrar solo pendientes
            pending_files = [f for f in drive_files if f['id'] not in processed_ids]
            file_ids = [f['id'] for f in pending_files[:count]]
        
        if not file_ids:
            return {"message": "No hay archivos pendientes de procesar", "processed": 0}
        
        # Procesar en background
        background_tasks.add_task(process_specific_files, file_ids)
        
        return {
            "message": f"Procesando {len(file_ids)} archivos en segundo plano",
            "file_ids": file_ids
        }
        
    except Exception as e:
        logger.error(f"Error iniciando procesamiento: {e}")
        raise HTTPException(status_code=500, detail=f"Error: {str(e)}")


async def process_specific_files(file_ids: List[str]):
    """Procesa archivos específicos por sus IDs."""
    global drive_service, ocr_service, supabase_service
    
    try:
        if not drive_service:
            drive_service = get_drive_service()
        
        for file_id in file_ids:
            try:
                # Obtener info del archivo
                file_info = drive_service.get_file_info(file_id)
                if not file_info:
                    logger.error(f"No se encontró archivo: {file_id}")
                    continue
                
                # Verificar si ya existe
                if supabase_service.document_exists(file_id):
                    logger.info(f"Documento ya existe: {file_info.get('name')}")
                    continue
                
                # Descargar archivo
                local_path = drive_service.download_file(file_id, file_info.get('name', f'{file_id}.tif'))
                
                if local_path:
                    # Procesar con OCR
                    ocr_result = ocr_service.process_document(local_path)
                    
                    # Preparar datos para Supabase
                    doc_data = {
                        'drive_file_id': file_id,
                        'drive_file_name': file_info.get('name'),
                        'drive_url': drive_service.get_file_url(file_id),
                        'drive_embed_url': drive_service.get_file_embed_url(file_id),
                        **ocr_result
                    }
                    
                    # Guardar en Supabase
                    supabase_service.save_document(doc_data)
                    logger.info(f"Procesado: {file_info.get('name')}")
                    
                    # Limpiar archivo temporal
                    if local_path.exists():
                        local_path.unlink()
                        
            except Exception as e:
                logger.error(f"Error procesando {file_id}: {e}")
                continue
        
        logger.info(f"Procesamiento completado: {len(file_ids)} archivos")
        
    except Exception as e:
        logger.error(f"Error en procesamiento: {e}")


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

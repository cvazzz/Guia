"""
API endpoints para el módulo LDU
"""
from fastapi import APIRouter, HTTPException, Query, BackgroundTasks, UploadFile, File, Form
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
import io
import json
import pandas as pd

from services.ldu_sync_service import ldu_sync_service
from services.excel_drive_service import excel_drive_service


router = APIRouter(prefix="/ldu", tags=["LDU"])


# ==================== MODELOS ====================

class ImportRequest(BaseModel):
    file_id: str = Field(..., description="ID del archivo Excel en Google Drive")
    user: str = Field(default="system", description="Usuario que ejecuta la importación")


class SearchRequest(BaseModel):
    query: Optional[str] = None
    imei: Optional[str] = None
    dni: Optional[str] = None
    region: Optional[str] = None
    punto_venta: Optional[str] = None
    estado: Optional[str] = None
    responsable: Optional[str] = None
    page: int = 1
    limit: int = 50


class ReasignacionRequest(BaseModel):
    imei: str = Field(..., description="IMEI del dispositivo a reasignar")
    nuevo_dni: str = Field(..., description="DNI del nuevo responsable")
    nuevo_nombre: str = Field(..., description="Nombre del nuevo responsable")
    nuevo_apellido: str = Field(..., description="Apellido del nuevo responsable")
    motivo: str = Field(..., description="Motivo de la reasignación")
    comentarios: Optional[str] = Field(None, description="Comentarios adicionales")
    user: str = Field(default="system", description="Usuario que realiza la operación")


class ReasignacionMasivaRequest(BaseModel):
    dni_anterior: str = Field(..., description="DNI del responsable actual")
    nuevo_dni: str = Field(..., description="DNI del nuevo responsable")
    nuevo_nombre: str = Field(..., description="Nombre del nuevo responsable")
    nuevo_apellido: str = Field(..., description="Apellido del nuevo responsable")
    motivo: str = Field(..., description="Motivo de la reasignación")
    comentarios: Optional[str] = Field(None, description="Comentarios adicionales")
    user: str = Field(default="system", description="Usuario que realiza la operación")


# ==================== ENDPOINTS DE IMPORTACIÓN ====================

@router.post("/import")
async def import_from_excel(request: ImportRequest, background_tasks: BackgroundTasks):
    """
    Importa datos desde un archivo Excel de Google Drive
    Ejecuta la sincronización completa
    """
    try:
        result = await ldu_sync_service.sync_from_excel(
            file_id=request.file_id,
            user=request.user
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/analyze-excel")
async def analyze_excel_file(file: UploadFile = File(...)):
    """
    Analiza un archivo Excel y retorna las hojas disponibles
    Primer paso antes de previsualizar
    """
    try:
        # Validar extensión
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(
                status_code=400, 
                detail="Formato de archivo no soportado. Use .xlsx, .xls o .csv"
            )
        
        # Leer archivo
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            # CSV solo tiene una "hoja"
            df = pd.read_csv(io.BytesIO(contents))
            return {
                "success": True,
                "data": {
                    "filename": file.filename,
                    "sheets": [{"name": "CSV", "rows": len(df)}],
                    "is_csv": True
                }
            }
        else:
            # Excel puede tener múltiples hojas
            excel_file = pd.ExcelFile(io.BytesIO(contents))
            sheets = []
            
            for sheet_name in excel_file.sheet_names:
                df = pd.read_excel(excel_file, sheet_name=sheet_name, nrows=1)
                # Contar filas sin cargar todo
                df_count = pd.read_excel(excel_file, sheet_name=sheet_name)
                sheets.append({
                    "name": sheet_name,
                    "rows": len(df_count),
                    "columns": len(df.columns)
                })
            
            return {
                "success": True,
                "data": {
                    "filename": file.filename,
                    "sheets": sheets,
                    "is_csv": False
                }
            }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error analizando archivo: {str(e)}")


@router.post("/preview-excel")
async def preview_local_excel(
    file: UploadFile = File(...),
    sheet_name: str = Form(None)
):
    """
    Previsualiza un archivo Excel subido desde el escritorio
    Retorna columnas y primeras filas para mapeo
    """
    try:
        # Validar extensión
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(
                status_code=400, 
                detail="Formato de archivo no soportado. Use .xlsx, .xls o .csv"
            )
        
        # Leer archivo
        contents = await file.read()
        
        # Parsear según extensión
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            # Si se especifica hoja, usarla; si no, usar la primera
            if sheet_name:
                df = pd.read_excel(io.BytesIO(contents), sheet_name=sheet_name)
            else:
                df = pd.read_excel(io.BytesIO(contents), sheet_name=0)
        
        # Obtener columnas y preview
        columns = df.columns.tolist()
        preview = df.head(10).fillna('').to_dict('records')
        
        return {
            "success": True,
            "data": {
                "filename": file.filename,
                "sheet_name": sheet_name or "Primera hoja",
                "columns": columns,
                "total_rows": len(df),
                "preview": preview
            }
        }
    except pd.errors.EmptyDataError:
        raise HTTPException(status_code=400, detail="El archivo está vacío")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error procesando archivo: {str(e)}")


@router.post("/import-local")
async def import_local_excel(
    file: UploadFile = File(...),
    column_mapping: str = Form(...),
    sheet_name: str = Form(None),
    sync_to_drive: str = Form("false"),
    user: str = Form("web_user")
):
    """
    Importa un archivo Excel desde el escritorio a Supabase
    Opcionalmente sincroniza a Google Drive
    """
    try:
        # Validar extensión
        if not file.filename.endswith(('.xlsx', '.xls', '.csv')):
            raise HTTPException(
                status_code=400, 
                detail="Formato de archivo no soportado"
            )
        
        # Parsear mapping
        try:
            mapping = json.loads(column_mapping)
        except json.JSONDecodeError:
            raise HTTPException(status_code=400, detail="Mapeo de columnas inválido")
        
        # Leer archivo
        contents = await file.read()
        
        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(contents))
        else:
            # Usar hoja especificada o la primera
            if sheet_name:
                df = pd.read_excel(io.BytesIO(contents), sheet_name=sheet_name)
            else:
                df = pd.read_excel(io.BytesIO(contents), sheet_name=0)
        
        # Renombrar columnas según mapeo
        df = df.rename(columns=mapping)
        
        # Ejecutar sincronización
        result = await ldu_sync_service.sync_from_dataframe(
            df=df,
            source_name=file.filename,
            user=user
        )
        
        # Opcionalmente subir a Drive
        if sync_to_drive.lower() == 'true':
            try:
                # Guardar temporalmente y subir
                output = io.BytesIO()
                df.to_excel(output, index=False)
                output.seek(0)
                
                drive_file = excel_drive_service.upload_file(
                    file_content=output.getvalue(),
                    filename=f"LDU_Import_{datetime.now().strftime('%Y%m%d_%H%M%S')}.xlsx",
                    mime_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
                result['drive_file_id'] = drive_file.get('id')
                result['synced_to_drive'] = True
            except Exception as drive_error:
                result['drive_sync_error'] = str(drive_error)
                result['synced_to_drive'] = False
        
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/excel-files")
async def list_excel_files(folder_id: Optional[str] = None):
    """
    Lista archivos Excel disponibles en Google Drive
    """
    try:
        files = excel_drive_service.list_excel_files(folder_id)
        return {
            "success": True,
            "data": files
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/excel-files/{file_id}/preview")
async def preview_excel_file(file_id: str, rows: int = 10):
    """
    Previsualiza las primeras filas de un archivo Excel
    """
    try:
        data = excel_drive_service.read_ldu_excel(file_id)
        return {
            "success": True,
            "data": {
                "columns": data['columns'],
                "expected_columns": data['expected_columns'],
                "missing_columns": data['missing_columns'],
                "total_rows": data['total_rows'],
                "preview": data['data'][:rows]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/importaciones")
async def list_importaciones(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """
    Lista el historial de importaciones
    """
    try:
        offset = (page - 1) * limit
        result = ldu_sync_service.supabase.table('ldu_importaciones').select(
            '*', count='exact'
        ).order('fecha_inicio', desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": result.count or 0,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/importaciones/{importacion_id}")
async def get_importacion(importacion_id: str):
    """
    Obtiene detalles de una importación específica
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_importaciones').select('*').eq(
            'id', importacion_id
        ).execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="Importación no encontrada")
        
        # Obtener errores asociados
        errors = ldu_sync_service.supabase.table('ldu_import_errors').select('*').eq(
            'importacion_id', importacion_id
        ).execute()
        
        return {
            "success": True,
            "data": result.data[0],
            "errors": errors.data
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS DE BÚSQUEDA ====================

@router.get("/registros")
async def search_registros(
    query: Optional[str] = None,
    imei: Optional[str] = None,
    dni: Optional[str] = None,
    region: Optional[str] = None,
    punto_venta: Optional[str] = None,
    estado: Optional[str] = None,
    responsable: Optional[str] = None,
    presente: Optional[bool] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Búsqueda avanzada de registros LDU
    """
    try:
        result = ldu_sync_service.search_ldu(
            query=query,
            imei=imei,
            dni=dni,
            region=region,
            punto_venta=punto_venta,
            estado=estado,
            responsable=responsable,
            page=page,
            limit=limit
        )
        return {
            "success": True,
            **result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/registros/{imei}")
async def get_registro(imei: str):
    """
    Obtiene un registro LDU por IMEI
    """
    try:
        result = ldu_sync_service.get_ldu_by_imei(imei)
        
        if not result:
            raise HTTPException(status_code=404, detail=f"LDU con IMEI {imei} no encontrado")
        
        return {
            "success": True,
            "data": result
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/registros/responsable/{dni}")
async def get_registros_por_responsable(dni: str):
    """
    Obtiene todos los LDU de un responsable
    """
    try:
        result = ldu_sync_service.get_ldu_by_responsable(dni)
        return {
            "success": True,
            "data": result,
            "total": len(result)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS DE ESTADÍSTICAS ====================

@router.get("/stats")
async def get_stats():
    """
    Obtiene estadísticas generales de LDU
    """
    try:
        stats = ldu_sync_service.get_stats()
        return {
            "success": True,
            "data": stats
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/regiones")
async def get_stats_por_region():
    """
    Obtiene estadísticas por región
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_registros').select(
            'region'
        ).eq('activo', True).execute()
        
        # Agrupar por región
        regiones = {}
        for r in result.data:
            region = r.get('region') or 'Sin región'
            regiones[region] = regiones.get(region, 0) + 1
        
        return {
            "success": True,
            "data": regiones
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/stats/estados")
async def get_stats_por_estado():
    """
    Obtiene estadísticas por estado
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_registros').select(
            'estado'
        ).eq('activo', True).execute()
        
        # Agrupar por estado
        estados = {}
        for r in result.data:
            estado = r.get('estado') or 'Sin estado'
            estados[estado] = estados.get(estado, 0) + 1
        
        return {
            "success": True,
            "data": estados
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS DE REASIGNACIÓN ====================

@router.post("/reasignar")
async def reasignar_ldu(request: ReasignacionRequest):
    """
    Reasigna un LDU a un nuevo responsable
    """
    try:
        result = await ldu_sync_service.reasignar_ldu(
            imei=request.imei,
            nuevo_dni=request.nuevo_dni,
            nuevo_nombre=request.nuevo_nombre,
            nuevo_apellido=request.nuevo_apellido,
            motivo=request.motivo,
            comentarios=request.comentarios,
            user=request.user
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reasignar-masivo")
async def reasignar_masivo(request: ReasignacionMasivaRequest):
    """
    Reasigna todos los LDU de un responsable a otro
    """
    try:
        result = await ldu_sync_service.reasignar_masivo(
            dni_anterior=request.dni_anterior,
            nuevo_dni=request.nuevo_dni,
            nuevo_nombre=request.nuevo_nombre,
            nuevo_apellido=request.nuevo_apellido,
            motivo=request.motivo,
            comentarios=request.comentarios,
            user=request.user
        )
        return {
            "success": True,
            "data": result
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS DE RESPONSABLES ====================

@router.get("/responsables")
async def list_responsables(
    query: Optional[str] = None,
    estado: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Lista responsables con filtros
    """
    try:
        q = ldu_sync_service.supabase.table('ldu_responsables').select('*', count='exact')
        
        if query:
            q = q.or_(
                f"nombre_completo.ilike.%{query}%,"
                f"dni.ilike.%{query}%"
            )
        
        if estado:
            q = q.eq('estado', estado)
        
        offset = (page - 1) * limit
        result = q.range(offset, offset + limit - 1).order('nombre_completo').execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": result.count or 0,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/responsables/{dni}")
async def get_responsable(dni: str):
    """
    Obtiene un responsable por DNI con sus LDU
    """
    try:
        resp = ldu_sync_service.supabase.table('ldu_responsables').select('*').eq('dni', dni).execute()
        
        if not resp.data:
            raise HTTPException(status_code=404, detail="Responsable no encontrado")
        
        ldus = ldu_sync_service.get_ldu_by_responsable(dni)
        
        return {
            "success": True,
            "data": {
                "responsable": resp.data[0],
                "ldus": ldus,
                "total_ldus": len(ldus)
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS DE AUDITORÍA ====================

@router.get("/auditoria")
async def list_auditoria(
    imei: Optional[str] = None,
    accion: Optional[str] = None,
    usuario: Optional[str] = None,
    desde: Optional[str] = None,
    hasta: Optional[str] = None,
    page: int = Query(1, ge=1),
    limit: int = Query(50, ge=1, le=200)
):
    """
    Lista registros de auditoría con filtros
    """
    try:
        q = ldu_sync_service.supabase.table('ldu_auditoria').select('*', count='exact')
        
        if imei:
            q = q.eq('imei', imei)
        
        if accion:
            q = q.eq('accion', accion)
        
        if usuario:
            q = q.ilike('usuario_sistema', f'%{usuario}%')
        
        if desde:
            q = q.gte('fecha_hora', desde)
        
        if hasta:
            q = q.lte('fecha_hora', hasta)
        
        offset = (page - 1) * limit
        result = q.order('fecha_hora', desc=True).range(offset, offset + limit - 1).execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": result.count or 0,
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/auditoria/imei/{imei}")
async def get_auditoria_imei(imei: str):
    """
    Obtiene todo el historial de auditoría de un IMEI
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_auditoria').select('*').eq(
            'imei', imei
        ).order('fecha_hora', desc=True).execute()
        
        return {
            "success": True,
            "data": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historial-responsables/{imei}")
async def get_historial_responsables(imei: str):
    """
    Obtiene el historial de responsables de un LDU
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_historial_responsables').select('*').eq(
            'ldu_imei', imei
        ).order('fecha_cambio', desc=True).execute()
        
        return {
            "success": True,
            "data": result.data
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== ENDPOINTS DE REPORTES ====================

@router.get("/reportes/sin-responsable")
async def get_sin_responsable():
    """
    Obtiene LDU sin responsable asignado
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_registros').select('*').eq(
            'activo', True
        ).is_('responsable_dni', 'null').execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reportes/pendientes-devolucion")
async def get_pendientes_devolucion():
    """
    Obtiene LDU pendientes de devolución
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_registros').select('*').eq(
            'activo', True
        ).in_('estado', ['Pendiente devolución', 'Devuelto']).execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reportes/ausentes")
async def get_ausentes_excel():
    """
    Obtiene LDU que no estaban en el último Excel importado
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_registros').select('*').eq(
            'activo', True
        ).eq('presente_en_ultima_importacion', False).execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reportes/danados")
async def get_danados():
    """
    Obtiene LDU dañados o en reparación
    """
    try:
        result = ldu_sync_service.supabase.table('ldu_registros').select('*').eq(
            'activo', True
        ).in_('estado', ['Dañado', 'En reparación']).execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": len(result.data)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

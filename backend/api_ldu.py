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


class UpdateRegistroRequest(BaseModel):
    """Modelo para actualizar un registro LDU"""
    modelo: Optional[str] = None
    account: Optional[str] = None
    account_int: Optional[str] = None
    supervisor: Optional[str] = None
    zone: Optional[str] = None
    departamento: Optional[str] = None
    city: Optional[str] = None
    canal: Optional[str] = None
    tipo: Optional[str] = None
    punto_venta: Optional[str] = None
    nombre_ruta: Optional[str] = None
    cobertura_valor: Optional[float] = None
    campo_reg: Optional[str] = None
    campo_ok: Optional[str] = None
    uso: Optional[str] = None
    observaciones: Optional[str] = None
    estado: Optional[str] = None
    responsable_dni: Optional[str] = None
    responsable_nombre: Optional[str] = None
    responsable_apellido: Optional[str] = None
    region: Optional[str] = None
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
    Opcionalmente sincroniza a Google Drive como Google Sheets para edición bidireccional
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
        
        # Log para debug: mostrar columnas y una fila de ejemplo
        import logging
        logging.warning(f"DEBUG MAPPING - Mapeo recibido: {mapping}")
        logging.warning(f"DEBUG MAPPING - Columnas después del mapeo: {list(df.columns)}")
        if len(df) > 0:
            first_row = df.iloc[0].to_dict()
            logging.warning(f"DEBUG MAPPING - Primera fila: {first_row}")
        
        drive_file_id = None
        drive_file_name = None
        
        # Subir a Drive PRIMERO (como Google Sheets para edición bidireccional)
        if sync_to_drive.lower() == 'true':
            try:
                # Preparar Excel para subida
                output = io.BytesIO()
                df.to_excel(output, index=False)
                output.seek(0)
                
                # Subir y convertir a Google Sheets
                drive_file = excel_drive_service.upload_and_convert_to_sheets(
                    file_content=output.getvalue(),
                    filename=file.filename
                )
                drive_file_id = drive_file.get('id')
                drive_file_name = drive_file.get('name')
                
            except Exception as drive_error:
                print(f"Error subiendo a Drive: {drive_error}")
                # Continuar sin Drive si falla
        
        # Ejecutar sincronización con referencia a Drive
        result = await ldu_sync_service.sync_from_dataframe(
            df=df,
            source_name=file.filename,
            user=user,
            drive_file_id=drive_file_id,
            drive_file_name=drive_file_name
        )
        
        if drive_file_id:
            result['drive_file_id'] = drive_file_id
            result['drive_file_name'] = drive_file_name
            result['synced_to_drive'] = True
            result['drive_url'] = f"https://docs.google.com/spreadsheets/d/{drive_file_id}"
        else:
            result['synced_to_drive'] = sync_to_drive.lower() == 'true'
            if result['synced_to_drive']:
                result['drive_sync_error'] = "No se pudo subir a Drive"
        
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


@router.put("/registros/{imei}")
async def update_registro(imei: str, request: UpdateRegistroRequest):
    """
    Actualiza un registro LDU y opcionalmente sincroniza con Google Sheets.
    Marca los campos editados como 'editados manualmente' para protegerlos
    de ser sobrescritos en futuras importaciones.
    """
    try:
        # Obtener registro actual
        existing = ldu_sync_service.get_ldu_by_imei(imei)
        if not existing:
            raise HTTPException(status_code=404, detail=f"LDU con IMEI {imei} no encontrado")
        
        # Construir datos de actualización (solo campos no-None)
        update_data = {}
        edited_fields = []  # Campos que fueron editados manualmente
        update_fields = [
            'modelo', 'account', 'account_int', 'supervisor', 'zone', 
            'departamento', 'city', 'canal', 'tipo', 'punto_venta', 
            'nombre_ruta', 'cobertura_valor', 'campo_reg', 'campo_ok', 
            'uso', 'observaciones', 'estado', 'responsable_dni', 
            'responsable_nombre', 'responsable_apellido', 'region'
        ]
        
        for field in update_fields:
            value = getattr(request, field, None)
            if value is not None:
                # Verificar si realmente cambió
                old_value = existing.get(field)
                if str(value).strip() != str(old_value or '').strip():
                    update_data[field] = value
                    edited_fields.append(field)
        
        if not update_data:
            return {
                "success": True,
                "message": "No hay cambios para aplicar",
                "data": existing
            }
        
        # Actualizar timestamp
        update_data['fecha_actualizacion'] = datetime.now().isoformat()
        
        # Marcar campos como editados manualmente
        if edited_fields:
            current_manual_fields = existing.get('campos_editados_manualmente', []) or []
            if isinstance(current_manual_fields, str):
                try:
                    current_manual_fields = json.loads(current_manual_fields)
                except:
                    current_manual_fields = []
            
            # Agregar nuevos campos editados (sin duplicados)
            all_manual_fields = list(set(current_manual_fields + edited_fields))
            update_data['campos_editados_manualmente'] = all_manual_fields
            update_data['fecha_ultima_edicion_manual'] = datetime.now().isoformat()
            update_data['usuario_ultima_edicion'] = request.user
        
        # Actualizar en base de datos
        result = ldu_sync_service.supabase.table('ldu_registros').update(
            update_data
        ).eq('imei', imei).execute()
        
        updated_record = result.data[0] if result.data else None
        
        # Registrar auditoría
        ldu_sync_service._register_audit(
            imei=imei,
            accion='update_manual',
            user=request.user,
            archivo_origen='api_update',
            fila_numero=None,
            campos_previos={k: existing.get(k) for k in update_data.keys()},
            campos_nuevos=update_data,
            raw_row=None,
            importacion_id=None
        )
        
        return {
            "success": True,
            "message": "Registro actualizado correctamente",
            "data": updated_record
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


# ==================== ENDPOINTS DE CONFLICTOS ====================

class ResolveConflictRequest(BaseModel):
    accion: str = Field(..., description="'mantener' para conservar valor actual, 'sobrescribir' para usar valor del Excel")
    user: str = Field(default="system", description="Usuario que resuelve el conflicto")


class ResolveAllConflictsRequest(BaseModel):
    accion: str = Field(..., description="'mantener' o 'sobrescribir' para todos los conflictos")
    imei: Optional[str] = Field(None, description="Opcional: resolver solo conflictos de un IMEI específico")
    user: str = Field(default="system", description="Usuario que resuelve los conflictos")


@router.get("/conflictos")
async def get_conflictos(
    estado: str = Query(default="pendiente", description="Estado de los conflictos: pendiente, resuelto_mantener, resuelto_sobrescribir"),
    imei: Optional[str] = Query(default=None, description="Filtrar por IMEI específico"),
    page: int = Query(default=1, ge=1),
    limit: int = Query(default=50, ge=1, le=200)
):
    """
    Obtiene lista de conflictos entre ediciones manuales y datos de Excel
    """
    try:
        query = ldu_sync_service.supabase.table('ldu_conflictos').select(
            '*, ldu_registros(modelo, responsable_nombre, responsable_apellido, punto_venta, region)'
        )
        
        if estado:
            query = query.eq('estado', estado)
        
        if imei:
            query = query.eq('imei', imei)
        
        # Ordenar por fecha de conflicto (más recientes primero)
        query = query.order('fecha_conflicto', desc=True)
        
        # Paginación
        offset = (page - 1) * limit
        query = query.range(offset, offset + limit - 1)
        
        result = query.execute()
        
        # Contar total
        count_query = ldu_sync_service.supabase.table('ldu_conflictos').select('id', count='exact')
        if estado:
            count_query = count_query.eq('estado', estado)
        if imei:
            count_query = count_query.eq('imei', imei)
        count_result = count_query.execute()
        
        return {
            "success": True,
            "data": result.data,
            "total": count_result.count if count_result.count else len(result.data),
            "page": page,
            "limit": limit
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/conflictos/resumen")
async def get_conflictos_resumen():
    """
    Obtiene resumen de conflictos pendientes
    """
    try:
        # Contar conflictos pendientes
        pendientes = ldu_sync_service.supabase.table('ldu_conflictos').select(
            'id', count='exact'
        ).eq('estado', 'pendiente').execute()
        
        # Contar por campo
        campos = ldu_sync_service.supabase.table('ldu_conflictos').select(
            'campo'
        ).eq('estado', 'pendiente').execute()
        
        campos_conteo = {}
        for c in campos.data:
            campo = c.get('campo', 'unknown')
            campos_conteo[campo] = campos_conteo.get(campo, 0) + 1
        
        # Obtener IMEIs únicos afectados
        imeis = ldu_sync_service.supabase.table('ldu_conflictos').select(
            'imei'
        ).eq('estado', 'pendiente').execute()
        
        imeis_unicos = list(set([c.get('imei') for c in imeis.data]))
        
        return {
            "success": True,
            "data": {
                "total_pendientes": pendientes.count or 0,
                "registros_afectados": len(imeis_unicos),
                "conflictos_por_campo": campos_conteo
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conflictos/{conflicto_id}/resolver")
async def resolver_conflicto(conflicto_id: str, request: ResolveConflictRequest):
    """
    Resuelve un conflicto individual.
    - 'mantener': Conserva el valor editado manualmente
    - 'sobrescribir': Aplica el valor del Excel
    """
    try:
        # Obtener conflicto
        conflicto = ldu_sync_service.supabase.table('ldu_conflictos').select('*').eq(
            'id', conflicto_id
        ).eq('estado', 'pendiente').execute()
        
        if not conflicto.data:
            raise HTTPException(status_code=404, detail="Conflicto no encontrado o ya resuelto")
        
        c = conflicto.data[0]
        imei = c['imei']
        campo = c['campo']
        valor_excel = c['valor_excel']
        valor_actual = c['valor_actual']
        
        if request.accion == 'sobrescribir':
            # Aplicar valor del Excel
            ldu_sync_service.supabase.table('ldu_registros').update({
                campo: valor_excel,
                'fecha_actualizacion': datetime.now().isoformat()
            }).eq('imei', imei).execute()
            
            # Quitar campo de la lista de editados manualmente
            registro = ldu_sync_service.supabase.table('ldu_registros').select(
                'campos_editados_manualmente'
            ).eq('imei', imei).execute()
            
            if registro.data:
                campos_manuales = registro.data[0].get('campos_editados_manualmente', []) or []
                if isinstance(campos_manuales, str):
                    try:
                        campos_manuales = json.loads(campos_manuales)
                    except:
                        campos_manuales = []
                
                if campo in campos_manuales:
                    campos_manuales.remove(campo)
                    ldu_sync_service.supabase.table('ldu_registros').update({
                        'campos_editados_manualmente': campos_manuales
                    }).eq('imei', imei).execute()
            
            valor_final = valor_excel
            estado_final = 'resuelto_sobrescribir'
        else:
            # Mantener valor actual
            valor_final = valor_actual
            estado_final = 'resuelto_mantener'
        
        # Actualizar conflicto
        ldu_sync_service.supabase.table('ldu_conflictos').update({
            'estado': estado_final,
            'resuelto_por': request.user,
            'fecha_resolucion': datetime.now().isoformat(),
            'valor_final': valor_final
        }).eq('id', conflicto_id).execute()
        
        return {
            "success": True,
            "message": f"Conflicto resuelto: {estado_final}",
            "data": {
                "imei": imei,
                "campo": campo,
                "valor_final": valor_final,
                "accion": request.accion
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/conflictos/resolver-todos")
async def resolver_todos_conflictos(request: ResolveAllConflictsRequest):
    """
    Resuelve todos los conflictos pendientes con la misma acción.
    Opcionalmente puede filtrar por IMEI.
    """
    try:
        # Obtener conflictos pendientes
        query = ldu_sync_service.supabase.table('ldu_conflictos').select('*').eq('estado', 'pendiente')
        
        if request.imei:
            query = query.eq('imei', request.imei)
        
        conflictos = query.execute()
        
        if not conflictos.data:
            return {
                "success": True,
                "message": "No hay conflictos pendientes",
                "resueltos": 0
            }
        
        resueltos = 0
        errores = 0
        
        for c in conflictos.data:
            try:
                imei = c['imei']
                campo = c['campo']
                valor_excel = c['valor_excel']
                valor_actual = c['valor_actual']
                
                if request.accion == 'sobrescribir':
                    # Aplicar valor del Excel
                    ldu_sync_service.supabase.table('ldu_registros').update({
                        campo: valor_excel,
                        'fecha_actualizacion': datetime.now().isoformat()
                    }).eq('imei', imei).execute()
                    
                    # Quitar campo de la lista de editados manualmente
                    registro = ldu_sync_service.supabase.table('ldu_registros').select(
                        'campos_editados_manualmente'
                    ).eq('imei', imei).execute()
                    
                    if registro.data:
                        campos_manuales = registro.data[0].get('campos_editados_manualmente', []) or []
                        if isinstance(campos_manuales, str):
                            try:
                                campos_manuales = json.loads(campos_manuales)
                            except:
                                campos_manuales = []
                        
                        if campo in campos_manuales:
                            campos_manuales.remove(campo)
                            ldu_sync_service.supabase.table('ldu_registros').update({
                                'campos_editados_manualmente': campos_manuales
                            }).eq('imei', imei).execute()
                    
                    valor_final = valor_excel
                    estado_final = 'resuelto_sobrescribir'
                else:
                    valor_final = valor_actual
                    estado_final = 'resuelto_mantener'
                
                # Actualizar conflicto
                ldu_sync_service.supabase.table('ldu_conflictos').update({
                    'estado': estado_final,
                    'resuelto_por': request.user,
                    'fecha_resolucion': datetime.now().isoformat(),
                    'valor_final': valor_final
                }).eq('id', c['id']).execute()
                
                resueltos += 1
            except Exception as e:
                print(f"Error resolviendo conflicto {c['id']}: {e}")
                errores += 1
        
        return {
            "success": True,
            "message": f"Resueltos {resueltos} conflictos" + (f" ({errores} errores)" if errores else ""),
            "resueltos": resueltos,
            "errores": errores
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/conflictos/{imei}/desproteger-campo")
async def desproteger_campo(imei: str, campo: str = Query(..., description="Campo a desproteger")):
    """
    Quita un campo de la lista de 'editados manualmente', 
    permitiendo que sea actualizado en futuras importaciones.
    """
    try:
        registro = ldu_sync_service.supabase.table('ldu_registros').select(
            'campos_editados_manualmente'
        ).eq('imei', imei).execute()
        
        if not registro.data:
            raise HTTPException(status_code=404, detail=f"Registro con IMEI {imei} no encontrado")
        
        campos_manuales = registro.data[0].get('campos_editados_manualmente', []) or []
        if isinstance(campos_manuales, str):
            try:
                campos_manuales = json.loads(campos_manuales)
            except:
                campos_manuales = []
        
        if campo in campos_manuales:
            campos_manuales.remove(campo)
            ldu_sync_service.supabase.table('ldu_registros').update({
                'campos_editados_manualmente': campos_manuales
            }).eq('imei', imei).execute()
            
            return {
                "success": True,
                "message": f"Campo '{campo}' desprotegido para IMEI {imei}",
                "campos_protegidos": campos_manuales
            }
        else:
            return {
                "success": True,
                "message": f"Campo '{campo}' no estaba protegido",
                "campos_protegidos": campos_manuales
            }
    except HTTPException:
        raise
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


# ==================== ENDPOINTS DE EXPORTACIÓN ====================

from fastapi.responses import StreamingResponse

@router.get("/export")
async def export_ldu_excel(
    region: Optional[str] = None,
    estado: Optional[str] = None,
    solo_activos: bool = True,
    incluir_ausentes: bool = False
):
    """
    Exporta los registros LDU a un archivo Excel para descargar
    
    Args:
        region: Filtrar por región específica
        estado: Filtrar por estado (Activo, Dañado, etc.)
        solo_activos: Solo incluir registros activos
        incluir_ausentes: Incluir registros no presentes en última importación
    """
    try:
        # Construir query
        q = ldu_sync_service.supabase.table('ldu_registros').select('*')
        
        if solo_activos:
            q = q.eq('activo', True)
        
        if region:
            q = q.eq('region', region)
            
        if estado:
            q = q.eq('estado', estado)
            
        if not incluir_ausentes:
            q = q.eq('presente_en_ultima_importacion', True)
        
        result = q.order('imei').execute()
        
        if not result.data:
            raise HTTPException(status_code=404, detail="No hay registros para exportar")
        
        # Convertir a DataFrame
        df = pd.DataFrame(result.data)
        
        # Ordenar y seleccionar columnas relevantes
        columnas_export = [
            'imei', 'modelo', 'account', 'account_int',
            'responsable_dni', 'responsable_nombre', 'responsable_apellido',
            'supervisor', 'zone', 'departamento', 'city', 'region',
            'canal', 'tipo', 'punto_venta', 'nombre_ruta',
            'cobertura_valor', 'campo_reg', 'campo_ok', 'uso',
            'observaciones', 'estado', 'activo',
            'presente_en_ultima_importacion', 'fecha_actualizacion'
        ]
        
        # Solo incluir columnas que existen
        columnas_existentes = [c for c in columnas_export if c in df.columns]
        df = df[columnas_existentes]
        
        # Renombrar columnas para mejor lectura
        rename_map = {
            'imei': 'IMEI',
            'modelo': 'Modelo',
            'account': 'Account',
            'account_int': 'Account_Int',
            'responsable_dni': 'DNI_Responsable',
            'responsable_nombre': 'Nombre',
            'responsable_apellido': 'Apellido',
            'supervisor': 'Supervisor',
            'zone': 'Zona',
            'departamento': 'Departamento',
            'city': 'Ciudad',
            'region': 'Región',
            'canal': 'Canal',
            'tipo': 'Tipo',
            'punto_venta': 'Punto_Venta',
            'nombre_ruta': 'Ruta',
            'cobertura_valor': 'HC_Real',
            'campo_reg': 'REG',
            'campo_ok': 'OK',
            'uso': 'USO',
            'observaciones': 'Observaciones',
            'estado': 'Estado',
            'activo': 'Activo',
            'presente_en_ultima_importacion': 'En_Ultimo_Excel',
            'fecha_actualizacion': 'Fecha_Actualizacion'
        }
        df = df.rename(columns=rename_map)
        
        # Crear Excel en memoria
        output = io.BytesIO()
        with pd.ExcelWriter(output, engine='openpyxl') as writer:
            df.to_excel(writer, sheet_name='LDU_Registros', index=False)
            
            # Ajustar anchos de columna
            worksheet = writer.sheets['LDU_Registros']
            for idx, col in enumerate(df.columns):
                max_length = max(
                    df[col].astype(str).map(len).max() if len(df) > 0 else 0,
                    len(col)
                ) + 2
                worksheet.column_dimensions[chr(65 + idx) if idx < 26 else f"A{chr(65 + idx - 26)}"].width = min(max_length, 50)
        
        output.seek(0)
        
        # Generar nombre de archivo
        fecha = datetime.now().strftime("%Y%m%d_%H%M")
        filename = f"LDU_Export_{fecha}.xlsx"
        
        return StreamingResponse(
            output,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/historial/{imei}")
async def get_historial_completo(imei: str):
    """
    Obtiene el historial completo de cambios de un registro LDU
    Incluye auditoría general, cambios de responsable y conflictos resueltos
    """
    try:
        # Verificar que el IMEI existe
        registro = ldu_sync_service.supabase.table('ldu_registros').select('*').eq('imei', imei).execute()
        
        if not registro.data:
            raise HTTPException(status_code=404, detail=f"IMEI {imei} no encontrado")
        
        # Obtener auditoría general
        auditoria = ldu_sync_service.supabase.table('ldu_auditoria').select('*').eq(
            'imei', imei
        ).order('fecha_hora', desc=True).execute()
        
        # Obtener historial de responsables
        historial_resp = ldu_sync_service.supabase.table('ldu_historial_responsables').select('*').eq(
            'ldu_imei', imei
        ).order('fecha_cambio', desc=True).execute()
        
        # Obtener conflictos (pendientes y resueltos)
        conflictos = ldu_sync_service.supabase.table('ldu_conflictos').select('*').eq(
            'imei', imei
        ).order('fecha_conflicto', desc=True).execute()
        
        # Combinar y ordenar todos los eventos cronológicamente
        eventos = []
        
        for a in auditoria.data:
            eventos.append({
                'tipo': 'cambio',
                'accion': a.get('accion'),
                'fecha': a.get('fecha_hora'),
                'usuario': a.get('usuario_sistema'),
                'archivo': a.get('archivo_origen'),
                'campos_previos': a.get('campos_previos'),
                'campos_nuevos': a.get('campos_nuevos'),
                'comentarios': a.get('comentarios')
            })
        
        for h in historial_resp.data:
            eventos.append({
                'tipo': 'reasignacion',
                'accion': 'cambio_responsable',
                'fecha': h.get('fecha_cambio'),
                'usuario': h.get('usuario_cambio'),
                'responsable_anterior': f"{h.get('responsable_anterior_nombre', '')} (DNI: {h.get('responsable_anterior_dni', '')})",
                'responsable_nuevo': f"{h.get('responsable_nuevo_nombre', '')} (DNI: {h.get('responsable_nuevo_dni', '')})",
                'motivo': h.get('motivo'),
                'comentarios': h.get('comentarios')
            })
        
        for c in conflictos.data:
            eventos.append({
                'tipo': 'conflicto',
                'accion': f"conflicto_{c.get('estado', 'pendiente')}",
                'fecha': c.get('fecha_conflicto'),
                'campo': c.get('campo'),
                'valor_actual': c.get('valor_actual'),
                'valor_excel': c.get('valor_excel'),
                'estado': c.get('estado'),
                'resuelto_por': c.get('resuelto_por'),
                'fecha_resolucion': c.get('fecha_resolucion'),
                'valor_final': c.get('valor_final')
            })
        
        # Ordenar por fecha descendente
        eventos.sort(key=lambda x: x.get('fecha', '') or '', reverse=True)
        
        return {
            "success": True,
            "imei": imei,
            "registro_actual": registro.data[0],
            "historial": eventos,
            "totales": {
                "cambios": len(auditoria.data),
                "reasignaciones": len(historial_resp.data),
                "conflictos": len(conflictos.data)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

"""
Servicio de sincronización LDU con Supabase
Implementa lógica incremental, idempotente con auditoría completa
"""
import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime
import json

from services.supabase_service import supabase_service
from services.excel_drive_service import excel_drive_service
from services.ldu_normalization_service import ldu_normalization_service


class LDUSyncService:
    """Servicio de sincronización de registros LDU"""
    
    def __init__(self):
        self.supabase = supabase_service.client
        
    async def sync_from_excel(
        self, 
        file_id: str, 
        user: str = "system"
    ) -> Dict[str, Any]:
        """
        Ejecuta sincronización completa desde un archivo Excel
        
        Args:
            file_id: ID del archivo en Google Drive
            user: Usuario que ejecuta la operación
            
        Returns:
            Dict con resumen del proceso
        """
        start_time = datetime.now()
        importacion_id = str(uuid.uuid4())
        
        # Crear registro de importación
        importacion = {
            'id': importacion_id,
            'archivo_id': file_id,
            'estado': 'en_proceso',
            'usuario_ejecutor': user,
            'fecha_inicio': start_time.isoformat()
        }
        
        try:
            # Obtener info del archivo
            file_info = excel_drive_service.get_file_info(file_id)
            importacion['archivo_nombre'] = file_info.get('name', 'unknown')
            
            # Insertar registro de importación
            self.supabase.table('ldu_importaciones').insert(importacion).execute()
            
            # Leer Excel
            excel_data = excel_drive_service.read_ldu_excel(file_id)
            
            if not excel_data['data']:
                raise Exception("El archivo Excel está vacío o no tiene datos válidos")
            
            # Normalizar datos
            normalized = ldu_normalization_service.normalize_batch(
                excel_data['data'], 
                file_id
            )
            
            # Registrar errores de validación
            for error in normalized['errors']:
                self._register_import_error(
                    importacion_id=importacion_id,
                    file_id=file_id,
                    row_number=error.get('row_number'),
                    error_type=error.get('error_type'),
                    error_message=error.get('error_message'),
                    raw_row=error.get('raw_row'),
                    imei_attempted=error.get('imei_attempted')
                )
            
            # Sincronizar registros válidos
            sync_result = await self._sync_records(
                records=normalized['valid_records'],
                importacion_id=importacion_id,
                file_id=file_id,
                user=user
            )
            
            # Marcar registros ausentes
            absent_count = await self._mark_absent_records(
                current_imeis=[r['imei'] for r in normalized['valid_records']],
                importacion_id=importacion_id,
                user=user
            )
            
            # Calcular duración
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())
            
            # Preparar resumen
            resumen = {
                'total_filas': excel_data['total_rows'],
                'insertados': sync_result['inserted'],
                'actualizados': sync_result['updated'],
                'sin_cambios': sync_result['unchanged'],
                'invalidos': len(normalized['errors']),
                'marcados_ausentes': absent_count,
                'errores': normalized['errors'][:10],  # Solo primeros 10
                'archivo_id': file_id,
                'archivo_nombre': file_info.get('name'),
                'fecha_ingestion': start_time.isoformat(),
                'duracion_segundos': duration,
                'columnas_encontradas': excel_data['columns'],
                'columnas_faltantes': excel_data['missing_columns']
            }
            
            # Actualizar registro de importación
            self.supabase.table('ldu_importaciones').update({
                'estado': 'completado',
                'total_filas': excel_data['total_rows'],
                'insertados': sync_result['inserted'],
                'actualizados': sync_result['updated'],
                'sin_cambios': sync_result['unchanged'],
                'invalidos': len(normalized['errors']),
                'marcados_ausentes': absent_count,
                'fecha_fin': end_time.isoformat(),
                'duracion_segundos': duration,
                'resumen': resumen
            }).eq('id', importacion_id).execute()
            
            return resumen
            
        except Exception as e:
            # Registrar error en importación
            self.supabase.table('ldu_importaciones').update({
                'estado': 'error',
                'mensaje_error': str(e),
                'fecha_fin': datetime.now().isoformat()
            }).eq('id', importacion_id).execute()
            
            raise
    
    async def sync_from_dataframe(
        self,
        df,  # pandas DataFrame
        source_name: str = "local_upload",
        user: str = "system"
    ) -> Dict[str, Any]:
        """
        Ejecuta sincronización desde un DataFrame de pandas (archivo local)
        
        Args:
            df: DataFrame con los datos del Excel
            source_name: Nombre del archivo origen
            user: Usuario que ejecuta la operación
            
        Returns:
            Dict con resumen del proceso
        """
        start_time = datetime.now()
        importacion_id = str(uuid.uuid4())
        
        # Crear registro de importación
        importacion = {
            'id': importacion_id,
            'archivo_id': f'local_{source_name}',
            'archivo_nombre': source_name,
            'estado': 'en_proceso',
            'usuario_ejecutor': user,
            'fecha_inicio': start_time.isoformat()
        }
        
        try:
            # Insertar registro de importación
            self.supabase.table('ldu_importaciones').insert(importacion).execute()
            
            # Convertir DataFrame a lista de diccionarios
            data = df.fillna('').to_dict('records')
            
            if not data:
                raise Exception("El archivo está vacío o no tiene datos válidos")
            
            # Normalizar datos
            normalized = ldu_normalization_service.normalize_batch(
                data, 
                f'local_{source_name}'
            )
            
            # Registrar errores de validación
            for error in normalized['errors']:
                self._register_import_error(
                    importacion_id=importacion_id,
                    file_id=f'local_{source_name}',
                    row_number=error.get('row_number'),
                    error_type=error.get('error_type'),
                    error_message=error.get('error_message'),
                    raw_row=error.get('raw_row'),
                    imei_attempted=error.get('imei_attempted')
                )
            
            # Sincronizar registros válidos
            sync_result = await self._sync_records(
                records=normalized['valid_records'],
                importacion_id=importacion_id,
                file_id=f'local_{source_name}',
                user=user
            )
            
            # Marcar registros ausentes
            absent_count = await self._mark_absent_records(
                current_imeis=[r['imei'] for r in normalized['valid_records']],
                importacion_id=importacion_id,
                user=user
            )
            
            # Calcular duración
            end_time = datetime.now()
            duration = int((end_time - start_time).total_seconds())
            
            # Preparar resumen
            resumen = {
                'total_filas': len(data),
                'insertados': sync_result['inserted'],
                'actualizados': sync_result['updated'],
                'sin_cambios': sync_result['unchanged'],
                'invalidos': len(normalized['errors']),
                'marcados_ausentes': absent_count,
                'errores': normalized['errors'][:10],
                'archivo_nombre': source_name,
                'fecha_ingestion': start_time.isoformat(),
                'duracion_segundos': duration
            }
            
            # Actualizar registro de importación
            self.supabase.table('ldu_importaciones').update({
                'estado': 'completado',
                'total_filas': len(data),
                'insertados': sync_result['inserted'],
                'actualizados': sync_result['updated'],
                'sin_cambios': sync_result['unchanged'],
                'invalidos': len(normalized['errors']),
                'marcados_ausentes': absent_count,
                'fecha_fin': end_time.isoformat(),
                'duracion_segundos': duration,
                'resumen': resumen
            }).eq('id', importacion_id).execute()
            
            return resumen
            
        except Exception as e:
            # Registrar error en importación
            self.supabase.table('ldu_importaciones').update({
                'estado': 'error',
                'mensaje_error': str(e),
                'fecha_fin': datetime.now().isoformat()
            }).eq('id', importacion_id).execute()
            
            raise
    
    async def _sync_records(
        self,
        records: List[Dict[str, Any]],
        importacion_id: str,
        file_id: str,
        user: str
    ) -> Dict[str, int]:
        """
        Sincroniza registros con la base de datos (insert/update)
        
        Args:
            records: Lista de registros normalizados
            importacion_id: ID de la importación actual
            file_id: ID del archivo origen
            user: Usuario ejecutor
            
        Returns:
            Dict con contadores de operaciones
        """
        inserted = 0
        updated = 0
        unchanged = 0
        
        for record_data in records:
            record = record_data['record']
            imei = record_data['imei']
            warnings = record_data.get('warnings', [])
            
            try:
                # Buscar registro existente
                existing = self.supabase.table('ldu_registros').select('*').eq('imei', imei).execute()
                
                if existing.data:
                    # UPDATE - verificar si hay cambios
                    existing_record = existing.data[0]
                    
                    # Comparar campos relevantes
                    has_changes = self._has_changes(existing_record, record)
                    
                    if has_changes:
                        # Guardar estado anterior
                        campos_previos = {
                            k: existing_record.get(k) 
                            for k in record.keys() 
                            if k in existing_record
                        }
                        
                        # Verificar cambio de responsable
                        if existing_record.get('responsable_dni') != record.get('responsable_dni'):
                            await self._register_responsable_change(
                                imei=imei,
                                anterior_dni=existing_record.get('responsable_dni'),
                                anterior_nombre=f"{existing_record.get('responsable_nombre', '')} {existing_record.get('responsable_apellido', '')}".strip(),
                                nuevo_dni=record.get('responsable_dni'),
                                nuevo_nombre=f"{record.get('responsable_nombre', '')} {record.get('responsable_apellido', '')}".strip(),
                                motivo='importacion',
                                user=user,
                                importacion_id=importacion_id
                            )
                        
                        # Actualizar registro
                        record['presente_en_ultima_importacion'] = True
                        record['fecha_ultima_verificacion'] = datetime.now().isoformat()
                        
                        self.supabase.table('ldu_registros').update(record).eq('imei', imei).execute()
                        
                        # Registrar auditoría
                        self._register_audit(
                            imei=imei,
                            accion='update',
                            user=user,
                            archivo_origen=file_id,
                            fila_numero=record.get('fila_origen'),
                            campos_previos=campos_previos,
                            campos_nuevos=record,
                            raw_row=record.get('raw_row'),
                            importacion_id=importacion_id
                        )
                        
                        updated += 1
                    else:
                        # Sin cambios, solo actualizar marca de presencia
                        self.supabase.table('ldu_registros').update({
                            'presente_en_ultima_importacion': True,
                            'fecha_ultima_verificacion': datetime.now().isoformat()
                        }).eq('imei', imei).execute()
                        
                        unchanged += 1
                else:
                    # INSERT
                    record['presente_en_ultima_importacion'] = True
                    record['fecha_ultima_verificacion'] = datetime.now().isoformat()
                    record['fecha_registro'] = datetime.now().isoformat()
                    
                    self.supabase.table('ldu_registros').insert(record).execute()
                    
                    # Registrar auditoría
                    self._register_audit(
                        imei=imei,
                        accion='create',
                        user=user,
                        archivo_origen=file_id,
                        fila_numero=record.get('fila_origen'),
                        campos_previos=None,
                        campos_nuevos=record,
                        raw_row=record.get('raw_row'),
                        importacion_id=importacion_id
                    )
                    
                    # Si tiene responsable, registrar en catálogo
                    if record.get('responsable_dni'):
                        self._ensure_responsable_exists(
                            dni=record['responsable_dni'],
                            nombre=record.get('responsable_nombre'),
                            apellido=record.get('responsable_apellido'),
                            region=record.get('region')
                        )
                    
                    inserted += 1
                    
            except Exception as e:
                # Registrar error pero continuar
                self._register_import_error(
                    importacion_id=importacion_id,
                    file_id=file_id,
                    row_number=record.get('fila_origen'),
                    error_type='sync_error',
                    error_message=str(e),
                    raw_row=record.get('raw_row'),
                    imei_attempted=imei
                )
        
        return {
            'inserted': inserted,
            'updated': updated,
            'unchanged': unchanged
        }
    
    def _has_changes(self, existing: Dict, new: Dict) -> bool:
        """Compara si hay cambios significativos entre registros"""
        compare_fields = [
            'modelo', 'region', 'punto_venta', 'nombre_ruta', 'cobertura_valor',
            'canal', 'tipo', 'campo_reg', 'campo_ok', 'uso', 'observaciones',
            'estado', 'responsable_dni', 'responsable_nombre', 'responsable_apellido'
        ]
        
        for field in compare_fields:
            old_val = existing.get(field)
            new_val = new.get(field)
            
            # Normalizar None y strings vacíos
            if old_val is None:
                old_val = ''
            if new_val is None:
                new_val = ''
            
            if str(old_val).strip() != str(new_val).strip():
                return True
        
        return False
    
    async def _mark_absent_records(
        self,
        current_imeis: List[str],
        importacion_id: str,
        user: str
    ) -> int:
        """
        Marca como ausentes los registros que no están en el Excel actual
        
        Args:
            current_imeis: Lista de IMEIs presentes en el Excel actual
            importacion_id: ID de la importación
            user: Usuario ejecutor
            
        Returns:
            Cantidad de registros marcados como ausentes
        """
        if not current_imeis:
            return 0
        
        try:
            # Obtener todos los IMEIs que estaban presentes pero ya no están
            all_present = self.supabase.table('ldu_registros').select('imei').eq(
                'presente_en_ultima_importacion', True
            ).execute()
            
            present_imeis = {r['imei'] for r in all_present.data}
            current_set = set(current_imeis)
            
            # IMEIs que ya no están en el Excel
            absent_imeis = present_imeis - current_set
            
            count = 0
            for imei in absent_imeis:
                # Marcar como ausente
                self.supabase.table('ldu_registros').update({
                    'presente_en_ultima_importacion': False,
                    'fecha_ultima_verificacion': datetime.now().isoformat()
                }).eq('imei', imei).execute()
                
                # Registrar auditoría
                self._register_audit(
                    imei=imei,
                    accion='no_en_excel',
                    user=user,
                    archivo_origen=None,
                    fila_numero=None,
                    campos_previos={'presente_en_ultima_importacion': True},
                    campos_nuevos={'presente_en_ultima_importacion': False},
                    raw_row=None,
                    importacion_id=importacion_id,
                    comentarios='Registro no presente en última importación de Excel'
                )
                
                count += 1
            
            return count
            
        except Exception as e:
            print(f"Error marcando registros ausentes: {e}")
            return 0
    
    async def _register_responsable_change(
        self,
        imei: str,
        anterior_dni: Optional[str],
        anterior_nombre: str,
        nuevo_dni: Optional[str],
        nuevo_nombre: str,
        motivo: str,
        user: str,
        importacion_id: Optional[str] = None,
        comentarios: Optional[str] = None
    ):
        """Registra cambio de responsable en historial"""
        try:
            self.supabase.table('ldu_historial_responsables').insert({
                'ldu_imei': imei,
                'responsable_anterior_dni': anterior_dni,
                'responsable_anterior_nombre': anterior_nombre,
                'responsable_nuevo_dni': nuevo_dni,
                'responsable_nuevo_nombre': nuevo_nombre,
                'motivo': motivo,
                'comentarios': comentarios,
                'usuario_cambio': user,
                'importacion_id': importacion_id
            }).execute()
        except Exception as e:
            print(f"Error registrando cambio de responsable: {e}")
    
    def _register_audit(
        self,
        imei: str,
        accion: str,
        user: str,
        archivo_origen: Optional[str],
        fila_numero: Optional[int],
        campos_previos: Optional[Dict],
        campos_nuevos: Optional[Dict],
        raw_row: Optional[Dict],
        importacion_id: Optional[str] = None,
        comentarios: Optional[str] = None
    ):
        """Registra evento de auditoría"""
        try:
            # Limpiar raw_row para JSON
            if raw_row:
                raw_row = self._clean_for_json(raw_row)
            if campos_previos:
                campos_previos = self._clean_for_json(campos_previos)
            if campos_nuevos:
                campos_nuevos = self._clean_for_json(campos_nuevos)
            
            self.supabase.table('ldu_auditoria').insert({
                'imei': imei,
                'accion': accion,
                'usuario_sistema': user,
                'archivo_origen': archivo_origen,
                'fila_numero': fila_numero,
                'campos_previos': campos_previos,
                'campos_nuevos': campos_nuevos,
                'raw_row': raw_row,
                'modulo_origen': 'importacion',
                'importacion_id': importacion_id,
                'comentarios': comentarios,
                'operacion_id': str(uuid.uuid4())
            }).execute()
        except Exception as e:
            print(f"Error registrando auditoría: {e}")
    
    def _register_import_error(
        self,
        importacion_id: str,
        file_id: str,
        row_number: Optional[int],
        error_type: str,
        error_message: str,
        raw_row: Optional[Dict],
        imei_attempted: Optional[str]
    ):
        """Registra error de importación"""
        try:
            if raw_row:
                raw_row = self._clean_for_json(raw_row)
            
            self.supabase.table('ldu_import_errors').insert({
                'importacion_id': importacion_id,
                'archivo_id': file_id,
                'fila_numero': row_number,
                'tipo_error': error_type,
                'mensaje_error': error_message,
                'raw_row': raw_row,
                'imei_intentado': imei_attempted
            }).execute()
        except Exception as e:
            print(f"Error registrando error de importación: {e}")
    
    def _ensure_responsable_exists(
        self,
        dni: str,
        nombre: Optional[str],
        apellido: Optional[str],
        region: Optional[str]
    ):
        """Asegura que el responsable exista en el catálogo"""
        try:
            existing = self.supabase.table('ldu_responsables').select('dni').eq('dni', dni).execute()
            
            if not existing.data:
                nombre_completo = f"{nombre or ''} {apellido or ''}".strip()
                
                self.supabase.table('ldu_responsables').insert({
                    'dni': dni,
                    'nombre': nombre,
                    'apellido': apellido,
                    'nombre_completo': nombre_completo,
                    'region': region,
                    'estado': 'activo'
                }).execute()
        except Exception as e:
            print(f"Error asegurando responsable: {e}")
    
    def _clean_for_json(self, data: Dict) -> Dict:
        """Limpia un diccionario para ser serializable a JSON"""
        cleaned = {}
        for key, value in data.items():
            if value is None:
                cleaned[key] = None
            elif isinstance(value, (datetime,)):
                cleaned[key] = value.isoformat()
            elif isinstance(value, (int, float, str, bool)):
                cleaned[key] = value
            elif isinstance(value, dict):
                cleaned[key] = self._clean_for_json(value)
            elif isinstance(value, list):
                cleaned[key] = [self._clean_for_json(v) if isinstance(v, dict) else str(v) for v in value]
            else:
                cleaned[key] = str(value)
        return cleaned
    
    # ==================== CONSULTAS ====================
    
    def search_ldu(
        self,
        query: Optional[str] = None,
        imei: Optional[str] = None,
        dni: Optional[str] = None,
        region: Optional[str] = None,
        punto_venta: Optional[str] = None,
        estado: Optional[str] = None,
        responsable: Optional[str] = None,
        page: int = 1,
        limit: int = 50
    ) -> Dict[str, Any]:
        """
        Búsqueda avanzada de registros LDU
        
        Args:
            Múltiples filtros opcionales
            
        Returns:
            Dict con registros y metadata de paginación
        """
        try:
            q = self.supabase.table('ldu_registros').select('*', count='exact')
            
            # Aplicar filtros
            if imei:
                q = q.ilike('imei', f'%{imei}%')
            
            if dni:
                q = q.eq('responsable_dni', dni)
            
            if region:
                q = q.ilike('region', f'%{region}%')
            
            if punto_venta:
                q = q.ilike('punto_venta', f'%{punto_venta}%')
            
            if estado:
                q = q.eq('estado', estado)
            
            if responsable:
                q = q.or_(
                    f"responsable_nombre.ilike.%{responsable}%,"
                    f"responsable_apellido.ilike.%{responsable}%"
                )
            
            if query:
                # Búsqueda general
                q = q.or_(
                    f"imei.ilike.%{query}%,"
                    f"modelo.ilike.%{query}%,"
                    f"responsable_nombre.ilike.%{query}%,"
                    f"responsable_dni.ilike.%{query}%,"
                    f"punto_venta.ilike.%{query}%"
                )
            
            # Solo activos
            q = q.eq('activo', True)
            
            # Paginación
            offset = (page - 1) * limit
            q = q.range(offset, offset + limit - 1)
            
            # Ordenar
            q = q.order('fecha_actualizacion', desc=True)
            
            result = q.execute()
            
            total = result.count if result.count else 0
            
            return {
                'data': result.data,
                'total': total,
                'page': page,
                'limit': limit,
                'pages': (total + limit - 1) // limit
            }
            
        except Exception as e:
            print(f"Error en búsqueda LDU: {e}")
            raise
    
    def get_ldu_by_imei(self, imei: str) -> Optional[Dict[str, Any]]:
        """Obtiene un LDU por su IMEI"""
        try:
            result = self.supabase.table('ldu_registros').select('*').eq('imei', imei).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"Error obteniendo LDU: {e}")
            return None
    
    def get_ldu_by_responsable(self, dni: str) -> List[Dict[str, Any]]:
        """Obtiene todos los LDU de un responsable"""
        try:
            result = self.supabase.table('ldu_registros').select('*').eq(
                'responsable_dni', dni
            ).eq('activo', True).execute()
            return result.data
        except Exception as e:
            print(f"Error obteniendo LDU por responsable: {e}")
            return []
    
    def get_stats(self) -> Dict[str, Any]:
        """Obtiene estadísticas generales de LDU"""
        try:
            # Total registros
            total = self.supabase.table('ldu_registros').select('id', count='exact').eq('activo', True).execute()
            
            # Por estado
            estados = self.supabase.rpc('ldu_stats_por_estado').execute() if hasattr(self.supabase, 'rpc') else None
            
            # Sin responsable
            sin_resp = self.supabase.table('ldu_registros').select('id', count='exact').eq(
                'activo', True
            ).is_('responsable_dni', 'null').execute()
            
            # Ausentes del último Excel
            ausentes = self.supabase.table('ldu_registros').select('id', count='exact').eq(
                'activo', True
            ).eq('presente_en_ultima_importacion', False).execute()
            
            return {
                'total': total.count or 0,
                'sin_responsable': sin_resp.count or 0,
                'ausentes_ultimo_excel': ausentes.count or 0
            }
            
        except Exception as e:
            print(f"Error obteniendo stats: {e}")
            return {}
    
    # ==================== REASIGNACIÓN ====================
    
    async def reasignar_ldu(
        self,
        imei: str,
        nuevo_dni: str,
        nuevo_nombre: str,
        nuevo_apellido: str,
        motivo: str,
        comentarios: Optional[str],
        user: str
    ) -> Dict[str, Any]:
        """
        Reasigna un LDU a un nuevo responsable
        
        Args:
            imei: IMEI del dispositivo
            nuevo_dni: DNI del nuevo responsable
            nuevo_nombre: Nombre del nuevo responsable
            nuevo_apellido: Apellido del nuevo responsable
            motivo: Motivo de la reasignación
            comentarios: Comentarios adicionales
            user: Usuario que realiza la operación
            
        Returns:
            Dict con resultado de la operación
        """
        try:
            # Obtener registro actual
            current = self.get_ldu_by_imei(imei)
            if not current:
                raise Exception(f"No se encontró LDU con IMEI {imei}")
            
            # Guardar datos anteriores
            anterior_dni = current.get('responsable_dni')
            anterior_nombre = f"{current.get('responsable_nombre', '')} {current.get('responsable_apellido', '')}".strip()
            
            # Actualizar registro
            nuevo_nombre_completo = f"{nuevo_nombre} {nuevo_apellido}".strip()
            
            self.supabase.table('ldu_registros').update({
                'responsable_dni': nuevo_dni,
                'responsable_nombre': nuevo_nombre,
                'responsable_apellido': nuevo_apellido
            }).eq('imei', imei).execute()
            
            # Registrar cambio de responsable
            await self._register_responsable_change(
                imei=imei,
                anterior_dni=anterior_dni,
                anterior_nombre=anterior_nombre,
                nuevo_dni=nuevo_dni,
                nuevo_nombre=nuevo_nombre_completo,
                motivo=motivo,
                user=user,
                comentarios=comentarios
            )
            
            # Registrar auditoría
            self._register_audit(
                imei=imei,
                accion='reasignacion',
                user=user,
                archivo_origen=None,
                fila_numero=None,
                campos_previos={
                    'responsable_dni': anterior_dni,
                    'responsable_nombre': current.get('responsable_nombre'),
                    'responsable_apellido': current.get('responsable_apellido')
                },
                campos_nuevos={
                    'responsable_dni': nuevo_dni,
                    'responsable_nombre': nuevo_nombre,
                    'responsable_apellido': nuevo_apellido
                },
                raw_row=None,
                comentarios=f"Motivo: {motivo}. {comentarios or ''}"
            )
            
            # Asegurar que nuevo responsable existe
            self._ensure_responsable_exists(
                dni=nuevo_dni,
                nombre=nuevo_nombre,
                apellido=nuevo_apellido,
                region=current.get('region')
            )
            
            return {
                'success': True,
                'imei': imei,
                'anterior': {
                    'dni': anterior_dni,
                    'nombre': anterior_nombre
                },
                'nuevo': {
                    'dni': nuevo_dni,
                    'nombre': nuevo_nombre_completo
                }
            }
            
        except Exception as e:
            print(f"Error en reasignación: {e}")
            raise
    
    async def reasignar_masivo(
        self,
        dni_anterior: str,
        nuevo_dni: str,
        nuevo_nombre: str,
        nuevo_apellido: str,
        motivo: str,
        comentarios: Optional[str],
        user: str
    ) -> Dict[str, Any]:
        """
        Reasigna todos los LDU de un responsable a otro
        
        Args:
            dni_anterior: DNI del responsable actual
            nuevo_dni: DNI del nuevo responsable
            ...
            
        Returns:
            Dict con resultado de la operación
        """
        try:
            # Obtener todos los LDU del responsable
            ldus = self.get_ldu_by_responsable(dni_anterior)
            
            if not ldus:
                return {
                    'success': True,
                    'reasignados': 0,
                    'message': 'No se encontraron LDU para este responsable'
                }
            
            count = 0
            for ldu in ldus:
                await self.reasignar_ldu(
                    imei=ldu['imei'],
                    nuevo_dni=nuevo_dni,
                    nuevo_nombre=nuevo_nombre,
                    nuevo_apellido=nuevo_apellido,
                    motivo=motivo,
                    comentarios=comentarios,
                    user=user
                )
                count += 1
            
            return {
                'success': True,
                'reasignados': count,
                'dni_anterior': dni_anterior,
                'dni_nuevo': nuevo_dni
            }
            
        except Exception as e:
            print(f"Error en reasignación masiva: {e}")
            raise


# Instancia singleton
ldu_sync_service = LDUSyncService()

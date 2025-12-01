"""
Servicio de normalización y validación para registros LDU
Implementa todas las reglas de transformación y validación del Excel
"""
import re
import time
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime


class LDUNormalizationService:
    """Servicio de normalización de datos LDU"""
    
    # Patrones para detectar estado desde Observation
    ESTADO_PATTERNS = {
        'Activo': [
            r'PUNTO\s*DE\s*VENTA',
            r'PROMOTORIA',
            r'RED\s*DE\s*TRABAJO',
            r'PDV',
            r'ACTIVO',
            r'EN\s*USO',
            r'OPERATIVO'
        ],
        'Dañado': [
            r'DA[ÑN]ADO',
            r'DA[ÑN]O',
            r'ROTO',
            r'AVERIADO',
            r'MALOGRADO'
        ],
        'En reparación': [
            r'REPARACION',
            r'REPARACIÓN',
            r'EN\s*REPARACION',
            r'SERVICIO\s*TECNICO',
            r'GARANTIA'
        ],
        'Pendiente devolución': [
            r'PENDIENTE\s*DEVOLUCION',
            r'PENDIENTE\s*DEVOLUCIÓN',
            r'POR\s*DEVOLVER',
            r'DEVOLVER'
        ],
        'Devuelto': [
            r'DEVUELTO',
            r'DEVOLUCIÓN\s*COMPLETA',
            r'ENTREGADO',
            r'RETORNADO'
        ],
        'Baja': [
            r'BAJA',
            r'DADO\s*DE\s*BAJA',
            r'DESCARTE'
        ],
        'Perdido': [
            r'PERDIDO',
            r'EXTRAVIADO',
            r'ROBADO',
            r'HURTO'
        ]
    }
    
    def _is_empty_row(self, row: Dict[str, Any]) -> bool:
        """
        Verifica si una fila está completamente vacía (sin datos útiles)
        
        Args:
            row: Diccionario con los datos de la fila
            
        Returns:
            True si la fila no tiene datos útiles, False si tiene al menos un dato
        """
        # Campos relevantes a verificar (excluir campos internos)
        relevant_fields = [
            'Account', 'Account_int', 'Supervisor', 'Zone', 'Departamento', 'City',
            'Canal', 'Tipo', 'POS_vv', 'Name_Ruta', 'HC_Real',
            'DNI', 'First_Name', 'Last_Name', 'MODEL', 'OBSERVATION',
            'REG', 'OK', 'USO'
        ]
        
        for field in relevant_fields:
            value = row.get(field)
            if value is not None:
                value_str = str(value).strip().lower()
                if value_str and value_str not in ['nan', 'none', 'null', '', 'na', 'n/a', '-']:
                    return False  # Tiene al menos un dato
        
        return True  # Fila vacía
    
    def validate_imei(self, imei: Any, row_number: int = 0, row_data: Dict[str, Any] = None) -> Tuple[bool, str, Optional[str]]:
        """
        Valida un IMEI según las reglas establecidas
        Genera identificador único SIN_IMEI_xxx cuando no hay IMEI válido
        
        Args:
            imei: Valor del IMEI a validar
            row_number: Número de fila para generar ID único si no hay IMEI
            row_data: Datos de la fila para generar ID consistente
            
        Returns:
            Tuple (es_valido, imei_normalizado, mensaje_advertencia o None)
        """
        # Caso 1: IMEI None
        if imei is None:
            # Generar identificador basado en datos de la fila (consistente entre importaciones)
            unique_id = self._generate_sin_imei_id(row_number, row_data)
            return True, unique_id, "sin_imei"
        
        # Convertir a string y limpiar
        imei_str = str(imei).strip()
        
        # Caso 2: String vacío o valores nulos conocidos
        if not imei_str or imei_str.lower() in ['nan', 'none', 'null', '', 'na', 'n/a', '-']:
            unique_id = self._generate_sin_imei_id(row_number, row_data)
            return True, unique_id, "sin_imei"
        
        # Remover caracteres no numéricos
        imei_clean = re.sub(r'[^\d]', '', imei_str)
        
        # Caso 3: Sin dígitos después de limpiar (ej: "---" o "abc")
        if not imei_clean:
            unique_id = self._generate_sin_imei_id(row_number, row_data)
            return True, unique_id, "sin_imei"
        
        # Caso 4: IMEI corto (1-13 dígitos) - PERMITIR tal cual
        if len(imei_clean) < 14:
            return True, imei_clean, f"IMEI incompleto: {len(imei_clean)} dígitos"
        
        # Caso 5: IMEI válido (14-16 dígitos)
        if len(imei_clean) >= 14 and len(imei_clean) <= 16:
            return True, imei_clean, None
        
        # Caso 6: IMEI muy largo - tomar los primeros 15 dígitos
        if len(imei_clean) > 16:
            imei_truncated = imei_clean[:15]
            return True, imei_truncated, f"IMEI truncado de {len(imei_clean)} a 15 dígitos"
        
        # Caso por defecto - aceptar como está
        return True, imei_clean, None
    
    def _generate_sin_imei_id(self, row_number: int, row_data: Dict[str, Any] = None) -> str:
        """
        Genera un ID consistente para registros sin IMEI
        Usa datos de la fila para que sea igual entre importaciones del mismo archivo
        
        Args:
            row_number: Número de fila
            row_data: Datos de la fila
            
        Returns:
            ID único pero consistente como SIN_IMEI_xxx
        """
        if row_data:
            # Usar campos que identifican la fila de forma única
            name_ruta = str(row_data.get('Name_Ruta', '')).strip()[:20]
            dni = str(row_data.get('DNI', '')).strip()
            account = str(row_data.get('Account', '')).strip()[:10]
            
            # Limpiar caracteres especiales
            name_ruta = re.sub(r'[^a-zA-Z0-9]', '', name_ruta)
            dni = re.sub(r'[^0-9]', '', dni)
            account = re.sub(r'[^a-zA-Z0-9]', '', account)
            
            # Crear ID basado en estos campos + número de fila
            if dni:
                return f"SINIMEI_{dni}_{row_number}"
            elif name_ruta:
                return f"SINIMEI_{account}_{name_ruta}_{row_number}"
            else:
                return f"SINIMEI_{account}_{row_number}"
        
        # Fallback si no hay datos
        return f"SINIMEI_ROW_{row_number}"
    
    def normalize_dni(self, dni: Any) -> Optional[str]:
        """
        Normaliza un DNI: solo dígitos
        
        Args:
            dni: Valor del DNI
            
        Returns:
            DNI normalizado o None
        """
        if dni is None:
            return None
        
        dni_str = str(dni).strip()
        dni_clean = re.sub(r'[^\d]', '', dni_str)
        
        return dni_clean if dni_clean else None
    
    def normalize_name(self, name: Any) -> Optional[str]:
        """
        Normaliza un nombre: Title Case, trim
        
        Args:
            name: Valor del nombre
            
        Returns:
            Nombre normalizado o None
        """
        if name is None:
            return None
        
        name_str = str(name).strip()
        
        if not name_str:
            return None
        
        # Convertir a Title Case
        return name_str.title()
    
    def normalize_model(self, model: Any) -> Optional[str]:
        """
        Normaliza el modelo del dispositivo
        
        Args:
            model: Valor del modelo
            
        Returns:
            Modelo normalizado o None
        """
        if model is None:
            return None
        
        model_str = str(model).strip().upper()
        
        # Limpiar caracteres extraños pero mantener alfanuméricos y algunos especiales
        model_clean = re.sub(r'[^\w\s\-\+\/]', '', model_str)
        
        # Normalizar espacios
        model_clean = re.sub(r'\s+', ' ', model_clean).strip()
        
        return model_clean if model_clean else None
    
    def normalize_decimal(self, value: Any) -> Optional[float]:
        """
        Normaliza un valor a decimal
        
        Args:
            value: Valor a convertir
            
        Returns:
            Float o None
        """
        if value is None:
            return None
        
        try:
            # Si ya es número
            if isinstance(value, (int, float)):
                return float(value)
            
            # Convertir string
            value_str = str(value).strip()
            # Reemplazar coma por punto
            value_str = value_str.replace(',', '.')
            # Remover todo excepto dígitos y punto
            value_str = re.sub(r'[^\d.]', '', value_str)
            
            return float(value_str) if value_str else None
            
        except (ValueError, TypeError):
            return None
    
    def normalize_text(self, text: Any) -> Optional[str]:
        """
        Normaliza texto general: trim, preservar contenido
        
        Args:
            text: Texto a normalizar
            
        Returns:
            Texto normalizado o None
        """
        if text is None:
            return None
        
        text_str = str(text).strip()
        
        # Normalizar espacios múltiples
        text_str = re.sub(r'\s+', ' ', text_str)
        
        return text_str if text_str else None
    
    def deduce_estado(self, observation: Any) -> str:
        """
        Deduce el estado del LDU basándose en la columna OBSERVATION
        
        Args:
            observation: Valor de la columna OBSERVATION
            
        Returns:
            Estado deducido o cadena vacía si no se puede determinar
        """
        if observation is None:
            return ''
        
        obs_upper = str(observation).upper().strip()
        
        if not obs_upper:
            return ''
        
        # Buscar patrones en orden de prioridad
        for estado, patterns in self.ESTADO_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, obs_upper):
                    return estado
        
        # No se encontró coincidencia
        return ''
    
    def normalize_row(self, row: Dict[str, Any]) -> Dict[str, Any]:
        """
        Normaliza una fila completa del Excel según el mapeo establecido
        TODOS los registros se importan, incluso sin IMEI
        
        Args:
            row: Diccionario con los datos de una fila
            
        Returns:
            Dict con los datos normalizados para insertar en Supabase
            Retorna None si la fila debe saltarse (vacía)
        """
        # Verificar si es una fila completamente vacía PRIMERO
        if self._is_empty_row(row):
            return None  # Fila completamente vacía
        
        # Obtener número de fila para generar ID único si es necesario
        row_number = row.get('_row_number', 0)
        
        # Validar/normalizar IMEI (pasando datos de la fila para ID consistente)
        imei_valid, imei_normalized, imei_warning = self.validate_imei(
            row.get('IMEI'), 
            row_number,
            row  # Pasar datos de la fila para generar ID consistente
        )
        
        # Normalizar responsable
        dni = self.normalize_dni(row.get('DNI'))
        nombre = self.normalize_name(row.get('First_Name'))
        apellido = self.normalize_name(row.get('Last_Name'))
        
        # Determinar punto de venta
        punto_venta = self.normalize_text(row.get('POS_vv'))
        nombre_ruta = self.normalize_text(row.get('Name_Ruta'))
        
        # Si no hay punto de venta pero sí nombre de ruta, usar como punto de venta
        if not punto_venta and nombre_ruta:
            punto_venta = nombre_ruta
        
        # Deducir estado desde observation
        observation = self.normalize_text(row.get('OBSERVATION'))
        estado = self.deduce_estado(observation)
        
        # Construir registro normalizado
        normalized = {
            '_valid': True,
            'imei': imei_normalized,
            'modelo': self.normalize_model(row.get('MODEL')),
            
            # Campos de cuenta y ubicación
            'account': self.normalize_text(row.get('Account')),
            'account_int': self.normalize_text(row.get('Account_int')),
            'supervisor': self.normalize_name(row.get('Supervisor')),
            'zone': self.normalize_text(row.get('Zone')),
            'departamento': self.normalize_text(row.get('Departamento')),
            'city': self.normalize_text(row.get('City')),
            
            # Ubicación (mantener region para compatibilidad)
            'region': self.normalize_text(row.get('City')),
            'punto_venta': punto_venta,
            'nombre_ruta': nombre_ruta,
            'cobertura_valor': self.normalize_decimal(row.get('HC_Real')),
            
            # Clasificación
            'canal': self.normalize_text(row.get('Canal')),
            'tipo': self.normalize_text(row.get('Tipo')),
            
            # Campos originales
            'campo_reg': self.normalize_text(row.get('REG')),
            'campo_ok': self.normalize_text(row.get('OK')),
            'uso': self.normalize_text(row.get('USO')),
            'observaciones': observation,
            
            # Estado deducido
            'estado': estado,
            
            # Responsable
            'responsable_dni': dni,
            'responsable_nombre': nombre,
            'responsable_apellido': apellido,
            
            # Trazabilidad
            'raw_row': row.get('_raw_row', row),
            'fila_origen': row.get('_row_number'),
            
            # Notas internas si hay problemas menores
            '_warnings': [],
            '_imei_warning': imei_warning  # Puede ser None o un mensaje de advertencia
        }
        
        # Agregar advertencia de IMEI si existe
        if imei_warning:
            normalized['_warnings'].append(imei_warning)
        
        # Agregar advertencias
        if not dni:
            normalized['_warnings'].append('DNI vacío')
        
        if not estado:
            normalized['_warnings'].append('Estado no determinado - requiere revisión manual')
        
        return normalized
    
    def normalize_batch(self, rows: List[Dict[str, Any]], file_id: str) -> Dict[str, Any]:
        """
        Normaliza un lote de filas
        Las filas completamente vacías se saltan
        
        Args:
            rows: Lista de diccionarios con las filas
            file_id: ID del archivo de origen
            
        Returns:
            Dict con registros válidos y estadísticas
        """
        valid_records = []
        warnings_count = 0
        skipped_count = 0
        sin_imei_count = 0
        
        for row in rows:
            normalized = self.normalize_row(row)
            
            # Si es None, es una fila vacía - saltar
            if normalized is None:
                skipped_count += 1
                continue
            
            # Procesar registros válidos
            if normalized.get('_valid'):
                # Agregar referencia al archivo
                normalized['archivo_origen_id'] = file_id
                normalized['raw_excel_reference'] = f"{file_id}:row_{normalized.get('fila_origen', 'unknown')}"
                
                # Contar advertencias y registros sin IMEI
                warnings = normalized.get('_warnings', [])
                if warnings:
                    warnings_count += len(warnings)
                
                # Contar si es un registro sin IMEI original
                imei_warning = normalized.get('_imei_warning')
                if imei_warning == 'sin_imei':
                    sin_imei_count += 1
                
                # Remover campos internos antes de insertar
                clean_record = {k: v for k, v in normalized.items() 
                               if not k.startswith('_')}
                
                valid_records.append({
                    'record': clean_record,
                    'warnings': warnings,
                    'imei': normalized['imei']
                })
        
        return {
            'valid_records': valid_records,
            'errors': [],
            'stats': {
                'total': len(rows),
                'valid': len(valid_records),
                'skipped': skipped_count,
                'sin_imei': sin_imei_count,
                'warnings': warnings_count
            }
        }


# Instancia singleton
ldu_normalization_service = LDUNormalizationService()

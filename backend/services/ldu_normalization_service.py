"""
Servicio de normalización y validación para registros LDU
Implementa todas las reglas de transformación y validación del Excel
"""
import re
from typing import Dict, Any, Optional, Tuple, List
from datetime import datetime


class LDUNormalizationService:
    """Servicio de normalización de datos LDU"""
    
    # Patrones para detectar estado desde OBSERVATION
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
    
    def validate_imei(self, imei: Any) -> Tuple[bool, str, Optional[str]]:
        """
        Valida un IMEI según las reglas establecidas
        
        Args:
            imei: Valor del IMEI a validar
            
        Returns:
            Tuple (es_valido, imei_normalizado o None, mensaje_error o None)
        """
        if imei is None:
            return False, None, "IMEI es obligatorio"
        
        # Convertir a string y limpiar
        imei_str = str(imei).strip()
        
        # Remover caracteres no numéricos
        imei_clean = re.sub(r'[^\d]', '', imei_str)
        
        if not imei_clean:
            return False, None, "IMEI vacío o sin dígitos"
        
        # Validar longitud (14-16 dígitos)
        if len(imei_clean) < 14:
            return False, None, f"IMEI muy corto: {len(imei_clean)} dígitos (mínimo 14)"
        
        if len(imei_clean) > 16:
            return False, None, f"IMEI muy largo: {len(imei_clean)} dígitos (máximo 16)"
        
        return True, imei_clean, None
    
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
        
        Args:
            row: Diccionario con los datos de una fila
            
        Returns:
            Dict con los datos normalizados para insertar en Supabase
        """
        # Validar IMEI primero
        imei_valid, imei_normalized, imei_error = self.validate_imei(row.get('IMEI'))
        
        if not imei_valid:
            return {
                '_valid': False,
                '_error_type': 'invalid_imei',
                '_error_message': imei_error,
                '_imei_attempted': str(row.get('IMEI', ''))[:50],
                '_row_number': row.get('_row_number'),
                '_raw_row': row.get('_raw_row', row)
            }
        
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
            
            # Ubicación
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
            '_warnings': []
        }
        
        # Agregar advertencias
        if not dni:
            normalized['_warnings'].append('DNI vacío')
        
        if not estado:
            normalized['_warnings'].append('Estado no determinado - requiere revisión manual')
        
        return normalized
    
    def normalize_batch(self, rows: List[Dict[str, Any]], file_id: str) -> Dict[str, Any]:
        """
        Normaliza un lote de filas
        
        Args:
            rows: Lista de diccionarios con las filas
            file_id: ID del archivo de origen
            
        Returns:
            Dict con registros válidos, errores y estadísticas
        """
        valid_records = []
        errors = []
        warnings_count = 0
        
        for row in rows:
            normalized = self.normalize_row(row)
            
            if normalized.get('_valid'):
                # Agregar referencia al archivo
                normalized['archivo_origen_id'] = file_id
                normalized['raw_excel_reference'] = f"{file_id}:row_{normalized.get('fila_origen', 'unknown')}"
                
                # Contar advertencias
                if normalized.get('_warnings'):
                    warnings_count += len(normalized['_warnings'])
                
                # Remover campos internos antes de insertar
                clean_record = {k: v for k, v in normalized.items() 
                               if not k.startswith('_')}
                
                valid_records.append({
                    'record': clean_record,
                    'warnings': normalized.get('_warnings', []),
                    'imei': normalized['imei']
                })
            else:
                errors.append({
                    'row_number': normalized.get('_row_number'),
                    'error_type': normalized.get('_error_type'),
                    'error_message': normalized.get('_error_message'),
                    'imei_attempted': normalized.get('_imei_attempted'),
                    'raw_row': normalized.get('_raw_row')
                })
        
        return {
            'valid_records': valid_records,
            'errors': errors,
            'stats': {
                'total': len(rows),
                'valid': len(valid_records),
                'invalid': len(errors),
                'warnings': warnings_count
            }
        }


# Instancia singleton
ldu_normalization_service = LDUNormalizationService()

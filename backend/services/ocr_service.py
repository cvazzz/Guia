"""
Servicio de OCR usando EasyOCR.
Procesa imágenes TIF, extrae texto y campos específicos.
Incluye detección de firma por análisis de imagen.
"""
import re
import logging
from pathlib import Path
from typing import Dict, List, Optional, Tuple
from datetime import datetime

import easyocr
import cv2
import numpy as np
from PIL import Image

from config.settings import (
    OCR_LANGUAGES, 
    OCR_GPU, 
    CAMPOS_DOCUMENTO
)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class OCRService:
    """Servicio de OCR para procesamiento de documentos TIF."""
    
    def __init__(self):
        logger.info(f"Inicializando EasyOCR con idiomas: {OCR_LANGUAGES}")
        self.reader = easyocr.Reader(OCR_LANGUAGES, gpu=OCR_GPU)
        
    def preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocesa la imagen para mejorar precisión de OCR.
        - Ajuste de contraste
        - Eliminación de ruido
        - Deskew (corrección de rotación)
        """
        try:
            # Convertir a escala de grises si es necesario
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Eliminación de ruido
            denoised = cv2.fastNlMeansDenoising(gray, None, 10, 7, 21)
            
            # Ajuste de contraste usando CLAHE
            clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
            contrasted = clahe.apply(denoised)
            
            # Binarización adaptativa
            binary = cv2.adaptiveThreshold(
                contrasted, 255, 
                cv2.ADAPTIVE_THRESH_GAUSSIAN_C, 
                cv2.THRESH_BINARY, 11, 2
            )
            
            # Deskew
            coords = np.column_stack(np.where(binary > 0))
            if len(coords) > 0:
                angle = cv2.minAreaRect(coords)[-1]
                if angle < -45:
                    angle = -(90 + angle)
                else:
                    angle = -angle
                
                # Solo corregir si el ángulo es significativo
                if abs(angle) > 0.5 and abs(angle) < 10:
                    (h, w) = binary.shape[:2]
                    center = (w // 2, h // 2)
                    M = cv2.getRotationMatrix2D(center, angle, 1.0)
                    binary = cv2.warpAffine(
                        binary, M, (w, h),
                        flags=cv2.INTER_CUBIC,
                        borderMode=cv2.BORDER_REPLICATE
                    )
            
            return binary
            
        except Exception as e:
            logger.warning(f"Error en preprocesamiento: {e}. Usando imagen original.")
            return image
    
    def read_tif_pages(self, file_path: Path) -> List[np.ndarray]:
        """
        Lee todas las páginas de un archivo TIF multipágina.
        """
        pages = []
        
        try:
            img = Image.open(file_path)
            
            # Iterar sobre todas las páginas
            page_num = 0
            while True:
                try:
                    img.seek(page_num)
                    # Convertir a numpy array
                    page_array = np.array(img.convert('RGB'))
                    pages.append(page_array)
                    page_num += 1
                except EOFError:
                    break
            
            logger.info(f"Se leyeron {len(pages)} páginas del TIF.")
            return pages
            
        except Exception as e:
            logger.error(f"Error leyendo TIF: {e}")
            return []
    
    def extract_text_from_image(self, image: np.ndarray) -> Tuple[str, List[Dict]]:
        """
        Extrae texto de una imagen usando EasyOCR.
        Retorna el texto con estructura de líneas preservada y los detalles de detección.
        """
        try:
            # Usar imagen original para mejor detección de posiciones
            # Solo convertir a escala de grises si es necesario
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image
            
            # Ejecutar OCR en imagen original (sin preprocesamiento agresivo)
            results = self.reader.readtext(gray, paragraph=False)
            
            # Extraer texto y detalles con posición
            details = []
            
            for detection in results:
                bbox, text, confidence = detection
                if confidence > 0.3 and len(text.strip()) > 0:
                    # Calcular posición Y central del texto
                    y_top = min(bbox[0][1], bbox[1][1])
                    y_bottom = max(bbox[2][1], bbox[3][1])
                    y_center = (y_top + y_bottom) / 2
                    x_left = min(bbox[0][0], bbox[3][0])
                    x_right = max(bbox[1][0], bbox[2][0])
                    height = y_bottom - y_top
                    width = x_right - x_left
                    
                    details.append({
                        'text': text,
                        'confidence': confidence,
                        'bbox': bbox,
                        'y_center': y_center,
                        'y_top': y_top,
                        'y_bottom': y_bottom,
                        'x_left': x_left,
                        'x_right': x_right,
                        'x_center': (x_left + x_right) / 2,
                        'height': height,
                        'width': width
                    })
            
            if not details:
                return "", []
            
            # Calcular altura promedio de texto para determinar tolerancia
            avg_height = sum(d['height'] for d in details) / len(details)
            y_tolerance = avg_height * 0.6  # 60% de la altura promedio
            
            logger.info(f"OCR: {len(details)} detecciones, altura promedio: {avg_height:.1f}, tolerancia Y: {y_tolerance:.1f}")
            
            # Ordenar por posición Y primero
            details.sort(key=lambda d: d['y_center'])
            
            # Agrupar textos que están en la misma línea
            lines = []
            current_line = []
            current_y = None
            
            for d in details:
                if current_y is None:
                    current_y = d['y_center']
                    current_line.append(d)
                elif abs(d['y_center'] - current_y) <= y_tolerance:
                    # Misma línea
                    current_line.append(d)
                    # Actualizar Y promedio de la línea
                    current_y = sum(x['y_center'] for x in current_line) / len(current_line)
                else:
                    # Nueva línea
                    if current_line:
                        current_line.sort(key=lambda x: x['x_left'])
                        line_text = ' '.join([x['text'] for x in current_line])
                        lines.append(line_text)
                    current_line = [d]
                    current_y = d['y_center']
            
            # Agregar última línea
            if current_line:
                current_line.sort(key=lambda x: x['x_left'])
                line_text = ' '.join([x['text'] for x in current_line])
                lines.append(line_text)
            
            logger.info(f"OCR agrupado en {len(lines)} líneas")
            
            # Unir líneas con salto de línea
            full_text = '\n'.join(lines)
            
            return full_text, details
            
        except Exception as e:
            logger.error(f"Error en OCR: {e}")
            import traceback
            traceback.print_exc()
            return "", []
    
    def extract_productos_from_table(self, details: List[Dict], image_width: int, page_image: np.ndarray = None) -> List[Dict]:
        """
        Extrae productos detectando la estructura de tabla usando coordenadas.
        
        Columnas típicas:
        - Nro (muy izquierda, ~5-10% del ancho)
        - Código (~10-25% del ancho) 
        - Descripción (~25-70% del ancho)
        - U/M (~70-85% del ancho)
        - Cantidad (~85-100% del ancho, última columna)
        """
        productos = []
        
        if not details:
            return productos
        
        # Calcular altura promedio para agrupar en filas
        avg_height = sum(d['height'] for d in details) / len(details)
        y_tolerance = avg_height * 0.6
        
        # Ordenar por Y
        sorted_details = sorted(details, key=lambda d: d['y_center'])
        
        # Buscar la fila de cabecera (contiene "CANTIDAD", "U/M", "DESCRIPCIÓN")
        header_y = None
        for d in sorted_details:
            text_upper = d['text'].upper()
            if 'CANTIDAD' in text_upper or 'CANT' in text_upper:
                header_y = d['y_center']
                logger.info(f"Cabecera de tabla encontrada en Y={header_y:.0f}: {d['text']}")
                break
        
        if header_y is None:
            logger.info("No se encontró cabecera de tabla para extracción avanzada")
            return productos
        
        # Encontrar posiciones X de las columnas basándose en la cabecera
        header_row = [d for d in sorted_details if abs(d['y_center'] - header_y) <= y_tolerance]
        header_row.sort(key=lambda x: x['x_left'])
        
        # Identificar columnas por su posición
        cantidad_x = None
        um_x = None
        
        for d in header_row:
            text_upper = d['text'].upper()
            if 'CANTIDAD' in text_upper or 'CANT' in text_upper:
                cantidad_x = d['x_center']
            elif 'U/M' in text_upper or 'UM' in text_upper:
                um_x = d['x_center']
        
        logger.info(f"Posición columna CANTIDAD: X={cantidad_x}, U/M: X={um_x}")
        
        # Agrupar detecciones en filas
        rows = []
        current_row = []
        current_y = None
        
        for d in sorted_details:
            # Solo procesar filas después de la cabecera
            if d['y_center'] <= header_y:
                continue
                
            if current_y is None:
                current_y = d['y_center']
                current_row.append(d)
            elif abs(d['y_center'] - current_y) <= y_tolerance:
                current_row.append(d)
                current_y = sum(x['y_center'] for x in current_row) / len(current_row)
            else:
                if current_row:
                    rows.append(current_row)
                current_row = [d]
                current_y = d['y_center']
        
        if current_row:
            rows.append(current_row)
        
        logger.info(f"Encontradas {len(rows)} filas después de cabecera")
        
        # Procesar cada fila buscando productos
        for row in rows:
            row.sort(key=lambda x: x['x_left'])
            row_text = ' '.join([d['text'] for d in row])
            
            # Verificar si es una fila de producto (tiene código numérico o alfanumérico)
            # Patrones de código más flexibles:
            # - 6-8 dígitos puros: 4817532
            # - 2-4 letras + 3-6 dígitos/O: POP0142, PROP174, PROZ070, PROZO7O
            # - El OCR confunde 0 con O, así que aceptamos ambos
            has_codigo = any(
                re.match(r'^\d{6,8}$', d['text']) or 
                re.match(r'^[A-Z]{2,4}[O0\d]{3,6}$', d['text'].upper()) or  # Acepta O o dígitos
                re.match(r'^PRO[A-Z][O0\d]{3}$', d['text'].upper()) or  # PROZ070, PROZO7O
                re.match(r'^PROP[O0\d]{3}$', d['text'].upper())    # PROP174, PROPO74
                for d in row
            )
            
            # También buscar código concatenado con descripción (ej: "PROZO7O AURICULAR...")
            if not has_codigo:
                for d in row:
                    text = d['text'].upper()
                    # Buscar patrón de código al inicio del texto (acepta O como 0)
                    if re.match(r'^[A-Z]{2,4}[O0\d]{2,4}[\s]+[A-Z]', text):
                        has_codigo = True
                        break
            
            if not has_codigo:
                # Verificar si contiene marcadores de fin de tabla
                if any(marker in row_text.upper() for marker in ['OBSERV', 'P#M', 'PRM', 'PAM', 'WWW', 'REPRESENTACIÓN']):
                    logger.info(f"Fin de tabla detectado: {row_text[:50]}")
                    break
                continue
            
            # Extraer datos de la fila
            codigo = None
            descripcion_parts = []
            unidad = None
            cantidad = None
            
            for d in row:
                text = d['text'].strip()
                x_pos = d['x_center']
                
                # Detectar código solo (6-8 dígitos)
                if re.match(r'^\d{6,8}$', text):
                    codigo = text
                # Código alfanumérico solo (acepta O como 0: PROZ070 o PROZO7O)
                elif re.match(r'^[A-Z]{2,4}[O0\d]{3,6}$', text.upper()) and len(text) <= 10:
                    codigo = text.upper()
                    # Normalizar todas las O a 0 después de las letras iniciales
                    codigo = self._normalize_code(codigo)
                # Código concatenado con descripción (ej: "PROZO7O AURICULAR INALÁMBRICO...")
                elif not codigo:
                    # Buscar código al inicio del texto (acepta O como dígito, sufijo 3-6 chars)
                    match = re.match(r'^([A-Z]{2,4}[O0\d]{3,6})\s+(.+)', text.upper())
                    if match:
                        codigo = match.group(1)
                        # Normalizar O a 0
                        codigo = self._normalize_code(codigo)
                        # El resto es descripción - usar el texto original para preservar mayúsculas/minúsculas
                        code_len = len(match.group(1))
                        rest = text[code_len:].strip()
                        if rest:
                            descripcion_parts.append(rest)
                        continue  # Ya procesamos este texto
                
                # Detectar unidad
                if text.upper() in ['NIU', 'UND', 'UN', 'PZA', 'KG', 'LT', 'CJ']:
                    unidad = text.upper()
                # Detectar cantidad (número de 1-3 dígitos)
                elif re.match(r'^\d{1,3}$', text):
                    # Si tenemos la posición X de cantidad, verificar cercanía
                    if cantidad_x and abs(x_pos - cantidad_x) < image_width * 0.1:
                        cantidad = text
                    elif not cantidad:  # Si no tenemos posición, guardar el último número
                        cantidad = text
                # El resto es descripción (si no es número de fila y no es código ya procesado)
                elif not re.match(r'^[12345]$', text) and len(text) > 2 and text.upper() != codigo:
                    descripcion_parts.append(text)
            
            if codigo and unidad:
                descripcion = ' '.join(descripcion_parts)
                
                # Limpiar: remover el código si quedó al inicio de la descripción
                if codigo and descripcion.upper().startswith(codigo):
                    descripcion = descripcion[len(codigo):].strip()
                # También verificar variantes con O/0 confundidos
                codigo_with_O = re.sub(r'0', 'O', codigo)
                if descripcion.upper().startswith(codigo_with_O):
                    descripcion = descripcion[len(codigo_with_O):].strip()
                
                # Si no encontramos cantidad y tenemos la imagen, intentar OCR en la zona de cantidad
                if not cantidad and page_image is not None and cantidad_x:
                    cantidad = self._ocr_cantidad_zone(page_image, row, cantidad_x, image_width)
                
                if not cantidad:
                    cantidad = '1'  # Default
                
                productos.append({
                    'nro': str(len(productos) + 1),
                    'codigo': codigo,
                    'nombre': descripcion,
                    'unidad': unidad,
                    'cantidad': cantidad
                })
                logger.info(f"  ✓ Producto (tabla): [{codigo}] {descripcion[:40]}... | {unidad} x{cantidad}")
        
        return productos
    
    def _normalize_code(self, code: str) -> str:
        """
        Normaliza un código convirtiendo O a 0 después de las letras iniciales.
        Ej: PROZO7O -> PROZ070, POPO142 -> POP0142
        """
        # Encontrar dónde terminan las letras iniciales
        match = re.match(r'^([A-Z]+)', code)
        if not match:
            return code
        
        prefix = match.group(1)
        suffix = code[len(prefix):]
        
        # Convertir todas las O a 0 en el sufijo
        suffix = suffix.replace('O', '0')
        
        return prefix + suffix
    
    def _ocr_cantidad_zone(self, image: np.ndarray, row: List[Dict], cantidad_x: float, image_width: int) -> Optional[str]:
        """
        Hace OCR específico en la zona de cantidad de una fila.
        """
        try:
            # Obtener el rango Y de la fila
            y_top = min(d['y_top'] for d in row) - 10
            y_bottom = max(d['y_bottom'] for d in row) + 10
            
            # Definir la zona X de cantidad (desde la posición de cantidad hasta el borde)
            # La columna CANTIDAD típicamente tiene el número centrado bajo el título
            x_start = int(cantidad_x - 80)  # Más amplio
            x_end = min(int(cantidad_x + 120), image_width)
            
            # Asegurar que las coordenadas son válidas
            y_top = max(0, int(y_top))
            y_bottom = min(image.shape[0], int(y_bottom))
            x_start = max(0, x_start)
            
            # Recortar la zona
            zone = image[y_top:y_bottom, x_start:x_end]
            
            if zone.size == 0:
                logger.debug(f"    Zona vacía: y={y_top}-{y_bottom}, x={x_start}-{x_end}")
                return None
            
            # Preprocesar la zona para mejor OCR - múltiples intentos
            if len(zone.shape) == 3:
                zone_gray = cv2.cvtColor(zone, cv2.COLOR_BGR2GRAY)
            else:
                zone_gray = zone
            
            # Escalar la imagen para mejor detección de dígitos pequeños
            scale = 3
            zone_scaled = cv2.resize(zone_gray, None, fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
            
            # Intentar con múltiples técnicas de binarización
            preprocessing_methods = [
                # Otsu
                lambda img: cv2.threshold(img, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)[1],
                # Adaptive threshold
                lambda img: cv2.adaptiveThreshold(img, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 11, 2),
                # Umbral fijo para documentos claros
                lambda img: cv2.threshold(img, 127, 255, cv2.THRESH_BINARY)[1],
                # Imagen original escalada
                lambda img: img
            ]
            
            for i, preprocess in enumerate(preprocessing_methods):
                try:
                    zone_processed = preprocess(zone_scaled)
                    
                    # OCR en la zona con diferentes parámetros
                    results = self.reader.readtext(zone_processed, detail=0, paragraph=False, 
                                                    allowlist='0123456789')
                    
                    logger.debug(f"    OCR zona (método {i}): {results}")
                    
                    # Buscar dígitos
                    for text in results:
                        text = text.strip()
                        if re.match(r'^\d{1,3}$', text):
                            logger.info(f"    ✓ Cantidad encontrada en zona (método {i}): {text}")
                            return text
                except Exception as e:
                    logger.debug(f"    Preprocesamiento {i} falló: {e}")
                    continue
            
            logger.debug(f"    No se encontró cantidad en zona x={x_start}-{x_end}")
            return None
            
        except Exception as e:
            logger.warning(f"Error en OCR de zona cantidad: {e}")
            return None
    
    def clean_text(self, text: str) -> str:
        """
        Limpia el texto eliminando artefactos de OCR pero preservando saltos de línea.
        """
        # Eliminar caracteres extraños (pero mantener saltos de línea)
        text = re.sub(r'[^\w\s\-.,;:()\/\#@áéíóúñÁÉÍÓÚÑüÜ\n]', '', text)
        
        # Normalizar espacios horizontales (no tocar saltos de línea)
        text = re.sub(r'[^\S\n]+', ' ', text)
        
        # Eliminar líneas vacías múltiples
        text = re.sub(r'\n\s*\n', '\n', text)
        
        # Eliminar espacios al inicio/final de cada línea
        lines = [line.strip() for line in text.split('\n')]
        text = '\n'.join(lines)
        
        return text.strip()
    
    def extract_numero_guia(self, text: str) -> Optional[str]:
        """Extrae el número de guía del documento (formato TT01-XXXXXX o similar)."""
        patterns = [
            # Formato principal TT01-001723, TT01-001927, etc.
            r'([Tt]{2}\d{2}[-]?\d{6})',
            # Formato con T al inicio
            r'[Tt][-]?(\d{2}[-]?\d{6})',
            # Número cerca de "GUIA DE REMISION"
            r'(?:[Gg]u[ií]a.*?|REMITENTE.*?)([A-Z]{2}\d{2}[-]?\d{6})',
            # Formato genérico XXX-XXXXXX
            r'(\d{3,4}[-]\d{6,8})',
            # Otros formatos comunes
            r'[Gg]u[ií]a\s*[#:N°]*\s*(\d{5,15})',
            r'[Nn][°º]?\s*[Gg]u[ií]a\s*[:]?\s*(\d{5,15})',
            r'[Rr]emisi[oó]n\s*[#:N°]*\s*(\d{5,15})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                guia = match.group(1).upper()
                # Normalizar formato
                if not '-' in guia and len(guia) >= 8:
                    guia = guia[:4] + '-' + guia[4:]
                return guia
        return None
    
    def extract_fecha(self, text: str) -> Optional[str]:
        """Extrae la fecha del documento."""
        patterns = [
            r'(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
            r'(\d{1,2}\s+de\s+\w+\s+de[l]?\s+\d{4})',
            r'[Ff]echa[:]?\s*(\d{1,2}[/\-]\d{1,2}[/\-]\d{2,4})',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1)
        return None
    
    def extract_proveedor(self, text: str) -> Optional[str]:
        """Extrae el nombre del proveedor."""
        patterns = [
            r'[Pp]roveedor[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s\.]+?)(?:\n|RUC|Direcci)',
            r'[Rr]azón\s*[Ss]ocial[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s\.]+?)(?:\n|RUC)',
            r'[Rr]emitente[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s\.]+?)(?:\n|RUC|Direcci)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1).strip()
        return None
    
    def extract_ruc(self, text: str) -> Optional[str]:
        """Extrae el RUC."""
        pattern = r'[Rr][Uu][Cc][:]?\s*(\d{11})'
        match = re.search(pattern, text)
        return match.group(1) if match else None
    
    def extract_direccion(self, text: str) -> Optional[str]:
        """Extrae la dirección de destino."""
        patterns = [
            r'[Dd]estino[:]?\s*(.+?)(?:\n|Producto|Tel[eé])',
            r'[Dd]irecci[oó]n\s*[Dd]estino[:]?\s*(.+?)(?:\n|Producto)',
            r'[Ss]ucursal[:]?\s*(.+?)(?:\n|Producto)',
            r'[Pp]unto\s*[Ee]ntrega[:]?\s*(.+?)(?:\n|Producto)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                return match.group(1).strip()[:200]  # Limitar longitud
        return None
    
    def extract_productos(self, text: str) -> List[Dict]:
        """
        Extrae la lista de productos con códigos, descripciones, unidades y cantidades.
        Formato típico de tabla: Nro. | CÓD. | DESCRIPCIÓN | U/M | CANTIDAD
        
        Ahora trabaja línea por línea gracias al OCR mejorado que preserva estructura.
        """
        productos = []
        
        # Dividir por líneas
        lines = text.split('\n')
        
        logger.info(f"Total de líneas en documento: {len(lines)}")
        
        # Mostrar algunas líneas para debug
        for i, line in enumerate(lines[:15]):
            logger.info(f"  Línea {i}: {line[:80] if len(line) > 80 else line}")
        
        # Buscar la línea que contiene "CANTIDAD" (cabecera de tabla)
        start_idx = 0
        for i, line in enumerate(lines):
            if 'CANTIDAD' in line.upper():
                start_idx = i + 1
                logger.info(f"Encontrada cabecera CANTIDAD en línea {i}")
                break
        
        # Si no encontramos CANTIDAD, buscar después de "U/M" o "Nro"
        if start_idx == 0:
            for i, line in enumerate(lines):
                if 'U/M' in line.upper() or ('NRO' in line.upper() and 'COD' in line.upper()):
                    start_idx = i + 1
                    logger.info(f"Encontrada cabecera alternativa en línea {i}")
                    break
        
        # Si aún no encontramos, empezar desde el principio y buscar productos directamente
        if start_idx == 0:
            logger.info("No se encontró cabecera, buscando productos en todo el texto")
            start_idx = 0
        
        # Procesar todas las líneas
        product_lines = lines[start_idx:]
        
        logger.info(f"Procesando {len(product_lines)} líneas de productos desde línea {start_idx}")
        
        for line in product_lines:
            line = line.strip()
            if not line or len(line) < 5:
                continue
            
            # Detener cuando encontramos secciones que no son productos
            if any(marker in line.upper() for marker in ['P#M', 'P&M', 'PAM', 'PRM', 'OBSERV', 'WWW.', 'REPRESENTACIÓN']):
                logger.info(f"Fin de productos detectado: {line[:50]}")
                break
            
            logger.info(f"  Analizando: {line[:80]}...")
            
            # Patrón 0: Código concatenado con descripción (ej: "PROZ070 AURICULAR INALÁMBRICO...")
            # OCR confunde 0 con O, así que aceptamos ambos en posiciones numéricas
            # Ejemplos: PROZO7O, PROZ070, PROP180, PROPO8O
            match = re.search(
                r'(?:^|\s)(PRO[A-Z][O0\d]{3}|PROP[O0\d]{3}|POP[O0\d]{4}|[A-Z]{3,4}[O0\d]{3,4})([A-ZÁÉÍÓÚ][a-záéíóúA-Z\s]+.+?)\s+(NIU|UND|UN|PZA|KG|LT|CJ)\s+(\d{1,3})(?:\s|$)',
                line, re.IGNORECASE
            )
            
            if match:
                codigo = match.group(1).upper()
                # Normalizar: convertir O a 0 después de las letras iniciales
                codigo = self._normalize_code(codigo)
                descripcion = match.group(2).strip()
                unidad = match.group(3).upper()
                cantidad = match.group(4)
                
                descripcion = re.sub(r'^\d{1,2}\s+', '', descripcion)
                descripcion = re.sub(r'\s+', ' ', descripcion).strip()
                
                if len(descripcion) > 3 and not any(p['codigo'] == codigo for p in productos):
                    productos.append({
                        'nro': str(len(productos) + 1),
                        'codigo': codigo,
                        'nombre': descripcion,
                        'unidad': unidad,
                        'cantidad': cantidad
                    })
                    logger.info(f"    ✓ Producto (concatenado): [{codigo}] {descripcion} | {unidad} x{cantidad}")
                continue
            
            # Patrón 1: Código numérico (6-8 dígitos) con cantidad
            match = re.search(
                r'(?:^|\s)(\d{6,8})\s+(.+?)\s+(NIU|UND|UN|PZA|KG|LT|CJ)\s+(\d{1,3})(?:\s|$)',
                line, re.IGNORECASE
            )
            
            if match:
                codigo = match.group(1)
                descripcion = match.group(2).strip()
                unidad = match.group(3).upper()
                cantidad = match.group(4)
                
                descripcion = re.sub(r'^\d{1,2}\s+', '', descripcion)
                descripcion = re.sub(r'\s+', ' ', descripcion).strip()
                
                if len(descripcion) > 3 and not any(p['codigo'] == codigo for p in productos):
                    productos.append({
                        'nro': str(len(productos) + 1),
                        'codigo': codigo,
                        'nombre': descripcion,
                        'unidad': unidad,
                        'cantidad': cantidad
                    })
                    logger.info(f"    ✓ Producto: [{codigo}] {descripcion} | {unidad} x{cantidad}")
                continue
            
            # Patrón 2: Código alfanumérico (POP0142, PROZ070, etc.) con cantidad
            # Acepta O como 0 en cualquier posición del sufijo numérico
            match = re.search(
                r'(?:^|\s)([A-Z]{2,4}[O0\d]{3,6})\s+(.+?)\s+(NIU|UND|UN|PZA|KG|LT|CJ)\s+(\d{1,3})(?:\s|$)',
                line, re.IGNORECASE
            )
            
            if match:
                codigo = match.group(1).upper()
                codigo = self._normalize_code(codigo)
                
                descripcion = match.group(2).strip()
                unidad = match.group(3).upper()
                cantidad = match.group(4)
                
                descripcion = re.sub(r'^\d{1,2}\s+', '', descripcion)
                descripcion = re.sub(r'\s+', ' ', descripcion).strip()
                
                if len(descripcion) > 3 and not any(p['codigo'] == codigo for p in productos):
                    productos.append({
                        'nro': str(len(productos) + 1),
                        'codigo': codigo,
                        'nombre': descripcion,
                        'unidad': unidad,
                        'cantidad': cantidad
                    })
                    logger.info(f"    ✓ Producto: [{codigo}] {descripcion} | {unidad} x{cantidad}")
                continue
            
            # Patrón 3: Sin cantidad explícita
            match = re.search(
                r'(?:^|\s)(\d{6,8}|[A-Z]{2,4}[O0\d]{3,6})\s+(.+?)\s+(NIU|UND|UN|PZA|KG|LT|CJ)(?:\s|$)',
                line, re.IGNORECASE
            )
            
            if match:
                codigo = match.group(1)
                if codigo[0].isalpha():
                    codigo = codigo.upper()
                    codigo = self._normalize_code(codigo)
                
                descripcion = match.group(2).strip()
                unidad = match.group(3).upper()
                cantidad = '1'
                
                descripcion = re.sub(r'^\d{1,2}\s+', '', descripcion)
                descripcion = re.sub(r'\s+', ' ', descripcion).strip()
                
                if len(descripcion) > 3 and not any(p['codigo'] == codigo for p in productos):
                    productos.append({
                        'nro': str(len(productos) + 1),
                        'codigo': codigo,
                        'nombre': descripcion,
                        'unidad': unidad,
                        'cantidad': cantidad
                    })
                    logger.info(f"    ✓ Producto (sin cant): [{codigo}] {descripcion} | {unidad} x{cantidad}")
        
        logger.info(f"Total productos extraídos: {len(productos)}")
        for p in productos:
            logger.info(f"  - [{p['codigo']}] {p['nombre']} | {p['unidad']} x{p['cantidad']}")
        
        return productos
    
    def detect_firma(self, text: str) -> Tuple[bool, Optional[str]]:
        """
        Detecta si el documento está firmado y extrae nombre del firmante.
        Busca patrones de texto que indiquen firma.
        """
        # Patrones que indican firma
        firma_patterns = [
            r'[Ff]irma[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)',
            r'[Rr]ecibido\s+por[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)',
            r'[Rr]ecib[ií][:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)',
            r'[Cc]onforme[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s]+)',
        ]
        
        for pattern in firma_patterns:
            match = re.search(pattern, text)
            if match:
                nombre = match.group(1).strip()
                if len(nombre) > 2:
                    return True, nombre
        
        # Buscar indicadores de firma sin nombre
        if re.search(r'[Ff]irmado|[Ss]ellado|[Rr]ecibido', text):
            return True, None
        
        return False, None
    
    def detect_firma_en_imagen(self, image: np.ndarray) -> Tuple[bool, float]:
        """
        Detecta si hay una firma manuscrita en la imagen usando análisis de contornos.
        Busca trazos que parezcan escritura a mano en la parte inferior del documento.
        
        Returns:
            Tuple[bool, float]: (tiene_firma, confianza)
        """
        try:
            # Convertir a escala de grises
            if len(image.shape) == 3:
                gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
            else:
                gray = image.copy()
            
            height, width = gray.shape
            
            # Enfocarnos en el tercio inferior del documento (donde suelen estar las firmas)
            roi_start = int(height * 0.6)
            roi = gray[roi_start:, :]
            
            # Binarización inversa para detectar trazos oscuros
            _, binary = cv2.threshold(roi, 0, 255, cv2.THRESH_BINARY_INV + cv2.THRESH_OTSU)
            
            # Encontrar contornos
            contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            
            # Analizar contornos buscando patrones de firma
            firma_candidates = []
            
            for contour in contours:
                area = cv2.contourArea(contour)
                x, y, w, h = cv2.boundingRect(contour)
                
                # Filtrar por tamaño (firmas suelen tener ciertas proporciones)
                if area < 100:  # Muy pequeño, probablemente ruido
                    continue
                if area > (width * height * 0.3):  # Muy grande, probablemente no es firma
                    continue
                
                # Calcular aspect ratio
                aspect_ratio = w / max(h, 1)
                
                # Las firmas suelen ser más anchas que altas
                if aspect_ratio > 1.5 and aspect_ratio < 15:
                    # Calcular complejidad del contorno (perímetro vs área)
                    perimeter = cv2.arcLength(contour, True)
                    if perimeter > 0:
                        complexity = (perimeter ** 2) / (4 * np.pi * area) if area > 0 else 0
                        
                        # Las firmas tienen alta complejidad (muchas curvas)
                        if complexity > 3:
                            firma_candidates.append({
                                'area': area,
                                'complexity': complexity,
                                'aspect_ratio': aspect_ratio,
                                'bbox': (x, y + roi_start, w, h)
                            })
            
            if firma_candidates:
                # Calcular confianza basada en el mejor candidato
                best = max(firma_candidates, key=lambda x: x['complexity'])
                confianza = min(0.95, 0.5 + (best['complexity'] / 20))
                logger.info(f"Firma detectada con confianza {confianza:.2f}")
                return True, confianza
            
            # Método alternativo: buscar líneas de firma (línea horizontal con trazos encima)
            edges = cv2.Canny(roi, 50, 150)
            lines = cv2.HoughLinesP(edges, 1, np.pi/180, threshold=100, minLineLength=100, maxLineGap=10)
            
            if lines is not None:
                horizontal_lines = []
                for line in lines:
                    x1, y1, x2, y2 = line[0]
                    angle = abs(np.arctan2(y2-y1, x2-x1) * 180 / np.pi)
                    if angle < 10 or angle > 170:  # Línea casi horizontal
                        horizontal_lines.append(line[0])
                
                if horizontal_lines:
                    # Hay líneas horizontales (posible línea de firma)
                    # Verificar si hay trazos encima
                    for hline in horizontal_lines:
                        x1, y1, x2, y2 = hline
                        y_line = min(y1, y2)
                        
                        # Región encima de la línea
                        if y_line > 30:
                            region_above = binary[max(0, y_line-50):y_line, min(x1, x2):max(x1, x2)]
                            if region_above.size > 0:
                                ink_density = np.sum(region_above > 0) / region_above.size
                                if ink_density > 0.05:  # Hay trazos encima de la línea
                                    return True, 0.75
            
            return False, 0.0
            
        except Exception as e:
            logger.warning(f"Error en detección de firma por imagen: {e}")
            return False, 0.0
    
    def extract_transportista(self, text: str) -> Optional[str]:
        """Extrae información del transportista/conductor."""
        patterns = [
            # Patrón específico para el formato de estos documentos
            r'[Cc]onductor\s+[Pp]rincipal[:\s]*(?:DNI\s*\d+\s*)?([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+)',
            r'[Cc]onductor[:]?\s*(?:DNI\s*\d+\s*)?([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑa-záéíóúñ\s]+?)(?:\n|LICENCIA|DNI|$)',
            r'[Tt]ransportista[:]?\s*([A-Za-záéíóúñÁÉÍÓÚÑ\s\.]+?)(?:\n|RUC|Placa)',
            r'DNI\s*\d+\s+([A-ZÁÉÍÓÚÑ][A-Za-záéíóúñÁÉÍÓÚÑ\s]+?)(?:\s+LICENCIA|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                nombre = match.group(1).strip()
                # Limpiar y validar
                nombre = re.sub(r'\s+', ' ', nombre)
                # Debe tener al menos 2 palabras para ser un nombre válido
                if len(nombre.split()) >= 2 and len(nombre) > 5:
                    return nombre[:100]  # Limitar longitud
        return None
    
    def extract_dni_conductor(self, text: str) -> Optional[str]:
        """Extrae el DNI del conductor."""
        patterns = [
            r'[Cc]onductor.*?DNI\s*(\d{8})',
            r'DNI\s*(\d{8})\s+[A-Z]',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    
    def extract_placa(self, text: str) -> Optional[str]:
        """Extrae la placa del vehículo."""
        patterns = [
            # Formato peruano: ABC-123 o ABC123
            r'[Vv]eh[ií]culo\s+[Pp]rincipal[:\s]*([A-Z]{3}[-\s]?\d{3})',
            r'[Pp]laca[:]?\s*([A-Z]{3}[-\s]?\d{3})',
            # Buscar patrón de placa directamente (3 letras + 3 números)
            r'\b([A-Z]{3}\d{3})\b',
            r'\b([A-Z]{3}[-]\d{3})\b',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                placa = match.group(1).upper().replace(' ', '')
                # Normalizar formato con guión
                if len(placa) == 6:
                    placa = placa[:3] + '-' + placa[3:]
                return placa
        return None
    
    def extract_punto_llegada(self, text: str) -> Optional[str]:
        """Extrae el punto de llegada/destino."""
        patterns = [
            r'[Pp]unto\s+[Dd]e\s+[Ll]legada[:\s]*\([^)]+\)\s*([^\n]+)',
            r'[Pp]unto\s+[Dd]e\s+[Ll]legada[:\s]*(.+?)(?:\n|Nro|CÓD)',
            r'[Dd]estino[:\s]*(.+?)(?:\n|DATOS|Nro)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                destino = match.group(1).strip()
                # Limpiar
                destino = re.sub(r'\s+', ' ', destino)
                if len(destino) > 10:
                    return destino[:300]
        return None
    
    def extract_punto_partida(self, text: str) -> Optional[str]:
        """Extrae el punto de partida."""
        patterns = [
            r'[Pp]unto\s+[Dd]e\s+[Pp]artida[:\s]*\([^)]+\)\s*([^\n]+)',
            r'[Pp]unto\s+[Dd]e\s+[Pp]artida[:\s]*(.+?)(?:\n|PUNTO DE LLEGADA)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE | re.DOTALL)
            if match:
                origen = match.group(1).strip()
                origen = re.sub(r'\s+', ' ', origen)
                if len(origen) > 10:
                    return origen[:300]
        return None
    
    def extract_destinatario(self, text: str) -> Dict:
        """Extrae información del destinatario."""
        result = {
            'nombre': None,
            'ruc': None,
            'direccion': None,
            'contacto': None,
            'telefono': None
        }
        
        # Buscar nombre del destinatario/contacto en observaciones
        obs_pattern = r'[Oo]bservaciones[:\s]*.*?([A-ZÁÉÍÓÚÑ][a-záéíóúñ]+(?:\s+[A-ZÁÉÍÓÚÑ][a-záéíóúñ]+)+)\s*[-–]\s*(\d{9})'
        match = re.search(obs_pattern, text)
        if match:
            result['contacto'] = match.group(1).strip()
            result['telefono'] = match.group(2)
        
        # Buscar teléfonos en observaciones
        tel_pattern = r'(\d{9})\s*[-–]?\s*(\d{9})?'
        match = re.search(tel_pattern, text)
        if match:
            if not result['telefono']:
                result['telefono'] = match.group(1)
        
        return result
    
    def extract_observaciones(self, text: str) -> Optional[str]:
        """Extrae observaciones del documento."""
        patterns = [
            r'[Oo]bservacion[es]*[:]?\s*(.+?)(?:\n\n|Firma|$)',
            r'[Nn]ota[s]?[:]?\s*(.+?)(?:\n\n|Firma|$)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text, re.DOTALL)
            if match:
                obs = match.group(1).strip()
                if len(obs) > 5:
                    return obs[:500]  # Limitar longitud
        return None
    
    def extract_codigo_interno(self, text: str) -> Optional[str]:
        """Extrae código interno o correlativo."""
        patterns = [
            r'[Cc][oó]digo\s*[Ii]nterno[:]?\s*([A-Z0-9\-]+)',
            r'[Cc]orrelativo[:]?\s*([A-Z0-9\-]+)',
            r'[Nn][°º]?\s*[Ii]nterno[:]?\s*([A-Z0-9\-]+)',
        ]
        
        for pattern in patterns:
            match = re.search(pattern, text)
            if match:
                return match.group(1)
        return None
    
    def process_document(self, file_path: Path) -> Dict:
        """
        Procesa un documento TIF completo y extrae todos los campos.
        Incluye detección de firma por análisis de imagen.
        """
        logger.info(f"Procesando documento: {file_path}")
        
        result = {
            'numero_guia': None,
            'fecha_documento': None,
            'proveedor': None,
            'direccion_destino': None,
            'direccion_origen': None,
            'productos': [],
            'codigos_producto': [],
            'cantidades': [],
            'unidad_medida': [],
            'firmado': False,
            'firma_confianza': 0.0,
            'nombre_firmante': None,
            'observaciones': None,
            'numero_paginas': 0,
            'codigo_interno': None,
            'transportista': None,
            'dni_conductor': None,
            'ruc': None,
            'direccion_remitente': None,
            'placa': None,
            'destinatario_contacto': None,
            'destinatario_telefono': None,
            'raw_text': '',
            'ocr_status': 'success',
            'campos_faltantes': [],
            'procesado_en': datetime.now().isoformat()
        }
        
        try:
            # Leer páginas del TIF
            pages = self.read_tif_pages(file_path)
            result['numero_paginas'] = len(pages)
            
            if not pages:
                result['ocr_status'] = 'error'
                result['campos_faltantes'].append('No se pudo leer el archivo')
                return result
            
            # Procesar cada página y concatenar texto
            all_text = []
            firma_detectada = False
            max_firma_confianza = 0.0
            all_details = []  # Guardar detalles de OCR para extracción de tabla
            image_width = 0
            
            for i, page in enumerate(pages):
                logger.info(f"Procesando página {i + 1}/{len(pages)}")
                text, details = self.extract_text_from_image(page)
                all_text.append(text)
                all_details.extend(details)
                image_width = max(image_width, page.shape[1] if len(page.shape) > 1 else 0)
                
                # Detectar firma en cada página por análisis de imagen
                tiene_firma, confianza = self.detect_firma_en_imagen(page)
                if tiene_firma:
                    firma_detectada = True
                    max_firma_confianza = max(max_firma_confianza, confianza)
            
            full_text = '\n'.join(all_text)
            cleaned_text = self.clean_text(full_text)
            result['raw_text'] = cleaned_text
            
            # Guardar la primera página para extracción de tabla
            first_page_image = pages[0] if pages else None
            
            # Extraer campos de texto
            result['numero_guia'] = self.extract_numero_guia(cleaned_text)
            result['fecha_documento'] = self.extract_fecha(cleaned_text)
            result['proveedor'] = self.extract_proveedor(cleaned_text)
            result['direccion_destino'] = self.extract_punto_llegada(cleaned_text) or self.extract_direccion(cleaned_text)
            result['direccion_origen'] = self.extract_punto_partida(cleaned_text)
            result['ruc'] = self.extract_ruc(cleaned_text)
            result['transportista'] = self.extract_transportista(cleaned_text)
            result['dni_conductor'] = self.extract_dni_conductor(cleaned_text)
            result['placa'] = self.extract_placa(cleaned_text)
            result['observaciones'] = self.extract_observaciones(cleaned_text)
            result['codigo_interno'] = self.extract_codigo_interno(cleaned_text)
            
            # Productos - PRIMERO intentar extracción avanzada de tabla
            productos = self.extract_productos_from_table(all_details, image_width, first_page_image)
            
            # Si no se encontraron productos con el método de tabla, usar el método de texto
            if not productos:
                logger.info("Extracción de tabla no encontró productos, usando método de texto...")
                productos = self.extract_productos(cleaned_text)
            
            result['productos'] = [p['nombre'] for p in productos]
            result['codigos_producto'] = [p.get('codigo', '') for p in productos]
            result['cantidades'] = [p['cantidad'] for p in productos]
            result['unidad_medida'] = [p['unidad'] for p in productos]

            # Destinatario
            dest_info = self.extract_destinatario(cleaned_text)
            result['destinatario_contacto'] = dest_info.get('contacto')
            result['destinatario_telefono'] = dest_info.get('telefono')
            
            # Firma - combinar detección por texto e imagen
            firmado_texto, firmante = self.detect_firma(cleaned_text)
            
            # Si se detectó firma por imagen O por texto, marcar como firmado
            result['firmado'] = firma_detectada or firmado_texto
            result['nombre_firmante'] = firmante
            result['firma_confianza'] = max_firma_confianza if firma_detectada else (0.8 if firmado_texto else 0.0)
            
            if result['firmado']:
                logger.info(f"✅ Firma detectada (confianza: {result['firma_confianza']:.2f})")
            
            # Registrar campos faltantes
            campos_requeridos = ['numero_guia', 'fecha_documento']
            for campo in campos_requeridos:
                if not result.get(campo):
                    result['campos_faltantes'].append(campo)
            
            if result['campos_faltantes']:
                result['ocr_status'] = 'partial'
            
            logger.info(f"Documento procesado. Guía: {result['numero_guia']}, Firmado: {result['firmado']}")
            return result
            
        except Exception as e:
            logger.error(f"Error procesando documento: {e}")
            result['ocr_status'] = 'error'
            result['campos_faltantes'].append(str(e))
            return result


def get_ocr_service() -> OCRService:
    """Factory para obtener servicio de OCR."""
    return OCRService()

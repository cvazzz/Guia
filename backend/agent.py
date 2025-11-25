"""
Agente principal de procesamiento de documentos.
Orquesta la lectura desde Drive, procesamiento OCR y guardado en Supabase.
"""
import logging
import time
from datetime import datetime
from pathlib import Path
from typing import Dict

from services.drive_service import get_drive_service, GoogleDriveService
from services.ocr_service import get_ocr_service, OCRService
from services.supabase_service import get_supabase_service, SupabaseService
from config.settings import DRIVE_POLLING_INTERVAL, LOGS_DIR

# Configurar logging
log_file = LOGS_DIR / f"agent_{datetime.now().strftime('%Y%m%d')}.log"
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler(log_file),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)


class DocumentProcessingAgent:
    """
    Agente que monitorea Google Drive y procesa documentos automáticamente.
    """
    
    def __init__(self):
        self.drive_service: GoogleDriveService = None
        self.ocr_service: OCRService = None
        self.supabase_service: SupabaseService = None
        self.running = False
        
    def initialize(self) -> bool:
        """Inicializa todos los servicios."""
        try:
            logger.info("Inicializando servicios...")
            
            # Conectar Google Drive
            logger.info("Conectando a Google Drive...")
            self.drive_service = get_drive_service()
            
            # Inicializar OCR
            logger.info("Inicializando EasyOCR...")
            self.ocr_service = get_ocr_service()
            
            # Conectar Supabase
            logger.info("Conectando a Supabase...")
            self.supabase_service = get_supabase_service()
            
            logger.info("Todos los servicios inicializados correctamente.")
            return True
            
        except Exception as e:
            logger.error(f"Error inicializando servicios: {e}")
            return False
    
    def process_file(self, file_info: Dict, local_path: Path):
        """
        Procesa un archivo individual.
        """
        file_id = file_info['id']
        file_name = file_info['name']
        
        log_entry = {
            'hora_lectura': datetime.now().isoformat(),
            'archivo': file_name,
            'drive_id': file_id,
            'estado_ocr': 'iniciando',
            'campos_faltantes': []
        }
        
        try:
            # Verificar si ya existe
            if self.supabase_service.document_exists(file_id):
                logger.info(f"Documento ya procesado: {file_name}")
                return
            
            # Procesar con OCR
            logger.info(f"Procesando OCR: {file_name}")
            ocr_result = self.ocr_service.process_document(local_path)
            
            log_entry['estado_ocr'] = ocr_result.get('ocr_status', 'unknown')
            log_entry['campos_faltantes'] = ocr_result.get('campos_faltantes', [])
            
            # Preparar datos para Supabase
            doc_data = {
                'drive_file_id': file_id,
                'drive_file_name': file_name,
                'drive_url': self.drive_service.get_file_url(file_id),
                'drive_embed_url': self.drive_service.get_file_embed_url(file_id),
                **ocr_result
            }
            
            # Convertir listas a formato compatible con Supabase
            for key in ['productos', 'cantidades', 'unidad_medida', 'dummy_phones', 'campos_faltantes']:
                if key in doc_data and doc_data[key]:
                    # Mantener como lista para arrays de PostgreSQL
                    pass
            
            # Guardar en Supabase
            logger.info(f"Guardando en Supabase: {file_name}")
            saved = self.supabase_service.save_document(doc_data)
            
            if saved:
                logger.info(f"✓ Documento procesado exitosamente: {file_name}")
                log_entry['guardado'] = True
            else:
                logger.error(f"✗ Error guardando documento: {file_name}")
                log_entry['guardado'] = False
            
        except Exception as e:
            logger.error(f"Error procesando {file_name}: {e}")
            log_entry['estado_ocr'] = 'error'
            log_entry['error'] = str(e)
        
        # Registrar log
        self._log_processing(log_entry)
    
    def _log_processing(self, log_entry: Dict):
        """Registra entrada de log de procesamiento."""
        log_line = (
            f"[{log_entry['hora_lectura']}] "
            f"Archivo: {log_entry['archivo']} | "
            f"Estado OCR: {log_entry['estado_ocr']} | "
            f"Campos faltantes: {', '.join(log_entry.get('campos_faltantes', [])) or 'Ninguno'}"
        )
        logger.info(log_line)
    
    def run(self, interval: int = None):
        """
        Ejecuta el agente de procesamiento en modo continuo.
        """
        interval = interval or DRIVE_POLLING_INTERVAL
        
        if not self.initialize():
            logger.error("No se pudo inicializar el agente. Abortando.")
            return
        
        self.running = True
        logger.info(f"Agente iniciado. Intervalo de monitoreo: {interval}s")
        
        while self.running:
            try:
                # Obtener archivos nuevos
                new_files = self.drive_service.get_new_files()
                
                if new_files:
                    logger.info(f"Detectados {len(new_files)} archivos nuevos.")
                    
                    for file_info in new_files:
                        # Descargar archivo
                        local_path = self.drive_service.download_file(
                            file_info['id'],
                            file_info['name']
                        )
                        
                        if local_path:
                            try:
                                # Procesar archivo
                                self.process_file(file_info, local_path)
                                # Marcar como procesado
                                self.drive_service.mark_as_processed(file_info['id'])
                            finally:
                                # Limpiar archivo temporal
                                if local_path.exists():
                                    local_path.unlink()
                                    logger.debug(f"Archivo temporal eliminado: {local_path}")
                else:
                    logger.debug("No hay archivos nuevos.")
                
                # Esperar hasta el próximo ciclo
                time.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("Agente detenido por el usuario.")
                self.running = False
            except Exception as e:
                logger.error(f"Error en ciclo de monitoreo: {e}")
                time.sleep(interval)
        
        logger.info("Agente finalizado.")
    
    def process_existing_files(self):
        """
        Procesa todos los archivos existentes en Drive (carga inicial).
        """
        if not self.initialize():
            logger.error("No se pudo inicializar el agente.")
            return
        
        logger.info("Iniciando procesamiento de archivos existentes...")
        
        files = self.drive_service.list_tif_files()
        total = len(files)
        processed = 0
        skipped = 0
        errors = 0
        
        for i, file_info in enumerate(files, 1):
            logger.info(f"Procesando {i}/{total}: {file_info['name']}")
            
            # Verificar si ya existe
            if self.supabase_service.document_exists(file_info['id']):
                logger.info(f"  → Ya existe, omitiendo.")
                skipped += 1
                continue
            
            # Descargar archivo
            local_path = self.drive_service.download_file(
                file_info['id'],
                file_info['name']
            )
            
            if local_path:
                try:
                    self.process_file(file_info, local_path)
                    processed += 1
                except Exception as e:
                    logger.error(f"  → Error: {e}")
                    errors += 1
                finally:
                    if local_path.exists():
                        local_path.unlink()
            else:
                errors += 1
        
        logger.info(f"""
        ========================================
        Procesamiento completado:
        - Total archivos: {total}
        - Procesados: {processed}
        - Omitidos (ya existían): {skipped}
        - Errores: {errors}
        ========================================
        """)
    
    def stop(self):
        """Detiene el agente."""
        self.running = False
        logger.info("Señal de parada enviada al agente.")


def main():
    """Punto de entrada principal."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description='Agente de procesamiento de documentos'
    )
    parser.add_argument(
        '--mode',
        choices=['monitor', 'batch'],
        default='monitor',
        help='Modo de ejecución: monitor (continuo) o batch (una vez)'
    )
    parser.add_argument(
        '--interval',
        type=int,
        default=DRIVE_POLLING_INTERVAL,
        help='Intervalo de monitoreo en segundos'
    )
    
    args = parser.parse_args()
    
    agent = DocumentProcessingAgent()
    
    if args.mode == 'batch':
        agent.process_existing_files()
    else:
        agent.run(interval=args.interval)


if __name__ == "__main__":
    main()

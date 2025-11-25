"""
Servicio de conexión y monitoreo de Google Drive.
Maneja autenticación, descarga de archivos TIF y monitoreo de carpeta.
"""
import os
import io
import time
import logging
from pathlib import Path
from typing import List, Dict, Optional, Callable
from datetime import datetime

from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload
from googleapiclient.errors import HttpError

from config.settings import (
    GOOGLE_DRIVE_FOLDER_ID,
    GOOGLE_CREDENTIALS_FILE,
    GOOGLE_TOKEN_FILE,
    TEMP_DIR,
    DRIVE_POLLING_INTERVAL
)

# Configurar logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Scopes necesarios para Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.readonly']


class GoogleDriveService:
    """Servicio para interactuar con Google Drive."""
    
    def __init__(self):
        self.creds = None
        self.service = None
        self.folder_id = GOOGLE_DRIVE_FOLDER_ID
        self.processed_files: set = set()
        
    def authenticate(self) -> bool:
        """
        Autentica con Google Drive API.
        Maneja tokens existentes y refresco de credenciales.
        """
        try:
            # Verificar si existe token guardado
            if os.path.exists(GOOGLE_TOKEN_FILE):
                self.creds = Credentials.from_authorized_user_file(
                    GOOGLE_TOKEN_FILE, SCOPES
                )
            
            # Si no hay credenciales válidas, autenticar
            if not self.creds or not self.creds.valid:
                if self.creds and self.creds.expired and self.creds.refresh_token:
                    logger.info("Refrescando token de Google Drive...")
                    self.creds.refresh(Request())
                else:
                    if not os.path.exists(GOOGLE_CREDENTIALS_FILE):
                        logger.error(f"No se encontró {GOOGLE_CREDENTIALS_FILE}")
                        return False
                    
                    logger.info("Iniciando flujo de autenticación OAuth...")
                    flow = InstalledAppFlow.from_client_secrets_file(
                        GOOGLE_CREDENTIALS_FILE, SCOPES
                    )
                    self.creds = flow.run_local_server(port=0)
                
                # Guardar token para uso futuro
                with open(GOOGLE_TOKEN_FILE, 'w') as token:
                    token.write(self.creds.to_json())
                logger.info("Token guardado exitosamente.")
            
            # Construir servicio
            self.service = build('drive', 'v3', credentials=self.creds)
            logger.info("Autenticación con Google Drive exitosa.")
            return True
            
        except Exception as e:
            logger.error(f"Error en autenticación: {str(e)}")
            return False
    
    def list_tif_files(self, folder_id: Optional[str] = None) -> List[Dict]:
        """
        Lista todos los archivos TIF en la carpeta especificada.
        """
        if not self.service:
            logger.error("Servicio no inicializado. Ejecute authenticate() primero.")
            return []
        
        folder_id = folder_id or self.folder_id
        files = []
        
        try:
            query = f"'{folder_id}' in parents and (mimeType='image/tiff' or name contains '.tif') and trashed=false"
            
            page_token = None
            while True:
                results = self.service.files().list(
                    q=query,
                    spaces='drive',
                    fields='nextPageToken, files(id, name, createdTime, modifiedTime, webViewLink, webContentLink, size)',
                    pageToken=page_token
                ).execute()
                
                files.extend(results.get('files', []))
                page_token = results.get('nextPageToken')
                
                if not page_token:
                    break
            
            logger.info(f"Se encontraron {len(files)} archivos TIF.")
            return files
            
        except HttpError as e:
            logger.error(f"Error al listar archivos: {str(e)}")
            return []
    
    def download_file(self, file_id: str, file_name: str) -> Optional[Path]:
        """
        Descarga un archivo de Google Drive a la carpeta temporal.
        """
        if not self.service:
            logger.error("Servicio no inicializado.")
            return None
        
        try:
            request = self.service.files().get_media(fileId=file_id)
            
            # Crear ruta de destino
            dest_path = TEMP_DIR / file_name
            
            fh = io.FileIO(dest_path, 'wb')
            downloader = MediaIoBaseDownload(fh, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
                if status:
                    logger.info(f"Descarga {file_name}: {int(status.progress() * 100)}%")
            
            fh.close()
            logger.info(f"Archivo descargado: {dest_path}")
            return dest_path
            
        except HttpError as e:
            logger.error(f"Error al descargar archivo {file_id}: {str(e)}")
            return None
    
    def get_file_url(self, file_id: str) -> str:
        """
        Genera URL para visualizar el archivo en Google Drive.
        """
        return f"https://drive.google.com/file/d/{file_id}/view"
    
    def get_file_embed_url(self, file_id: str) -> str:
        """
        Genera URL embebida para mostrar el archivo.
        Usa el visor de Google Docs que funciona mejor con TIF.
        """
        # Preview nativo de Drive
        return f"https://drive.google.com/file/d/{file_id}/preview"
    
    def get_file_thumbnail_url(self, file_id: str) -> str:
        """
        Genera URL para obtener thumbnail del archivo.
        """
        return f"https://drive.google.com/thumbnail?id={file_id}&sz=w800"
    
    def get_new_files(self) -> List[Dict]:
        """
        Obtiene archivos nuevos que aún no han sido procesados.
        """
        all_files = self.list_tif_files()
        new_files = [f for f in all_files if f['id'] not in self.processed_files]
        return new_files
    
    def mark_as_processed(self, file_id: str):
        """
        Marca un archivo como procesado.
        """
        self.processed_files.add(file_id)
    
    def monitor_folder(
        self, 
        callback: Callable[[Dict, Path], None],
        interval: int = None
    ):
        """
        Monitorea la carpeta de Drive y ejecuta callback para archivos nuevos.
        
        Args:
            callback: Función a ejecutar cuando se detecta un nuevo archivo.
                     Recibe (file_info, local_path)
            interval: Intervalo de polling en segundos.
        """
        interval = interval or DRIVE_POLLING_INTERVAL
        logger.info(f"Iniciando monitoreo de carpeta. Intervalo: {interval}s")
        
        while True:
            try:
                new_files = self.get_new_files()
                
                for file_info in new_files:
                    logger.info(f"Nuevo archivo detectado: {file_info['name']}")
                    
                    # Descargar archivo
                    local_path = self.download_file(
                        file_info['id'], 
                        file_info['name']
                    )
                    
                    if local_path:
                        try:
                            # Ejecutar callback
                            callback(file_info, local_path)
                            self.mark_as_processed(file_info['id'])
                        except Exception as e:
                            logger.error(f"Error procesando {file_info['name']}: {str(e)}")
                        finally:
                            # Limpiar archivo temporal
                            if local_path.exists():
                                local_path.unlink()
                
                time.sleep(interval)
                
            except KeyboardInterrupt:
                logger.info("Monitoreo detenido por el usuario.")
                break
            except Exception as e:
                logger.error(f"Error en monitoreo: {str(e)}")
                time.sleep(interval)


def get_drive_service() -> GoogleDriveService:
    """Factory para obtener servicio de Google Drive autenticado."""
    service = GoogleDriveService()
    if service.authenticate():
        return service
    raise Exception("No se pudo autenticar con Google Drive")

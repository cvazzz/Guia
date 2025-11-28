"""
Servicio para lectura de archivos Excel desde Google Drive
"""
import io
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from googleapiclient.discovery import build
from googleapiclient.http import MediaIoBaseDownload, MediaIoBaseUpload
from google.oauth2.credentials import Credentials
import pandas as pd

from config.settings import LDU_DRIVE_FOLDER_ID, GOOGLE_DRIVE_FOLDER_ID
from services.drive_service import GoogleDriveService


class ExcelDriveService:
    """Servicio para leer archivos Excel desde Google Drive"""
    
    def __init__(self):
        self.drive_service = GoogleDriveService()
        self.service = None
        self.ldu_folder_id = LDU_DRIVE_FOLDER_ID
        
    def _get_service(self):
        """Obtiene el servicio de Drive autenticado"""
        if self.service is None:
            # Autenticar si no está autenticado
            if self.drive_service.creds is None:
                self.drive_service.authenticate()
            self.service = build('drive', 'v3', credentials=self.drive_service.creds)
        return self.service
    
    def list_excel_files(self, folder_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Lista archivos Excel en una carpeta de Drive
        
        Args:
            folder_id: ID de la carpeta (usa LDU_DRIVE_FOLDER_ID por defecto)
            
        Returns:
            Lista de archivos con id, nombre, fecha de modificación
        """
        try:
            service = self._get_service()
            
            # Usar carpeta LDU por defecto
            target_folder = folder_id or self.ldu_folder_id
            
            # Buscar archivos Excel
            query_parts = [
                "(mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' OR "
                "mimeType='application/vnd.ms-excel' OR "
                "mimeType='application/vnd.google-apps.spreadsheet')"
            ]
            
            if target_folder:
                query_parts.append(f"'{target_folder}' in parents")
            
            query = " and ".join(query_parts)
            
            results = service.files().list(
                q=query,
                pageSize=50,
                fields="files(id, name, mimeType, modifiedTime, size)"
            ).execute()
            
            files = results.get('files', [])
            
            return [{
                'id': f['id'],
                'name': f['name'],
                'mimeType': f['mimeType'],
                'modifiedTime': f.get('modifiedTime'),
                'size': f.get('size', 0)
            } for f in files]
            
        except Exception as e:
            print(f"Error listando archivos Excel: {e}")
            raise
    
    def download_excel_file(self, file_id: str) -> bytes:
        """
        Descarga un archivo Excel de Drive
        
        Args:
            file_id: ID del archivo en Drive
            
        Returns:
            Contenido del archivo en bytes
        """
        try:
            service = self._get_service()
            
            # Obtener metadata del archivo
            file_metadata = service.files().get(fileId=file_id, fields='mimeType,name').execute()
            mime_type = file_metadata.get('mimeType', '')
            
            # Si es un Google Sheets, exportar como xlsx
            if mime_type == 'application/vnd.google-apps.spreadsheet':
                request = service.files().export_media(
                    fileId=file_id,
                    mimeType='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
                )
            else:
                # Descargar archivo normal
                request = service.files().get_media(fileId=file_id)
            
            file_buffer = io.BytesIO()
            downloader = MediaIoBaseDownload(file_buffer, request)
            
            done = False
            while not done:
                status, done = downloader.next_chunk()
            
            file_buffer.seek(0)
            return file_buffer.read()
            
        except Exception as e:
            print(f"Error descargando archivo Excel {file_id}: {e}")
            raise
    
    def read_excel_to_dataframe(
        self, 
        file_id: str, 
        sheet_name: Optional[str] = None,
        header_row: int = 0
    ) -> pd.DataFrame:
        """
        Lee un archivo Excel de Drive y lo convierte a DataFrame
        
        Args:
            file_id: ID del archivo en Drive
            sheet_name: Nombre de la hoja (opcional, usa la primera)
            header_row: Fila del encabezado (0-indexed)
            
        Returns:
            DataFrame con los datos del Excel
        """
        try:
            content = self.download_excel_file(file_id)
            
            # Leer Excel con pandas
            df = pd.read_excel(
                io.BytesIO(content),
                sheet_name=sheet_name if sheet_name else 0,
                header=header_row
            )
            
            return df
            
        except Exception as e:
            print(f"Error leyendo Excel a DataFrame: {e}")
            raise
    
    def read_ldu_excel(self, file_id: str) -> Dict[str, Any]:
        """
        Lee un archivo Excel de LDU y retorna datos estructurados
        
        Args:
            file_id: ID del archivo en Drive
            
        Returns:
            Dict con:
                - 'data': Lista de diccionarios con cada fila
                - 'columns': Lista de columnas originales
                - 'total_rows': Total de filas
                - 'file_id': ID del archivo
        """
        try:
            df = self.read_excel_to_dataframe(file_id)
            
            # Normalizar nombres de columnas (strip, lowercase para comparación)
            df.columns = df.columns.str.strip()
            
            # Mapeo de columnas esperadas
            expected_columns = [
                'City', 'Canal', 'Tipo', 'POS_vv', 'Name_Ruta', 
                'HC_Real', 'DNI', 'Last_Name', 'First_Name', 
                'MODEL', 'IMEI', 'REG', 'OK', 'USO', 'OBSERVATION'
            ]
            
            # Verificar columnas presentes
            missing_columns = []
            column_mapping = {}
            
            for expected in expected_columns:
                # Buscar coincidencia case-insensitive
                found = None
                for col in df.columns:
                    if col.lower() == expected.lower():
                        found = col
                        break
                
                if found:
                    column_mapping[expected] = found
                else:
                    missing_columns.append(expected)
            
            # Convertir a lista de diccionarios con número de fila
            rows = []
            for idx, row in df.iterrows():
                row_dict = {
                    '_row_number': idx + 2,  # +2 porque idx es 0-based y hay header
                    '_raw_row': row.to_dict()
                }
                
                # Agregar columnas mapeadas
                for expected, actual in column_mapping.items():
                    value = row.get(actual)
                    # Convertir NaN a None
                    if pd.isna(value):
                        value = None
                    elif isinstance(value, float) and value == int(value):
                        value = int(value)
                    row_dict[expected] = value
                
                rows.append(row_dict)
            
            return {
                'data': rows,
                'columns': list(df.columns),
                'expected_columns': expected_columns,
                'missing_columns': missing_columns,
                'column_mapping': column_mapping,
                'total_rows': len(rows),
                'file_id': file_id
            }
            
        except Exception as e:
            print(f"Error leyendo Excel LDU: {e}")
            raise
    
    def get_file_info(self, file_id: str) -> Dict[str, Any]:
        """
        Obtiene información de un archivo
        
        Args:
            file_id: ID del archivo
            
        Returns:
            Dict con metadata del archivo
        """
        try:
            service = self._get_service()
            
            file = service.files().get(
                fileId=file_id,
                fields='id,name,mimeType,modifiedTime,size,owners,createdTime'
            ).execute()
            
            return {
                'id': file.get('id'),
                'name': file.get('name'),
                'mimeType': file.get('mimeType'),
                'modifiedTime': file.get('modifiedTime'),
                'createdTime': file.get('createdTime'),
                'size': file.get('size', 0),
                'owners': file.get('owners', [])
            }
            
        except Exception as e:
            print(f"Error obteniendo info del archivo: {e}")
            raise

    def upload_file(
        self, 
        file_content: bytes, 
        filename: str, 
        mime_type: str = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        folder_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sube un archivo a la carpeta LDU en Drive
        
        Args:
            file_content: Contenido del archivo en bytes
            filename: Nombre del archivo
            mime_type: Tipo MIME del archivo
            folder_id: ID de carpeta destino (usa LDU_DRIVE_FOLDER_ID por defecto)
            
        Returns:
            Dict con info del archivo subido
        """
        try:
            service = self._get_service()
            target_folder = folder_id or self.ldu_folder_id
            
            file_metadata = {
                'name': filename,
                'parents': [target_folder] if target_folder else []
            }
            
            media = MediaIoBaseUpload(
                io.BytesIO(file_content),
                mimetype=mime_type,
                resumable=True
            )
            
            file = service.files().create(
                body=file_metadata,
                media_body=media,
                fields='id,name,webViewLink,webContentLink'
            ).execute()
            
            return {
                'id': file.get('id'),
                'name': file.get('name'),
                'webViewLink': file.get('webViewLink'),
                'webContentLink': file.get('webContentLink')
            }
            
        except Exception as e:
            print(f"Error subiendo archivo a Drive: {e}")
            raise

    def update_file(
        self, 
        file_id: str,
        file_content: bytes, 
        mime_type: str = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ) -> Dict[str, Any]:
        """
        Actualiza el contenido de un archivo existente en Drive
        
        Args:
            file_id: ID del archivo a actualizar
            file_content: Nuevo contenido del archivo en bytes
            mime_type: Tipo MIME del archivo
            
        Returns:
            Dict con info del archivo actualizado
        """
        try:
            from googleapiclient.http import MediaIoBaseUpload
            
            service = self._get_service()
            
            media = MediaIoBaseUpload(
                io.BytesIO(file_content),
                mimetype=mime_type,
                resumable=True
            )
            
            file = service.files().update(
                fileId=file_id,
                media_body=media,
                fields='id,name,modifiedTime,webViewLink'
            ).execute()
            
            return {
                'id': file.get('id'),
                'name': file.get('name'),
                'modifiedTime': file.get('modifiedTime'),
                'webViewLink': file.get('webViewLink')
            }
            
        except Exception as e:
            print(f"Error actualizando archivo en Drive: {e}")
            raise


# Instancia singleton
excel_drive_service = ExcelDriveService()

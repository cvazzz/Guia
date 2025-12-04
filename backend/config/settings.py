"""
Configuración central del sistema de automatización documental.
"""
import os
import json
import tempfile
from pathlib import Path
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

# Rutas base
BASE_DIR = Path(__file__).resolve().parent.parent
TEMP_DIR = BASE_DIR / "temp"
LOGS_DIR = BASE_DIR / "logs"

# Crear directorios si no existen
TEMP_DIR.mkdir(exist_ok=True)
LOGS_DIR.mkdir(exist_ok=True)

# Google Drive Configuration
GOOGLE_DRIVE_FOLDER_ID = os.getenv("GOOGLE_DRIVE_FOLDER_ID", "")

# Soporte para credenciales desde variable de entorno (para Render/producción)
GOOGLE_CREDENTIALS_JSON = os.getenv("GOOGLE_CREDENTIALS_JSON", "")
GOOGLE_TOKEN_JSON = os.getenv("GOOGLE_TOKEN_JSON", "")

if GOOGLE_CREDENTIALS_JSON:
    # Crear archivo temporal con las credenciales
    creds_path = Path(tempfile.gettempdir()) / "google_credentials.json"
    creds_path.write_text(GOOGLE_CREDENTIALS_JSON)
    GOOGLE_CREDENTIALS_FILE = str(creds_path)
else:
    GOOGLE_CREDENTIALS_FILE = os.getenv("GOOGLE_CREDENTIALS_FILE", "credentials.json")

if GOOGLE_TOKEN_JSON:
    # Crear archivo temporal con el token
    token_path = Path(tempfile.gettempdir()) / "google_token.json"
    token_path.write_text(GOOGLE_TOKEN_JSON)
    GOOGLE_TOKEN_FILE = str(token_path)
else:
    GOOGLE_TOKEN_FILE = os.getenv("GOOGLE_TOKEN_FILE", "token.json")

# Carpeta específica para archivos LDU
LDU_DRIVE_FOLDER_ID = os.getenv("LDU_DRIVE_FOLDER_ID", "1XS0zv5Q6oj-Z7nZqyg9a8zcomLhndhjk")

# Supabase Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_KEY", "")
SUPABASE_TABLE = os.getenv("SUPABASE_TABLE", "documentos_guia")

# OCR Configuration
OCR_LANGUAGES = ["es", "en"]
OCR_GPU = os.getenv("OCR_GPU", "False").lower() == "true"

# Campos a extraer del documento
CAMPOS_DOCUMENTO = [
    "numero_guia",
    "fecha_documento",
    "proveedor",
    "direccion_destino",
    "productos",
    "cantidades",
    "unidad_medida",
    "firmado",
    "nombre_firmante",
    "observaciones",
    "numero_paginas",
    "codigo_interno",
    "dummy_phones",
    "transportista",
    "ruc",
    "direccion_remitente",
    "placa"
]

# Dummy phones conocidos para detección
DUMMY_PHONES = [
    "V60 Lite", "Y21D", "Y35", "Y55", "Y22s", "Y16", 
    "Y02s", "Y02t", "T1", "T2x", "X90", "X80"
]

# API Configuration
API_HOST = os.getenv("API_HOST", "0.0.0.0")
API_PORT = int(os.getenv("API_PORT", "8000"))

# Polling interval (segundos)
DRIVE_POLLING_INTERVAL = int(os.getenv("DRIVE_POLLING_INTERVAL", "60"))

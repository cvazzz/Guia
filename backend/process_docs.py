"""Script para procesar documentos TIF con OCR y guardar en Supabase"""
import sys
sys.path.insert(0, '.')

from services.drive_service import get_drive_service
from services.ocr_service import get_ocr_service
from services.supabase_service import get_supabase_service

# Cantidad de documentos a procesar (para prueba)
LIMIT = 3

print("=" * 60)
print("  PROCESADOR DE DOCUMENTOS - GUÍAS DE REMISIÓN")
print("=" * 60)

# Inicializar servicios
print("\n📁 Conectando a Google Drive...")
drive = get_drive_service()

print("🔍 Inicializando OCR (esto puede tardar la primera vez)...")
ocr = get_ocr_service()

print("💾 Conectando a Supabase...")
db = get_supabase_service()

# Listar archivos
print(f"\n📄 Obteniendo archivos TIF...")
files = drive.list_tif_files()
print(f"   Encontrados: {len(files)} archivos")

# Procesar
print(f"\n🚀 Procesando los primeros {LIMIT} documentos...\n")

for i, file_info in enumerate(files[:LIMIT], 1):
    file_id = file_info['id']
    file_name = file_info['name']
    
    print(f"[{i}/{LIMIT}] Procesando: {file_name}")
    
    # Verificar si ya existe
    if db.document_exists(file_id):
        print(f"   ⏭️  Ya existe en la base de datos, omitiendo...")
        continue
    
    # Descargar archivo
    print(f"   ⬇️  Descargando...")
    local_path = drive.download_file(file_id, file_name)
    
    if not local_path:
        print(f"   ❌ Error al descargar")
        continue
    
    # Procesar OCR
    print(f"   🔍 Extrayendo texto con OCR...")
    ocr_result = ocr.process_document(local_path)
    
    # Preparar datos
    doc_data = {
        'drive_file_id': file_id,
        'drive_file_name': file_name,
        'drive_url': drive.get_file_url(file_id),
        'drive_embed_url': drive.get_file_embed_url(file_id),
        **ocr_result
    }
    
    # Guardar en Supabase
    print(f"   💾 Guardando en base de datos...")
    saved = db.save_document(doc_data)
    
    if saved:
        print(f"   ✅ Completado! Guía: {ocr_result.get('numero_guia', 'No detectada')}")
    else:
        print(f"   ❌ Error al guardar")
    
    # Limpiar archivo temporal
    if local_path.exists():
        local_path.unlink()
    
    print()

print("=" * 60)
print("  ¡PROCESAMIENTO COMPLETADO!")
print("  Abre http://localhost:3000 para ver los documentos")
print("=" * 60)

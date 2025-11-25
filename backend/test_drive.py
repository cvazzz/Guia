"""Script para probar la conexión a Google Drive"""
import sys
sys.path.insert(0, '.')

from services.drive_service import get_drive_service

print("Conectando a Google Drive...")
service = get_drive_service()

print("Listando archivos TIF...")
files = service.list_tif_files()

print(f"\n✅ Archivos TIF encontrados: {len(files)}\n")

for f in files[:10]:
    print(f"  - {f['name']} (ID: {f['id']})")

if len(files) > 10:
    print(f"\n  ... y {len(files) - 10} más")

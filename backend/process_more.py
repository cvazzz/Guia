#!/usr/bin/env python3
"""Procesa más documentos para validar la detección."""

import os
import sys
sys.stdout.reconfigure(encoding='utf-8')

from services.drive_service import get_drive_service
from services.ocr_service import OCRService
from services.supabase_service import SupabaseService

def main():
    print("=" * 60)
    print("  PROCESANDO MÁS DOCUMENTOS")
    print("=" * 60)
    
    # Obtener servicios
    drive_service = get_drive_service()
    supabase_service = SupabaseService()
    
    # Obtener archivos
    files = drive_service.list_tif_files()
    print(f"\n📁 Total archivos en Drive: {len(files)}")
    
    # Inicializar OCR
    print("🔍 Inicializando OCR...")
    ocr = OCRService()
    
    # Procesar 10 documentos (saltando los ya procesados)
    processed = 0
    skipped = 0
    target = 10
    
    for file in files:
        if processed >= target:
            break
            
        # Verificar si ya existe
        existing = supabase_service.get_document_by_drive_id(file['id'])
        if existing:
            skipped += 1
            continue
        
        print(f"\n[{processed + 1}/{target}] Procesando: {file['name']}")
        
        # Descargar
        temp_path = drive_service.download_file(file['id'], file['name'])
        if not temp_path:
            print("  ❌ Error al descargar")
            continue
        
        try:
            # Procesar con OCR
            result = ocr.process_document(temp_path)
            result['drive_file_id'] = file['id']
            result['drive_file_name'] = file['name']
            result['drive_url'] = drive_service.get_file_url(file['id'])
            result['drive_embed_url'] = drive_service.get_file_embed_url(file['id'])
            
            # Guardar
            supabase_service.save_document(result)
            
            # Mostrar resumen
            productos = result.get('productos', [])
            cantidades = result.get('cantidades', [])
            print(f"  ✅ Guía: {result.get('numero_guia')}")
            print(f"     Productos: {len(productos)}")
            for i, (prod, cant) in enumerate(zip(productos, cantidades)):
                print(f"       {i+1}. {prod[:40]}... x{cant}")
            
            processed += 1
            
        finally:
            # Limpiar
            if os.path.exists(temp_path):
                os.remove(temp_path)
    
    print(f"\n" + "=" * 60)
    print(f"  COMPLETADO: {processed} nuevos, {skipped} ya existían")
    print("=" * 60)

if __name__ == "__main__":
    main()

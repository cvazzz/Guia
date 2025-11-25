"""Script para limpiar y reprocesar documentos con OCR mejorado."""
from services.supabase_service import SupabaseService

# Conectar a Supabase
s = SupabaseService()

# Eliminar todos los documentos existentes
print("🗑️  Eliminando documentos de prueba anteriores...")
result = s.client.table('documentos_guia').delete().neq('id', 0).execute()
print(f"   Documentos eliminados: {len(result.data) if result.data else 'todos'}")

print("\n✅ Listo para reprocesar con OCR mejorado!")
print("   Ejecuta: python process_docs.py")

"""Script para revisar los documentos procesados."""
from services.supabase_service import SupabaseService

s = SupabaseService()
docs = s.client.table('documentos_guia').select('numero_guia,firmado,nombre_firmante,raw_text').execute()

for d in docs.data:
    print("=" * 60)
    print(f"GUIA: {d['numero_guia']}")
    print(f"Firmado: {d['firmado']}")
    print(f"Firmante: {d['nombre_firmante']}")
    print("-" * 40)
    print("TEXTO EXTRAÍDO:")
    print(d['raw_text'][:2000] if d['raw_text'] else "Sin texto")
    print("\n")

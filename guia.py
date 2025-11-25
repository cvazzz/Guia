"""
Script de inicio rápido para el Sistema de Guías de Remisión.
Ejecutar este archivo para iniciar todos los servicios.
"""
import subprocess
import sys
import os
from pathlib import Path

BASE_DIR = Path(__file__).parent


def check_dependencies():
    """Verifica que las dependencias estén instaladas."""
    print("🔍 Verificando dependencias...")
    
    # Verificar Python
    try:
        import easyocr
        import supabase
        import fastapi
        print("  ✅ Dependencias Python instaladas")
    except ImportError as e:
        print(f"  ❌ Faltan dependencias Python: {e}")
        print("     Ejecute: pip install -r backend/requirements.txt")
        return False
    
    return True


def start_agent():
    """Inicia el agente de procesamiento."""
    print("\n🚀 Iniciando agente de procesamiento...")
    agent_path = BASE_DIR / "backend" / "agent.py"
    subprocess.run([sys.executable, str(agent_path), "--mode", "monitor"])


def start_api():
    """Inicia la API REST."""
    print("\n🌐 Iniciando API REST...")
    api_path = BASE_DIR / "backend" / "api.py"
    subprocess.run([sys.executable, str(api_path)])


def process_batch():
    """Procesa todos los archivos existentes."""
    print("\n📄 Procesando archivos existentes...")
    agent_path = BASE_DIR / "backend" / "agent.py"
    subprocess.run([sys.executable, str(agent_path), "--mode", "batch"])


def show_help():
    """Muestra ayuda de uso."""
    print("""
╔══════════════════════════════════════════════════════════════╗
║           Sistema de Guías de Remisión                       ║
║           Automatización Documental con OCR                  ║
╚══════════════════════════════════════════════════════════════╝

Uso: python guia.py [comando]

Comandos disponibles:
  agent     - Iniciar monitoreo continuo de Google Drive
  api       - Iniciar servidor API REST
  batch     - Procesar todos los archivos existentes
  check     - Verificar dependencias
  help      - Mostrar esta ayuda

Ejemplos:
  python guia.py agent    # Monitoreo continuo
  python guia.py batch    # Procesar archivos existentes
  python guia.py api      # Iniciar API

Para el frontend (en otra terminal):
  cd frontend
  npm install
  npm run dev

Documentación completa: README.md
    """)


def main():
    """Punto de entrada principal."""
    if len(sys.argv) < 2:
        show_help()
        return
    
    command = sys.argv[1].lower()
    
    if command == "agent":
        if check_dependencies():
            start_agent()
    elif command == "api":
        if check_dependencies():
            start_api()
    elif command == "batch":
        if check_dependencies():
            process_batch()
    elif command == "check":
        check_dependencies()
    elif command == "help":
        show_help()
    else:
        print(f"❌ Comando desconocido: {command}")
        show_help()


if __name__ == "__main__":
    main()

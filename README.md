# 📄 Sistema de Gestión de Guías de Remisión

Sistema completo de automatización documental que lee documentos TIF desde Google Drive, procesa OCR con EasyOCR, almacena en Supabase y proporciona una interfaz web moderna para consultas.

## 🏗️ Arquitectura

```
Google Drive → Agente OCR (EasyOCR) → Supabase → Web App (Next.js)
```

## 📁 Estructura del Proyecto

```
guia/
├── backend/
│   ├── config/
│   │   ├── __init__.py
│   │   └── settings.py          # Configuración central
│   ├── services/
│   │   ├── __init__.py
│   │   ├── drive_service.py     # Conexión Google Drive
│   │   ├── ocr_service.py       # Procesamiento OCR
│   │   └── supabase_service.py  # Base de datos Supabase
│   ├── agent.py                 # Agente de procesamiento automático
│   ├── api.py                   # API REST FastAPI
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── Header.tsx
│   │   │   ├── StatsCards.tsx
│   │   │   ├── SearchFilters.tsx
│   │   │   ├── DocumentCard.tsx
│   │   │   └── DocumentViewer.tsx
│   │   ├── hooks/
│   │   │   ├── useDocuments.ts
│   │   │   └── useStats.ts
│   │   ├── lib/
│   │   │   ├── supabase.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       └── index.ts
│   ├── package.json
│   ├── tailwind.config.js
│   └── .env.example
└── README.md
```

## 🚀 Instalación

### Requisitos Previos

- Python 3.9+
- Node.js 18+
- Cuenta de Google Cloud (para Drive API)
- Cuenta de Supabase

### 1. Configurar Supabase

1. Crear un proyecto en [Supabase](https://supabase.com)
2. En el SQL Editor, ejecutar el siguiente script:

```sql
CREATE TABLE IF NOT EXISTS documentos_guia (
    id BIGSERIAL PRIMARY KEY,
    drive_file_id TEXT UNIQUE NOT NULL,
    drive_file_name TEXT,
    drive_url TEXT,
    drive_embed_url TEXT,
    
    numero_guia TEXT,
    fecha_documento TEXT,
    proveedor TEXT,
    direccion_destino TEXT,
    productos TEXT[],
    cantidades TEXT[],
    unidad_medida TEXT[],
    firmado BOOLEAN DEFAULT FALSE,
    nombre_firmante TEXT,
    observaciones TEXT,
    numero_paginas INTEGER DEFAULT 1,
    codigo_interno TEXT,
    dummy_phones TEXT[],
    transportista TEXT,
    ruc TEXT,
    direccion_remitente TEXT,
    placa TEXT,
    
    raw_text TEXT,
    ocr_status TEXT DEFAULT 'pending',
    campos_faltantes TEXT[],
    
    procesado_en TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_numero_guia ON documentos_guia(numero_guia);
CREATE INDEX IF NOT EXISTS idx_fecha_documento ON documentos_guia(fecha_documento);
CREATE INDEX IF NOT EXISTS idx_proveedor ON documentos_guia(proveedor);
CREATE INDEX IF NOT EXISTS idx_firmado ON documentos_guia(firmado);

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_documentos_guia_updated_at
    BEFORE UPDATE ON documentos_guia
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- RLS
ALTER TABLE documentos_guia ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Permitir lectura pública" ON documentos_guia
    FOR SELECT USING (true);

CREATE POLICY "Permitir escritura" ON documentos_guia
    FOR ALL USING (true);
```

3. Copiar URL del proyecto y anon key desde Settings > API

### 2. Configurar Google Drive API

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un proyecto nuevo
3. Habilitar Google Drive API
4. Crear credenciales OAuth 2.0 (Desktop app)
5. Descargar `credentials.json` y colocarlo en `backend/`
6. Obtener el ID de la carpeta de Drive donde están los TIFs:
   - Abrir la carpeta en Drive
   - El ID está en la URL: `https://drive.google.com/drive/folders/[FOLDER_ID]`

### 3. Configurar Backend

```bash
cd backend

# Crear entorno virtual
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Instalar dependencias
pip install -r requirements.txt

# Configurar variables de entorno
copy .env.example .env
# Editar .env con tus credenciales
```

Editar `backend/.env`:
```env
GOOGLE_DRIVE_FOLDER_ID=tu_folder_id
SUPABASE_URL=https://tu-proyecto.supabase.co
SUPABASE_KEY=tu_anon_key
OCR_GPU=False
```

### 4. Configurar Frontend

```bash
cd frontend

# Instalar dependencias
npm install

# Configurar variables de entorno
copy .env.example .env.local
# Editar .env.local con tus credenciales
```

Editar `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

## ▶️ Ejecución

### Iniciar el Agente de Procesamiento

```bash
cd backend
python agent.py --mode monitor
```

Opciones:
- `--mode monitor`: Monitoreo continuo (cada 60 segundos)
- `--mode batch`: Procesar archivos existentes una vez
- `--interval 30`: Cambiar intervalo de monitoreo

### Iniciar la API (opcional)

```bash
cd backend
python api.py
```

La API estará disponible en `http://localhost:8000`

### Iniciar el Frontend

```bash
cd frontend
npm run dev
```

La aplicación estará en `http://localhost:3000`

## 📋 Campos Extraídos

El sistema extrae automáticamente:

| Campo | Descripción |
|-------|-------------|
| `numero_guia` | Número de guía de remisión |
| `fecha_documento` | Fecha del documento |
| `proveedor` | Nombre del proveedor |
| `direccion_destino` | Dirección de destino |
| `productos` | Lista de productos |
| `cantidades` | Cantidades por producto |
| `unidad_medida` | Unidad de medida |
| `firmado` | Si está firmado (sí/no) |
| `nombre_firmante` | Nombre de quien firmó |
| `observaciones` | Observaciones del documento |
| `numero_paginas` | Cantidad de páginas |
| `codigo_interno` | Código correlativo |
| `dummy_phones` | Productos dummy phone detectados |
| `transportista` | Nombre del transportista |
| `ruc` | RUC del proveedor |
| `placa` | Placa del vehículo |

## 🔍 Funcionalidades de Búsqueda

- Búsqueda por número de guía
- Filtro por rango de fechas
- Filtro por proveedor
- Búsqueda por producto
- Filtro por dummy phones específicos
- Filtro por estado de firma
- Búsqueda de texto libre en todo el documento

## 🔄 Actualizaciones en Tiempo Real

La plataforma web se actualiza automáticamente:
- Suscripción a cambios de Supabase (realtime)
- Refresh automático cada 30 segundos
- Botón de sincronización manual

## 📝 Logs

Los logs de procesamiento se guardan en `backend/logs/` con formato:
```
[2025-11-25T10:30:00] Archivo: guia_001.tif | Estado OCR: success | Campos faltantes: Ninguno
```

## 🛠️ Optimización de OCR

El sistema incluye:
- Preprocesamiento de imagen (contraste, ruido, deskew)
- Soporte para TIF multipágina
- Limpieza de artefactos de OCR
- Patrones regex para extracción de campos

## 📱 Responsive

La interfaz web es completamente responsive:
- Desktop: Vista de grilla completa
- Tablet: 2 columnas
- Móvil: 1 columna con menú hamburguesa

## 🔧 API Endpoints

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET | `/api/documentos` | Listar documentos |
| GET | `/api/documentos/{id}` | Obtener documento por ID |
| POST | `/api/documentos/buscar` | Buscar con filtros |
| GET | `/api/estadisticas` | Obtener estadísticas |
| GET | `/api/proveedores` | Listar proveedores |
| POST | `/api/sync/trigger` | Disparar sincronización |

## 🤝 Contribución

1. Fork el repositorio
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -m 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Abrir Pull Request

## 📄 Licencia

MIT License - ver [LICENSE](LICENSE) para detalles.

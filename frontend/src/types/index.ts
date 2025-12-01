export interface Documento {
  id: number
  drive_file_id: string
  drive_file_name: string | null
  drive_url: string | null
  drive_embed_url: string | null
  numero_guia: string | null
  fecha_documento: string | null
  fecha_traslado: string | null
  motivo_traslado: string | null
  proveedor: string | null
  ruc: string | null
  direccion_remitente: string | null
  direccion_origen: string | null
  destinatario_nombre: string | null
  destinatario_ruc: string | null
  destinatario_contacto: string | null
  destinatario_telefono: string | null
  direccion_destino: string | null
  productos: string[] | null
  codigos_producto: string[] | null
  cantidades: string[] | null
  unidad_medida: string[] | null
  transportista: string | null
  dni_conductor: string | null
  licencia_conductor: string | null
  placa: string | null
  peso_bruto: string | null
  numero_bultos: string | null
  modalidad_transporte: string | null
  firmado: boolean
  firma_confianza: number | null
  nombre_firmante: string | null
  observaciones: string | null
  numero_paginas: number
  codigo_interno: string | null
  raw_text: string | null
  ocr_status: string
  campos_faltantes: string[] | null
  procesado_en: string | null
  created_at: string | null
  updated_at: string | null
  notas: string | null
  revisado: boolean
}

export interface SearchParams {
  numero_guia?: string
  fecha_desde?: string
  fecha_hasta?: string
  proveedor?: string
  producto?: string
  productos_seleccionados?: string[]
  palabra_clave?: string
  transportista?: string
  placa?: string
  firmado?: boolean
  limit?: number
  offset?: number
}

export interface Stats {
  total_documentos: number
  documentos_firmados: number
  documentos_no_firmados: number
  documentos_con_errores: number
  proveedores_unicos: number
}

export interface ApiResponse<T> {
  data: T
  error?: string
}

// ==================== TIPOS LDU ====================

export interface LDURegistro {
  id: string
  imei: string
  modelo: string | null
  
  // Campos de cuenta y ubicación
  account: string | null           // Account (CLARO, OM, etc.)
  account_int: string | null       // Account_int (CLARO, RETAIL, PLAZA VEA, etc.)
  supervisor: string | null        // Supervisor asignado
  zone: string | null              // Zona (Lima 2, etc.)
  departamento: string | null      // Departamento
  city: string | null              // Ciudad
  
  // Campos de punto de venta
  canal: string | null             // Canal (Cac, Retail, Plaza Vea)
  tipo: string | null              // Tipo (Fijo, Ruta)
  punto_venta: string | null       // POS_vv
  nombre_ruta: string | null       // Name_Ruta
  cobertura_valor: number | null   // HC_Real
  
  // Campos de control
  campo_reg: string | null         // REG
  campo_ok: string | null          // OK
  uso: string | null               // USO
  observaciones: string | null     // OBSERVATION
  
  // Estado del dispositivo
  estado: string
  estado_anterior: string | null
  
  // Responsable
  responsable_dni: string | null   // DNI
  responsable_nombre: string | null // First_Name
  responsable_apellido: string | null // Last_Name
  
  // Campos legacy para compatibilidad
  region: string | null
  raw_row: Record<string, any> | null
  raw_excel_reference: string | null
  archivo_origen_id: string | null
  fila_origen: number | null
  presente_en_ultima_importacion: boolean
  fecha_ultima_verificacion: string | null
  fecha_registro: string
  fecha_actualizacion: string
  activo: boolean
  
  // Campos de sincronización con Drive
  drive_file_id: string | null
  drive_sheet_name: string | null
  drive_row_index: number | null
}

export interface LDUResponsable {
  id: string
  dni: string
  nombre: string | null
  apellido: string | null
  nombre_completo: string | null
  cargo: string | null
  estado: string
  fecha_ingreso: string | null
  fecha_cese: string | null
  supervisor_dni: string | null
  region: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface LDUImportacion {
  id: string
  archivo_id: string
  archivo_nombre: string | null
  total_filas: number
  insertados: number
  actualizados: number
  invalidos: number
  sin_cambios: number
  marcados_ausentes: number
  estado: 'en_proceso' | 'completado' | 'error' | 'cancelado'
  mensaje_error: string | null
  fecha_inicio: string
  fecha_fin: string | null
  duracion_segundos: number | null
  usuario_ejecutor: string
  resumen: Record<string, any> | null
}

export interface LDUAuditoria {
  id: string
  imei: string
  accion: string
  usuario_sistema: string
  fecha_hora: string
  archivo_origen: string | null
  fila_numero: number | null
  modulo_origen: string | null
  campos_previos: Record<string, any> | null
  campos_nuevos: Record<string, any> | null
  raw_row: Record<string, any> | null
  comentarios: string | null
  operacion_id: string | null
  importacion_id: string | null
}

export interface LDUHistorialResponsable {
  id: string
  ldu_imei: string
  responsable_anterior_dni: string | null
  responsable_anterior_nombre: string | null
  responsable_nuevo_dni: string | null
  responsable_nuevo_nombre: string | null
  motivo: string
  comentarios: string | null
  usuario_cambio: string
  fecha_cambio: string
  importacion_id: string | null
}

export interface LDUImportError {
  id: string
  importacion_id: string
  archivo_id: string
  fila_numero: number | null
  tipo_error: string
  mensaje_error: string
  raw_row: Record<string, any> | null
  imei_intentado: string | null
  fecha_error: string
}

export interface LDUStats {
  total: number
  sin_responsable: number
  ausentes_ultimo_excel: number
  por_estado?: Record<string, number>
  por_region?: Record<string, number>
}

export interface LDUSearchParams {
  query?: string
  imei?: string
  dni?: string
  region?: string
  punto_venta?: string
  estado?: string
  responsable?: string
  presente?: boolean
  page?: number
  limit?: number
}

export interface ExcelFile {
  id: string
  name: string
  mimeType: string
  modifiedTime: string
  size: number
}

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

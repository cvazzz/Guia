import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const getDocuments = async (limit = 50, offset = 0) => {
  const { data, error } = await supabase
    .from('documentos_guia')
    .select('*')
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  if (error) throw error
  return data
}

export const getDocumentById = async (id: number) => {
  const { data, error } = await supabase
    .from('documentos_guia')
    .select('*')
    .eq('id', id)
    .single()
  
  if (error) throw error
  return data
}

export const searchDocuments = async (params: {
  numero_guia?: string
  fecha_desde?: string
  fecha_hasta?: string
  proveedor?: string
  producto?: string
  productos_seleccionados?: string[]
  palabra_clave?: string
  transportista?: string
  firmado?: boolean
  limit?: number
  offset?: number
}) => {
  let query = supabase
    .from('documentos_guia')
    .select('*')
  
  if (params.numero_guia) {
    query = query.ilike('numero_guia', `%${params.numero_guia}%`)
  }
  
  if (params.fecha_desde) {
    query = query.gte('fecha_documento', params.fecha_desde)
  }
  
  if (params.fecha_hasta) {
    query = query.lte('fecha_documento', params.fecha_hasta)
  }
  
  if (params.proveedor) {
    query = query.ilike('proveedor', `%${params.proveedor}%`)
  }
  
  if (params.producto) {
    // Buscar en el texto de productos (funciona con arrays convertidos a texto)
    query = query.or(`productos.cs.{"${params.producto}"},raw_text.ilike.%${params.producto}%`)
  }
  
  // Múltiples productos seleccionados con checkbox
  if (params.productos_seleccionados && params.productos_seleccionados.length > 0) {
    const productFilters = params.productos_seleccionados
      .map(p => `raw_text.ilike.%${p}%`)
      .join(',')
    query = query.or(productFilters)
  }
  
  if (params.palabra_clave) {
    query = query.ilike('raw_text', `%${params.palabra_clave}%`)
  }
  
  if (params.transportista) {
    query = query.ilike('transportista', `%${params.transportista}%`)
  }
  
  if (params.firmado !== undefined) {
    query = query.eq('firmado', params.firmado)
  }
  
  const limit = params.limit || 50
  const offset = params.offset || 0
  
  query = query
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)
  
  const { data, error } = await query
  
  if (error) throw error
  return data
}

export const getStats = async () => {
  const [total, firmados, errores] = await Promise.all([
    supabase.from('documentos_guia').select('id', { count: 'exact', head: true }),
    supabase.from('documentos_guia').select('id', { count: 'exact', head: true }).eq('firmado', true),
    supabase.from('documentos_guia').select('id', { count: 'exact', head: true }).eq('ocr_status', 'error'),
  ])
  
  // Obtener proveedores únicos
  const { data: proveedoresData } = await supabase
    .from('documentos_guia')
    .select('proveedor')
  
  const proveedoresUnicos = new Set(
    proveedoresData?.filter(p => p.proveedor).map(p => p.proveedor) || []
  )
  
  return {
    total_documentos: total.count || 0,
    documentos_firmados: firmados.count || 0,
    documentos_no_firmados: (total.count || 0) - (firmados.count || 0),
    documentos_con_errores: errores.count || 0,
    proveedores_unicos: proveedoresUnicos.size
  }
}

export const getProveedores = async () => {
  const { data, error } = await supabase
    .from('documentos_guia')
    .select('proveedor')
  
  if (error) throw error
  
  const proveedoresSet = new Set(
    data?.filter(d => d.proveedor).map(d => d.proveedor) || []
  )
  const uniqueProveedores = Array.from(proveedoresSet)
  
  return uniqueProveedores.sort()
}

export const getProductosUnicos = async () => {
  const { data, error } = await supabase
    .from('documentos_guia')
    .select('productos')
  
  if (error) throw error
  
  const productosSet = new Set<string>()
  data?.forEach(d => {
    if (d.productos && Array.isArray(d.productos)) {
      d.productos.forEach((p: string) => {
        if (p && p.trim()) {
          productosSet.add(p.trim())
        }
      })
    }
  })
  
  return Array.from(productosSet).sort()
}

// Suscripción a cambios en tiempo real
export const subscribeToDocuments = (callback: (payload: any) => void) => {
  return supabase
    .channel('documentos_changes')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'documentos_guia'
      },
      callback
    )
    .subscribe()
}

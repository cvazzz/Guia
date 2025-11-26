'use client'

import { useState, useEffect, useCallback } from 'react'
import { Documento, SearchParams } from '@/types'
import { 
  getDocuments, 
  searchDocuments as searchDocs
} from '@/lib/supabase'

export function useDocuments() {
  const [documents, setDocuments] = useState<Documento[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDocuments = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getDocuments()
      setDocuments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setLoading(false)
    }
  }, [])

  const searchDocuments = useCallback(async (params: SearchParams) => {
    try {
      setLoading(true)
      setError(null)
      const data = await searchDocs(params)
      setDocuments(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error en búsqueda')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchDocuments()
    // Nota: Se removió la suscripción en tiempo real para evitar recargas automáticas
    // Si deseas actualizaciones en tiempo real, usa el botón de refrescar manualmente
  }, [fetchDocuments])

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    searchDocuments
  }
}

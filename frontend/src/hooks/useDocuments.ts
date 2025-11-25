'use client'

import { useState, useEffect, useCallback } from 'react'
import { Documento, SearchParams } from '@/types'
import { 
  getDocuments, 
  searchDocuments as searchDocs, 
  subscribeToDocuments 
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

    // Suscribirse a cambios en tiempo real
    const subscription = subscribeToDocuments((payload) => {
      console.log('Cambio detectado:', payload)
      
      if (payload.eventType === 'INSERT') {
        setDocuments(prev => [payload.new as Documento, ...prev])
      } else if (payload.eventType === 'UPDATE') {
        setDocuments(prev => 
          prev.map(doc => 
            doc.id === payload.new.id ? payload.new as Documento : doc
          )
        )
      } else if (payload.eventType === 'DELETE') {
        setDocuments(prev => 
          prev.filter(doc => doc.id !== payload.old.id)
        )
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchDocuments])

  return {
    documents,
    loading,
    error,
    refetch: fetchDocuments,
    searchDocuments
  }
}

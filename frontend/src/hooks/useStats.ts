'use client'

import { useState, useEffect, useCallback } from 'react'
import { Stats } from '@/types'
import { getStats } from '@/lib/supabase'

export function useStats() {
  const [stats, setStats] = useState<Stats>({
    total_documentos: 0,
    documentos_firmados: 0,
    documentos_no_firmados: 0,
    documentos_con_errores: 0,
    proveedores_unicos: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error obteniendo estadísticas')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
    
    // Actualizar stats cada minuto
    const interval = setInterval(fetchStats, 60000)
    
    return () => clearInterval(interval)
  }, [fetchStats])

  return {
    stats,
    loading,
    error,
    refetch: fetchStats
  }
}

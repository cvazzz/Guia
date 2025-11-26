'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Bell, 
  X, 
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  ExternalLink,
  Trash2,
  Settings
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface Notification {
  id: string
  type: 'new_document' | 'sync_complete' | 'error' | 'info'
  title: string
  message: string
  timestamp: Date
  read: boolean
  documentId?: number
}

interface PendingFile {
  id: string
  name: string
  createdTime: string
}

interface NotificationCenterProps {
  onNewDocumentsFound?: (count: number) => void
}

export function NotificationCenter({ onNewDocumentsFound }: NotificationCenterProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [checking, setChecking] = useState(false)
  const [autoSync, setAutoSync] = useState(false)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)

  const unreadCount = notifications.filter(n => !n.read).length + pendingFiles.length

  // Agregar notificación
  const addNotification = useCallback((notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: `notif-${Date.now()}`,
      timestamp: new Date(),
      read: false
    }
    setNotifications(prev => [newNotification, ...prev].slice(0, 50)) // Máximo 50 notificaciones
  }, [])

  // Verificar nuevos documentos comparando Drive vs Supabase
  const checkNewDocuments = useCallback(async () => {
    setChecking(true)
    
    try {
      // Obtener todos los drive_file_id de Supabase
      const { data: existingDocs, error: dbError } = await supabase
        .from('documentos_guia')
        .select('drive_file_id')
      
      if (dbError) throw dbError

      const existingIds = new Set(existingDocs?.map(d => d.drive_file_id) || [])
      
      // Simular check de Drive (en producción esto llamaría al backend)
      // Por ahora mostraremos los documentos recientes como "nuevos" si no están marcados
      const { data: recentDocs, error: recentError } = await supabase
        .from('documentos_guia')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20)

      if (recentError) throw recentError

      // Filtrar documentos no revisados como "pendientes de revisar"
      const unreviewedDocs = recentDocs?.filter(d => !d.revisado) || []
      
      if (unreviewedDocs.length > 0) {
        setPendingFiles(unreviewedDocs.map(d => ({
          id: d.drive_file_id,
          name: d.drive_file_name || d.numero_guia || 'Sin nombre',
          createdTime: d.created_at
        })))
        
        onNewDocumentsFound?.(unreviewedDocs.length)
      }

      setLastCheck(new Date())
      
      if (unreviewedDocs.length === 0) {
        addNotification({
          type: 'info',
          title: 'Todo al día',
          message: 'No hay documentos pendientes de revisar'
        })
      }

    } catch (error) {
      console.error('Error checking new documents:', error)
      addNotification({
        type: 'error',
        title: 'Error de sincronización',
        message: 'No se pudo verificar nuevos documentos'
      })
    } finally {
      setChecking(false)
    }
  }, [addNotification, onNewDocumentsFound])

  // Marcar documento como revisado
  const markAsReviewed = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('documentos_guia')
        .update({ revisado: true })
        .eq('drive_file_id', fileId)

      if (error) throw error

      setPendingFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('Documento marcado como revisado')
    } catch (error) {
      toast.error('Error al marcar documento')
    }
  }

  // Marcar todos como revisados
  const markAllAsReviewed = async () => {
    try {
      const { error } = await supabase
        .from('documentos_guia')
        .update({ revisado: true })
        .in('drive_file_id', pendingFiles.map(f => f.id))

      if (error) throw error

      setPendingFiles([])
      addNotification({
        type: 'sync_complete',
        title: 'Revisión completada',
        message: 'Todos los documentos han sido marcados como revisados'
      })
      toast.success('Todos los documentos marcados como revisados')
    } catch (error) {
      toast.error('Error al marcar documentos')
    }
  }

  // Marcar notificación como leída
  const markNotificationAsRead = (id: string) => {
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, read: true } : n)
    )
  }

  // Limpiar notificaciones leídas
  const clearReadNotifications = () => {
    setNotifications(prev => prev.filter(n => !n.read))
  }

  // Auto-sync cada 5 minutos si está activado
  useEffect(() => {
    if (!autoSync) return

    const interval = setInterval(() => {
      checkNewDocuments()
    }, 5 * 60 * 1000) // 5 minutos

    return () => clearInterval(interval)
  }, [autoSync, checkNewDocuments])

  // Check inicial al cargar
  useEffect(() => {
    checkNewDocuments()
  }, [])

  return (
    <>
      {/* Botón de notificaciones */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(true)}
        className="relative p-3 bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-all"
      >
        <Bell className={`w-5 h-5 ${checking ? 'animate-pulse' : ''}`} />
        
        {/* Badge de notificaciones */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Panel de notificaciones */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-50"
            onClick={() => setIsOpen(false)}
          >
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-gray-900 shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className="p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Bell className="w-6 h-6" />
                    <h2 className="text-xl font-bold">Centro de Notificaciones</h2>
                  </div>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 hover:bg-white/20 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Controles */}
                <div className="flex items-center gap-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={checkNewDocuments}
                    disabled={checking}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors disabled:opacity-50"
                  >
                    {checking ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                    <span className="text-sm font-medium">
                      {checking ? 'Verificando...' : 'Verificar Nuevos'}
                    </span>
                  </motion.button>

                  <button
                    onClick={() => setAutoSync(!autoSync)}
                    className={`p-2 rounded-xl transition-colors ${
                      autoSync ? 'bg-emerald-500' : 'bg-white/20 hover:bg-white/30'
                    }`}
                    title={autoSync ? 'Auto-sync activado' : 'Activar auto-sync'}
                  >
                    <Settings className="w-4 h-4" />
                  </button>
                </div>

                {lastCheck && (
                  <p className="text-xs text-white/70 mt-2 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Última verificación: {lastCheck.toLocaleTimeString()}
                  </p>
                )}
              </div>

              {/* Contenido */}
              <div className="flex-1 overflow-y-auto">
                {/* Documentos pendientes de revisar */}
                {pendingFiles.length > 0 && (
                  <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-500" />
                        Pendientes de Revisar ({pendingFiles.length})
                      </h3>
                      <button
                        onClick={markAllAsReviewed}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        Marcar todos
                      </button>
                    </div>

                    <div className="space-y-2">
                      {pendingFiles.slice(0, 10).map((file) => (
                        <motion.div
                          key={file.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 rounded-xl"
                        >
                          <FileText className="w-4 h-4 text-amber-600" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">
                              {file.name}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(file.createdTime).toLocaleDateString()}
                            </p>
                          </div>
                          <button
                            onClick={() => markAsReviewed(file.id)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                            title="Marcar como revisado"
                          >
                            <CheckCircle className="w-4 h-4" />
                          </button>
                        </motion.div>
                      ))}
                      
                      {pendingFiles.length > 10 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          Y {pendingFiles.length - 10} más...
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Lista de notificaciones */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-700 dark:text-gray-300">
                      Historial
                    </h3>
                    {notifications.some(n => n.read) && (
                      <button
                        onClick={clearReadNotifications}
                        className="text-xs text-gray-500 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" />
                        Limpiar leídas
                      </button>
                    )}
                  </div>

                  {notifications.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
                      <p>No hay notificaciones</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {notifications.map((notification) => (
                        <motion.div
                          key={notification.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          onClick={() => markNotificationAsRead(notification.id)}
                          className={`p-3 rounded-xl border cursor-pointer transition-colors ${
                            notification.read
                              ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
                              : 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-700/50'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`p-1.5 rounded-lg ${
                              notification.type === 'error' 
                                ? 'bg-red-100 text-red-600'
                                : notification.type === 'sync_complete'
                                ? 'bg-emerald-100 text-emerald-600'
                                : notification.type === 'new_document'
                                ? 'bg-blue-100 text-blue-600'
                                : 'bg-gray-100 text-gray-600'
                            }`}>
                              {notification.type === 'error' ? (
                                <AlertCircle className="w-4 h-4" />
                              ) : notification.type === 'sync_complete' ? (
                                <CheckCircle className="w-4 h-4" />
                              ) : notification.type === 'new_document' ? (
                                <FileText className="w-4 h-4" />
                              ) : (
                                <Bell className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">
                                {notification.title}
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {notification.message}
                              </p>
                              <p className="text-xs text-gray-400 mt-1">
                                {notification.timestamp.toLocaleString()}
                              </p>
                            </div>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-indigo-500 rounded-full flex-shrink-0" />
                            )}
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span className="flex items-center gap-2">
                    {autoSync && (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        Auto-sync activo
                      </span>
                    )}
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="px-4 py-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

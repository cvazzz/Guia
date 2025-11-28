'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { 
  RefreshCw, 
  FileText, 
  Menu, 
  Sparkles, 
  Bell, 
  Settings, 
  X,
  Clock,
  CheckCircle,
  AlertTriangle,
  Download,
  Upload,
  Palette,
  Globe,
  Database,
  Shield,
  HelpCircle,
  LogOut,
  ChevronRight,
  Trash2,
  Eye,
  Sun,
  Moon,
  BarChart3,
  CheckCheck,
  Loader2
} from 'lucide-react'
import { useState, useEffect, useRef, useCallback } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface PendingFile {
  id: string
  numero_guia: string
  fecha_documento: string
  proveedor: string
  created_at: string
}

interface HeaderProps {
  onRefresh: () => void
  onOpenAnalytics?: () => void
  onOpenExport?: () => void
}

export function Header({ onRefresh, onOpenAnalytics, onOpenExport }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  
  // Estados para notificaciones reales
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([])
  const [checking, setChecking] = useState(false)
  const [autoSync, setAutoSync] = useState(true)
  const [lastCheck, setLastCheck] = useState<Date | null>(null)
  
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  // Función para verificar documentos no revisados
  const checkNewDocuments = useCallback(async () => {
    setChecking(true)
    try {
      const { data, error } = await supabase
        .from('documentos_guia')
        .select('id, numero_guia, fecha_documento, proveedor, created_at')
        .or('revisado.is.null,revisado.eq.false')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error

      setPendingFiles(data || [])
      setLastCheck(new Date())
    } catch (error) {
      console.error('Error checking documents:', error)
    } finally {
      setChecking(false)
    }
  }, [])

  // Marcar un documento como revisado
  const markAsReviewed = async (fileId: string) => {
    try {
      const { error } = await supabase
        .from('documentos_guia')
        .update({ revisado: true })
        .eq('id', fileId)

      if (error) throw error

      setPendingFiles(prev => prev.filter(f => f.id !== fileId))
      toast.success('Documento marcado como revisado')
    } catch (error) {
      console.error('Error marking as reviewed:', error)
      toast.error('Error al marcar como revisado')
    }
  }

  // Marcar todos como revisados
  const markAllAsReviewed = async () => {
    if (pendingFiles.length === 0) return
    
    try {
      const ids = pendingFiles.map(f => f.id)
      const { error } = await supabase
        .from('documentos_guia')
        .update({ revisado: true })
        .in('id', ids)

      if (error) throw error

      setPendingFiles([])
      toast.success('Todos los documentos marcados como revisados')
    } catch (error) {
      console.error('Error marking all as reviewed:', error)
      toast.error('Error al marcar todos como revisados')
    }
  }

  // Auto-sync cada 5 minutos
  useEffect(() => {
    checkNewDocuments()
    
    if (autoSync) {
      const interval = setInterval(checkNewDocuments, 5 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [autoSync, checkNewDocuments])

  const unreadCount = pendingFiles.length

  // Cerrar dropdowns al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false)
      }
      if (settingsRef.current && !settingsRef.current.contains(event.target as Node)) {
        setShowSettings(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    await checkNewDocuments()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  // Formatear tiempo relativo
  const formatRelativeTime = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMins / 60)
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffMins < 1) return 'Ahora'
    if (diffMins < 60) return `Hace ${diffMins} min`
    if (diffHours < 24) return `Hace ${diffHours}h`
    return `Hace ${diffDays}d`
  }

  const settingsOptions: Array<{
    icon: any
    label: string
    description: string
    action: () => void
    toggle?: boolean
  }> = [
    { 
      icon: theme === 'dark' ? Sun : Moon, 
      label: 'Modo Oscuro', 
      description: theme === 'dark' ? 'Cambiar a claro' : 'Cambiar a oscuro', 
      action: toggleTheme,
      toggle: true
    },
    { icon: BarChart3, label: 'Dashboard', description: 'Ver estadísticas', action: () => onOpenAnalytics?.(), toggle: false },
    { icon: Download, label: 'Exportar datos', description: 'CSV, Excel, PDF', action: () => onOpenExport?.(), toggle: false },
    { icon: Globe, label: 'Idioma', description: 'Español', action: () => {}, toggle: false },
    { icon: Database, label: 'Almacenamiento', description: 'Google Drive', action: () => {}, toggle: false },
    { icon: Upload, label: 'Importar documentos', description: 'Subir archivos', action: () => {}, toggle: false },
    { icon: Shield, label: 'Seguridad', description: 'Permisos y acceso', action: () => {}, toggle: false },
    { icon: HelpCircle, label: 'Ayuda', description: 'Documentación', action: () => {}, toggle: false },
  ]

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative z-50"
    >
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700 overflow-hidden"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30 overflow-hidden"></div>
      
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 md:h-24">
          {/* Logo y título */}
          <div className="flex items-center gap-4">
            <motion.div
              whileHover={{ rotate: 360, scale: 1.1 }}
              transition={{ duration: 0.5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-white/20 rounded-2xl blur-lg"></div>
              <div className="relative p-3 bg-white/10 rounded-2xl backdrop-blur-sm border border-white/20">
                <FileText className="w-7 h-7 md:w-8 md:h-8 text-white" />
              </div>
            </motion.div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  Guías de Remisión
                </h1>
                <motion.span 
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 2, repeat: Infinity }}
                  className="hidden sm:flex items-center gap-1 px-2 py-0.5 bg-white/20 rounded-full text-[10px] text-white font-medium"
                >
                  <Sparkles className="w-3 h-3" />
                  OCR AI
                </motion.span>
              </div>
              <p className="text-sm text-blue-100/80 hidden sm:block mt-0.5">
                Gestión Inteligente de Documentos
              </p>
            </div>
          </div>

          {/* Acciones desktop */}
          <div className="hidden md:flex items-center gap-3">
            {/* Notificaciones */}
            <div className="relative" ref={notifRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowNotifications(!showNotifications)
                  setShowSettings(false)
                }}
                className="relative p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-all duration-300 border border-white/10"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-96 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-[9999]"
                  >
                    {/* Header del panel */}
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                          <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Documentos Pendientes
                          {pendingFiles.length > 0 && (
                            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/50 text-amber-700 dark:text-amber-300 text-xs font-medium rounded-full">
                              {pendingFiles.length}
                            </span>
                          )}
                        </h3>
                        <div className="flex gap-1">
                          <button 
                            onClick={checkNewDocuments}
                            disabled={checking}
                            className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors disabled:opacity-50"
                            title="Verificar nuevos"
                          >
                            {checking ? (
                              <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                              <RefreshCw className="w-4 h-4" />
                            )}
                          </button>
                          {pendingFiles.length > 0 && (
                            <button 
                              onClick={markAllAsReviewed}
                              className="p-1.5 text-gray-500 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-colors"
                              title="Marcar todos como revisados"
                            >
                              <CheckCheck className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                      {lastCheck && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Última verificación: {lastCheck.toLocaleTimeString()}
                        </p>
                      )}
                    </div>
                    
                    {/* Lista de documentos pendientes */}
                    <div className="max-h-80 overflow-y-auto">
                      {pendingFiles.length === 0 ? (
                        <div className="p-8 text-center">
                          <CheckCircle className="w-12 h-12 text-green-300 dark:text-green-600 mx-auto mb-2" />
                          <p className="text-gray-500 dark:text-gray-400 text-sm font-medium">¡Todo al día!</p>
                          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">No hay documentos pendientes de revisar</p>
                        </div>
                      ) : (
                        pendingFiles.map((file, index) => (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.03 }}
                            className="p-3 border-b border-gray-50 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0">
                                <div className="p-2 bg-amber-100 dark:bg-amber-900/50 rounded-lg">
                                  <FileText className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                </div>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800 dark:text-white truncate">
                                  {file.numero_guia || 'Sin número'}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                  {file.proveedor || 'Sin proveedor'}
                                </p>
                                <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {formatRelativeTime(file.created_at)}
                                </p>
                              </div>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  markAsReviewed(file.id)
                                }}
                                className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-100 dark:hover:bg-green-900/50 rounded-lg transition-all"
                                title="Marcar como revisado"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </motion.div>
                        ))
                      )}
                    </div>

                    {/* Footer con auto-sync */}
                    <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-500 dark:text-gray-400">Auto-sincronización</span>
                        <button
                          onClick={() => setAutoSync(!autoSync)}
                          className={`relative w-10 h-5 rounded-full transition-colors ${
                            autoSync ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                          }`}
                        >
                          <div className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
                            autoSync ? 'translate-x-5' : ''
                          }`} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Configuración */}
            <div className="relative" ref={settingsRef}>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  setShowSettings(!showSettings)
                  setShowNotifications(false)
                }}
                className={`p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-all duration-300 border border-white/10 ${
                  showSettings ? 'bg-white/20' : ''
                }`}
              >
                <Settings className={`w-5 h-5 transition-transform duration-500 ${showSettings ? 'rotate-90' : ''}`} />
              </motion.button>

              <AnimatePresence>
                {showSettings && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
                      <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                        <Settings className="w-4 h-4 text-indigo-600" />
                        Configuración
                      </h3>
                      {user && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {user.email}
                        </p>
                      )}
                    </div>
                    
                    <div className="py-2">
                      {settingsOptions.map((option, index) => (
                        <motion.button
                          key={option.label}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: index * 0.03 }}
                          onClick={() => {
                            option.action()
                            if (!option.toggle) setShowSettings(false)
                          }}
                          className="w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors group"
                        >
                          <div className="p-2 bg-gray-100 dark:bg-gray-600 rounded-lg group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors">
                            <option.icon className="w-4 h-4 text-gray-600 dark:text-gray-300 group-hover:text-indigo-600 dark:group-hover:text-indigo-400" />
                          </div>
                          <div className="flex-1 text-left">
                            <p className="text-sm font-medium text-gray-800 dark:text-white">{option.label}</p>
                            <p className="text-xs text-gray-400">{option.description}</p>
                          </div>
                          {option.toggle ? (
                            <div className={`w-10 h-6 rounded-full p-1 transition-colors ${theme === 'dark' ? 'bg-indigo-600' : 'bg-gray-300'}`}>
                              <div className={`w-4 h-4 bg-white rounded-full transition-transform ${theme === 'dark' ? 'translate-x-4' : ''}`} />
                            </div>
                          ) : (
                            <ChevronRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-400 transition-colors" />
                          )}
                        </motion.button>
                      ))}
                    </div>

                    <div className="p-3 border-t border-gray-100 dark:border-gray-600 bg-gray-50 dark:bg-gray-700">
                      <button 
                        onClick={() => {
                          logout()
                          setShowSettings(false)
                        }}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors text-sm font-medium"
                      >
                        <LogOut className="w-4 h-4" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Botón Modo Oscuro - siempre visible */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={toggleTheme}
              className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl backdrop-blur-sm transition-all duration-300 border border-white/10"
              title={theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            >
              {theme === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </motion.button>

            {/* Botón Logout - siempre visible */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={logout}
              className="p-2.5 bg-red-500/20 hover:bg-red-500/40 text-white rounded-xl backdrop-blur-sm transition-all duration-300 border border-red-400/30"
              title="Cerrar sesión"
            >
              <LogOut className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-blue-50 transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              {isRefreshing ? 'Sincronizando...' : 'Sincronizar'}
            </motion.button>
            
            <div className="relative ml-2">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-lg shadow-lg cursor-pointer hover:scale-105 transition-transform">
                {user?.name?.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() || 'US'}
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-indigo-600"></div>
            </div>
          </div>

          {/* Menú móvil */}
          <button
            onClick={() => setIsMenuOpen(!isMenuOpen)}
            className="md:hidden p-2.5 text-white hover:bg-white/10 rounded-xl transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>

        {/* Menú móvil desplegable */}
        <AnimatePresence>
          {isMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden pb-4 space-y-2"
            >
              <button
                onClick={() => {
                  handleRefresh()
                  setIsMenuOpen(false)
                }}
                className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-xl border border-white/10"
              >
                <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin' : ''}`} />
                Sincronizar Documentos
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-xl border border-white/10">
                <Bell className="w-5 h-5" />
                Notificaciones
                {unreadCount > 0 && (
                  <span className="ml-auto bg-red-500 text-xs px-2 py-0.5 rounded-full">{unreadCount}</span>
                )}
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-white/10 text-white rounded-xl border border-white/10">
                <Settings className="w-5 h-5" />
                Configuración
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.header>
  )
}

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
  BarChart3
} from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { useTheme } from '@/contexts/ThemeContext'
import { useAuth } from '@/contexts/AuthContext'

interface HeaderProps {
  onRefresh: () => void
  onOpenAnalytics?: () => void
  onOpenExport?: () => void
}

interface Notification {
  id: string
  type: 'success' | 'warning' | 'info'
  title: string
  message: string
  time: string
  read: boolean
}

export function Header({ onRefresh, onOpenAnalytics, onOpenExport }: HeaderProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showNotifications, setShowNotifications] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const notifRef = useRef<HTMLDivElement>(null)
  const settingsRef = useRef<HTMLDivElement>(null)
  
  const { theme, toggleTheme } = useTheme()
  const { user, logout } = useAuth()

  // Notificaciones de ejemplo (en producción vendrían de una API)
  const [notifications, setNotifications] = useState<Notification[]>([
    {
      id: '1',
      type: 'success',
      title: 'Sincronización completada',
      message: '10 documentos nuevos procesados',
      time: 'Hace 5 min',
      read: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Documento pendiente',
      message: 'TT01-001674 sin firma detectada',
      time: 'Hace 1 hora',
      read: false
    },
    {
      id: '3',
      type: 'info',
      title: 'Actualización disponible',
      message: 'Nueva versión del OCR disponible',
      time: 'Hace 2 horas',
      read: true
    }
  ])

  const unreadCount = notifications.filter(n => !n.read).length

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
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
  }

  const clearNotifications = () => {
    setNotifications([])
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-500" />
      default: return <Bell className="w-5 h-5 text-blue-500" />
    }
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
      className="relative overflow-hidden"
    >
      {/* Fondo con gradiente animado */}
      <div className="absolute inset-0 bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-700"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-30"></div>
      
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
                    {unreadCount}
                  </span>
                )}
              </motion.button>

              <AnimatePresence>
                {showNotifications && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
                  >
                    <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-indigo-50">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Bell className="w-4 h-4 text-indigo-600" />
                          Notificaciones
                        </h3>
                        <div className="flex gap-1">
                          {notifications.length > 0 && (
                            <>
                              <button 
                                onClick={markAllAsRead}
                                className="p-1.5 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                title="Marcar todo como leído"
                              >
                                <Eye className="w-4 h-4" />
                              </button>
                              <button 
                                onClick={clearNotifications}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                title="Limpiar todo"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="max-h-80 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center">
                          <Bell className="w-12 h-12 text-gray-200 mx-auto mb-2" />
                          <p className="text-gray-400 text-sm">No hay notificaciones</p>
                        </div>
                      ) : (
                        notifications.map((notif, index) => (
                          <motion.div
                            key={notif.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.05 }}
                            className={`p-4 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                              !notif.read ? 'bg-blue-50/50' : ''
                            }`}
                          >
                            <div className="flex gap-3">
                              <div className="flex-shrink-0 mt-0.5">
                                {getNotificationIcon(notif.type)}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-gray-800">{notif.title}</p>
                                <p className="text-xs text-gray-500 mt-0.5">{notif.message}</p>
                                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />
                                  {notif.time}
                                </p>
                              </div>
                              {!notif.read && (
                                <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-2"></div>
                              )}
                            </div>
                          </motion.div>
                        ))
                      )}
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

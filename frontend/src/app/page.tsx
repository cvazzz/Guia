'use client'

import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useRouter } from 'next/navigation'
import { 
  FileText, 
  Smartphone, 
  BarChart3, 
  Settings,
  ChevronRight,
  Users,
  Package,
  Activity,
  TrendingUp,
  Shield,
  Clock,
  ArrowUpRight,
  Layers,
  LogOut
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { LoginPage } from '@/components/LoginPage'

interface Module {
  id: string
  title: string
  description: string
  icon: React.ReactNode
  color: string
  gradient: string
  href: string
  stats?: {
    label: string
    value: string | number
  }[]
  status: 'active' | 'coming-soon' | 'beta'
  features: string[]
}

const modules: Module[] = [
  {
    id: 'guias',
    title: 'Guías de Remisión',
    description: 'Gestión integral de documentos de transporte, OCR automático y seguimiento de entregas',
    icon: <FileText className="w-8 h-8" />,
    color: 'from-blue-500 to-blue-600',
    gradient: 'bg-gradient-to-br from-blue-500/10 to-blue-600/10',
    href: '/guias',
    status: 'active',
    features: ['OCR Automático', 'Sincronización Drive', 'Búsqueda Avanzada', 'Exportación PDF/Excel']
  },
  {
    id: 'ldu',
    title: 'Gestión LDU',
    description: 'Control y seguimiento de dispositivos móviles, asignaciones y responsables',
    icon: <Smartphone className="w-8 h-8" />,
    color: 'from-emerald-500 to-emerald-600',
    gradient: 'bg-gradient-to-br from-emerald-500/10 to-emerald-600/10',
    href: '/ldu',
    status: 'active',
    features: ['Importación Excel', 'Normalización IMEI', 'Historial Cambios', 'Reportes']
  },
  {
    id: 'analytics',
    title: 'Analytics & Reportes',
    description: 'Dashboards interactivos, métricas en tiempo real y generación de informes',
    icon: <BarChart3 className="w-8 h-8" />,
    color: 'from-purple-500 to-purple-600',
    gradient: 'bg-gradient-to-br from-purple-500/10 to-purple-600/10',
    href: '/analytics',
    status: 'coming-soon',
    features: ['KPIs en Tiempo Real', 'Gráficos Interactivos', 'Exportación Automática', 'Alertas']
  },
  {
    id: 'admin',
    title: 'Administración',
    description: 'Configuración del sistema, usuarios, permisos y auditoría',
    icon: <Settings className="w-8 h-8" />,
    color: 'from-gray-500 to-gray-600',
    gradient: 'bg-gradient-to-br from-gray-500/10 to-gray-600/10',
    href: '/admin',
    status: 'coming-soon',
    features: ['Gestión Usuarios', 'Roles y Permisos', 'Logs de Auditoría', 'Configuración']
  }
]

export default function HomePage() {
  const router = useRouter()
  const { isAuthenticated, isLoading: authLoading, user, logout } = useAuth()
  const [stats, setStats] = useState({
    totalGuias: 0,
    totalLDU: 0,
    pendientes: 0,
    ultimaSync: null as string | null
  })

  useEffect(() => {
    if (isAuthenticated) {
      fetchStats()
    }
  }, [isAuthenticated])

  const fetchStats = async () => {
    try {
      // Cargar estadísticas reales desde la API
      const [guiasRes, lduRes] = await Promise.allSettled([
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/stats`),
        fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/ldu/stats`)
      ])
      
      let totalGuias = 0
      let pendientes = 0
      let totalLDU = 0
      
      if (guiasRes.status === 'fulfilled' && guiasRes.value.ok) {
        const guiasData = await guiasRes.value.json()
        totalGuias = guiasData.total || 0
        pendientes = guiasData.pendientes || 0
      }
      
      if (lduRes.status === 'fulfilled' && lduRes.value.ok) {
        const lduData = await lduRes.value.json()
        totalLDU = lduData.total_registros || 0
      }
      
      setStats({
        totalGuias,
        totalLDU,
        pendientes,
        ultimaSync: new Date().toISOString()
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Cargando sistema...</p>
        </motion.div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <LoginPage />
  }

  const handleModuleClick = (module: Module) => {
    if (module.status === 'coming-soon') {
      return
    }
    router.push(module.href)
  }

  const getGreeting = () => {
    const hour = new Date().getHours()
    if (hour < 12) return 'Buenos días'
    if (hour < 18) return 'Buenas tardes'
    return 'Buenas noches'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-gray-50 to-blue-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                <Layers className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                  Sistema de Gestión
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Plataforma Centralizada
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {user?.email?.split('@')[0] || 'Usuario'}
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {user?.email}
                </p>
              </div>
              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                {user?.email?.charAt(0).toUpperCase() || 'U'}
              </div>
              <button
                onClick={logout}
                className="p-2 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            {getGreeting()}, {user?.email?.split('@')[0] || 'Usuario'} 👋
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Selecciona un módulo para comenzar a trabajar
          </p>
        </motion.div>

        {/* Quick Stats */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGuias}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Total Guías</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg flex items-center justify-center">
                <Smartphone className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalLDU}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Dispositivos LDU</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-lg flex items-center justify-center">
                <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pendientes}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Pendientes</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                <Activity className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">99.9%</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Uptime</p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Modules Grid */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Módulos Disponibles
          </h3>
          <div className="grid md:grid-cols-2 gap-6">
            {modules.map((module, index) => (
              <motion.div
                key={module.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (index + 1) }}
                whileHover={module.status !== 'coming-soon' ? { scale: 1.02 } : {}}
                whileTap={module.status !== 'coming-soon' ? { scale: 0.98 } : {}}
                onClick={() => handleModuleClick(module)}
                className={`
                  relative overflow-hidden rounded-2xl border transition-all duration-300
                  ${module.status === 'coming-soon' 
                    ? 'bg-gray-100 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700 cursor-not-allowed opacity-60'
                    : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-xl hover:border-blue-300 dark:hover:border-blue-600'
                  }
                `}
              >
                {/* Background Gradient */}
                <div className={`absolute inset-0 opacity-50 ${module.gradient}`} />
                
                {/* Status Badge */}
                {module.status !== 'active' && (
                  <div className="absolute top-4 right-4">
                    <span className={`
                      px-3 py-1 rounded-full text-xs font-medium
                      ${module.status === 'beta' 
                        ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                        : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
                      }
                    `}>
                      {module.status === 'beta' ? 'Beta' : 'Próximamente'}
                    </span>
                  </div>
                )}

                <div className="relative p-6">
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className={`
                      w-14 h-14 rounded-xl flex items-center justify-center text-white shadow-lg
                      bg-gradient-to-br ${module.color}
                    `}>
                      {module.icon}
                    </div>
                    
                    {/* Content */}
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white">
                          {module.title}
                        </h4>
                        {module.status === 'active' && (
                          <ArrowUpRight className="w-4 h-4 text-gray-400" />
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 mb-4">
                        {module.description}
                      </p>
                      
                      {/* Features */}
                      <div className="flex flex-wrap gap-2">
                        {module.features.map((feature, i) => (
                          <span 
                            key={i}
                            className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded-md text-xs text-gray-600 dark:text-gray-400"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Activity */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Actividad Reciente
          </h3>
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {[
                { action: 'Nuevo documento procesado', module: 'Guías', time: 'Hace 5 min', icon: <FileText className="w-4 h-4" />, color: 'text-blue-500' },
                { action: 'Sincronización completada', module: 'LDU', time: 'Hace 15 min', icon: <Smartphone className="w-4 h-4" />, color: 'text-emerald-500' },
                { action: '12 registros actualizados', module: 'Sistema', time: 'Hace 1 hora', icon: <Activity className="w-4 h-4" />, color: 'text-purple-500' },
                { action: 'Exportación generada', module: 'Guías', time: 'Hace 2 horas', icon: <TrendingUp className="w-4 h-4" />, color: 'text-amber-500' },
              ].map((activity, i) => (
                <div key={i} className="flex items-center gap-4 p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className={`w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center ${activity.color}`}>
                    {activity.icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {activity.action}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {activity.module}
                    </p>
                  </div>
                  <span className="text-xs text-gray-400">
                    {activity.time}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="mt-12 py-6 border-t border-gray-200 dark:border-gray-700 bg-white/50 dark:bg-gray-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Sistema de Gestión Centralizada v1.0
            </p>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="text-xs text-gray-500 dark:text-gray-400">
                Sistema operativo
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  TrendingUp,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Activity,
  Package,
  Truck,
  BarChart2,
  Bell,
  Filter,
  Star,
  X
} from 'lucide-react'
import { Documento } from '@/types'

interface SidebarProps {
  documents: Documento[]
  isOpen: boolean
  onToggle: () => void
  onQuickFilter: (filter: { firmado?: boolean; fecha_desde?: string }) => void
}

export function Sidebar({ documents, isOpen, onToggle, onQuickFilter }: SidebarProps) {
  const [currentDate] = useState(new Date())
  
  // Estadísticas calculadas
  const stats = {
    total: documents.length,
    firmados: documents.filter(d => d.firmado).length,
    pendientes: documents.filter(d => !d.firmado).length,
    hoy: documents.filter(d => {
      const docDate = new Date(d.procesado_en || d.created_at || '')
      const today = new Date()
      return docDate.toDateString() === today.toDateString()
    }).length,
    estaSemana: documents.filter(d => {
      const docDate = new Date(d.procesado_en || d.created_at || '')
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return docDate >= weekAgo
    }).length
  }

  // Últimos 5 documentos procesados
  const recentDocs = [...documents]
    .sort((a, b) => new Date(b.procesado_en || b.created_at || '').getTime() - new Date(a.procesado_en || a.created_at || '').getTime())
    .slice(0, 5)

  // Productos más frecuentes
  const productCount: Record<string, number> = {}
  documents.forEach(doc => {
    doc.productos?.forEach(prod => {
      productCount[prod] = (productCount[prod] || 0) + 1
    })
  })
  const topProducts = Object.entries(productCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)

  // Días de la semana con actividad
  const weekActivity = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const count = documents.filter(d => {
      const docDate = new Date(d.procesado_en || d.created_at || '')
      return docDate.toDateString() === date.toDateString()
    }).length
    return {
      day: date.toLocaleDateString('es', { weekday: 'short' }),
      date: date.getDate(),
      count,
      isToday: date.toDateString() === new Date().toDateString()
    }
  })

  const maxActivity = Math.max(...weekActivity.map(d => d.count), 1)

  // Alertas
  const alerts = [
    ...(stats.pendientes > 0 ? [{
      type: 'warning',
      message: `${stats.pendientes} guías sin firmar`,
      icon: AlertCircle
    }] : []),
    ...(stats.hoy > 0 ? [{
      type: 'info',
      message: `${stats.hoy} guías procesadas hoy`,
      icon: CheckCircle
    }] : [])
  ]

  return (
    <>
      {/* Toggle Button cuando está cerrado */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            onClick={onToggle}
            className="fixed left-0 top-1/2 -translate-y-1/2 z-40 bg-gradient-to-r from-indigo-500 to-purple-600 text-white p-3 rounded-r-xl shadow-lg hover:from-indigo-600 hover:to-purple-700 transition-all"
          >
            <ChevronRight className="w-5 h-5" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Overlay en móvil */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onToggle}
              className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
            />

            {/* Sidebar Panel */}
            <motion.aside
              initial={{ x: -320, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -320, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed left-0 top-0 h-full w-80 bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
            >
              {/* Header */}
              <div className="sticky top-0 bg-gradient-to-r from-indigo-500 to-purple-600 p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white/20 rounded-xl">
                    <BarChart2 className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h2 className="font-bold text-white">Panel de Control</h2>
                    <p className="text-xs text-white/70">Resumen y accesos rápidos</p>
                  </div>
                </div>
                <button
                  onClick={onToggle}
                  className="p-2 hover:bg-white/20 rounded-lg transition-colors"
                >
                  <ChevronLeft className="w-5 h-5 text-white" />
                </button>
              </div>

              <div className="p-4 space-y-6">
                {/* Resumen Rápido */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Resumen
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 p-3 rounded-xl border border-blue-100 dark:border-blue-800"
                    >
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{stats.total}</div>
                      <div className="text-xs text-blue-600/70 dark:text-blue-400/70">Total Guías</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onQuickFilter({ firmado: true })}
                      className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 p-3 rounded-xl border border-emerald-100 dark:border-emerald-800 cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.firmados}</div>
                      <div className="text-xs text-emerald-600/70 dark:text-emerald-400/70">Firmadas</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      onClick={() => onQuickFilter({ firmado: false })}
                      className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 p-3 rounded-xl border border-amber-100 dark:border-amber-800 cursor-pointer"
                    >
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.pendientes}</div>
                      <div className="text-xs text-amber-600/70 dark:text-amber-400/70">Pendientes</div>
                    </motion.div>
                    <motion.div 
                      whileHover={{ scale: 1.02 }}
                      className="bg-gradient-to-br from-purple-50 to-fuchsia-50 dark:from-purple-900/30 dark:to-fuchsia-900/30 p-3 rounded-xl border border-purple-100 dark:border-purple-800"
                    >
                      <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.hoy}</div>
                      <div className="text-xs text-purple-600/70 dark:text-purple-400/70">Hoy</div>
                    </motion.div>
                  </div>
                </section>

                {/* Actividad Semanal */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Actividad Semanal
                  </h3>
                  <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3">
                    <div className="flex items-end justify-between gap-1 h-16 mb-2">
                      {weekActivity.map((day, i) => (
                        <div key={i} className="flex-1 flex flex-col items-center">
                          <motion.div
                            initial={{ height: 0 }}
                            animate={{ height: `${(day.count / maxActivity) * 100}%` }}
                            transition={{ delay: i * 0.1, duration: 0.5 }}
                            className={`w-full rounded-t-md min-h-[4px] ${
                              day.isToday 
                                ? 'bg-gradient-to-t from-indigo-500 to-purple-500' 
                                : 'bg-gradient-to-t from-gray-300 to-gray-400 dark:from-gray-600 dark:to-gray-500'
                            }`}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                      {weekActivity.map((day, i) => (
                        <div key={i} className={`flex-1 text-center ${day.isToday ? 'font-bold text-indigo-600 dark:text-indigo-400' : ''}`}>
                          {day.day}
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                {/* Alertas */}
                {alerts.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Bell className="w-4 h-4" />
                      Alertas
                    </h3>
                    <div className="space-y-2">
                      {alerts.map((alert, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.1 }}
                          className={`flex items-center gap-3 p-3 rounded-xl ${
                            alert.type === 'warning' 
                              ? 'bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800' 
                              : 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                          }`}
                        >
                          <alert.icon className={`w-4 h-4 ${
                            alert.type === 'warning' ? 'text-amber-500' : 'text-blue-500'
                          }`} />
                          <span className={`text-sm ${
                            alert.type === 'warning' ? 'text-amber-700 dark:text-amber-300' : 'text-blue-700 dark:text-blue-300'
                          }`}>
                            {alert.message}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Actividad Reciente */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Actividad Reciente
                  </h3>
                  <div className="space-y-2">
                    {recentDocs.length === 0 ? (
                      <p className="text-sm text-gray-400 dark:text-gray-500 text-center py-4">
                        No hay actividad reciente
                      </p>
                    ) : (
                      recentDocs.map((doc, i) => (
                        <motion.div
                          key={doc.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        >
                          <div className={`w-2 h-2 rounded-full ${doc.firmado ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
                              {doc.numero_guia || 'Sin número'}
                            </p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">
                              {new Date(doc.procesado_en || doc.created_at || '').toLocaleDateString('es', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          {doc.firmado ? (
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                        </motion.div>
                      ))
                    )}
                  </div>
                </section>

                {/* Productos Frecuentes */}
                {topProducts.length > 0 && (
                  <section>
                    <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      Productos Frecuentes
                    </h3>
                    <div className="space-y-2">
                      {topProducts.map(([product, count], i) => (
                        <motion.div
                          key={product}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          className="flex items-center gap-2"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm text-gray-700 dark:text-gray-300 truncate">
                                {product.length > 25 ? product.substring(0, 25) + '...' : product}
                              </span>
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">
                                {count}
                              </span>
                            </div>
                            <div className="h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${(count / topProducts[0][1]) * 100}%` }}
                                transition={{ delay: i * 0.1, duration: 0.5 }}
                                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                              />
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  </section>
                )}

                {/* Filtros Rápidos */}
                <section>
                  <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    Filtros Rápidos
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => {
                        const today = new Date().toISOString().split('T')[0]
                        onQuickFilter({ fecha_desde: today })
                      }}
                      className="px-3 py-1.5 text-xs bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                    >
                      📅 Hoy
                    </button>
                    <button
                      onClick={() => {
                        const weekAgo = new Date()
                        weekAgo.setDate(weekAgo.getDate() - 7)
                        onQuickFilter({ fecha_desde: weekAgo.toISOString().split('T')[0] })
                      }}
                      className="px-3 py-1.5 text-xs bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                    >
                      📆 Esta semana
                    </button>
                    <button
                      onClick={() => onQuickFilter({ firmado: false })}
                      className="px-3 py-1.5 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                    >
                      ⏳ Pendientes
                    </button>
                    <button
                      onClick={() => onQuickFilter({ firmado: true })}
                      className="px-3 py-1.5 text-xs bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-lg hover:bg-emerald-100 dark:hover:bg-emerald-900/50 transition-colors"
                    >
                      ✅ Firmados
                    </button>
                    <button
                      onClick={() => onQuickFilter({})}
                      className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                      🔄 Limpiar
                    </button>
                  </div>
                </section>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

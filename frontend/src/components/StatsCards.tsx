'use client'

import { motion } from 'framer-motion'
import { FileText, CheckCircle, XCircle, Users, AlertTriangle, TrendingUp, Clock } from 'lucide-react'
import { Stats } from '@/types'

interface StatsCardsProps {
  stats: Stats
  loading: boolean
}

export function StatsCards({ stats, loading }: StatsCardsProps) {
  const firmadosPercent = stats.total_documentos > 0 
    ? Math.round((stats.documentos_firmados / stats.total_documentos) * 100) 
    : 0

  const cards = [
    {
      title: 'Total Documentos',
      value: stats.total_documentos,
      icon: FileText,
      gradient: 'from-blue-500 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50 dark:from-blue-900/30 dark:to-cyan-900/30',
      iconBg: 'bg-blue-500',
      textColor: 'text-blue-700 dark:text-blue-400',
      trend: null
    },
    {
      title: 'Firmados',
      value: stats.documentos_firmados,
      icon: CheckCircle,
      gradient: 'from-emerald-500 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30',
      iconBg: 'bg-emerald-500',
      textColor: 'text-emerald-700 dark:text-emerald-400',
      trend: `${firmadosPercent}%`
    },
    {
      title: 'Pendientes',
      value: stats.documentos_no_firmados,
      icon: Clock,
      gradient: 'from-amber-500 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30',
      iconBg: 'bg-amber-500',
      textColor: 'text-amber-700 dark:text-amber-400',
      trend: null
    },
    {
      title: 'Proveedores',
      value: stats.proveedores_unicos,
      icon: Users,
      gradient: 'from-violet-500 to-purple-500',
      bgGradient: 'from-violet-50 to-purple-50 dark:from-violet-900/30 dark:to-purple-900/30',
      iconBg: 'bg-violet-500',
      textColor: 'text-violet-700 dark:text-violet-400',
      trend: null
    }
  ]

  if (stats.documentos_con_errores > 0) {
    cards.push({
      title: 'Con Errores',
      value: stats.documentos_con_errores,
      icon: AlertTriangle,
      gradient: 'from-red-500 to-rose-500',
      bgGradient: 'from-red-50 to-rose-50 dark:from-red-900/30 dark:to-rose-900/30',
      iconBg: 'bg-red-500',
      textColor: 'text-red-700 dark:text-red-400',
      trend: null
    })
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-4 md:gap-6">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.4, delay: index * 0.1 }}
          whileHover={{ scale: 1.03, y: -4 }}
          className={`relative overflow-hidden bg-gradient-to-br ${card.bgGradient} rounded-2xl shadow-lg p-5 md:p-6 border border-white/50 dark:border-gray-700`}
        >
          {/* Decoración de fondo */}
          <div className={`absolute -right-6 -top-6 w-24 h-24 bg-gradient-to-br ${card.gradient} rounded-full opacity-10 blur-2xl`}></div>
          <div className={`absolute -right-3 -bottom-3 w-16 h-16 bg-gradient-to-br ${card.gradient} rounded-full opacity-10`}></div>
          
          <div className="relative">
            <div className="flex items-start justify-between mb-4">
              <motion.div 
                whileHover={{ rotate: 10 }}
                className={`p-3 rounded-xl bg-gradient-to-br ${card.gradient} shadow-lg`}
              >
                <card.icon className="w-5 h-5 md:w-6 md:h-6 text-white" />
              </motion.div>
              
              {card.trend && (
                <div className="flex items-center gap-1 px-2 py-1 bg-white/80 dark:bg-gray-800/80 rounded-lg text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <TrendingUp className="w-3 h-3" />
                  {card.trend}
                </div>
              )}
            </div>
            
            {loading ? (
              <div className="space-y-2">
                <div className="w-16 h-10 bg-white/50 dark:bg-gray-700/50 rounded-lg animate-pulse"></div>
                <div className="w-24 h-4 bg-white/50 dark:bg-gray-700/50 rounded animate-pulse"></div>
              </div>
            ) : (
              <>
                <motion.div
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ delay: 0.2 + index * 0.1, type: 'spring' }}
                  className={`text-3xl md:text-4xl font-bold ${card.textColor}`}
                >
                  {card.value.toLocaleString()}
                </motion.div>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-300 font-medium">
                  {card.title}
                </p>
              </>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  )
}

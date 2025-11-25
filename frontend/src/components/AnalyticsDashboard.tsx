'use client'

import { motion } from 'framer-motion'
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  Legend
} from 'recharts'
import { 
  TrendingUp, 
  Calendar, 
  Package, 
  FileCheck,
  X,
  Download,
  BarChart3
} from 'lucide-react'
import { Documento } from '@/types'

interface AnalyticsDashboardProps {
  documents: Documento[]
  isOpen: boolean
  onClose: () => void
}

export function AnalyticsDashboard({ documents, isOpen, onClose }: AnalyticsDashboardProps) {
  if (!isOpen) return null

  // Procesar datos para gráficos
  const processDataByDate = () => {
    const grouped: Record<string, { total: number; conFirma: number; sinFirma: number }> = {}
    
    documents.forEach(doc => {
      const date = doc.fecha_documento || doc.created_at?.split('T')[0] || 'Sin fecha'
      if (!grouped[date]) {
        grouped[date] = { total: 0, conFirma: 0, sinFirma: 0 }
      }
      grouped[date].total++
      if (doc.firmado) {
        grouped[date].conFirma++
      } else {
        grouped[date].sinFirma++
      }
    })

    return Object.entries(grouped)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-7)
      .map(([date, data]) => ({
        date: date.slice(5), // MM-DD
        ...data
      }))
  }

  const processProductData = () => {
    const productCount: Record<string, number> = {}
    
    documents.forEach(doc => {
      if (doc.codigos_producto && Array.isArray(doc.codigos_producto)) {
        doc.codigos_producto.forEach((code: string) => {
          productCount[code] = (productCount[code] || 0) + 1
        })
      }
    })

    return Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }))
  }

  const processSignatureData = () => {
    const conFirma = documents.filter(d => d.firmado).length
    const sinFirma = documents.filter(d => !d.firmado).length
    
    return [
      { name: 'Con firma', value: conFirma, color: '#10b981' },
      { name: 'Sin firma', value: sinFirma, color: '#f59e0b' }
    ]
  }

  const dateData = processDataByDate()
  const productData = processProductData()
  const signatureData = processSignatureData()

  const COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899', '#f43f5e']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-6xl max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-500 to-purple-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white">Dashboard Analítico</h2>
                <p className="text-indigo-100 text-sm">Estadísticas y métricas de documentos</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-100px)]">
          {/* Stats rápidos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-blue-900/30 dark:to-indigo-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500 rounded-xl">
                  <FileCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">{documents.length}</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Docs</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-green-50 to-emerald-100 dark:from-green-900/30 dark:to-emerald-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-xl">
                  <TrendingUp className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {documents.filter(d => d.firmado).length}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Con Firma</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-amber-50 to-orange-100 dark:from-amber-900/30 dark:to-orange-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-amber-500 rounded-xl">
                  <Package className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {documents.reduce((acc, doc) => acc + (doc.codigos_producto?.length || 0), 0)}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Productos</p>
                </div>
              </div>
            </div>
            
            <div className="bg-gradient-to-br from-purple-50 to-fuchsia-100 dark:from-purple-900/30 dark:to-fuchsia-900/30 rounded-2xl p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500 rounded-xl">
                  <Calendar className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-800 dark:text-white">
                    {new Set(documents.map(d => d.fecha_documento)).size}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Días activos</p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Gráfico de área - Documentos por fecha */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-500" />
                Documentos por Fecha
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={dateData}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="date" stroke="#9ca3af" fontSize={12} />
                  <YAxis stroke="#9ca3af" fontSize={12} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke="#6366f1" 
                    fillOpacity={1} 
                    fill="url(#colorTotal)" 
                    name="Total"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico circular - Estado de firmas */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-green-500" />
                Estado de Firmas
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={signatureData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${((percent || 0) * 100).toFixed(0)}%`}
                  >
                    {signatureData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Gráfico de barras - Productos más frecuentes */}
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 lg:col-span-2">
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-purple-500" />
                Productos Más Frecuentes
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={productData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#9ca3af" fontSize={12} />
                  <YAxis type="category" dataKey="name" stroke="#9ca3af" fontSize={12} width={80} />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#fff', 
                      border: 'none', 
                      borderRadius: '12px',
                      boxShadow: '0 10px 40px rgba(0,0,0,0.1)'
                    }}
                  />
                  <Bar dataKey="value" name="Frecuencia" radius={[0, 8, 8, 0]}>
                    {productData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

'use client'

import { motion } from 'framer-motion'
import { 
  FileText, 
  Calendar, 
  User, 
  Package, 
  CheckCircle, 
  Clock, 
  Eye,
  Truck,
  MapPin,
  ExternalLink,
  Check
} from 'lucide-react'
import { Documento } from '@/types'
import { formatShortDate, getStatusColor, getStatusLabel, truncateText } from '@/lib/utils'

interface DocumentCardProps {
  document: Documento
  onView: () => void
  isSelected?: boolean
  onToggleSelect?: () => void
  selectionMode?: boolean
}

export function DocumentCard({ document, onView, isSelected = false, onToggleSelect, selectionMode = false }: DocumentCardProps) {
  const totalProductos = document.productos?.length || 0
  const totalCantidad = document.cantidades?.reduce((acc, curr) => acc + parseInt(curr || '0'), 0) || 0

  const handleCardClick = (e: React.MouseEvent) => {
    if (selectionMode && onToggleSelect) {
      e.stopPropagation()
      onToggleSelect()
    }
  }

  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={handleCardClick}
      className={`group relative bg-white dark:bg-gray-800 rounded-2xl shadow-lg hover:shadow-2xl border-2 overflow-hidden flex flex-col h-full transition-all ${
        isSelected 
          ? 'border-indigo-500 ring-2 ring-indigo-200 dark:ring-indigo-800' 
          : 'border-gray-100 dark:border-gray-700'
      } ${selectionMode ? 'cursor-pointer' : ''}`}
    >
      {/* Barra de estado superior */}
      <div className={`h-1.5 w-full ${document.firmado ? 'bg-gradient-to-r from-emerald-400 to-green-500' : 'bg-gradient-to-r from-amber-400 to-orange-500'}`}></div>
      
      {/* Checkbox de selección */}
      {(selectionMode || isSelected) && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-4 right-4 z-10"
        >
          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleSelect?.()
            }}
            className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
              isSelected
                ? 'bg-indigo-500 text-white shadow-lg'
                : 'bg-white dark:bg-gray-700 border-2 border-gray-300 dark:border-gray-500 hover:border-indigo-500'
            }`}
          >
            {isSelected && <Check className="w-4 h-4" />}
          </button>
        </motion.div>
      )}
      
      <div className="p-5 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <motion.div 
              whileHover={{ rotate: 5 }}
              className="relative"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl blur-lg opacity-40 group-hover:opacity-60 transition-opacity"></div>
              <div className="relative p-2.5 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl shadow-lg">
                <FileText className="w-5 h-5 text-white" />
              </div>
            </motion.div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-gray-100 text-lg group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                {document.numero_guia || 'Sin número'}
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1.5 mt-0.5">
                <Calendar className="w-3 h-3" />
                {formatShortDate(document.fecha_documento)}
              </p>
            </div>
          </div>
          
          {/* Estado de firma */}
          <motion.div 
            whileHover={{ scale: 1.05 }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold shadow-sm ${
              document.firmado 
                ? 'bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-900/30 dark:to-green-900/30 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                : 'bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800'
            }`}
          >
            {document.firmado ? (
              <>
                <CheckCircle className="w-3.5 h-3.5" />
                Firmado
              </>
            ) : (
              <>
                <Clock className="w-3.5 h-3.5" />
                Pendiente
              </>
            )}
          </motion.div>
        </div>

        {/* Proveedor */}
        {document.proveedor && (
          <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300 mb-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <User className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="truncate font-medium">{document.proveedor}</span>
          </div>
        )}

        {/* Productos */}
        {document.productos && document.productos.length > 0 && (
          <div className="mb-4 flex-grow">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                <Package className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span className="font-semibold">Productos</span>
              </div>
              <span className="text-xs bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 px-2 py-0.5 rounded-full font-medium">
                {totalProductos} items • {totalCantidad} uds
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {document.productos.slice(0, 2).map((producto, i) => (
                <span 
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-xs font-medium border border-blue-100 dark:border-blue-800"
                >
                  <span className="truncate max-w-[120px]">{producto}</span>
                  {document.cantidades?.[i] && (
                    <span className="text-blue-500 dark:text-blue-400 font-bold">×{document.cantidades[i]}</span>
                  )}
                </span>
              ))}
              {document.productos.length > 2 && (
                <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-lg text-xs font-medium">
                  +{document.productos.length - 2} más
                </span>
              )}
            </div>
          </div>
        )}

        {/* Info adicional */}
        <div className="flex flex-wrap gap-3 text-xs text-gray-500 dark:text-gray-400 mb-4">
          {document.transportista && (
            <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
              <Truck className="w-3.5 h-3.5 text-orange-500 dark:text-orange-400" />
              {truncateText(document.transportista, 12)}
            </span>
          )}
          {document.placa && (
            <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg font-mono">
              🚐 {document.placa}
            </span>
          )}
          {document.direccion_destino && (
            <span className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-lg">
              <MapPin className="w-3.5 h-3.5 text-red-500 dark:text-red-400" />
              {truncateText(document.direccion_destino, 15)}
            </span>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100 dark:border-gray-700 mt-auto">
          <div className="flex items-center gap-2">
            <span className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${getStatusColor(document.ocr_status)}`}>
              {getStatusLabel(document.ocr_status)}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {document.numero_paginas} pág.
            </span>
          </div>
          
          <motion.button
            whileHover={{ scale: 1.05, x: 2 }}
            whileTap={{ scale: 0.95 }}
            onClick={onView}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white text-sm font-semibold rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg group/btn"
          >
            <Eye className="w-4 h-4" />
            Ver
            <ExternalLink className="w-3 h-3 opacity-0 -ml-1 group-hover/btn:opacity-100 group-hover/btn:ml-0 transition-all" />
          </motion.button>
        </div>
      </div>
    </motion.div>
  )
}

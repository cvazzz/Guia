'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Save, 
  FileText,
  User,
  MapPin,
  Calendar,
  Package,
  Truck,
  Hash,
  Loader2,
  CheckCircle,
  MessageSquare,
  AlertCircle
} from 'lucide-react'
import { Documento } from '@/types'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface EditDocumentModalProps {
  document: Documento
  isOpen: boolean
  onClose: () => void
  onSave: (updatedDoc: Documento) => void
}

export function EditDocumentModal({ document, isOpen, onClose, onSave }: EditDocumentModalProps) {
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    numero_guia: document.numero_guia || '',
    fecha_documento: document.fecha_documento || '',
    proveedor: document.proveedor || '',
    ruc: document.ruc || '',
    direccion_remitente: document.direccion_remitente || '',
    destinatario_nombre: document.destinatario_nombre || '',
    destinatario_ruc: document.destinatario_ruc || '',
    direccion_destino: document.direccion_destino || '',
    transportista: document.transportista || '',
    placa: document.placa || '',
    dni_conductor: document.dni_conductor || '',
    notas: document.notas || '',
    revisado: document.revisado || false,
    productos: document.productos?.join('\n') || '',
    cantidades: document.cantidades?.join('\n') || '',
    observaciones: document.observaciones || ''
  })

  useEffect(() => {
    setFormData({
      numero_guia: document.numero_guia || '',
      fecha_documento: document.fecha_documento || '',
      proveedor: document.proveedor || '',
      ruc: document.ruc || '',
      direccion_remitente: document.direccion_remitente || '',
      destinatario_nombre: document.destinatario_nombre || '',
      destinatario_ruc: document.destinatario_ruc || '',
      direccion_destino: document.direccion_destino || '',
      transportista: document.transportista || '',
      placa: document.placa || '',
      dni_conductor: document.dni_conductor || '',
      notas: document.notas || '',
      revisado: document.revisado || false,
      productos: document.productos?.join('\n') || '',
      cantidades: document.cantidades?.join('\n') || '',
      observaciones: document.observaciones || ''
    })
  }, [document])

  const handleChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const updateData = {
        numero_guia: formData.numero_guia || null,
        fecha_documento: formData.fecha_documento || null,
        proveedor: formData.proveedor || null,
        ruc: formData.ruc || null,
        direccion_remitente: formData.direccion_remitente || null,
        destinatario_nombre: formData.destinatario_nombre || null,
        destinatario_ruc: formData.destinatario_ruc || null,
        direccion_destino: formData.direccion_destino || null,
        transportista: formData.transportista || null,
        placa: formData.placa || null,
        dni_conductor: formData.dni_conductor || null,
        notas: formData.notas || null,
        revisado: formData.revisado,
        productos: formData.productos ? formData.productos.split('\n').filter(p => p.trim()) : null,
        cantidades: formData.cantidades ? formData.cantidades.split('\n').filter(c => c.trim()) : null,
        observaciones: formData.observaciones || null,
        updated_at: new Date().toISOString()
      }

      const { data, error } = await supabase
        .from('documentos_guia')
        .update(updateData)
        .eq('id', document.id)
        .select()
        .single()

      if (error) throw error

      toast.success('Documento actualizado correctamente')
      onSave(data as Documento)
      onClose()
    } catch (error) {
      console.error('Error saving document:', error)
      toast.error('Error al guardar los cambios')
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-6 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Editar Documento</h2>
                  <p className="text-white/80 text-sm">
                    {document.numero_guia || document.drive_file_name || 'Sin número'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Form Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información de Guía */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  Información de Guía
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Número de Guía
                  </label>
                  <input
                    type="text"
                    value={formData.numero_guia}
                    onChange={(e) => handleChange('numero_guia', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Ej: 001-123456"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Fecha del Documento
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.fecha_documento}
                      onChange={(e) => handleChange('fecha_documento', e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="DD/MM/YYYY"
                    />
                  </div>
                </div>
              </div>

              {/* Proveedor/Remitente */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Proveedor / Remitente
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Proveedor
                  </label>
                  <input
                    type="text"
                    value={formData.proveedor}
                    onChange={(e) => handleChange('proveedor', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Nombre del proveedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    RUC
                  </label>
                  <input
                    type="text"
                    value={formData.ruc}
                    onChange={(e) => handleChange('ruc', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="RUC del proveedor"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Dirección Origen
                  </label>
                  <input
                    type="text"
                    value={formData.direccion_remitente}
                    onChange={(e) => handleChange('direccion_remitente', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Dirección de origen"
                  />
                </div>
              </div>

              {/* Destinatario */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Destinatario
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Nombre Destinatario
                  </label>
                  <input
                    type="text"
                    value={formData.destinatario_nombre}
                    onChange={(e) => handleChange('destinatario_nombre', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Nombre del destinatario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    RUC Destinatario
                  </label>
                  <input
                    type="text"
                    value={formData.destinatario_ruc}
                    onChange={(e) => handleChange('destinatario_ruc', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="RUC del destinatario"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Dirección Destino
                  </label>
                  <input
                    type="text"
                    value={formData.direccion_destino}
                    onChange={(e) => handleChange('direccion_destino', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Dirección de destino"
                  />
                </div>
              </div>

              {/* Transporte */}
              <div className="space-y-4">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Truck className="w-4 h-4" />
                  Transporte
                </h3>
                
                <div>
                  <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Transportista
                  </label>
                  <input
                    type="text"
                    value={formData.transportista}
                    onChange={(e) => handleChange('transportista', e.target.value)}
                    className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                    placeholder="Nombre del transportista"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Placa
                    </label>
                    <input
                      type="text"
                      value={formData.placa}
                      onChange={(e) => handleChange('placa', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="ABC-123"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      DNI Conductor
                    </label>
                    <input
                      type="text"
                      value={formData.dni_conductor}
                      onChange={(e) => handleChange('dni_conductor', e.target.value)}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                      placeholder="12345678"
                    />
                  </div>
                </div>
              </div>

              {/* Productos */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Productos (uno por línea)
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Productos
                    </label>
                    <textarea
                      value={formData.productos}
                      onChange={(e) => handleChange('productos', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                      placeholder="Producto 1&#10;Producto 2&#10;Producto 3"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Cantidades
                    </label>
                    <textarea
                      value={formData.cantidades}
                      onChange={(e) => handleChange('cantidades', e.target.value)}
                      rows={4}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                      placeholder="10&#10;25&#10;5"
                    />
                  </div>
                </div>
              </div>

              {/* Notas y Observaciones */}
              <div className="space-y-4 md:col-span-2">
                <h3 className="font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Notas y Observaciones
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Notas personales
                    </label>
                    <textarea
                      value={formData.notas}
                      onChange={(e) => handleChange('notas', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-700/50 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-transparent transition-all resize-none"
                      placeholder="Escribe tus notas aquí..."
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                      Observaciones del documento
                    </label>
                    <textarea
                      value={formData.observaciones}
                      onChange={(e) => handleChange('observaciones', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all resize-none"
                      placeholder="Observaciones..."
                    />
                  </div>
                </div>

                {/* Checkbox de revisado */}
                <label className="flex items-center gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={formData.revisado}
                    onChange={(e) => handleChange('revisado', e.target.checked)}
                    className="w-5 h-5 rounded-md border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300 group-hover:text-emerald-600 transition-colors flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Marcar como revisado
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between flex-shrink-0">
            <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              Los cambios se guardarán inmediatamente
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-6 py-2.5 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl transition-colors font-medium"
              >
                Cancelar
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Guardar Cambios
                  </>
                )}
              </motion.button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

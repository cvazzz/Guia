'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Smartphone,
  Search,
  Filter,
  RefreshCw,
  Download,
  Upload,
  Users,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronDown,
  ChevronRight,
  X,
  Eye,
  Edit3,
  History,
  FileSpreadsheet,
  BarChart3,
  UserX,
  Package,
  Wrench,
  XCircle,
  ArrowLeftRight,
  Loader2,
  Home,
  Building2,
  User,
  Hash
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'
import { LDURegistro, LDUStats, LDUSearchParams, ExcelFile } from '@/types'
import { ImportWizard } from '@/components/ImportWizard'
import { Tooltip } from '@/components/Tooltip'
import Link from 'next/link'

// Componente de tarjeta de estadísticas
function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color, 
  onClick 
}: { 
  title: string
  value: number
  icon: any
  color: string
  onClick?: () => void
}) {
  return (
    <motion.div
      whileHover={{ scale: 1.02, y: -2 }}
      onClick={onClick}
      className={`bg-white dark:bg-gray-800 rounded-2xl p-5 shadow-lg border border-gray-100 dark:border-gray-700 ${onClick ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white mt-1">{value.toLocaleString()}</p>
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  )
}

// Componente de fila de LDU
function LDURow({ 
  ldu, 
  onView, 
  onEdit, 
  onReasignar,
  onViewHistory
}: { 
  ldu: LDURegistro
  onView: (ldu: LDURegistro) => void
  onEdit: (ldu: LDURegistro) => void
  onReasignar: (ldu: LDURegistro) => void
  onViewHistory: (ldu: LDURegistro) => void
}) {
  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'Activo': return 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
      case 'Dañado': return 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
      case 'En reparación': return 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/50 dark:text-yellow-300'
      case 'Pendiente devolución': return 'bg-orange-100 text-orange-700 dark:bg-orange-900/50 dark:text-orange-300'
      case 'Devuelto': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
      case 'Baja': return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
      case 'Perdido': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
      default: return 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400'
    }
  }

  const responsableNombre = [ldu.responsable_nombre, ldu.responsable_apellido]
    .filter(Boolean)
    .join(' ') || 'Sin asignar'

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
    >
      <td className="px-4 py-3">
        <Tooltip content={
          <div className="space-y-1">
            <p className="font-semibold">Dispositivo</p>
            <p>IMEI: {ldu.imei}</p>
            <p>Modelo: {ldu.modelo || 'N/A'}</p>
            {ldu.account && <p>Account: {ldu.account}</p>}
            {ldu.account_int && <p>Account Int: {ldu.account_int}</p>}
          </div>
        } position="right">
          <div className="flex items-center gap-3 cursor-pointer">
            <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-lg">
              <Smartphone className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <div>
              <p className="font-mono text-sm font-medium text-gray-800 dark:text-white">{ldu.imei}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{ldu.modelo || 'Sin modelo'}</p>
            </div>
          </div>
        </Tooltip>
      </td>
      <td className="px-4 py-3">
        <Tooltip content={
          <div className="space-y-1">
            <p className="font-semibold">Estado del dispositivo</p>
            <p>Estado actual: {ldu.estado || 'Sin estado'}</p>
            {ldu.uso && <p>Uso: {ldu.uso}</p>}
            {ldu.observaciones && <p className="max-w-xs">Obs: {ldu.observaciones}</p>}
          </div>
        } position="top">
          <span className={`px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer ${getEstadoColor(ldu.estado)}`}>
            {ldu.estado || 'Sin estado'}
          </span>
        </Tooltip>
      </td>
      <td className="px-4 py-3">
        <Tooltip content={
          <div className="space-y-1">
            <p className="font-semibold">Responsable</p>
            <p>Nombre: {responsableNombre}</p>
            {ldu.responsable_dni && <p>DNI: {ldu.responsable_dni}</p>}
            {ldu.supervisor && <p>Supervisor: {ldu.supervisor}</p>}
          </div>
        } position="top">
          <div className="flex items-center gap-2 cursor-pointer">
            <Users className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-800 dark:text-white">{responsableNombre}</p>
              {ldu.responsable_dni && (
                <p className="text-xs text-gray-500 dark:text-gray-400">DNI: {ldu.responsable_dni}</p>
              )}
            </div>
          </div>
        </Tooltip>
      </td>
      <td className="px-4 py-3">
        <Tooltip content={
          <div className="space-y-1">
            <p className="font-semibold">Ubicación</p>
            {ldu.city && <p>Ciudad: {ldu.city}</p>}
            {ldu.zone && <p>Zona: {ldu.zone}</p>}
            {ldu.departamento && <p>Departamento: {ldu.departamento}</p>}
            {ldu.punto_venta && <p>PDV: {ldu.punto_venta}</p>}
            {ldu.nombre_ruta && <p>Ruta: {ldu.nombre_ruta}</p>}
            {ldu.canal && <p>Canal: {ldu.canal}</p>}
            {ldu.tipo && <p>Tipo: {ldu.tipo}</p>}
          </div>
        } position="top">
          <div className="flex items-center gap-2 cursor-pointer">
            <MapPin className="w-4 h-4 text-gray-400" />
            <div>
              <p className="text-sm text-gray-800 dark:text-white">{ldu.city || ldu.region || 'Sin región'}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {ldu.punto_venta || ldu.nombre_ruta || ldu.canal || ''}
              </p>
            </div>
          </div>
        </Tooltip>
      </td>
      <td className="px-4 py-3">
        <Tooltip content={
          <div className="space-y-1">
            <p className="font-semibold">Sincronización</p>
            <p>{ldu.presente_en_ultima_importacion ? '✓ Presente en último Excel' : '⚠ No encontrado en último Excel'}</p>
            {ldu.fecha_ultima_verificacion && (
              <p>Última verificación: {new Date(ldu.fecha_ultima_verificacion).toLocaleString()}</p>
            )}
          </div>
        } position="left">
          <div className="flex items-center gap-1 cursor-pointer">
            {ldu.presente_en_ultima_importacion ? (
              <CheckCircle className="w-4 h-4 text-green-500" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            )}
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {ldu.presente_en_ultima_importacion ? 'Sync' : 'No Excel'}
            </span>
          </div>
        </Tooltip>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <Tooltip content="Ver detalles completos" position="top">
            <button
              onClick={() => onView(ldu)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Eye className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            </button>
          </Tooltip>
          <Tooltip content="Editar registro" position="top">
            <button
              onClick={() => onEdit(ldu)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <Edit3 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </button>
          </Tooltip>
          <Tooltip content="Reasignar a otro responsable" position="top">
            <button
              onClick={() => onReasignar(ldu)}
              className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4 text-blue-500" />
            </button>
          </Tooltip>
          <Tooltip content="Ver historial de cambios" position="top">
            <button
              onClick={() => onViewHistory(ldu)}
              className="p-1.5 hover:bg-purple-50 dark:hover:bg-purple-900/50 rounded-lg transition-colors"
            >
              <History className="w-4 h-4 text-purple-500" />
            </button>
          </Tooltip>
        </div>
      </td>
    </motion.tr>
  )
}

// Modal de edición
function LDUEditModal({ 
  ldu, 
  onClose,
  onSuccess
}: { 
  ldu: LDURegistro
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [syncToDrive, setSyncToDrive] = useState(true)
  const [formData, setFormData] = useState({
    modelo: ldu.modelo || '',
    account: ldu.account || '',
    account_int: ldu.account_int || '',
    supervisor: ldu.supervisor || '',
    zone: ldu.zone || '',
    departamento: ldu.departamento || '',
    city: ldu.city || '',
    canal: ldu.canal || '',
    tipo: ldu.tipo || '',
    punto_venta: ldu.punto_venta || '',
    nombre_ruta: ldu.nombre_ruta || '',
    cobertura_valor: ldu.cobertura_valor?.toString() || '',
    campo_reg: ldu.campo_reg || '',
    campo_ok: ldu.campo_ok || '',
    uso: ldu.uso || '',
    observaciones: ldu.observaciones || '',
    estado: ldu.estado || '',
    responsable_dni: ldu.responsable_dni || '',
    responsable_nombre: ldu.responsable_nombre || '',
    responsable_apellido: ldu.responsable_apellido || '',
    region: ldu.region || ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Construir solo campos modificados
      const changes: Record<string, any> = {}
      
      Object.entries(formData).forEach(([key, value]) => {
        const originalValue = (ldu as any)[key]
        const originalStr = originalValue?.toString() || ''
        const newStr = value?.toString() || ''
        
        if (originalStr !== newStr) {
          if (key === 'cobertura_valor') {
            changes[key] = value ? parseFloat(value) : null
          } else {
            changes[key] = value || null
          }
        }
      })

      if (Object.keys(changes).length === 0) {
        toast('No hay cambios para guardar', { icon: 'ℹ️' })
        onClose()
        return
      }

      changes.sync_to_drive = syncToDrive

      const response = await fetch(`/api/ldu/registros/${ldu.imei}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(changes)
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.detail || 'Error al actualizar')
      }

      if (data.drive_synced) {
        toast.success('Registro actualizado y sincronizado con Drive')
      } else {
        toast.success('Registro actualizado')
      }
      
      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error:', error)
      toast.error(error instanceof Error ? error.message : 'Error al actualizar')
    } finally {
      setLoading(false)
    }
  }

  const estadoOptions = ['Activo', 'Dañado', 'En reparación', 'Pendiente devolución', 'Devuelto', 'Baja', 'Perdido']

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl">
                <Edit3 className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Editar LDU</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{ldu.imei}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-3 gap-4">
            {/* Dispositivo */}
            <div className="space-y-3 col-span-3 md:col-span-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                <Smartphone className="w-4 h-4" /> Dispositivo
              </h3>
              <input
                type="text"
                placeholder="Modelo"
                value={formData.modelo}
                onChange={e => setFormData({...formData, modelo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <select
                value={formData.estado}
                onChange={e => setFormData({...formData, estado: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              >
                <option value="">Estado...</option>
                {estadoOptions.map(e => <option key={e} value={e}>{e}</option>)}
              </select>
              <input
                type="text"
                placeholder="Uso"
                value={formData.uso}
                onChange={e => setFormData({...formData, uso: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Cuenta */}
            <div className="space-y-3 col-span-3 md:col-span-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                <Building2 className="w-4 h-4" /> Cuenta
              </h3>
              <input
                type="text"
                placeholder="Account"
                value={formData.account}
                onChange={e => setFormData({...formData, account: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Account Int"
                value={formData.account_int}
                onChange={e => setFormData({...formData, account_int: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Supervisor"
                value={formData.supervisor}
                onChange={e => setFormData({...formData, supervisor: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Responsable */}
            <div className="space-y-3 col-span-3 md:col-span-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                <User className="w-4 h-4" /> Responsable
              </h3>
              <input
                type="text"
                placeholder="DNI"
                value={formData.responsable_dni}
                onChange={e => setFormData({...formData, responsable_dni: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Nombre"
                value={formData.responsable_nombre}
                onChange={e => setFormData({...formData, responsable_nombre: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Apellido"
                value={formData.responsable_apellido}
                onChange={e => setFormData({...formData, responsable_apellido: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Ubicación */}
            <div className="space-y-3 col-span-3 md:col-span-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                <MapPin className="w-4 h-4" /> Ubicación
              </h3>
              <input
                type="text"
                placeholder="Ciudad"
                value={formData.city}
                onChange={e => setFormData({...formData, city: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Zona"
                value={formData.zone}
                onChange={e => setFormData({...formData, zone: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Departamento"
                value={formData.departamento}
                onChange={e => setFormData({...formData, departamento: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Punto de Venta */}
            <div className="space-y-3 col-span-3 md:col-span-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                <Package className="w-4 h-4" /> Punto de Venta
              </h3>
              <input
                type="text"
                placeholder="Canal"
                value={formData.canal}
                onChange={e => setFormData({...formData, canal: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="Tipo"
                value={formData.tipo}
                onChange={e => setFormData({...formData, tipo: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="PDV"
                value={formData.punto_venta}
                onChange={e => setFormData({...formData, punto_venta: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Control */}
            <div className="space-y-3 col-span-3 md:col-span-1">
              <h3 className="font-semibold text-gray-700 dark:text-gray-200 flex items-center gap-2 text-sm">
                <Hash className="w-4 h-4" /> Control
              </h3>
              <input
                type="text"
                placeholder="Ruta"
                value={formData.nombre_ruta}
                onChange={e => setFormData({...formData, nombre_ruta: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="REG"
                value={formData.campo_reg}
                onChange={e => setFormData({...formData, campo_reg: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
              <input
                type="text"
                placeholder="OK"
                value={formData.campo_ok}
                onChange={e => setFormData({...formData, campo_ok: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Observaciones */}
            <div className="col-span-3">
              <textarea
                placeholder="Observaciones"
                value={formData.observaciones}
                onChange={e => setFormData({...formData, observaciones: e.target.value})}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
              />
            </div>

            {/* Sync to Drive option */}
            {ldu.drive_file_id && (
              <div className="col-span-3 flex items-center gap-3 p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg">
                <input
                  type="checkbox"
                  id="syncToDrive"
                  checked={syncToDrive}
                  onChange={e => setSyncToDrive(e.target.checked)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <label htmlFor="syncToDrive" className="text-sm text-blue-700 dark:text-blue-300">
                  Sincronizar cambios con Google Sheets automáticamente
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              {loading ? 'Guardando...' : 'Guardar Cambios'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Modal de detalles
function LDUDetailModal({ 
  ldu, 
  onClose 
}: { 
  ldu: LDURegistro
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                <Smartphone className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Detalles del LDU</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-mono">{ldu.imei}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4" /> Dispositivo
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">IMEI:</span> <span className="font-mono">{ldu.imei}</span></p>
                <p><span className="text-gray-500">Modelo:</span> {ldu.modelo || '-'}</p>
                <p><span className="text-gray-500">Estado:</span> {ldu.estado || '-'}</p>
                <p><span className="text-gray-500">Uso:</span> {ldu.uso || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Building2 className="w-4 h-4" /> Cuenta
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Account:</span> {ldu.account || '-'}</p>
                <p><span className="text-gray-500">Account Int:</span> {ldu.account_int || '-'}</p>
                <p><span className="text-gray-500">Supervisor:</span> {ldu.supervisor || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Users className="w-4 h-4" /> Responsable
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Nombre:</span> {ldu.responsable_nombre || '-'} {ldu.responsable_apellido || ''}</p>
                <p><span className="text-gray-500">DNI:</span> {ldu.responsable_dni || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <MapPin className="w-4 h-4" /> Ubicación
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Ciudad:</span> {ldu.city || ldu.region || '-'}</p>
                <p><span className="text-gray-500">Zona:</span> {ldu.zone || '-'}</p>
                <p><span className="text-gray-500">Departamento:</span> {ldu.departamento || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Package className="w-4 h-4" /> Punto de Venta
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">Canal:</span> {ldu.canal || '-'}</p>
                <p><span className="text-gray-500">Tipo:</span> {ldu.tipo || '-'}</p>
                <p><span className="text-gray-500">PDV:</span> {ldu.punto_venta || '-'}</p>
                <p><span className="text-gray-500">Ruta:</span> {ldu.nombre_ruta || '-'}</p>
                <p><span className="text-gray-500">HC Real:</span> {ldu.cobertura_valor || '-'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-gray-800 dark:text-white flex items-center gap-2">
                <Clock className="w-4 h-4" /> Sincronización
              </h3>
              <div className="space-y-2 text-sm">
                <p><span className="text-gray-500">En último Excel:</span> {ldu.presente_en_ultima_importacion ? 'Sí' : 'No'}</p>
                <p><span className="text-gray-500">Última verificación:</span> {ldu.fecha_ultima_verificacion ? new Date(ldu.fecha_ultima_verificacion).toLocaleString() : '-'}</p>
                <p><span className="text-gray-500">REG:</span> {ldu.campo_reg || '-'}</p>
                <p><span className="text-gray-500">OK:</span> {ldu.campo_ok || '-'}</p>
              </div>
            </div>
          </div>

          {ldu.observaciones && (
            <div className="mt-6">
              <h3 className="font-semibold text-gray-800 dark:text-white mb-2">Observaciones</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                {ldu.observaciones}
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Modal de reasignación
function ReasignarModal({
  ldu,
  onClose,
  onSuccess
}: {
  ldu: LDURegistro
  onClose: () => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    nuevo_dni: '',
    nuevo_nombre: '',
    nuevo_apellido: '',
    motivo: 'reasignacion',
    comentarios: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch('/api/ldu/reasignar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imei: ldu.imei,
          ...formData,
          user: 'web_user'
        })
      })

      if (!response.ok) throw new Error('Error en la reasignación')

      toast.success('LDU reasignado correctamente')
      onSuccess()
      onClose()
    } catch (error) {
      toast.error('Error al reasignar el LDU')
    } finally {
      setLoading(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-blue-500" />
              Reasignar LDU
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">IMEI: {ldu.imei}</p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              DNI del nuevo responsable *
            </label>
            <input
              type="text"
              required
              value={formData.nuevo_dni}
              onChange={e => setFormData({ ...formData, nuevo_dni: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              placeholder="12345678"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Nombre *
              </label>
              <input
                type="text"
                required
                value={formData.nuevo_nombre}
                onChange={e => setFormData({ ...formData, nuevo_nombre: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Apellido *
              </label>
              <input
                type="text"
                required
                value={formData.nuevo_apellido}
                onChange={e => setFormData({ ...formData, nuevo_apellido: e.target.value })}
                className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Motivo *
            </label>
            <select
              value={formData.motivo}
              onChange={e => setFormData({ ...formData, motivo: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
            >
              <option value="reasignacion">Reasignación</option>
              <option value="cese">Cese de personal</option>
              <option value="rotacion">Rotación</option>
              <option value="vacaciones">Vacaciones</option>
              <option value="otro">Otro</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Comentarios
            </label>
            <textarea
              value={formData.comentarios}
              onChange={e => setFormData({ ...formData, comentarios: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
              rows={3}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowLeftRight className="w-4 h-4" />}
              Reasignar
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  )
}

// Modal de importación
function ImportModal({
  onClose,
  onSuccess
}: {
  onClose: () => void
  onSuccess: () => void
}) {
  const [files, setFiles] = useState<ExcelFile[]>([])
  const [loading, setLoading] = useState(true)
  const [importing, setImporting] = useState(false)
  const [selectedFile, setSelectedFile] = useState<string | null>(null)

  useEffect(() => {
    loadFiles()
  }, [])

  const loadFiles = async () => {
    try {
      const response = await fetch('/api/ldu/excel-files')
      const data = await response.json()
      if (data.success) {
        setFiles(data.data)
      }
    } catch (error) {
      toast.error('Error cargando archivos')
    } finally {
      setLoading(false)
    }
  }

  const handleImport = async () => {
    if (!selectedFile) return

    setImporting(true)
    try {
      const response = await fetch('/api/ldu/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          file_id: selectedFile,
          user: 'web_user'
        })
      })

      const data = await response.json()
      
      if (data.success) {
        toast.success(`Importación completada: ${data.data.insertados} insertados, ${data.data.actualizados} actualizados`)
        onSuccess()
        onClose()
      } else {
        throw new Error(data.detail || 'Error en la importación')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error en la importación')
    } finally {
      setImporting(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-green-500" />
              Importar desde Excel
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : files.length === 0 ? (
            <div className="text-center py-8">
              <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No se encontraron archivos Excel en Drive</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {files.map(file => (
                <div
                  key={file.id}
                  onClick={() => setSelectedFile(file.id)}
                  className={`p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    selectedFile === file.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-100 dark:border-gray-700 hover:border-gray-200 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <FileSpreadsheet className={`w-8 h-8 ${selectedFile === file.id ? 'text-indigo-500' : 'text-green-500'}`} />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white truncate">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        Modificado: {new Date(file.modifiedTime).toLocaleString()}
                      </p>
                    </div>
                    {selectedFile === file.id && (
                      <CheckCircle className="w-5 h-5 text-indigo-500 flex-shrink-0" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            Cancelar
          </button>
          <button
            onClick={handleImport}
            disabled={!selectedFile || importing}
            className="flex-1 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {importing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Importando...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4" />
                Importar
              </>
            )}
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// Página principal
export default function LDUPage() {
  const [registros, setRegistros] = useState<LDURegistro[]>([])
  const [stats, setStats] = useState<LDUStats>({ total: 0, sin_responsable: 0, ausentes_ultimo_excel: 0 })
  const [loading, setLoading] = useState(true)
  const [searchParams, setSearchParams] = useState<LDUSearchParams>({ page: 1, limit: 50 })
  const [totalPages, setTotalPages] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  
  // Modales
  const [selectedLDU, setSelectedLDU] = useState<LDURegistro | null>(null)
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [showReasignarModal, setShowReasignarModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showImportModal, setShowImportModal] = useState(false)
  const [showFilters, setShowFilters] = useState(false)

  // Filtros
  const [filters, setFilters] = useState({
    estado: '',
    region: '',
    presente: ''
  })

  const loadData = useCallback(async () => {
    setLoading(true)
    try {
      // Cargar registros
      let query = supabase
        .from('ldu_registros')
        .select('*', { count: 'exact' })
        .eq('activo', true)
        .order('fecha_actualizacion', { ascending: false })

      if (searchQuery) {
        query = query.or(`imei.ilike.%${searchQuery}%,modelo.ilike.%${searchQuery}%,responsable_nombre.ilike.%${searchQuery}%,responsable_dni.ilike.%${searchQuery}%,punto_venta.ilike.%${searchQuery}%`)
      }

      if (filters.estado) {
        query = query.eq('estado', filters.estado)
      }

      if (filters.region) {
        query = query.ilike('region', `%${filters.region}%`)
      }

      if (filters.presente === 'true') {
        query = query.eq('presente_en_ultima_importacion', true)
      } else if (filters.presente === 'false') {
        query = query.eq('presente_en_ultima_importacion', false)
      }

      const offset = ((searchParams.page || 1) - 1) * (searchParams.limit || 50)
      query = query.range(offset, offset + (searchParams.limit || 50) - 1)

      const { data, count, error } = await query

      if (error) throw error

      setRegistros(data || [])
      setTotalPages(Math.ceil((count || 0) / (searchParams.limit || 50)))

      // Cargar stats
      const { count: totalCount } = await supabase
        .from('ldu_registros')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)

      const { count: sinRespCount } = await supabase
        .from('ldu_registros')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)
        .is('responsable_dni', null)

      const { count: ausentesCount } = await supabase
        .from('ldu_registros')
        .select('id', { count: 'exact', head: true })
        .eq('activo', true)
        .eq('presente_en_ultima_importacion', false)

      setStats({
        total: totalCount || 0,
        sin_responsable: sinRespCount || 0,
        ausentes_ultimo_excel: ausentesCount || 0
      })

    } catch (error) {
      console.error('Error cargando datos:', error)
      toast.error('Error cargando datos')
    } finally {
      setLoading(false)
    }
  }, [searchQuery, filters, searchParams])

  useEffect(() => {
    loadData()
  }, [loadData])

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setSearchParams({ ...searchParams, page: 1 })
    loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                href="/"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                title="Volver al inicio"
              >
                <Home className="w-5 h-5" />
              </Link>
              <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-sm">
                <Smartphone className="w-8 h-8" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Gestión de LDU</h1>
                <p className="text-indigo-100">Control y seguimiento de dispositivos</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowImportModal(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-colors border border-white/20"
              >
                <Upload className="w-4 h-4" />
                Importar Excel
              </button>
              <button
                onClick={loadData}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-indigo-600 font-semibold rounded-xl hover:bg-indigo-50 transition-colors"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Actualizar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 -mt-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <StatCard
            title="Total LDU"
            value={stats.total}
            icon={Smartphone}
            color="bg-gradient-to-br from-blue-500 to-blue-600"
          />
          <StatCard
            title="Sin Responsable"
            value={stats.sin_responsable}
            icon={UserX}
            color="bg-gradient-to-br from-amber-500 to-orange-500"
            onClick={() => setFilters({ ...filters, presente: '' })}
          />
          <StatCard
            title="No en Último Excel"
            value={stats.ausentes_ultimo_excel}
            icon={AlertTriangle}
            color="bg-gradient-to-br from-red-500 to-rose-500"
            onClick={() => setFilters({ ...filters, presente: 'false' })}
          />
          <StatCard
            title="Sincronizados"
            value={stats.total - stats.ausentes_ultimo_excel}
            icon={CheckCircle}
            color="bg-gradient-to-br from-green-500 to-emerald-500"
            onClick={() => setFilters({ ...filters, presente: 'true' })}
          />
        </div>
      </div>

      {/* Search and Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-4">
          <form onSubmit={handleSearch} className="flex gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por IMEI, modelo, responsable, DNI, punto de venta..."
                className="w-full pl-12 pr-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-white dark:bg-gray-700 text-gray-800 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`px-4 py-3 rounded-xl border transition-colors flex items-center gap-2 ${
                showFilters
                  ? 'bg-indigo-50 border-indigo-200 text-indigo-600 dark:bg-indigo-900/50 dark:border-indigo-700'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
              }`}
            >
              <Filter className="w-5 h-5" />
              Filtros
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
            >
              Buscar
            </button>
          </form>

          <AnimatePresence>
            {showFilters && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-100 dark:border-gray-700">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado</label>
                    <select
                      value={filters.estado}
                      onChange={e => setFilters({ ...filters, estado: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="Activo">Activo</option>
                      <option value="Dañado">Dañado</option>
                      <option value="En reparación">En reparación</option>
                      <option value="Pendiente devolución">Pendiente devolución</option>
                      <option value="Devuelto">Devuelto</option>
                      <option value="Baja">Baja</option>
                      <option value="Perdido">Perdido</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Región</label>
                    <input
                      type="text"
                      value={filters.region}
                      onChange={e => setFilters({ ...filters, region: e.target.value })}
                      placeholder="Filtrar por región"
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sincronización</label>
                    <select
                      value={filters.presente}
                      onChange={e => setFilters({ ...filters, presente: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-white"
                    >
                      <option value="">Todos</option>
                      <option value="true">En último Excel</option>
                      <option value="false">No en último Excel</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setFilters({ estado: '', region: '', presente: '' })
                      setSearchQuery('')
                    }}
                    className="text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    Limpiar filtros
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Table */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6 pb-8">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-indigo-500" />
            </div>
          ) : registros.length === 0 ? (
            <div className="text-center py-20">
              <Smartphone className="w-16 h-16 text-gray-200 dark:text-gray-600 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400">No se encontraron registros</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Dispositivo</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Responsable</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Ubicación</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Sync</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {registros.map(ldu => (
                      <LDURow
                        key={ldu.id}
                        ldu={ldu}
                        onView={(ldu) => { setSelectedLDU(ldu); setShowDetailModal(true) }}
                        onEdit={(ldu) => { setSelectedLDU(ldu); setShowEditModal(true) }}
                        onReasignar={(ldu) => { setSelectedLDU(ldu); setShowReasignarModal(true) }}
                        onViewHistory={(ldu) => { setSelectedLDU(ldu) }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="px-4 py-3 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Mostrando {registros.length} de {stats.total} registros
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSearchParams({ ...searchParams, page: (searchParams.page || 1) - 1 })}
                    disabled={(searchParams.page || 1) <= 1}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Anterior
                  </button>
                  <span className="px-4 py-2 text-gray-600 dark:text-gray-300">
                    Página {searchParams.page || 1} de {totalPages}
                  </span>
                  <button
                    onClick={() => setSearchParams({ ...searchParams, page: (searchParams.page || 1) + 1 })}
                    disabled={(searchParams.page || 1) >= totalPages}
                    className="px-4 py-2 border border-gray-200 dark:border-gray-600 rounded-lg disabled:opacity-50 hover:bg-gray-50 dark:hover:bg-gray-700"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Modales */}
      <AnimatePresence>
        {showDetailModal && selectedLDU && (
          <LDUDetailModal ldu={selectedLDU} onClose={() => setShowDetailModal(false)} />
        )}
        {showReasignarModal && selectedLDU && (
          <ReasignarModal
            ldu={selectedLDU}
            onClose={() => setShowReasignarModal(false)}
            onSuccess={loadData}
          />
        )}
        {showEditModal && selectedLDU && (
          <LDUEditModal
            ldu={selectedLDU}
            onClose={() => setShowEditModal(false)}
            onSuccess={() => { loadData(); setShowEditModal(false) }}
          />
        )}
        {showImportModal && (
          <ImportWizard
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onSuccess={loadData}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

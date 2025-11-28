'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FolderSync, 
  X, 
  RefreshCw,
  FileText,
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2,
  Play,
  Pause,
  HardDrive,
  CloudOff,
  Database,
  ArrowRight,
  Eye,
  Download,
  Settings,
  ChevronDown,
  ChevronUp
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import toast from 'react-hot-toast'

interface DriveFile {
  id: string
  name: string
  createdTime: string
  webViewLink?: string
  processed: boolean
}

interface SyncPanelProps {
  isOpen: boolean
  onClose: () => void
  onProcessComplete?: () => void
}

export function SyncPanel({ isOpen, onClose, onProcessComplete }: SyncPanelProps) {
  const [loading, setLoading] = useState(false)
  const [driveFiles, setDriveFiles] = useState<DriveFile[]>([])
  const [processedIds, setProcessedIds] = useState<Set<string>>(new Set())
  const [processing, setProcessing] = useState(false)
  const [processCount, setProcessCount] = useState(5)
  const [currentProcessing, setCurrentProcessing] = useState<string | null>(null)
  const [processedCount, setProcessedCount] = useState(0)
  const [showProcessed, setShowProcessed] = useState(false)
  const [showPending, setShowPending] = useState(true)
  const [lastSync, setLastSync] = useState<Date | null>(null)

  // Stats
  const totalFiles = driveFiles.length
  const processedFiles = driveFiles.filter(f => f.processed)
  const pendingFiles = driveFiles.filter(f => !f.processed)

  // Cargar archivos de Drive (simulado con datos de Supabase por ahora)
  const loadDriveFiles = useCallback(async () => {
    setLoading(true)
    
    try {
      // Obtener todos los documentos de Supabase para ver cuáles están procesados
      const { data: docs, error } = await supabase
        .from('documentos_guia')
        .select('drive_file_id, drive_file_name, created_at, drive_url')
        .order('created_at', { ascending: false })

      if (error) throw error

      // Convertir a formato DriveFile (todos procesados ya que vienen de Supabase)
      const files: DriveFile[] = (docs || []).map(doc => ({
        id: doc.drive_file_id,
        name: doc.drive_file_name || 'Sin nombre',
        createdTime: doc.created_at,
        webViewLink: doc.drive_url,
        processed: true
      }))

      // Actualizar IDs procesados
      setProcessedIds(new Set(files.map(f => f.id)))
      setDriveFiles(files)
      setLastSync(new Date())

      toast.success(`Se encontraron ${files.length} archivos procesados`)

    } catch (error) {
      console.error('Error loading files:', error)
      toast.error('Error al cargar archivos')
    } finally {
      setLoading(false)
    }
  }, [])

  // Cargar al abrir
  useEffect(() => {
    if (isOpen) {
      loadDriveFiles()
    }
  }, [isOpen, loadDriveFiles])

  // Simular proceso de archivos (en producción llamaría al backend)
  const startProcessing = async () => {
    if (pendingFiles.length === 0) {
      toast.error('No hay archivos pendientes de procesar')
      return
    }

    setProcessing(true)
    setProcessedCount(0)
    const toProcess = pendingFiles.slice(0, processCount)

    for (let i = 0; i < toProcess.length; i++) {
      const file = toProcess[i]
      setCurrentProcessing(file.id)
      
      // Simular tiempo de procesamiento
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      // Marcar como procesado
      setDriveFiles(prev => prev.map(f => 
        f.id === file.id ? { ...f, processed: true } : f
      ))
      setProcessedIds(prev => new Set(prev).add(file.id))
      setProcessedCount(i + 1)
    }

    setProcessing(false)
    setCurrentProcessing(null)
    toast.success(`${toProcess.length} archivos procesados correctamente`)
    onProcessComplete?.()
  }

  const stopProcessing = () => {
    setProcessing(false)
    setCurrentProcessing(null)
    toast('Procesamiento detenido', { icon: '⏸️' })
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
          <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 text-white flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <FolderSync className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Sincronización con Google Drive</h2>
                  <p className="text-white/80 text-sm">
                    Gestiona los archivos TIF desde tu carpeta de Drive
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

            {/* Stats rápidos */}
            <div className="grid grid-cols-3 gap-4 mt-4">
              <div className="bg-white/10 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <HardDrive className="w-4 h-4" />
                  <span className="text-2xl font-bold">{totalFiles}</span>
                </div>
                <span className="text-xs text-white/70">Total en Drive</span>
              </div>
              <div className="bg-emerald-500/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-2xl font-bold">{processedFiles.length}</span>
                </div>
                <span className="text-xs text-white/70">Procesados</span>
              </div>
              <div className="bg-amber-500/30 rounded-xl p-3 text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Clock className="w-4 h-4" />
                  <span className="text-2xl font-bold">{pendingFiles.length}</span>
                </div>
                <span className="text-xs text-white/70">Pendientes</span>
              </div>
            </div>
          </div>

          {/* Controles de procesamiento */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
            <div className="flex flex-col sm:flex-row items-center gap-4">
              <div className="flex items-center gap-3 flex-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Procesar:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setProcessCount(Math.max(1, processCount - 1))}
                    disabled={processing}
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={processCount}
                    onChange={(e) => setProcessCount(Math.max(1, parseInt(e.target.value) || 1))}
                    disabled={processing}
                    className="w-16 text-center px-2 py-1.5 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg"
                  />
                  <button
                    onClick={() => setProcessCount(processCount + 1)}
                    disabled={processing}
                    className="w-8 h-8 flex items-center justify-center bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
                  >
                    +
                  </button>
                </div>
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  archivos
                </span>
              </div>

              <div className="flex items-center gap-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={loadDriveFiles}
                  disabled={loading || processing}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  Actualizar
                </motion.button>

                {processing ? (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={stopProcessing}
                    className="flex items-center gap-2 px-6 py-2.5 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors"
                  >
                    <Pause className="w-4 h-4" />
                    Detener
                  </motion.button>
                ) : (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startProcessing}
                    disabled={pendingFiles.length === 0 || loading}
                    className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg"
                  >
                    <Play className="w-4 h-4" />
                    Iniciar Procesamiento
                  </motion.button>
                )}
              </div>
            </div>

            {/* Barra de progreso */}
            {processing && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-2">
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Procesando...
                  </span>
                  <span>{processedCount} / {Math.min(processCount, pendingFiles.length)}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(processedCount / Math.min(processCount, pendingFiles.length)) * 100}%` }}
                    className="bg-gradient-to-r from-emerald-500 to-green-500 h-2 rounded-full"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Lista de archivos */}
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Loader2 className="w-10 h-10 text-indigo-500 animate-spin mb-4" />
                <p className="text-gray-500 dark:text-gray-400">Cargando archivos de Drive...</p>
              </div>
            ) : driveFiles.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <CloudOff className="w-16 h-16 text-gray-300 dark:text-gray-600 mb-4" />
                <p className="text-gray-500 dark:text-gray-400 text-center">
                  No se encontraron archivos TIF en la carpeta de Drive
                </p>
                <p className="text-gray-400 dark:text-gray-500 text-sm mt-1">
                  Asegúrate de que el backend esté conectado a Google Drive
                </p>
              </div>
            ) : (
              <>
                {/* Sección de pendientes */}
                {pendingFiles.length > 0 && (
                  <div>
                    <button
                      onClick={() => setShowPending(!showPending)}
                      className="w-full p-4 flex items-center justify-between bg-amber-50 dark:bg-amber-900/20 hover:bg-amber-100 dark:hover:bg-amber-900/30 transition-colors"
                    >
                      <h3 className="font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Pendientes de Procesar ({pendingFiles.length})
                      </h3>
                      {showPending ? <ChevronUp className="w-5 h-5 text-amber-600" /> : <ChevronDown className="w-5 h-5 text-amber-600" />}
                    </button>

                    <AnimatePresence>
                      {showPending && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="divide-y divide-gray-100 dark:divide-gray-800"
                        >
                          {pendingFiles.map((file, index) => (
                            <motion.div
                              key={file.id}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: index * 0.02 }}
                              className={`p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors ${
                                currentProcessing === file.id ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                              }`}
                            >
                              <div className={`p-2 rounded-lg ${
                                currentProcessing === file.id 
                                  ? 'bg-blue-100 dark:bg-blue-900/50' 
                                  : 'bg-amber-100 dark:bg-amber-900/30'
                              }`}>
                                {currentProcessing === file.id ? (
                                  <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
                                ) : (
                                  <FileText className="w-5 h-5 text-amber-600" />
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(file.createdTime).toLocaleString()}
                                </p>
                              </div>
                              <span className="px-3 py-1 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-medium rounded-full">
                                Pendiente
                              </span>
                            </motion.div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                {/* Sección de procesados */}
                <div>
                  <button
                    onClick={() => setShowProcessed(!showProcessed)}
                    className="w-full p-4 flex items-center justify-between bg-emerald-50 dark:bg-emerald-900/20 hover:bg-emerald-100 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <h3 className="font-semibold text-emerald-700 dark:text-emerald-400 flex items-center gap-2">
                      <CheckCircle className="w-5 h-5" />
                      Procesados ({processedFiles.length})
                    </h3>
                    {showProcessed ? <ChevronUp className="w-5 h-5 text-emerald-600" /> : <ChevronDown className="w-5 h-5 text-emerald-600" />}
                  </button>

                  <AnimatePresence>
                    {showProcessed && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="divide-y divide-gray-100 dark:divide-gray-800 max-h-80 overflow-y-auto"
                      >
                        {processedFiles.map((file, index) => (
                          <motion.div
                            key={file.id}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.02 }}
                            className="p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                          >
                            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                              <FileText className="w-5 h-5 text-emerald-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-500 dark:text-gray-400">
                                {new Date(file.createdTime).toLocaleString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {file.webViewLink && (
                                <button
                                  onClick={() => window.open(file.webViewLink, '_blank')}
                                  className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                  title="Ver en Drive"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              )}
                              <span className="px-3 py-1 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-xs font-medium rounded-full">
                                ✓ Procesado
                              </span>
                            </div>
                          </motion.div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex-shrink-0">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-4">
                {lastSync && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4" />
                    Última sync: {lastSync.toLocaleTimeString()}
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Database className="w-4 h-4" />
                  {processedFiles.length} en base de datos
                </span>
              </div>
              <button
                onClick={onClose}
                className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

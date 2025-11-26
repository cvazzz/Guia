'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  X, 
  Download,
  FileArchive,
  ExternalLink,
  FileText,
  Image,
  CheckCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Eye
} from 'lucide-react'
import { Documento } from '@/types'
import toast from 'react-hot-toast'
import JSZip from 'jszip'

interface DownloadModalProps {
  documents: Documento[]
  isOpen: boolean
  onClose: () => void
}

export function DownloadModal({ documents, isOpen, onClose }: DownloadModalProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const [expandedList, setExpandedList] = useState(true)
  const [downloadedItems, setDownloadedItems] = useState<Set<number>>(new Set())

  // Descargar un solo archivo TIF
  const downloadSingleFile = (doc: Documento) => {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
    window.open(downloadUrl, '_blank')
    setDownloadedItems(prev => new Set(prev).add(doc.id))
    toast.success(`Descargando: ${doc.numero_guia || doc.drive_file_name}`)
  }

  // Ver archivo en Google Drive
  const viewInDrive = (doc: Documento) => {
    const viewUrl = doc.drive_url || `https://drive.google.com/file/d/${doc.drive_file_id}/view`
    window.open(viewUrl, '_blank')
  }

  // Descargar todos los archivos TIF (abre múltiples descargas)
  const downloadAllFiles = async () => {
    setDownloading(true)
    setDownloadProgress({ current: 0, total: documents.length })

    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i]
      setDownloadProgress({ current: i + 1, total: documents.length })
      
      const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
      window.open(downloadUrl, '_blank')
      setDownloadedItems(prev => new Set(prev).add(doc.id))
      
      // Esperar un poco entre descargas para no saturar
      await new Promise(resolve => setTimeout(resolve, 800))
    }

    setDownloading(false)
    toast.success(`${documents.length} descargas iniciadas`)
  }

  // Descargar ZIP con datos JSON
  const downloadDataZip = async () => {
    setDownloading(true)
    
    try {
      const zip = new JSZip()
      const docsFolder = zip.folder('guias_remision_datos')

      for (const doc of documents) {
        const fileName = doc.numero_guia?.replace(/[/\\?%*:|"<>]/g, '-') || `documento_${doc.id}`
        
        const metadata = {
          numero_guia: doc.numero_guia,
          fecha_documento: doc.fecha_documento,
          proveedor: doc.proveedor,
          ruc: doc.ruc,
          destinatario: doc.destinatario_nombre,
          direccion_destino: doc.direccion_destino,
          productos: doc.productos?.map((prod, idx) => ({
            producto: prod,
            codigo: doc.codigos_producto?.[idx],
            cantidad: doc.cantidades?.[idx],
            unidad: doc.unidad_medida?.[idx]
          })),
          transportista: doc.transportista,
          placa: doc.placa,
          firmado: doc.firmado,
          firma_confianza: doc.firma_confianza,
          observaciones: doc.observaciones,
          drive_url: doc.drive_url || `https://drive.google.com/file/d/${doc.drive_file_id}/view`,
          download_url: `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
        }
        docsFolder?.file(`${fileName}.json`, JSON.stringify(metadata, null, 2))
      }

      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `guias_datos_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success('Datos JSON descargados')
    } catch (error) {
      toast.error('Error al crear el archivo ZIP')
    } finally {
      setDownloading(false)
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
          className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/20 rounded-xl">
                  <Download className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">Centro de Descargas</h2>
                  <p className="text-white/80 text-sm">
                    {documents.length} documento{documents.length !== 1 ? 's' : ''} seleccionado{documents.length !== 1 ? 's' : ''}
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

          {/* Opciones de descarga */}
          <div className="p-6 space-y-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
              Opciones de descarga
            </h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Descargar todas las imágenes */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={downloadAllFiles}
                disabled={downloading}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-50"
              >
                {downloading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    <div className="text-left">
                      <div className="font-semibold">Descargando...</div>
                      <div className="text-sm text-white/80">
                        {downloadProgress.current}/{downloadProgress.total}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <Image className="w-5 h-5" />
                    <div className="text-left">
                      <div className="font-semibold">Descargar Imágenes TIF</div>
                      <div className="text-sm text-white/80">Todas las imágenes</div>
                    </div>
                  </>
                )}
              </motion.button>

              {/* Descargar datos JSON */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={downloadDataZip}
                disabled={downloading}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg disabled:opacity-50"
              >
                <FileArchive className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Descargar Datos ZIP</div>
                  <div className="text-sm text-white/80">Archivos JSON</div>
                </div>
              </motion.button>
            </div>
          </div>

          {/* Lista de documentos */}
          <div className="flex-1 overflow-y-auto">
            <button
              onClick={() => setExpandedList(!expandedList)}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
            >
              <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileText className="w-4 h-4" />
                Lista de documentos
              </h3>
              {expandedList ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            <AnimatePresence>
              {expandedList && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="divide-y divide-gray-100 dark:divide-gray-800"
                >
                  {documents.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.03 }}
                      className="p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            downloadedItems.has(doc.id) ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                          }`} />
                          <div className="min-w-0">
                            <p className="font-medium text-gray-800 dark:text-gray-200 truncate">
                              {doc.numero_guia || 'Sin número'}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                              {doc.drive_file_name || doc.proveedor || '-'}
                            </p>
                          </div>
                          {downloadedItems.has(doc.id) && (
                            <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => viewInDrive(doc)}
                            className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                            title="Ver en Google Drive"
                          >
                            <Eye className="w-4 h-4" />
                          </motion.button>
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => downloadSingleFile(doc)}
                            className="flex items-center gap-2 px-3 py-1.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors text-sm font-medium"
                          >
                            <Download className="w-3.5 h-3.5" />
                            TIF
                          </motion.button>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
              <span>
                {downloadedItems.size > 0 && (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    ✓ {downloadedItems.size} descargado{downloadedItems.size !== 1 ? 's' : ''}
                  </span>
                )}
              </span>
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

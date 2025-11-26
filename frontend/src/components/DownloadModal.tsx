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
  Eye,
  FolderOpen
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
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, status: '' })
  const [expandedList, setExpandedList] = useState(true)
  const [downloadedItems, setDownloadedItems] = useState<Set<number>>(new Set())

  // Descargar un solo archivo TIF - abre en nueva pestaña
  const downloadSingleFile = (doc: Documento) => {
    const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
    window.open(downloadUrl, '_blank')
    setDownloadedItems(prev => new Set(prev).add(doc.id))
  }

  // Ver archivo en Google Drive
  const viewInDrive = (doc: Documento) => {
    const viewUrl = doc.drive_url || `https://drive.google.com/file/d/${doc.drive_file_id}/view`
    window.open(viewUrl, '_blank')
  }

  // Crear y descargar página HTML con links
  const downloadHtmlWithLinks = () => {
    const htmlContent = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descargar Guías de Remisión</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 20px;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      background: white;
      border-radius: 16px;
      box-shadow: 0 25px 50px -12px rgba(0,0,0,0.25);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 24px;
      text-align: center;
    }
    .header h1 { font-size: 24px; margin-bottom: 8px; }
    .header p { opacity: 0.9; font-size: 14px; }
    .instructions {
      background: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 16px 20px;
      margin: 20px;
      border-radius: 8px;
    }
    .instructions h3 { color: #92400E; margin-bottom: 8px; }
    .instructions ol { margin-left: 20px; color: #78350F; }
    .instructions li { margin: 4px 0; }
    .download-all {
      display: block;
      width: calc(100% - 40px);
      margin: 20px;
      padding: 16px;
      background: linear-gradient(135deg, #10B981 0%, #059669 100%);
      color: white;
      border: none;
      border-radius: 12px;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      text-align: center;
      text-decoration: none;
    }
    .download-all:hover { opacity: 0.9; }
    .list { padding: 0 20px 20px; }
    .list h3 { color: #6B7280; font-size: 12px; text-transform: uppercase; margin-bottom: 12px; }
    .item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 12px;
      border: 1px solid #E5E7EB;
      border-radius: 8px;
      margin-bottom: 8px;
    }
    .item:hover { background: #F9FAFB; }
    .item-info { flex: 1; }
    .item-info .name { font-weight: 600; color: #1F2937; }
    .item-info .file { font-size: 12px; color: #6B7280; }
    .item-actions { display: flex; gap: 8px; }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 500;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-primary { background: #10B981; color: white; }
    .btn-secondary { background: #E5E7EB; color: #374151; }
    .btn:hover { opacity: 0.85; }
    .counter {
      text-align: center;
      padding: 16px;
      background: #F3F4F6;
      color: #6B7280;
      font-size: 14px;
    }
    #progress { display: none; text-align: center; padding: 20px; background: #ECFDF5; margin: 20px; border-radius: 8px; }
    #progress.show { display: block; }
    #progress .count { font-size: 24px; font-weight: bold; color: #059669; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📄 Guías de Remisión</h1>
      <p>Generado el ${new Date().toLocaleString('es-PE')}</p>
    </div>
    
    <div class="instructions">
      <h3>📥 Instrucciones</h3>
      <ol>
        <li>Haz clic en "Descargar" junto a cada documento</li>
        <li>Si aparece una página de Google Drive, haz clic en "Descargar de todos modos"</li>
        <li>O usa el botón verde para descargar todas secuencialmente</li>
      </ol>
    </div>
    
    <div id="progress">
      <div class="count"><span id="current">0</span> / ${documents.length}</div>
      <div>Descargando...</div>
    </div>
    
    <button class="download-all" onclick="downloadAll()">
      ⬇️ Descargar Todas las Imágenes (${documents.length})
    </button>
    
    <div class="list">
      <h3>Lista de documentos</h3>
      ${documents.map((doc, i) => `
        <div class="item" id="item-${i}">
          <div class="item-info">
            <div class="name">${doc.numero_guia || 'Sin número'}</div>
            <div class="file">${doc.drive_file_name || '-'}</div>
          </div>
          <div class="item-actions">
            <a href="https://drive.google.com/file/d/${doc.drive_file_id}/view" target="_blank" class="btn btn-secondary">👁️ Ver</a>
            <a href="https://drive.google.com/uc?export=download&id=${doc.drive_file_id}" target="_blank" class="btn btn-primary" onclick="markDone(${i})">⬇️ Descargar</a>
          </div>
        </div>
      `).join('')}
    </div>
    
    <div class="counter">
      Total: ${documents.length} documentos
    </div>
  </div>
  
  <script>
    let downloaded = 0;
    
    function markDone(index) {
      const item = document.getElementById('item-' + index);
      item.style.background = '#ECFDF5';
      item.style.borderColor = '#10B981';
      downloaded++;
    }
    
    async function downloadAll() {
      const links = [
        ${documents.map(doc => `"https://drive.google.com/uc?export=download&id=${doc.drive_file_id}"`).join(',\n        ')}
      ];
      
      document.getElementById('progress').classList.add('show');
      
      for (let i = 0; i < links.length; i++) {
        document.getElementById('current').textContent = i + 1;
        markDone(i);
        
        // Abrir enlace de descarga
        window.open(links[i], '_blank');
        
        // Esperar 2 segundos entre descargas
        if (i < links.length - 1) {
          await new Promise(r => setTimeout(r, 2000));
        }
      }
      
      document.getElementById('progress').innerHTML = '<div class="count">✅ Completado</div><div>Revisa tu carpeta de descargas</div>';
    }
  </script>
</body>
</html>`

    // Descargar el HTML
    const blob = new Blob([htmlContent], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `descargar_guias_${new Date().toISOString().split('T')[0]}.html`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    toast.success(
      <div>
        <p className="font-semibold">Archivo HTML descargado</p>
        <p className="text-sm">Ábrelo en tu navegador para descargar las imágenes</p>
      </div>,
      { duration: 5000 }
    )
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
              {/* Descargar HTML con links */}
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={downloadHtmlWithLinks}
                disabled={downloading}
                className="flex items-center gap-3 p-4 bg-gradient-to-r from-emerald-500 to-green-600 text-white rounded-xl hover:from-emerald-600 hover:to-green-700 transition-all shadow-lg disabled:opacity-50"
              >
                <Image className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-semibold">Descargar Imágenes TIF</div>
                  <div className="text-sm text-white/80">Página con links de descarga</div>
                </div>
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

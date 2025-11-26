'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  X, 
  CheckSquare, 
  Square, 
  Loader2,
  FileArchive,
  Image,
  FileText
} from 'lucide-react'
import { Documento } from '@/types'
import toast from 'react-hot-toast'
import JSZip from 'jszip'

interface SelectionToolbarProps {
  selectedDocuments: Documento[]
  totalDocuments: number
  onClearSelection: () => void
  onSelectAll: () => void
  isAllSelected: boolean
}

export function SelectionToolbar({ 
  selectedDocuments, 
  totalDocuments,
  onClearSelection, 
  onSelectAll,
  isAllSelected
}: SelectionToolbarProps) {
  const [downloading, setDownloading] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })

  const downloadSelectedDocuments = async () => {
    if (selectedDocuments.length === 0) {
      toast.error('No hay documentos seleccionados')
      return
    }

    setDownloading(true)
    setDownloadProgress({ current: 0, total: selectedDocuments.length })

    try {
      const zip = new JSZip()
      const docsFolder = zip.folder('guias_remision')

      for (let i = 0; i < selectedDocuments.length; i++) {
        const doc = selectedDocuments[i]
        setDownloadProgress({ current: i + 1, total: selectedDocuments.length })

        try {
          // Crear nombre de archivo limpio
          const fileName = doc.numero_guia?.replace(/[/\\?%*:|"<>]/g, '-') || `documento_${doc.id}`
          
          // Descargar imagen TIF desde Google Drive
          if (doc.drive_file_id) {
            try {
              // Usar la URL de descarga directa de Google Drive
              const downloadUrl = `https://drive.google.com/uc?export=download&id=${doc.drive_file_id}`
              const response = await fetch(downloadUrl)
              
              if (response.ok) {
                const blob = await response.blob()
                docsFolder?.file(`${fileName}.tif`, blob)
              } else {
                // Si falla la descarga directa, agregar un archivo de texto con el link
                const linkContent = `Archivo: ${doc.drive_file_name || 'Sin nombre'}
Link de Google Drive: ${doc.drive_url || `https://drive.google.com/file/d/${doc.drive_file_id}/view`}

El archivo no pudo descargarse automáticamente.
Por favor, descárgalo manualmente usando el link de arriba.`
                docsFolder?.file(`${fileName}_link.txt`, linkContent)
              }
            } catch (fetchError) {
              // Si hay error de CORS, agregar archivo con información
              const infoContent = `Archivo: ${doc.drive_file_name || 'Sin nombre'}
Link de Google Drive: ${doc.drive_url || `https://drive.google.com/file/d/${doc.drive_file_id}/view`}

Nota: La descarga directa no está disponible debido a restricciones de seguridad.
Por favor, descarga el archivo manualmente usando el link de arriba.`
              docsFolder?.file(`${fileName}_info.txt`, infoContent)
            }
          }

          // Crear archivo JSON con metadata del documento
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
            drive_url: doc.drive_url || `https://drive.google.com/file/d/${doc.drive_file_id}/view`
          }
          docsFolder?.file(`${fileName}_datos.json`, JSON.stringify(metadata, null, 2))

        } catch (error) {
          console.error(`Error procesando documento ${doc.id}:`, error)
        }
      }

      // Generar y descargar el ZIP
      const content = await zip.generateAsync({ 
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 }
      })

      // Crear link de descarga
      const url = URL.createObjectURL(content)
      const link = document.createElement('a')
      link.href = url
      link.download = `guias_remision_${new Date().toISOString().split('T')[0]}.zip`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      toast.success(`${selectedDocuments.length} documentos descargados`)
      onClearSelection()
    } catch (error) {
      console.error('Error al descargar:', error)
      toast.error('Error al crear el archivo ZIP')
    } finally {
      setDownloading(false)
      setDownloadProgress({ current: 0, total: 0 })
    }
  }

  if (selectedDocuments.length === 0) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 50 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50"
      >
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
          {/* Contador */}
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center font-bold text-lg">
              {selectedDocuments.length}
            </div>
            <div className="text-sm">
              <div className="font-semibold">Seleccionados</div>
              <div className="text-white/70 text-xs">de {totalDocuments} documentos</div>
            </div>
          </div>

          <div className="w-px h-10 bg-white/20"></div>

          {/* Acciones */}
          <div className="flex items-center gap-2">
            {/* Seleccionar todos */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onSelectAll}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-xl transition-colors text-sm font-medium"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-4 h-4" />
                  Todos
                </>
              ) : (
                <>
                  <Square className="w-4 h-4" />
                  Todos
                </>
              )}
            </motion.button>

            {/* Descargar */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadSelectedDocuments}
              disabled={downloading}
              className="flex items-center gap-2 px-4 py-2 bg-white text-indigo-600 hover:bg-white/90 rounded-xl transition-colors text-sm font-bold disabled:opacity-50"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {downloadProgress.current}/{downloadProgress.total}
                </>
              ) : (
                <>
                  <FileArchive className="w-4 h-4" />
                  Descargar ZIP
                </>
              )}
            </motion.button>

            {/* Limpiar selección */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onClearSelection}
              className="p-2 hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

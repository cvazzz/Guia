'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  X, 
  CheckSquare, 
  Square
} from 'lucide-react'
import { Documento } from '@/types'
import { DownloadModal } from './DownloadModal'

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
  const [showDownloadModal, setShowDownloadModal] = useState(false)

  if (selectedDocuments.length === 0) return null

  return (
    <>
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

              {/* Descargar - Abre el modal */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowDownloadModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-white text-indigo-600 hover:bg-white/90 rounded-xl transition-colors text-sm font-bold shadow-lg"
              >
                <Download className="w-4 h-4" />
                Descargar
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

      {/* Modal de descarga */}
      <DownloadModal
        documents={selectedDocuments}
        isOpen={showDownloadModal}
        onClose={() => setShowDownloadModal(false)}
      />
    </>
  )
}

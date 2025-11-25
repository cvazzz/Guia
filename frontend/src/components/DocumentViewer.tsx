'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { 
  X, 
  FileText, 
  Calendar, 
  User, 
  MapPin, 
  Package, 
  Truck,
  Hash,
  CheckCircle,
  XCircle,
  MessageSquare,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Building2,
  FileSearch,
  Phone,
  CreditCard
} from 'lucide-react'
import { Documento } from '@/types'
import { formatDate, getStatusColor, getStatusLabel } from '@/lib/utils'

interface DocumentViewerProps {
  document: Documento
  onClose: () => void
}

export function DocumentViewer({ document, onClose }: DocumentViewerProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'details' | 'ocr'>('preview')
  const [currentPage, setCurrentPage] = useState(1)

  const tabs = [
    { id: 'preview', label: 'Vista Previa', icon: FileText },
    { id: 'details', label: 'Detalles', icon: FileSearch },
    { id: 'ocr', label: 'Texto OCR', icon: MessageSquare },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: 'spring', damping: 25 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white p-4 md:p-6">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl md:text-2xl font-bold">
                  Guía: {document.numero_guia || 'Sin número'}
                </h2>
                <p className="text-blue-100 text-sm mt-1">
                  {document.drive_file_name}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-indigo-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto">
          {activeTab === 'preview' && (
            <div className="h-full flex flex-col">
              {/* Navegación de páginas */}
              <div className="flex items-center justify-between p-4 bg-gray-50 border-b">
                <span className="text-sm text-gray-600">
                  Página {currentPage} de {document.numero_paginas}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(Math.min(document.numero_paginas, currentPage + 1))}
                    disabled={currentPage === document.numero_paginas}
                    className="p-2 hover:bg-gray-200 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                  {document.drive_url && (
                    <a
                      href={document.drive_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" />
                      Abrir en Drive
                    </a>
                  )}
                </div>
              </div>

              {/* Preview del documento */}
              <div className="flex-1 bg-gray-100 p-4">
                {document.drive_embed_url ? (
                  <div className="relative w-full h-full min-h-[500px]">
                    <iframe
                      src={document.drive_embed_url}
                      className="w-full h-full min-h-[500px] rounded-lg bg-white shadow-lg"
                      title="Vista previa del documento"
                      allowFullScreen
                      sandbox="allow-scripts allow-same-origin allow-popups"
                    />
                    {/* Overlay con link alternativo */}
                    <div className="absolute bottom-4 right-4 flex gap-2">
                      <a
                        href={document.drive_url || document.drive_embed_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-4 py-2 bg-white/90 text-blue-700 rounded-lg hover:bg-white shadow-lg transition-colors text-sm font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Abrir en nueva pestaña
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full min-h-[500px] bg-white rounded-lg">
                    <div className="text-center text-gray-500">
                      <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                      <p>Vista previa no disponible</p>
                      {document.drive_url && (
                        <a
                          href={document.drive_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700"
                        >
                          <ExternalLink className="w-4 h-4" />
                          Ver en Google Drive
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'details' && (
            <div className="p-6 space-y-6">
              {/* Estado */}
              <div className="flex items-center gap-4">
                <span className={`px-4 py-2 rounded-xl text-sm font-medium ${getStatusColor(document.ocr_status)}`}>
                  Estado OCR: {getStatusLabel(document.ocr_status)}
                </span>
                <span className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${
                  document.firmado 
                    ? 'bg-green-100 text-green-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  {document.firmado ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Documento Firmado
                    </>
                  ) : (
                    <>
                      <XCircle className="w-4 h-4" />
                      Sin Firma
                    </>
                  )}
                </span>
              </div>

              {/* Grid de información */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Información básica */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Información del Documento
                  </h3>
                  <div className="space-y-3">
                    <InfoRow icon={Hash} label="Número de Guía" value={document.numero_guia} />
                    <InfoRow icon={Calendar} label="Fecha" value={formatDate(document.fecha_documento)} />
                    <InfoRow icon={FileText} label="Páginas" value={`${document.numero_paginas}`} />
                    <InfoRow icon={Hash} label="Código Interno" value={document.codigo_interno} />
                  </div>
                </div>

                {/* Proveedor y destino */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-indigo-600" />
                    Proveedor y Destino
                  </h3>
                  <div className="space-y-3">
                    <InfoRow icon={User} label="Proveedor" value={document.proveedor} />
                    <InfoRow icon={Hash} label="RUC" value={document.ruc} />
                    <InfoRow icon={MapPin} label="Dirección Destino" value={document.direccion_destino} />
                    <InfoRow icon={MapPin} label="Dirección Remitente" value={document.direccion_remitente} />
                  </div>
                </div>

                {/* Transporte */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Truck className="w-5 h-5 text-green-600" />
                    Transporte
                  </h3>
                  <div className="space-y-3">
                    <InfoRow icon={Truck} label="Conductor" value={document.transportista} />
                    <InfoRow icon={CreditCard} label="DNI Conductor" value={document.dni_conductor} />
                    <InfoRow icon={Hash} label="Placa Vehículo" value={document.placa} />
                    {document.firmado && (
                      <InfoRow icon={CheckCircle} label="Firmado por" value={document.nombre_firmante || 'Firma detectada'} />
                    )}
                  </div>
                </div>

                {/* Destinatario */}
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <User className="w-5 h-5 text-cyan-600" />
                    Destinatario
                  </h3>
                  <div className="space-y-3">
                    <InfoRow icon={User} label="Contacto" value={document.destinatario_contacto} />
                    <InfoRow icon={Phone} label="Teléfono" value={document.destinatario_telefono} />
                    <InfoRow icon={MapPin} label="Punto de Llegada" value={document.direccion_destino} />
                  </div>
                </div>

                {/* Observaciones */}
                {document.observaciones && (
                  <div className="bg-gray-50 rounded-2xl p-5">
                    <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                      <MessageSquare className="w-5 h-5 text-orange-600" />
                      Observaciones
                    </h3>
                    <p className="text-gray-600 text-sm">{document.observaciones}</p>
                  </div>
                )}
              </div>

              {/* Productos */}
              {document.productos && document.productos.length > 0 && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                    <Package className="w-5 h-5 text-purple-600" />
                    Productos ({document.productos.length})
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-200 bg-gray-100">
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">#</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Código</th>
                          <th className="text-left py-3 px-4 font-semibold text-gray-700">Descripción</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">U/M</th>
                          <th className="text-center py-3 px-4 font-semibold text-gray-700">Cantidad</th>
                        </tr>
                      </thead>
                      <tbody>
                        {document.productos.map((producto, i) => (
                          <tr key={i} className="border-b border-gray-100 hover:bg-blue-50 transition-colors">
                            <td className="py-3 px-4 text-gray-500">{i + 1}</td>
                            <td className="py-3 px-4 font-mono text-blue-600">{document.codigos_producto?.[i] || '-'}</td>
                            <td className="py-3 px-4 font-medium text-gray-800">{producto}</td>
                            <td className="py-3 px-4 text-center text-gray-600">{document.unidad_medida?.[i] || 'UND'}</td>
                            <td className="py-3 px-4 text-center font-semibold text-gray-800">{document.cantidades?.[i] || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Campos faltantes */}
              {document.campos_faltantes && document.campos_faltantes.length > 0 && (
                <div className="bg-yellow-50 rounded-2xl p-5">
                  <h3 className="font-bold text-yellow-800 mb-4 flex items-center gap-2">
                    ⚠️ Campos No Detectados
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {document.campos_faltantes.map((campo, i) => (
                      <span 
                        key={i}
                        className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm"
                      >
                        {campo}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'ocr' && (
            <div className="p-6">
              <div className="bg-gray-50 rounded-2xl p-5">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <FileSearch className="w-5 h-5 text-blue-600" />
                  Texto Extraído por OCR
                </h3>
                <div className="bg-white rounded-xl p-4 max-h-[60vh] overflow-auto">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                    {document.raw_text || 'No hay texto extraído disponible.'}
                  </pre>
                </div>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

// Componente auxiliar para filas de información
function InfoRow({ 
  icon: Icon, 
  label, 
  value 
}: { 
  icon: any
  label: string
  value: string | null | undefined 
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
      <div>
        <span className="text-xs text-gray-500">{label}</span>
        <p className="text-sm text-gray-800">{value || '-'}</p>
      </div>
    </div>
  )
}

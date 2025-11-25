'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Download, 
  FileSpreadsheet, 
  FileText, 
  X, 
  Check,
  Loader2,
  Filter,
  Calendar
} from 'lucide-react'
import { Documento } from '@/types'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import toast from 'react-hot-toast'

interface ExportModalProps {
  documents: Documento[]
  isOpen: boolean
  onClose: () => void
}

type ExportFormat = 'excel' | 'pdf' | 'csv'

export function ExportModal({ documents, isOpen, onClose }: ExportModalProps) {
  const [format, setFormat] = useState<ExportFormat>('excel')
  const [includeProducts, setIncludeProducts] = useState(true)
  const [includeSignatures, setIncludeSignatures] = useState(true)
  const [isExporting, setIsExporting] = useState(false)

  if (!isOpen) return null

  const exportToExcel = () => {
    // Crear filas expandidas - una fila por cada producto
    const data: any[] = []
    
    documents.forEach(doc => {
      const baseRow = {
        'Número de Guía': doc.numero_guia || '',
        'Fecha Emisión': doc.fecha_documento || doc.fecha_traslado || '',
        'Proveedor': doc.proveedor || '',
        'RUC': doc.ruc || '',
        'Destinatario': doc.destinatario_nombre || '',
        'Dirección': doc.direccion_destino || '',
        'Tiene Firma': doc.firmado ? 'Sí' : 'No',
        'Confianza Firma': doc.firma_confianza != null ? `${(doc.firma_confianza * 100).toFixed(0)}%` : 'N/A',
        'Archivo': doc.drive_file_name || '',
        'Fecha Procesado': doc.created_at ? doc.created_at.split('T')[0] : ''
      }
      
      // Si tiene productos, crear una fila por cada producto
      if (includeProducts && doc.codigos_producto && doc.codigos_producto.length > 0) {
        doc.codigos_producto.forEach((codigo, i) => {
          data.push({
            ...baseRow,
            'Código Producto': codigo || '',
            'Nombre Producto': doc.productos && doc.productos[i] ? doc.productos[i] : '',
            'Cantidad': doc.cantidades && doc.cantidades[i] ? doc.cantidades[i] : '',
            'Unidad Medida': doc.unidad_medida && doc.unidad_medida[i] ? doc.unidad_medida[i] : ''
          })
        })
      } else {
        // Si no tiene productos, agregar fila sin productos
        data.push({
          ...baseRow,
          'Código Producto': '',
          'Nombre Producto': '',
          'Cantidad': '',
          'Unidad Medida': ''
        })
      }
    })

    const ws = XLSX.utils.json_to_sheet(data)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Documentos')

    // Ajustar ancho de columnas
    const colWidths = [
      { wch: 18 }, // Número de Guía
      { wch: 12 }, // Fecha Emisión
      { wch: 25 }, // Proveedor
      { wch: 12 }, // RUC
      { wch: 25 }, // Destinatario
      { wch: 30 }, // Dirección
      { wch: 10 }, // Tiene Firma
      { wch: 12 }, // Confianza Firma
      { wch: 25 }, // Archivo
      { wch: 12 }, // Fecha Procesado
      { wch: 15 }, // Código Producto
      { wch: 35 }, // Nombre Producto
      { wch: 10 }, // Cantidad
      { wch: 12 }, // Unidad Medida
    ]
    ws['!cols'] = colWidths

    XLSX.writeFile(wb, `guias_remision_${new Date().toISOString().split('T')[0]}.xlsx`)
  }

  const exportToCSV = () => {
    const headers = [
      'Número de Guía', 'Fecha', 'Proveedor', 'RUC',
      'Destinatario', 'Dirección', 'Tiene Firma', 'Productos'
    ]

    const rows = documents.map(doc => {
      let productosStr = ''
      if (includeProducts && doc.codigos_producto && Array.isArray(doc.codigos_producto)) {
        productosStr = doc.codigos_producto
          .map((code, i) => {
            const cantidad = doc.cantidades && doc.cantidades[i] ? doc.cantidades[i] : '?'
            return `${code || 'N/A'}:${cantidad}`
          })
          .filter(p => p)
          .join('; ')
      }
      
      return [
        doc.numero_guia || '',
        doc.fecha_documento || doc.fecha_traslado || '',
        doc.proveedor || '',
        doc.ruc || '',
        doc.destinatario_nombre || '',
        doc.direccion_destino || '',
        doc.firmado ? 'Sí' : 'No',
        productosStr
      ]
    })

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n')

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `guias_remision_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape' })

    // Título
    doc.setFontSize(20)
    doc.setTextColor(79, 70, 229) // Indigo
    doc.text('Reporte de Guías de Remisión', 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Generado: ${new Date().toLocaleDateString('es-PE')} | Total: ${documents.length} documentos`, 14, 30)

    // Tabla principal
    const tableData = documents.map(d => [
      d.numero_guia || '-',
      d.fecha_documento || '-',
      (d.proveedor || '-').substring(0, 20),
      d.ruc || '-',
      d.firmado ? '✓' : '✗',
      d.codigos_producto?.length || 0
    ])

    autoTable(doc, {
      head: [['N° Guía', 'Fecha', 'Proveedor', 'RUC', 'Firma', 'Productos']],
      body: tableData,
      startY: 38,
      styles: { 
        fontSize: 9,
        cellPadding: 3
      },
      headStyles: { 
        fillColor: [79, 70, 229],
        textColor: 255,
        fontStyle: 'bold'
      },
      alternateRowStyles: { 
        fillColor: [245, 247, 250] 
      },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 25 },
        2: { cellWidth: 50 },
        3: { cellWidth: 30 },
        4: { cellWidth: 20, halign: 'center' },
        5: { cellWidth: 25, halign: 'center' }
      }
    })

    // Si incluye productos, agregar página de detalle
    if (includeProducts) {
      doc.addPage()
      doc.setFontSize(16)
      doc.setTextColor(79, 70, 229)
      doc.text('Detalle de Productos por Guía', 14, 22)

      let yPos = 35
      documents.forEach((documento, idx) => {
        if (yPos > 180) {
          doc.addPage()
          yPos = 20
        }

        if (documento.codigos_producto && documento.codigos_producto.length > 0) {
          doc.setFontSize(11)
          doc.setTextColor(50)
          doc.text(`${documento.numero_guia || 'Sin número'}`, 14, yPos)
          yPos += 5

          const productData = documento.codigos_producto.map((code: string, i: number) => [
            code || '-',
            (documento.productos?.[i] || '-').substring(0, 40),
            documento.unidad_medida?.[i] || '-',
            documento.cantidades?.[i] || '-'
          ])

          autoTable(doc, {
            head: [['Código', 'Descripción', 'U/M', 'Cantidad']],
            body: productData,
            startY: yPos,
            styles: { fontSize: 8 },
            headStyles: { fillColor: [139, 92, 246] },
            margin: { left: 14 }
          })

          yPos = (doc as any).lastAutoTable.finalY + 10
        }
      })
    }

    doc.save(`guias_remision_${new Date().toISOString().split('T')[0]}.pdf`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    
    try {
      await new Promise(resolve => setTimeout(resolve, 500))
      
      switch (format) {
        case 'excel':
          exportToExcel()
          break
        case 'csv':
          exportToCSV()
          break
        case 'pdf':
          exportToPDF()
          break
      }
      
      toast.success(`Exportación ${format.toUpperCase()} completada`)
      onClose()
    } catch (error) {
      toast.error('Error al exportar')
    } finally {
      setIsExporting(false)
    }
  }

  const formatOptions = [
    { 
      id: 'excel' as ExportFormat, 
      name: 'Excel (.xlsx)', 
      icon: FileSpreadsheet, 
      color: 'bg-green-500',
      description: 'Ideal para análisis y filtrado'
    },
    { 
      id: 'csv' as ExportFormat, 
      name: 'CSV', 
      icon: FileText, 
      color: 'bg-blue-500',
      description: 'Compatible con cualquier sistema'
    },
    { 
      id: 'pdf' as ExportFormat, 
      name: 'PDF', 
      icon: FileText, 
      color: 'bg-red-500',
      description: 'Reporte profesional imprimible'
    }
  ]

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
        className="bg-white dark:bg-gray-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-green-500 to-emerald-600">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-xl">
                <Download className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Exportar Documentos</h2>
                <p className="text-green-100 text-sm">{documents.length} documentos seleccionados</p>
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
        <div className="p-6 space-y-6">
          {/* Formato */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Formato de exportación
            </label>
            <div className="grid grid-cols-3 gap-3">
              {formatOptions.map(option => (
                <button
                  key={option.id}
                  onClick={() => setFormat(option.id)}
                  className={`p-4 rounded-xl border-2 transition-all ${
                    format === option.id
                      ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-10 h-10 ${option.color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <option.icon className="w-5 h-5 text-white" />
                  </div>
                  <p className="text-sm font-medium text-gray-800 dark:text-white">{option.name}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{option.description}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Opciones */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
              Incluir en el reporte
            </label>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <input
                  type="checkbox"
                  checked={includeProducts}
                  onChange={e => setIncludeProducts(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-white">Detalle de productos</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Códigos, descripciones y cantidades</p>
                </div>
              </label>
              
              <label className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors">
                <input
                  type="checkbox"
                  checked={includeSignatures}
                  onChange={e => setIncludeSignatures(e.target.checked)}
                  className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                />
                <div className="flex-1">
                  <p className="font-medium text-gray-800 dark:text-white">Estado de firmas</p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">Indicador y nivel de confianza</p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl font-medium hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-semibold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg disabled:opacity-70"
            >
              {isExporting ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  Exportar
                </>
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

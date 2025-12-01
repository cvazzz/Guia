'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload,
  FileSpreadsheet,
  X,
  Check,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Loader2,
  HardDrive,
  Cloud,
  Table,
  Eye,
  RefreshCw,
  CheckCircle,
  XCircle,
  Info
} from 'lucide-react'
import toast from 'react-hot-toast'

// URL directa al backend para operaciones largas (evita timeout del proxy)
const BACKEND_URL = 'http://localhost:8000'

interface ColumnMapping {
  excelColumn: string
  systemField: string
  preview: string[]
  matched: boolean
}

interface ImportWizardProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

// Campos del sistema LDU - Completos según el Excel
const SYSTEM_FIELDS = [
  // Identificador principal
  { key: 'IMEI', label: 'IMEI', required: true, description: 'Identificador único del dispositivo (14-16 dígitos)' },
  { key: 'MODEL', label: 'Modelo', required: false, description: 'Modelo del dispositivo (ej: Y04, V50 LITE)' },
  
  // Campos de cuenta
  { key: 'Account', label: 'Account', required: false, description: 'Cuenta principal (CLARO, OM, etc.)' },
  { key: 'Account_int', label: 'Account Int', required: false, description: 'Cuenta interna (CLARO, RETAIL, PLAZA VEA)' },
  { key: 'Supervisor', label: 'Supervisor', required: false, description: 'Nombre del supervisor asignado' },
  
  // Ubicación geográfica
  { key: 'Zone', label: 'Zona', required: false, description: 'Zona geográfica (Lima 2, etc.)' },
  { key: 'Departamento', label: 'Departamento', required: false, description: 'Departamento (Lima, Callao, etc.)' },
  { key: 'City', label: 'Ciudad', required: false, description: 'Ciudad o región' },
  
  // Punto de venta
  { key: 'Canal', label: 'Canal', required: false, description: 'Canal de distribución (Cac, Retail, Plaza Vea)' },
  { key: 'Tipo', label: 'Tipo', required: false, description: 'Tipo de asignación (Fijo, Ruta)' },
  { key: 'POS_vv', label: 'Punto de Venta', required: false, description: 'Nombre del PDV asignado' },
  { key: 'Name_Ruta', label: 'Nombre Ruta', required: false, description: 'Nombre de la ruta de cobertura' },
  { key: 'HC_Real', label: 'HC Real', required: false, description: 'Valor de cobertura (decimal)' },
  
  // Responsable
  { key: 'DNI', label: 'DNI Responsable', required: false, description: 'DNI del responsable del dispositivo' },
  { key: 'Last_Name', label: 'Apellido', required: false, description: 'Apellido del responsable' },
  { key: 'First_Name', label: 'Nombre', required: false, description: 'Nombre del responsable' },
  
  // Campos de control
  { key: 'REG', label: 'REG', required: false, description: 'Campo de registro' },
  { key: 'OK', label: 'OK', required: false, description: 'Campo de validación' },
  { key: 'USO', label: 'Uso', required: false, description: 'Estado de uso del dispositivo' },
  { key: 'OBSERVATION', label: 'Observaciones', required: false, description: 'Notas y observaciones (determina estado)' },
]

export function ImportWizard({ isOpen, onClose, onSuccess }: ImportWizardProps) {
  const [step, setStep] = useState(1)
  const [importSource, setImportSource] = useState<'local' | 'drive' | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [fileBuffer, setFileBuffer] = useState<ArrayBuffer | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewData, setPreviewData] = useState<any>(null)
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([])
  const [driveFiles, setDriveFiles] = useState<any[]>([])
  const [selectedDriveFile, setSelectedDriveFile] = useState<string | null>(null)
  const [syncToDrive, setSyncToDrive] = useState(true)
  const [importing, setImporting] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  
  // Nuevo: manejo de hojas
  const [sheets, setSheets] = useState<{name: string, rows: number, columns?: number}[]>([])
  const [selectedSheet, setSelectedSheet] = useState<string | null>(null)
  
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dropZoneRef = useRef<HTMLDivElement>(null)

  // Cargar archivos de Drive
  useEffect(() => {
    if (isOpen && importSource === 'drive') {
      loadDriveFiles()
    }
  }, [isOpen, importSource])

  const loadDriveFiles = async () => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/excel-files`)
      const data = await response.json()
      if (data.success) {
        setDriveFiles(data.data)
      }
    } catch (error) {
      toast.error('Error cargando archivos de Drive')
    } finally {
      setLoading(false)
    }
  }

  // Manejar drop de archivo
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const droppedFile = e.dataTransfer.files[0]
    if (droppedFile && (droppedFile.name.endsWith('.xlsx') || droppedFile.name.endsWith('.xls') || droppedFile.name.endsWith('.csv'))) {
      setFile(droppedFile)
      analyzeExcelFile(droppedFile)
    } else {
      toast.error('Por favor, sube un archivo Excel (.xlsx, .xls) o CSV')
    }
  }, [])

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0]
    if (selectedFile) {
      setFile(selectedFile)
      analyzeExcelFile(selectedFile)
    }
  }

  // Analizar archivo para obtener hojas
  const analyzeExcelFile = async (file: File) => {
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`${BACKEND_URL}/api/ldu/analyze-excel`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error del servidor: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setSheets(data.data.sheets)
        
        // Si es CSV o solo tiene una hoja, ir directo a preview
        if (data.data.is_csv || data.data.sheets.length === 1) {
          setSelectedSheet(data.data.sheets[0].name)
          await processLocalFile(file, data.data.sheets[0].name)
        } else {
          // Mostrar selector de hojas (step 2.5 - usamos step 2 con sheets)
          setStep(2)
        }
      } else {
        throw new Error(data.detail || 'Error analizando archivo')
      }
    } catch (error: any) {
      console.error('Error analyzing file:', error)
      toast.error(error.message || 'Error analizando archivo')
    } finally {
      setLoading(false)
    }
  }

  // Procesar archivo local con hoja seleccionada
  const processLocalFile = async (fileToProcess: File, sheetName: string) => {
    setLoading(true)
    setSelectedSheet(sheetName)
    try {
      const formData = new FormData()
      formData.append('file', fileToProcess)
      formData.append('sheet_name', sheetName)

      const response = await fetch(`${BACKEND_URL}/api/ldu/preview-excel`, {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error del servidor: ${response.status}`)
      }

      const data = await response.json()
      if (data.success) {
        setPreviewData(data.data)
        autoMapColumns(data.data.columns)
        setStep(3) // Ir a mapeo de columnas
      } else {
        throw new Error(data.detail || 'Error procesando archivo')
      }
    } catch (error: any) {
      console.error('Error processing file:', error)
      toast.error(error.message || 'Error procesando archivo')
    } finally {
      setLoading(false)
    }
  }

  // Procesar archivo de Drive
  const processDriveFile = async (fileId: string) => {
    setLoading(true)
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/excel-files/${fileId}/preview?rows=10`)
      const data = await response.json()
      
      if (data.success) {
        setPreviewData(data.data)
        setSelectedDriveFile(fileId)
        autoMapColumns(data.data.columns)
        setStep(3)
      } else {
        throw new Error(data.detail || 'Error procesando archivo')
      }
    } catch (error: any) {
      toast.error(error.message || 'Error procesando archivo')
    } finally {
      setLoading(false)
    }
  }

  // Auto-mapear columnas
  const autoMapColumns = (excelColumns: string[]) => {
    const mappings: ColumnMapping[] = excelColumns.map(col => {
      // Buscar coincidencia automática
      const normalizedCol = col.toLowerCase().trim()
      const matchedField = SYSTEM_FIELDS.find(f => 
        f.key.toLowerCase() === normalizedCol ||
        f.label.toLowerCase() === normalizedCol ||
        normalizedCol.includes(f.key.toLowerCase())
      )

      return {
        excelColumn: col,
        systemField: matchedField?.key || '',
        preview: previewData?.preview?.slice(0, 3).map((row: any) => row[col] || '') || [],
        matched: !!matchedField
      }
    })

    setColumnMappings(mappings)
  }

  // Actualizar mapeo de columna
  const updateMapping = (excelColumn: string, systemField: string) => {
    setColumnMappings(prev => prev.map(m => 
      m.excelColumn === excelColumn 
        ? { ...m, systemField, matched: !!systemField }
        : m
    ))
  }

  // Ejecutar importación
  const executeImport = async () => {
    setImporting(true)
    try {
      const mappingObject: Record<string, string> = {}
      columnMappings.forEach(m => {
        if (m.systemField) {
          mappingObject[m.excelColumn] = m.systemField
        }
      })

      console.log('Iniciando importación...', { importSource, file: file?.name, syncToDrive })

      let response: Response | undefined
      
      if (importSource === 'local' && file) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('column_mapping', JSON.stringify(mappingObject))
        if (selectedSheet) {
          formData.append('sheet_name', selectedSheet)
        }
        formData.append('sync_to_drive', String(syncToDrive))
        formData.append('user', 'web_user')

        console.log('Enviando archivo local...')
        response = await fetch(`${BACKEND_URL}/api/ldu/import-local`, {
          method: 'POST',
          body: formData
        })
      } else if (selectedDriveFile) {
        console.log('Importando desde Drive...')
        response = await fetch(`${BACKEND_URL}/api/ldu/import`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file_id: selectedDriveFile,
            column_mapping: mappingObject,
            user: 'web_user'
          })
        })
      }

      if (!response) {
        throw new Error('No se pudo iniciar la importación')
      }

      console.log('Respuesta recibida:', response.status)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.detail || `Error del servidor: ${response.status}`)
      }

      const data = await response.json()
      console.log('Datos de respuesta:', data)
      
      if (data?.success) {
        setImportResult(data.data)
        setStep(4) // Ir a resultados
        toast.success('Importación completada')
      } else {
        throw new Error(data?.detail || 'Error en la importación')
      }
    } catch (error: any) {
      console.error('Error en importación:', error)
      toast.error(error.message || 'Error en la importación')
    } finally {
      setImporting(false)
    }
  }

  const resetWizard = () => {
    setStep(1)
    setImportSource(null)
    setFile(null)
    setFileBuffer(null)
    setPreviewData(null)
    setColumnMappings([])
    setSelectedDriveFile(null)
    setImportResult(null)
    setSheets([])
    setSelectedSheet(null)
  }

  if (!isOpen) return null

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100 dark:border-gray-700 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-900/30 dark:to-purple-900/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
                <Upload className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-800 dark:text-white">Importar Datos LDU</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Paso {step} de 4: {
                    step === 1 ? 'Seleccionar origen' :
                    step === 2 ? (sheets.length > 1 ? 'Seleccionar hoja' : 'Seleccionar archivo') :
                    step === 3 ? 'Mapear columnas' :
                    'Resultados'
                  }
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center gap-2 mt-4">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className="flex items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                  s < step ? 'bg-green-500 text-white' :
                  s === step ? 'bg-indigo-600 text-white' :
                  'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}>
                  {s < step ? <Check className="w-4 h-4" /> : s}
                </div>
                {s < 4 && (
                  <div className={`w-12 h-1 mx-1 rounded ${
                    s < step ? 'bg-green-500' : 'bg-gray-200 dark:bg-gray-700'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Seleccionar origen */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                  ¿De dónde quieres importar?
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Opción: Archivo Local */}
                  <button
                    onClick={() => { setImportSource('local'); setStep(2) }}
                    className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-xl group-hover:bg-blue-200 dark:group-hover:bg-blue-800/50 transition-colors">
                        <HardDrive className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">Desde mi computadora</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Sube un archivo Excel (.xlsx, .xls) desde tu escritorio
                        </p>
                      </div>
                    </div>
                  </button>

                  {/* Opción: Google Drive */}
                  <button
                    onClick={() => { setImportSource('drive'); setStep(2) }}
                    className="p-6 border-2 border-gray-200 dark:border-gray-700 rounded-2xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all group text-left"
                  >
                    <div className="flex items-start gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/50 rounded-xl group-hover:bg-green-200 dark:group-hover:bg-green-800/50 transition-colors">
                        <Cloud className="w-8 h-8 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-gray-800 dark:text-white">Desde Google Drive</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                          Selecciona un archivo Excel de tu Drive conectado
                        </p>
                      </div>
                    </div>
                  </button>
                </div>
              </motion.div>
            )}

            {/* Step 2: Seleccionar archivo o hoja */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Si hay hojas para seleccionar (archivo ya subido con múltiples hojas) */}
                {file && sheets.length > 1 ? (
                  <div>
                    <div className="flex items-center gap-3 mb-6">
                      <FileSpreadsheet className="w-10 h-10 text-green-500" />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">{file.name}</p>
                        <p className="text-sm text-gray-500">{sheets.length} hojas encontradas</p>
                      </div>
                    </div>

                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4">
                      Selecciona la hoja a importar
                    </h3>

                    <div className="space-y-3 max-h-80 overflow-y-auto">
                      {sheets.map((sheet, idx) => (
                        <button
                          key={sheet.name}
                          onClick={() => processLocalFile(file, sheet.name)}
                          disabled={loading}
                          className="w-full p-4 border-2 border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 dark:hover:border-indigo-500 transition-all flex items-center gap-4 text-left disabled:opacity-50"
                        >
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold ${
                            idx === 0 ? 'bg-indigo-500' : 'bg-gray-400'
                          }`}>
                            {idx + 1}
                          </div>
                          <div className="flex-1">
                            <p className="font-medium text-gray-800 dark:text-white">{sheet.name}</p>
                            <p className="text-sm text-gray-500">
                              {sheet.rows.toLocaleString()} filas
                              {sheet.columns && ` · ${sheet.columns} columnas`}
                            </p>
                          </div>
                          {loading && selectedSheet === sheet.name ? (
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          )}
                        </button>
                      ))}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                      <button
                        onClick={() => { setFile(null); setSheets([]); setSelectedSheet(null) }}
                        className="text-sm text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                      >
                        ← Seleccionar otro archivo
                      </button>
                    </div>
                  </div>
                ) : importSource === 'local' ? (
                  <div
                    ref={dropZoneRef}
                    onDrop={handleDrop}
                    onDragOver={e => e.preventDefault()}
                    onDragEnter={e => { e.preventDefault(); dropZoneRef.current?.classList.add('border-indigo-500', 'bg-indigo-50') }}
                    onDragLeave={e => { e.preventDefault(); dropZoneRef.current?.classList.remove('border-indigo-500', 'bg-indigo-50') }}
                    className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl p-12 text-center transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      onChange={handleFileSelect}
                      className="hidden"
                    />

                    {loading ? (
                      <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
                        <p className="text-gray-500">Analizando archivo...</p>
                      </div>
                    ) : (
                      <>
                        <FileSpreadsheet className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-600 dark:text-gray-300 font-medium mb-2">
                          Arrastra tu archivo Excel aquí
                        </p>
                        <p className="text-sm text-gray-400 dark:text-gray-500 mb-4">
                          Formatos soportados: .xlsx, .xls, .csv
                        </p>
                        <button
                          onClick={() => fileInputRef.current?.click()}
                          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors"
                        >
                          Seleccionar archivo
                        </button>
                      </>
                    )}
                  </div>
                ) : (
                  /* Lista de archivos de Drive */
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                        Archivos Excel en Drive
                      </h3>
                      <button
                        onClick={loadDriveFiles}
                        disabled={loading}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      >
                        <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
                      </button>
                    </div>

                    {loading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                      </div>
                    ) : driveFiles.length === 0 ? (
                      <div className="text-center py-12">
                        <Cloud className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500">No se encontraron archivos Excel</p>
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {driveFiles.map(file => (
                          <button
                            key={file.id}
                            onClick={() => processDriveFile(file.id)}
                            className="w-full p-4 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-indigo-500 transition-all flex items-center gap-3 text-left"
                          >
                            <FileSpreadsheet className="w-10 h-10 text-green-500 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-800 dark:text-white truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">
                                Modificado: {new Date(file.modifiedTime).toLocaleString()}
                              </p>
                            </div>
                            <ChevronRight className="w-5 h-5 text-gray-400" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 3: Mapeo de columnas */}
            {step === 3 && previewData && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
                      Mapeo de columnas
                    </h3>
                    <p className="text-sm text-gray-500">
                      Alinea las columnas del Excel con los campos del sistema
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded-lg">
                      {columnMappings.filter(m => m.matched).length} mapeadas
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg">
                      {columnMappings.filter(m => !m.matched).length} sin mapear
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 mb-4">
                  <div className="flex items-start gap-3">
                    <Info className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium">Columna IMEI es obligatoria</p>
                      <p className="text-amber-600 dark:text-amber-300">Asegúrate de mapear al menos la columna IMEI para identificar los dispositivos.</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {columnMappings.map((mapping, idx) => (
                    <div
                      key={mapping.excelColumn}
                      className={`p-4 rounded-xl border-2 transition-colors ${
                        mapping.matched
                          ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20'
                          : 'border-gray-200 dark:border-gray-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        {/* Columna Excel */}
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Columna en Excel</p>
                          <p className="font-medium text-gray-800 dark:text-white">{mapping.excelColumn}</p>
                          {mapping.preview.length > 0 && (
                            <p className="text-xs text-gray-400 mt-1 truncate">
                              Ej: {mapping.preview.filter(Boolean).slice(0, 2).join(', ') || '(vacío)'}
                            </p>
                          )}
                        </div>

                        <ArrowRight className="w-5 h-5 text-gray-400 flex-shrink-0" />

                        {/* Campo del sistema */}
                        <div className="flex-1">
                          <p className="text-xs text-gray-500 mb-1">Campo del sistema</p>
                          <select
                            value={mapping.systemField}
                            onChange={e => updateMapping(mapping.excelColumn, e.target.value)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm ${
                              mapping.matched
                                ? 'border-green-300 dark:border-green-700 bg-green-50 dark:bg-green-900/30'
                                : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700'
                            }`}
                          >
                            <option value="">-- No importar --</option>
                            {SYSTEM_FIELDS.map(field => (
                              <option key={field.key} value={field.key}>
                                {field.label} {field.required ? '*' : ''}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Estado */}
                        <div className="flex-shrink-0">
                          {mapping.matched ? (
                            <CheckCircle className="w-6 h-6 text-green-500" />
                          ) : (
                            <XCircle className="w-6 h-6 text-gray-300" />
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Opción de sincronizar a Drive */}
                {importSource === 'local' && (
                  <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={syncToDrive}
                        onChange={e => setSyncToDrive(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <div>
                        <p className="font-medium text-gray-800 dark:text-white">Sincronizar a Google Drive</p>
                        <p className="text-sm text-gray-500">Guardar una copia del archivo en Drive para futuros updates</p>
                      </div>
                    </label>
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Resultados */}
            {step === 4 && importResult && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="text-center"
              >
                <div className="w-20 h-20 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-6">
                  <CheckCircle className="w-10 h-10 text-green-600 dark:text-green-400" />
                </div>

                <h3 className="text-2xl font-bold text-gray-800 dark:text-white mb-2">
                  ¡Importación completada!
                </h3>
                <p className="text-gray-500 mb-8">
                  Los datos han sido procesados correctamente
                </p>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/30 rounded-xl">
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {importResult.total_filas || 0}
                    </p>
                    <p className="text-sm text-blue-600/70">Total filas</p>
                  </div>
                  <div className="p-4 bg-green-50 dark:bg-green-900/30 rounded-xl">
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {importResult.insertados || 0}
                    </p>
                    <p className="text-sm text-green-600/70">Insertados</p>
                  </div>
                  <div className="p-4 bg-amber-50 dark:bg-amber-900/30 rounded-xl">
                    <p className="text-3xl font-bold text-amber-600 dark:text-amber-400">
                      {importResult.actualizados || 0}
                    </p>
                    <p className="text-sm text-amber-600/70">Actualizados</p>
                  </div>
                  <div className="p-4 bg-purple-50 dark:bg-purple-900/30 rounded-xl">
                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                      {importResult.sin_imei || 0}
                    </p>
                    <p className="text-sm text-purple-600/70">Sin IMEI</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-700/30 rounded-xl">
                    <p className="text-3xl font-bold text-gray-500 dark:text-gray-400">
                      {importResult.sin_cambios || 0}
                    </p>
                    <p className="text-sm text-gray-500/70">Sin cambios</p>
                  </div>
                </div>

                {importResult.errores && importResult.errores.length > 0 && (
                  <div className="text-left mb-6">
                    <h4 className="font-medium text-gray-800 dark:text-white mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-500" />
                      Errores encontrados ({importResult.errores.length})
                    </h4>
                    <div className="max-h-40 overflow-y-auto bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 text-sm">
                      {importResult.errores.slice(0, 5).map((err: any, i: number) => (
                        <p key={i} className="text-red-600 dark:text-red-400">
                          Fila {err.row_number}: {err.error_message}
                        </p>
                      ))}
                      {importResult.errores.length > 5 && (
                        <p className="text-gray-500 mt-2">
                          ...y {importResult.errores.length - 5} errores más
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-between">
          <button
            onClick={() => {
              if (step === 1) {
                onClose()
              } else if (step === 4) {
                onSuccess()
                onClose()
              } else {
                setStep(step - 1)
              }
            }}
            className="px-6 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700"
          >
            {step === 1 ? 'Cancelar' : step === 4 ? 'Cerrar' : 'Atrás'}
          </button>

          {step === 3 && (
            <button
              onClick={executeImport}
              disabled={importing || !columnMappings.some(m => m.systemField === 'IMEI')}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              {importing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  Iniciar importación
                </>
              )}
            </button>
          )}

          {step === 4 && (
            <button
              onClick={() => {
                resetWizard()
              }}
              className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Nueva importación
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

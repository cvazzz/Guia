'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, 
  Filter, 
  FileText, 
  Calendar, 
  Package, 
  CheckCircle, 
  XCircle,
  RefreshCw,
  ChevronDown,
  X,
  TrendingUp,
  Users,
  AlertCircle,
  BarChart3,
  Download,
  PanelLeftOpen,
  CheckSquare,
  Square
} from 'lucide-react'
import { SearchFilters } from '@/components/SearchFilters'
import { DocumentCard } from '@/components/DocumentCard'
import { DocumentViewer } from '@/components/DocumentViewer'
import { StatsCards } from '@/components/StatsCards'
import { Header } from '@/components/Header'
import { LoginPage } from '@/components/LoginPage'
import { AnalyticsDashboard } from '@/components/AnalyticsDashboard'
import { ExportModal } from '@/components/ExportModal'
import { Sidebar } from '@/components/Sidebar'
import { Pagination } from '@/components/Pagination'
import { SelectionToolbar } from '@/components/SelectionToolbar'
import { EditDocumentModal } from '@/components/EditDocumentModal'
import { SyncPanel } from '@/components/SyncPanel'
import { useDocuments } from '@/hooks/useDocuments'
import { useStats } from '@/hooks/useStats'
import { useAuth } from '@/contexts/AuthContext'
import { Documento, SearchParams } from '@/types'
import toast from 'react-hot-toast'

export default function GuiasPage() {
  const [selectedDocument, setSelectedDocument] = useState<Documento | null>(null)
  const [showFilters, setShowFilters] = useState(false)
  const [searchParams, setSearchParams] = useState<SearchParams>({})
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [showExport, setShowExport] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false)
  const [selectionMode, setSelectionMode] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [editingDocument, setEditingDocument] = useState<Documento | null>(null)
  const [showSyncPanel, setShowSyncPanel] = useState(false)
  
  // Paginación
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(12)
  
  const { isAuthenticated, isLoading: authLoading } = useAuth()
  
  const { 
    documents, 
    loading, 
    error, 
    refetch,
    searchDocuments 
  } = useDocuments()
  
  const { stats, loading: statsLoading } = useStats()

  // Calcular documentos paginados
  const paginatedDocuments = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    return documents.slice(startIndex, endIndex)
  }, [documents, currentPage, itemsPerPage])

  const totalPages = Math.ceil(documents.length / itemsPerPage)

  // Reset página cuando cambian los documentos
  useEffect(() => {
    setCurrentPage(1)
  }, [documents.length])

  const handleSearch = async (params: SearchParams) => {
    setSearchParams(params)
    setCurrentPage(1) // Reset a primera página al buscar
    await searchDocuments(params)
  }

  const handleQuickFilter = async (filter: { firmado?: boolean; fecha_desde?: string }) => {
    setShowFilters(true)
    setCurrentPage(1)
    await searchDocuments(filter)
    toast.success('Filtro aplicado')
  }

  const handleRefresh = async () => {
    toast.promise(
      refetch(),
      {
        loading: 'Actualizando documentos...',
        success: 'Documentos actualizados',
        error: 'Error al actualizar'
      }
    )
  }

  const handleViewDocument = (doc: Documento) => {
    setSelectedDocument(doc)
  }

  const handleCloseViewer = () => {
    setSelectedDocument(null)
  }

  const handlePageChange = (page: number) => {
    setCurrentPage(page)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleItemsPerPageChange = (items: number) => {
    setItemsPerPage(items)
    setCurrentPage(1)
  }

  // Funciones de selección
  const handleToggleSelect = (docId: number) => {
    setSelectedIds(prev => {
      const newSet = new Set(prev)
      if (newSet.has(docId)) {
        newSet.delete(docId)
      } else {
        newSet.add(docId)
      }
      // Activar modo selección si hay seleccionados
      if (newSet.size > 0) {
        setSelectionMode(true)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedIds.size === documents.length) {
      // Deseleccionar todos
      setSelectedIds(new Set())
      setSelectionMode(false)
    } else {
      // Seleccionar todos
      setSelectedIds(new Set(documents.map(d => d.id)))
    }
  }

  const handleClearSelection = () => {
    setSelectedIds(new Set())
    setSelectionMode(false)
  }

  const selectedDocuments = useMemo(() => {
    return documents.filter(d => selectedIds.has(d.id))
  }, [documents, selectedIds])

  // Handler para actualizar documento después de editar
  const handleDocumentSave = (updatedDoc: Documento) => {
    refetch() // Refrescar la lista
    setEditingDocument(null)
  }

  // Mostrar loading mientras verifica autenticación
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Cargando...</p>
        </div>
      </div>
    )
  }

  // Si no está autenticado, mostrar login
  if (!isAuthenticated) {
    return <LoginPage />
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/50 to-indigo-100/50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 pattern-bg transition-colors duration-300 dark:text-white">
      {/* Sidebar */}
      <Sidebar 
        documents={documents}
        isOpen={showSidebar}
        onToggle={() => setShowSidebar(!showSidebar)}
        onQuickFilter={handleQuickFilter}
      />

      <Header 
        onRefresh={handleRefresh} 
        onOpenAnalytics={() => setShowAnalytics(true)}
        onOpenExport={() => setShowExport(true)}
      />
      
      <div className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 transition-all duration-300 ${showSidebar ? 'lg:ml-80' : ''}`}>
        {/* Botones de acceso rápido */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap gap-3"
        >
          <button
            onClick={() => setShowSidebar(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all border border-gray-200 dark:border-gray-700"
          >
            <PanelLeftOpen className="w-4 h-4" />
            Panel de Control
          </button>
          <button
            onClick={() => setShowAnalytics(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            Dashboard Analítico
          </button>
          <button
            onClick={() => setShowExport(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <Download className="w-4 h-4" />
            Exportar Datos
          </button>
          <button
            onClick={() => setShowSyncPanel(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-cyan-600 text-white rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Drive
          </button>
          <button
            onClick={() => {
              setSelectionMode(!selectionMode)
              if (selectionMode) {
                setSelectedIds(new Set())
              }
            }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium shadow-lg hover:shadow-xl hover:scale-105 transition-all ${
              selectionMode 
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-300 dark:border-indigo-700'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700'
            }`}
          >
            {selectionMode ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selectionMode ? 'Cancelar Selección' : 'Seleccionar'}
          </button>
        </motion.div>

        {/* Stats Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <StatsCards stats={stats} loading={statsLoading} />
        </motion.div>

        {/* Search Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <div className="bg-white/80 dark:bg-gray-800/90 backdrop-blur-xl rounded-3xl shadow-xl p-6 md:p-8 border border-white/50 dark:border-gray-700 overflow-visible relative z-40">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl">
                    <Search className="w-5 h-5 text-white" />
                  </div>
                  Buscar Documentos
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm mt-1 ml-12">
                  Encuentra guías por fecha, producto, proveedor y más
                </p>
              </div>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold transition-all duration-300 shadow-lg hover:shadow-xl ${
                  showFilters 
                    ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700' 
                    : 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700'
                }`}
              >
                <Filter className="w-4 h-4" />
                {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${showFilters ? 'rotate-180' : ''}`} />
              </button>
            </div>
            
            <AnimatePresence>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.3 }}
                  className="overflow-visible relative z-50"
                >
                  <SearchFilters onSearch={handleSearch} />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>

        {/* Documents Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl">
                  <FileText className="w-5 h-5 text-white" />
                </div>
                Documentos
                {documents.length > 0 && (
                  <span className="text-sm font-normal text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 px-3 py-1 rounded-full ml-2">
                    {documents.length} encontrados
                  </span>
                )}
              </h2>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleRefresh}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-xl transition-all duration-300 font-medium"
            >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
              Actualizar
            </motion.button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <motion.div 
                  key={i} 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/50 dark:border-gray-700/50"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-xl shimmer"></div>
                    <div className="flex-1">
                      <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded-lg w-3/4 mb-2 shimmer"></div>
                      <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2 shimmer"></div>
                    </div>
                  </div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full mb-3 shimmer"></div>
                  <div className="flex gap-2 mb-4">
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-20 shimmer"></div>
                    <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded-full w-24 shimmer"></div>
                  </div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded-xl w-full shimmer"></div>
                </motion.div>
              ))}
            </div>
          ) : error ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-red-50 border border-red-200 rounded-2xl p-8 text-center"
            >
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-red-700 mb-2">Error al cargar documentos</h3>
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={handleRefresh}
                className="px-6 py-2.5 bg-red-100 text-red-700 rounded-xl hover:bg-red-200 transition-colors font-medium"
              >
                Reintentar
              </button>
            </motion.div>
          ) : documents.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-2xl p-12 text-center shadow-lg border border-white/50 dark:border-gray-700/50"
            >
              <div className="w-20 h-20 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-700 dark:to-gray-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-10 h-10 text-gray-400" />
              </div>
              <h3 className="text-xl font-semibold text-gray-600 dark:text-gray-300 mb-2">No hay documentos</h3>
              <p className="text-gray-400 max-w-md mx-auto">
                Los documentos aparecerán aquí cuando se procesen desde Google Drive. 
                Haz clic en Sincronizar para buscar nuevos documentos.
              </p>
            </motion.div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {paginatedDocuments.map((doc, index) => (
                    <motion.div
                      key={doc.id}
                      layout
                      initial={{ opacity: 0, y: 20, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                    >
                      <DocumentCard 
                        document={doc} 
                        onView={() => handleViewDocument(doc)}
                        onEdit={() => setEditingDocument(doc)}
                        isSelected={selectedIds.has(doc.id)}
                        onToggleSelect={() => handleToggleSelect(doc.id)}
                        selectionMode={selectionMode}
                      />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>

              {/* Paginación */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={documents.length}
                itemsPerPage={itemsPerPage}
                onPageChange={handlePageChange}
                onItemsPerPageChange={handleItemsPerPageChange}
              />
            </>
          )}
        </motion.div>
      </div>

      {/* Document Viewer Modal */}
      <AnimatePresence>
        {selectedDocument && (
          <DocumentViewer 
            document={selectedDocument} 
            onClose={handleCloseViewer}
          />
        )}
      </AnimatePresence>

      {/* Analytics Dashboard Modal */}
      <AnimatePresence>
        {showAnalytics && (
          <AnalyticsDashboard
            documents={documents}
            isOpen={showAnalytics}
            onClose={() => setShowAnalytics(false)}
          />
        )}
      </AnimatePresence>

      {/* Export Modal */}
      <AnimatePresence>
        {showExport && (
          <ExportModal
            documents={documents}
            isOpen={showExport}
            onClose={() => setShowExport(false)}
          />
        )}
      </AnimatePresence>

      {/* Selection Toolbar */}
      <SelectionToolbar
        selectedDocuments={selectedDocuments}
        totalDocuments={documents.length}
        onClearSelection={handleClearSelection}
        onSelectAll={handleSelectAll}
        isAllSelected={selectedIds.size === documents.length && documents.length > 0}
      />

      {/* Edit Document Modal */}
      <AnimatePresence>
        {editingDocument && (
          <EditDocumentModal
            document={editingDocument}
            isOpen={!!editingDocument}
            onClose={() => setEditingDocument(null)}
            onSave={handleDocumentSave}
          />
        )}
      </AnimatePresence>

      {/* Sync Panel */}
      <SyncPanel
        isOpen={showSyncPanel}
        onClose={() => setShowSyncPanel(false)}
        onProcessComplete={handleRefresh}
      />
    </main>
  )
}

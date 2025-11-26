'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Calendar, User, Package, Truck, X, RotateCcw, Check, ChevronDown, RefreshCw } from 'lucide-react'
import { SearchParams } from '@/types'
import { getProveedores, getProductosUnicos } from '@/lib/supabase'

interface SearchFiltersProps {
  onSearch: (params: SearchParams) => void
}

export function SearchFilters({ onSearch }: SearchFiltersProps) {
  const [filters, setFilters] = useState<SearchParams>({})
  const [proveedores, setProveedores] = useState<string[]>([])
  const [productos, setProductos] = useState<string[]>([])
  const [selectedProductos, setSelectedProductos] = useState<string[]>([])
  const [showProductosDropdown, setShowProductosDropdown] = useState(false)
  const [loadingProveedores, setLoadingProveedores] = useState(true)
  const [loadingProductos, setLoadingProductos] = useState(true)
  const [productoSearch, setProductoSearch] = useState('')

  const loadData = useCallback(async () => {
    setLoadingProveedores(true)
    setLoadingProductos(true)
    try {
      const [provData, prodData] = await Promise.all([
        getProveedores(),
        getProductosUnicos()
      ])
      setProveedores(provData)
      setProductos(prodData)
    } catch (error) {
      console.error('Error cargando datos:', error)
    } finally {
      setLoadingProveedores(false)
      setLoadingProductos(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Recargar productos cuando se abre el dropdown
  const handleOpenDropdown = async () => {
    setShowProductosDropdown(!showProductosDropdown)
    if (!showProductosDropdown) {
      // Recargar productos al abrir
      setLoadingProductos(true)
      try {
        const prodData = await getProductosUnicos()
        setProductos(prodData)
      } catch (error) {
        console.error('Error recargando productos:', error)
      } finally {
        setLoadingProductos(false)
      }
    }
  }

  const handleRefreshProducts = async (e: React.MouseEvent) => {
    e.stopPropagation()
    setLoadingProductos(true)
    try {
      const prodData = await getProductosUnicos()
      setProductos(prodData)
    } catch (error) {
      console.error('Error recargando productos:', error)
    } finally {
      setLoadingProductos(false)
    }
  }

  const handleChange = (field: keyof SearchParams, value: any) => {
    const newFilters = { ...filters, [field]: value || undefined }
    // Limpiar valores vacíos
    Object.keys(newFilters).forEach(key => {
      if (newFilters[key as keyof SearchParams] === '' || 
          newFilters[key as keyof SearchParams] === undefined) {
        delete newFilters[key as keyof SearchParams]
      }
    })
    setFilters(newFilters)
  }

  const toggleProducto = (producto: string) => {
    const newSelected = selectedProductos.includes(producto)
      ? selectedProductos.filter(p => p !== producto)
      : [...selectedProductos, producto]
    
    setSelectedProductos(newSelected)
    handleChange('productos_seleccionados', newSelected.length > 0 ? newSelected : undefined)
  }

  const handleSearch = () => {
    const searchFilters = { ...filters }
    if (selectedProductos.length > 0) {
      searchFilters.productos_seleccionados = selectedProductos
    }
    onSearch(searchFilters)
  }

  const handleReset = () => {
    setFilters({})
    setSelectedProductos([])
    setProductoSearch('')
    onSearch({})
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      handleSearch()
    }
  }

  // Filtrar productos por búsqueda
  const filteredProductos = productos.filter(p => 
    p.toLowerCase().includes(productoSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* Búsqueda general */}
      <div className="relative group">
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-indigo-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all opacity-0 group-hover:opacity-100"></div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por palabra clave en todo el documento..."
            value={filters.palabra_clave || ''}
            onChange={(e) => handleChange('palabra_clave', e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500"
          />
        </div>
      </div>

      {/* Grid de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Número de Guía */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            📋 Número de Guía
          </label>
          <input
            type="text"
            placeholder="Ej: TT01-001733"
            value={filters.numero_guia || ''}
            onChange={(e) => handleChange('numero_guia', e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Fecha Desde */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Calendar className="inline w-4 h-4 mr-1 text-blue-500" />
            Fecha Desde
          </label>
          <input
            type="date"
            value={filters.fecha_desde || ''}
            onChange={(e) => handleChange('fecha_desde', e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Fecha Hasta */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Calendar className="inline w-4 h-4 mr-1 text-blue-500" />
            Fecha Hasta
          </label>
          <input
            type="date"
            value={filters.fecha_hasta || ''}
            onChange={(e) => handleChange('fecha_hasta', e.target.value)}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Estado Firmado */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            ✍️ Estado de Firma
          </label>
          <select
            value={filters.firmado === undefined ? '' : filters.firmado.toString()}
            onChange={(e) => {
              const value = e.target.value
              handleChange('firmado', value === '' ? undefined : value === 'true')
            }}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md appearance-none cursor-pointer text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos</option>
            <option value="true">✅ Firmados</option>
            <option value="false">⏳ Sin Firmar</option>
          </select>
        </div>
      </div>

      {/* Segunda fila de filtros */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Proveedor */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            <User className="inline w-4 h-4 mr-1 text-indigo-500" />
            Proveedor
          </label>
          <select
            value={filters.proveedor || ''}
            onChange={(e) => handleChange('proveedor', e.target.value)}
            disabled={loadingProveedores}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md appearance-none cursor-pointer disabled:opacity-50 text-gray-900 dark:text-gray-100"
          >
            <option value="">Todos los proveedores</option>
            {proveedores.map((proveedor) => (
              <option key={proveedor} value={proveedor}>
                {proveedor}
              </option>
            ))}
          </select>
        </div>

        {/* Producto - búsqueda simple */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Package className="inline w-4 h-4 mr-1 text-green-500" />
            Buscar Producto
          </label>
          <input
            type="text"
            placeholder="Nombre o código del producto"
            value={filters.producto || ''}
            onChange={(e) => handleChange('producto', e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Transportista */}
        <div className="space-y-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Truck className="inline w-4 h-4 mr-1 text-orange-500" />
            Transportista
          </label>
          <input
            type="text"
            placeholder="Nombre del transportista"
            value={filters.transportista || ''}
            onChange={(e) => handleChange('transportista', e.target.value)}
            onKeyDown={handleKeyPress}
            className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all shadow-sm hover:shadow-md text-gray-900 dark:text-gray-100"
          />
        </div>
      </div>

      {/* Selector de múltiples productos con checkboxes */}
      <div className="relative z-[60]">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300">
            <Package className="inline w-4 h-4 mr-1 text-purple-500" />
            Seleccionar Productos (múltiple)
          </label>
          <button
            onClick={handleRefreshProducts}
            disabled={loadingProductos}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3 h-3 ${loadingProductos ? 'animate-spin' : ''}`} />
            Actualizar lista
          </button>
        </div>
        
        <div 
          className="w-full px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl cursor-pointer flex items-center justify-between shadow-sm hover:shadow-md transition-all"
          onClick={handleOpenDropdown}
        >
          <span className={selectedProductos.length === 0 ? 'text-gray-400 dark:text-gray-500' : 'text-gray-700 dark:text-gray-200'}>
            {loadingProductos 
              ? '⏳ Cargando productos...'
              : selectedProductos.length === 0 
                ? 'Seleccionar productos...' 
                : `✅ ${selectedProductos.length} producto(s) seleccionado(s)`}
          </span>
          <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showProductosDropdown ? 'rotate-180' : ''}`} />
        </div>

        <AnimatePresence>
          {showProductosDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="absolute z-[999] w-full mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-2xl max-h-80 overflow-hidden"
            >
              {/* Buscador dentro del dropdown */}
              <div className="p-3 border-b border-gray-100 bg-gray-50">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar producto..."
                    value={productoSearch}
                    onChange={(e) => setProductoSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                    autoFocus
                  />
                </div>
              </div>
              
              {/* Lista de productos */}
              <div className="max-h-52 overflow-y-auto">
                {loadingProductos ? (
                  <div className="flex items-center justify-center py-8">
                    <RefreshCw className="w-6 h-6 text-blue-500 animate-spin" />
                    <span className="ml-2 text-gray-500">Cargando productos...</span>
                  </div>
                ) : filteredProductos.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <Package className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-gray-500 text-sm">No se encontraron productos</p>
                  </div>
                ) : (
                  filteredProductos.slice(0, 50).map((producto, index) => (
                    <motion.label
                      key={producto}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.02 }}
                      className={`flex items-center gap-3 px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-50 transition-colors ${
                        selectedProductos.includes(producto) ? 'bg-blue-50' : ''
                      }`}
                      onClick={(e) => {
                        e.stopPropagation()
                        toggleProducto(producto)
                      }}
                    >
                      <div 
                        className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all duration-200 ${
                          selectedProductos.includes(producto)
                            ? 'bg-gradient-to-r from-blue-500 to-indigo-600 border-blue-500 shadow-md'
                            : 'border-gray-300 hover:border-blue-400'
                        }`}
                      >
                        {selectedProductos.includes(producto) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-gray-700 truncate flex-1">
                        {producto}
                      </span>
                    </motion.label>
                  ))
                )}
                {filteredProductos.length > 50 && (
                  <div className="px-4 py-3 text-xs text-gray-400 text-center bg-gray-50">
                    📦 Mostrando 50 de {filteredProductos.length} productos
                  </div>
                )}
              </div>

              {/* Footer del dropdown */}
              <div className="p-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between">
                <span className="text-xs text-gray-500">
                  {selectedProductos.length} seleccionados
                </span>
                <div className="flex gap-2">
                  {selectedProductos.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedProductos([])
                        handleChange('productos_seleccionados', undefined)
                      }}
                      className="px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      Limpiar
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setShowProductosDropdown(false)
                    }}
                    className="px-4 py-1.5 text-xs text-white bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Productos seleccionados - chips */}
      <AnimatePresence>
        {selectedProductos.length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {selectedProductos.map((producto, index) => (
              <motion.span
                key={producto}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ delay: index * 0.05 }}
                className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 rounded-full text-sm border border-green-200 shadow-sm"
              >
                <Package className="w-3 h-3" />
                <span className="max-w-[200px] truncate">
                  {producto}
                </span>
                <button
                  onClick={() => toggleProducto(producto)}
                  className="ml-1 hover:bg-green-200 rounded-full p-1 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.span>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Filtros activos (otros) */}
      <AnimatePresence>
        {Object.keys(filters).filter(k => k !== 'productos_seleccionados').length > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-wrap gap-2"
          >
            {Object.entries(filters)
              .filter(([key]) => key !== 'productos_seleccionados')
              .map(([key, value], index) => (
                <motion.span
                  key={key}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.05 }}
                  className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-700 rounded-full text-sm border border-blue-200 shadow-sm"
                >
                  🏷️ {key.replace(/_/g, ' ')}: {String(value)}
                  <button
                    onClick={() => handleChange(key as keyof SearchParams, undefined)}
                    className="ml-1 hover:bg-blue-200 rounded-full p-1 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </motion.span>
              ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Botones de acción */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleSearch}
          className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 bg-gradient-to-r from-blue-500 via-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-600 hover:via-blue-700 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl"
        >
          <Search className="w-5 h-5" />
          Buscar Documentos
        </motion.button>
        
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={handleReset}
          className="flex items-center justify-center gap-2 px-6 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all border border-gray-200"
        >
          <RotateCcw className="w-5 h-5" />
          Limpiar Filtros
        </motion.button>
      </div>
    </div>
  )
}

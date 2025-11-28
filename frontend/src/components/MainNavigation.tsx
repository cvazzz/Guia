'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FileText,
  Smartphone,
  BarChart3,
  Settings,
  Users,
  History,
  Upload,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  Home,
  Package,
  MapPin,
  AlertTriangle,
  CheckCircle
} from 'lucide-react'

interface NavItem {
  name: string
  href: string
  icon: any
  badge?: number
  subItems?: { name: string; href: string }[]
}

const navigation: NavItem[] = [
  {
    name: 'Inicio',
    href: '/',
    icon: Home
  },
  {
    name: 'Guías de Remisión',
    href: '/guias',
    icon: FileText,
    subItems: [
      { name: 'Todas las guías', href: '/guias' },
      { name: 'Pendientes de firma', href: '/guias?firmado=false' },
      { name: 'Sincronizar Drive', href: '/guias/sync' }
    ]
  },
  {
    name: 'Gestión LDU',
    href: '/ldu',
    icon: Smartphone,
    subItems: [
      { name: 'Todos los LDU', href: '/ldu' },
      { name: 'Importar Excel', href: '/ldu/import' },
      { name: 'Responsables', href: '/ldu/responsables' },
      { name: 'Reasignaciones', href: '/ldu/reasignaciones' },
      { name: 'Auditoría', href: '/ldu/auditoria' }
    ]
  },
  {
    name: 'Reportes',
    href: '/reportes',
    icon: BarChart3,
    subItems: [
      { name: 'Dashboard', href: '/reportes' },
      { name: 'LDU por región', href: '/reportes/ldu-region' },
      { name: 'Movimientos', href: '/reportes/movimientos' },
      { name: 'Exportar', href: '/reportes/exportar' }
    ]
  },
  {
    name: 'Configuración',
    href: '/configuracion',
    icon: Settings
  }
]

export function MainNavigation() {
  const [isOpen, setIsOpen] = useState(true)
  const [expandedItem, setExpandedItem] = useState<string | null>(null)
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname.startsWith(href)
  }

  return (
    <>
      {/* Mobile Toggle */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
      >
        {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Overlay móvil */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/20 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.nav
        initial={false}
        animate={{ width: isOpen ? 280 : 80 }}
        className={`fixed left-0 top-0 h-full bg-white dark:bg-gray-900 shadow-xl z-50 flex flex-col ${
          isOpen ? 'w-70' : 'w-20'
        } transition-all duration-300`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-gray-100 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex-shrink-0">
              <Package className="w-6 h-6 text-white" />
            </div>
            <AnimatePresence>
              {isOpen && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h1 className="font-bold text-gray-800 dark:text-white">Sistema Guías</h1>
                  <p className="text-xs text-gray-500">Gestión integral</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {navigation.map(item => (
              <li key={item.name}>
                <div>
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (item.subItems) {
                        e.preventDefault()
                        setExpandedItem(expandedItem === item.name ? null : item.name)
                      }
                    }}
                    className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group ${
                      isActive(item.href)
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <item.icon className={`w-5 h-5 flex-shrink-0 ${
                      isActive(item.href) ? 'text-indigo-600 dark:text-indigo-400' : ''
                    }`} />
                    
                    <AnimatePresence>
                      {isOpen && (
                        <motion.span
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex-1 font-medium"
                        >
                          {item.name}
                        </motion.span>
                      )}
                    </AnimatePresence>

                    {isOpen && item.subItems && (
                      <ChevronRight className={`w-4 h-4 transition-transform ${
                        expandedItem === item.name ? 'rotate-90' : ''
                      }`} />
                    )}

                    {item.badge && (
                      <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>

                  {/* Sub Items */}
                  <AnimatePresence>
                    {isOpen && item.subItems && expandedItem === item.name && (
                      <motion.ul
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden ml-8 mt-1 space-y-1"
                      >
                        {item.subItems.map(subItem => (
                          <li key={subItem.name}>
                            <Link
                              href={subItem.href}
                              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                                pathname === subItem.href
                                  ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20'
                                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800'
                              }`}
                            >
                              {subItem.name}
                            </Link>
                          </li>
                        ))}
                      </motion.ul>
                    )}
                  </AnimatePresence>
                </div>
              </li>
            ))}
          </ul>
        </div>

        {/* Toggle Button */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
          >
            {isOpen ? (
              <>
                <ChevronLeft className="w-5 h-5" />
                <span className="text-sm">Colapsar</span>
              </>
            ) : (
              <ChevronRight className="w-5 h-5" />
            )}
          </button>
        </div>
      </motion.nav>

      {/* Spacer para el contenido */}
      <div className={`transition-all duration-300 ${isOpen ? 'lg:ml-70' : 'lg:ml-20'}`} />
    </>
  )
}

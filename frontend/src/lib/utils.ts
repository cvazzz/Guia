import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string | null): string {
  if (!dateString) return 'Sin fecha'
  
  try {
    // Intentar parsear diferentes formatos
    const date = parseISO(dateString)
    return format(date, "d 'de' MMMM, yyyy", { locale: es })
  } catch {
    return dateString
  }
}

export function formatShortDate(dateString: string | null): string {
  if (!dateString) return '-'
  
  try {
    const date = parseISO(dateString)
    return format(date, 'dd/MM/yyyy')
  } catch {
    return dateString
  }
}

export function truncateText(text: string | null, maxLength: number = 100): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'success':
      return 'bg-green-100 text-green-800'
    case 'partial':
      return 'bg-yellow-100 text-yellow-800'
    case 'error':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

export function getStatusLabel(status: string): string {
  switch (status) {
    case 'success':
      return 'Completo'
    case 'partial':
      return 'Parcial'
    case 'error':
      return 'Error'
    default:
      return 'Pendiente'
  }
}

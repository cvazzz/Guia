'use client'

import { useState, useRef, useEffect, ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'

interface TooltipProps {
  content: string | ReactNode
  children: ReactNode
  position?: 'top' | 'bottom' | 'left' | 'right'
  delay?: number
  className?: string
}

export function Tooltip({ 
  content, 
  children, 
  position = 'top', 
  delay = 300,
  className = ''
}: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [tooltipPosition, setTooltipPosition] = useState({ top: 0, left: 0 })
  const timeoutRef = useRef<NodeJS.Timeout | null>(null)
  const elementRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  const showTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      if (elementRef.current) {
        const rect = elementRef.current.getBoundingClientRect()
        const scrollX = window.scrollX
        const scrollY = window.scrollY
        
        let top = 0
        let left = 0
        
        switch (position) {
          case 'top':
            top = rect.top + scrollY - 8
            left = rect.left + scrollX + rect.width / 2
            break
          case 'bottom':
            top = rect.bottom + scrollY + 8
            left = rect.left + scrollX + rect.width / 2
            break
          case 'left':
            top = rect.top + scrollY + rect.height / 2
            left = rect.left + scrollX - 8
            break
          case 'right':
            top = rect.top + scrollY + rect.height / 2
            left = rect.right + scrollX + 8
            break
        }
        
        setTooltipPosition({ top, left })
      }
      setIsVisible(true)
    }, delay)
  }

  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current)
    }
    setIsVisible(false)
  }

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current)
      }
    }
  }, [])

  const getTransformStyles = () => {
    switch (position) {
      case 'top':
        return 'translate(-50%, -100%)'
      case 'bottom':
        return 'translate(-50%, 0%)'
      case 'left':
        return 'translate(-100%, -50%)'
      case 'right':
        return 'translate(0%, -50%)'
      default:
        return 'translate(-50%, -100%)'
    }
  }

  const tooltipContent = (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: tooltipPosition.top - window.scrollY,
            left: tooltipPosition.left - window.scrollX,
            transform: getTransformStyles(),
            zIndex: 99999,
            pointerEvents: 'none'
          }}
        >
          <div className="px-3 py-2 text-sm font-medium text-white bg-gray-800 dark:bg-gray-700 rounded-lg shadow-xl max-w-xs whitespace-normal">
            {content}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  return (
    <div 
      ref={elementRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={showTooltip}
      onMouseLeave={hideTooltip}
      onFocus={showTooltip}
      onBlur={hideTooltip}
    >
      {children}
      {mounted && createPortal(tooltipContent, document.body)}
    </div>
  )
}

// Tooltip con ícono de información
interface InfoTooltipProps {
  content: string | ReactNode
  className?: string
}

export function InfoTooltip({ content, className = '' }: InfoTooltipProps) {
  return (
    <Tooltip content={content} position="top">
      <button
        type="button"
        className={`inline-flex items-center justify-center w-4 h-4 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors ${className}`}
      >
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      </button>
    </Tooltip>
  )
}

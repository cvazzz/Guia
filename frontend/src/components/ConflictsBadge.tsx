'use client';

import { useState, useEffect } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import ConflictsModal from './ConflictsModal';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface ConflictsBadgeProps {
  onResolve?: () => void;
}

export default function ConflictsBadge({ onResolve }: ConflictsBadgeProps) {
  const [count, setCount] = useState(0);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchCount();
    // Actualizar cada 30 segundos
    const interval = setInterval(fetchCount, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchCount = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/conflictos/resumen`);
      const data = await response.json();
      if (data.success) {
        setCount(data.data.total_pendientes || 0);
      }
    } catch (err) {
      console.error('Error fetching conflicts count:', err);
    }
  };

  const handleResolved = () => {
    fetchCount();
    if (onResolve) onResolve();
  };

  if (count === 0) return null;

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="relative flex items-center gap-2 px-3 py-2 bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
      >
        <ExclamationTriangleIcon className="h-5 w-5" />
        <span className="text-sm font-medium">
          {count} conflicto{count !== 1 ? 's' : ''} pendiente{count !== 1 ? 's' : ''}
        </span>
        <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-xs text-white font-bold">
          {count > 99 ? '99+' : count}
        </span>
      </button>

      <ConflictsModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onResolved={handleResolved}
      />
    </>
  );
}

'use client';

import { useState, useEffect } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { 
  ExclamationTriangleIcon, 
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

interface Conflict {
  id: string;
  imei: string;
  campo: string;
  valor_actual: string;
  valor_excel: string;
  fecha_edicion_manual: string;
  usuario_edicion: string;
  archivo_origen: string;
  fila_origen: number;
  estado: string;
  ldu_registros?: {
    modelo: string;
    responsable_nombre: string;
    responsable_apellido: string;
    punto_venta: string;
    region: string;
  };
}

interface ConflictsSummary {
  total_pendientes: number;
  registros_afectados: number;
  conflictos_por_campo: Record<string, number>;
}

interface ConflictsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onResolved?: () => void;
}

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

// Mapeo de nombres de campos a nombres legibles
const FIELD_LABELS: Record<string, string> = {
  'modelo': 'Modelo',
  'region': 'Región',
  'punto_venta': 'Punto de Venta',
  'nombre_ruta': 'Nombre Ruta',
  'cobertura_valor': 'Cobertura',
  'canal': 'Canal',
  'tipo': 'Tipo',
  'campo_reg': 'REG',
  'campo_ok': 'OK',
  'uso': 'Uso',
  'observaciones': 'Observaciones',
  'estado': 'Estado',
  'responsable_dni': 'DNI Responsable',
  'responsable_nombre': 'Nombre Responsable',
  'responsable_apellido': 'Apellido Responsable',
  'account': 'Account',
  'account_int': 'Account Int',
  'supervisor': 'Supervisor',
  'zone': 'Zona',
  'departamento': 'Departamento',
  'city': 'Ciudad'
};

export default function ConflictsModal({ isOpen, onClose, onResolved }: ConflictsModalProps) {
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [summary, setSummary] = useState<ConflictsSummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [resolving, setResolving] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConflicts();
      fetchSummary();
    }
  }, [isOpen]);

  const fetchConflicts = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/conflictos?estado=pendiente&limit=100`);
      const data = await response.json();
      if (data.success) {
        setConflicts(data.data);
      } else {
        setError('Error al cargar conflictos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/conflictos/resumen`);
      const data = await response.json();
      if (data.success) {
        setSummary(data.data);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const resolveConflict = async (conflictId: string, action: 'mantener' | 'sobrescribir') => {
    setResolving(conflictId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/conflictos/${conflictId}/resolver`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: action, user: 'frontend_user' })
      });
      const data = await response.json();
      if (data.success) {
        // Remover de la lista
        setConflicts(prev => prev.filter(c => c.id !== conflictId));
        fetchSummary();
        if (onResolved) onResolved();
      } else {
        setError(data.detail || 'Error al resolver conflicto');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setResolving(null);
    }
  };

  const resolveAllConflicts = async (action: 'mantener' | 'sobrescribir') => {
    if (!confirm(`¿Está seguro de ${action === 'mantener' ? 'MANTENER todos los valores actuales' : 'SOBRESCRIBIR con los valores del Excel'}?`)) {
      return;
    }
    
    setLoading(true);
    try {
      const response = await fetch(`${BACKEND_URL}/api/ldu/conflictos/resolver-todos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: action, user: 'frontend_user' })
      });
      const data = await response.json();
      if (data.success) {
        setConflicts([]);
        fetchSummary();
        if (onResolved) onResolved();
      } else {
        setError(data.detail || 'Error al resolver conflictos');
      }
    } catch (err) {
      setError('Error de conexión');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getFieldLabel = (field: string) => FIELD_LABELS[field] || field;

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-4xl transform overflow-hidden rounded-2xl bg-white dark:bg-gray-800 p-6 shadow-xl transition-all">
                <Dialog.Title className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-6 w-6 text-amber-500" />
                  Conflictos de Importación
                </Dialog.Title>

                {/* Resumen */}
                {summary && summary.total_pendientes > 0 && (
                  <div className="mt-4 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-amber-800 dark:text-amber-200">
                          <strong>{summary.total_pendientes}</strong> conflictos pendientes en{' '}
                          <strong>{summary.registros_afectados}</strong> registros
                        </p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                          Los cambios manuales están protegidos. Decida si mantenerlos o usar los valores del Excel.
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => resolveAllConflicts('mantener')}
                          disabled={loading}
                          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                        >
                          Mantener Todos
                        </button>
                        <button
                          onClick={() => resolveAllConflicts('sobrescribir')}
                          disabled={loading}
                          className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                        >
                          Sobrescribir Todos
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Error */}
                {error && (
                  <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 rounded-lg">
                    {error}
                  </div>
                )}

                {/* Lista de conflictos */}
                <div className="mt-4 max-h-96 overflow-y-auto">
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <ArrowPathIcon className="h-8 w-8 animate-spin text-gray-400" />
                    </div>
                  ) : conflicts.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircleIcon className="h-12 w-12 mx-auto text-green-500 mb-2" />
                      <p>No hay conflictos pendientes</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {conflicts.map((conflict) => (
                        <div
                          key={conflict.id}
                          className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="font-mono text-sm text-gray-600 dark:text-gray-400">
                                  {conflict.imei}
                                </span>
                                <span className="px-2 py-0.5 text-xs bg-amber-100 dark:bg-amber-900 text-amber-800 dark:text-amber-200 rounded">
                                  {getFieldLabel(conflict.campo)}
                                </span>
                              </div>
                              
                              {conflict.ldu_registros && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {conflict.ldu_registros.modelo} - {conflict.ldu_registros.punto_venta}
                                </p>
                              )}

                              <div className="grid grid-cols-2 gap-4 mt-3">
                                <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded border border-green-200 dark:border-green-800">
                                  <p className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">
                                    Valor Actual (editado)
                                  </p>
                                  <p className="text-sm text-green-800 dark:text-green-200 font-mono">
                                    {conflict.valor_actual || '(vacío)'}
                                  </p>
                                </div>
                                <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-800">
                                  <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mb-1">
                                    Valor Excel (nuevo)
                                  </p>
                                  <p className="text-sm text-blue-800 dark:text-blue-200 font-mono">
                                    {conflict.valor_excel || '(vacío)'}
                                  </p>
                                </div>
                              </div>

                              <p className="text-xs text-gray-500 mt-2">
                                Editado por {conflict.usuario_edicion || 'desconocido'} • 
                                Archivo: {conflict.archivo_origen}
                              </p>
                            </div>

                            <div className="flex flex-col gap-2 ml-4">
                              <button
                                onClick={() => resolveConflict(conflict.id, 'mantener')}
                                disabled={resolving === conflict.id}
                                className="px-3 py-1.5 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <CheckCircleIcon className="h-4 w-4" />
                                Mantener
                              </button>
                              <button
                                onClick={() => resolveConflict(conflict.id, 'sobrescribir')}
                                disabled={resolving === conflict.id}
                                className="px-3 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1"
                              >
                                <ArrowPathIcon className="h-4 w-4" />
                                Sobrescribir
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
                  >
                    Cerrar
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
}

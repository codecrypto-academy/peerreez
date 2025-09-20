"use client";
import React, { useState, useEffect, useRef } from 'react';

interface LogsModalProps {
    isOpen: boolean;
    onClose: () => void;
    containerName: string;
    networkName: string;
}

export default function LogsModal({ isOpen, onClose, containerName, networkName }: LogsModalProps) {
    const [logs, setLogs] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
    const [refreshInterval, setRefreshInterval] = useState<number>(3000); // 3 segundos
    const logsContainerRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    // Función para obtener los logs
    const fetchLogs = async () => {
        if (!containerName) return;

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/logs?containerName=${encodeURIComponent(containerName)}&tail=200`);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Error al obtener logs');
            }

            setLogs(data.logs);

            // Auto-scroll al final
            if (logsContainerRef.current) {
                logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
            }

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    };

    // Efecto para cargar logs cuando se abre el modal
    useEffect(() => {
        if (isOpen && containerName) {
            fetchLogs();
        }
    }, [isOpen, containerName]);

    // Efecto para auto-refresh
    useEffect(() => {
        if (isOpen && autoRefresh && containerName) {
            intervalRef.current = setInterval(() => {
                fetchLogs();
            }, refreshInterval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [isOpen, autoRefresh, refreshInterval, containerName]);

    // Limpiar interval al cerrar
    useEffect(() => {
        if (!isOpen && intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-900 rounded-2xl shadow-2xl max-w-6xl w-full h-5/6 flex flex-col border border-gray-700">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                        <h2 className="text-xl font-bold text-cyan-400">
                            Logs en tiempo real - {containerName}
                        </h2>
                        <span className="text-sm text-gray-400 bg-gray-800 px-2 py-1 rounded">
                            Red: {networkName}
                        </span>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Auto-refresh toggle */}
                        <label className="flex items-center gap-2 text-sm text-gray-300">
                            <input
                                type="checkbox"
                                checked={autoRefresh}
                                onChange={(e) => setAutoRefresh(e.target.checked)}
                                className="rounded"
                            />
                            Auto-refresh
                        </label>

                        {/* Refresh interval selector */}
                        <select
                            value={refreshInterval}
                            onChange={(e) => setRefreshInterval(Number(e.target.value))}
                            disabled={!autoRefresh}
                            className="bg-gray-800 text-gray-300 rounded px-2 py-1 text-sm border border-gray-600 disabled:opacity-50"
                        >
                            <option value={1000}>1s</option>
                            <option value={3000}>3s</option>
                            <option value={5000}>5s</option>
                            <option value={10000}>10s</option>
                        </select>

                        {/* Manual refresh button */}
                        <button
                            onClick={fetchLogs}
                            disabled={loading}
                            className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded text-sm font-medium transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Cargando...' : '🔄 Actualizar'}
                        </button>

                        {/* Close button */}
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-white transition-colors"
                            aria-label="Cerrar logs"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {error ? (
                        <div className="p-6 text-center">
                            <div className="text-red-400 mb-4">
                                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Error: {error}
                            </div>
                            <button
                                onClick={fetchLogs}
                                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded font-medium transition-colors"
                            >
                                Reintentar
                            </button>
                        </div>
                    ) : (
                        <div className="flex-1 overflow-hidden relative">
                            <div
                                ref={logsContainerRef}
                                className="h-full overflow-auto p-4 bg-black text-green-400 font-mono text-sm leading-relaxed"
                            >
                                {loading && logs === '' ? (
                                    <div className="flex items-center justify-center h-full text-gray-500">
                                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
                                        <span className="ml-2">Cargando logs...</span>
                                    </div>
                                ) : (
                                    <pre className="whitespace-pre-wrap break-words">
                                        {logs || 'No hay logs disponibles para este contenedor.'}
                                    </pre>
                                )}
                            </div>

                            {/* Loading overlay */}
                            {loading && logs !== '' && (
                                <div className="absolute top-2 right-2 bg-gray-800 bg-opacity-90 text-cyan-400 px-3 py-1 rounded-lg text-sm flex items-center gap-2">
                                    <div className="w-3 h-3 border-t-2 border-cyan-400 border-solid rounded-full animate-spin"></div>
                                    Actualizando...
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-700 bg-gray-800">
                    <div className="flex items-center justify-between text-sm text-gray-400">
                        <div>
                            {autoRefresh ? (
                                <span>🟢 Auto-actualización activa cada {refreshInterval / 1000}s</span>
                            ) : (
                                <span>⭕ Auto-actualización pausada</span>
                            )}
                        </div>
                        <div>
                            Última actualización: {new Date().toLocaleTimeString()}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

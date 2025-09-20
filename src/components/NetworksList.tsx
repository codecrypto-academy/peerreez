
"use client";
import React, { useEffect, useState } from 'react';
import LogsModal from './LogsModal';

// Componente NetworksList: muestra las redes Besu y sus nodos, permite gestionar nodos y redes
interface NetworksListProps {
    onSelect?: (net: any) => void;
}

export default function NetworksList({ onSelect }: NetworksListProps) {
    // Estados para acciones y errores
    const [deletingNode, setDeletingNode] = useState<string | null>(null); // Nodo RPC en proceso de eliminación
    const [deleteError, setDeleteError] = useState<string>('');
    const [deletingAll, setDeletingAll] = useState<string | null>(null); // Red en proceso de eliminar todos los RPC
    const [deleteAllError, setDeleteAllError] = useState<string>('');
    const [rpcToAdd, setRpcToAdd] = useState<number>(1); // Cantidad de RPCs a añadir
    const [addingRpc, setAddingRpc] = useState<string | null>(null); // Red en proceso de añadir RPC
    const [addRpcError, setAddRpcError] = useState<string>('');
    // Estado para detener todos los nodos RPC
    const [stoppingAllRpc, setStoppingAllRpc] = useState<string | null>(null);
    const [stopAllRpcError, setStopAllRpcError] = useState<string>('');
    // Estado para arrancar todos los nodos RPC
    const [startingAllRpc, setStartingAllRpc] = useState<string | null>(null);
    const [startAllRpcError, setStartAllRpcError] = useState<string>('');
    // Estado para el modal de logs
    const [logsModalOpen, setLogsModalOpen] = useState<boolean>(false);
    const [selectedContainer, setSelectedContainer] = useState<{ name: string, network: string }>({ name: '', network: '' });
    // Estado para controlar si la red está corriendo o detenida
    const [networkStatus, setNetworkStatus] = useState<{ [key: string]: 'running' | 'stopped' }>({});

    // Función para determinar el estado de la red basado en sus nodos
    const getNetworkStatus = (net: any): 'running' | 'stopped' => {
        if (!net.nodes || net.nodes.length === 0) return 'stopped';

        // Una red se considera "running" si el bootnode está corriendo (es el componente esencial)
        // El miner puede parar sin afectar la funcionalidad de los nodos RPC
        const bootnode = net.nodes.find((node: any) => node.name.includes('bootnode'));
        const bootnodeRunning = bootnode && bootnode.status === 'running';

        return bootnodeRunning ? 'running' : 'stopped';
    };

    // Función para determinar si hay nodos RPC corriendo en la red
    const getRpcNodesStatus = (net: any): 'running' | 'stopped' | 'mixed' => {
        if (!net.nodes || net.nodes.length === 0) return 'stopped';

        const rpcNodes = net.nodes.filter((node: any) => node.name.includes('rpc'));
        if (rpcNodes.length === 0) return 'stopped';

        const runningRpc = rpcNodes.filter((node: any) => node.status === 'running');
        const stoppedRpc = rpcNodes.filter((node: any) => node.status !== 'running');

        if (runningRpc.length === 0) return 'stopped';
        if (stoppedRpc.length === 0) return 'running';
        return 'mixed'; // Algunos corriendo, algunos parados
    };

    // Eliminar nodo RPC
    const handleDeleteNodeRpc = async (networkName: string, nodeName: string) => {
        setDeletingNode(nodeName);
        setDeleteError('');
        try {
            const res = await fetch('/api/deleteNodeRpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName, nombreContenedor: nodeName })
            });
            if (!res.ok) throw new Error('Error al eliminar el nodo RPC');
            setTimeout(() => {
                setDeletingNode(null);
            }, 1500);
        } catch (err) {
            setDeleteError(err instanceof Error ? err.message : 'Error desconocido');
            setDeletingNode(null);
        }
    };

    // Eliminar todos los nodos RPC de una red
    const handleDeleteAllRpcNodes = async (networkName: string) => {
        setDeletingAll(networkName);
        setDeleteAllError('');
        try {
            const res = await fetch('/api/deleteAllRpcNodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName })
            });
            if (!res.ok) throw new Error('Error al eliminar todos los nodos RPC');
            setTimeout(() => {
                setDeletingAll(null);
            }, 1500);
        } catch (err) {
            setDeleteAllError(err instanceof Error ? err.message : 'Error desconocido');
            setDeletingAll(null);
        }
    };

    // Detener todos los nodos RPC de una red
    const handleStopAllRpcNodes = async (networkName: string) => {
        setStoppingAllRpc(networkName);
        setStopAllRpcError('');
        try {
            const res = await fetch('/api/stopNode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName, tipoOContenedor: 'rpc' })
            });
            if (!res.ok) throw new Error('Error al detener todos los nodos RPC');
            setTimeout(() => {
                setStoppingAllRpc(null);
                if (typeof fetchNetworks === 'function') fetchNetworks();
            }, 1500);
        } catch (err) {
            setStopAllRpcError(err instanceof Error ? err.message : 'Error desconocido');
            setStoppingAllRpc(null);
        }
    };

    // Arrancar todos los nodos RPC de una red
    const handleStartAllRpcNodes = async (networkName: string) => {
        setStartingAllRpc(networkName);
        setStartAllRpcError('');
        try {
            const res = await fetch('/api/startNodes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName, tipoOContenedor: 'rpc' })
            });
            if (!res.ok) throw new Error('Error al arrancar todos los nodos RPC');
            setTimeout(() => {
                setStartingAllRpc(null);
                if (typeof fetchNetworks === 'function') fetchNetworks();
            }, 1500);
        } catch (err) {
            setStartAllRpcError(err instanceof Error ? err.message : 'Error desconocido');
            setStartingAllRpc(null);
        }
    };

    // Abrir modal de logs
    const handleOpenLogs = (containerName: string, networkName: string) => {
        setSelectedContainer({ name: containerName, network: networkName });
        setLogsModalOpen(true);
    };

    // Cerrar modal de logs
    const handleCloseLogs = () => {
        setLogsModalOpen(false);
        setSelectedContainer({ name: '', network: '' });
    };

    // Añadir nodos RPC a una red
    const handleAddRpcNodes = async (networkName: string) => {
        setAddingRpc(networkName);
        setAddRpcError('');
        try {
            const res = await fetch('/api/deployNodeRpc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName, n: rpcToAdd })
            });
            if (!res.ok) throw new Error('Error al añadir nodos RPC');
            setTimeout(() => {
                setAddingRpc(null);
            }, 1500);
        } catch (err) {
            setAddRpcError(err instanceof Error ? err.message : 'Error desconocido');
            setAddingRpc(null);
        }
    };

    // Arrancar nodo
    const [startingNode, setStartingNode] = useState<string | null>(null);
    const [startError, setStartError] = useState<string>('');
    const handleStartNode = async (networkName: string, nodeName: string) => {
        setStartingNode(nodeName);
        setStartError('');
        try {
            const res = await fetch('/api/startNode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName, nombreContenedor: nodeName })
            });
            if (!res.ok) throw new Error('Error al arrancar el nodo');
            setTimeout(() => {
                setStartingNode(null);
            }, 1500);
        } catch (err) {
            setStartError(err instanceof Error ? err.message : 'Error desconocido');
            setStartingNode(null);
        }
    };

    // Parar nodo
    const [stoppingNode, setStoppingNode] = useState<string | null>(null);
    const [stopError, setStopError] = useState<string>('');
    const handleStopNode = async (networkName: string, nodeName: string) => {
        setStoppingNode(nodeName);
        setStopError('');
        try {
            const res = await fetch('/api/stopNode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName, tipoOContenedor: nodeName })
            });
            if (!res.ok) throw new Error('Error al parar el nodo');
            setTimeout(() => {
                setStoppingNode(null);
            }, 1500);
        } catch (err) {
            setStopError(err instanceof Error ? err.message : 'Error desconocido');
            setStoppingNode(null);
        }
    };

    // Estados para redes y limpieza
    const [networks, setNetworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [cleaning, setCleaning] = useState<string | null>(null);
    const [cleanError, setCleanError] = useState<string>('');

    // Limpiar red
    const handleCleanNetwork = async (networkName: string) => {
        setCleaning(networkName);
        setCleanError('');
        try {
            const res = await fetch('/api/cleanNetwork', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName })
            });
            if (!res.ok) throw new Error('Error al limpiar la red');
            // Opcional: refrescar redes tras limpiar
            setTimeout(() => {
                setCleaning(null);
            }, 1500);
        } catch (err) {
            setCleanError(err instanceof Error ? err.message : 'Error desconocido');
            setCleaning(null);
        }
    };

    // Función para obtener redes periódicamente
    const fetchNetworks = React.useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/networks');
            if (!res.ok) throw new Error('Error al obtener redes');
            const data = await res.json();
            setNetworks(data.networks || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Error desconocido');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        fetchNetworks();
        intervalId = setInterval(fetchNetworks, 5000);
        return () => clearInterval(intervalId);
    }, [fetchNetworks]);

    // Actualizar el estado de las redes cuando cambian los datos
    useEffect(() => {
        if (networks && networks.length > 0) {
            const newStatus: { [key: string]: 'running' | 'stopped' } = {};
            networks.forEach((net: any) => {
                newStatus[net.name] = getNetworkStatus(net);
            });
            setNetworkStatus(newStatus);
        }
    }, [networks]);


    // Renderizado principal del componente
    return (
        <div className="w-full max-w-screen-2xl mx-auto px-2 md:px-8 py-8">
            <div className="w-full">
                <div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-4 md:p-8 text-gray-100 transition-all duration-300">
                    <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-4">
                        <h2 className="text-3xl md:text-4xl font-extrabold text-cyan-400 tracking-tight drop-shadow-lg" aria-label="Título de redes y nodos">Redes y Nodos</h2>
                    </div>
                    {/* Indicador de carga */}
                    {loading}
                    {/* Mensaje de error global */}
                    {error && <div className="text-red-400 mb-6 text-xl font-semibold text-center">{error}</div>}
                    <ul className="flex flex-col gap-6 w-full" aria-label="Lista de redes">
                        {networks.map((net: any) => {
                            // Agrupa nodos por tipo
                            const grouped: Record<string, any[]> = { rpc: [], miner: [], bootnode: [], otros: [] };
                            net.nodes.forEach((node: any) => {
                                if (node.name.includes('rpc')) grouped.rpc.push(node);
                                else if (node.name.includes('miner')) grouped.miner.push(node);
                                else if (node.name.includes('bootnode')) grouped.bootnode.push(node);
                                else grouped.otros.push(node);
                            });
                            // Renderiza los nodos de cada tipo
                            const renderNodes = (nodes: any[], tipo: string) => (
                                <div className="mb-4">
                                    <h4 className="text-purple-300 font-bold text-base mb-2 uppercase tracking-wide drop-shadow" aria-label={`Tipo de nodo: ${tipo}`}>{tipo}</h4>
                                    <ul className="space-y-4" aria-label={`Lista de nodos tipo ${tipo}`}> {/* Mejora accesibilidad */}
                                        {nodes.map((node: any) => {
                                            // Puertos únicos
                                            const uniquePorts = Array.from(new Set((node.ports || []).map((p: any) => p.PublicPort || p.PrivatePort))).filter(Boolean);
                                            let showPort = null;
                                            if (tipo === 'RPC' && node.ports && node.ports.length > 0) {
                                                const publicPortObj = node.ports.find((p: any) => p.IP && p.PublicPort);
                                                showPort = publicPortObj ? String(publicPortObj.PublicPort) : null;
                                            }
                                            // Icono por tipo de nodo
                                            let typeIconSvg;
                                            if (tipo === 'RPC') {
                                                typeIconSvg = (
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Icono RPC">
                                                        <rect x="3" y="7" width="18" height="10" rx="3" fill="#06b6d4" stroke="#0ea5e9" />
                                                        <path d="M8 11h8M8 15h8" stroke="#fff" />
                                                    </svg>
                                                );
                                            } else if (tipo === 'Miner') {
                                                typeIconSvg = (
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Icono Miner">
                                                        <circle cx="12" cy="12" r="8" fill="#a78bfa" stroke="#7c3aed" />
                                                        <path d="M12 8v4l3 3" stroke="#fff" />
                                                    </svg>
                                                );
                                            } else if (tipo === 'Bootnode') {
                                                typeIconSvg = (
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Icono Bootnode">
                                                        <polygon points="12 2 22 8 22 16 12 22 2 16 2 8 12 2" fill="#f59e42" stroke="#ea580c" />
                                                        <circle cx="12" cy="12" r="3" fill="#fff" />
                                                    </svg>
                                                );
                                            } else {
                                                typeIconSvg = (
                                                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Icono Otro">
                                                        <circle cx="12" cy="12" r="10" />
                                                    </svg>
                                                );
                                            }
                                            // Render nodo individual
                                            return (
                                                <li key={node.id} className="bg-gray-900 rounded-xl p-4 flex flex-col gap-2 border border-gray-700 shadow w-full hover:shadow-xl transition-all overflow-x-auto" aria-label={`Nodo ${node.name}`}>
                                                    {/* Información principal agrupada */}
                                                    <div className="flex flex-row items-center gap-3 mb-2">
                                                        <span className="inline-block w-8 h-8 bg-cyan-700 rounded-full flex items-center justify-center shadow border-2 border-cyan-400/30">
                                                            <span className="flex items-center justify-center w-full h-full">{typeIconSvg}</span>
                                                        </span>
                                                        <span className="text-purple-200 font-bold text-base md:text-lg drop-shadow break-words">{node.name}</span>
                                                        <span className="px-2 py-1 rounded bg-gray-800 text-cyan-300 text-xs font-mono shadow" title="ID único del nodo">ID: <span className="font-bold">{node.id}</span></span>
                                                        <span className="px-2 py-1 rounded bg-gray-800 text-blue-300 text-xs font-mono shadow" title="Tipo de nodo">{tipo}</span>
                                                        {tipo === 'RPC' && showPort && (
                                                            <span className="px-2 py-1 rounded bg-gray-800 text-green-300 text-xs font-mono shadow" title="Puerto público RPC">Puerto: <span className="font-bold">{showPort}</span></span>
                                                        )}
                                                    </div>
                                                    {/* Acciones separadas visualmente */}
                                                    <div className="flex flex-row flex-wrap gap-2 items-center mt-1">
                                                        {(tipo === 'RPC' || tipo === 'Miner') && (
                                                            node.status === 'running' ? (
                                                                <button
                                                                    className="px-2 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold shadow transition-all duration-200 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                                    title="Parar nodo"
                                                                    aria-label={`Parar nodo ${node.name}`}
                                                                    disabled={stoppingNode === node.name || getNetworkStatus(net) === 'stopped'}
                                                                    onClick={() => handleStopNode(node.networkName || node.network || net.name, node.name)}
                                                                >
                                                                    {stoppingNode === node.name ? 'Parando...' : 'Parar nodo'}
                                                                </button>
                                                            ) : (
                                                                <button
                                                                    className="px-2 py-1 bg-green-600 hover:bg-green-500 text-white rounded font-bold shadow transition-all duration-200 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                                    title="Arrancar nodo"
                                                                    aria-label={`Arrancar nodo ${node.name}`}
                                                                    disabled={startingNode === node.name || getNetworkStatus(net) === 'stopped'}
                                                                    onClick={() => handleStartNode(node.networkName || node.network || net.name, node.name)}
                                                                >
                                                                    {startingNode === node.name ? 'Arrancando...' : 'Arrancar nodo'}
                                                                </button>
                                                            )
                                                        )}
                                                        {tipo === 'RPC' && (
                                                            <button
                                                                className="px-2 py-1 bg-red-500 hover:bg-red-400 text-white rounded font-bold shadow transition-all duration-200 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                                title="Eliminar nodo RPC"
                                                                aria-label={`Eliminar nodo RPC ${node.name}`}
                                                                disabled={deletingNode === node.name || getNetworkStatus(net) === 'stopped'}
                                                                onClick={() => handleDeleteNodeRpc(node.networkName || node.network || net.name, node.name)}
                                                            >
                                                                {deletingNode === node.name ? 'Eliminando...' : 'Eliminar RPC'}
                                                            </button>
                                                        )}
                                                        {/* Botón de logs - disponible para todos los nodos */}
                                                        <button
                                                            className="px-2 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded font-bold shadow transition-all duration-200 text-xs flex items-center gap-1"
                                                            title="Ver logs del contenedor"
                                                            aria-label={`Ver logs de ${node.name}`}
                                                            onClick={() => handleOpenLogs(node.name, node.networkName || node.network || net.name)}
                                                        >
                                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                            </svg>
                                                            Logs
                                                        </button>
                                                        <span className={`px-3 py-1 rounded text-xs font-bold shadow transition-all duration-200 ${node.status === 'running' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>{node.status}</span>
                                                    </div>
                                                    {/* Mensajes de error por acción */}
                                                    {(!!stopError && stoppingNode === node.name) && (
                                                        <div className="text-red-400 mt-1 text-xs font-semibold" aria-live="polite">{stopError}</div>
                                                    )}
                                                    {(!!startError && startingNode === node.name) && (
                                                        <div className="text-red-400 mt-1 text-xs font-semibold" aria-live="polite">{startError}</div>
                                                    )}
                                                    {(!!deleteError && deletingNode === node.name) && (
                                                        <div className="text-red-400 mt-1 text-xs font-semibold" aria-live="polite">{deleteError}</div>
                                                    )}
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            );
                            // Render de la red
                            return (
                                <li
                                    key={net.name}
                                    className="bg-gray-800/80 rounded-xl shadow p-6 mb-2 border border-gray-700 hover:border-cyan-400 transition-colors group"
                                    aria-label={`Red Besu ${net.name}`}
                                >
                                    <div className="flex flex-col gap-2 mb-2">
                                        <div className="flex flex-row items-center justify-between gap-2 mb-1">
                                            <span className="font-bold text-purple-300 text-lg md:text-xl drop-shadow cursor-pointer" onClick={() => onSelect && onSelect(net)} aria-label={`Seleccionar red ${net.name}`}>{net.name}</span>
                                            <span className="ml-2 text-cyan-300 text-base font-mono bg-gray-900 px-2 py-1 rounded shadow">Chain ID: {net.chainId || 'N/A'}</span>
                                        </div>
                                        <div className="flex flex-row flex-wrap items-center justify-between w-full mt-1">
                                            <div className="flex flex-row items-center justify-end gap-2 w-full">
                                                <input
                                                    type="number"
                                                    min={1}
                                                    value={rpcToAdd}
                                                    onChange={e => setRpcToAdd(Number(e.target.value))}
                                                    className="w-12 px-2 py-1 rounded bg-gray-900 text-cyan-300 border border-cyan-400/30 font-mono text-xs"
                                                    title="Cantidad de nodos RPC a crear"
                                                    aria-label="Cantidad de nodos RPC a crear"
                                                />
                                                {/* 1. Crear RPC */}
                                                <button
                                                    className="px-3 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded font-bold shadow transition-all duration-200 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                    title="Añadir nodos RPC"
                                                    aria-label={`Añadir nodos RPC a red ${net.name}`}
                                                    disabled={addingRpc === net.name || getNetworkStatus(net) === 'stopped'}
                                                    onClick={() => handleAddRpcNodes(net.name)}
                                                >
                                                    {addingRpc === net.name ? 'Creando...' : 'Crear RPC'}
                                                </button>
                                                {/* 2. Eliminar todos RPC */}
                                                <button
                                                    className="px-3 py-1 bg-pink-600 hover:bg-pink-500 text-white rounded font-bold shadow transition-all duration-200 flex items-center gap-2 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                    title="Eliminar todos los nodos RPC"
                                                    aria-label={`Eliminar todos los nodos RPC de red ${net.name}`}
                                                    disabled={deletingAll === net.name || getNetworkStatus(net) === 'stopped'}
                                                    onClick={() => handleDeleteAllRpcNodes(net.name)}
                                                >
                                                    {deletingAll === net.name ? 'Eliminando todos...' : 'Eliminar todos RPC'}
                                                </button>
                                                {/* 3. Toggle Arrancar/Detener todos RPC */}
                                                {getRpcNodesStatus(net) === 'running' ? (
                                                    <button
                                                        className="px-3 py-1 bg-yellow-600 hover:bg-yellow-500 text-white rounded font-bold shadow transition-all duration-200 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                        title="Detener todos los nodos RPC"
                                                        aria-label={`Detener todos los nodos RPC de red ${net.name}`}
                                                        disabled={stoppingAllRpc === net.name || getNetworkStatus(net) === 'stopped'}
                                                        onClick={() => handleStopAllRpcNodes(net.name)}
                                                    >
                                                        {stoppingAllRpc === net.name ? 'Deteniendo todos...' : 'Detener todos RPC'}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded font-bold shadow transition-all duration-200 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                        title="Arrancar todos los nodos RPC"
                                                        aria-label={`Arrancar todos los nodos RPC de red ${net.name}`}
                                                        disabled={startingAllRpc === net.name || getNetworkStatus(net) === 'stopped'}
                                                        onClick={() => handleStartAllRpcNodes(net.name)}
                                                    >
                                                        {startingAllRpc === net.name ? 'Arrancando todos...' : 'Arrancar todos RPC'}
                                                    </button>
                                                )}
                                                {/* 4. Toggle Detener/Levantar red */}
                                                {getNetworkStatus(net) === 'running' ? (
                                                    <button
                                                        className="px-3 py-1 bg-yellow-700 hover:bg-yellow-600 text-white rounded font-bold shadow transition-all duration-200 flex items-center gap-2 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                        title="Detener red"
                                                        aria-label={`Detener red ${net.name}`}
                                                        disabled={stoppingNode === net.name}
                                                        onClick={async () => {
                                                            setStoppingNode(net.name);
                                                            setStopError('');
                                                            try {
                                                                // Detiene todos los nodos de la red
                                                                const res = await fetch('/api/stopNetwork', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ networkName: net.name })
                                                                });
                                                                if (!res.ok) throw new Error('Error al detener la red');

                                                                // Actualizar estado de la red a 'stopped'
                                                                setNetworkStatus(prev => ({
                                                                    ...prev,
                                                                    [net.name]: 'stopped'
                                                                }));

                                                                setTimeout(() => {
                                                                    setStoppingNode(null);
                                                                    // Forzar refresco de redes tras detener
                                                                    if (typeof fetchNetworks === 'function') fetchNetworks();
                                                                }, 1500);
                                                            } catch (err) {
                                                                setStopError(err instanceof Error ? err.message : 'Error desconocido');
                                                                setStoppingNode(null);
                                                            }
                                                        }}
                                                    >
                                                        {stoppingNode === net.name ? (
                                                            <span className="animate-pulse">Deteniendo...</span>
                                                        ) : (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                                Detener red
                                                            </>
                                                        )}
                                                    </button>
                                                ) : (
                                                    <button
                                                        className="px-3 py-1 bg-green-700 hover:bg-green-600 text-white rounded font-bold shadow transition-all duration-200 flex items-center gap-2 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                        title="Levantar red"
                                                        aria-label={`Levantar red ${net.name}`}
                                                        disabled={startingNode === net.name}
                                                        onClick={async () => {
                                                            setStartingNode(net.name);
                                                            setStartError('');
                                                            try {
                                                                // Arranca primero el bootnode
                                                                const bootRes = await fetch('/api/startBootnode', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ networkName: net.name })
                                                                });
                                                                if (!bootRes.ok) throw new Error('Error al arrancar el bootnode');
                                                                // Luego el resto de nodos
                                                                const res = await fetch('/api/startNetwork', {
                                                                    method: 'POST',
                                                                    headers: { 'Content-Type': 'application/json' },
                                                                    body: JSON.stringify({ networkName: net.name })
                                                                });
                                                                if (!res.ok) throw new Error('Error al levantar la red');

                                                                // Actualizar estado de la red a 'running'
                                                                setNetworkStatus(prev => ({
                                                                    ...prev,
                                                                    [net.name]: 'running'
                                                                }));

                                                                setTimeout(() => {
                                                                    setStartingNode(null);
                                                                }, 1500);
                                                            } catch (err) {
                                                                setStartError(err instanceof Error ? err.message : 'Error desconocido');
                                                                setStartingNode(null);
                                                            }
                                                        }}
                                                    >
                                                        {startingNode === net.name ? (
                                                            <span className="animate-pulse">Levantando...</span>
                                                        ) : (
                                                            <>
                                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                                                Levantar red
                                                            </>
                                                        )}
                                                    </button>
                                                )}
                                                {/* 5. Limpiar red */}
                                                <button
                                                    className="px-3 py-1 bg-red-600 hover:bg-red-500 text-white rounded font-bold shadow transition-all duration-200 flex items-center gap-2 text-xs disabled:bg-gray-500 disabled:cursor-not-allowed"
                                                    title="Limpiar red"
                                                    aria-label={`Limpiar red ${net.name}`}
                                                    disabled={cleaning === net.name}
                                                    onClick={() => handleCleanNetwork(net.name)}
                                                >
                                                    {cleaning === net.name ? (
                                                        <span className="animate-pulse">Limpiando...</span>
                                                    ) : (
                                                        <>
                                                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                            Limpiar red
                                                        </>
                                                    )}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                    {/* Mensajes de error por acción de red */}
                                    {cleanError && cleaning === net.name && (
                                        <div className="text-red-400 mb-1 text-xs font-semibold" aria-live="polite">{cleanError}</div>
                                    )}
                                    {deleteAllError && deletingAll === net.name && (
                                        <div className="text-red-400 mb-1 text-xs font-semibold" aria-live="polite">{deleteAllError}</div>
                                    )}
                                    {addRpcError && addingRpc === net.name && (
                                        <div className="text-red-400 mb-1 text-xs font-semibold" aria-live="polite">{addRpcError}</div>
                                    )}
                                    {stopAllRpcError && stoppingAllRpc === net.name && (
                                        <div className="text-red-400 mb-1 text-xs font-semibold" aria-live="polite">{stopAllRpcError}</div>
                                    )}
                                    {startAllRpcError && startingAllRpc === net.name && (
                                        <div className="text-red-400 mb-1 text-xs font-semibold" aria-live="polite">{startAllRpcError}</div>
                                    )}
                                    <div className="mt-1">
                                        <h3 className="text-cyan-400 font-bold mb-2 text-base" aria-label="Nodos de la red">Nodos</h3>
                                        {grouped.rpc.length > 0 && renderNodes(grouped.rpc, 'RPC')}
                                        {grouped.miner.length > 0 && renderNodes(grouped.miner, 'Miner')}
                                        {grouped.bootnode.length > 0 && renderNodes(grouped.bootnode, 'Bootnode')}
                                        {grouped.otros.length > 0 && renderNodes(grouped.otros, 'Otros')}
                                        {net.nodes.length === 0 && (
                                            <div className="text-gray-400 text-base" aria-label="Sin nodos">No hay nodos Besu en esta red.</div>
                                        )}
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            </div>

            {/* Modal de logs */}
            <LogsModal
                isOpen={logsModalOpen}
                onClose={handleCloseLogs}
                containerName={selectedContainer.name}
                networkName={selectedContainer.network}
            />
        </div>
    );
}

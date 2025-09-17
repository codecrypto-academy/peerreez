"use client";
import React, { useEffect, useState } from 'react';

interface NetworksListProps {
    onSelect?: (net: any) => void;
}

export default function NetworksList({ onSelect }: NetworksListProps) {
    const [networks, setNetworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let intervalId: NodeJS.Timeout;
        const fetchNetworks = async () => {
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
        };
        fetchNetworks();
        intervalId = setInterval(fetchNetworks, 5000);
        return () => clearInterval(intervalId);
    }, []);

    return (
        <div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-7xl mx-auto text-gray-100">
            <h2 className="text-3xl font-extrabold mb-8 text-cyan-400 tracking-tight text-center drop-shadow-lg">Redes y Nodos</h2>
            {loading}
            {error && <div className="text-red-400 mb-6 text-xl font-semibold text-center">{error}</div>}
            <div className="grid grid-cols-1 gap-10">
                {networks.map((net: any) => {
                    // Agrupa nodos por tipo
                    const grouped: Record<string, any[]> = { rpc: [], miner: [], bootnode: [], otros: [] };
                    net.nodes.forEach((node: any) => {
                        if (node.name.includes('rpc')) grouped.rpc.push(node);
                        else if (node.name.includes('miner')) grouped.miner.push(node);
                        else if (node.name.includes('bootnode')) grouped.bootnode.push(node);
                        else grouped.otros.push(node);
                    });
                    const renderNodes = (nodes: any[], tipo: string) => (
                        <div className="mb-6">
                            <h4 className="text-purple-300 font-bold text-lg mb-2 uppercase tracking-wide drop-shadow">{tipo}</h4>
                            <ul className="space-y-6">
                                {nodes.map((node: any) => {
                                    // Puertos únicos
                                    const uniquePorts = Array.from(new Set((node.ports || []).map((p: any) => p.PublicPort || p.PrivatePort))).filter(Boolean);
                                    let showPort = null;
                                    if (tipo === 'RPC' && node.ports && node.ports.length > 0) {
                                        const publicPortObj = node.ports.find((p: any) => p.IP && p.PublicPort);
                                        showPort = publicPortObj ? String(publicPortObj.PublicPort) : null;
                                    }
                                    let typeIconSvg;
                                    if (tipo === 'RPC') {
                                        typeIconSvg = (
                                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <rect x="3" y="7" width="18" height="10" rx="3" fill="#06b6d4" stroke="#0ea5e9" />
                                                <path d="M8 11h8M8 15h8" stroke="#fff" />
                                            </svg>
                                        );
                                    } else if (tipo === 'Miner') {
                                        typeIconSvg = (
                                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="8" fill="#a78bfa" stroke="#7c3aed" />
                                                <path d="M12 8v4l3 3" stroke="#fff" />
                                            </svg>
                                        );
                                    } else if (tipo === 'Bootnode') {
                                        typeIconSvg = (
                                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polygon points="12 2 22 8 22 16 12 22 2 16 2 8 12 2" fill="#f59e42" stroke="#ea580c" />
                                                <circle cx="12" cy="12" r="3" fill="#fff" />
                                            </svg>
                                        );
                                    } else {
                                        typeIconSvg = (
                                            <svg className="w-10 h-10" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <circle cx="12" cy="12" r="10" />
                                            </svg>
                                        );
                                    }
                                    return (
                                        <li key={node.id} className="bg-gray-900 rounded-2xl p-8 flex flex-col md:flex-row flex-wrap items-center gap-8 border border-gray-700 shadow-lg w-full hover:shadow-2xl transition-all overflow-x-auto">
                                            <div className="flex items-center gap-4 min-w-[180px] break-words w-full md:w-auto">
                                                <span className="inline-block w-12 h-12 bg-cyan-700 rounded-full flex items-center justify-center shadow-lg border-4 border-cyan-400/30">
                                                    {typeIconSvg}
                                                </span>
                                                <div className="min-w-0">
                                                    <span className="text-purple-200 font-extrabold text-xl md:text-2xl drop-shadow break-words">{node.name}</span>
                                                    <span className="block mt-1 text-xs font-mono bg-gray-800 text-cyan-300 px-2 py-1 rounded shadow break-all" title={node.id}>ID: {node.id}</span>
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-2 min-w-[100px] break-words w-full md:w-auto">
                                                <span className="text-gray-300 text-base">Tipo: <span className="font-semibold text-purple-300">{tipo}</span></span>
                                            </div>
                                            <div className="flex flex-row gap-6 items-center ml-auto flex-wrap w-full md:w-auto">
                                                <span className={`px-4 py-1 rounded-xl text-base font-bold shadow transition-all duration-200 ${node.status === 'running' ? 'bg-green-600/90 text-white' : 'bg-red-600/90 text-white'}`}>{node.status}</span>
                                                {showPort && (
                                                    <span className="text-cyan-300 text-base font-mono bg-gray-800 px-3 py-1 rounded-xl shadow border border-cyan-400/30 break-all">Puerto: {showPort}</span>
                                                )}
                                                <button className="ml-2 px-3 py-1 bg-red-500 hover:bg-red-400 text-white rounded-xl font-bold shadow transition-all duration-200" title="Eliminar nodo">
                                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                                </button>
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    );
                    return (
                        <li
                            key={net.name}
                            className="bg-gray-800/80 rounded-2xl shadow-xl p-8 mb-4 border border-gray-700 hover:border-cyan-400 transition-colors cursor-pointer group"
                            onClick={() => onSelect && onSelect(net)}
                        >
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-4 gap-4">
                                <span className="font-bold text-purple-300 text-2xl md:text-3xl drop-shadow">{net.name}</span>
                                <span className="ml-2 text-cyan-300 text-lg font-mono bg-gray-900 px-3 py-1 rounded-xl shadow">Chain ID: {net.chainId || 'N/A'}</span>
                            </div>
                            <div className="mt-2">
                                <h3 className="text-cyan-400 font-bold mb-4 text-xl">Nodos</h3>
                                {grouped.rpc.length > 0 && renderNodes(grouped.rpc, 'RPC')}
                                {grouped.miner.length > 0 && renderNodes(grouped.miner, 'Miner')}
                                {grouped.bootnode.length > 0 && renderNodes(grouped.bootnode, 'Bootnode')}
                                {grouped.otros.length > 0 && renderNodes(grouped.otros, 'Otros')}
                                {net.nodes.length === 0 && (
                                    <div className="text-gray-400 text-lg">No hay nodos Besu en esta red.</div>
                                )}
                            </div>
                        </li>
                    );
                })}
            </div>
        </div>
    );
}

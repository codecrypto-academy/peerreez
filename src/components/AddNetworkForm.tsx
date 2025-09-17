"use client";
import React, { useState, useEffect } from 'react';

interface AddNetworkFormProps {
    onNetworkAdded?: () => void;
}

export default function AddNetworkForm({ onNetworkAdded }: AddNetworkFormProps) {
    const [name, setName] = useState('');
    const [chainId, setChainId] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName: name, chainId }),
            });
            if (!res.ok) throw new Error('Error al añadir la red');
            setName('');
            setChainId('');
            if (onNetworkAdded) onNetworkAdded();
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Error desconocido');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-2xl mx-auto text-gray-100 mb-8 flex flex-col gap-8 animate-fade-in">
            <h2 className="text-3xl font-extrabold mb-6 text-cyan-400 tracking-tight text-center drop-shadow-lg">Añadir Red</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block mb-2 text-purple-300 text-lg font-semibold" htmlFor="network-name">Nombre de la red</label>
                    <input id="network-name" value={name} onChange={e => setName(e.target.value)} className="border border-gray-700 bg-gray-800 text-gray-100 rounded-xl p-4 w-full text-lg focus:outline-none focus:border-cyan-400 transition-colors font-mono placeholder:text-gray-500" required autoComplete="off" placeholder="Ej: besu-testnet" />
                </div>
                <div>
                    <label className="block mb-2 text-purple-300 text-lg font-semibold" htmlFor="chain-id">Chain ID</label>
                    <input id="chain-id" value={chainId} onChange={e => setChainId(e.target.value)} className="border border-gray-700 bg-gray-800 text-gray-100 rounded-xl p-4 w-full text-lg focus:outline-none focus:border-cyan-400 transition-colors font-mono placeholder:text-gray-500" required autoComplete="off" placeholder="Ej: 2025" />
                </div>
            </div>
            <button type="submit" disabled={loading} className="bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold px-10 py-4 rounded-2xl shadow-lg transition-all text-xl w-full md:w-auto mx-auto mt-4 focus:outline-none focus:ring-2 focus:ring-cyan-400">
                {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                        <svg className="animate-spin h-6 w-6 text-cyan-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        Añadiendo...
                    </span>
                ) : (
                    <span className="flex items-center gap-2 justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Añadir Red
                    </span>
                )}
            </button>
            {error && <div className="text-red-400 mt-6 text-center text-lg font-semibold">{error}</div>}
        </form>
    );
}

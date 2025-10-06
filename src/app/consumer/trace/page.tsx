'use client';

import { useState } from 'react';
import { useAssetQuery } from '../../../hooks/useFabric';

interface TraceData {
    asset: any;
    history: any[];
    rawMaterialsTrace: any[];
}

export default function TracePage() {
    const [assetId, setAssetId] = useState('');
    const [traceData, setTraceData] = useState<TraceData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { getSupplyChainTrace } = useAssetQuery();

    const handleTrace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) return;

        setLoading(true);
        setError(null);

        try {
            const result = await getSupplyChainTrace(assetId);
            if (result) {
                setTraceData(result as TraceData);
            } else {
                setError('Failed to get trace data');
            }
        } catch (err: any) {
            setError(err.message || 'Failed to trace asset');
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString();
    };

    const extractOrgFromIdentity = (identity: string) => {
        const match = identity.match(/CN=Admin@(\w+)\.supplychain\.com/);
        return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Unknown';
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <a href="/consumer" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </a>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Product Traceability</h1>
                            <p className="text-lg text-gray-600 mt-2">Trace the complete supply chain history of any product</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto">
                    {/* Search Form */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
                        <form onSubmit={handleTrace} className="flex gap-4">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={assetId}
                                    onChange={(e) => setAssetId(e.target.value)}
                                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                    placeholder="Enter Product ID (e.g., FLOUR_PROD_001)"
                                    required
                                />
                            </div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 font-semibold transition-all transform hover:scale-105 disabled:opacity-50"
                            >
                                {loading ? 'Tracing...' : '🔍 Trace Product'}
                            </button>
                        </form>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <p className="text-red-800">❌ {error}</p>
                        </div>
                    )}

                    {/* Trace Results */}
                    {traceData && (
                        <div className="space-y-6">
                            {/* Product Information */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        📦
                                    </div>
                                    Final Product Information
                                </h2>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <h3 className="font-semibold text-gray-700 mb-2">Product Details</h3>
                                        <p><strong>Name:</strong> {traceData.asset.name}</p>
                                        <p><strong>Type:</strong> {traceData.asset.type}</p>
                                        <p><strong>Category:</strong> {traceData.asset.category}</p>
                                        <p><strong>Status:</strong> <span className="text-green-600 font-semibold">{traceData.asset.status}</span></p>
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-gray-700 mb-2">Manufacturing</h3>
                                        <p><strong>Created:</strong> {formatTimestamp(traceData.asset.createdAt)}</p>
                                        <p><strong>Manufacturer:</strong> {extractOrgFromIdentity(traceData.asset.createdBy)}</p>
                                        {traceData.asset.transformationProcess && (
                                            <p><strong>Process:</strong> {traceData.asset.transformationProcess}</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Supply Chain Timeline */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        📊
                                    </div>
                                    Supply Chain Timeline
                                </h2>

                                <div className="space-y-4">
                                    {traceData.history.map((event: any, index: number) => (
                                        <div key={index} className="flex items-start space-x-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                                            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold">
                                                {index + 1}
                                            </div>
                                            <div className="flex-1">
                                                <h4 className="font-semibold text-gray-900">{event.action}</h4>
                                                <p className="text-gray-600">
                                                    <strong>Time:</strong> {formatTimestamp(event.timestamp)}
                                                </p>
                                                <p className="text-gray-600">
                                                    <strong>Actor:</strong> {extractOrgFromIdentity(event.actor)}
                                                </p>
                                                {event.previousOwner && event.newOwner && (
                                                    <p className="text-gray-600">
                                                        <strong>Transfer:</strong> {extractOrgFromIdentity(event.previousOwner)} → {extractOrgFromIdentity(event.newOwner)}
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Raw Materials Trace */}
                            {traceData.rawMaterialsTrace && traceData.rawMaterialsTrace.length > 0 && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                        <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                            🌾
                                        </div>
                                        Raw Materials History
                                    </h2>

                                    {traceData.rawMaterialsTrace.map((rawTrace: any, index: number) => (
                                        <div key={index} className="mb-6 last:mb-0">
                                            <h3 className="text-xl font-semibold text-gray-800 mb-4">
                                                {rawTrace.asset.name} (ID: {rawTrace.asset.id})
                                            </h3>
                                            
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                                                <div>
                                                    <p><strong>Origin:</strong> {rawTrace.asset.origin || 'N/A'}</p>
                                                    <p><strong>Category:</strong> {rawTrace.asset.category}</p>
                                                    <p><strong>Batch:</strong> {rawTrace.asset.batchNumber || 'N/A'}</p>
                                                </div>
                                                <div>
                                                    <p><strong>Certifications:</strong> {rawTrace.asset.certifications?.join(', ') || 'None'}</p>
                                                    <p><strong>Status:</strong> <span className="text-orange-600 font-semibold">{rawTrace.asset.status}</span></p>
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-gray-700">Timeline:</h4>
                                                {rawTrace.history.map((event: any, eventIndex: number) => (
                                                    <div key={eventIndex} className="flex items-center space-x-3 text-sm">
                                                        <div className="w-6 h-6 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs">
                                                            {eventIndex + 1}
                                                        </div>
                                                        <span><strong>{event.action}</strong> - {formatTimestamp(event.timestamp)} by {extractOrgFromIdentity(event.actor)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
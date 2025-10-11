'use client';

import { useState } from 'react';
import { useAssetHistory } from '../../../hooks/useGatewayAssets';
import Link from 'next/link';

type TraceEvent = {
    action?: string;
    timestamp?: string;
    actor?: string;
    previousOwner?: string;
    newOwner?: string;
    data?: Record<string, unknown>;
};

type MaterialPercentage = {
    materialId: string;
    quantity: number;
    percentage: string;
};

type RawTrace = {
    asset: {
        id?: string;
        name?: string;
        origin?: string;
        category?: string;
        quantity?: number;
        unit?: string;
        batchNumber?: string;
        status?: string;
        certifications?: string[];
    };
    history: TraceEvent[];
};

export default function TracePage() {
    const [assetId, setAssetId] = useState('');
    const [searchId, setSearchId] = useState('');

    const { data: traceData, isLoading: loading, error, refetch } = useAssetHistory(searchId);

    const handleTrace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) return;
        setSearchId(assetId);
    };

    // Helper functions
    const formatTimestamp = (timestamp: string) => {
        return new Date(timestamp).toLocaleString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('es-ES', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    const extractOrgFromIdentity = (identity: string) => {
        const match = identity.match(/CN=Admin@(\w+)\.supplychain\.com/);
        return match ? match[1].charAt(0).toUpperCase() + match[1].slice(1) : 'Unknown';
    };

    const isExpiringSoon = (expiryDate: string) => {
        if (!expiryDate) return false;
        const expiry = new Date(expiryDate);
        const today = new Date();
        const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
    };

    const isExpired = (expiryDate: string) => {
        if (!expiryDate) return false;
        return new Date(expiryDate) < new Date();
    };

    const getActionIcon = (action: string) => {
        switch (action) {
            case 'CREATE':
                return '✨';
            case 'TRANSFER':
                return '🚚';
            case 'TRANSFORM':
                return '⚙️';
            case 'UPDATE':
                return '📝';
            case 'DELETE':
                return '🗑️';
            default:
                return '📦';
        }
    };

    const getActionColor = (action: string) => {
        switch (action) {
            case 'CREATE':
                return 'from-green-50 to-emerald-50 border-green-200';
            case 'TRANSFER':
                return 'from-blue-50 to-cyan-50 border-blue-200';
            case 'TRANSFORM':
                return 'from-purple-50 to-indigo-50 border-purple-200';
            case 'UPDATE':
                return 'from-yellow-50 to-amber-50 border-yellow-200';
            case 'DELETE':
                return 'from-red-50 to-pink-50 border-red-200';
            default:
                return 'from-gray-50 to-slate-50 border-gray-200';
        }
    };

    const calculateSupplyChainMetrics = (history: TraceEvent[]) => {
        if (!history || history.length === 0) return null;

        const firstEvent = new Date(history[0].timestamp);
        const lastEvent = new Date(history[history.length - 1].timestamp);
        const totalDays = Math.floor((lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24));

        const organizations = new Set<string>();
        history.forEach(event => {
            if (event.actor && typeof event.actor === 'string') organizations.add(extractOrgFromIdentity(event.actor));
            if (event.previousOwner && typeof event.previousOwner === 'string') organizations.add(extractOrgFromIdentity(event.previousOwner));
            if (event.newOwner && typeof event.newOwner === 'string') organizations.add(extractOrgFromIdentity(event.newOwner));
        });

        const transfers = history.filter(e => e.action === 'TRANSFER' || e.action === 'CREATE').length;

        return {
            totalDays,
            totalOrganizations: organizations.size,
            totalTransfers: transfers,
            totalEvents: history.length
        };
    };

    const calculateRawMaterialPercentages = (rawMaterialsUsed: Record<string, number> | undefined, totalQuantity: number) => {
        if (!rawMaterialsUsed) return [];

        return Object.entries(rawMaterialsUsed).map(([materialId, quantity]) => ({
            materialId,
            quantity: Number(quantity),
            percentage: ((Number(quantity) / totalQuantity) * 100).toFixed(1)
        }));
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <Link href="/consumer" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </Link>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Product Traceability</h1>
                            <p className="text-lg text-gray-600 mt-2">Complete supply chain transparency from farm to table</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto">
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
                                className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-xl hover:from-cyan-600 hover:to-blue-600 font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Tracing...' : '🔍 Trace Product'}
                            </button>
                        </form>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                            <p className="text-red-800">❌ {error instanceof Error ? error.message : 'Failed to trace asset'}</p>
                        </div>
                    )}

                    {/* Trace Results */}
                    {traceData && (
                        <div className="space-y-6">
                            {/* Supply Chain Metrics */}
                            {(() => {
                                const metrics = calculateSupplyChainMetrics(traceData.history);
                                return metrics ? (
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                        <div className="bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg p-6 text-white">
                                            <div className="text-3xl font-bold mb-2">{metrics.totalDays}</div>
                                            <div className="text-blue-100">Days in Supply Chain</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl shadow-lg p-6 text-white">
                                            <div className="text-3xl font-bold mb-2">{metrics.totalOrganizations}</div>
                                            <div className="text-green-100">Organizations</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-2xl shadow-lg p-6 text-white">
                                            <div className="text-3xl font-bold mb-2">{metrics.totalTransfers}</div>
                                            <div className="text-purple-100">Transfers</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-orange-500 to-amber-500 rounded-2xl shadow-lg p-6 text-white">
                                            <div className="text-3xl font-bold mb-2">{metrics.totalEvents}</div>
                                            <div className="text-orange-100">Total Events</div>
                                        </div>
                                    </div>
                                ) : null;
                            })()}

                            {/* Product Information */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center mr-3">
                                        📦
                                    </div>
                                    Product Information
                                </h2>

                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column */}
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4">
                                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                                                <span className="text-xl mr-2">📋</span>
                                                Basic Details
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Product ID:</strong> <span className="font-mono text-blue-600">{traceData.asset.id}</span></p>
                                                <p><strong>Name:</strong> {traceData.asset.name}</p>
                                                <p><strong>Type:</strong> <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{traceData.asset.type}</span></p>
                                                <p><strong>Category:</strong> <span className="px-2 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-semibold">{traceData.asset.category}</span></p>
                                                <p><strong>Status:</strong> <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">{traceData.asset.status}</span></p>
                                                {traceData.asset.description && (
                                                    <p><strong>Description:</strong> {traceData.asset.description}</p>
                                                )}
                                            </div>
                                        </div>

                                        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-4">
                                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                                                <span className="text-xl mr-2">📊</span>
                                                Quantity & Location
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Quantity:</strong> <span className="text-2xl font-bold text-purple-600">{traceData.asset.quantity}</span> {traceData.asset.unit || 'units'}</p>
                                                {traceData.asset.origin && (
                                                    <p><strong>Origin:</strong> {traceData.asset.origin}</p>
                                                )}
                                                {traceData.asset.location && (
                                                    <p><strong>Current Location:</strong> {traceData.asset.location}</p>
                                                )}
                                                {traceData.asset.batchNumber && (
                                                    <p><strong>Batch Number:</strong> <span className="font-mono">{traceData.asset.batchNumber}</span></p>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Right Column */}
                                    <div className="space-y-4">
                                        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4">
                                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                                                <span className="text-xl mr-2">🏭</span>
                                                Manufacturing Details
                                            </h3>
                                            <div className="space-y-2 text-sm">
                                                <p><strong>Created:</strong> {formatTimestamp(traceData.asset.createdAt)}</p>
                                                <p><strong>Manufacturer:</strong> <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">{extractOrgFromIdentity(traceData.asset.createdBy)}</span></p>
                                                <p><strong>Current Owner:</strong> <span className="px-2 py-1 bg-emerald-100 text-emerald-800 rounded-full text-xs font-semibold">{extractOrgFromIdentity(traceData.asset.currentOwner)}</span></p>
                                                {traceData.asset.transformationProcess && (
                                                    <p><strong>Process:</strong> {traceData.asset.transformationProcess}</p>
                                                )}
                                                <p><strong>Last Updated:</strong> {formatTimestamp(traceData.asset.updatedAt)}</p>
                                            </div>
                                        </div>

                                        {/* Certifications & Quality */}
                                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4">
                                            <h3 className="font-semibold text-gray-700 mb-3 flex items-center">
                                                <span className="text-xl mr-2">��</span>
                                                Certifications & Quality
                                            </h3>
                                            <div className="space-y-3 text-sm">
                                                {traceData.asset.certifications && traceData.asset.certifications.length > 0 ? (
                                                    <div>
                                                        <strong>Certifications:</strong>
                                                        <div className="flex flex-wrap gap-2 mt-2">
                                                            {(traceData.asset.certifications as string[]).map((cert: string, idx: number) => (
                                                                <span key={idx} className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold flex items-center">
                                                                    ✓ {cert}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ) : (
                                                    <p className="text-gray-500">No certifications available</p>
                                                )}

                                                {traceData.asset.expiryDate && (
                                                    <div className="mt-3">
                                                        <strong>Expiry Date:</strong>
                                                        <div className={`mt-1 px-3 py-2 rounded-lg font-semibold ${isExpired(traceData.asset.expiryDate)
                                                                ? 'bg-red-100 text-red-800'
                                                                : isExpiringSoon(traceData.asset.expiryDate)
                                                                    ? 'bg-yellow-100 text-yellow-800'
                                                                    : 'bg-green-100 text-green-800'
                                                            }`}>
                                                            {isExpired(traceData.asset.expiryDate) && '⚠️ EXPIRED: '}
                                                            {isExpiringSoon(traceData.asset.expiryDate) && !isExpired(traceData.asset.expiryDate) && '⏰ EXPIRING SOON: '}
                                                            {!isExpired(traceData.asset.expiryDate) && !isExpiringSoon(traceData.asset.expiryDate) && '✓ FRESH: '}
                                                            {formatDate(traceData.asset.expiryDate)}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Raw Materials Composition */}
                            {traceData.asset.rawMaterialsUsed && Object.keys(traceData.asset.rawMaterialsUsed).length > 0 && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center mr-3">
                                            🧪
                                        </div>
                                        Raw Materials Composition
                                    </h2>

                                    <div className="space-y-4">
                                        {calculateRawMaterialPercentages(traceData.asset.rawMaterialsUsed, traceData.asset.quantity).map((material: MaterialPercentage, idx: number) => (
                                            <div key={idx} className="bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4">
                                                <div className="flex justify-between items-center mb-2">
                                                    <span className="font-semibold text-gray-800">{material.materialId}</span>
                                                    <span className="text-sm font-bold text-orange-600">{material.percentage}%</span>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
                                                    <div
                                                        className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full transition-all duration-500"
                                                        style={{ width: `${material.percentage}%` }}
                                                    ></div>
                                                </div>
                                                <div className="mt-2 text-sm text-gray-600">
                                                    Quantity used: <strong>{material.quantity}</strong> {traceData.asset.unit || 'units'}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Supply Chain Timeline */}
                            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center mr-3">
                                        📊
                                    </div>
                                    Supply Chain Timeline
                                </h2>

                                <div className="space-y-4">
                                    {traceData.history.map((event: TraceEvent, index: number) => (
                                        <div key={index} className={`flex items-start space-x-4 p-5 bg-gradient-to-r ${getActionColor(event.action || '')} border rounded-xl transition-all hover:shadow-md`}>
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center font-bold text-xl shadow-md flex-shrink-0">
                                                {getActionIcon(event.action)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="font-bold text-gray-900 text-lg">{event.action}</h4>
                                                    <span className="px-2 py-1 bg-white/50 rounded-full text-xs font-semibold text-gray-700">
                                                        #{index + 1}
                                                    </span>
                                                </div>

                                                <div className="space-y-1 text-sm">
                                                    <p className="text-gray-700">
                                                        <strong>⏰ Time:</strong> {event.timestamp ? formatTimestamp(event.timestamp) : 'Unknown'}</p>
                                                    <p className="text-gray-700">
                                                        <strong>👤 Actor:</strong> <span className="px-2 py-0.5 bg-white/50 rounded text-xs font-semibold">{event.actor ? extractOrgFromIdentity(String(event.actor)) : 'Unknown'}</span>
                                                    </p>

                                                    {event.previousOwner && event.newOwner && (
                                                        <p className="text-gray-700">
                                                            <strong>🔄 Transfer:</strong>
                                                            <span className="px-2 py-0.5 bg-blue-100 rounded text-xs font-semibold ml-1">{extractOrgFromIdentity(event.previousOwner)}</span>
                                                            <span className="mx-1">→</span>
                                                            <span className="px-2 py-0.5 bg-green-100 rounded text-xs font-semibold">{extractOrgFromIdentity(event.newOwner)}</span>
                                                        </p>
                                                    )}

                                                    {event.data && typeof event.data === 'object' && (
                                                        <div className="mt-2 p-3 bg-white/50 rounded-lg">
                                                            <strong className="text-gray-700">📝 Additional Details:</strong>
                                                            <div className="mt-1 space-y-1">
                                                                {typeof event.data.location === 'string' && <p className="text-gray-600">📍 Location: {event.data.location}</p>}
                                                                {typeof event.data.transportMethod === 'string' && <p className="text-gray-600">🚛 Transport: {event.data.transportMethod}</p>}
                                                                {typeof event.data.temperature !== 'undefined' && <p className="text-gray-600">🌡️ Temperature: {String(event.data.temperature)}°C</p>}
                                                                {typeof event.data.notes === 'string' && <p className="text-gray-600">💬 Notes: {event.data.notes}</p>}
                                                                {typeof event.data.quantityTransferred !== 'undefined' && <p className="text-gray-600">📦 Quantity: {String(event.data.quantityTransferred)}</p>}
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Raw Materials Trace */}
                            {traceData.rawMaterialsTrace && traceData.rawMaterialsTrace.length > 0 && (
                                <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                                        <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center mr-3">
                                            🌾
                                        </div>
                                        Raw Materials History
                                    </h2>

                                    {(traceData.rawMaterialsTrace as RawTrace[]).map((rawTrace: RawTrace, index: number) => (
                                        <div key={index} className="mb-6 last:mb-0 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
                                            <h3 className="text-xl font-bold text-gray-800 mb-4 flex items-center">
                                                <span className="mr-2">🌱</span>
                                                {rawTrace.asset.name}
                                                <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">
                                                    ID: {rawTrace.asset.id}
                                                </span>
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div className="bg-white/50 rounded-lg p-3">
                                                    <p className="text-sm"><strong>Origin:</strong> {rawTrace.asset.origin || 'N/A'}</p>
                                                    <p className="text-sm"><strong>Category:</strong> {rawTrace.asset.category}</p>
                                                </div>
                                                <div className="bg-white/50 rounded-lg p-3">
                                                    <p className="text-sm"><strong>Quantity:</strong> {rawTrace.asset.quantity} {rawTrace.asset.unit || 'units'}</p>
                                                    <p className="text-sm"><strong>Batch:</strong> {rawTrace.asset.batchNumber || 'N/A'}</p>
                                                </div>
                                                <div className="bg-white/50 rounded-lg p-3">
                                                    <p className="text-sm"><strong>Status:</strong> <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">{rawTrace.asset.status}</span></p>
                                                    {rawTrace.asset.certifications && rawTrace.asset.certifications.length > 0 && (
                                                        <p className="text-sm"><strong>Certs:</strong> {rawTrace.asset.certifications.join(', ')}</p>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-gray-700 flex items-center">
                                                    <span className="mr-2">📅</span>
                                                    Timeline:
                                                </h4>
                                                {rawTrace.history.map((event: TraceEvent, eventIndex: number) => (
                                                    <div key={eventIndex} className="flex items-center space-x-3 text-sm bg-white/50 rounded-lg p-3">
                                                        <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {eventIndex + 1}
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="font-semibold">{getActionIcon(event.action)} {event.action}</span>
                                                            <span className="text-gray-600"> - {formatTimestamp(event.timestamp)}</span>
                                                            <span className="text-gray-600"> by <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-semibold">{extractOrgFromIdentity(event.actor)}</span></span>
                                                        </div>
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

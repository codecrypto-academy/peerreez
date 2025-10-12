'use client';

import { useState, useEffect } from 'react';
import { useAssetHistory } from '../../../hooks/useGatewayAssets';
import Link from 'next/link';
import TimelineItem from '../../../components/transfers/TimelineItem';
import { extractOrgFromIdentity } from '../../../lib/traceHelpers';

type TraceEvent = {
    action?: string;
    timestamp?: string;
    txId?: string;
    txTimestamp?: string;
    actor?: string;
    submittedBy?: string;
    previousOwner?: string;
    newOwner?: string;
    data?: Record<string, unknown>;
    // optional origin marker added by UI merging: 'raw' | 'parent' | 'asset'
    origin?: 'raw' | 'parent' | 'asset';
};

type MaterialPercentage = {
    materialId: string;
    quantity: number;
    percentageOfInputs?: string;
    percentageOfFinal?: string;
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
    const [parentTraces, setParentTraces] = useState<any[]>([]);
    const [collapsedParents, setCollapsedParents] = useState<Record<string, boolean>>({});

    const { data: traceData, isLoading: loading, error, refetch } = useAssetHistory(searchId);

    // Prepare a merged history (chronological) that includes:
    //  - raw materials histories (producer events)
    //  - any fetched parent/ancestor histories (splits)
    //  - the current asset's own history
    const getMergedHistory = () => {
        const events: TraceEvent[] = [];

        // raw materials histories (producer -> factory)
        if (traceData && Array.isArray(traceData.rawMaterialsTrace)) {
            for (const r of traceData.rawMaterialsTrace) {
                if (Array.isArray((r as any).history)) {
                    for (const ev of (r as any).history as TraceEvent[]) {
                        events.push({ ...ev, origin: 'raw' });
                    }
                }
            }
        }

        // parent traces fetched by ancestor search
        if (Array.isArray(parentTraces) && parentTraces.length > 0) {
            for (const pt of parentTraces) {
                if (Array.isArray(pt.history)) {
                    for (const ev of pt.history as TraceEvent[]) events.push({ ...ev, origin: 'parent' });
                }
            }
        }

        // the current asset history
        if (traceData && Array.isArray(traceData.history)) {
            for (const ev of traceData.history as TraceEvent[]) events.push({ ...ev, origin: 'asset' });
        }

        // sort chronologically using txTimestamp if present
        return events.sort((a: TraceEvent, b: TraceEvent) => {
            const ta = new Date(String(a.txTimestamp || a.timestamp || 0)).getTime();
            const tb = new Date(String(b.txTimestamp || b.timestamp || 0)).getTime();
            return ta - tb;
        });
    };

    // When we receive traceData, detect parent IDs (split origin or originalProductId)
    // and fetch their traces recursively up to a depth limit, avoiding cycles.
    useEffect(() => {
        let mounted = true;
        const MAX_DEPTH = 6;

        const findParentIds = (data: any) => {
            const parents = new Set<string>();
            if (!data) return parents;

            const origin: string | undefined = data.asset?.origin;
            if (origin && typeof origin === 'string') {
                const m = origin.match(/Split from\s+([\w-]+)/i);
                if (m && m[1]) parents.add(m[1]);
            }

            if (Array.isArray(data.history)) {
                for (const h of data.history) {
                    try {
                        const d: any = h.data || {};
                        if (d.originalProductId && typeof d.originalProductId === 'string') {
                            parents.add(d.originalProductId);
                        }
                    } catch (err) {
                        // ignore
                    }
                }
            }

            return parents;
        };

        async function fetchAncestors() {
            setParentTraces([]);
            if (!traceData || !traceData.asset) return;

            const results: any[] = [];
            const visited = new Set<string>();
            const queue: Array<{ id: string; depth: number }> = [];

            // seed initial parents
            const initial = findParentIds(traceData);
            for (const id of initial) queue.push({ id, depth: 1 });

            while (queue.length > 0) {
                const { id, depth } = queue.shift()!;
                if (!id || visited.has(id)) continue;
                visited.add(id);

                try {
                    const res = await fetch(`/api/fabric/gateway?operation=getTrace&role=Consumer&assetId=${encodeURIComponent(id)}`);
                    const json = await res.json();
                    if (json && json.success && json.data) {
                        results.push(json.data);

                        if (depth < MAX_DEPTH) {
                            const more = findParentIds(json.data);
                            for (const mid of more) {
                                if (!visited.has(mid)) queue.push({ id: mid, depth: depth + 1 });
                            }
                        }
                    }
                } catch (err) {
                    // ignore per-node errors
                }

                if (!mounted) break;
            }

            if (mounted) setParentTraces(results);
        }

        fetchAncestors();
        return () => { mounted = false; };
    }, [traceData]);

    const handleTrace = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!assetId) return;
        setSearchId(assetId);
    };

    const toggleParentCollapse = (id: string) => {
        setCollapsedParents(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const detectProducerFromTrace = (pt: any) => {
        try {
            if (!pt) return null;

            // 1) Look through history for the earliest event that has a submittedBy/actor
            if (Array.isArray(pt.history) && pt.history.length > 0) {
                const sorted = [...pt.history].sort((a: TraceEvent, b: TraceEvent) => {
                    const ta = new Date(String(a.txTimestamp || a.timestamp || 0)).getTime();
                    const tb = new Date(String(b.txTimestamp || b.timestamp || 0)).getTime();
                    return ta - tb;
                });

                for (const ev of sorted) {
                    const actor = ev.submittedBy || ev.actor || ev.previousOwner || ev.newOwner;
                    if (actor && typeof actor === 'string') return extractOrgFromIdentity(actor);
                }
            }

            // 2) If not found, inspect rawMaterialsTrace for producer identities
            if (Array.isArray(pt.rawMaterialsTrace) && pt.rawMaterialsTrace.length > 0) {
                const producers = new Set<string>();
                for (const r of pt.rawMaterialsTrace) {
                    if (r?.asset?.createdBy) producers.add(extractOrgFromIdentity(r.asset.createdBy));
                    // also check first history entry of the raw material
                    if (Array.isArray(r.history) && r.history.length > 0) {
                        const sortedRaw = [...r.history].sort((a: TraceEvent, b: TraceEvent) => {
                            const ta = new Date(String(a.txTimestamp || a.timestamp || 0)).getTime();
                            const tb = new Date(String(b.txTimestamp || b.timestamp || 0)).getTime();
                            return ta - tb;
                        });
                        const firstRaw = sortedRaw[0];
                        const actor = firstRaw.submittedBy || firstRaw.actor || firstRaw.previousOwner || firstRaw.newOwner;
                        if (actor && typeof actor === 'string') producers.add(extractOrgFromIdentity(actor));
                    }
                }

                if (producers.size > 0) return Array.from(producers).join(', ');
            }
        } catch (err) {
            // ignore
        }

        // fallback to asset.createdBy
        if (pt?.asset?.createdBy) return extractOrgFromIdentity(pt.asset.createdBy);
        return null;
    };

    const getOrgChain = (pt: any) => {
        try {
            if (!pt) return null;
            const orgs: string[] = [];

            // 1) Collect producers from rawMaterialsTrace first (so they appear at the start)
            if (Array.isArray(pt.rawMaterialsTrace) && pt.rawMaterialsTrace.length > 0) {
                for (const r of pt.rawMaterialsTrace) {
                    if (r?.asset?.createdBy) {
                        const org = extractOrgFromIdentity(r.asset.createdBy);
                        if (org && !orgs.includes(org)) orgs.push(org);
                    } else if (Array.isArray(r.history) && r.history.length > 0) {
                        const sortedRaw = [...r.history].sort((a: TraceEvent, b: TraceEvent) => {
                            const ta = new Date(String(a.txTimestamp || a.timestamp || 0)).getTime();
                            const tb = new Date(String(b.txTimestamp || b.timestamp || 0)).getTime();
                            return ta - tb;
                        });
                        const firstRaw = sortedRaw[0];
                        const actor = firstRaw.submittedBy || firstRaw.actor || firstRaw.previousOwner || firstRaw.newOwner;
                        if (actor && typeof actor === 'string') {
                            const org = extractOrgFromIdentity(actor);
                            if (org && !orgs.includes(org)) orgs.push(org);
                        }
                    }
                }
            }

            // 2) Add asset.createdBy (e.g., Factory) if present and not already included
            if (pt?.asset?.createdBy) {
                const org = extractOrgFromIdentity(pt.asset.createdBy);
                if (org && !orgs.includes(org)) orgs.push(org);
            }

            // 3) Append organizations found in the parent history (chronological)
            if (Array.isArray(pt.history) && pt.history.length > 0) {
                const sorted = [...pt.history].sort((a: TraceEvent, b: TraceEvent) => {
                    const ta = new Date(String(a.txTimestamp || a.timestamp || 0)).getTime();
                    const tb = new Date(String(b.txTimestamp || b.timestamp || 0)).getTime();
                    return ta - tb;
                });

                for (const ev of sorted) {
                    const actor = ev.submittedBy || ev.actor || ev.previousOwner || ev.newOwner;
                    if (actor && typeof actor === 'string') {
                        const org = extractOrgFromIdentity(actor);
                        if (org && !orgs.includes(org)) orgs.push(org);
                    }
                }
            }

            return orgs.length > 0 ? orgs : null;
        } catch (err) {
            return null;
        }
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

    // use helper from lib/traceHelpers — more robust parsing

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
        // Use txTimestamp if present, otherwise fallback to timestamp
        const firstEvent = new Date(history[0].txTimestamp || history[0].timestamp || Date.now());
        const lastEvent = new Date(history[history.length - 1].txTimestamp || history[history.length - 1].timestamp || Date.now());
        const totalDays = Math.floor((lastEvent.getTime() - firstEvent.getTime()) / (1000 * 60 * 60 * 24));

        const organizations = new Set<string>();
        history.forEach(event => {
            // prefer submittedBy when available
            const actorId = event.submittedBy || event.actor || '';
            if (actorId && typeof actorId === 'string') organizations.add(extractOrgFromIdentity(actorId));
            if (event.previousOwner && typeof event.previousOwner === 'string') organizations.add(extractOrgFromIdentity(event.previousOwner));
            if (event.newOwner && typeof event.newOwner === 'string') organizations.add(extractOrgFromIdentity(event.newOwner));
        });

        // Count transfers as TRANSFER actions and also CREATE entries that represent consumer receives (previousOwner !== newOwner)
        const transfers = history.filter(e => e.action === 'TRANSFER' || e.action === 'ACCEPT_TRANSFER' || (e.action === 'CREATE' && e.previousOwner && e.previousOwner !== e.newOwner)).length;

        return {
            totalDays,
            totalOrganizations: organizations.size,
            totalTransfers: transfers,
            totalEvents: history.length
        };
    };

    const calculateRawMaterialPercentages = (rawMaterialsUsed: Record<string, number> | undefined, finalProductQuantity: number) => {
        if (!rawMaterialsUsed) return [];
        // Sum of all raw materials used (absolute)
        const sumInputs = Object.values(rawMaterialsUsed).reduce((s, v) => s + (Number(v) || 0), 0);
        const finalQty = Number(finalProductQuantity) || 0;

        return Object.entries(rawMaterialsUsed).map(([materialId, quantity]) => {
            const q = Number(quantity) || 0;
            const pctOfInputs = sumInputs > 0 ? ((q / sumInputs) * 100) : 0; // percent of total inputs (sums to ~100%)
            const pctOfFinal = finalQty > 0 ? ((q / finalQty) * 100) : 0; // percent relative to final product
            return {
                materialId,
                quantity: q,
                percentageOfInputs: pctOfInputs.toFixed(1),
                percentageOfFinal: pctOfFinal.toFixed(1)
            };
        });
    };

    // merged history used by metrics and timeline
    const mergedHistory = getMergedHistory();

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 text-black">
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
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8 text-black">
                        <form onSubmit={handleTrace} className="flex gap-4 text-black">
                            <div className="flex-1">
                                <input
                                    type="text"
                                    value={assetId}
                                    onChange={(e) => setAssetId(e.target.value)}
                                    className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
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
                                const metrics = calculateSupplyChainMetrics(mergedHistory);
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

                            {/* Product Information - new, cleaner hero card */}
                            <div className="bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl border border-white/30 p-6 md:p-8">
                                <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
                                    <div className="w-full md:w-1/3 bg-gradient-to-br from-white to-slate-50 rounded-2xl p-4 flex items-center justify-center">
                                        <div className="w-36 h-36 bg-gradient-to-br from-cyan-100 to-blue-100 rounded-2xl flex items-center justify-center text-4xl font-bold text-blue-700">📦</div>
                                    </div>

                                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50 to-cyan-50">
                                            <h3 className="text-lg font-semibold mb-3">{traceData.asset.name} <span className="text-sm text-gray-500 ml-2">ID: <span className="font-mono">{traceData.asset.id}</span></span></h3>
                                            <p className="text-sm text-gray-700 mb-2">{traceData.asset.description || 'No description provided.'}</p>
                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">{traceData.asset.type}</span>
                                                <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-xs font-semibold">{traceData.asset.category}</span>
                                                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">{traceData.asset.status}</span>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-emerald-50">
                                            <h4 className="text-sm text-gray-600">Quantity</h4>
                                            <div className="flex items-baseline gap-3">
                                                <div className="text-3xl font-bold text-purple-700">{traceData.asset.quantity}</div>
                                                <div className="text-sm text-gray-500">{traceData.asset.unit || 'units'}</div>
                                            </div>
                                            <div className="mt-3 text-sm text-gray-600">
                                                {traceData.asset.origin && <div><strong>Origin:</strong> {traceData.asset.origin}</div>}
                                                {traceData.asset.location && <div><strong>Location:</strong> {traceData.asset.location}</div>}
                                                {traceData.asset.batchNumber && <div><strong>Batch:</strong> <span className="font-mono">{traceData.asset.batchNumber}</span></div>}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
                                        <div className="text-xs">Manufacturer</div>
                                        <div className="font-bold mt-1">{extractOrgFromIdentity(traceData.asset.createdBy)}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gradient-to-r from-emerald-500 to-green-500 text-white">
                                        <div className="text-xs">Current Owner</div>
                                        <div className="font-bold mt-1">{extractOrgFromIdentity(traceData.asset.currentOwner)}</div>
                                    </div>
                                    <div className="p-3 rounded-xl bg-gradient-to-r from-yellow-400 to-amber-400 text-white">
                                        <div className="text-xs">Last Updated</div>
                                        <div className="font-bold mt-1">{formatTimestamp(traceData.asset.updatedAt)}</div>
                                    </div>
                                </div>
                            </div>

                            {/* Raw Materials Composition - improved cards */}
                            {traceData.asset.rawMaterialsUsed && Object.keys(traceData.asset.rawMaterialsUsed).length > 0 && (
                                <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/20">
                                    <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">🧪</div>
                                        Raw Materials
                                    </h2>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        {calculateRawMaterialPercentages(traceData.asset.rawMaterialsUsed, traceData.asset.quantity).map((material: MaterialPercentage, idx: number) => (
                                            <div key={idx} className="p-4 rounded-2xl bg-gradient-to-br from-white to-orange-50 border border-orange-100">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <div className="text-sm font-semibold text-gray-800">{material.materialId}</div>
                                                        <div className="text-xs text-gray-500">Qty: <strong>{material.quantity}</strong> {traceData.asset.unit || 'units'}</div>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-lg font-bold text-orange-600">{material.percentageOfInputs}%</div>
                                                        <div className="text-xs text-gray-500">of inputs</div>
                                                    </div>
                                                </div>
                                                <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden mt-3">
                                                    <div className="bg-gradient-to-r from-orange-500 to-amber-500 h-3 rounded-full" style={{ width: `${material.percentageOfInputs}%` }} />
                                                </div>
                                                <div className="mt-2 text-xs text-gray-500">{material.percentageOfFinal}% of final product</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Supply Chain Timeline */}
                            {/* Supply Chain Timeline - vertical */}
                            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-6 shadow-lg border border-white/20">
                                <h2 className="text-2xl font-bold text-gray-900 mb-4 flex items-center gap-3">
                                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">📊</div>
                                    Supply Chain Timeline
                                </h2>

                                <div className="relative pl-8">
                                    {/* vertical line */}
                                    <div className="absolute left-4 top-6 bottom-6 w-0.5 bg-gray-200" />

                                    <div className="space-y-6">
                                        {mergedHistory.map((event: TraceEvent, index: number) => (
                                            <TimelineItem key={index} event={event} index={index} total={mergedHistory.length} />
                                        ))}
                                    </div>
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
                                                {([...rawTrace.history].sort((a: TraceEvent, b: TraceEvent) => {
                                                    const ta = new Date(String(a.txTimestamp || a.timestamp || 0)).getTime();
                                                    const tb = new Date(String(b.txTimestamp || b.timestamp || 0)).getTime();
                                                    return ta - tb;
                                                })).map((event: TraceEvent, eventIndex: number) => (
                                                    <div key={eventIndex} className="flex items-center space-x-3 text-sm bg-white/50 rounded-lg p-3">
                                                        <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                                                            {eventIndex + 1}
                                                        </div>
                                                        <div className="flex-1">
                                                            <span className="font-semibold">{getActionIcon(event.action)} {event.action}</span>
                                                            <span className="text-gray-600"> - {formatTimestamp(event.txTimestamp || event.timestamp || '')}</span>
                                                            <span className="text-gray-600"> by <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded text-xs font-semibold">{extractOrgFromIdentity(event.submittedBy || event.actor || '')}</span></span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Ancestor UI removed per request */}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

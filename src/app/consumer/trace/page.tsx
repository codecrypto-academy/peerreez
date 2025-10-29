'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useAssetHistory } from '../../../hooks/useGatewayAssets';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
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
        type?: string;
        description?: string;
        origin?: string;
        category?: string;
        quantity?: number;
        unit?: string;
        batchNumber?: string;
        status?: string;
        certifications?: string[];
        createdBy?: string;
        currentOwner?: string;
        updatedAt?: string;
        location?: string;
    };
    history: TraceEvent[];
};

type TraceData = {
    asset: {
        type?: string;
        id?: string;
        name?: string;
        description?: string;
        origin?: string;
        category?: string;
        quantity?: number;
        unit?: string;
        batchNumber?: string;
        status?: string;
        certifications?: string[];
        createdBy?: string;
        currentOwner?: string;
        updatedAt?: string;
        location?: string;
        rawMaterialsUsed?: Record<string, number>;
    };
    history?: TraceEvent[];
    rawMaterialsTrace?: RawTrace[];
};

export default function TracePage() {
    const [assetId, setAssetId] = useState('');
    const [searchId, setSearchId] = useState('');
    const [parentTraces, setParentTraces] = useState<TraceData[]>([]);

    // Use the hook and coerce result data to TraceData when present
    const { data: rawTraceData, isLoading: loading, error } = useAssetHistory(searchId) as {
        data?: unknown;
        isLoading: boolean;
        error?: unknown;
    };
    const traceData = rawTraceData as TraceData | undefined;

    // Identity details fetched from server for display (username, role, org, address, cn, fingerprint)
    type IdentityDetail = {
        selector: string;
        username?: string;
        role?: string;
        org?: string;
        fingerprint?: string;
        address?: string;
        cn?: string;
    };

    const [identityDetails, setIdentityDetails] = useState<Record<string, IdentityDetail>>({});
    const router = useRouter();
    const searchParams = useSearchParams();

    // If the page is loaded with ?assetId=..., trigger the trace automatically
    useEffect(() => {
        try {
            const urlId = searchParams?.get?.('assetId');
            if (urlId && urlId !== '') {
                setAssetId(urlId);
                setSearchId(urlId);
            }
        } catch {
            // ignore
        }
        // we intentionally only want to run when searchParams changes
    }, [searchParams]);

    // Robust timestamp parser: returns epoch ms or 0 for invalid values
    const parseTimestampSafe = (t?: string | number) => {
        try {
            const s = t === undefined || t === null ? '' : String(t);
            const v = Date.parse(s);
            return Number.isNaN(v) ? 0 : v;
        } catch {
            return 0;
        }
    };

    // Prepare a merged history (chronological) that includes:
    //  - raw materials histories (producer events)
    //  - any fetched parent/ancestor histories (splits)
    //  - the current asset's own history
    const getMergedHistory = useCallback(() => {
        const events: TraceEvent[] = [];

        // raw materials histories (producer -> factory)
        if (traceData && Array.isArray(traceData.rawMaterialsTrace)) {
            for (const r of traceData.rawMaterialsTrace) {
                if (Array.isArray(r.history)) {
                    for (const ev of r.history as TraceEvent[]) {
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

        // sort chronologically using txTimestamp if present (safe parse)
        return events.sort((a: TraceEvent, b: TraceEvent) => {
            const ta = parseTimestampSafe(a.txTimestamp || a.timestamp);
            const tb = parseTimestampSafe(b.txTimestamp || b.timestamp);
            return ta - tb;
        });
    }, [traceData, parentTraces]);

    const mergedHistory = useMemo(() => getMergedHistory(), [getMergedHistory]);

    // Extract unique identity selectors from trace data and fetch details
    // Extract unique identity selectors from trace data and fetch details (bulk)
    useEffect(() => {
        if (!traceData) return;

        const ids = new Set<string>();
        // asset owners
        if (traceData.asset?.createdBy) ids.add(String(traceData.asset.createdBy));
        if (traceData.asset?.currentOwner) ids.add(String(traceData.asset.currentOwner));

        // raw materials owners and their events
        if (Array.isArray(traceData.rawMaterialsTrace)) {
            for (const rt of traceData.rawMaterialsTrace) {
                if (rt.asset?.createdBy) ids.add(String(rt.asset.createdBy));
                if (rt.asset?.currentOwner) ids.add(String(rt.asset.currentOwner));
                if (Array.isArray(rt.history)) {
                    for (const ev of rt.history as TraceEvent[]) {
                        if (ev.submittedBy) ids.add(String(ev.submittedBy));
                        if (ev.actor) ids.add(String(ev.actor));
                    }
                }
            }
        }

        // merged history actors/owners
        const merged = mergedHistory;
        for (const ev of merged) {
            if (ev.submittedBy) ids.add(String(ev.submittedBy));
            if (ev.actor) ids.add(String(ev.actor));
            if (ev.previousOwner) ids.add(String(ev.previousOwner));
            if (ev.newOwner) ids.add(String(ev.newOwner));
        }

        // remove empty selectors
        ids.delete('');

        const unique = Array.from(ids).filter(Boolean).slice(0, 200); // limit

        if (unique.length === 0) return;

        let mounted = true;
        (async () => {
            try {
                const res = await fetch('/api/fabric/identity/bulk-detail', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ selectors: unique })
                });
                if (!res.ok) return;
                const json = await res.json();
                if (json && json.success && json.data) {
                    const map: Record<string, IdentityDetail> = {};
                    for (const k of Object.keys(json.data)) {
                        const v = json.data[k];
                        if (v && !v.error) map[k] = { selector: k, ...(v as IdentityDetail) };
                    }
                    if (mounted) setIdentityDetails(prev => ({ ...prev, ...map }));
                }
            } catch {
                // ignore
            }
        })();

        return () => { mounted = false; };
    }, [mergedHistory, traceData]);

    // When we receive traceData, detect parent IDs (split origin or originalProductId)
    // and fetch their traces recursively up to a depth limit, avoiding cycles.
    useEffect(() => {
        let mounted = true;
        const MAX_DEPTH = 6;

        const findParentIds = (data: TraceData | undefined) => {
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
                        const d = (h.data || {}) as Record<string, unknown>;
                        if (d.originalProductId && typeof d.originalProductId === 'string') {
                            parents.add(String(d.originalProductId));
                        }
                    } catch {
                        // ignore
                    }
                }
            }

            return parents;
        };

        async function fetchAncestors() {
            setParentTraces([]);
            if (!traceData || !traceData.asset) return;

            const results: TraceData[] = [];
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
                        results.push(json.data as TraceData);

                        if (depth < MAX_DEPTH) {
                            const more = findParentIds(json.data);
                            for (const mid of more) {
                                if (!visited.has(mid)) queue.push({ id: mid, depth: depth + 1 });
                            }
                        }
                    }
                } catch {
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

    // NOTE: helper functions for ancestor inspection / org chains were removed because they were
    // defined but not referenced in the UI. They can be restored if needed later.

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

    // use helper from lib/traceHelpers — more robust parsing

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


    // Memoize merged history to avoid recalculating on unrelated state updates

    // Helper component: Participant card — declared outside of JSX to avoid TSX parse issues
    const [toast, setToast] = useState<string | null>(null);

    // auto-clear toast
    useEffect(() => {
        if (!toast) return;
        const t = setTimeout(() => setToast(null), 3000);
        return () => clearTimeout(t);
    }, [toast]);

    const ParticipantCard = ({ title, selector, info, onCopy }: { title?: string; selector: string; info?: IdentityDetail | undefined; onCopy?: (s: string) => void }) => {
        const roleLabel = info?.role || (info?.org ? `${info.org}` : 'Participant');
        const address = info?.address || '';
        const shortAddr = address ? `${address.slice(0, 8)}...${address.slice(-6)}` : selector.length > 40 ? `${selector.slice(0, 18)}...${selector.slice(-18)}` : selector;

        const badgeColor = (() => {
            const r = (info?.role || '').toLowerCase() || '';
            if (r.includes('producer')) return 'from-amber-400 to-amber-500 text-amber-900';
            if (r.includes('factory')) return 'from-blue-400 to-cyan-500 text-white';
            if (r.includes('retailer')) return 'from-green-400 to-emerald-500 text-white';
            if (r.includes('consumer')) return 'from-violet-400 to-indigo-500 text-white';
            return 'from-slate-100 to-slate-200 text-slate-800';
        })();

        const copy = async () => {
            try {
                await navigator.clipboard.writeText(selector);
                if (onCopy) onCopy(selector);
            } catch {
                if (onCopy) onCopy('failed');
            }
        };

        return (
            <div className="p-4 rounded-xl bg-white/70 border border-gray-100 flex flex-col justify-between break-words">
                <div>
                    <div className="flex items-start justify-between gap-3">
                        <div>
                            <div className="text-xs text-gray-500">{title}</div>
                        </div>
                        <div className="flex items-center gap-2">
                            <div className={`px-2 py-1 rounded-full text-xs font-semibold bg-gradient-to-r ${badgeColor}`}>{roleLabel}</div>
                            <button type="button" onClick={copy} className="text-gray-500 hover:text-gray-700 text-sm" title="Copy full selector">Copy</button>
                        </div>
                    </div>

                    {info?.cn && <div className="mt-2 text-xs text-gray-600">CN: <span className="font-medium">{info.cn}</span></div>}
                    <div className="mt-2 text-xs text-gray-500 font-mono">{shortAddr}</div>
                    {info?.fingerprint && (
                        <div className="mt-2 text-xs text-gray-400">FP: <span className="font-mono">{String(info.fingerprint).slice(0, 8)}…{String(info.fingerprint).slice(-6)}</span></div>
                    )}
                    <div className="mt-2 text-xs text-gray-400 break-all" title={String(selector)}>
                        {String(selector)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 text-black">
            <div className="container mx-auto px-6 py-8">
                {/* Toast */}
                {toast && (
                    <div className="fixed right-6 bottom-6 z-50">
                        <div className="bg-black/80 text-white px-4 py-2 rounded-lg shadow-lg">{toast}</div>
                    </div>
                )}
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
                                        <div className="text-xs">Factory</div>
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
                                {/* Resolved participant details (username, role, address) - improved visuals */}
                                <div className="mt-6">
                                    <h4 className="text-sm text-gray-600 mb-3">Participants (resolved)</h4>

                                    {/* Participant cards rendered below */}

                                    <div className="grid grid-cols-1 gap-4">
                                        {/* Primary roles: creator and current owner */}
                                        {([traceData.asset.createdBy, traceData.asset.currentOwner] as Array<string | undefined>).map((sel, idx) => {
                                            if (!sel) return null;
                                            const info = identityDetails[String(sel)];
                                            return <ParticipantCard key={idx} title={idx === 0 ? 'Created By' : 'Current Owner'} selector={String(sel)} info={info} onCopy={() => setToast('Selector copiado')} />;
                                        })}

                                        {/* Additional resolved identities: only those referenced in the trace, exclude MSP/CA entries, dedupe by address/fingerprint */}
                                        {(() => {
                                            const primaries = new Set([String(traceData.asset.createdBy), String(traceData.asset.currentOwner)]);

                                            // Build a set of selectors that actually appear in the merged history or asset fields
                                            const referenced = new Set<string>();
                                            if (traceData.asset?.createdBy) referenced.add(String(traceData.asset.createdBy));
                                            if (traceData.asset?.currentOwner) referenced.add(String(traceData.asset.currentOwner));
                                            if (Array.isArray(traceData.rawMaterialsTrace)) {
                                                for (const rt of traceData.rawMaterialsTrace) {
                                                    if (rt.asset?.createdBy) referenced.add(String(rt.asset.createdBy));
                                                    if (rt.asset?.currentOwner) referenced.add(String(rt.asset.currentOwner));
                                                    if (Array.isArray(rt.history)) {
                                                        for (const ev of rt.history) {
                                                            if (ev.submittedBy) referenced.add(String(ev.submittedBy));
                                                            if (ev.actor) referenced.add(String(ev.actor));
                                                        }
                                                    }
                                                }
                                            }
                                            for (const ev of mergedHistory) {
                                                if (ev.submittedBy) referenced.add(String(ev.submittedBy));
                                                if (ev.actor) referenced.add(String(ev.actor));
                                                if (ev.previousOwner) referenced.add(String(ev.previousOwner));
                                                if (ev.newOwner) referenced.add(String(ev.newOwner));
                                            }

                                            // Filter identityDetails to those referenced and not MSP/CA
                                            const raw = Object.entries(identityDetails)
                                                .filter(([k, v]) => {
                                                    if (!k || !v) return false;
                                                    // only show selectors that are referenced in the trace
                                                    if (!referenced.has(k)) return false;
                                                    // exclude primary cards (createdBy / currentOwner) to avoid duplication
                                                    if (primaries.has(k)) return false;
                                                    // exclude MSP constants like FactoryMSP
                                                    if (/MSP$/i.test(String(k))) return false;
                                                    // exclude CA or cert-authority entries
                                                    const role = (v?.role || '').toString().toLowerCase();
                                                    if (role === 'ca') return false;
                                                    if (String(v?.cn || '').toLowerCase().startsWith('ca.')) return false;
                                                    return true;
                                                }) as Array<[string, IdentityDetail | undefined]>;

                                            // Deduplicate by normalized identity key (address > fingerprint > normalized selector)
                                            const normalizeKey = (sel: string, v: IdentityDetail | undefined) => {
                                                if (v?.address) return String(v.address).toLowerCase();
                                                if (v?.fingerprint) return String(v.fingerprint).toLowerCase();
                                                // try to extract CN from x509 style selectors (CN=...)
                                                try {
                                                    const s = String(sel || '');
                                                    const m = s.match(/CN=([^,/]+)/i);
                                                    if (m && m[1]) return String(m[1]).toLowerCase();
                                                    // fallback to username part before @
                                                    const at = s.indexOf('@');
                                                    if (at > 0) return s.slice(0, at).toLowerCase();
                                                    return s.toLowerCase();
                                                } catch {
                                                    return String(sel).toLowerCase();
                                                }
                                            };

                                            // count how often a selector appears in the merged history (used to choose a representative)
                                            const countReferences = (selector: string) => {
                                                let count = 0;
                                                for (const ev of mergedHistory) {
                                                    if (!ev) continue;
                                                    const fields = [ev.submittedBy, ev.actor, ev.previousOwner, ev.newOwner];
                                                    for (const f of fields) {
                                                        if (!f) continue;
                                                        try {
                                                            if (String(f) === selector) count++;
                                                        } catch { }
                                                    }
                                                }
                                                // also check rawMaterialsTrace histories
                                                if (Array.isArray(traceData.rawMaterialsTrace)) {
                                                    for (const rt of traceData.rawMaterialsTrace) {
                                                        if (rt.asset?.createdBy && String(rt.asset.createdBy) === selector) count++;
                                                        if (rt.asset?.currentOwner && String(rt.asset.currentOwner) === selector) count++;
                                                        if (Array.isArray(rt.history)) {
                                                            for (const ev of rt.history) {
                                                                if (ev.submittedBy && String(ev.submittedBy) === selector) count++;
                                                                if (ev.actor && String(ev.actor) === selector) count++;
                                                            }
                                                        }
                                                    }
                                                }
                                                // asset-level fields
                                                if (traceData.asset?.createdBy && String(traceData.asset.createdBy) === selector) count += 3; // bias creators
                                                if (traceData.asset?.currentOwner && String(traceData.asset.currentOwner) === selector) count += 2;
                                                return count;
                                            };

                                            const seen = new Set<string>();
                                            const participants: Array<{ selector: string; info: IdentityDetail | undefined; refs: number }> = [];
                                            for (const [k, v] of raw) {
                                                const key = normalizeKey(k, v);
                                                if (seen.has(key)) continue;
                                                seen.add(key);
                                                participants.push({ selector: k, info: v, refs: countReferences(k) });
                                            }

                                            // sort participants by desired descending role order: producer, factory, retailer, consumer
                                            const priority = (r?: string) => {
                                                if (!r) return 99;
                                                const rr = String(r).toLowerCase();
                                                if (rr.includes('producer')) return 1;
                                                if (rr.includes('factory')) return 2;
                                                if (rr.includes('retailer')) return 3;
                                                if (rr.includes('consumer')) return 4;
                                                return 10;
                                            };

                                            participants.sort((a, b) => {
                                                const pr = priority(a.info?.role) - priority(b.info?.role);
                                                if (pr !== 0) return pr;
                                                return (b.refs || 0) - (a.refs || 0);
                                            });

                                            // If there are multiple 'Producer' participants, collapse to a single representative
                                            const collapseRoles = ['producer'];
                                            const finalParticipants: Array<{ selector: string; info: IdentityDetail | undefined }> = [];
                                            const byRole = new Map<string, Array<{ selector: string; info: IdentityDetail | undefined; refs: number }>>();
                                            for (const p of participants) {
                                                const role = String(p.info?.role || '').toLowerCase() || 'unknown';
                                                if (!byRole.has(role)) byRole.set(role, []);
                                                byRole.get(role)!.push(p);
                                            }

                                            for (const [role, items] of byRole.entries()) {
                                                if (collapseRoles.includes(role) && items.length > 1) {
                                                    // prefer the asset creator or current owner if present
                                                    const chosen = items.find(i => String(i.selector) === String(traceData.asset?.createdBy))
                                                        || items.find(i => String(i.selector) === String(traceData.asset?.currentOwner))
                                                        || items.reduce((a, b) => (b.refs > a.refs ? b : a));
                                                    if (chosen) finalParticipants.push({ selector: chosen.selector, info: chosen.info });
                                                } else {
                                                    // keep all others in priority order
                                                    for (const it of items) finalParticipants.push({ selector: it.selector, info: it.info });
                                                }
                                            }

                                            return finalParticipants.slice(0, 6).map((p, i) => (
                                                <ParticipantCard key={`add-${i}`} title={`Participant`} selector={p.selector} info={p.info} onCopy={() => setToast('Selector copiado')} />
                                            ));
                                        })()}
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
                                                <span className="ml-2 px-2 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-semibold">ID: {rawTrace.asset.id}</span>
                                            </h3>

                                            <div className="flex items-center gap-3 mb-4">
                                                {rawTrace.asset.id && (
                                                    <>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                const id = String(rawTrace.asset.id);
                                                                setAssetId(id);
                                                                setSearchId(id);
                                                                try { router.push(`/consumer/trace?assetId=${encodeURIComponent(id)}`); } catch { }
                                                            }}
                                                            className="px-3 py-2 bg-blue-500 text-white rounded-lg text-sm font-medium hover:brightness-95"
                                                        >
                                                            Ver traza
                                                        </button>
                                                        <a href={`/consumer/trace?assetId=${encodeURIComponent(String(rawTrace.asset.id))}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm hover:bg-gray-50">Abrir en nueva pestaña</a>
                                                    </>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                                                <div className="bg-white/50 rounded-lg p-3">
                                                    <p className="text-sm"><strong>Origin:</strong> {rawTrace.asset.origin || 'N/A'}</p>
                                                    <p className="text-sm"><strong>Category:</strong> {rawTrace.asset.category}</p>
                                                </div>
                                                <div className="bg-white/50 rounded-lg p-3">
                                                    <p className="text-sm"><strong>Available:</strong> {rawTrace.asset.quantity ?? 'N/A'} {rawTrace.asset.unit || 'units'}</p>
                                                    <p className="text-sm"><strong>Consumed for this product:</strong> {traceData.asset.rawMaterialsUsed ? String(traceData.asset.rawMaterialsUsed[String(rawTrace.asset.id)] ?? 'N/A') : 'N/A'} {traceData.asset.unit || rawTrace.asset.unit || 'units'}</p>
                                                    <p className="text-sm"><strong>Batch:</strong> {rawTrace.asset.batchNumber || 'N/A'}</p>
                                                </div>
                                                <div className="bg-white/50 rounded-lg p-3">
                                                    <p className="text-sm"><strong>Status:</strong> <span className="px-2 py-0.5 bg-orange-100 text-orange-800 rounded-full text-xs font-semibold">{rawTrace.asset.status}</span></p>
                                                    {rawTrace.asset.certifications && rawTrace.asset.certifications.length > 0 && (<p className="text-sm"><strong>Certs:</strong> {rawTrace.asset.certifications.join(', ')}</p>)}
                                                </div>
                                            </div>

                                            <div className="space-y-2">
                                                <h4 className="font-semibold text-gray-700 flex items-center"><span className="mr-2">📅</span>Timeline:</h4>
                                                {([...rawTrace.history].sort((a: TraceEvent, b: TraceEvent) => new Date(String(a.txTimestamp || a.timestamp || 0)).getTime() - new Date(String(b.txTimestamp || b.timestamp || 0)).getTime())).map((event: TraceEvent, eventIndex: number) => (
                                                    <div key={eventIndex} className="flex items-center space-x-3 text-sm bg-white/50 rounded-lg p-3">
                                                        <div className="w-7 h-7 bg-orange-500 text-white rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">{eventIndex + 1}</div>
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

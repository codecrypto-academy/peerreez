import React from 'react';
import { getActionIcon, getActionColor, extractOrgFromIdentity, formatTimestamp, getOriginBadge, formatQuantities } from '../../lib/traceHelpers';

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
    origin?: 'raw' | 'parent' | 'asset';
};

export default function TimelineItem({ event, index, total }: { event: TraceEvent; index: number; total: number }) {
    const badge = event.origin ? getOriginBadge(event.origin) : getOriginBadge();
    const ts = event.txTimestamp ? formatTimestamp(String(event.txTimestamp)) : (event.timestamp ? formatTimestamp(String(event.timestamp)) : 'Unknown');
    const rawTx = event.txId ? String(event.txId) : '';
    // keep only printable ASCII chars to avoid control/unicode chars that force wrapping
    const finalSafe = rawTx ? rawTx.replace(/[^\x20-\x7E]/g, '') : rawTx;
    const shortTxId = finalSafe ? `${finalSafe.slice(0, 10)}…${finalSafe.slice(-6)}` : '';

    return (
        <div className="flex gap-4">
            {/* Marker column */}
            <div className="flex flex-col items-start flex-shrink-0" style={{ width: 48 }}>
                <div className="w-10 h-10 mt-0 rounded-full bg-white shadow flex items-center justify-center border border-gray-200 font-semibold">{index + 1}</div>
                {index !== total - 1 && <div className="flex-1 w-px bg-gray-200 mt-3" />}
            </div>

            {/* Content card */}
            <div className={`flex-1 flex flex-col p-4 rounded-2xl border ${getActionColor(event.action || '')} bg-white/60 hover:shadow-md transition justify-start`}>
                <div className="flex items-start justify-between w-full gap-4">
                    <div className="flex items-start gap-3">
                        <div className="text-2xl leading-none">{getActionIcon(event.action)}</div>
                        <div>
                            <div className="flex items-center gap-3">
                                <div className="font-semibold text-gray-900">{event.action}</div>
                                <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${badge.classes}`}>{badge.label}</span>
                            </div>
                            <div className="text-xs text-gray-500">{ts}</div>
                        </div>
                    </div>

                    <div className="w-48 flex flex-col items-end justify-start text-right text-xs text-gray-600">
                        <div className="font-semibold">{(event.submittedBy || event.actor) ? extractOrgFromIdentity(String(event.submittedBy || event.actor)) : extractOrgFromIdentity(event.previousOwner || event.newOwner || '')}</div>
                        {event.txId && (
                            <div className="mt-1 font-mono text-xs opacity-80 flex items-center gap-2">
                                <span className="truncate max-w-[12rem] block">{shortTxId}</span>
                                <button className="text-blue-600 text-xs underline" onClick={() => navigator.clipboard?.writeText(finalSafe)}>copy</button>
                            </div>
                        )}
                    </div>
                </div>

                {event.previousOwner && event.newOwner && (
                    <div className="mt-3 text-sm text-gray-700 flex items-center gap-3">
                        <div className="px-2 py-0.5 bg-blue-100 rounded text-xs font-semibold">{extractOrgFromIdentity(event.previousOwner)}</div>
                        <div className="text-sm">→</div>
                        <div className="px-2 py-0.5 bg-green-100 rounded text-xs font-semibold">{extractOrgFromIdentity(event.newOwner)}</div>
                    </div>
                )}

                {event.data && typeof event.data === 'object' && (
                    <div className="mt-3 p-3 bg-white/70 rounded-lg text-sm text-left flex flex-col gap-2 self-start">
                        {typeof event.data.location === 'string' && <div>📍 <strong>Location:</strong> {event.data.location}</div>}
                        {typeof event.data.transportMethod === 'string' && <div>🚚 <strong>Transport:</strong> {event.data.transportMethod}</div>}
                        {typeof event.data.quantityTransferred !== 'undefined' && <div>📦 <strong>Qty:</strong> {String(event.data.quantityTransferred)}</div>}
                        {typeof event.data.quantities === 'object' && <div>🧾 <strong>Quantities:</strong> {formatQuantities(event.data.quantities)}</div>}
                        {typeof event.data.notes === 'string' && <div>💬 <strong>Notes:</strong> {event.data.notes}</div>}
                        {typeof event.data.temperature !== 'undefined' && <div>🌡️ <strong>Temp:</strong> {String(event.data.temperature)}°C</div>}
                    </div>
                )}
            </div>
        </div>
    );
}

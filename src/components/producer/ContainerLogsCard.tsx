"use client";
import React, { useEffect, useState, useRef } from 'react';

interface ContainerLogsCardProps {
    containerName?: string;
}

const DEFAULT_CONTAINER = 'peer0.producer.supplychain.com';

// Improved UI: toolbar, limited buffer, autoscroll (Follow), copy & download actions.
const MAX_LINES = 2000;

const ContainerLogsCard: React.FC<ContainerLogsCardProps> = ({ containerName }) => {
    const [lines, setLines] = useState<string[]>([]);
    const [loading, setLoading] = useState(true);
    // follow removed per UX request; autoscroll stays enabled by default
    const [statusText, setStatusText] = useState('Connecting');
    const eventSourceRef = useRef<EventSource | null>(null);
    const containerRef = useRef<HTMLDivElement | null>(null);

    const appendChunk = (chunk: string) => {
        // split into lines and append, keep buffer within MAX_LINES
        const newLines = chunk.split(/\r?\n/).filter(Boolean);
        setLines((prev) => {
            const merged = [...prev, ...newLines];
            if (merged.length > MAX_LINES) {
                return merged.slice(merged.length - MAX_LINES);
            }
            return merged;
        });
    };

    useEffect(() => {
        const container = encodeURIComponent(containerName || DEFAULT_CONTAINER);
        setLoading(true);
        setStatusText('Connecting');

        try {
            const es = new EventSource(`/api/logs/stream?container=${container}`);
            eventSourceRef.current = es;

            es.onopen = () => {
                setLoading(false);
                setStatusText('Live');
                // reset logs when opening
                setLines([]);
            };

            es.onmessage = (e) => {
                appendChunk(e.data);
            };

            es.onerror = () => {
                // show error, keep EventSource (browser may auto-retry)
                setStatusText('Disconnected');
                setLoading(false);
                appendChunk('[Stream error or disconnected]');
                // Do not forcibly close here; let browser handle retry, or user toggle follow
            };
        } catch (err) {
            setLines((prev) => [...prev, '[Could not open EventSource for log stream]']);
            setLoading(false);
            setStatusText('Error');
        }

        return () => {
            try { eventSourceRef.current?.close(); } catch (e) { }
            eventSourceRef.current = null;
        };
    }, [containerName]);

    // Autoscroll enabled by default: scroll to bottom when lines change
    useEffect(() => {
        if (containerRef.current) {
            containerRef.current.scrollTop = containerRef.current.scrollHeight;
        }
    }, [lines]);

    const handleCopy = async () => {
        const prevStatus = statusText;
        setStatusText('Copying...');
        try {
            const container = encodeURIComponent(containerName || DEFAULT_CONTAINER);
            const res = await fetch(`/api/logs/snapshot?container=${container}`);
            let text = '';
            if (res.ok) {
                text = await res.text();
            } else {
                const body = await res.text();
                console.error('snapshot fetch failed:', res.status, body);
                alert(`Snapshot error: ${body}`);
                text = lines.join('\n');
            }
            const ok = await copyTextWithFallback(text);
            if (!ok) alert('Copy failed (clipboard unavailable)');
            setStatusText('Copied');
        } catch (err) {
            console.error('copy error', err);
            await copyTextWithFallback(lines.join('\n'));
            setStatusText('Error');
            alert('Copy failed: ' + String(err));
        } finally {
            setTimeout(() => setStatusText(prevStatus), 1500);
        }
    };

    const copyTextWithFallback = async (text: string) => {
        try {
            if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            // fallthrough
        }

        try {
            if (typeof document !== 'undefined') {
                const ta = document.createElement('textarea');
                ta.value = text;
                ta.style.position = 'fixed';
                ta.style.top = '0';
                ta.style.left = '0';
                ta.style.opacity = '0';
                document.body.appendChild(ta);
                ta.focus();
                ta.select();
                const ok = document.execCommand('copy');
                ta.remove();
                return !!ok;
            }
        } catch (err) {
            console.error('fallback copy failed', err);
        }
        return false;
    };

    const handleDownload = async () => {
        if (typeof window === 'undefined' || typeof document === 'undefined') return;
        const prevStatus = statusText;
        setStatusText('Downloading...');
        try {
            const container = encodeURIComponent(containerName || DEFAULT_CONTAINER);
            const res = await fetch(`/api/logs/snapshot?container=${container}`);
            let text = '';
            if (res.ok) {
                text = await res.text();
            } else {
                const body = await res.text();
                console.error('snapshot fetch failed:', res.status, body);
                alert(`Snapshot error: ${body}`);
                text = lines.join('\n');
            }

            const blob = new Blob([text], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${(containerName || DEFAULT_CONTAINER).replace(/[^a-zA-Z0-9._-]/g, '-')}-logs.txt`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
            setStatusText('Downloaded');
        } catch (err) {
            setStatusText('Error');
        } finally {
            setTimeout(() => setStatusText(prevStatus), 1500);
        }
    };

    return (
        <div className="flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Container Logs</h3>
                <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusText === 'Live' ? 'bg-emerald-100 text-emerald-800' : statusText === 'Connecting' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                        {statusText}
                    </span>
                    {/* Clear and Follow removed per UX request */}
                    <button onClick={handleCopy} className="px-3 py-1 text-xs text-gray-700 bg-white/80 hover:bg-gray-50 rounded-md border">Copy</button>
                    <button onClick={handleDownload} className="px-3 py-1 text-xs text-gray-700 bg-white/80 hover:bg-gray-50 rounded-md border">Download</button>
                </div>
            </div>

            <div className="rounded-2xl shadow-inner border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-2 text-xs text-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="text-sm font-medium text-gray-800">{containerName || DEFAULT_CONTAINER}</div>
                        <div className="text-xs text-gray-500">Monospace · Live stream</div>
                    </div>
                    <div className="text-xs text-gray-500">Showing last {MAX_LINES.toLocaleString()} lines</div>
                </div>

                <div ref={containerRef} className="bg-gray-900 text-gray-100 p-4 text-xs font-mono" style={{ maxHeight: 350, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
                    {loading && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center pointer-events-none">
                            <div className="text-sm text-white">Connecting to log stream...</div>
                        </div>
                    )}

                    <pre className="whitespace-pre-wrap">{lines.join('\n')}</pre>
                </div>
            </div>
        </div>
    );
};

export default ContainerLogsCard;

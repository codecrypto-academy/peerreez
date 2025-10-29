"use client";

import { useState, useRef } from 'react';
import Header from '@/components/layout/Header';

const ORGS = ['Producer', 'Factory', 'Retailer', 'Consumer'];

export default function AdminPage() {
    const [output, setOutput] = useState<string>("");
    const [running, setRunning] = useState(false);
    const [org, setOrg] = useState(ORGS[0]);
    const [username, setUsername] = useState('user1');
    const outRef = useRef<HTMLPreElement | null>(null);

    // Stream logs from the server endpoint
    async function streamScript(script: string, args: string[] = []) {
        setRunning(true);
        setOutput('');
        try {
            const res = await fetch('/api/admin/stream', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ script, args }),
            });

            if (!res.ok) {
                const err = await res.json().catch(() => ({}));
                throw new Error(err?.error || `HTTP ${res.status}`);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            if (!reader) throw new Error('Stream not available');

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                setOutput((s) => s + chunk);
                // auto-scroll
                if (outRef.current) {
                    outRef.current.scrollTop = outRef.current.scrollHeight;
                }
            }
        } catch (err: unknown) {
            // Narrow unknown to Error when possible, otherwise stringify
            const msg = err instanceof Error ? err.message : String(err);
            setOutput((s) => s + `\nError: ${msg}`);
        } finally {
            setRunning(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 text-black">
            <Header />

            <main className="container mx-auto px-6 py-8">
                <div className="max-w-5xl mx-auto">
                    <h2 className="text-3xl font-extrabold text-black mb-6">Admin Console</h2>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="col-span-2 space-y-6">
                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-semibold mb-3 text-black">Network actions</h3>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                    <button disabled={running} onClick={() => streamScript('cleanup')} className="w-full text-black bg-red-100 hover:bg-red-200 border border-red-200 rounded px-4 py-2 text-sm font-medium">Cleanup (full)</button>
                                    <button disabled={running} onClick={() => streamScript('deploy')} className="w-full text-black bg-green-100 hover:bg-green-200 border border-green-200 rounded px-4 py-2 text-sm font-medium">Deploy (full)</button>
                                    <button disabled={running} onClick={() => streamScript('validate')} className="w-full text-black bg-blue-100 hover:bg-blue-200 border border-blue-200 rounded px-4 py-2 text-sm font-medium">Validate</button>
                                    <button disabled={running} onClick={() => streamScript('monitor')} className="w-full text-black bg-yellow-100 hover:bg-yellow-200 border border-yellow-200 rounded px-4 py-2 text-sm font-medium">Monitor</button>
                                    <button disabled={running} onClick={() => streamScript('start')} className="w-full text-black bg-green-50 hover:bg-green-100 border border-green-100 rounded px-4 py-2 text-sm font-medium">Start Network</button>
                                    <button disabled={running} onClick={() => streamScript('stop')} className="w-full text-black bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded px-4 py-2 text-sm font-medium">Stop Network</button>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-semibold mb-3 text-black">Register new user</h3>
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-black">Org</label>
                                        <select value={org} onChange={(e) => setOrg(e.target.value)} className="border px-2 py-1 rounded text-black">
                                            {ORGS.map((o) => (
                                                <option key={o} value={o}>{o}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-black">Username</label>
                                        <input value={username} onChange={(e) => setUsername(e.target.value)} className="border px-2 py-1 rounded text-black" />
                                    </div>

                                    <div>
                                        <button disabled={running} onClick={() => streamScript('register_user', [org, username])} className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded">Register</button>
                                    </div>
                                </div>

                                <p className="text-sm text-gray-600 mt-3">Scripts are executed from the project&apos;s <code className="font-mono">supply-chain-network</code> directory to avoid creating files in wrong locations.</p>
                            </div>
                        </div>

                        <aside className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold mb-3 text-black">Live Output</h3>
                            <pre ref={outRef} className="mt-2 bg-gray-100 text-black p-3 rounded h-96 overflow-auto whitespace-pre-wrap">{output || (running ? 'Running...' : 'No output yet')}</pre>
                        </aside>
                    </div>
                </div>
            </main>
        </div>
    );
}

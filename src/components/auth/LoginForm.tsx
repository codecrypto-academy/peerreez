"use client";

import React from "react";
import { Role, useAuth } from "./AuthProvider";

const roleMeta: Record<Role, { label: string; icon: string; desc: string; bg: string }> = {
    producer: { label: 'Producer', icon: '🌱', desc: 'Register raw materials & origin', bg: 'from-green-400 to-emerald-500' },
    factory: { label: 'Factory', icon: '🏭', desc: 'Transform materials into products', bg: 'from-orange-400 to-red-500' },
    retailer: { label: 'Retailer', icon: '🏪', desc: 'Manage inventory & sell to consumers', bg: 'from-purple-400 to-pink-500' },
    consumer: { label: 'Consumer', icon: '👤', desc: 'Trace products and verify origin', bg: 'from-cyan-400 to-blue-500' },
};

export default function LoginForm({ onClose }: { onClose?: () => void }) {
    const { user, login } = useAuth();
    const roles: Role[] = ["producer", "factory", "retailer", "consumer"];
    const displayName = user?.name ? user.name.replace(/^Demo\s+/i, '') : '';

    return (
        <div className="bg-white rounded-2xl shadow-2xl ring-1 ring-slate-900/5 overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-semibold text-black">Select Role</h3>
                    {/* Instruction line removed as requested */}
                </div>
                <div>
                    <button
                        onClick={() => onClose?.()}
                        aria-label="Cerrar"
                        className="p-1 rounded hover:bg-slate-100"
                    >
                        <svg className="w-5 h-5 text-slate-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden>
                            <path fillRule="evenodd" d="M10 8.586l4.95-4.95a1 1 0 111.414 1.415L11.414 10l4.95 4.95a1 1 0 01-1.414 1.414L10 11.414l-4.95 4.95A1 1 0 013.636 14.95L8.586 10 3.636 5.05A1 1 0 115.05 3.636L10 8.586z" clipRule="evenodd" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="p-4">
                <div className="mb-3 text-sm text-black">Current user: <strong className="text-black">{displayName}</strong> — <em className="text-black">{user?.role}</em></div>

                <div className="grid grid-cols-2 gap-3">
                    {roles.map((r) => {
                        const meta = roleMeta[r];
                        const active = user?.role === r;
                        return (
                            <button
                                key={r}
                                onClick={() => { login(r); onClose?.(); }}
                                className={`group relative p-3 rounded-xl text-left overflow-hidden transition-transform transform hover:-translate-y-0.5 focus:outline-none ${active ? 'ring-2 ring-offset-2 ring-blue-600' : 'ring-1 ring-slate-100'}`}
                            >
                                <div className={`w-full h-full pointer-events-none flex items-center gap-3`}>
                                    <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-gradient-to-br ${meta.bg} text-white drop-shadow-sm`}>{meta.icon}</div>
                                    <div>
                                        <div className="font-semibold text-black">{meta.label}</div>
                                        <div className="text-sm text-black/80">{meta.desc}</div>
                                    </div>
                                </div>
                                {active && <div className="absolute top-2 right-2 text-xs bg-blue-600 text-white px-2 py-0.5 rounded">Activo</div>}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}

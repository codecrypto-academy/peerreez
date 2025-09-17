"use client";
import React from "react";

export default function Modal({ open, onClose, children }: { open: boolean; onClose: () => void; children: React.ReactNode }) {
    if (!open) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
            <div className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-12 max-w-2xl w-full relative">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 transition p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    aria-label="Cerrar"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                <div className="text-gray-100 font-sans">
                    {children}
                </div>
            </div>
        </div>
    );
}

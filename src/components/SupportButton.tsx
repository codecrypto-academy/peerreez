"use client";
import React from "react";

export default function SupportButton() {
    return (
        <button
            className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow flex items-center gap-2 text-base transition-all duration-200"
            title="Soporte"
            aria-label="Abrir soporte"
            onClick={() => window.location.href = '/help?section=support'}
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A9 9 0 1 0 12 21v-2a7 7 0 1 1 7-7h2a9 9 0 0 0-2.636-6.364z" /></svg>
            <span>Soporte</span>
        </button>
    );
}

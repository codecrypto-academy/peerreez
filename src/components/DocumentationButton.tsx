"use client";
import React from "react";

export default function DocumentationButton() {
    return (
        <button
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-2 text-base transition-all duration-200"
            title="Documentación"
            aria-label="Abrir documentación"
            onClick={() => window.location.href = '/help?section=doc'}
        >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
            <span>Documentación</span>
        </button>
    );
}

"use client";

// Componente Header: barra superior con logo, título y botones de acción
import React from "react";
// Eliminamos los botones antiguos, usaremos botones directos en el navbar
// Si usas Next.js, puedes importar Link para navegación interna SPA
// import Link from "next/link";


export default function Header({ onAddNetwork, onNavigate }: { onAddNetwork: () => void, onNavigate?: (view: 'gestion' | 'doc' | 'support') => void }) {
    // Componente Header: barra superior con logo, título y botones de acción
    // Si usas Next.js, puedes importar Link para navegación interna SPA
    // import Link from "next/link";

    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-gray-950 via-blue-950 to-gray-900 border-b border-gray-800 shadow-xl flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-lg">
            {/* Logo y título */}
            <div className="flex items-center gap-4">
                <img src="/globe.svg" alt="Logo" className="w-8 h-8 hidden md:block" />
                <span className="text-cyan-400 text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-lg">Besu Control</span>
            </div>
            {/* Botones de acción */}
            <div className="flex items-center gap-3">
                <button
                    className="px-4 py-2 bg-cyan-700 hover:bg-cyan-800 text-white rounded-xl font-bold shadow flex items-center gap-2 text-base transition-all duration-200"
                    title="Gestión"
                    aria-label="Volver a gestión"
                    onClick={() => onNavigate && onNavigate('gestion')}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12h18" /></svg>
                    <span>Gestión</span>
                </button>
                {/* Botón para añadir red */}
                <button
                    onClick={onAddNetwork}
                    className="bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold px-6 py-2 rounded-2xl shadow-lg text-lg flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    aria-label="Añadir nueva red"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                    <span className="font-semibold">Añadir Red</span>
                </button>
                <button
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow flex items-center gap-2 text-base transition-all duration-200"
                    title="Documentación"
                    aria-label="Ver documentación"
                    onClick={() => onNavigate && onNavigate('doc')}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 17l4 4 4-4m-4-5v9" /></svg>
                    <span>Documentación</span>
                </button>
                <button
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl font-bold shadow flex items-center gap-2 text-base transition-all duration-200"
                    title="Soporte"
                    aria-label="Ver soporte"
                    onClick={() => onNavigate && onNavigate('support')}
                >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-1.414 1.414A9 9 0 1 0 12 21v-2a7 7 0 1 1 7-7h2a9 9 0 0 0-2.636-6.364z" /></svg>
                    <span>Soporte</span>
                </button>
            </div>
        </header>
    );
}

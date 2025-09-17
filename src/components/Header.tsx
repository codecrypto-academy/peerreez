"use client";
import React from "react";

export default function Header({ onAddNetwork }: { onAddNetwork: () => void }) {
    return (
        <header className="fixed top-0 left-0 w-full z-50 bg-gradient-to-r from-gray-950 via-blue-950 to-gray-900 border-b border-gray-800 shadow-xl flex items-center justify-between px-6 md:px-12 py-4 backdrop-blur-lg">
            <div className="flex items-center gap-4">
                <img src="/globe.svg" alt="Logo" className="w-8 h-8 hidden md:block" />
                <span className="text-cyan-400 text-2xl md:text-3xl font-extrabold tracking-tight drop-shadow-lg">Besu Control</span>
            </div>
            <button
                onClick={onAddNetwork}
                className="bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold px-6 py-2 rounded-2xl shadow-lg text-lg flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="font-semibold">Añadir Red</span>
            </button>
        </header>
    );
}

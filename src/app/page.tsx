"use client";

import React from 'react';
import NetworksList from "../components/NetworksList";
import AddNetworkForm from "../components/AddNetworkForm";
import Header from "../components/Header";

export default function Home() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [refresh, setRefresh] = React.useState(false);

  const handleNetworkAdded = () => {
    setRefresh(r => !r);
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 text-gray-100 font-sans">
      {/* Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-gradient-to-b from-gray-950 via-gray-900 to-blue-950 border-r border-gray-800 shadow-xl p-6 gap-8 fixed h-screen z-20">
        <div className="flex items-center gap-3 mb-8">
          <img src="/globe.svg" alt="Logo" className="w-8 h-8" />
          <span className="text-2xl font-bold tracking-wide text-cyan-400">Control Panel</span>
        </div>
        <nav className="flex flex-col gap-4">
          <a href="#networks" className="text-gray-300 hover:text-cyan-400 transition font-medium">Redes</a>
          <a href="#nodes" className="text-gray-300 hover:text-cyan-400 transition font-medium">Nodos</a>
          <a href="#actions" className="text-gray-300 hover:text-cyan-400 transition font-medium">Acciones</a>
        </nav>
        <div className="mt-auto text-xs text-gray-500">© 2025 CodeCripto</div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen md:ml-64">
        {/* Header fijo */}
        <Header onAddNetwork={() => setModalOpen(true)} />
        <main className="flex-1 px-2 md:px-8 py-6 bg-transparent">
          {/* Panel desplegable para añadir red */}
          <section className="mb-8">
            <div className="w-full flex justify-end">
              <button
                onClick={() => setModalOpen((open) => !open)}
                className="bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-blue-600 text-white font-bold px-6 py-2 rounded-2xl shadow-lg text-lg flex items-center gap-2 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-cyan-400"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                <span className="font-semibold">Añadir Red</span>
              </button>
            </div>
            <div
              className={`relative overflow-hidden transition-all duration-300 ${modalOpen ? 'max-h-[800px] opacity-100 mt-6' : 'max-h-0 opacity-0'} bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 rounded-2xl shadow-2xl p-6`}
            >
              {modalOpen && (
                <>
                  <button
                    className="absolute top-4 right-4 text-gray-400 hover:text-cyan-400 transition p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    onClick={() => setModalOpen(false)}
                    aria-label="Cerrar"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                  <AddNetworkForm onNetworkAdded={handleNetworkAdded} />
                </>
              )}
            </div>
          </section>
          <section id="networks">
            <NetworksList key={refresh ? 'refresh' : 'normal'} />
          </section>
        </main>
      </div>
    </div>
  );
}

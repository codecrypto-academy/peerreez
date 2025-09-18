"use client";

import React from 'react';
import NetworksList from "../components/NetworksList";
import AddNetworkForm from "../components/AddNetworkForm";
import Header from "../components/Header";
import Documentation from "../components/Documentation";
import Support from "../components/Support";

export default function Home() {
  const [modalOpen, setModalOpen] = React.useState(false);
  const [refresh, setRefresh] = React.useState(false);
  const [view, setView] = React.useState<'gestion' | 'doc' | 'support'>('gestion');

  const handleNetworkAdded = () => {
    setRefresh(r => !r);
    setModalOpen(false);
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 text-gray-100 font-sans">
      {/* Header fijo */}
      <Header onAddNetwork={() => setModalOpen(true)} onNavigate={setView} />
      {/* Navegación entre vistas eliminada, ahora está en el Header */}
      {/* Main content según vista */}
      <main className="flex-1 px-2 md:px-8 py-6 bg-transparent mt-24">
        {/* Panel desplegable para añadir red, visible en cualquier vista */}
        <section className="mb-8">
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
        {/* Vista principal de gestión */}
        {view === 'gestion' && (
          <section id="networks">
            <NetworksList key={refresh ? 'refresh' : 'normal'} />
          </section>
        )}
        {/* Documentación y soporte */}
        {view === 'doc' && <Documentation />}
        {view === 'support' && <Support onGoGestion={() => setView('gestion')} />}
      </main>
    </div>
  );
}

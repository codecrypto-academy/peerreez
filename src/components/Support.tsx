import React from "react";

export default function Support({ onGoGestion }: { onGoGestion?: () => void }) {
    return (
        <section className="max-w-3xl mx-auto bg-gray-900/80 rounded-2xl shadow-xl p-8 mb-8 border border-cyan-900">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">Soporte</h2>
            <p className="mb-4">¿Tienes dudas o problemas? Puedes:</p>
            <ul className="list-disc pl-6 mb-4">
                <li>Consultar la documentación desde el panel principal.</li>
                <li>Contactar al equipo por correo: <a href="mailto:soporte@codecripto.academy" className="text-cyan-300 underline">soporte@codecripto.academy</a></li>
                <li>Unirte al canal de Discord: <a href="https://discord.gg/codecripto" target="_blank" rel="noopener noreferrer" className="text-cyan-300 underline">discord.gg/codecripto</a></li>
            </ul>
            {/* Botón de gestión eliminado, ahora está en el navbar principal */}
        </section>
    );
}

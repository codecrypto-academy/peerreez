import React from "react";

export default function Documentation() {

    return (
        <section className="max-w-3xl mx-auto bg-gray-900/80 rounded-2xl shadow-xl p-8 mb-8 border border-blue-900">
            <h2 className="text-3xl font-bold text-cyan-400 mb-4">Documentación Completa</h2>
            <p className="mb-4">
                <strong>Besu Control Panel</strong> es una aplicación web desarrollada con Next.js y React para gestionar redes y nodos Hyperledger Besu. Permite crear, iniciar, detener, eliminar y limpiar redes y nodos RPC, consultar el estado y automatizar tareas mediante scripts y una interfaz web.
            </p>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Tecnologías y requisitos</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>Next.js, React, TypeScript, TailwindCSS</li>
                <li>Node.js &ge; 18</li>
                <li>Docker activo</li>
            </ul>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Instalación y ejecución</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>Instalación: <code>npm install</code></li>
                <li>Ejecutar en desarrollo: <code>npm run dev</code></li>
                <li>Acceso: <code>http://localhost:3000</code></li>
            </ul>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Componentes principales</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>Header, AddNetworkForm, NetworksList, Modal, Documentation, Support</li>
            </ul>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">API y scripts</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>API principal: <code>src/app/api/</code></li>
                <li>Scripts de automatización: <code>src/lib/</code> y <code>scripts/</code></li>
            </ul>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Operaciones disponibles</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>Desplegar red: <code>node --loader ts-node/esm src/lib/deployNetwork.ts [nombreRed] [chainId]</code></li>
                <li>Añadir nodos RPC: <code>node --loader ts-node/esm src/lib/deployNodeRpc.ts [nombreRed] [cantidad]</code></li>
                <li>Arrancar/parar nodos: <code>node --loader ts-node/esm src/lib/startNode.ts</code>, <code>src/lib/stopNodes.ts</code></li>
                <li>Eliminar nodos: <code>src/lib/deleteNodeRpc.ts</code>, <code>src/lib/deleteAllRpcNodes.ts</code></li>
                <li>Limpiar red: <code>src/lib/cleanNetwork.ts</code></li>
                <li>Listar redes: <code>src/lib/operations.ts listNetworks</code></li>
            </ul>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Tests automáticos</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>Test de despliegue: <code>src/lib/test/testDeployNetwork.ts</code></li>
                <li>Test de nodos RPC: <code>src/lib/test/testAddRpcNodes.ts</code>, <code>testStopNode.ts</code>, <code>testStartNode.ts</code></li>
                <li>Test de eliminación y limpieza: <code>testDeleteNodeRpc.ts</code>, <code>testDeleteAllRpcNodes.ts</code>, <code>testCleanNetwork.ts</code></li>
            </ul>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Ejemplo de uso como librería</h3>
            <pre className="bg-gray-800 text-gray-100 p-4 rounded mb-4 text-sm overflow-x-auto">
                {`import { deployNetwork } from './src/lib/deployNetwork.js';
import { cleanNetwork } from './src/lib/cleanNetwork.js';

await deployNetwork('r1', 2025);
await cleanNetwork('r1');`}
            </pre>
            <h3 className="text-xl text-blue-300 font-semibold mt-6 mb-2">Notas y soporte</h3>
            <ul className="list-disc pl-6 mb-4">
                <li>Asegúrate de tener Docker corriendo antes de usar la librería.</li>
                <li>Personaliza los nombres de red y contenedores según tu despliegue.</li>
                <li>Consulta la documentación y abre un issue si tienes dudas.</li>
            </ul>
            <p className="mt-4">Para más detalles consulta el repositorio o contacta soporte.</p>
        </section>
    );
}

// src/lib/testCreateNode.ts
import { createNode } from "./createNode.js";

(async () => {
    try {
        // Parámetros de prueba
        const nodeParams = {
            nodeName: "nodo0",
            nodeType: "rpc" as const,
            networkName: "network0",
        };

        console.log("🚀 Creando nodo con los siguientes parámetros:");
        console.log(nodeParams);

        await createNode(nodeParams);

        console.log("✅ Nodo creado exitosamente!");
    } catch (error) {
        console.error("❌ Error al crear el nodo:", error);
    }
})();
(async () => {
    try {
        // Parámetros de prueba
        const nodeParams = {
            nodeName: "nodo00",
            nodeType: "validator" as const,
            networkName: "network0",
        };

        console.log("🚀 Creando nodo con los siguientes parámetros:");
        console.log(nodeParams);

        await createNode(nodeParams);

        console.log("✅ Nodo creado exitosamente!");
    } catch (error) {
        console.error("❌ Error al crear el nodo:", error);
    }
})();
(async () => {
    try {
        // Parámetros de prueba
        const nodeParams = {
            nodeName: "nodo000",
            nodeType: "signer" as const,
            networkName: "network0",
        };

        console.log("🚀 Creando nodo con los siguientes parámetros:");
        console.log(nodeParams);

        await createNode(nodeParams);

        console.log("✅ Nodo creado exitosamente!");
    } catch (error) {
        console.error("❌ Error al crear el nodo:", error);
    }
})();
(async () => {
    try {
        // Parámetros de prueba
        const nodeParams = {
            nodeName: "nodo1",
            nodeType: "rpc" as const,
            networkName: "network1",
        };

        console.log("🚀 Creando nodo con los siguientes parámetros:");
        console.log(nodeParams);

        await createNode(nodeParams);

        console.log("✅ Nodo creado exitosamente!");
    } catch (error) {
        console.error("❌ Error al crear el nodo:", error);
    }
})();
(async () => {
    try {
        // Parámetros de prueba
        const nodeParams = {
            nodeName: "nodo11",
            nodeType: "validator" as const,
            networkName: "network1",
        };

        console.log("🚀 Creando nodo con los siguientes parámetros:");
        console.log(nodeParams);

        await createNode(nodeParams);

        console.log("✅ Nodo creado exitosamente!");
    } catch (error) {
        console.error("❌ Error al crear el nodo:", error);
    }
})();
(async () => {
    try {
        // Parámetros de prueba
        const nodeParams = {
            nodeName: "nodo111",
            nodeType: "signer" as const,
            networkName: "network1",
        };

        console.log("🚀 Creando nodo con los siguientes parámetros:");
        console.log(nodeParams);

        await createNode(nodeParams);

        console.log("✅ Nodo creado exitosamente!");
    } catch (error) {
        console.error("❌ Error al crear el nodo:", error);
    }
})();



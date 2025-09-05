import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { deleteNode } from "../deleteNode.js";
// Define las redes y sus nodos que quieres eliminar
const networks = {
    network0: ["nodo0", "nodo00", "nodo000"],
    network1: ["nodo1", "nodo11", "nodo111"],
};
async function main() {
    for (const [networkName, nodes] of Object.entries(networks)) {
        console.log(`\n🧪 Deleting nodes from network: ${networkName}`);
        for (const nodeName of nodes) {
            console.log(`\n➡️  Deleting node: ${nodeName}`);
            try {
                // ⚠️ Pasa los argumentos separados
                const result = await deleteNode(networkName, nodeName);
                console.log("✅ deleteNode result:", result);
                // Verificar si la carpeta del nodo fue eliminada
                const nodeDir = path.join(process.cwd(), "src", "lib", "networks", networkName, nodeName);
                if (!fs.existsSync(nodeDir)) {
                    console.log(`✅ Node directory ${nodeDir} removed successfully`);
                }
                else {
                    console.warn(`⚠️ Node directory ${nodeDir} still exists`);
                }
                // Verificar contenedor Docker del nodo
                try {
                    const containers = execSync(`docker ps -aq --filter "name=^${nodeName}$"`, { stdio: "pipe" })
                        .toString()
                        .trim();
                    if (!containers) {
                        console.log(`✅ No container running for node ${nodeName}`);
                    }
                    else {
                        console.warn(`⚠️ Node container still running: ${containers}`);
                    }
                }
                catch (err) {
                    console.warn("⚠️ Could not check node container:", err);
                }
            }
            catch (err) {
                console.error(`❌ deleteNode failed for ${nodeName}:`, err);
            }
        }
    }
}
main();

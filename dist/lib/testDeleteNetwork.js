import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import { deleteNetwork } from "./deleteNetwork.js";
// Redes que queremos eliminar
const networks = ["network0", "network1"];
async function main() {
    for (const networkName of networks) {
        const networkDir = path.join(process.cwd(), "src", "lib", "networks", networkName);
        console.log(`🧪 Testing deleteNetwork for network: ${networkName}`);
        try {
            const result = await deleteNetwork(networkName);
            console.log("✅ deleteNetwork result:", result);
            // Verificar si la carpeta fue eliminada
            if (!fs.existsSync(networkDir)) {
                console.log(`✅ Network directory ${networkDir} removed successfully`);
            }
            else {
                console.warn(`⚠️ Network directory ${networkDir} still exists`);
            }
            // Verificar contenedores de la red (solo visual)
            try {
                const containers = execSync(`docker ps -aq --filter "label=network=${networkName}"`, { stdio: "pipe" })
                    .toString()
                    .trim();
                if (!containers) {
                    console.log(`✅ No containers running for network ${networkName}`);
                }
                else {
                    console.warn(`⚠️ Some containers still running: ${containers}`);
                }
            }
            catch (err) {
                console.warn("⚠️ Could not check containers:", err);
            }
        }
        catch (err) {
            console.error(`❌ deleteNetwork failed for ${networkName}:`, err);
        }
        console.log("----------------------------------------------------\n");
    }
}
main();

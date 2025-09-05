import { execSync } from "child_process";
import path from "path";
import fs from "fs";

const runCommand = (cmd: string) =>
    new Promise<void>((resolve, reject) => {
        try {
            execSync(cmd, { stdio: "inherit" });
            resolve();
        } catch (err) {
            reject(err);
        }
    });

export const deleteNode = async (networkName: string, nodeName: string) => {
    if (!networkName || !nodeName)
        throw new Error("❌ networkName and nodeName are required");

    const nodeDir = path.join(
        process.cwd(),
        "src",
        "lib",
        "networks",
        networkName,
        nodeName
    );

    // 1. Obtener IDs del nodo exacto usando filtro de nombre exacto
    try {
        const containerIdsRaw = execSync(
            `docker ps -aq --filter "name=^${nodeName}$"`
        )
            .toString()
            .trim();

        const containerIds = containerIdsRaw ? containerIdsRaw.split("\n") : [];

        if (containerIds.length > 0) {
            for (const id of containerIds) {
                let removed = false;
                let attempts = 0;
                while (!removed && attempts < 5) {
                    try {
                        execSync(`docker rm -f ${id}`, { stdio: "inherit" });
                        console.log(`🗑️ Removed node container: ${id}`);
                        removed = true;
                    } catch (err) {
                        attempts++;
                        console.log(
                            `⚠️ Retry removing container ${id} (${attempts}/5)...`
                        );
                        await new Promise((r) => setTimeout(r, 2000));
                    }
                }
                if (!removed) console.warn(`❌ Could not remove container ${id}`);
            }
        } else {
            console.log("No container found for this node");
        }
    } catch (err) {
        console.log("Error removing node container, maybe none running", err);
    }

    // 2. Eliminar carpeta del nodo
    if (fs.existsSync(nodeDir)) {
        fs.rmSync(nodeDir, { recursive: true, force: true });
        console.log(`🗑️ Node directory ${nodeDir} deleted`);
    }

    return {
        success: true,
        message: `Node ${nodeName} from network ${networkName} was deleted successfully.`,
    };
};

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

export const deleteNetwork = async (networkName: string) => {
    if (!networkName) throw new Error("❌ Network name is required");

    const networksDir = path.join(process.cwd(), "src", "lib", "networks", networkName);

    // 1. Eliminar contenedores asociados a la red
    try {
        const containers = execSync(
            `docker ps -aq --filter "label=network=${networkName}"`
        ).toString().trim();

        if (containers) {
            const containerList = containers.split("\n").filter(Boolean).join(" ");
            await runCommand(`docker rm -f ${containerList}`);
            console.log(`🗑️ Removed containers: ${containerList}`);
        } else {
            console.log("No containers to remove");
        }
    } catch (err) {
        console.log("Error removing containers, maybe none running", err);
    }

    // 2. Eliminar la red Docker
    try {
        const networks = execSync(
            `docker network ls --filter "name=${networkName}" --format "{{.Name}}"`
        ).toString().trim();

        if (networks) {
            await runCommand(`docker network rm ${networkName}`);
            console.log(`🗑️ Docker network ${networkName} removed`);
        } else {
            console.log("No networks to remove");
        }
    } catch (err) {
        console.log("Error removing Docker network", err);
    }

    // 3. Eliminar carpeta de la red
    if (fs.existsSync(networksDir)) {
        fs.rmSync(networksDir, { recursive: true, force: true });
        console.log(`🗑️ Directory ${networksDir} deleted`);
    }

    return {
        success: true,
        message: `Network ${networkName} and its nodes were deleted successfully.`,
    };
};

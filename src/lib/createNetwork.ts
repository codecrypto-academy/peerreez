// src/lib/createNetwork.ts
import { execSync } from "child_process";
import path from "path";
import fs from "fs";

interface CreateNetworkParams {
    nameNetwork: string;
    chainId: number;
    subnet: string;
    bootnodeIp?: string; // Se calcula si no se pasa
    rpcPort?: number;    // Por defecto 8888
    founderAccounts: string[];
}

export const createNetwork = (params: CreateNetworkParams) => {
    const {
        nameNetwork,
        chainId,
        subnet,
        founderAccounts,
        rpcPort = 8888,
    } = params;

    // Directorios dentro de lib/networks
    const networksDir = path.join(process.cwd(), "src", "lib", "networks", nameNetwork);
    const bootnodeDir = path.join(networksDir, "bootnode");
    const indexScript = path.join(process.cwd(), "src", "scripts", "index.mjs");

    // Limpiar red anterior
    if (fs.existsSync(networksDir)) fs.rmSync(networksDir, { recursive: true, force: true });

    try {
        const containers = execSync(`docker ps -aq --filter "label=network=${nameNetwork}"`).toString().trim();
        if (containers) {
            execSync(`docker rm -f ${containers}`, { stdio: "inherit" });
        }
    } catch {
        console.log("No containers to remove");
    }

    try {
        const networks = execSync(`docker network ls --filter "name=${nameNetwork}" --format "{{.Name}}"`).toString().trim();
        if (networks) {
            execSync(`docker network rm ${nameNetwork}`, { stdio: "inherit" });
        }
    } catch {
        console.log("No networks to remove");
    }

    // Crear directorios
    fs.mkdirSync(bootnodeDir, { recursive: true });

    // Calcular IP del bootnode automáticamente
    const [a, b, c] = subnet.split(".");
    const bootnodeIp = `${a}.${b}.${c}.20`;

    // Crear llaves del bootnode
    execSync(`node ${indexScript} create-keys ${bootnodeIp} ${bootnodeDir}`, { stdio: "inherit" });

    // Leer dirección del bootnode
    const bootnodeAddress = fs.readFileSync(path.join(bootnodeDir, "address"), "utf8").trim();

    // Crear red Docker
    execSync(
        `docker network create ${nameNetwork} --subnet ${subnet} --label network=${nameNetwork} --label type=besu`,
        { stdio: "inherit" }
    );

    // Construir alloc
    const allocEntries = [bootnodeAddress, ...founderAccounts].map(
        addr => `"${addr}": { "balance": "0x20000000000000000000000000000000000000000000000000000000000000" }`
    ).join(",\n");

    // Crear genesis.json
    fs.writeFileSync(
        path.join(networksDir, "genesis.json"),
        JSON.stringify({
            config: {
                chainId,
                londonBlock: 0,
                clique: {
                    blockperiodseconds: 4,
                    epochlength: 30000,
                    createemptyblocks: true,
                },
            },
            extraData: `0x0000000000000000000000000000000000000000000000000000000000000000${bootnodeAddress}0000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000`,
            gasLimit: "0x1fffffffffffff",
            difficulty: "0x1",
            alloc: JSON.parse(`{${allocEntries}}`),
        }, null, 2)
    );

    // Crear config.toml
    fs.writeFileSync(
        path.join(networksDir, "config.toml"),
        `
genesis-file = "/data/genesis.json"
p2p-host="0.0.0.0"
p2p-port=30303
p2p-enabled=true
rpc-http-enabled=true
rpc-http-host="0.0.0.0"
rpc-http-port=8545
rpc-http-cors-origins=["*"]
rpc-http-api=["ETH", "NET", "CLIQUE", "ADMIN", "TRACE", "DEBUG", "TXPOOL", "PERM"]
host-allowlist=["*"]
`.trim()
    );

    // Lanzar bootnode
    execSync(
        `docker run -d --name ${nameNetwork}-bootnode --label nodo=bootnode --label network=${nameNetwork} --ip ${bootnodeIp} --network ${nameNetwork} -p ${rpcPort}:8545 -v ${networksDir}:/data hyperledger/besu:latest --config-file=/data/config.toml --data-path=/data/bootnode/data --node-private-key-file=/data/bootnode/key.priv --genesis-file=/data/genesis.json`,
        { stdio: "inherit" }
    );

    console.log(`💡 Besu network ${nameNetwork} is starting at http://127.0.0.1:${rpcPort}`);
};

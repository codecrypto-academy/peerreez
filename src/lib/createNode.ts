// src/lib/createNode.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import axios from "axios";

interface CreateNodeParams {
    nodeName: string;
    nodeType: "rpc" | "validator" | "signer";
    networkName: string;
}

// Tipo para respuesta JSON-RPC
interface JsonRpcResponse {
    jsonrpc?: string;
    id?: number;
    result?: any;
    error?: any;
}

export const createNode = async (params: CreateNodeParams) => {
    const { nodeName, nodeType, networkName } = params;

    if (!nodeName || !nodeType || !networkName) {
        throw new Error("❌ Missing parameters: nodeName, nodeType, networkName are required");
    }

    // Directorio de la red dentro de lib/networks
    const networkDir = path.join(process.cwd(), "src", "lib", "networks", networkName);
    if (!fs.existsSync(networkDir)) {
        throw new Error(`❌ Network ${networkName} does not exist`);
    }

    // Obtener subred de la red
    const subnetOutput = execSync(`docker network inspect ${networkName} -f '{{(index .IPAM.Config 0).Subnet}}'`).toString().trim();
    const [a, b, c] = subnetOutput.split(".").map(Number);
    const baseIp = `${a}.${b}.${c}`;

    // Obtener bootnode enode
    const bootnodeEnodePath = path.join(networkDir, "bootnode", "enode");
    if (!fs.existsSync(bootnodeEnodePath)) {
        throw new Error(`❌ Bootnode enode file not found at ${bootnodeEnodePath}`);
    }
    const bootnodeEnode = fs.readFileSync(bootnodeEnodePath, "utf8").trim();

    // Encontrar IP libre en la subred
    let nodeIp = "";
    for (let i = 21; i <= 254; i++) {
        const ip = `${baseIp}.${i}`;
        const output = execSync(`docker network inspect ${networkName}`).toString();
        if (!output.includes(ip)) {
            nodeIp = ip;
            break;
        }
    }
    if (!nodeIp) throw new Error(`❌ No free IP found in network ${networkName}`);
    console.log(`✅ IP assigned for ${nodeName}: ${nodeIp}`);

    // Encontrar puerto HTTP libre
    let availablePort = 8888;
    const dockerPs = execSync("docker ps --format '{{.Ports}}'").toString();
    while (dockerPs.includes(`${availablePort}->`)) {
        availablePort++;
    }
    console.log(`✅ Available HTTP port: ${availablePort}`);

    // Crear carpeta del nodo
    const nodeDir = path.join(networkDir, nodeName);
    fs.mkdirSync(nodeDir, { recursive: true });

    // Crear claves del nodo
    const indexScript = path.join(process.cwd(), "src", "scripts", "index.mjs");
    execSync(`node ${indexScript} create-keys ${nodeIp} ${nodeDir}`, { stdio: "inherit" });

    // Lanzar el nodo
    execSync(
        `docker run -d \
        --name ${nodeName} \
        --label nodo=${nodeName} \
        --label network=${networkName} \
        --ip ${nodeIp} \
        --network ${networkName} \
        -p ${availablePort}:8545 \
        -v ${networkDir}:/data \
        hyperledger/besu:latest \
        --config-file=/data/config.toml \
        --data-path=/data/${nodeName}/data \
        --node-private-key-file=/data/${nodeName}/key.priv \
        --genesis-file=/data/genesis.json \
        --bootnodes="${bootnodeEnode}" \
        --rpc-http-host=0.0.0.0 \
        --rpc-http-port=8545 \
        --rpc-http-enabled=true \
        --rpc-http-cors-origins="*" \
        --rpc-http-api=ETH,NET,CLIQUE,ADMIN,TRACE,DEBUG,TXPOOL,PERM \
        --host-allowlist="*"`,
        { stdio: "inherit" }
    );

    console.log(`🎉 Node ${nodeName} (${nodeType}) deployed at IP ${nodeIp}, HTTP port ${availablePort}`);

    // Esperar a que el nodo responda
    console.log(`⏳ Waiting for node to respond at http://127.0.0.1:${availablePort}...`);
    let nodeReady = false;
    while (!nodeReady) {
        try {
            await axios.post<JsonRpcResponse>(`http://127.0.0.1:${availablePort}`, {
                jsonrpc: "2.0",
                method: "net_version",
                params: [],
                id: 1
            });
            nodeReady = true;
        } catch {
            await new Promise(r => setTimeout(r, 3000));
        }
    }
    console.log("✅ Node is active!");

    // Validación según tipo
    console.log(`🔍 Validating node ${nodeName} as ${nodeType}...`);
    switch (nodeType) {
        case "rpc": {
            const rpcResp = await axios.post<JsonRpcResponse>(`http://127.0.0.1:${availablePort}`, {
                jsonrpc: "2.0",
                method: "net_version",
                params: [],
                id: 1
            });
            if (rpcResp.data.result) {
                console.log(`✅ RPC node responds correctly: ${JSON.stringify(rpcResp.data)}`);
            } else {
                console.error("❌ RPC node did not respond correctly");
            }
            break;
        }
        case "validator": {
            const valResp = execSync(`docker exec ${nodeName} besu public-key export 2>/dev/null`).toString().trim();
            if (valResp) {
                console.log(`✅ Validator node active, public key: ${valResp}`);
            } else {
                console.error("❌ Validator node did not respond correctly");
            }
            break;
        }
        case "signer": {
            let signerResp: JsonRpcResponse | null = null;
            try {
                const resp = await axios.post<JsonRpcResponse>(`http://127.0.0.1:${availablePort}`, {
                    jsonrpc: "2.0",
                    method: "net_version",
                    params: [],
                    id: 1
                });
                signerResp = resp.data;
            } catch {
                signerResp = null;
            }
            if (signerResp?.result) {
                const pubKey = execSync(`docker exec ${nodeName} besu public-key export 2>/dev/null`).toString().trim();
                if (pubKey) {
                    console.log(`✅ Signer node active, public key: ${pubKey}`);
                } else {
                    console.warn("⚠️ Signer node active but no signing key detected");
                }
            } else {
                console.error("❌ Signer node did not respond correctly");
            }
            break;
        }
    }
};

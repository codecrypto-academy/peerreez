import pkg from "elliptic";
import Docker from "dockerode";
const { ec: EC } = pkg;
import { ethers } from "ethers";
import { Buffer } from "buffer";
import keccak256 from "keccak256";

// ================= FUNCIONES DE UTILIDAD =================
// Obtiene las redes Besu y sus nodos usando Dockerode
export async function getNetworks() {
    const docker = new Docker();
    const allNetworks = await docker.listNetworks();
    const allContainers = await docker.listContainers({ all: true });

    // Busca redes que tengan al menos un contenedor Besu asociado
    const result = [];
    for (const net of allNetworks) {
        // Busca contenedores que estén conectados a esta red y sean de imagen Besu
        const nodes = allContainers.filter(cont => {
            // Verifica si el contenedor está en la red
            const inNetwork = cont.Names && cont.Names.some(n => n.includes(net.Name));
            // Verifica si el contenedor es de imagen Besu
            const isBesu = cont.Image && cont.Image.includes('besu');
            return inNetwork && isBesu;
        }).map(cont => ({
            id: cont.Id,
            name: cont.Names?.[0]?.replace(/\//, "") || cont.Id,
            status: cont.State,
            ports: cont.Ports
        })).sort((a, b) => a.name.localeCompare(b.name)); // Ordenar nodos alfabéticamente

        if (nodes.length > 0) {
            // Obtiene chainId leyendo genesis.json del bootnode
            let chainId = null;
            try {
                // Asume estructura: src/lib/networks/[networkName]/genesis.json
                const fs = await import('fs/promises');
                const path = await import('path');
                const { fileURLToPath } = await import('url');
                const __dirname = path.dirname(fileURLToPath(import.meta.url));
                const genesisPath = path.join(__dirname, 'networks', net.Name, 'genesis.json');
                const genesisRaw = await fs.readFile(genesisPath, 'utf8');
                const genesis = JSON.parse(genesisRaw);
                if (genesis.config && genesis.config.chainId) {
                    chainId = genesis.config.chainId;
                }
            } catch (e) {
                // Si falla, chainId queda null
            }
            result.push({
                name: net.Name,
                chainId,
                nodes
            });
        }
    }
    // Ordenar las redes alfabéticamente por nombre
    return result.sort((a, b) => a.name.localeCompare(b.name));
}
/** Realiza una llamada JSON-RPC a un nodo. */
export async function rpcCall(url: string, method: string, params: any[]): Promise<any> {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
    });
    return await res.json();
}

/** Genera un par de claves para un nodo y retorna datos importantes. */
export function generateNodeKeys(ip: string) {
    const keygen = new EC("secp256k1");
    const pair = keygen.genKeyPair();
    const privateKey = pair.getPrivate("hex");
    const publicKey = pair.getPublic("hex");
    const pubBuffer = keccak256(Buffer.from(publicKey.slice(2), "hex"));
    const address = pubBuffer.toString("hex").slice(-40);
    const enode = `enode://${publicKey.slice(2)}@${ip}:30303`;
    return { privateKey, publicKey, address, enode };
}

/** Obtiene el balance de una dirección en wei. */
export async function getEthBalance(url: string, address: string): Promise<bigint> {
    const data = await rpcCall(url, "eth_getBalance", [address, "latest"]);
    return BigInt(data.result);
}

/** Envía ETH de una cuenta a otra con manejo de reintentos. */
export async function sendTransaction(url: string, fromPriv: string, to: string, amount: number, retries = 5): Promise<{ hash: string }> {
    for (let i = 0; i < retries; i++) {
        try {
            const provider = new ethers.JsonRpcProvider(url);
            await provider.getBlockNumber();
            const wallet = new ethers.Wallet(fromPriv, provider);
            const nonce = await provider.getTransactionCount(wallet.address, "pending");
            const gasPrice = ethers.parseUnits((50 * (1 + i * 0.2)).toFixed(0), "gwei");
            const tx = await wallet.sendTransaction({
                to,
                value: ethers.parseEther(amount.toString()),
                gasLimit: 21000,
                nonce,
                gasPrice,
                type: 0,
            });
            return { hash: tx.hash };
        } catch (err: any) {
            if (i === retries - 1) throw err;
            await new Promise(r => setTimeout(r, 5000));
        }
    }
    throw new Error("No se pudo enviar la transacción");
}

/** Obtiene información básica de la red (version y peers) */
export async function getNetworkStatus(url: string): Promise<{ version: any, peerCount: any }> {
    const version = await rpcCall(url, "net_version", []);
    const peerCount = await rpcCall(url, "net_peerCount", []);
    return { version, peerCount };
}

/** Deriva N cuentas desde un mnemonic */
export function deriveAccounts(mnemonic: string, count = 10): Array<{ address: string, privateKey: string }> {
    const accounts = [];
    const basePath = "m/44'/60'/0'/0";
    for (let i = 0; i < count; i++) {
        const node = ethers.HDNodeWallet.fromMnemonic(
            ethers.Mnemonic.fromPhrase(mnemonic),
            `${basePath}/${i}`
        );
        accounts.push({ address: node.address, privateKey: node.privateKey });
    }
    return accounts;
}

/** Fundea cuentas derivadas de un mnemonic */
export async function fundMnemonic(fromPriv: string, mnemonic: string, amount: number, rpcUrl = "http://localhost:8888") {
    await rpcCall(rpcUrl, "eth_blockNumber", []).catch(async () => {
        await new Promise(r => setTimeout(r, 10000));
    });
    const accounts = deriveAccounts(mnemonic, 10);
    accounts.forEach((acc, i) => console.log(`${i + 1}: ${acc.address}`));
    for (const acc of accounts) {
        let success = false;
        for (let attempt = 1; attempt <= 3 && !success; attempt++) {
            try {
                console.log(`💸 Enviando ${amount} ETH a ${acc.address} (intento ${attempt}/3)`);
                const tx = await sendTransaction(rpcUrl, fromPriv, acc.address, amount, 5);
                console.log(`✅ Enviado: ${tx.hash}`);
                success = true;
            } catch (e: any) {
                console.error(`❌ Error en intento ${attempt}: ${e.message}`);
                if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
            }
            await new Promise(r => setTimeout(r, 6000));
            try { const b = await getEthBalance(rpcUrl, acc.address); console.log(`💰 Balance: ${ethers.formatEther(b)} ETH`); } catch { }
        }
    }
}

// ================= CLI COMPATIBLE =================

if (typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('operations.ts')) {
    (async () => {
        const args = process.argv.slice(2);
        const cmd = args[0];
        switch (cmd) {
            case "create-keys": {
                const ip = args[1];
                if (!ip) return console.error("IP requerida para create-keys");
                const keys = generateNodeKeys(ip);
                const fs = await import('fs/promises');
                await fs.writeFile("./key.priv", keys.privateKey);
                await fs.writeFile("./key.pub", keys.publicKey);
                await fs.writeFile("./address", keys.address);
                await fs.writeFile("./enode", keys.enode);
                console.log("✅ Claves generadas correctamente");
                break;
            }
            case "network-info": {
                const url = args[1] || "http://localhost:8888";
                const info = await getNetworkStatus(url);
                console.log("🌐 Info de red:", info);
                break;
            }
            case "balance": {
                const address = args[1];
                const url = args[2] || "http://localhost:8888";
                if (!address) return console.error("Uso: balance <address> [url]");
                const balance = await getEthBalance(url, address);
                console.log(`💰 Balance: ${ethers.formatEther(balance)} ETH`);
                break;
            }
            case "transfer": {
                const [fromPriv, to, amount, url = "http://localhost:8888"] = args.slice(1);
                if (!fromPriv || !to || !amount)
                    return console.error("Uso: transfer <fromPriv> <to> <amount> [url]");
                const tx = await sendTransaction(url, fromPriv, to, Number(amount));
                console.log("✅ Tx enviada:", tx);
                break;
            }
            case "fund-mnemonic": {
                const [fromPriv, mnemonic, amount, rpcUrl = "http://localhost:8888"] = args.slice(1);
                if (!fromPriv || !mnemonic || !amount)
                    return console.error("Uso: fund-mnemonic <fromPriv> <mnemonic> <amount> [rpcUrl]");
                await fundMnemonic(fromPriv, mnemonic, Number(amount), rpcUrl);
                break;
            }
            default:
                console.log(`\nComandos disponibles:\n    create-keys <ip>     - Crear claves del nodo\n    network-info [url]   - Info de la red\n    balance <address>    - Balance de una cuenta\n    transfer <fromPriv> <to> <amount> - Transferir ETH\n    fund-mnemonic <fromPriv> <mnemonic> <amount> [rpcUrl] - Fundar cuentas desde mnemonic\n`);
        }
    })().catch(console.error);
}

import pkg from "elliptic";
const { ec: EC } = pkg;
import { ethers } from "ethers";
import { Buffer } from "buffer";
import keccak256 from "keccak256";
import fs from "fs";

/* ============================================================================
   🎨 FUNCIONES DE UTILIDAD
============================================================================ */

/** Realiza una llamada JSON-RPC a un nodo.
 * @param {string} url - URL del nodo JSON-RPC.
 * @param {string} method - Método RPC (ej. "eth_getBalance").
 * @param {Array} params - Parámetros del método.
 * @returns {Promise<Object>} Respuesta de la API
 */
async function rpcCall(url, method, params) {
    const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", method, params, id: 1 }),
    });
    return await res.json();
}

/** Genera un par de claves para un nodo y retorna datos importantes.
 * @param {string} ip - IP del nodo
 * @returns {{privateKey:string, publicKey:string, address:string, enode:string}}
 */
function generateNodeKeys(ip) {
    const keygen = new EC("secp256k1");
    const pair = keygen.genKeyPair();
    const privateKey = pair.getPrivate("hex");
    const publicKey = pair.getPublic("hex");
    const pubBuffer = keccak256(Buffer.from(publicKey.slice(2), "hex"));
    const address = pubBuffer.toString("hex").slice(-40);
    const enode = `enode://${publicKey.slice(2)}@${ip}:30303`;
    return { privateKey, publicKey, address, enode };
}

/** Obtiene el balance de una dirección en wei.
 * @param {string} url - URL del nodo RPC
 * @param {string} address - Dirección de Ethereum
 * @returns {Promise<bigint>}
 */
async function getEthBalance(url, address) {
    const data = await rpcCall(url, "eth_getBalance", [address, "latest"]);
    return BigInt(data.result);
}

/** Envía ETH de una cuenta a otra con manejo de reintentos.
 * @param {string} url - Nodo RPC
 * @param {string} fromPriv - Clave privada del remitente
 * @param {string} to - Dirección del receptor
 * @param {number} amount - Cantidad en ETH
 * @param {number} retries - Intentos en caso de fallo
 * @returns {Promise<{hash:string}>}
 */
async function sendTransaction(url, fromPriv, to, amount, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const provider = new ethers.JsonRpcProvider(url);
            await provider.getBlockNumber();

            const wallet = new ethers.Wallet(fromPriv, provider);
            const nonce = await provider.getTransactionCount(wallet.address, "pending");
            console.log(`🔹 Nonce usado: ${nonce} para tx a ${to}`);

            const gasPrice = ethers.parseUnits((50 * (1 + i * 0.2)).toFixed(0), "gwei");
            console.log(`💰 Gas price: ${ethers.formatUnits(gasPrice, "gwei")} gwei`);

            const tx = await wallet.sendTransaction({
                to,
                value: ethers.parseEther(amount.toString()),
                gasLimit: 21000,
                nonce,
                gasPrice,
                type: 0, // Legacy tx
            });

            console.log(`✅ Tx enviada: ${tx.hash}`);
            return { hash: tx.hash };
        } catch (err) {
            console.error(`❌ Intento ${i + 1} fallido: ${err.message}`);
            if (i === retries - 1) throw err;
            console.log(`⏳ Esperando 5s antes del siguiente intento...`);
            await new Promise(r => setTimeout(r, 5000));
        }
    }
}

/** Obtiene información básica de la red (version y peers)
 * @param {string} url
 * @returns {Promise<{version:string, peerCount:string}>}
 */
async function getNetworkStatus(url) {
    const version = await rpcCall(url, "net_version", []);
    const peerCount = await rpcCall(url, "net_peerCount", []);
    return { version, peerCount };
}

/** Deriva N cuentas desde un mnemonic
 * @param {string} mnemonic
 * @param {number} count
 * @returns {Array<{address:string, privateKey:string}>}
 */
function deriveAccounts(mnemonic, count = 10) {
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

/* ============================================================================
   🎛 CLI
============================================================================ */

async function main() {
    const args = process.argv.slice(2);
    const cmd = args[0];

    switch (cmd) {
        case "create-keys": {
            const ip = args[1];
            if (!ip) return console.error("IP requerida para create-keys");
            const keys = generateNodeKeys(ip);
            fs.writeFileSync("./key.priv", keys.privateKey);
            fs.writeFileSync("./key.pub", keys.publicKey);
            fs.writeFileSync("./address", keys.address);
            fs.writeFileSync("./enode", keys.enode);
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
            const tx = await sendTransaction(url, fromPriv, to, amount);
            console.log("✅ Tx enviada:", tx);
            break;
        }
        case "fund-mnemonic": {
            const [fromPriv, mnemonic, amount, rpcUrl = "http://localhost:8888"] = args.slice(1);
            if (!fromPriv || !mnemonic || !amount)
                return console.error("Uso: fund-mnemonic <fromPriv> <mnemonic> <amount> [rpcUrl]");

            console.log("🔎 Verificando nodo...");
            try { await rpcCall(rpcUrl, "eth_blockNumber", []); } catch { console.log("⏳ Nodo no listo, esperando 10s..."); await new Promise(r => setTimeout(r, 10000)); }

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
                    } catch (e) {
                        console.error(`❌ Error en intento ${attempt}: ${e.message}`);
                        if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
                    }
                    await new Promise(r => setTimeout(r, 6000));
                    try { const b = await getEthBalance(rpcUrl, acc.address); console.log(`💰 Balance: ${ethers.formatEther(b)} ETH`); } catch { }
                }
            }
            break;
        }
        default:
            console.log(`
Comandos disponibles:
    create-keys <ip>     - Crear claves del nodo
    network-info [url]   - Info de la red
    balance <address>    - Balance de una cuenta
    transfer <fromPriv> <to> <amount> - Transferir ETH
    fund-mnemonic <fromPriv> <mnemonic> <amount> [rpcUrl] - Fundar cuentas desde mnemonic
            `);
    }
}

if (import.meta.url === new URL(import.meta.url).href) {
    main().catch(console.error);
}

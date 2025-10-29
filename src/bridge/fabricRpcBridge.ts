/**
 * fabricRpcBridge.ts (moved under src/bridge)
 */

import express from 'express';
import type { Request, Response } from 'express';

// This shim is intentionally lightweight: it exposes just enough JSON-RPC methods
// for MetaMask to add a custom network and to read balances by delegating to the
// bridge server running on port 3001. The bridge server is responsible for
// resolving EOA -> Fabric identity mappings (addressToFabric.json) and for
// querying Fabric via /query.

const app = express();
app.use(express.json());

// Simple CORS allow-all to let MetaMask reach this shim from the browser
app.use((req: Request, res: Response, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') return res.sendStatus(204);
    next();
});

const RPC_PORT = 7844;
const CHAIN_ID_DEC = 334455;
const CHAIN_ID_HEX = '0x51a77';
const NETWORK_NAME = 'bridge-fabric';

const BRIDGE_URL = process.env.BRIDGE_URL || 'http://localhost:3001';

async function fetchJson(url: string, opts: Record<string, unknown> = {}) {
    // Use global fetch (Node 18+) when available
    const gw = globalThis as unknown as { fetch?: (...args: unknown[]) => Promise<unknown>, nodeFetch?: (...args: unknown[]) => Promise<unknown> };
    const fn = gw.fetch || gw.nodeFetch;
    if (!fn) throw new Error('fetch is not available in this Node runtime');
    const r = await (fn as (...args: unknown[]) => Promise<unknown>)(url, opts);
    return (r as { json: () => Promise<unknown> }).json();
}

// Helper to query the bridge for mapped Fabric identity
async function resolveMapping(address: string): Promise<string | null> {
    try {
        const url = `${BRIDGE_URL}/map/${encodeURIComponent(address)}`;
        const json = await fetchJson(url, { method: 'GET' }) as Record<string, unknown> | null;
        if (json && json['success'] && json['fabricIdentity']) return String(json['fabricIdentity']);
        // Some bridge versions return { success:true, fabricIdentity: <string> }
        if (json && json['success'] && json['address'] && json['fabricIdentity']) return String(json['fabricIdentity']);
    } catch (err) {
        console.warn('[fabricRpcBridge] resolveMapping (bridge) error', String(err));
    }

    // Fallback: try to read local addressToFabric.json (useful in single-machine dev setups)
    try {

        const fs = require('fs');
        const path = require('path');
        const file = path.join(__dirname, 'addressToFabric.json');
        if (fs.existsSync(file)) {
            const raw = fs.readFileSync(file, 'utf8');
            const parsed = JSON.parse(raw || '{}');
            const key = (address || '').toLowerCase();
            if (parsed && parsed[key]) return parsed[key];
        }
    } catch {
        // ignore
    }

    return null;
}

// Ask bridge to query Fabric chaincode
async function queryBridge(functionName: string, args: string[] = []) {
    try {
        const url = new URL(`${BRIDGE_URL}/query`);
        url.searchParams.set('functionName', functionName);
        if (args && args.length > 0) url.searchParams.set('args', JSON.stringify(args));
        const json = await fetchJson(url.toString(), { method: 'GET' });
        return json;
    } catch (err) {
        console.warn('[fabricRpcBridge] queryBridge error', String(err));
        return null;
    }
}

app.post('/', async (req: Request, res: Response) => {
    const body = req.body;
    const id = body?.id ?? null;
    const method = body?.method;
    const params = body?.params;

    try {
        if (!method) return res.json({ jsonrpc: '2.0', id, error: { code: -32600, message: 'Invalid Request' } });

        switch (method) {
            case 'web3_clientVersion':
                return res.json({ jsonrpc: '2.0', id, result: `${NETWORK_NAME}/1.0` });
            case 'net_version':
                return res.json({ jsonrpc: '2.0', id, result: String(CHAIN_ID_DEC) });
            case 'eth_chainId':
            case 'eth_getChainId':
                return res.json({ jsonrpc: '2.0', id, result: CHAIN_ID_HEX });
            case 'net_listening':
                return res.json({ jsonrpc: '2.0', id, result: true });
            case 'eth_accounts':
                // This shim doesn't manage accounts. Return empty array.
                return res.json({ jsonrpc: '2.0', id, result: [] });
            case 'eth_getBalance': {
                const address = Array.isArray(params) ? params[0] : params;
                if (!address || typeof address !== 'string') return res.json({ jsonrpc: '2.0', id, result: '0x0' });
                // Try to resolve mapping via bridge
                let fabricIdentity = await resolveMapping(address);
                if (!fabricIdentity) {
                    // Try a direct local-file lookup as a last resort (dev convenience)
                    try {

                        const fs = require('fs');
                        const path = require('path');
                        const file = path.join(__dirname, 'addressToFabric.json');
                        if (fs.existsSync(file)) {
                            const raw = fs.readFileSync(file, 'utf8');
                            const parsed = JSON.parse(raw || '{}');
                            const key = (address || '').toLowerCase();
                            if (parsed && parsed[key]) fabricIdentity = parsed[key];
                        }
                    } catch { /* ignore */ }
                }
                if (!fabricIdentity) {
                    // mapping not found -> zero balance
                    return res.json({ jsonrpc: '2.0', id, result: '0x0' });
                }
                // Query GetBalance for the resolved fabric identity
                const q = await queryBridge('GetBalance', [fabricIdentity]) as Record<string, unknown> | null;
                if (!q || !q['success']) return res.json({ jsonrpc: '2.0', id, result: '0x0' });
                // Expect q.data to be a numeric string or number (token units)
                let balanceToken: bigint = BigInt(0);
                try {
                    const raw = q['data'] ?? q['result'] ?? q['payload'] ?? null;
                    const s = String(raw);
                    // allow JSON objects like { balance: '10' }
                    try {
                        const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
                        if (parsed && typeof parsed === 'object' && 'balance' in parsed) {
                            balanceToken = BigInt(parsed.balance);
                        }
                    } catch { /* ignore */ }
                    if (balanceToken === BigInt(0)) {
                        // fallback: try to parse as plain number string
                        const candidate = s.replace(/[^0-9-]/g, '');
                        if (candidate.length > 0) balanceToken = BigInt(candidate);
                    }
                } catch {
                    balanceToken = BigInt(0);
                }

                // Convert token units to wei-like (assume token has 18 decimals)
                const WEI_MULT = BigInt('1000000000000000000');
                const wei = balanceToken * WEI_MULT;
                const hex = '0x' + wei.toString(16);
                return res.json({ jsonrpc: '2.0', id, result: hex });
            }
            case 'eth_blockNumber':
                // No blockchain head tracking in this shim — return 0
                return res.json({ jsonrpc: '2.0', id, result: '0x0' });
            case 'eth_getBlockByNumber': {
                const full = Array.isArray(params) ? params[1] : false;
                // Minimal block object so wallets are satisfied
                const block = {
                    number: '0x0',
                    hash: '0x' + '0'.repeat(64),
                    parentHash: '0x' + '0'.repeat(64),
                    nonce: '0x' + '0'.repeat(16),
                    sha3Uncles: '0x' + '0'.repeat(64),
                    logsBloom: '0x' + '0'.repeat(512),
                    transactionsRoot: '0x' + '0'.repeat(64),
                    stateRoot: '0x' + '0'.repeat(64),
                    receiptsRoot: '0x' + '0'.repeat(64),
                    miner: '0x' + '0'.repeat(40),
                    difficulty: '0x0',
                    totalDifficulty: '0x0',
                    extraData: '0x',
                    size: '0x0',
                    gasLimit: '0x0',
                    gasUsed: '0x0',
                    timestamp: '0x0',
                    transactions: full ? [] : [],
                    uncles: []
                };
                return res.json({ jsonrpc: '2.0', id, result: block });
            }
            case 'eth_getBlockByHash': {
                // mirror getBlockByNumber minimal response
                const block = {
                    number: '0x0',
                    hash: '0x' + '0'.repeat(64),
                    parentHash: '0x' + '0'.repeat(64),
                    nonce: '0x' + '0'.repeat(16),
                    sha3Uncles: '0x' + '0'.repeat(64),
                    logsBloom: '0x' + '0'.repeat(512),
                    transactionsRoot: '0x' + '0'.repeat(64),
                    stateRoot: '0x' + '0'.repeat(64),
                    receiptsRoot: '0x' + '0'.repeat(64),
                    miner: '0x' + '0'.repeat(40),
                    difficulty: '0x0',
                    totalDifficulty: '0x0',
                    extraData: '0x',
                    size: '0x0',
                    gasLimit: '0x0',
                    gasUsed: '0x0',
                    timestamp: '0x0',
                    transactions: [],
                    uncles: []
                };
                return res.json({ jsonrpc: '2.0', id, result: block });
            }
            case 'eth_getCode':
                // No contracts on this shim
                return res.json({ jsonrpc: '2.0', id, result: '0x' });
            default:
                return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
        }
    } catch (err: unknown) {
        console.error('[fabricRpcBridge] Error handling RPC:', err instanceof Error ? err : String(err));
        return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: err instanceof Error ? err.message : String(err) } });
    }
});

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', network: NETWORK_NAME, chainId: CHAIN_ID_DEC }));

const server = app.listen(RPC_PORT, '0.0.0.0', () => {
    console.log(`[fabricRpcBridge] JSON-RPC shim listening on http://0.0.0.0:${RPC_PORT} for network ${NETWORK_NAME} (chainId=${CHAIN_ID_DEC})`);
    console.log(`[fabricRpcBridge] Using bridge URL: ${BRIDGE_URL}`);
});

export function closeRpcBridge(done?: () => void) {
    server.close(() => {
        console.log('[fabricRpcBridge] Server closed');
        if (done) done();
    });
}

export default app;

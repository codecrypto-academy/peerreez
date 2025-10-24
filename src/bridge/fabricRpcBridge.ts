/**
 * fabricRpcBridge.ts (moved under src/bridge)
 */

import express from 'express';
import type { Request, Response } from 'express';

let gatewayService: any = null;
let contract: any = null;
try {
    // from src/bridge, gateway service is at ../lib/...
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const gs = require('../lib/fabric/gateway/gateway-service');
    if (gs && gs.gatewayService) gatewayService = gs.gatewayService;
} catch (err) {
    // ignore
}

const app = express();
app.use(express.json());

const RPC_PORT = 8545;
const CHAIN_ID_DEC = 334455;
const CHAIN_ID_HEX = '0x51a77';
const NETWORK_NAME = 'bridge-fabric';

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
            case 'fabric_invoke': {
                const p = Array.isArray(params) ? params[0] : params;
                const message = p?.message;
                const signature = p?.signature;
                const functionName = p?.functionName;
                const args = p?.args ?? [];
                const role = p?.role ?? 'Producer';
                if (!message || !signature) return res.json({ jsonrpc: '2.0', id, error: { code: -32602, message: 'Missing message or signature' } });
                try {
                    if (gatewayService && typeof gatewayService.submitTransactionWithIdentity === 'function') {
                        const result = await gatewayService.submitTransactionWithIdentity(role, /*identitySelector=*/null, functionName, ...(Array.isArray(args) ? args : []));
                        return res.json({ jsonrpc: '2.0', id, result });
                    }
                    if (contract && typeof contract.submitTransaction === 'function') {
                        const resultBytes = await contract.submitTransaction(functionName, ...(Array.isArray(args) ? args : []));
                        const resultString = Buffer.from(resultBytes || '').toString('utf8');
                        let data: any = resultString;
                        try { data = JSON.parse(resultString); } catch { }
                        return res.json({ jsonrpc: '2.0', id, result: data });
                    }
                    return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: 'Fabric gateway not available on server' } });
                } catch (err: any) {
                    return res.json({ jsonrpc: '2.0', id, error: { code: -32000, message: String(err?.message || err) } });
                }
            }
            default:
                return res.json({ jsonrpc: '2.0', id, error: { code: -32601, message: 'Method not found' } });
        }
    } catch (err: any) {
        return res.json({ jsonrpc: '2.0', id, error: { code: -32603, message: String(err?.message || err) } });
    }
});

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok', network: NETWORK_NAME, chainId: CHAIN_ID_DEC }));

const server = app.listen(RPC_PORT, () => {
    console.log(`[fabricRpcBridge] JSON-RPC shim listening on http://localhost:${RPC_PORT} for network ${NETWORK_NAME} (chainId=${CHAIN_ID_DEC})`);
});

export function closeRpcBridge(done?: () => void) {
    server.close(() => {
        console.log('[fabricRpcBridge] Server closed');
        if (done) done();
    });
}

export default app;

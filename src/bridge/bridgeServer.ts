/**
 * bridgeServer.ts (moved under src/bridge)
 */

import express, { Request, Response } from 'express';
import { getMapping, setMapping } from './identityMapper';
import { verifyMessage } from 'ethers';
import type { Contract } from '@hyperledger/fabric-network';

// Lightweight interface for the parts of gatewayService we use
interface IGatewayService {
    submitTransactionWithIdentity?: (role: string, identitySelector: string, functionName: string, ...args: string[]) => Promise<unknown>;
    submitTransaction?: (role: string, functionName: string, ...args: string[]) => Promise<unknown>;
    evaluateTransaction?: (role: string, functionName: string, ...args: string[]) => Promise<unknown>;
    closeAllConnections?: () => void;
}

// Fabric contract (if injected)
let contract: Contract | null = null;
// Optional gateway service wrapper
let gatewayService: IGatewayService | null = null;

// In-memory nonce store to prevent replay attacks. Map nonce -> expiryTimestamp
const usedNonces = new Map<string, number>();
const NONCE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Periodic cleanup of expired nonces
setInterval(() => {
    const now = Date.now();
    for (const [nonce, expiry] of usedNonces.entries()) {
        if (expiry <= now) usedNonces.delete(nonce);
    }
}, 60 * 1000);

// Attempt to auto-load the project's gatewayService if available at runtime.
try {
    // NOTE: when this file is located at src/bridge, the gateway service is at ../lib/...

    const gs = require('../lib/fabric/gateway/gateway-service');
    if (gs && gs.gatewayService) {
        gatewayService = gs.gatewayService as IGatewayService;
        console.log('[bridgeServer] Loaded gatewayService from src/lib/fabric/gateway/gateway-service');
    }
} catch {
    // ignore - can be injected later via setGatewayService
}

export function setContract(c: Contract) {
    contract = c;
}

export function setGatewayService(gs: IGatewayService) {
    gatewayService = gs;
}

export const app = express();
app.use(express.json());

app.get('/health', (_req: Request, res: Response) => res.json({ status: 'ok' }));

app.post('/invoke', async (req: Request, res: Response) => {
    try {
        const { message, signature, functionName, args = [], role = 'Producer' } = req.body || {};

        if (!message || !signature || !functionName) {
            return res.status(400).json({ success: false, error: 'Missing required fields: message, signature, functionName' });
        }

        if (!Array.isArray(args)) {
            return res.status(400).json({ success: false, error: 'args must be an array' });
        }

        let signerAddress: string;
        try {
            signerAddress = verifyMessage(message, signature);
            console.log(`[bridgeServer] Signature verified for address ${signerAddress}`);
        } catch (err: unknown) {
            console.error('[bridgeServer] Signature verification failed:', err);
            return res.status(400).json({ success: false, error: 'Invalid signature' });
        }

        let signedPayload: unknown = null;
        try { signedPayload = JSON.parse(message); } catch { signedPayload = null; }

        if (signedPayload && typeof signedPayload === 'object') {
            const sp = signedPayload as Record<string, unknown>;
            const nonce = sp['nonce'];
            const timestamp = sp['timestamp'];
            const fnInMsg = sp['functionName'];
            const argsInMsg = sp['args'];
            if (typeof timestamp === 'number') {
                const now = Date.now();
                const age = Math.abs(now - timestamp);
                if (age > NONCE_TTL_MS) return res.status(400).json({ success: false, error: 'Signed message timestamp is outside the allowed window' });
            }
            if (typeof nonce === 'string') {
                if (usedNonces.has(nonce)) return res.status(400).json({ success: false, error: 'Replay detected: nonce already used' });
                usedNonces.set(nonce, Date.now() + NONCE_TTL_MS);
            }
            if (fnInMsg && functionName && fnInMsg !== functionName) return res.status(400).json({ success: false, error: 'Signed functionName does not match provided functionName' });
            if (Array.isArray(argsInMsg) && Array.isArray(args) && JSON.stringify(argsInMsg) !== JSON.stringify(args)) return res.status(400).json({ success: false, error: 'Signed args do not match provided args' });
        }

        const mappedIdentity = await getMapping(signerAddress);
        if (mappedIdentity && gatewayService && typeof gatewayService.submitTransactionWithIdentity === 'function') {
            console.log('[bridgeServer] Using mapped identity', mappedIdentity);
            const txResult = await gatewayService.submitTransactionWithIdentity(role, mappedIdentity, functionName, ...args);
            const tx = txResult as { success?: boolean; error?: string; data?: unknown };
            if (!tx || typeof tx !== 'object') return res.status(500).json({ success: false, error: 'gatewayService returned unexpected result' });
            if (!tx.success) return res.status(500).json({ success: false, error: tx.error || 'Transaction failed' });
            return res.json({ success: true, data: tx.data, signer: signerAddress, usedIdentity: mappedIdentity });
        }

        const c = contract as { submitTransaction?: (...args: string[]) => Promise<unknown> } | null;
        if (c && typeof c.submitTransaction === 'function') {
            const resultBytes = await c.submitTransaction(functionName, ...args);
            const resultString = Buffer.from(resultBytes as string | ArrayLike<number> || '').toString('utf8');
            let data: unknown; try { data = JSON.parse(resultString); } catch { data = resultString; }
            return res.json({ success: true, data, signer: signerAddress });
        }

        return res.status(500).json({ success: false, error: 'Fabric contract not initialized on server' });
    } catch (err) {
        console.error('[bridgeServer] Unexpected error in /invoke:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

const setMap = setMapping;
app.post('/map', async (req: Request, res: Response) => {
    try {
        const { address, fabricIdentity } = req.body || {};
        if (!address || !fabricIdentity) return res.status(400).json({ success: false, error: 'address and fabricIdentity required' });
        await setMap(address, fabricIdentity);
        return res.json({ success: true });
    } catch (err) {
        console.error('[bridgeServer] Error setting mapping:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/map/:address', async (req: Request, res: Response) => {
    try {
        const address = req.params.address;
        if (!address) return res.status(400).json({ success: false, error: 'address required' });
        const mapped = await getMapping(address);
        return res.json({ success: true, address, fabricIdentity: mapped });
    } catch (err) {
        console.error('[bridgeServer] Error getting mapping:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

app.get('/query', async (req: Request, res: Response) => {
    try {
        const functionName = (req.query.functionName as string) || (req.body && req.body.functionName);
        let args: unknown = req.query.args || (req.body && req.body.args) || [];
        const role = (req.query.role as string) || (req.body && req.body.role) || 'Producer';
        if (!functionName) return res.status(400).json({ success: false, error: 'Missing required parameter: functionName' });
        if (typeof args === 'string') {
            try { const parsed = JSON.parse(args); if (Array.isArray(parsed)) args = parsed; else args = (args as string).split(',').map(a => a.trim()).filter(a => a.length > 0); } catch { args = (args as string).split(',').map(a => a.trim()).filter(a => a.length > 0); }
        }
        if (!Array.isArray(args)) args = [];
        if (gatewayService && typeof gatewayService.evaluateTransaction === 'function') {
            const txResult = await gatewayService.evaluateTransaction(role, functionName, ...(args as string[]));
            const txq = txResult as { success?: boolean; error?: string; data?: unknown };
            if (!txq || typeof txq !== 'object') return res.status(500).json({ success: false, error: 'gatewayService returned unexpected result' });
            if (!txq.success) return res.status(500).json({ success: false, error: txq.error || 'Query failed' });
            return res.json({ success: true, data: txq.data });
        }
        const c2 = contract as { evaluateTransaction?: (...args: string[]) => Promise<unknown> } | null;
        if (c2 && typeof c2.evaluateTransaction === 'function') {
            const resultBytes = await c2.evaluateTransaction(functionName, ...(args as string[]));
            const resultString = Buffer.from(resultBytes as string | ArrayLike<number> || '').toString('utf8');
            let data: unknown; try { data = JSON.parse(resultString); } catch { data = resultString; }
            return res.json({ success: true, data });
        }
        return res.status(500).json({ success: false, error: 'Fabric contract not initialized on server' });
    } catch (err) {
        console.error('[bridgeServer] Unexpected error in /query:', err);
        return res.status(500).json({ success: false, error: 'Internal server error' });
    }
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 3001;
export const server = app.listen(PORT, () => {
    console.log(`[bridgeServer] Listening on port ${PORT}`);
});

export function closeServer(done?: () => void) {
    server.close(() => {
        console.log('[bridgeServer] Server closed');
        if (gatewayService && typeof gatewayService.closeAllConnections === 'function') {
            try { gatewayService.closeAllConnections(); } catch { /* ignore */ }
        }
        if (done) done();
    });
}

export default app;

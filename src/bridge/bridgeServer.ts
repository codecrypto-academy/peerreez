/**
 * bridgeServer.ts (moved under src/bridge)
 */

import express, { Request, Response } from 'express';
import { getMapping, setMapping } from './identityMapper';
import { verifyMessage } from 'ethers';
import type { Contract } from '@hyperledger/fabric-network';

// Lightweight interface for the parts of gatewayService we use
interface IGatewayService {
    submitTransactionWithIdentity?: (role: string, identitySelector: string, functionName: string, ...args: string[]) => Promise<any>;
    submitTransaction?: (role: string, functionName: string, ...args: string[]) => Promise<any>;
    evaluateTransaction?: (role: string, functionName: string, ...args: string[]) => Promise<any>;
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
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const gs = require('../lib/fabric/gateway/gateway-service');
    if (gs && gs.gatewayService) {
        gatewayService = gs.gatewayService as IGatewayService;
        console.log('[bridgeServer] Loaded gatewayService from src/lib/fabric/gateway/gateway-service');
    }
} catch (err) {
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

        let signedPayload: any = null;
        try { signedPayload = JSON.parse(message); } catch { signedPayload = null; }

        if (signedPayload && typeof signedPayload === 'object') {
            const { nonce, timestamp, functionName: fnInMsg, args: argsInMsg } = signedPayload;
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
            if (!txResult || typeof txResult !== 'object') return res.status(500).json({ success: false, error: 'gatewayService returned unexpected result' });
            if (!txResult.success) return res.status(500).json({ success: false, error: txResult.error || 'Transaction failed' });
            return res.json({ success: true, data: txResult.data, signer: signerAddress, usedIdentity: mappedIdentity });
        }

        if (contract && typeof contract.submitTransaction === 'function') {
            const resultBytes = await contract.submitTransaction(functionName, ...args);
            const resultString = Buffer.from(resultBytes || '').toString('utf8');
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
            if (!txResult || typeof txResult !== 'object') return res.status(500).json({ success: false, error: 'gatewayService returned unexpected result' });
            if (!txResult.success) return res.status(500).json({ success: false, error: txResult.error || 'Query failed' });
            return res.json({ success: true, data: txResult.data });
        }
        if (contract && typeof contract.evaluateTransaction === 'function') {
            const resultBytes = await contract.evaluateTransaction(functionName, ...(args as string[]));
            const resultString = Buffer.from(resultBytes || '').toString('utf8');
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
            try { gatewayService.closeAllConnections(); } catch (e) { /* ignore */ }
        }
        if (done) done();
    });
}

export default app;

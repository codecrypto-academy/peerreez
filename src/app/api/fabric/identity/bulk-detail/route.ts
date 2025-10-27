import { NextRequest, NextResponse } from 'next/server';
import { identityManager, Role } from '@/lib/fabric/identity/identity-manager';
import crypto from 'crypto';

// Simple in-memory cache with TTL
const CACHE_TTL = 60 * 1000; // 60s
const cache: Map<string, { ts: number; data: any }> = new Map();

function pemToDer(pem: string) {
    const b = pem
        .replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s+/g, '');
    return Buffer.from(b, 'base64');
}

function extractCNFromPem(pem: string) {
    const m = pem.match(/Subject:.*CN=([^,\n/]+)/);
    if (m && m[1]) return m[1].trim();
    const m2 = pem.match(/CN=([^,\n/]+)/i);
    if (m2 && m2[1]) return m2[1].trim();
    return undefined;
}

function orgToRole(org: string): Role | null {
    const map: Record<string, Role> = {
        'producer.supplychain.com': 'Producer',
        'factory.supplychain.com': 'Factory',
        'retailer.supplychain.com': 'Retailer',
        'consumer.supplychain.com': 'Consumer',
    };
    return map[org] || null;
}

async function resolveSelector(selectorIn: string, org?: string) {
    let selector = selectorIn;
    try {
        selector = decodeURIComponent(String(selector));
    } catch {
        selector = String(selector);
    }

    // check cache
    const cached = cache.get(selector);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.data;

    // normalize x509:: style
    if (typeof selector === 'string' && selector.startsWith('x509::')) {
        const parts = selector.split('::');
        for (const p of parts) {
            const m = p.match(/CN=([^,\\/\n]+)/i);
            if (m && m[1]) {
                selector = m[1].trim();
                break;
            }
        }
    }

    const roles: Role[] = org ? [orgToRole(String(org))].filter(Boolean) as Role[] : ['Producer', 'Factory', 'Retailer', 'Consumer'];

    for (const r of roles) {
        try {
            const found = await identityManager.findIdentity(r, selector);
            if (found) {
                const certPem = found.identity.credentials.certificate;
                const der = pemToDer(certPem);
                const fp = crypto.createHash('sha256').update(der).digest('hex');
                const address = '0x' + fp.slice(-40);
                // prefer certificate CN but fallback to username when not available
                const cn = extractCNFromPem(certPem) || found.username;
                const out = { selector, username: found.username, role: r, org: `${r.toLowerCase()}.supplychain.com`, fingerprint: fp, address, cn };
                cache.set(selector, { ts: Date.now(), data: out });
                return out;
            }
        } catch {
            // ignore
        }
    }

    // try username-like candidate
    const usernameMatch = String(selector).match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.supplychain\.com)/i);
    if (usernameMatch && usernameMatch[1]) {
        const candidate = usernameMatch[1];
        if (/^ca\./i.test(candidate)) {
            const maybeOrg = candidate.split('@')[1] || '';
            const out = { selector: candidate, username: candidate, role: 'CA', org: maybeOrg, cn: candidate };
            cache.set(selector, { ts: Date.now(), data: out });
            return out;
        }
        for (const r of roles) {
            try {
                const found = await identityManager.findIdentity(r, candidate);
                if (found) {
                    const certPem = found.identity.credentials.certificate;
                    const der = pemToDer(certPem);
                    const fp = crypto.createHash('sha256').update(der).digest('hex');
                    const address = '0x' + fp.slice(-40);
                    const cn = extractCNFromPem(certPem);
                    const out = { selector: candidate, username: found.username, role: r, org: `${r.toLowerCase()}.supplychain.com`, fingerprint: fp, address, cn };
                    cache.set(selector, { ts: Date.now(), data: out });
                    return out;
                }
            } catch {
                // ignore
            }
        }
    }

    const mspMatch = String(selector).match(/^([A-Za-z]+)MSP$/i);
    if (mspMatch && mspMatch[1]) {
        const roleName = mspMatch[1].toLowerCase();
        const role = orgToRole(`${roleName}.supplychain.com`);
        if (role) {
            const out = { selector, role, org: `${roleName}.supplychain.com` };
            cache.set(selector, { ts: Date.now(), data: out });
            return out;
        }
    }

    // not found
    const nf = { error: 'identity not found', selector };
    cache.set(selector, { ts: Date.now(), data: nf });
    return nf;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const selectors: string[] = Array.isArray(body?.selectors) ? body.selectors.slice(0, 200) : [];
        const org = body?.org;

        if (!selectors || selectors.length === 0) return NextResponse.json({ success: false, error: 'selectors required' }, { status: 400 });

        const results: Record<string, any> = {};

        // resolve all selectors in parallel with limit (simple batching)
        const promises = selectors.map(s => resolveSelector(s, org).then(r => ({ s, r })));
        const resolved = await Promise.all(promises);
        for (const item of resolved) {
            results[item.s] = item.r;
        }

        return NextResponse.json({ success: true, data: results });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

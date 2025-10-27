import { NextRequest, NextResponse } from 'next/server';
import { identityManager, Role } from '@/lib/fabric/identity/identity-manager';
import crypto from 'crypto';

function pemToDer(pem: string) {
    const b = pem.replace(/-----BEGIN CERTIFICATE-----/, '')
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

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        let selector = url.searchParams.get('selector');
        const org = url.searchParams.get('org');

        if (!selector) return NextResponse.json({ success: false, error: 'selector query param required' }, { status: 400 });

        // Normalize selector: some callers send x509::subject::issuer strings
        // e.g. "x509::/C=US/.../CN=User1@factory.supplychain.com::/C=US/.../CN=ca.factory.supplychain.com"
        // Extract the first CN if present so identityManager can find the username.
        try {
            // decode in case it's URL-encoded
            selector = decodeURIComponent(String(selector));
        } catch {
            selector = String(selector);
        }

        // If selector looks like x509::..., try to extract CN from it
        if (typeof selector === 'string' && selector.startsWith('x509::')) {
            const parts = selector.split('::');
            // search each part for CN=...
            for (const p of parts) {
                const m = p.match(/CN=([^,\\/\n]+)/i);
                if (m && m[1]) {
                    selector = m[1].trim();
                    break;
                }
            }
        }


        // Prefer restricting by org if provided
        const roles: Role[] = org ? [orgToRole(String(org))].filter(Boolean) as Role[] : ['Producer', 'Factory', 'Retailer', 'Consumer'];

        // Try to find the identity under requested roles
        for (const r of roles) {
            try {
                const found = await identityManager.findIdentity(r, selector);
                if (found) {
                    const certPem = found.identity.credentials.certificate;
                    const der = pemToDer(certPem);
                    const fp = crypto.createHash('sha256').update(der).digest('hex');
                    const address = '0x' + fp.slice(-40);
                    // fallback CN to username if not present in certificate
                    const cn = extractCNFromPem(certPem) || found.username;
                    return NextResponse.json({
                        success: true,
                        data: {
                            selector,
                            username: found.username,
                            role: r,
                            org: `${r.toLowerCase()}.supplychain.com`,
                            fingerprint: fp,
                            address,
                            cn,
                        }
                    });
                }
            } catch {
                // ignore per-role errors
            }
        }

        // If not found, try to extract a username-like candidate (email or User@org) from the selector
        // Example patterns: User1@producer.supplychain.com or user1@producer.supplychain.com
        const usernameMatch = String(selector).match(/([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.supplychain\.com)/i);
        if (usernameMatch && usernameMatch[1]) {
            const candidate = usernameMatch[1];
            // If candidate looks like a CA identity (cn starts with ca.), return a light representation
            if (/^ca\./i.test(candidate)) {
                const maybeOrg = candidate.split('@')[1] || '';
                return NextResponse.json({ success: true, data: { selector: candidate, username: candidate, role: 'CA', org: maybeOrg, cn: candidate } });
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
                        return NextResponse.json({
                            success: true,
                            data: {
                                selector: candidate,
                                username: found.username,
                                role: r,
                                org: `${r.toLowerCase()}.supplychain.com`,
                                fingerprint: fp,
                                address,
                                cn,
                            }
                        });
                    }
                } catch {
                    // ignore
                }
            }
        }

        // If selector looks like an MSP constant (e.g. FactoryMSP), return org/role info
        const mspMatch = String(selector).match(/^([A-Za-z]+)MSP$/i);
        if (mspMatch && mspMatch[1]) {
            const roleName = mspMatch[1].toLowerCase();
            const role = orgToRole(`${roleName}.supplychain.com`);
            if (role) {
                return NextResponse.json({ success: true, data: { selector, role, org: `${roleName}.supplychain.com` } });
            }
        }

        // Not found
        return NextResponse.json({ success: false, error: 'identity not found' }, { status: 404 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
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

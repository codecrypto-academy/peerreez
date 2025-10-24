import { NextRequest, NextResponse } from 'next/server';
import { identityManager, Role } from '@/lib/fabric/identity/identity-manager';

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const selector = url.searchParams.get('selector');
        const org = url.searchParams.get('org') || 'producer.supplychain.com';

        if (!selector) return NextResponse.json({ success: false, error: 'selector query param required' }, { status: 400 });

        // Map org to Role
        const orgToRole: Record<string, Role> = {
            'producer.supplychain.com': 'Producer',
            'factory.supplychain.com': 'Factory',
            'retailer.supplychain.com': 'Retailer',
            'consumer.supplychain.com': 'Consumer',
        };

        const role = orgToRole[org];
        if (!role) return NextResponse.json({ success: false, error: 'unknown org' }, { status: 400 });

        // Try to find under the provided role
        const found = await identityManager.findIdentity(role, selector);
        if (found) {
            return NextResponse.json({ success: true, found: { role, username: found.username } });
        }

        // Try across all roles
        const roles: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
        for (const r of roles) {
            const f = await identityManager.findIdentity(r, selector);
            if (f) return NextResponse.json({ success: true, found: { role: r, username: f.username } });
        }

        // Not found — mappings are disabled, fall back to certificate search only
        return NextResponse.json({ success: false, error: 'identity not found (mappings disabled)' }, { status: 404 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { identityManager } from '@/lib/fabric/identity/identity-manager';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { org, selector, username } = body || {};
        if (!org || !selector || !username) return NextResponse.json({ success: false, error: 'org, selector and username required' }, { status: 400 });

        // Optional simple protection: require header X-MAPPING-SECRET when env var is set
        const secret = process.env.IDENTITY_MAPPING_SECRET;
        if (secret) {
            const provided = req.headers.get('x-mapping-secret');
            if (!provided || provided !== secret) return NextResponse.json({ success: false, error: 'unauthorized' }, { status: 401 });
        }

        // Mappings persistence is currently disabled in the server. Return informative response.
        return NextResponse.json({ success: false, error: 'Identity mapping support is disabled on this instance.' }, { status: 501 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

export async function GET(req: NextRequest) {
    try {
        // mappings disabled — return empty object and informative message
        return NextResponse.json({ success: true, mappings: {}, message: 'Identity mappings are disabled on this server.' });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

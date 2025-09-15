import { NextRequest, NextResponse } from 'next/server';
import { deployNetwork } from '@/lib/deployNetwork';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { networkName, chainId } = body;
        if (!networkName || !chainId) {
            return NextResponse.json({ error: 'networkName y chainId son requeridos' }, { status: 400 });
        }
        await deployNetwork(networkName, Number(chainId));
        return NextResponse.json({ status: 'ok', message: `Red ${networkName} desplegada con chainId ${chainId}` });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { stopNetwork } from '@/lib/stopNetwork';

export async function POST(request: Request) {
    try {
        const { networkName } = await request.json();
        if (!networkName) {
            return NextResponse.json({ success: false, message: 'Falta el nombre de la red.' }, { status: 400 });
        }
        const result = await stopNetwork(networkName);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ success: false, message: error.message }, { status: 500 });
    }
}

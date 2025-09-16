import { NextResponse } from 'next/server';
import { cleanNetwork } from '@/lib/cleanNetwork';

// POST /api/cleanNetwork
// Body: { networkName: string }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { networkName } = body;
        if (!networkName) {
            return NextResponse.json({ error: 'Falta el parámetro networkName.' }, { status: 400 });
        }
        await cleanNetwork(networkName);
        return NextResponse.json({ message: `Red '${networkName}' limpiada correctamente.` });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error al limpiar la red.' }, { status: 500 });
    }
}

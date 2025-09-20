import { NextResponse } from 'next/server';
import { startNodes } from '@/lib/startNodes';

// POST /api/startNodes
// Body: { networkName: string, tipoOContenedor: string }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { networkName, tipoOContenedor } = body;
        const result = await startNodes(networkName, tipoOContenedor);
        if (result.ok) {
            return NextResponse.json({ message: result.message });
        } else {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error al arrancar los nodos.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { stopNodes } from '@/lib/stopNodes';

// POST /api/stopNode
// Body: { networkName: string, tipoOContenedor: string }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { networkName, tipoOContenedor } = body;
        const result = await stopNodes(networkName, tipoOContenedor);
        if (result.ok) {
            return NextResponse.json({ message: result.message });
        } else {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error al parar el nodo.' }, { status: 500 });
    }
}

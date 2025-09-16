import { NextResponse } from 'next/server';
import { startNode } from '@/lib/startNode';

// POST /api/startNode
// Body: { networkName: string, nombreContenedor: string }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { networkName, nombreContenedor } = body;
        const result = await startNode(networkName, nombreContenedor);
        if (result.ok) {
            return NextResponse.json({ message: result.message });
        } else {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error al arrancar el nodo.' }, { status: 500 });
    }
}

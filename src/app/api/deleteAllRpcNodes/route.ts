import { NextResponse } from 'next/server';
import { deleteAllRpcNodes } from '@/lib/deleteAllRpcNodes';

// POST /api/deleteAllRpcNodes
// Body: { networkName: string }

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { networkName } = body;
        const result = await deleteAllRpcNodes(networkName);
        if (result.ok) {
            return NextResponse.json({ message: result.message });
        } else {
            return NextResponse.json({ error: result.message }, { status: 400 });
        }
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error al eliminar los nodos RPC.' }, { status: 500 });
    }
}

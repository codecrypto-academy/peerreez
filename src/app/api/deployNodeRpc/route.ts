import { NextResponse } from 'next/server';
import path from 'path';
import { agregarNodosRpc, obtenerSubnet, obtenerBootEnode } from '@/lib/deployNetwork';

export async function POST(request: Request) {
    try {
        const { networkName, n } = await request.json();
        if (!networkName || !n || typeof n !== 'number' || n <= 0) {
            return NextResponse.json({ error: 'Parámetros inválidos.' }, { status: 400 });
        }
        const baseDir = path.resolve(process.cwd(), 'src/lib/networks', networkName);
        const imagenBesu = 'hyperledger/besu:latest';
        const redSubnet = await obtenerSubnet(networkName);
        const bootEnode = await obtenerBootEnode(networkName);
        await agregarNodosRpc({
            networkName,
            n,
            baseDir,
            redSubnet,
            bootEnode,
            imagenBesu
        });
        return NextResponse.json({ ok: true, message: `${n} nodos RPC agregados a la red ${networkName}` });
    } catch (e: any) {
        return NextResponse.json({ error: e?.message || 'Error al agregar nodos RPC.' }, { status: 500 });
    }
}

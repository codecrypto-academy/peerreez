import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { agregarNodosRpc, obtenerSubnet, obtenerBootEnode } from '@/lib/deployNetwork';

export async function POST(req: NextRequest) {
    try {
        // Extraer networkName de la URL
        const url = new URL(req.url);
        const match = url.pathname.match(/network\/(.+?)\/add-nodes/);
        const networkName = match ? match[1] : null;
        const body = await req.json();
        const { n } = body;
        if (!networkName || !n) {
            return NextResponse.json({ error: 'networkName y n (número de nodos) son requeridos' }, { status: 400 });
        }
        // Directorio base de la red
        const baseDir = path.resolve(process.cwd(), 'src/lib/networks', networkName);
        // Subred y bootEnode
        const redSubnet = await obtenerSubnet(networkName);
        const bootEnode = await obtenerBootEnode(networkName);
        const imagenBesu = 'hyperledger/besu:latest';
        await agregarNodosRpc({ networkName, n, baseDir, redSubnet, bootEnode, imagenBesu });
        return NextResponse.json({ status: 'ok', message: `Se agregaron ${n} nodos RPC a la red ${networkName}` });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
    }
}

import { NextRequest, NextResponse } from 'next/server';
import { getNetworks } from '@/lib/operations';

export async function GET() {
    try {
        // getNetworks debe devolver un array de redes
        const networks = await getNetworks();
        return NextResponse.json({ networks });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || 'Error desconocido' }, { status: 500 });
    }
}

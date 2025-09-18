import { NextResponse } from 'next/server';
import { startNetwork } from '@/lib/startNetwork';

export async function POST(request: Request) {
    const { networkName } = await request.json();
    try {
        const result = await startNetwork(networkName);
        return NextResponse.json({ success: true, result });
    } catch (error) {
        const errorMsg = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : String(error);
        return NextResponse.json({ success: false, error: errorMsg }, { status: 500 });
    }
}

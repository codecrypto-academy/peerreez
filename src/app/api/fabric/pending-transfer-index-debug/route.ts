import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const { dumpAllEntries } = await import('@/lib/server/pending-transfer-index');
        return NextResponse.json({ success: true, data: dumpAllEntries() });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}

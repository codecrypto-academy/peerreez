import { NextRequest, NextResponse } from 'next/server';
import { getRecipientForTransfer } from '@/lib/server/pending-transfer-index';

export async function GET(request: NextRequest) {
    try {
        // Return a list of known transferId -> recipient mappings
        // Note: the index is internal and may be empty if no transfers were indexed yet
        // We'll scan current pending transfers passed as comma-separated ids (optional)
        const q = request.nextUrl.searchParams.get('ids');
        if (!q) {
            // Return full dump
            const { dumpAllEntries } = await import('@/lib/server/pending-transfer-index');
            return NextResponse.json({ success: true, data: dumpAllEntries() });
        }

        const ids = q.split(',').map(s => s.trim()).filter(Boolean);
        const out: Record<string, string | null> = {};
        for (const id of ids) {
            out[id] = getRecipientForTransfer(id) || null;
        }

        return NextResponse.json({ success: true, data: out });
    } catch (e) {
        return NextResponse.json({ success: false, error: String(e) }, { status: 500 });
    }
}

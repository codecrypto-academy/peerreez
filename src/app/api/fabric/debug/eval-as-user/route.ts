import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role, username, functionName, args } = body;
        if (!role || !username || !functionName) {
            return NextResponse.json({ success: false, error: 'role, username and functionName are required' }, { status: 400 });
        }

        const res = await gatewayService.evaluateTransactionAsUser(role as Role, username, functionName, ...(args || []));
        return NextResponse.json(res);
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ success: false, error: message }, { status: 500 });
    }
}

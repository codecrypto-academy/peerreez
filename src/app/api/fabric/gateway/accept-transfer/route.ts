import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { TransactionResult } from '@/types/fabric';

/**
 * POST /api/fabric/gateway/accept-transfer
 * Accept a pending transfer (2-step transfer: step 2a)
 * Recipient accepts the transfer and completes ownership change
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role: bodyRole, transferId } = body;

        // Require role cookie set by RoleGuard to avoid body spoofing
        const cookieRole = request.cookies.get('userRole')?.value;
        if (!cookieRole) {
            console.warn('[API] accept-transfer called without userRole cookie', { bodyRole, transferId });
            return NextResponse.json({ success: false, error: 'Authentication required (missing role cookie)' }, { status: 401 });
        }

        const role = cookieRole.charAt(0).toUpperCase() + cookieRole.slice(1);

        // Validation
        if (!role || !transferId) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: role, transferId',
                },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
        if (!role || !validRoles.includes(role as Role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid or missing role. Must be one of: ${validRoles.join(', ')}`,
                },
                { status: 400 }
            );
        }

        console.log(`[API] Accepting transfer: ${transferId} (by ${role}) [cookie]`);

        // Call gateway service
        const result = await gatewayService.acceptTransfer(role as Role, transferId);

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        console.log(`[API] Transfer accepted successfully`);

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error('[API] Error accepting transfer:', error);
        const message = error instanceof Error ? error.message : String(error);
        const response: TransactionResult = { success: false, error: message || 'Internal server error' };
        return NextResponse.json(response, { status: 500 });
    }
}

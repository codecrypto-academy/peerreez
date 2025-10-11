import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { TransactionResult } from '@/types/fabric';

/**
 * POST /api/fabric/gateway/reject-transfer
 * Reject a pending transfer (2-step transfer: step 2b)
 * Recipient rejects the transfer with a reason
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role: bodyRole, transferId, reason } = body;

        // Require role cookie set by RoleGuard to avoid body spoofing
        const cookieRole = request.cookies.get('userRole')?.value;
        if (!cookieRole) {
            console.warn('[API] reject-transfer called without userRole cookie', { bodyRole, transferId, reason });
            return NextResponse.json({ success: false, error: 'Authentication required (missing role cookie)' }, { status: 401 });
        }

        const role = cookieRole.charAt(0).toUpperCase() + cookieRole.slice(1);

        // Validate fields
        if (!transferId || !reason) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: transferId, reason',
                },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
        if (!validRoles.includes(role as Role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid role. Must be one of: ${validRoles.join(', ')}`,
                },
                { status: 400 }
            );
        }

        console.log(`[API] Rejecting transfer: ${transferId} (by ${role}) [cookie] - Reason: ${reason}`);

        // Call gateway service
        const result = await gatewayService.rejectTransfer(role as Role, transferId, reason);

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        console.log(`[API] Transfer rejected successfully`);

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error('[API] Error rejecting transfer:', error);
        const message = error instanceof Error ? error.message : String(error);
        const response: TransactionResult = { success: false, error: message || 'Internal server error' };
        return NextResponse.json(response, { status: 500 });
    }
}

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
        const body = await request.json() as unknown;
        const b = (body as Record<string, unknown> | null) || null;
        const bodyRole = typeof b?.role === 'string' ? String(b.role) : undefined;
        const transferId = typeof b?.transferId === 'string' ? String(b.transferId) : undefined;

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

        // Optionally accept using a specific owner identity (full x509/username) provided by client
        // Body was parsed into `b` (Record<string, unknown> | null) above; access ownerIdentity safely
        const ownerIdentity = typeof b?.ownerIdentity === 'string' ? String(b.ownerIdentity) : undefined;

        // Pre-check: ensure the pending transfer exists in ledger for this role before submitting Accept
        try {
            const pendingRes = await gatewayService.getPendingTransfers(role as Role, ownerIdentity);
            if (!pendingRes.success) {
                console.warn('[API] Could not list pending transfers for pre-check', pendingRes.error);
            } else {
                const list = typeof pendingRes.data === 'string' ? JSON.parse(pendingRes.data) : (pendingRes.data || []);
                const found = Array.isArray(list) && list.find((t: unknown) => {
                    const tt = t as Record<string, unknown>;
                    return String(tt['id']) === String(transferId);
                });
                if (!found) {
                    return NextResponse.json({ success: false, error: `Pending transfer ${transferId} not found for role ${role}` }, { status: 404 });
                }
            }
        } catch (err) {
            console.warn('[API] Pre-check for pending transfer failed', err);
        }
        let result;
        if (ownerIdentity) {
            console.log(`[API] Accepting transfer as specific identity: ${ownerIdentity}`);
            // Use submitTransactionWithIdentity so the Gateway uses the provided user credentials
            result = await gatewayService.submitTransactionWithIdentity(role as Role, ownerIdentity, 'AcceptTransfer', transferId);
        } else {
            // Call gateway service with server-side connection (org-level or cookie-based user)
            result = await gatewayService.acceptTransfer(role as Role, transferId);
        }

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

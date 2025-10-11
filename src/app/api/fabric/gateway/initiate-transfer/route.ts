import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { TransactionResult } from '@/types/fabric';

/**
 * POST /api/fabric/gateway/initiate-transfer
 * Initiate a transfer request (2-step transfer: step 1)
 * Creates a pending transfer that requires recipient acceptance
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { role: bodyRole, assetId, recipientMSP, transferData } = body;

        // Require role cookie set by RoleGuard to avoid body spoofing
        const cookieRole = request.cookies.get('userRole')?.value;
        if (!cookieRole) {
            console.warn('[API] initiate-transfer called without userRole cookie', { bodyRole, assetId, recipientMSP });
            return NextResponse.json({ success: false, error: 'Authentication required (missing role cookie)' }, { status: 401 });
        }

        // Normalize the role coming from cookie (RoleGuard writes lowercase like 'factory')
        const role = cookieRole.charAt(0).toUpperCase() + cookieRole.slice(1);

        // Validation
        if (!role || !assetId || !recipientMSP) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required fields: role, assetId, recipientMSP',
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

        // Validate recipientMSP format
        const validMSPs = ['ProducerMSP', 'FactoryMSP', 'RetailerMSP', 'ConsumerMSP'];
        if (!validMSPs.includes(recipientMSP)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid recipientMSP: ${recipientMSP}. Must be one of: ${validMSPs.join(', ')}`,
                },
                { status: 400 }
            );
        }

        console.log(`[API] Initiating transfer: ${assetId} → ${recipientMSP} (by ${role}) [cookie]`);

        // Call gateway service
        const result = await gatewayService.initiateTransfer(
            role as Role,
            assetId,
            recipientMSP,
            transferData || {}
        );

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        console.log(`[API] Transfer initiated successfully:`, result.data);

        return NextResponse.json(result, { status: 200 });
    } catch (error: unknown) {
        console.error('[API] Error initiating transfer:', error);
        const message = error instanceof Error ? error.message : String(error);
        const response: TransactionResult = {
            success: false,
            error: message || 'Internal server error',
        };
        return NextResponse.json(response, { status: 500 });
    }
}

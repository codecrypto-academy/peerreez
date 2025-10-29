import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { TransactionResult, PendingTransfer } from '@/types/fabric';

/**
 * POST /api/fabric/gateway/initiate-transfer
 * Initiate a transfer request (2-step transfer: step 1)
 * Creates a pending transfer that requires recipient acceptance
 */
export async function POST(request: NextRequest) {
    try {
        const body = await request.json() as unknown;
        const b = (body as Record<string, unknown> | null) || null;
        const bodyRole = typeof b?.role === 'string' ? String(b.role) : undefined;
        const assetId = typeof b?.assetId === 'string' ? String(b.assetId) : undefined;
        const recipientMSP = typeof b?.recipientMSP === 'string' ? String(b.recipientMSP) : undefined;
        const transferData = b?.transferData;

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

        // Extract ownerIdentity (if provided) early so we can use it for pre-checks
        const ownerIdentity = typeof b?.ownerIdentity === 'string' ? String(b.ownerIdentity) : undefined;

        // Server-side pre-check: if this is a full-asset transfer (no quantityRequested),
        // ensure there is no existing pending transfer for the same asset to avoid endorsement failure.
        const qtyRequested = transferData && typeof (transferData as Record<string, unknown>)['quantityRequested'] === 'number'
            ? (transferData as Record<string, unknown>)['quantityRequested'] as number
            : undefined;

        if (qtyRequested === undefined) {
            const pendingRes = await gatewayService.getPendingTransfers(role as Role, ownerIdentity);
            if (!pendingRes.success) {
                return NextResponse.json({ success: false, error: pendingRes.error || 'Failed to check pending transfers' }, { status: 500 });
            }

            const pendingList: PendingTransfer[] = typeof pendingRes.data === 'string' ? JSON.parse(pendingRes.data) : (pendingRes.data || []);
            const conflict = pendingList.find((t: PendingTransfer) => t.assetId === assetId && t.status === 'PENDING');
            if (conflict) {
                return NextResponse.json({ success: false, error: `Asset ${assetId} already has a pending transfer: ${conflict.id}` }, { status: 409 });
            }
        }

        // If caller provided an explicit ownerIdentity (username, CN or derived address)
        // attempt to submit the transaction as that identity so the chaincode sees the
        // true owner as the transaction submitter (avoids 'Only the current owner can initiate a transfer').

        // Normalize/merge transferData and ensure recipientIdentity (if provided at top-level)
        let td: Record<string, unknown> = {};
        try {
            if (transferData) td = typeof transferData === 'string' ? JSON.parse(String(transferData)) : (transferData as Record<string, unknown>);
        } catch {
            td = {};
        }

        const bodyRecipient = typeof (b && b['recipientIdentity']) === 'string' ? String(b!['recipientIdentity']) : undefined;
        if (bodyRecipient) td.recipientIdentity = bodyRecipient;

        let result;
        if (ownerIdentity) {
            console.log(`[API] initiate-transfer using owner identity selector: ${ownerIdentity}`);
            // Submit the transaction as the explicit owner identity and include merged transferData
            result = await gatewayService.submitTransactionWithIdentity(
                role as Role,
                ownerIdentity,
                'InitiateTransfer',
                assetId,
                recipientMSP,
                JSON.stringify(td)
            );
        } else {
            // Fallback: submit using the server's configured identity for the role
            result = await gatewayService.initiateTransfer(
                role as Role,
                assetId,
                recipientMSP,
                td
            );
        }

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        console.log(`[API] Transfer initiated successfully:`, result.data);

        // Chaincode persists recipientIdentity when provided inside transferData; no in-memory index required.

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

import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { TransactionResult } from '@/types/fabric';

/**
 * GET /api/fabric/gateway/pending-transfers?role=<role>
 * Get all pending transfers for the caller
 * Returns both incoming and outgoing pending transfers
 */
export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const queryRole = searchParams.get('role');

        // Prefer cookie-derived role if present (consistent with other endpoints)
        const cookieRole = request.cookies.get('userRole')?.value;
        const resolvedRole = cookieRole
            ? cookieRole.charAt(0).toUpperCase() + cookieRole.slice(1)
            : queryRole;

        // Validation
        if (!resolvedRole) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'Missing required parameter: role (query param or userRole cookie)',
                },
                { status: 400 }
            );
        }

        // Validate role
        const validRoles: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
        if (!validRoles.includes(resolvedRole as Role)) {
            return NextResponse.json(
                {
                    success: false,
                    error: `Invalid role: ${resolvedRole}. Must be one of: ${validRoles.join(', ')}`,
                },
                { status: 400 }
            );
        }

        console.log(`[API] Getting pending transfers - queryRole: ${queryRole}, cookieRole: ${cookieRole}, resolvedRole: ${resolvedRole}`);

        // Call gateway service
        const result = await gatewayService.getPendingTransfers(resolvedRole as Role);

        if (!result.success) {
            return NextResponse.json(result, { status: 500 });
        }

        console.log(`[API] Found ${Array.isArray(result.data) ? result.data.length : 0} pending transfers for ${resolvedRole}`);

        // Return the gateway result but include the resolved role for easier debugging
        return NextResponse.json(
            {
                ...result,
                resolvedRole,
                queryRole,
                cookieRole,
            },
            { status: 200 }
        );
    } catch (error: unknown) {
        console.error('[API] Error getting pending transfers:', error);
        const message = error instanceof Error ? error.message : String(error);
        const response: TransactionResult = { success: false, error: message || 'Internal server error' };
        return NextResponse.json(response, { status: 500 });
    }
}

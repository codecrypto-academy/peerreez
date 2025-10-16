import { NextRequest, NextResponse } from 'next/server';
import { GatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Asset } from '@/types/fabric';

/**
 * API Route: Get Transfer History
 * Returns all assets that were transferred BY the calling organization
 * Uses the QueryTransferHistory chaincode function
 */
export async function GET(request: NextRequest) {
  try {
    console.log('[API] Transfer History - Starting request');

    // Get organization from query params (default to producer for testing)
    const searchParams = request.nextUrl.searchParams;
    const orgParam = searchParams.get('org') || 'producer';

    console.log(`[API] Fetching transfer history for org: ${orgParam}`);

    // Get gateway service instance
    const gatewayService = GatewayService.getInstance();

    console.log('[API] Calling QueryTransferHistory on chaincode...');

    // Call the new QueryTransferHistory function
    // Capitalize first letter for Role enum
    const role = (orgParam.charAt(0).toUpperCase() + orgParam.slice(1)) as 'Producer' | 'Factory' | 'Retailer' | 'Consumer';
    const result = await gatewayService.evaluateTransaction(
      role,
      'QueryTransferHistory'
    );

    if (!result.success) {
      console.error('[API] Transaction failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Failed to query transfer history' },
        { status: 500 }
      );
    }

    console.log('[API] Raw chaincode response:', JSON.stringify(result.data).substring(0, 200));

    const assets: Asset[] = Array.isArray(result.data) ? (result.data as Asset[]) : [];

    console.log(`[API] Transfer history retrieved: ${assets.length} assets`);

    return NextResponse.json({
      success: true,
      assets: assets,
      count: assets.length,
      organization: orgParam
    });

  } catch (error: unknown) {
    console.error('[API] Transfer History Error:', error);
    const message = error instanceof Error ? error.message : String(error);
    const details = error instanceof Error && error.stack ? error.stack : undefined;

    return NextResponse.json(
      {
        error: message || 'Failed to fetch transfer history',
        details,
      },
      { status: 500 }
    );
  }
}

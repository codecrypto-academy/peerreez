import { NextRequest, NextResponse } from 'next/server';
import { gatewayService } from '@/lib/fabric/gateway/gateway-service';
import { Role } from '@/lib/fabric/identity/identity-manager';

/**
 * API Route for Fabric Gateway operations
 * Uses Fabric Gateway SDK for high-performance blockchain operations
 */

export async function GET(request: NextRequest) {
    try {
        const searchParams = request.nextUrl.searchParams;
        const operation = searchParams.get('operation');
        const role = searchParams.get('role') as Role;
        const assetId = searchParams.get('assetId');

        if (!role || !['Producer', 'Factory', 'Retailer', 'Consumer'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Valid role is required' },
                { status: 400 }
            );
        }

        switch (operation) {
            case 'queryByOwner': {
                const result = await gatewayService.queryAssetsByOwner(role);
                return NextResponse.json(result);
            }

            case 'readAsset': {
                if (!assetId) {
                    return NextResponse.json(
                        { success: false, error: 'assetId is required' },
                        { status: 400 }
                    );
                }
                const result = await gatewayService.readAsset(role, assetId);
                return NextResponse.json(result);
            }

            case 'getHistory': {
                if (!assetId) {
                    return NextResponse.json(
                        { success: false, error: 'assetId is required' },
                        { status: 400 }
                    );
                }
                const result = await gatewayService.getAssetHistory(role, assetId);
                return NextResponse.json(result);
            }

            case 'getTrace': {
                if (!assetId) {
                    return NextResponse.json(
                        { success: false, error: 'assetId is required' },
                        { status: 400 }
                    );
                }
                const result = await gatewayService.getSupplyChainTrace(role, assetId);
                return NextResponse.json(result);
            }

            case 'queryTransferHistory': {
                const result = await gatewayService.queryTransferHistory(role);
                return NextResponse.json(result);
            }

            case 'getPendingTransfers': {
                const result = await gatewayService.getPendingTransfers(role);
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown operation: ${operation}` },
                    { status: 400 }
                );
        }
    } catch (error: unknown) {
        console.error('Gateway API error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json(
            { success: false, error: message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = (await request.json()) as Record<string, unknown>;
        const operation = (body.operation as string) || undefined;
        const role = (body.role as string) as Role | undefined;
        const assetId = body.assetId as string | undefined;
        const assetType = body.assetType as string | undefined;
        const quantity = typeof body.quantity === 'number' ? (body.quantity as number) : undefined;
        const unit = body.unit as string | undefined;
        const metadata = body.metadata as Record<string, unknown> | undefined;
        const newOwner = body.newOwner as string | undefined;
        const transferData = body.transferData as Record<string, unknown> | undefined;

        if (!role || !['Producer', 'Factory', 'Retailer', 'Consumer'].includes(role)) {
            return NextResponse.json(
                { success: false, error: 'Valid role is required' },
                { status: 400 }
            );
        }

        switch (operation) {
            case 'createAsset': {
                if (!assetId || !assetType || quantity === undefined || !unit) {
                    return NextResponse.json(
                        { success: false, error: 'assetId, assetType, quantity, and unit are required' },
                        { status: 400 }
                    );
                }
                const result = await gatewayService.createAsset(
                    role as Role,
                    assetId,
                    assetType,
                    quantity,
                    unit,
                    metadata || {}
                );
                return NextResponse.json(result);
            }

            case 'transferAsset': {
                if (!assetId || !newOwner) {
                    return NextResponse.json(
                        { success: false, error: 'assetId and newOwner are required' },
                        { status: 400 }
                    );
                }
                const result = await gatewayService.transferAsset(
                    role as Role,
                    assetId,
                    newOwner,
                    transferData || {}
                );
                return NextResponse.json(result);
            }

            case 'updateMetadata': {
                if (!assetId || !metadata) {
                    return NextResponse.json(
                        { success: false, error: 'assetId and metadata are required' },
                        { status: 400 }
                    );
                }
                const result = await gatewayService.updateAssetMetadata(
                    role as Role,
                    assetId,
                    metadata
                );
                return NextResponse.json(result);
            }

            case 'transformAsset': {
                const rawMaterialIds = body.rawMaterialIds as string[] | undefined;
                const newAssetId = body.newAssetId as string | undefined;
                const productData = body.productData as Record<string, unknown> | undefined;
                const quantities = body.quantities as Record<string, number> | undefined;

                if (!rawMaterialIds || !Array.isArray(rawMaterialIds) || rawMaterialIds.length === 0) {
                    return NextResponse.json(
                        { success: false, error: 'rawMaterialIds array is required and must not be empty' },
                        { status: 400 }
                    );
                }

                if (!newAssetId || !productData) {
                    return NextResponse.json(
                        { success: false, error: 'newAssetId and productData are required' },
                        { status: 400 }
                    );
                }

                if (!quantities || typeof quantities !== 'object') {
                    return NextResponse.json(
                        { success: false, error: 'quantities object is required (materialId -> quantity)' },
                        { status: 400 }
                    );
                }

                // Validate role is Factory
                if (role !== 'Factory') {
                    return NextResponse.json(
                        { success: false, error: 'Only Factory organization can transform assets' },
                        { status: 403 }
                    );
                }

                const result = await gatewayService.transformAsset(
                    role as Role,
                    rawMaterialIds,
                    newAssetId,
                    productData,
                    quantities
                );
                return NextResponse.json(result);
            }

            case 'sellProduct': {
                const productId = body.productId as string | undefined;
                const newOwner = body.newOwner as string | undefined;
                const quantityToSell = typeof body.quantityToSell === 'number' ? (body.quantityToSell as number) : undefined;
                const transferData = body.transferData as Record<string, unknown> | undefined;

                if (!productId || !newOwner) {
                    return NextResponse.json(
                        { success: false, error: 'productId and newOwner are required' },
                        { status: 400 }
                    );
                }

                if (typeof quantityToSell !== 'number' || quantityToSell <= 0) {
                    return NextResponse.json(
                        { success: false, error: 'quantityToSell must be a positive number' },
                        { status: 400 }
                    );
                }

                // Validate role is Retailer
                if (role !== 'Retailer') {
                    return NextResponse.json(
                        { success: false, error: 'Only Retailer organization can sell products' },
                        { status: 403 }
                    );
                }

                const result = await gatewayService.sellProduct(
                    role as Role,
                    productId,
                    newOwner,
                    quantityToSell,
                    transferData
                );
                return NextResponse.json(result);
            }

            case 'deleteAsset': {
                const quantityToDelete = typeof body.quantityToDelete === 'number' ? (body.quantityToDelete as number) : undefined;

                if (!assetId) {
                    return NextResponse.json(
                        { success: false, error: 'assetId is required' },
                        { status: 400 }
                    );
                }

                // Validate quantityToDelete if provided
                if (quantityToDelete !== undefined && (typeof quantityToDelete !== 'number' || quantityToDelete <= 0)) {
                    return NextResponse.json(
                        { success: false, error: 'quantityToDelete must be a positive number if provided' },
                        { status: 400 }
                    );
                }

                // Note: Chaincode will validate ownership permissions
                // Owners can delete/reduce their own assets
                console.log(`[API] Deleting asset ${assetId} for role ${role}${quantityToDelete ? ` (quantity: ${quantityToDelete})` : ' (complete)'}`);

                const result = await gatewayService.deleteAsset(role as Role, assetId, quantityToDelete);
                return NextResponse.json(result);
            }

            case 'initiateTransfer': {
                // Accept either recipientMSP (explicit MSP id) or recipientIdentity (full x509 string)
                const recipientIdentity = body.recipientIdentity as string | undefined;
                const recipientMSP = body.recipientMSP as string | undefined;

                if (!assetId || (!recipientIdentity && !recipientMSP)) {
                    return NextResponse.json(
                        { success: false, error: 'assetId and recipientIdentity or recipientMSP are required' },
                        { status: 400 }
                    );
                }

                // Derive recipientMSP from recipientIdentity when needed
                let targetMSP = recipientMSP;
                if (!targetMSP && recipientIdentity && typeof recipientIdentity === 'string') {
                    const m = recipientIdentity.match(/CN=Admin@(\w+)\.supplychain\.com/);
                    if (m && m[1]) {
                        const org = m[1];
                        targetMSP = org.charAt(0).toUpperCase() + org.slice(1) + 'MSP';
                    }
                }

                if (!targetMSP) {
                    return NextResponse.json(
                        { success: false, error: 'Could not determine recipient MSP from provided identity' },
                        { status: 400 }
                    );
                }

                // Ensure transferData is an object and include recipientIdentity so chaincode can record it
                let td: Record<string, unknown> = {};
                if (transferData) {
                    td = typeof transferData === 'string' ? JSON.parse(transferData) : transferData as Record<string, unknown>;
                }
                if (recipientIdentity) {
                    (td as Record<string, unknown>).recipientIdentity = recipientIdentity;
                }

                const result = await gatewayService.initiateTransfer(
                    role as Role,
                    assetId,
                    targetMSP,
                    td
                );
                return NextResponse.json(result);
            }

            case 'acceptTransfer': {
                const transferId = body.transferId as string | undefined;

                if (!transferId) {
                    return NextResponse.json(
                        { success: false, error: 'transferId is required' },
                        { status: 400 }
                    );
                }

                const result = await gatewayService.acceptTransfer(role as Role, transferId);
                return NextResponse.json(result);
            }

            case 'rejectTransfer': {
                const transferId = body.transferId as string | undefined;
                const reason = body.reason as string | undefined;

                if (!transferId || !reason) {
                    return NextResponse.json(
                        { success: false, error: 'transferId and reason are required' },
                        { status: 400 }
                    );
                }

                const result = await gatewayService.rejectTransfer(role as Role, transferId, reason);
                return NextResponse.json(result);
            }

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown operation: ${operation}` },
                    { status: 400 }
                );
        }
    } catch (error: unknown) {
        console.error('Gateway API error:', error);
        const message = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ success: false, error: message || 'Internal server error' }, { status: 500 });
    }
}

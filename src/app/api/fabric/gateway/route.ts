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

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown operation: ${operation}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Gateway API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { operation, role, assetId, assetType, quantity, unit, metadata, newOwner, transferData } = body;

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
                const { rawMaterialIds, newAssetId, productData, quantities } = body;

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
                const { productId, newOwner, quantityToSell, transferData } = body;

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
                const { quantityToDelete } = body;

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

            default:
                return NextResponse.json(
                    { success: false, error: `Unknown operation: ${operation}` },
                    { status: 400 }
                );
        }
    } catch (error: any) {
        console.error('Gateway API error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'Internal server error' },
            { status: 500 }
        );
    }
}

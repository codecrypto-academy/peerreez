import { Role } from '../identity/identity-manager';

/**
 * Transaction result from Gateway API
 */
export interface TransactionResult {
    success: boolean;
    data?: any;
    error?: string;
    transactionId?: string;
}

/**
 * Gateway HTTP Service
 * Client-side service that calls the Gateway API routes
 * Uses fetch to communicate with Next.js API routes
 */
class GatewayHttpService {
    private static instance: GatewayHttpService;

    private constructor() { }

    public static getInstance(): GatewayHttpService {
        if (!GatewayHttpService.instance) {
            GatewayHttpService.instance = new GatewayHttpService();
        }
        return GatewayHttpService.instance;
    }

    /**
     * Query assets by owner using Gateway API
     */
    async queryAssetsByOwner(role: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(
                `/api/fabric/gateway?operation=queryByOwner&role=${role}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Read a single asset
     */
    async readAsset(role: Role, assetId: string): Promise<TransactionResult> {
        try {
            const response = await fetch(
                `/api/fabric/gateway?operation=readAsset&role=${role}&assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Get asset history
     */
    async getAssetHistory(role: Role, assetId: string): Promise<TransactionResult> {
        try {
            const response = await fetch(
                `/api/fabric/gateway?operation=getHistory&role=${role}&assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Get complete supply chain trace
     */
    async getSupplyChainTrace(role: Role, assetId: string): Promise<TransactionResult> {
        try {
            const response = await fetch(
                `/api/fabric/gateway?operation=getTrace&role=${role}&assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Create a new asset
     */
    async createAsset(
        role: Role,
        assetId: string,
        assetType: string,
        quantity: number,
        unit: string,
        metadata: Record<string, any>
    ): Promise<TransactionResult> {
        try {
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'createAsset',
                    role,
                    assetId,
                    assetType,
                    quantity,
                    unit,
                    metadata,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Transfer an asset to another organization
     */
    async transferAsset(
        role: Role,
        assetId: string,
        newOwner: string,
        transferData?: Record<string, any>
    ): Promise<TransactionResult> {
        try {
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'transferAsset',
                    role,
                    assetId,
                    newOwner,
                    transferData: transferData || {},
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Update asset metadata
     */
    async updateAssetMetadata(
        role: Role,
        assetId: string,
        metadata: Record<string, any>
    ): Promise<TransactionResult> {
        try {
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'updateMetadata',
                    role,
                    assetId,
                    metadata,
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Sell product with partial quantity (Retailer to Consumer)
     */
    async sellProduct(
        role: Role,
        productId: string,
        newOwner: string,
        quantityToSell: number,
        transferData?: Record<string, any>
    ): Promise<TransactionResult> {
        try {
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'sellProduct',
                    role,
                    productId,
                    newOwner,
                    quantityToSell,
                    transferData: transferData || {},
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }

    /**
     * Delete an asset or reduce its quantity (Owner or Admin)
     */
    async deleteAsset(role: Role, assetId: string, quantityToDelete?: number): Promise<TransactionResult> {
        try {
            const body: any = {
                operation: 'deleteAsset',
                role,
                assetId,
            };

            // Only include quantityToDelete if it's provided and valid
            if (quantityToDelete !== undefined && quantityToDelete > 0) {
                body.quantityToDelete = quantityToDelete;
            }

            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = await response.json();
                return {
                    success: false,
                    error: errorData.error || `HTTP error! status: ${response.status}`,
                };
            }

            return await response.json();
        } catch (error: any) {
            console.error('Gateway HTTP error:', error);
            return {
                success: false,
                error: error.message || 'Network error',
            };
        }
    }
}

// Export singleton instance
export const gatewayHttpService = GatewayHttpService.getInstance();

import { TransactionResult, Role } from '../../types/fabric';

export interface Asset {
    id: string;
    name: string;
    type: 'RAW_MATERIAL' | 'PRODUCT';
    category: string;
    description?: string;
    location?: string;
    quantity?: number;
    certifications?: string[];
    quality?: {
        grade?: string;
        moistureLevel?: string;
        proteinContent?: string;
        tests?: string[];
        defects?: string[];
    };
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    currentOwner?: string;
    status?: string;
    rawMaterials?: string[];
    transfers?: any[];
    properties?: { [key: string]: any };
}

export class FabricHttpService {
    private baseUrl: string;

    constructor(baseUrl: string = '') {
        this.baseUrl = baseUrl;
    }

    /**
     * Create a new asset
     */
    async createAsset(assetId: string, assetData: Asset, userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/assets-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'create',
                    role: userRole,
                    assetId,
                    assetData
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to create asset',
                data: null
            };
        }
    }

    /**
     * Read an asset by ID
     */
    async readAsset(assetId: string, userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/fabric/assets-cli?operation=read&assetId=${assetId}&role=${userRole}`
            );

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to read asset',
                data: null
            };
        }
    }

    /**
     * Update an existing asset
     */
    async updateAsset(assetId: string, updates: Partial<Asset>, userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/assets-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'update',
                    role: userRole,
                    assetId,
                    updates
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to update asset',
                data: null
            };
        }
    }

    /**
     * Check if an asset exists
     */
    async assetExists(assetId: string, userRole: Role): Promise<boolean> {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/fabric/assets-cli?operation=exists&assetId=${assetId}&role=${userRole}`
            );

            const result = await response.json();
            return result.success && result.data === true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete an asset (admin only)
     */
    async deleteAsset(assetId: string, userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/assets-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'delete',
                    role: userRole,
                    assetId
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to delete asset',
                data: null
            };
        }
    }

    /**
     * Transfer an asset to a new owner
     */
    async transferAsset(
        assetId: string,
        newOwner: string,
        transferData: any = {},
        userRole: Role
    ): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/assets-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'transfer',
                    role: userRole,
                    assetId,
                    newOwner,
                    transferData
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to transfer asset',
                data: null
            };
        }
    }

    /**
     * Transform raw materials into finished products
     */
    async transformAsset(
        rawMaterialIds: string[],
        newAssetId: string,
        productData: Asset,
        userRole: Role
    ): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/operations-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'transform',
                    role: userRole,
                    rawMaterialIds,
                    newAssetId,
                    productData
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to transform asset',
                data: null
            };
        }
    }

    /**
     * Query assets by current owner
     */
    async queryAssetsByOwner(userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(
                `${this.baseUrl}/api/fabric/assets-cli?operation=queryByOwner&role=${userRole}`
            );

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to query assets',
                data: null
            };
        }
    }

    /**
     * Get asset history
     */
    async getAssetHistory(assetId: string, userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/operations-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'getHistory',
                    role: userRole,
                    assetId
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to get asset history',
                data: null
            };
        }
    }

    /**
     * Get complete supply chain trace
     */
    async getSupplyChainTrace(assetId: string, userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/operations-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'getTrace',
                    role: userRole,
                    traceAssetId: assetId
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to get supply chain trace',
                data: null
            };
        }
    }

    /**
     * Initialize the ledger (development/testing only)
     */
    async initLedger(userRole: Role): Promise<TransactionResult> {
        try {
            const response = await fetch(`${this.baseUrl}/api/fabric/operations-cli`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'initLedger',
                    role: userRole
                })
            });

            const result = await response.json();
            return result;
        } catch (error: any) {
            return {
                success: false,
                error: error.message || 'Failed to initialize ledger',
                data: null
            };
        }
    }
}

// Singleton instance
let httpServiceInstance: FabricHttpService | null = null;

/**
 * Get the singleton HTTP service instance
 */
export function getFabricHttpService(): FabricHttpService {
    if (!httpServiceInstance) {
        httpServiceInstance = new FabricHttpService();
    }
    return httpServiceInstance;
}
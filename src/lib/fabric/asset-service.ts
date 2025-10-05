import { getFabricClient } from './client';
import { TransactionResult, Role } from '../../types/fabric';

export interface Asset {
    id: string;
    name: string;
    type: 'RAW_MATERIAL' | 'FINISHED_PRODUCT';
    category: string;
    description: string;
    location: string;
    quantity: number;
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
}

export class AssetService {
    private client = getFabricClient();

    /**
     * Ensure we're connected to the network
     */
    private async ensureConnection(userRole: Role): Promise<void> {
        if (!this.client.isConnected()) {
            await this.client.connect(userRole);
        }
    }

    /**
     * Create a new asset
     */
    async createAsset(assetId: string, assetData: Asset, userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            const assetJson = JSON.stringify(assetData);
            return await this.client.submitTransaction('CreateAsset', assetId, assetJson);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Read an asset by ID
     */
    async readAsset(assetId: string, userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            return await this.client.evaluateTransaction('ReadAsset', assetId);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Update an existing asset
     */
    async updateAsset(assetId: string, updates: Partial<Asset>, userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            const updatesJson = JSON.stringify(updates);
            return await this.client.submitTransaction('UpdateAsset', assetId, updatesJson);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Check if an asset exists
     */
    async assetExists(assetId: string, userRole: Role): Promise<boolean> {
        await this.ensureConnection(userRole);

        try {
            const result = await this.client.evaluateTransaction('AssetExists', assetId);
            return result.success && result.data === true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Delete an asset (admin only)
     */
    async deleteAsset(assetId: string, userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            return await this.client.submitTransaction('DeleteAsset', assetId);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
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
        await this.ensureConnection(userRole);

        try {
            const transferJson = JSON.stringify(transferData);
            return await this.client.submitTransaction('TransferAsset', assetId, newOwner, transferJson);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
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
        await this.ensureConnection(userRole);

        try {
            const rawMaterialIdsJson = JSON.stringify(rawMaterialIds);
            const productDataJson = JSON.stringify(productData);

            return await this.client.submitTransaction(
                'TransformAsset',
                rawMaterialIdsJson,
                newAssetId,
                productDataJson
            );
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Query assets by current owner
     */
    async queryAssetsByOwner(userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            return await this.client.evaluateTransaction('QueryAssetsByOwner');
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Get asset history
     */
    async getAssetHistory(assetId: string, userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            return await this.client.evaluateTransaction('GetAssetHistory', assetId);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Get complete supply chain trace
     */
    async getSupplyChainTrace(assetId: string, userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            return await this.client.evaluateTransaction('GetSupplyChainTrace', assetId);
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Initialize the ledger (development/testing only)
     */
    async initLedger(userRole: Role): Promise<TransactionResult> {
        await this.ensureConnection(userRole);

        try {
            return await this.client.submitTransaction('InitLedger');
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }
}

// Singleton instance
let assetServiceInstance: AssetService | null = null;

/**
 * Get the singleton Asset service instance
 */
export function getAssetService(): AssetService {
    if (!assetServiceInstance) {
        assetServiceInstance = new AssetService();
    }
    return assetServiceInstance;
}
// fabric-network types imported in fabricGateway
import { TransactionResult, ChaincodeOperations, Role } from '../../../types/fabric';
import { FabricGatewayManager } from '../gateway/fabricGateway';

export class ChaincodeInvoker implements ChaincodeOperations {
    private gatewayManager: FabricGatewayManager;

    constructor() {
        this.gatewayManager = FabricGatewayManager.getInstance();
    }

    private async ensureConnection(role: Role, userId: string): Promise<void> {
        if (!this.gatewayManager.isConnected() || this.gatewayManager.getCurrentRole() !== role) {
            await this.gatewayManager.connectAsRole(role, userId);
        }
    }

    private async submitTransaction(functionName: string, ...args: string[]): Promise<TransactionResult> {
        try {
            const contract = this.gatewayManager.getContract();

            console.log(`🔄 Submitting transaction: ${functionName}`, args);

            const transaction = contract.createTransaction(functionName);
            const result = await transaction.submit(...args);

            const txId = transaction.getTransactionId();

            console.log(`✅ Transaction submitted: ${txId}`);

            return {
                success: true,
                txId: txId,
                data: result.toString()
            };

        } catch (error: unknown) {
            console.error(`❌ Transaction failed: ${functionName}`, error);

            return {
                success: false,
                txId: '',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    private async evaluateTransaction(functionName: string, ...args: string[]): Promise<TransactionResult> {
        try {
            const contract = this.gatewayManager.getContract();

            console.log(`🔍 Evaluating query: ${functionName}`, args);

            const result = await contract.evaluateTransaction(functionName, ...args);

            console.log(`✅ Query completed: ${functionName}`);

            return {
                success: true,
                txId: 'query',
                data: result.toString()
            };

        } catch (error: unknown) {
            console.error(`❌ Query failed: ${functionName}`, error);

            return {
                success: false,
                txId: 'query',
                error: error instanceof Error ? error.message : 'Unknown error'
            };
        }
    }

    // Asset Management Operations
    async CreateAsset(assetId: string, assetData: string): Promise<TransactionResult> {
        return this.submitTransaction('CreateAsset', assetId, assetData);
    }

    async ReadAsset(assetId: string): Promise<TransactionResult> {
        return this.evaluateTransaction('ReadAsset', assetId);
    }

    async UpdateAsset(assetId: string, updates: string): Promise<TransactionResult> {
        return this.submitTransaction('UpdateAsset', assetId, updates);
    }

    async DeleteAsset(assetId: string): Promise<TransactionResult> {
        return this.submitTransaction('DeleteAsset', assetId);
    }

    async AssetExists(assetId: string): Promise<boolean> {
        const result = await this.evaluateTransaction('AssetExists', assetId);
        return result.success && result.data === 'true';
    }

    // Transfer Operations
    async TransferAsset(assetId: string, newOwner: string, transferData: string = '{}'): Promise<TransactionResult> {
        return this.submitTransaction('TransferAsset', assetId, newOwner, transferData);
    }

    async TransformAsset(rawMaterialIds: string, newAssetId: string, productData: string): Promise<TransactionResult> {
        return this.submitTransaction('TransformAsset', rawMaterialIds, newAssetId, productData);
    }

    // Query Operations
    async QueryAssetsByOwner(): Promise<TransactionResult> {
        return this.evaluateTransaction('QueryAssetsByOwner');
    }

    async GetAssetHistory(assetId: string): Promise<TransactionResult> {
        return this.evaluateTransaction('GetAssetHistory', assetId);
    }

    async GetSupplyChainTrace(assetId: string): Promise<TransactionResult> {
        return this.evaluateTransaction('GetSupplyChainTrace', assetId);
    }

    // Utility Methods
    async connectAs(role: Role, userId: string): Promise<void> {
        await this.ensureConnection(role, userId);
    }

    async disconnect(): Promise<void> {
        await this.gatewayManager.disconnect();
    }
}
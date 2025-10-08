import * as grpc from '@grpc/grpc-js';
import {
    connect,
    Gateway,
    Network,
    Contract,
    Identity,
    Signer,
    signers,
} from '@hyperledger/fabric-gateway';
import { identityManager, Role } from '../identity/identity-manager';
import { getConnectionConfig } from '../config/connection-config';

/**
 * Connection pool entry
 */
interface ConnectionPoolEntry {
    gateway: Gateway;
    network: Network;
    contract: Contract;
    lastUsed: number;
}

/**
 * Transaction result
 */
export interface TransactionResult {
    success: boolean;
    data?: any;
    error?: string;
    transactionId?: string;
}

/**
 * Gateway Service for Hyperledger Fabric
 * Manages connections, provides connection pooling, and executes chaincode operations
 */
export class GatewayService {
    private static instance: GatewayService;
    private connectionPool = new Map<string, ConnectionPoolEntry>();
    private readonly MAX_IDLE_TIME = 5 * 60 * 1000; // 5 minutes
    private cleanupInterval: NodeJS.Timeout | null = null;

    private constructor() {
        // Start cleanup interval
        this.startCleanupInterval();
    }

    public static getInstance(): GatewayService {
        if (!GatewayService.instance) {
            GatewayService.instance = new GatewayService();
        }
        return GatewayService.instance;
    }

    /**
     * Get or create a Gateway connection for a role
     */
    private async getConnection(role: Role): Promise<ConnectionPoolEntry> {
        const poolKey = role.toLowerCase();

        // Check if connection exists and is valid
        if (this.connectionPool.has(poolKey)) {
            const entry = this.connectionPool.get(poolKey)!;
            entry.lastUsed = Date.now();
            return entry;
        }

        // Create new connection
        const identity = await identityManager.getIdentity(role);
        const config = getConnectionConfig(role);
        const tlsCredentials = await identityManager.getTlsCredentials(role);

        // Create gRPC client
        const client = new grpc.Client(
            config.peerEndpoint.url,
            tlsCredentials,
            config.peerEndpoint.grpcOptions
        );

        // Create Gateway identity
        const gatewayIdentity: Identity = {
            mspId: identity.mspId,
            credentials: Buffer.from(identity.credentials.certificate),
        };

        // Create signer
        const signer: Signer = signers.newPrivateKeySigner(
            crypto.createPrivateKey(identity.credentials.privateKey)
        );

        // Connect to Gateway
        const gateway = connect({
            client,
            identity: gatewayIdentity,
            signer,
            evaluateOptions: () => {
                return { deadline: Date.now() + 5000 }; // 5 second timeout
            },
            endorseOptions: () => {
                return { deadline: Date.now() + 15000 }; // 15 second timeout
            },
            submitOptions: () => {
                return { deadline: Date.now() + 5000 }; // 5 second timeout
            },
            commitStatusOptions: () => {
                return { deadline: Date.now() + 60000 }; // 60 second timeout
            },
        });

        // Get network and contract
        const network = gateway.getNetwork(config.channelName);
        const contract = network.getContract(config.chaincodeName);

        // Store in pool
        const entry: ConnectionPoolEntry = {
            gateway,
            network,
            contract,
            lastUsed: Date.now(),
        };

        this.connectionPool.set(poolKey, entry);

        console.log(`Created new Gateway connection for ${role}`);
        return entry;
    }

    /**
     * Execute a query (read-only) transaction
     */
    public async evaluateTransaction(
        role: Role,
        functionName: string,
        ...args: string[]
    ): Promise<TransactionResult> {
        try {
            const { contract } = await this.getConnection(role);

            const resultBytes = await contract.evaluateTransaction(functionName, ...args);
            const resultString = Buffer.from(resultBytes).toString('utf8');

            // Try to parse as JSON, otherwise return as string
            let data;
            try {
                data = JSON.parse(resultString);
            } catch {
                data = resultString;
            }

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error(`Error evaluating transaction ${functionName}:`, error);
            return {
                success: false,
                error: error.message || 'Unknown error occurred',
            };
        }
    }

    /**
     * Execute a submit (read-write) transaction
     */
    public async submitTransaction(
        role: Role,
        functionName: string,
        ...args: string[]
    ): Promise<TransactionResult> {
        try {
            console.log(`[Gateway] Submitting transaction ${functionName} as ${role} with args:`, args);
            const { contract } = await this.getConnection(role);

            const resultBytes = await contract.submitTransaction(functionName, ...args);
            const resultString = Buffer.from(resultBytes).toString('utf8');

            console.log(`[Gateway] Transaction ${functionName} successful, result:`, resultString);

            // Try to parse as JSON, otherwise return as string
            let data;
            try {
                data = JSON.parse(resultString);
            } catch {
                data = resultString;
            }

            return {
                success: true,
                data,
            };
        } catch (error: any) {
            console.error(`[Gateway] Error submitting transaction ${functionName}:`, error);

            // Extract detailed error information
            let detailedError = error.message || 'Unknown error occurred';

            // Check if error has details array (EndorseError)
            if (error.details && Array.isArray(error.details)) {
                console.error('[Gateway] Endorsement details:', JSON.stringify(error.details, null, 2));

                // Try to extract the actual chaincode error message
                const endorseDetails = error.details
                    .map((detail: any) => `[${detail.mspId}@${detail.address}]: ${detail.message}`)
                    .join('; ');

                detailedError = `${error.message}. Details: ${endorseDetails}`;
            }

            // Log the full error for debugging
            if (error.cause) {
                console.error('[Gateway] Error cause:', error.cause);
            }

            return {
                success: false,
                error: detailedError,
            };
        }
    }

    /**
     * Query assets by owner
     */
    public async queryAssetsByOwner(role: Role): Promise<TransactionResult> {
        // QueryAssetsByOwner takes NO parameters - it uses the client identity from context
        return this.evaluateTransaction(role, 'QueryAssetsByOwner');
    }

    /**
     * Read a single asset
     */
    public async readAsset(role: Role, assetId: string): Promise<TransactionResult> {
        return this.evaluateTransaction(role, 'ReadAsset', assetId);
    }

    /**
     * Create a new asset
     */
    public async createAsset(
        role: Role,
        assetId: string,
        assetType: string,
        quantity: number,
        unit: string,
        metadata: Record<string, any>
    ): Promise<TransactionResult> {
        // Chaincode expects CreateAsset(assetId, assetData)
        // where assetData is a JSON string with all asset properties
        const assetData = {
            id: assetId,
            name: assetType, // Use assetType as name
            type: 'RAW_MATERIAL', // Default type for producer
            quantity,
            unit,
            metadata,
            location: metadata.location || '',
            description: metadata.description || ''
        };

        return this.submitTransaction(
            role,
            'CreateAsset',
            assetId,
            JSON.stringify(assetData)
        );
    }

    /**
     * Transfer an asset to another organization
     */
    public async transferAsset(
        role: Role,
        assetId: string,
        newOwner: string,
        transferData: Record<string, any> = {}
    ): Promise<TransactionResult> {
        // Chaincode expects transferData as JSON string (3rd parameter)
        const transferDataJson = JSON.stringify(transferData);
        return this.submitTransaction(role, 'TransferAsset', assetId, newOwner, transferDataJson);
    }

    /**
     * Update asset metadata
     */
    public async updateAssetMetadata(
        role: Role,
        assetId: string,
        metadata: Record<string, any>
    ): Promise<TransactionResult> {
        // Chaincode expects UpdateAsset(assetId, updates)
        // where updates is a JSON string with partial asset properties
        return this.submitTransaction(
            role,
            'UpdateAsset',
            assetId,
            JSON.stringify(metadata)
        );
    }

    /**
     * Transform raw materials into finished products (Factory only)
     */
    public async transformAsset(
        role: Role,
        rawMaterialIds: string[],
        newAssetId: string,
        productData: Record<string, any>,
        quantities: Record<string, number>
    ): Promise<TransactionResult> {
        // Chaincode expects TransformAsset(rawMaterialIds, newAssetId, productData, quantitiesToUse)
        // All params as JSON strings
        // rawMaterialIds: JSON array of IDs ["RAW-001", "RAW-002"]
        // newAssetId: String ID of new product "PROD-001"
        // productData: JSON object with product details
        // quantities: JSON object with materialId -> quantity mappings
        return this.submitTransaction(
            role,
            'TransformAsset',
            JSON.stringify(rawMaterialIds),
            newAssetId,
            JSON.stringify(productData),
            JSON.stringify(quantities)
        );
    }

    /**
     * Sell product with partial quantity (Retailer to Consumer)
     */
    public async sellProduct(
        role: Role,
        productId: string,
        newOwner: string,
        quantityToSell: number,
        transferData: Record<string, any> = {}
    ): Promise<TransactionResult> {
        // Chaincode expects SellProduct(productId, newOwner, quantityToSell, transferData)
        // quantityToSell as string, transferData as JSON string
        return this.submitTransaction(
            role,
            'SellProduct',
            productId,
            newOwner,
            quantityToSell.toString(),
            JSON.stringify(transferData)
        );
    }

    /**
     * Get asset history
     */
    public async getAssetHistory(role: Role, assetId: string): Promise<TransactionResult> {
        return this.evaluateTransaction(role, 'GetAssetHistory', assetId);
    }

    /**
     * Get complete supply chain trace (asset + history + raw materials trace)
     */
    public async getSupplyChainTrace(role: Role, assetId: string): Promise<TransactionResult> {
        return this.evaluateTransaction(role, 'GetSupplyChainTrace', assetId);
    }

    /**
     * Query transfer history - Get all assets transferred by the caller
     */
    public async queryTransferHistory(role: Role): Promise<TransactionResult> {
        return this.evaluateTransaction(role, 'QueryTransferHistory');
    }

    /**
     * Delete an asset or reduce its quantity (Owner or Admin)
     */
    public async deleteAsset(role: Role, assetId: string, quantityToDelete?: number): Promise<TransactionResult> {
        // DeleteAsset can be called by asset owner or admin
        // The chaincode will validate ownership permissions
        // If quantityToDelete is provided, only that quantity will be removed
        // If not provided, the entire asset will be deleted
        const args = quantityToDelete !== undefined && quantityToDelete > 0
            ? [assetId, quantityToDelete.toString()]
            : [assetId];

        return this.submitTransaction(role, 'DeleteAsset', ...args);
    }

    /**
     * Close a specific connection
     */
    public closeConnection(role: Role): void {
        const poolKey = role.toLowerCase();
        const entry = this.connectionPool.get(poolKey);

        if (entry) {
            entry.gateway.close();
            this.connectionPool.delete(poolKey);
            console.log(`Closed Gateway connection for ${role}`);
        }
    }

    /**
     * Close all connections
     */
    public closeAllConnections(): void {
        for (const [role, entry] of this.connectionPool.entries()) {
            entry.gateway.close();
            console.log(`Closed Gateway connection for ${role}`);
        }
        this.connectionPool.clear();
    }

    /**
     * Start cleanup interval to remove idle connections
     */
    private startCleanupInterval(): void {
        this.cleanupInterval = setInterval(() => {
            const now = Date.now();
            for (const [role, entry] of this.connectionPool.entries()) {
                if (now - entry.lastUsed > this.MAX_IDLE_TIME) {
                    entry.gateway.close();
                    this.connectionPool.delete(role);
                    console.log(`Cleaned up idle connection for ${role}`);
                }
            }
        }, 60000); // Check every minute
    }

    /**
     * Stop cleanup interval (for testing or shutdown)
     */
    public stopCleanup(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
    }
}

// Export singleton instance
export const gatewayService = GatewayService.getInstance();

// Import crypto at the top of the file after the grpc import
import * as crypto from 'crypto';

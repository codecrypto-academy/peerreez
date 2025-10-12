import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
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
    data?: unknown;
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
        } catch (error: unknown) {
            console.error(`Error evaluating transaction ${functionName}:`, error);
            const err = error as { message?: string };
            return {
                success: false,
                error: err.message || 'Unknown error occurred',
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
        } catch (error: unknown) {
            console.error(`[Gateway] Error submitting transaction ${functionName}:`, error);

            // Narrow error shape
            type EndorseDetail = { mspId?: string; address?: string; message?: string };
            type LocalError = { message?: string; details?: EndorseDetail[]; cause?: unknown };
            const err = error as LocalError;

            // Extract detailed error information
            let detailedError = err.message || 'Unknown error occurred';

            // Check if error has details array (EndorseError)
            if (err.details && Array.isArray(err.details)) {
                try {
                    console.error('[Gateway] Endorsement details:', JSON.stringify(err.details, null, 2));
                } catch {
                    // ignore stringify errors
                }

                const endorseDetails = err.details
                    .map((detail: EndorseDetail) => `[${detail.mspId}@${detail.address}]: ${detail.message}`)
                    .join('; ');

                detailedError = `${err.message || 'Endorse error'}. Details: ${endorseDetails}`;
            }

            // Log the full error cause for debugging
            if (err.cause) {
                console.error('[Gateway] Error cause:', err.cause);
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
        metadata: Record<string, unknown>
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
        transferData: Record<string, unknown> = {}
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
        metadata: Record<string, unknown>
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
        productData: Record<string, unknown>,
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
        transferData: Record<string, unknown> = {}
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
     * Initiate a transfer request (2-step transfer: step 1)
     * Creates a pending transfer that requires recipient acceptance
     */
    public async initiateTransfer(
        role: Role,
        assetId: string,
        recipientMSP: string,
        transferData: Record<string, unknown> = {}
    ): Promise<TransactionResult> {
        // Chaincode v4.0 expects InitiateTransfer(assetId, recipientMSP, transferData)
        // recipientMSP: MSP ID like "FactoryMSP", "RetailerMSP", "ConsumerMSP"
        // transferData: JSON string with transfer details (reason, notes, location, etc.)
        return this.submitTransaction(
            role,
            'InitiateTransfer',
            assetId,
            recipientMSP,
            JSON.stringify(transferData)
        );
    }

    /**
     * Accept a pending transfer (2-step transfer: step 2a)
     * Recipient accepts the transfer and completes ownership change
     */
    public async acceptTransfer(
        role: Role,
        transferId: string
    ): Promise<TransactionResult> {
        // Chaincode expects AcceptTransfer(transferId)
        // transferId: format "TRANSFER-{assetId}-{timestamp}"
        return this.submitTransaction(role, 'AcceptTransfer', transferId);
    }

    /**
     * Reject a pending transfer (2-step transfer: step 2b)
     * Recipient rejects the transfer with a reason
     */
    public async rejectTransfer(
        role: Role,
        transferId: string,
        reason: string
    ): Promise<TransactionResult> {
        // Chaincode expects RejectTransfer(transferId, reason)
        return this.submitTransaction(role, 'RejectTransfer', transferId, reason);
    }

    /**
     * Cancel a pending transfer (initiator or admin)
     * Caller must be the initiator (fromMSP) or an admin role
     */
    public async cancelTransfer(
        role: Role,
        transferId: string,
        reason?: string
    ): Promise<TransactionResult> {
        // Chaincode expects CancelPendingTransfer(transferId, reason)
        const args = reason ? [transferId, reason] : [transferId];
        return this.submitTransaction(role, 'CancelPendingTransfer', ...args);
    }

    /**
     * Get all pending transfers for the caller
     * Returns both incoming and outgoing pending transfers
     */
    public async getPendingTransfers(role: Role): Promise<TransactionResult> {
        // Chaincode expects GetPendingTransfers() - uses client identity from context
        console.log(`[GatewayService] getPendingTransfers called for role: ${role}`);

        const result = await this.evaluateTransaction(role, 'GetPendingTransfers');

        // Debug logging: print raw chaincode data when in dev
        if (!result.success) {
            console.error(`[GatewayService] getPendingTransfers error for role ${role}:`, result.error);
        } else {
            try {
                console.log(`[GatewayService] raw GetPendingTransfers data for ${role}:`, result.data);
            } catch (e) {
                console.log(`[GatewayService] could not stringify GetPendingTransfers result for ${role}`);
            }
        }

        return result;
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


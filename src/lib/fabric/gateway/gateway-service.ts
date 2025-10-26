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
     * Create a gateway connection for a specific username under the role's org (uses that user's credentials)
     */
    private async getConnectionForUser(role: Role, username: string): Promise<ConnectionPoolEntry> {
        const poolKey = `${role.toLowerCase()}::${username}`;
        if (this.connectionPool.has(poolKey)) {
            const entry = this.connectionPool.get(poolKey)!;
            entry.lastUsed = Date.now();
            return entry;
        }

        // Load identity for this user
        const identity = await identityManager.getIdentityByUsername(role, username);
        const config = getConnectionConfig(role);
        const tlsCredentials = await identityManager.getTlsCredentials(role);

        const client = new grpc.Client(
            config.peerEndpoint.url,
            tlsCredentials,
            config.peerEndpoint.grpcOptions
        );

        const gatewayIdentity: Identity = {
            mspId: identity.mspId,
            credentials: Buffer.from(identity.credentials.certificate),
        };

        const signer: Signer = signers.newPrivateKeySigner(
            crypto.createPrivateKey(identity.credentials.privateKey)
        );

        const gateway = connect({
            client,
            identity: gatewayIdentity,
            signer,
            evaluateOptions: () => ({ deadline: Date.now() + 5000 }),
            endorseOptions: () => ({ deadline: Date.now() + 15000 }),
            submitOptions: () => ({ deadline: Date.now() + 5000 }),
            commitStatusOptions: () => ({ deadline: Date.now() + 60000 }),
        });

        const network = gateway.getNetwork(config.channelName);
        const contract = network.getContract(config.chaincodeName);

        const entry: ConnectionPoolEntry = { gateway, network, contract, lastUsed: Date.now() };
        this.connectionPool.set(poolKey, entry);
        console.log(`Created new Gateway connection for ${role} as user ${username}`);
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
            const message = (error as { message?: string })?.message;
            return {
                success: false,
                error: message || 'Unknown error occurred',
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
            let detailedError = err?.message || 'Unknown error occurred';

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
                // Include detailed error info (string) for debugging
                error: detailedError + (err.details ? ` | rawDetails: ${JSON.stringify(err.details)}` : ''),
            };
        }
    }

    /**
     * Submit a transaction using a specific user identity (username/CN/address selector)
     */
    public async submitTransactionWithIdentity(
        role: Role,
        identitySelector: string,
        functionName: string,
        ...args: string[]
    ): Promise<TransactionResult> {
        try {
            // Try to find the user identity by selector (returns username and identity) under the provided role
            let found = await identityManager.findIdentity(role, identitySelector);
            let targetRole = role;
            // If not found under the given role, search across all org roles
            if (!found) {
                const rolesToTry: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
                for (const r of rolesToTry) {
                    found = await identityManager.findIdentity(r, identitySelector);
                    if (found) {
                        targetRole = r;
                        console.warn(`[Gateway] selector ${identitySelector} matched identity under role ${r}`);
                        break;
                    }
                }
            }

            if (!found) {
                return { success: false, error: `Could not find identity for selector: ${identitySelector}` };
            }

            // Use the discovered username to create/reuse a per-user connection for the correct role
            const entry = await this.getConnectionForUser(targetRole, found.username);
            const { contract } = entry;

            const resultBytes = await contract.submitTransaction(functionName, ...args);
            const resultString = Buffer.from(resultBytes).toString('utf8');
            let data;
            try { data = JSON.parse(resultString); } catch { data = resultString; }
            return { success: true, data };
        } catch (err: unknown) {
            console.error(`[Gateway] Error submitting transaction ${functionName} with identity ${identitySelector}:`, err);
            // Try to serialize useful fields
            let serialized = '';
            try {
                serialized = JSON.stringify(err, Object.getOwnPropertyNames(err));
            } catch {
                serialized = String(err);
            }
            const message = err instanceof Error ? err.message : String(err);
            return { success: false, error: (message || 'Unknown error') + ` | rawError: ${serialized}` };
        }
    }

    /**
     * Evaluate a transaction (read-only) using a specific user's identity connection
     * Useful for debugging: call QueryAssetsByOwner as that user to see what the chaincode
     * considers the client's assets.
     */
    public async evaluateTransactionAsUser(
        role: Role,
        username: string,
        functionName: string,
        ...args: string[]
    ): Promise<TransactionResult> {
        try {
            const entry = await this.getConnectionForUser(role, username);
            const { contract } = entry;
            const resultBytes = await contract.evaluateTransaction(functionName, ...args);
            const resultString = Buffer.from(resultBytes).toString('utf8');
            let data;
            try { data = JSON.parse(resultString); } catch { data = resultString; }
            return { success: true, data };
        } catch (err: unknown) {
            console.error(`[Gateway] Error evaluating transaction ${functionName} as user ${username}:`, err);
            const message = err instanceof Error ? err.message : String(err);
            let serialized = '';
            try { serialized = JSON.stringify(err, Object.getOwnPropertyNames(err)); } catch { serialized = String(err); }
            return { success: false, error: (message || 'Unknown error') + ` | rawError: ${serialized}` };
        }
    }

    /**
     * Query assets by owner. If ownerIdentity is provided, call chaincode function that accepts an owner identity
     * and returns assets owned by that identity. Otherwise use the default QueryAssetsByOwner (uses client identity).
     */
    public async queryAssetsByOwner(role: Role, ownerIdentity?: string): Promise<TransactionResult> {
        if (ownerIdentity) {
            // Query by explicit owner identity - this requires the deployed chaincode to expose
            // a QueryAssetsByOwnerIdentity function. If the function is not present in the
            // deployed chaincode, evaluateTransaction may fail with a "function does not exist" error.
            try {
                const res = await this.evaluateTransaction(role, 'QueryAssetsByOwnerIdentity', ownerIdentity);
                if (!res.success && res.error && String(res.error).includes('does not exist')) {
                    return {
                        success: false,
                        error: 'The deployed chaincode does not expose QueryAssetsByOwnerIdentity. Re-deploy the chaincode including this function or use the client-side filtering fallback.',
                    };
                }
                return res;
            } catch (err: unknown) {
                // evaluateTransaction should return a TransactionResult, but catch unexpected errors
                const message = err instanceof Error ? err.message : String(err);
                return { success: false, error: `Error invoking QueryAssetsByOwnerIdentity: ${message}` };
            }
        }

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
        metadata: Record<string, unknown>,
        ownerIdentity?: string
    ): Promise<TransactionResult> {
        // Chaincode expects CreateAsset(assetId, assetData)
        // where assetData is a JSON string with all asset properties
        const assetData: Record<string, unknown> = {
            id: assetId,
            name: assetType, // Use assetType as name
            type: 'RAW_MATERIAL', // Default type for producer
            quantity,
            unit,
            metadata,
            location: metadata.location || '',
            description: metadata.description || ''
        };

        // If ownerIdentity provided (from wallet selection), use it as createdBy/currentOwner
        if (ownerIdentity) {
            assetData.createdBy = ownerIdentity;
            assetData.currentOwner = ownerIdentity;
            // DEBUG: trace ownerIdentity on server before submitting to chaincode
            console.log(`[GatewayService] createAsset ownerIdentity: ${ownerIdentity} for asset ${assetId}`);
        }

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
    public async queryTransferHistory(role: Role, ownerIdentity?: string): Promise<TransactionResult> {
        // If an explicit ownerIdentity is provided, attempt to evaluate the chaincode
        // QueryTransferHistory with that user's identity so the chaincode's ctx.clientIdentity
        // reflects the selected wallet. This mirrors the approach used in submitTransactionWithIdentity.
        if (ownerIdentity) {
            try {
                let found = await identityManager.findIdentity(role, ownerIdentity);
                let targetRole = role;

                if (!found) {
                    const rolesToTry: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
                    for (const r of rolesToTry) {
                        found = await identityManager.findIdentity(r, ownerIdentity);
                        if (found) {
                            targetRole = r;
                            console.warn(`[Gateway] queryTransferHistory: selector ${ownerIdentity} matched identity under role ${r}`);
                            break;
                        }
                    }
                }

                if (!found) {
                    // If the selector cannot be resolved, don't fail the whole API —
                    // fall back to evaluating QueryTransferHistory as the server role.
                    console.warn(`[Gateway] queryTransferHistory: could not find identity for selector ${ownerIdentity}; falling back to server role evaluation`);
                    return await this.evaluateTransaction(role, 'QueryTransferHistory');
                }

                // Use evaluateTransactionAsUser to perform a readonly query as that user
                return await this.evaluateTransactionAsUser(targetRole, found.username, 'QueryTransferHistory');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                return { success: false, error: `Error invoking QueryTransferHistory as user: ${message}` };
            }
        }

        // Default behavior: evaluate as the server role connection
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
    public async getPendingTransfers(role: Role, ownerIdentity?: string): Promise<TransactionResult> {
        // Chaincode expects GetPendingTransfers() - uses client identity from context
        console.log(`[GatewayService] getPendingTransfers called for role: ${role}, ownerIdentity: ${ownerIdentity}`);

        // If an explicit ownerIdentity is provided, attempt to resolve it to a username
        // and evaluate the GetPendingTransfers chaincode function as that user so the
        // chaincode's ctx.clientIdentity matches the selected wallet identity.
        if (ownerIdentity) {
            try {
                let found = await identityManager.findIdentity(role, ownerIdentity);
                let targetRole = role;

                if (!found) {
                    const rolesToTry: Role[] = ['Producer', 'Factory', 'Retailer', 'Consumer'];
                    for (const r of rolesToTry) {
                        found = await identityManager.findIdentity(r, ownerIdentity);
                        if (found) {
                            targetRole = r;
                            console.warn(`[Gateway] getPendingTransfers: selector ${ownerIdentity} matched identity under role ${r}`);
                            break;
                        }
                    }
                }

                if (!found) {
                    // If the selector cannot be resolved, don't return an error — fall back
                    // to evaluating GetPendingTransfers with the server role connection so the
                    // API remains usable even when mappings are missing.
                    console.warn(`[Gateway] getPendingTransfers: could not find identity for selector ${ownerIdentity}; falling back to server role evaluation`);
                    return await this.evaluateTransaction(role, 'GetPendingTransfers');
                }

                // Evaluate the GetPendingTransfers function as the discovered user
                return await this.evaluateTransactionAsUser(targetRole, found.username, 'GetPendingTransfers');
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                return { success: false, error: `Error invoking GetPendingTransfers as user: ${message}` };
            }
        }

        // Default behavior: evaluate as the server role connection
        console.log(`[GatewayService] getPendingTransfers default eval for role: ${role}`);
        const result = await this.evaluateTransaction(role, 'GetPendingTransfers');

        // Debug logging: print raw chaincode data when in dev
        if (!result.success) {
            console.error(`[GatewayService] getPendingTransfers error for role ${role}:`, result.error);
        } else {
            try {
                console.log(`[GatewayService] raw GetPendingTransfers data for ${role}:`, result.data);
            } catch {
                console.log(`[GatewayService] could not stringify GetPendingTransfers result for ${role}`);
            }
        }

        return result;
    }

    /**
     * Delete an asset or reduce its quantity (Owner or Admin)
     */
    public async deleteAsset(role: Role, assetId: string, quantityToDelete?: number, ownerIdentity?: string): Promise<TransactionResult> {
        // DeleteAsset can be called by asset owner or admin
        // The chaincode will validate ownership permissions
        // If quantityToDelete is provided, only that quantity will be removed
        // If not provided, the entire asset will be deleted
        const args = quantityToDelete !== undefined && quantityToDelete > 0
            ? [assetId, quantityToDelete.toString()]
            : [assetId];

        // If an explicit ownerIdentity is provided, submit the transaction using that user's identity
        // so chaincode's ctx.clientIdentity reflects the selected wallet (allows owner-only delete).
        if (ownerIdentity) {
            try {
                return await this.submitTransactionWithIdentity(role, ownerIdentity, 'DeleteAsset', ...args);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                return { success: false, error: `Error submitting DeleteAsset as ${ownerIdentity}: ${message}` };
            }
        }

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


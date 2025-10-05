// Fabric SDK Types
export type Role = 'producer' | 'factory' | 'retailer' | 'consumer';

export interface ConnectionProfile extends Record<string, unknown> {
    name: string;
    version: string;
    client: {
        organization: string;
        connection: {
            timeout: {
                peer: {
                    endorser: string;
                };
            };
        };
    };
    organizations: Record<string, unknown>;
    peers: Record<string, unknown>;
    certificateAuthorities: Record<string, unknown>;
    channels: Record<string, unknown>;
    orderers: Record<string, unknown>;
}

export interface FabricUser {
    role: Role;
    mspId: string;
    identity: string;
    certificate: string;
    privateKey: string;
}

export interface TransactionRequest {
    fcn: string;
    args: string[];
    chaincodeId?: string;
    channelId?: string;
}

export interface TransactionResult {
    success: boolean;
    txId?: string;
    data?: object | string | number | boolean | null;
    error?: string;
}

export interface ChaincodeFunction {
    name: string;
    args: string[];
    transient?: Record<string, Buffer>;
}

export class FabricError extends Error {
    code?: string;
    details?: Record<string, unknown>;

    constructor(config: { message: string; code?: string; details?: Record<string, unknown> }) {
        super(config.message);
        this.name = 'FabricError';
        this.code = config.code;
        this.details = config.details;
    }
}

// Chaincode Functions Mapping
export interface ChaincodeOperations {
    // Asset Management
    CreateAsset: (assetId: string, assetData: string) => Promise<TransactionResult>;
    ReadAsset: (assetId: string) => Promise<TransactionResult>;
    UpdateAsset: (assetId: string, updates: string) => Promise<TransactionResult>;
    DeleteAsset: (assetId: string) => Promise<TransactionResult>;
    AssetExists: (assetId: string) => Promise<boolean>;

    // Transfer Operations  
    TransferAsset: (assetId: string, newOwner: string, transferData?: string) => Promise<TransactionResult>;
    TransformAsset: (rawMaterialIds: string, newAssetId: string, productData: string) => Promise<TransactionResult>;

    // Query Operations
    QueryAssetsByOwner: () => Promise<TransactionResult>;
    GetAssetHistory: (assetId: string) => Promise<TransactionResult>;
    GetSupplyChainTrace: (assetId: string) => Promise<TransactionResult>;
}

// Gateway and Network Types (using 'unknown' for now to avoid circular imports)
export interface NetworkConnection {
    gateway: unknown; // fabric-network Gateway
    network: unknown; // fabric-network Network  
    contract: unknown; // fabric-network Contract
}export interface WalletConfig {
    walletPath: string;
    userId: string;
    userRole: Role;
}
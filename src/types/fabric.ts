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
}

export interface WalletConfig {
    walletPath: string;
    userId: string;
    userRole: Role;
}

// Asset Types
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
    transfers?: AssetTransfer[];
    properties?: Record<string, unknown>;
}

// Simple transfer record stored on assets
export interface AssetTransfer {
    from: string;
    to: string;
    timestamp: string;
    location?: string;
    transportMethod?: string;
    temperature?: number;
    notes?: string;
}

// Generic transfer data payload passed to initiate/accept/reject
export interface TransferData {
    reason?: string;
    notes?: string;
    location?: string;
    transportMethod?: string;
    temperature?: number;
    recipientIdentity?: string;
    quantityRequested?: number;
    [key: string]: unknown;
}

// Pending Transfer Types
export interface PendingTransfer {
    id: string; // Format: TRANSFER-{assetId}-{timestamp}
    assetId: string;
    from: string; // Sender identity (full x509 DN)
    to: string; // Recipient MSP (e.g., "FactoryMSP") - simplified in v4.0
    fromMSP: string; // Sender MSP ID (e.g., "ProducerMSP")
    toMSP: string; // Recipient MSP ID (e.g., "FactoryMSP")
    initiatedAt: string; // ISO timestamp
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    transferData?: {
        reason?: string;
        notes?: string;
        location?: string;
        transportMethod?: string;
        temperature?: number;
        [key: string]: unknown;
    };
    rejectionReason?: string; // Only present if transfer was rejected
    direction?: 'incoming' | 'outgoing'; // Added by GetPendingTransfers query
}

// Transfer Operation Parameters
export interface InitiateTransferParams {
    assetId: string;
    recipientMSP: string; // Changed from recipientIdentity to recipientMSP in v4.0
    transferData?: {
        reason?: string;
        notes?: string;
        location?: string;
        transportMethod?: string;
        temperature?: number;
        [key: string]: unknown;
    };
}

export interface AcceptTransferParams {
    transferId: string;
}

export interface RejectTransferParams {
    transferId: string;
    reason: string;
}
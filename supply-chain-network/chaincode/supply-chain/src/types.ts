// Estructura simple para balance de cuentas
export interface AccountBalance {
    account: string; // nombre de usuario o dirección
    balance: string; // string para soportar valores grandes
}
/*
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Asset {
    id: string;
    name: string;
    description?: string;
    type: 'RAW_MATERIAL' | 'PRODUCT';
    category?: string;
    status: 'CREATED' | 'PENDING_TRANSFER' | 'IN_TRANSIT' | 'MANUFACTURED' | 'CONSUMED' | 'DELIVERED';
    currentOwner: string;
    createdBy: string;
    createdAt: string;
    updatedAt: string;

    // Quantity management
    quantity: number;
    unit?: string;

    // Supply chain specific fields
    origin?: string;
    certifications?: string[];
    expiryDate?: string;
    batchNumber?: string;

    // For products - reference to raw materials with quantities used
    rawMaterials?: string[];
    rawMaterialsUsed?: { [materialId: string]: number }; // materialId -> quantity used

    // Transfer history
    transfers?: AssetTransfer[];

    // Custom properties
    properties?: { [key: string]: any };
}

export interface AssetTransfer {
    from: string;
    to: string;
    timestamp: string;
    location?: string;
    transportMethod?: string;
    temperature?: number;
    notes?: string;
}

export interface AssetHistory {
    assetId: string;
    action: 'CREATE' | 'UPDATE' | 'TRANSFER' | 'INITIATE_TRANSFER' | 'ACCEPT_TRANSFER' | 'REJECT_TRANSFER' | 'CANCEL_TRANSFER' | 'TRANSFORM' | 'DELETE';
    timestamp: string;
    actor: string;
    previousOwner: string;
    newOwner: string;
    data: any;
    // Optional transaction metadata for auditability
    txId?: string;
    txTimestamp?: string;
    submittedBy?: string; // explicit identity that submitted the tx
}

export interface SupplyChainTrace {
    asset: Asset;
    history: AssetHistory[];
    rawMaterialsTrace: SupplyChainTrace[];
}

export interface QueryResult {
    Key: string;
    Record: Asset;
}

export interface HistoryQueryResult {
    TxId: string;
    Value: AssetHistory;
    Timestamp: string;
    IsDelete: string;
}

export interface PendingTransfer {
    id: string;                    // Unique transfer ID (e.g., "TRANSFER-WHEAT001-1696876543")
    assetId: string;               // ID of the asset to transfer
    from: string;                  // Complete X.509 identity of sender
    fromMSP: string;               // MSP ID of sender (e.g., "ProducerMSP")
    to: string;                    // Can be MSP ID or complete X.509 identity of recipient
    toMSP: string;                 // MSP ID of recipient (e.g., "FactoryMSP")
    initiatedAt: string;           // ISO timestamp when transfer was initiated
    status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';
    transferData: any;             // Additional transfer information (location, transport, etc.)
    previousStatus?: Asset['status'];       // Preserve asset status before initiating transfer
    // Optional: the explicit recipient identity (full x509) when known. If present, AcceptTransfer
    // will set the asset owner to this identity instead of deriving an identity from MSP.
    toIdentity?: string;
    // Optional: quantity requested by the initiator (for partial transfers)
    quantityRequested?: number;
    rejectionReason?: string;      // Only present if status is 'REJECTED'
    // Cancellation metadata
    cancellationReason?: string;
    cancelledAt?: string;
    cancelledBy?: string;
}
/*
 * SPDX-License-Identifier: Apache-2.0
 */

export interface Asset {
    id: string;
    name: string;
    description?: string;
    type: 'RAW_MATERIAL' | 'PRODUCT';
    category?: string;
    status: 'CREATED' | 'IN_TRANSIT' | 'MANUFACTURED' | 'CONSUMED' | 'DELIVERED';
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
    action: 'CREATE' | 'UPDATE' | 'TRANSFER' | 'TRANSFORM' | 'DELETE';
    timestamp: string;
    actor: string;
    previousOwner: string;
    newOwner: string;
    data: any;
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
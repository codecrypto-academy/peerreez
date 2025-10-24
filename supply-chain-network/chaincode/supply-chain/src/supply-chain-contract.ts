/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Asset, AssetHistory, AssetTransfer, PendingTransfer } from './types';

@Info({ title: 'SupplyChainContract', description: 'Smart contract for supply chain traceability' })
export class SupplyChainContract extends Contract {

    // Initialize ledger with sample data (optional)
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
    }

    // Helper function to find all pending transfers for a given asset ID
    private async findPendingTransfersByAsset(ctx: Context, assetId: string): Promise<PendingTransfer[]> {
        const iterator = await ctx.stub.getStateByRange('', '');
        const pending: PendingTransfer[] = [];
        let result = await iterator.next();

        while (!result.done) {
            const key = result.value.key;
            if (key.startsWith('TRANSFER-')) {
                try {
                    const transferBytes = result.value.value;
                    const transfer: PendingTransfer = JSON.parse(transferBytes.toString());
                    if (transfer.assetId === assetId && transfer.status === 'PENDING') {
                        pending.push(transfer);
                    }
                } catch (err) {
                    // skip invalid entries
                }
            }
            result = await iterator.next();
        }

        await iterator.close();
        return pending;
    }

    // Create a new asset (raw material or product)
    @Transaction()
    public async CreateAsset(ctx: Context, assetId: string, assetData: string): Promise<void> {
        const exists = await this.AssetExists(ctx, assetId);
        if (exists) {
            throw new Error(`The asset ${assetId} already exists`);
        }

        const asset: Asset = JSON.parse(assetData);

        // Validate asset data
        this.validateAsset(asset, ctx);

        // Set created timestamp and creator
        asset.createdAt = new Date().toISOString();
        asset.updatedAt = asset.createdAt;

        // Normalize stored owner strings to a canonical form for reliable comparisons later
        if (!asset.createdBy) {
            asset.createdBy = this.getClientIdentity(ctx);
        }
        // Ensure stored values are normalized (lowercased CN or username) to match getNormalizedClientIdentity
        asset.createdBy = this.normalizeIdentityString(asset.createdBy);
        if (!asset.currentOwner) {
            asset.currentOwner = asset.createdBy;
        } else {
            asset.currentOwner = this.normalizeIdentityString(asset.currentOwner);
        }
        asset.status = 'CREATED';

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

        // Create initial history entry
        const historyEntry: AssetHistory = {
            assetId,
            action: 'CREATE',
            timestamp: asset.createdAt,
            actor: asset.createdBy,
            previousOwner: '',
            newOwner: asset.currentOwner,
            data: asset
        };

        await this.recordHistory(ctx, assetId, historyEntry);

        console.info(`Asset ${assetId} created successfully`);
    }

    // Read an asset from the world state
    @Transaction(false)
    @Returns('string')
    public async ReadAsset(ctx: Context, assetId: string): Promise<string> {
        const assetJSON = await ctx.stub.getState(assetId);
        if (!assetJSON || assetJSON.length === 0) {
            throw new Error(`The asset ${assetId} does not exist`);
        }
        return assetJSON.toString();
    }

    // Update an asset (only by current owner)
    @Transaction()
    public async UpdateAsset(ctx: Context, assetId: string, updates: string): Promise<void> {
        const exists = await this.AssetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        const assetString = await this.ReadAsset(ctx, assetId);
        const asset: Asset = JSON.parse(assetString);
        const clientId = this.getNormalizedClientIdentity(ctx);

        // Verify ownership: compare normalized forms
        if (this.normalizeIdentityString(asset.currentOwner) !== clientId) {
            throw new Error(`Only the current owner can update the asset`);
        }

        const updateData: Partial<Asset> = JSON.parse(updates);

        // Merge updates
        Object.assign(asset, updateData);
        asset.updatedAt = new Date().toISOString();

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

        // Record history
        const historyEntry: AssetHistory = {
            assetId,
            action: 'UPDATE',
            timestamp: asset.updatedAt,
            actor: clientId,
            previousOwner: asset.currentOwner,
            newOwner: asset.currentOwner,
            data: updateData
        };

        await this.recordHistory(ctx, assetId, historyEntry);

        console.info(`Asset ${assetId} updated successfully`);
    }

    // Transfer asset ownership
    @Transaction()
    public async TransferAsset(ctx: Context, assetId: string, newOwner: string, transferData: string = '{}'): Promise<void> {
        const exists = await this.AssetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        const assetString = await this.ReadAsset(ctx, assetId);
        const asset: Asset = JSON.parse(assetString);
        const clientId = this.getNormalizedClientIdentity(ctx);

        // Verify ownership: compare normalized forms
        if (this.normalizeIdentityString(asset.currentOwner) !== clientId) {
            throw new Error(`Only the current owner can transfer the asset`);
        }

        // Validate transfer based on supply chain rules
        this.validateTransfer(asset, newOwner, ctx);

        const previousOwner = asset.currentOwner;
        asset.currentOwner = newOwner;
        asset.updatedAt = new Date().toISOString();

        // Parse additional transfer data
        const transfer: AssetTransfer = JSON.parse(transferData);

        // Add transfer to asset history
        if (!asset.transfers) {
            asset.transfers = [];
        }

        asset.transfers.push({
            from: previousOwner,
            to: newOwner,
            timestamp: asset.updatedAt,
            location: transfer.location,
            transportMethod: transfer.transportMethod,
            temperature: transfer.temperature,
            notes: transfer.notes || ''
        });

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

        // Record history
        const historyEntry: AssetHistory = {
            assetId,
            action: 'TRANSFER',
            timestamp: asset.updatedAt,
            actor: clientId,
            previousOwner,
            newOwner,
            data: transfer
        };

        await this.recordHistory(ctx, assetId, historyEntry);

        console.info(`Asset ${assetId} transferred from ${previousOwner} to ${newOwner}`);
    }

    // Transform raw materials into finished products (Factory only)
    @Transaction()
    public async TransformAsset(ctx: Context, rawMaterialIds: string, newAssetId: string, productData: string, quantitiesToUse: string): Promise<void> {
        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);

        // Only Factory organization can transform assets
        if (clientMSP !== 'FactoryMSP') {
            throw new Error('Only Factory organization can transform raw materials into products');
        }

        const rawIds: string[] = JSON.parse(rawMaterialIds);
        const product: Asset = JSON.parse(productData);
        const quantities: { [key: string]: number } = JSON.parse(quantitiesToUse);

        console.info(`TransformAsset: Processing ${rawIds.length} materials with quantities:`, quantities);

        // Validate all raw materials exist, are owned by factory, and have sufficient quantity
        const rawMaterials: Asset[] = [];
        const rawMaterialsUsed: { [materialId: string]: number } = {};

        for (const rawId of rawIds) {
            const rawAssetString = await this.ReadAsset(ctx, rawId);
            const rawAsset: Asset = JSON.parse(rawAssetString);

            // Verify ownership
            if (rawAsset.currentOwner !== clientId) {
                throw new Error(`Factory doesn't own raw material ${rawId}`);
            }

            // Verify material is not already consumed
            if (rawAsset.status === 'CONSUMED') {
                throw new Error(`Raw material ${rawId} is already consumed`);
            }

            // Get quantity to use for this material
            const quantityToUse = quantities[rawId] || 0;

            if (quantityToUse <= 0) {
                throw new Error(`Invalid quantity for raw material ${rawId}: must be greater than 0`);
            }

            // Verify sufficient quantity available
            const availableQuantity = rawAsset.quantity || 0;
            if (quantityToUse > availableQuantity) {
                throw new Error(`Insufficient quantity for raw material ${rawId}. Requested: ${quantityToUse}, Available: ${availableQuantity}`);
            }

            rawMaterials.push(rawAsset);
            rawMaterialsUsed[rawId] = quantityToUse;
        }

        // Create new product
        product.createdAt = new Date().toISOString();
        product.updatedAt = product.createdAt;
        product.createdBy = clientId;
        product.currentOwner = clientId;
        product.status = 'MANUFACTURED';
        product.type = 'PRODUCT';
        product.rawMaterials = rawIds;
        product.rawMaterialsUsed = rawMaterialsUsed;

        await ctx.stub.putState(newAssetId, Buffer.from(JSON.stringify(product)));

        // Update raw materials: subtract quantities and mark as CONSUMED if quantity reaches 0
        for (const rawAsset of rawMaterials) {
            const quantityUsed = rawMaterialsUsed[rawAsset.id];
            const remainingQuantity = rawAsset.quantity - quantityUsed;

            rawAsset.quantity = remainingQuantity;
            rawAsset.updatedAt = product.createdAt;

            // Mark as CONSUMED only when quantity reaches 0
            if (remainingQuantity <= 0) {
                rawAsset.status = 'CONSUMED';
                rawAsset.quantity = 0;
                console.info(`Raw material ${rawAsset.id} fully consumed`);
            } else {
                console.info(`Raw material ${rawAsset.id}: ${quantityUsed} used, ${remainingQuantity} remaining`);
            }

            await ctx.stub.putState(rawAsset.id, Buffer.from(JSON.stringify(rawAsset)));
        }

        // Record transformation history
        const historyEntry: AssetHistory = {
            assetId: newAssetId,
            action: 'TRANSFORM',
            timestamp: product.createdAt,
            actor: clientId,
            previousOwner: '',
            newOwner: clientId,
            data: {
                rawMaterials: rawIds,
                quantities: rawMaterialsUsed,
                product: product
            }
        };

        await this.recordHistory(ctx, newAssetId, historyEntry);

        console.info(`Product ${newAssetId} created using: ${JSON.stringify(rawMaterialsUsed)}`);
    }

    // Sell product with partial quantity (Retailer to Consumer)
    @Transaction()
    public async SellProduct(ctx: Context, productId: string, newOwner: string, quantityToSell: string, transferData: string = '{}'): Promise<string> {
        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);

        // Only Retailer organization can sell products
        if (clientMSP !== 'RetailerMSP') {
            throw new Error('Only Retailer organization can sell products to consumers');
        }

        const exists = await this.AssetExists(ctx, productId);
        if (!exists) {
            throw new Error(`The product ${productId} does not exist`);
        }

        const productString = await this.ReadAsset(ctx, productId);
        const product: Asset = JSON.parse(productString);
        const quantitySold = parseFloat(quantityToSell);

        // Verify ownership
        if (product.currentOwner !== clientId) {
            throw new Error(`Only the current owner can sell the product`);
        }

        // Verify it's a product
        if (product.type !== 'PRODUCT') {
            throw new Error(`Asset ${productId} is not a product`);
        }

        // Verify product status
        // Allow selling products that are MANUFACTURED or IN_TRANSIT.
        // Retailer may accept a pending transfer which sets status to IN_TRANSIT and should be able to sell thereafter.
        if (product.status !== 'MANUFACTURED' && product.status !== 'IN_TRANSIT') {
            throw new Error(`Product ${productId} is not available for sale (status: ${product.status})`);
        }

        // Validate quantity
        if (quantitySold <= 0) {
            throw new Error(`Invalid quantity to sell: must be greater than 0`);
        }

        const availableQuantity = product.quantity || 0;
        if (quantitySold > availableQuantity) {
            throw new Error(`Insufficient quantity. Available: ${availableQuantity}, Requested: ${quantitySold}`);
        }

        // Parse transfer data
        const transfer: any = JSON.parse(transferData);
        const timestamp = new Date().toISOString();

        // Case 1: Selling entire product (complete transfer)
        if (quantitySold >= availableQuantity) {
            product.currentOwner = newOwner;
            product.status = 'DELIVERED';
            product.updatedAt = timestamp;

            // Add transfer to product history
            if (!product.transfers) {
                product.transfers = [];
            }

            product.transfers.push({
                from: clientId,
                to: newOwner,
                timestamp: timestamp,
                location: transfer.purchaseLocation || transfer.location,
                transportMethod: transfer.paymentMethod || 'sale',
                notes: `Sold ${quantitySold} ${product.unit || 'units'} - ${transfer.notes || ''}`
            });

            await ctx.stub.putState(productId, Buffer.from(JSON.stringify(product)));

            // Record history
            const historyEntry: AssetHistory = {
                assetId: productId,
                action: 'TRANSFER',
                timestamp: timestamp,
                actor: clientId,
                previousOwner: clientId,
                newOwner: newOwner,
                data: {
                    ...transfer,
                    quantitySold: quantitySold,
                    transferType: 'complete-sale'
                }
            };

            await this.recordHistory(ctx, productId, historyEntry);

            console.info(`Product ${productId} completely sold to ${newOwner}. Quantity: ${quantitySold}`);
            return JSON.stringify({ type: 'complete', productId, quantitySold });
        }

        // Case 2: Partial sale - Split product
        // Generate new product ID for consumer
        const consumerProductId = `${productId}-SALE-${Date.now()}`;

        // Create new product for consumer with sold quantity
        const consumerProduct: Asset = {
            ...product,
            id: consumerProductId,
            currentOwner: newOwner,
            status: 'DELIVERED',
            quantity: quantitySold,
            createdAt: timestamp,
            updatedAt: timestamp,
            origin: `Split from ${productId}`,
            transfers: [{
                from: clientId,
                to: newOwner,
                timestamp: timestamp,
                location: transfer.purchaseLocation || transfer.location,
                transportMethod: transfer.paymentMethod || 'sale',
                notes: `Purchased ${quantitySold} ${product.unit || 'units'} from ${productId} - ${transfer.notes || ''}`
            }]
        };

        // Update retailer's product - reduce quantity
        const remainingQuantity = availableQuantity - quantitySold;
        product.quantity = remainingQuantity;
        product.updatedAt = timestamp;

        // Add sale record to retailer's product transfers
        if (!product.transfers) {
            product.transfers = [];
        }

        product.transfers.push({
            from: clientId,
            to: newOwner,
            timestamp: timestamp,
            location: transfer.purchaseLocation || transfer.location,
            transportMethod: transfer.paymentMethod || 'sale',
            notes: `Sold ${quantitySold} ${product.unit || 'units'}, ${remainingQuantity} ${product.unit || 'units'} remaining`
        });

        // Save both products
        await ctx.stub.putState(productId, Buffer.from(JSON.stringify(product)));
        await ctx.stub.putState(consumerProductId, Buffer.from(JSON.stringify(consumerProduct)));

        // Record history for consumer's product
        const consumerHistoryEntry: AssetHistory = {
            assetId: consumerProductId,
            action: 'CREATE',
            timestamp: timestamp,
            actor: clientId,
            previousOwner: clientId,
            newOwner: newOwner,
            data: {
                ...transfer,
                quantitySold: quantitySold,
                transferType: 'partial-sale',
                originalProductId: productId,
                remainingQuantity: remainingQuantity
            }
        };

        await this.recordHistory(ctx, consumerProductId, consumerHistoryEntry);

        // Record history for retailer's product (partial sale)
        const retailerHistoryEntry: AssetHistory = {
            assetId: productId,
            action: 'UPDATE',
            timestamp: timestamp,
            actor: clientId,
            previousOwner: clientId,
            newOwner: clientId,
            data: {
                ...transfer,
                quantitySold: quantitySold,
                transferType: 'partial-sale-update',
                newProductId: consumerProductId,
                remainingQuantity: remainingQuantity
            }
        };

        await this.recordHistory(ctx, productId, retailerHistoryEntry);

        console.info(`Product ${productId} partially sold. Consumer: ${consumerProductId} (${quantitySold}), Retailer: ${productId} (${remainingQuantity})`);
        return JSON.stringify({
            type: 'partial',
            retailerProductId: productId,
            consumerProductId: consumerProductId,
            quantitySold: quantitySold,
            remainingQuantity: remainingQuantity
        });
    }

    // Query all assets owned by calling organization
    @Transaction(false)
    @Returns('string')
    public async QueryAssetsByOwner(ctx: Context): Promise<string> {
        // Use normalized client identity so client cert formats (x509 vs username) match stored owner strings
        const clientId = this.getNormalizedClientIdentity(ctx);
        console.log(`Querying assets for owner (normalized): ${clientId}`);

        // Use state range query compatible with LevelDB
        const resultsIterator = await ctx.stub.getStateByRange('', '');
        const ownedAssets: Asset[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record: Asset;

            try {
                record = JSON.parse(strValue);
                // Filter assets that are owned by the current client and have the required structure
                try {
                    // Normalize stored currentOwner for comparison
                    const storedOwner = this.normalizeIdentityString(record.currentOwner || '');
                    if (record && storedOwner === clientId && record.id) {
                        ownedAssets.push(record);
                    }
                } catch (errInner) {
                    // fallback to legacy equality
                    if (record && record.currentOwner === clientId && record.id) {
                        ownedAssets.push(record);
                    }
                }
            } catch (err) {
                // Skip non-asset entries (like history records)
                console.log(`Skipping non-asset entry: ${result.value.key}`);
            }

            result = await resultsIterator.next();
        }

        await resultsIterator.close();

        console.log(`Found ${ownedAssets.length} assets owned by ${clientId}`);
        return JSON.stringify(ownedAssets);
    }

    // Query assets by an explicit owner identity (allows server-side filtering for demos)
    @Transaction(false)
    @Returns('string')
    public async QueryAssetsByOwnerIdentity(ctx: Context, ownerIdentity: string): Promise<string> {
        console.log(`Querying assets for explicit owner identity: ${ownerIdentity}`);

        const resultsIterator = await ctx.stub.getStateByRange('', '');
        const ownedAssets: Asset[] = [];

        let result = await resultsIterator.next();
        while (!result.done) {
            const strValue = Buffer.from(result.value.value.toString()).toString('utf8');
            let record: Asset;

            try {
                record = JSON.parse(strValue);
                // Match provided ownerIdentity against currentOwner or createdBy
                // Use normalized comparison to allow matching username vs x509 forms
                const normProvided = this.normalizeIdentityString(ownerIdentity);
                const storedCurrent = this.normalizeIdentityString(record.currentOwner || '');
                const storedCreated = this.normalizeIdentityString(record.createdBy || '');
                if (record && (storedCurrent === normProvided || storedCreated === normProvided || record.currentOwner === ownerIdentity || record.createdBy === ownerIdentity) && record.id) {
                    ownedAssets.push(record);
                }
            } catch (err) {
                // Skip non-asset entries
            }

            result = await resultsIterator.next();
        }

        await resultsIterator.close();

        console.log(`Found ${ownedAssets.length} assets for explicit owner ${ownerIdentity}`);
        return JSON.stringify(ownedAssets);
    }

    // Query transfer history - Get all assets that were transferred BY the caller
    @Transaction(false)
    @Returns('string')
    public async QueryTransferHistory(ctx: Context): Promise<string> {
        // Use normalized client identity so x509 and username forms match stored history
        const clientId = this.getNormalizedClientIdentity(ctx);
        console.log(`Querying transfer history (normalized) for: ${clientId}`);

        const resultsIterator = await ctx.stub.getStateByRange('', '');
        const transferredAssets: any[] = [];
        const processedAssets = new Set<string>(); // Track assets to avoid duplicates

        let result = await resultsIterator.next();
        while (!result.done) {
            const key = result.value.key;

            // Only check history entries
            if (key.startsWith('HISTORY_')) {
                const strValue = Buffer.from(result.value.value.toString()).toString('utf8');

                try {
                    const historyRecords: AssetHistory[] = JSON.parse(strValue);

                    // Find actions where previousOwner was the caller (compare normalized forms):
                    // 1. TRANSFER actions (complete transfers or complete sales)
                    // 2. CREATE actions where previousOwner === clientId (partial sales - new product for buyer)
                    const transferRecords = historyRecords.filter(record => {
                        try {
                            const prevNorm = this.normalizeIdentityString(record.previousOwner || '');
                            const newNorm = this.normalizeIdentityString(record.newOwner || '');
                            const isTransfer = (record.action === 'TRANSFER' && prevNorm === clientId);
                            const isCreateForBuyer = (record.action === 'CREATE' && prevNorm === clientId && newNorm !== clientId);
                            return isTransfer || isCreateForBuyer;
                        } catch (err) {
                            return false;
                        }
                    });

                    // For each transfer, get the current asset state
                    if (transferRecords.length > 0) {
                        const assetId = key.replace('HISTORY_', '');

                        // Skip if already processed (can happen with multiple transfer records)
                        if (!processedAssets.has(assetId)) {
                            processedAssets.add(assetId);

                            try {
                                const assetBytes = await ctx.stub.getState(assetId);
                                if (assetBytes && assetBytes.length > 0) {
                                    const asset: Asset = JSON.parse(assetBytes.toString());

                                    // Add transfer metadata to the asset
                                    transferredAssets.push({
                                        ...asset,
                                        transferHistory: transferRecords
                                    });
                                }
                            } catch (err) {
                                console.log(`Asset ${assetId} no longer exists, but was transferred`);
                            }
                        }
                    }
                } catch (err) {
                    console.log(`Error parsing history for key ${key}: ${err}`);
                }
            }

            result = await resultsIterator.next();
        }

        await resultsIterator.close();

        console.log(`Found ${transferredAssets.length} assets transferred by ${clientId}`);
        return JSON.stringify(transferredAssets);
    }

    // Get asset history and complete traceability
    @Transaction(false)
    @Returns('string')
    public async GetAssetHistory(ctx: Context, assetId: string): Promise<string> {
        const historyKey = `HISTORY_${assetId}`;
        const existingHistoryBytes = await ctx.stub.getState(historyKey);

        let history: AssetHistory[] = [];
        if (existingHistoryBytes && existingHistoryBytes.length > 0) {
            history = JSON.parse(existingHistoryBytes.toString());
        }

        return JSON.stringify(history);
    }

    // Get complete supply chain traceability for a product
    @Transaction(false)
    @Returns('string')
    public async GetSupplyChainTrace(ctx: Context, assetId: string): Promise<string> {
        const assetString = await this.ReadAsset(ctx, assetId);
        const asset: Asset = JSON.parse(assetString);

        const trace: any = {
            asset,
            history: [],
            rawMaterialsTrace: []
        };

        // Get asset history
        const historyString = await this.GetAssetHistory(ctx, assetId);
        trace.history = JSON.parse(historyString);

        // If this is a product, get raw materials trace
        if (asset.rawMaterials && asset.rawMaterials.length > 0) {
            for (const rawId of asset.rawMaterials) {
                try {
                    const rawTrace = await this.GetSupplyChainTrace(ctx, rawId);
                    trace.rawMaterialsTrace.push(JSON.parse(rawTrace));
                } catch (error) {
                    console.warn(`Could not trace raw material ${rawId}: ${error}`);
                }
            }
        }

        return JSON.stringify(trace);
    }

    // Delete an asset or reduce its quantity (owner or admin)
    @Transaction()
    public async DeleteAsset(ctx: Context, assetId: string, quantityToDelete: string = ''): Promise<string> {
        const exists = await this.AssetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        const assetString = await this.ReadAsset(ctx, assetId);
        const asset: Asset = JSON.parse(assetString);
        const clientId = this.getClientIdentity(ctx);

        // Allow deletion by owner or admin
        if (asset.currentOwner !== clientId && !this.isAdmin(ctx)) {
            throw new Error('Only the asset owner or admin can delete assets');
        }

        const timestamp = new Date().toISOString();

        // If no quantity specified or quantity is empty, delete entire asset (backward compatibility)
        if (!quantityToDelete || quantityToDelete === '') {
            await ctx.stub.deleteState(assetId);

            const historyEntry: AssetHistory = {
                assetId,
                action: 'DELETE',
                timestamp,
                actor: clientId,
                previousOwner: asset.currentOwner,
                newOwner: '',
                data: {
                    reason: 'Asset completely removed from inventory',
                    type: 'complete'
                }
            };

            await this.recordHistory(ctx, assetId, historyEntry);

            console.info(`Asset ${assetId} completely deleted by ${clientId}`);
            return JSON.stringify({
                type: 'complete',
                assetId,
                message: 'Asset completely removed'
            });
        }

        // Partial quantity deletion
        const qtyToDelete = parseFloat(quantityToDelete);

        if (isNaN(qtyToDelete) || qtyToDelete <= 0) {
            throw new Error('Quantity to delete must be a positive number');
        }

        const currentQuantity = asset.quantity || 0;

        if (qtyToDelete > currentQuantity) {
            throw new Error(`Cannot delete ${qtyToDelete} ${asset.unit || 'units'}. Only ${currentQuantity} ${asset.unit || 'units'} available`);
        }

        // Case 1: Deleting all available quantity - remove asset completely
        if (qtyToDelete >= currentQuantity) {
            await ctx.stub.deleteState(assetId);

            const historyEntry: AssetHistory = {
                assetId,
                action: 'DELETE',
                timestamp,
                actor: clientId,
                previousOwner: asset.currentOwner,
                newOwner: '',
                data: {
                    reason: 'All quantity removed from inventory',
                    quantityDeleted: currentQuantity,
                    type: 'complete'
                }
            };

            await this.recordHistory(ctx, assetId, historyEntry);

            console.info(`Asset ${assetId} completely deleted (all ${currentQuantity} ${asset.unit || 'units'}) by ${clientId}`);
            return JSON.stringify({
                type: 'complete',
                assetId,
                quantityDeleted: currentQuantity,
                message: `All ${currentQuantity} ${asset.unit || 'units'} removed`
            });
        }

        // Case 2: Partial deletion - reduce quantity
        const remainingQuantity = currentQuantity - qtyToDelete;
        asset.quantity = remainingQuantity;
        asset.updatedAt = timestamp;

        await ctx.stub.putState(assetId, Buffer.from(JSON.stringify(asset)));

        const historyEntry: AssetHistory = {
            assetId,
            action: 'UPDATE',
            timestamp,
            actor: clientId,
            previousOwner: asset.currentOwner,
            newOwner: asset.currentOwner,
            data: {
                reason: 'Partial quantity removed from inventory',
                quantityDeleted: qtyToDelete,
                remainingQuantity,
                type: 'partial'
            }
        };

        await this.recordHistory(ctx, assetId, historyEntry);

        console.info(`Asset ${assetId} partially deleted: ${qtyToDelete} ${asset.unit || 'units'} removed, ${remainingQuantity} ${asset.unit || 'units'} remaining`);
        return JSON.stringify({
            type: 'partial',
            assetId,
            quantityDeleted: qtyToDelete,
            remainingQuantity,
            message: `${qtyToDelete} ${asset.unit || 'units'} removed, ${remainingQuantity} ${asset.unit || 'units'} remaining`
        });
    }

    // ========================================
    // PENDING TRANSFER SYSTEM
    // ========================================

    // Initiate a transfer (creates pending transfer that must be accepted)
    @Transaction()
    public async InitiateTransfer(
        ctx: Context,
        assetId: string,
        recipientMSP: string,
        transferData: string = '{}'
    ): Promise<string> {
        console.info(`============= START : InitiateTransfer for ${assetId} ===========`);

        // 1. Verify asset exists
        const exists = await this.AssetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        // 2. Read asset
        const assetString = await this.ReadAsset(ctx, assetId);
        const asset: Asset = JSON.parse(assetString);

        // 3. Verify caller is the current owner
        // Use normalized identity comparison for robustness (matches other functions)
        const clientId = this.getNormalizedClientIdentity(ctx);
        if (this.normalizeIdentityString(asset.currentOwner) !== clientId) {
            throw new Error(`Only the current owner can initiate a transfer`);
        }

        // 4. Parse transferData to inspect quantityRequested and check existing pending transfers for this asset
        // Parse transferData early so we can validate requested quantity against existing pending ones
        const tdObj: any = JSON.parse(transferData);
        const newQtyRequested = typeof tdObj.quantityRequested === 'number' ? tdObj.quantityRequested : undefined;

        // Allow multiple pending transfers only when they are partial (quantityRequested present).
        // A full-asset transfer (no quantityRequested) still requires there be no other pending transfers.
        const existingPendingTransfers = await this.findPendingTransfersByAsset(ctx, assetId);

        if (newQtyRequested === undefined) {
            // New transfer is a full-asset transfer; disallow if any pending exists
            if (existingPendingTransfers && existingPendingTransfers.length > 0) {
                throw new Error(`Asset ${assetId} already has a pending transfer: ${existingPendingTransfers[0].id}`);
            }
        } else {
            // New transfer is partial. Sum existing pending quantityRequested and ensure not exceeding available quantity.
            const totalPendingQty = (existingPendingTransfers || [])
                .map((t: PendingTransfer) => (typeof t.quantityRequested === 'number' ? t.quantityRequested : 0))
                .reduce((s: number, v: number) => s + v, 0);

            const availableQty = asset.quantity || 0;
            if (newQtyRequested <= 0) {
                throw new Error('quantityRequested must be greater than 0');
            }
            if (newQtyRequested > availableQty) {
                throw new Error(`quantityRequested (${newQtyRequested}) exceeds available quantity (${availableQty})`);
            }
            if (totalPendingQty + newQtyRequested > availableQty) {
                throw new Error(`Cannot create pending transfer: total requested (${totalPendingQty + newQtyRequested}) would exceed available quantity (${availableQty})`);
            }
        }

        // 5. Validate transfer flow (Producer → Factory → Retailer → Consumer)
        const senderMSP = this.getClientMSP(ctx);

        const allowedTransfers: { [key: string]: string[] } = {
            'ProducerMSP': ['FactoryMSP'],
            'FactoryMSP': ['RetailerMSP'],
            'RetailerMSP': ['ConsumerMSP']
        };

        if (!allowedTransfers[senderMSP] || !allowedTransfers[senderMSP].includes(recipientMSP)) {
            throw new Error(`Transfer from ${senderMSP} to ${recipientMSP} is not allowed in supply chain`);
        }

        // 6. Generate unique transfer ID
        const transferId = this.generateTransferId(assetId);

        // 7. Create PendingTransfer object
        // If quantityRequested is provided, validate it's a positive number
        const quantityRequested = typeof tdObj.quantityRequested === 'number' ? tdObj.quantityRequested : undefined;

        if (quantityRequested !== undefined) {
            if (quantityRequested <= 0) {
                throw new Error('quantityRequested must be greater than 0');
            }
            const availableQty = asset.quantity || 0;
            if (quantityRequested > availableQty) {
                throw new Error(`quantityRequested (${quantityRequested}) exceeds available quantity (${availableQty})`);
            }
        }

        const pendingTransfer: PendingTransfer = {
            id: transferId,
            assetId,
            // Store the normalized identity string as the initiator (consistent with other history entries)
            from: clientId,
            fromMSP: senderMSP,
            to: recipientMSP,  // Store the MSP directly (backwards compatible)
            toMSP: recipientMSP,
            initiatedAt: new Date().toISOString(),
            status: 'PENDING',
            transferData: tdObj,
            previousStatus: asset.status,
            quantityRequested
        };

        // If transferData includes an explicit recipient identity (full X.509 string), store it
        const td = pendingTransfer.transferData || {};
        if (td.recipientIdentity && typeof td.recipientIdentity === 'string') {
            pendingTransfer.toIdentity = td.recipientIdentity;
        }

        // 8. Save PendingTransfer to ledger
        await ctx.stub.putState(transferId, Buffer.from(JSON.stringify(pendingTransfer)));

        // NOTE: Do NOT change the asset.status or update the asset at initiation time.
        // Changing the asset status to 'PENDING_TRANSFER' made the seller's remaining stock
        // disappear from inventory views until the recipient accepted. To keep stock available
        // immediately, we only record the pending transfer and keep the asset state unchanged.

        // 10. Record in history
        const historyEntry: AssetHistory = {
            assetId,
            action: 'INITIATE_TRANSFER',
            timestamp: pendingTransfer.initiatedAt,
            actor: clientId,
            previousOwner: asset.currentOwner,
            newOwner: recipientMSP,
            data: {
                transferId,
                transferData: pendingTransfer.transferData
            }
        };

        await this.recordHistory(ctx, assetId, historyEntry);

        console.info(`Transfer ${transferId} initiated successfully from ${senderMSP} to ${recipientMSP}`);
        console.info(`============= END : InitiateTransfer ===========`);

        return transferId;
    }

    // Accept a pending transfer (recipient only)
    @Transaction()
    public async AcceptTransfer(ctx: Context, transferId: string): Promise<void> {
        console.info(`============= START : AcceptTransfer for ${transferId} ===========`);

        // 1. Read PendingTransfer
        const transferBytes = await ctx.stub.getState(transferId);
        if (!transferBytes || transferBytes.length === 0) {
            throw new Error(`Pending transfer ${transferId} does not exist`);
        }

        const pendingTransfer: PendingTransfer = JSON.parse(transferBytes.toString());

        // 2. Verify caller is the recipient (by MSP)
        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);
        if (pendingTransfer.toMSP !== clientMSP) {
            throw new Error(`Only the recipient (${pendingTransfer.toMSP}) can accept this transfer`);
        }

        // 3. Verify transfer is still pending
        if (pendingTransfer.status !== 'PENDING') {
            throw new Error(`Transfer ${transferId} has already been ${pendingTransfer.status.toLowerCase()}`);
        }

        // 4. Read asset
        const assetString = await this.ReadAsset(ctx, pendingTransfer.assetId);
        const asset: Asset = JSON.parse(assetString);

        // Handle quantityRequested (if present) — perform partial transfer on accept
        const previousOwner = asset.currentOwner;
        const qtyReq = pendingTransfer.quantityRequested;
        const now = new Date().toISOString();

        if (qtyReq !== undefined && qtyReq > 0) {
            const availableQty = asset.quantity || 0;
            if (qtyReq > availableQty) {
                throw new Error(`Pending transfer requested quantity (${qtyReq}) exceeds available quantity (${availableQty})`);
            }

            // Generate new asset id for consumer
            const consumerProductId = `${asset.id}-SALE-${Date.now()}`;

            // Build new consumer asset (split)
            const consumerProduct: Asset = {
                ...asset,
                id: consumerProductId,
                // Use the acceptor's client identity as the new owner so QueryAssetsByOwner will match
                currentOwner: clientId,
                status: 'IN_TRANSIT',
                quantity: qtyReq,
                createdAt: now,
                updatedAt: now,
                origin: `Split from ${asset.id}`,
                transfers: [{
                    from: previousOwner,
                    to: clientId,
                    timestamp: now,
                    location: pendingTransfer.transferData?.location,
                    transportMethod: pendingTransfer.transferData?.transportMethod,
                    notes: pendingTransfer.transferData?.notes || 'Accepted partial transfer'
                }]
            };

            // Decrease original asset quantity and restore its status so it remains visible in seller inventory
            asset.quantity = availableQty - qtyReq;
            asset.updatedAt = now;
            // If the original asset was set to PENDING_TRANSFER at initiation, restore its previousStatus
            // pendingTransfer.previousStatus was stored during InitiateTransfer
            // Restore the original asset status so remaining quantity remains visible to the seller.
            // Use previousStatus if available; otherwise, for products default to 'MANUFACTURED',
            // for other asset types keep the current status value.
            asset.status = pendingTransfer.previousStatus ?? (asset.type === 'PRODUCT' ? 'MANUFACTURED' : asset.status);

            // Update transfers history on original asset
            if (!asset.transfers) {
                asset.transfers = [];
            }
            asset.transfers.push({
                from: previousOwner,
                to: pendingTransfer.toIdentity || clientId,
                timestamp: now,
                location: pendingTransfer.transferData?.location,
                transportMethod: pendingTransfer.transferData?.transportMethod,
                notes: pendingTransfer.transferData?.notes || `Accepted partial transfer (${qtyReq})`
            });

            // Save both assets (update seller with remaining quantity and restored status)
            await ctx.stub.putState(pendingTransfer.assetId, Buffer.from(JSON.stringify(asset)));
            await ctx.stub.putState(consumerProductId, Buffer.from(JSON.stringify(consumerProduct)));

            // Update pending transfer status
            pendingTransfer.status = 'ACCEPTED';
            await ctx.stub.putState(transferId, Buffer.from(JSON.stringify(pendingTransfer)));

            // Record history entries
            const consumerHistory: AssetHistory = {
                assetId: consumerProductId,
                action: 'CREATE',
                timestamp: now,
                actor: clientId,
                previousOwner: previousOwner,
                newOwner: consumerProduct.currentOwner,
                data: {
                    transferId,
                    quantity: qtyReq,
                    transferData: pendingTransfer.transferData
                }
            };
            await this.recordHistory(ctx, consumerProductId, consumerHistory);

            const retailerHistory: AssetHistory = {
                assetId: pendingTransfer.assetId,
                action: 'UPDATE',
                timestamp: now,
                actor: clientId,
                previousOwner: previousOwner,
                newOwner: previousOwner,
                data: {
                    transferId,
                    quantityMoved: qtyReq,
                    remainingQuantity: asset.quantity,
                    transferData: pendingTransfer.transferData
                }
            };
            await this.recordHistory(ctx, pendingTransfer.assetId, retailerHistory);

            console.info(`Transfer ${transferId} accepted (partial). Created ${consumerProductId} for ${pendingTransfer.toIdentity || clientId}`);
        } else {
            // Full transfer path (existing behavior)
            // Use the acceptor's client identity as the new owner
            const newOwnerIdentity = clientId;
            asset.currentOwner = newOwnerIdentity;
            asset.status = 'IN_TRANSIT';
            asset.updatedAt = now;

            if (!asset.transfers) {
                asset.transfers = [];
            }
            asset.transfers.push({
                from: previousOwner,
                to: newOwnerIdentity,
                timestamp: now,
                location: pendingTransfer.transferData?.location,
                transportMethod: pendingTransfer.transferData?.transportMethod,
                temperature: pendingTransfer.transferData?.temperature,
                notes: pendingTransfer.transferData?.notes || 'Transfer accepted'
            });

            await ctx.stub.putState(pendingTransfer.assetId, Buffer.from(JSON.stringify(asset)));

            pendingTransfer.status = 'ACCEPTED';
            await ctx.stub.putState(transferId, Buffer.from(JSON.stringify(pendingTransfer)));

            const historyEntry: AssetHistory = {
                assetId: pendingTransfer.assetId,
                action: 'ACCEPT_TRANSFER',
                timestamp: now,
                actor: clientId,
                previousOwner,
                newOwner: newOwnerIdentity,
                data: {
                    transferId,
                    transferData: pendingTransfer.transferData
                }
            };

            await this.recordHistory(ctx, pendingTransfer.assetId, historyEntry);

            const transferHistoryEntry: AssetHistory = {
                assetId: pendingTransfer.assetId,
                action: 'TRANSFER',
                timestamp: now,
                actor: previousOwner,
                previousOwner,
                newOwner: newOwnerIdentity,
                data: pendingTransfer.transferData
            };

            await this.recordHistory(ctx, pendingTransfer.assetId, transferHistoryEntry);

            console.info(`Transfer ${transferId} accepted successfully. Asset ${pendingTransfer.assetId} transferred from ${previousOwner} to ${newOwnerIdentity}`);
        }
        console.info(`============= END : AcceptTransfer ===========`);
    }

    // Reject a pending transfer (recipient only)
    @Transaction()
    public async RejectTransfer(ctx: Context, transferId: string, reason: string): Promise<void> {
        console.info(`============= START : RejectTransfer for ${transferId} ===========`);

        // 1. Read PendingTransfer
        const transferBytes = await ctx.stub.getState(transferId);
        if (!transferBytes || transferBytes.length === 0) {
            throw new Error(`Pending transfer ${transferId} does not exist`);
        }

        const pendingTransfer: PendingTransfer = JSON.parse(transferBytes.toString());

        // 2. Verify caller is the recipient (by MSP)
        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);
        if (pendingTransfer.toMSP !== clientMSP) {
            throw new Error(`Only the recipient (${pendingTransfer.toMSP}) can reject this transfer`);
        }

        // 3. Verify transfer is still pending
        if (pendingTransfer.status !== 'PENDING') {
            throw new Error(`Transfer ${transferId} has already been ${pendingTransfer.status.toLowerCase()}`);
        }

        // 4. Read asset
        const assetString = await this.ReadAsset(ctx, pendingTransfer.assetId);
        const asset: Asset = JSON.parse(assetString);

        // 5. Revert asset status back to previous status (ownership does NOT change)
        asset.status = pendingTransfer.previousStatus ?? 'CREATED';
        asset.updatedAt = new Date().toISOString();

        // 6. Save updated asset
        await ctx.stub.putState(pendingTransfer.assetId, Buffer.from(JSON.stringify(asset)));

        // 7. Update PendingTransfer status and add rejection reason
        pendingTransfer.status = 'REJECTED';
        pendingTransfer.rejectionReason = reason;
        await ctx.stub.putState(transferId, Buffer.from(JSON.stringify(pendingTransfer)));

        // 8. Record in history
        const historyEntry: AssetHistory = {
            assetId: pendingTransfer.assetId,
            action: 'REJECT_TRANSFER',
            timestamp: asset.updatedAt,
            actor: clientId,
            previousOwner: asset.currentOwner,
            newOwner: asset.currentOwner, // Stays the same
            data: {
                transferId,
                reason,
                transferData: pendingTransfer.transferData
            }
        };

        await this.recordHistory(ctx, pendingTransfer.assetId, historyEntry);

        console.info(`Transfer ${transferId} rejected by ${pendingTransfer.toMSP}. Reason: ${reason}`);
        console.info(`Asset ${pendingTransfer.assetId} remains with ${asset.currentOwner}`);
        console.info(`============= END : RejectTransfer ===========`);
    }

    // Cancel a pending transfer (initiator or admin)
    @Transaction()
    public async CancelPendingTransfer(ctx: Context, transferId: string, reason: string = ''): Promise<void> {
        console.info(`============= START : CancelPendingTransfer for ${transferId} ===========`);

        // 1. Read PendingTransfer
        const transferBytes = await ctx.stub.getState(transferId);
        if (!transferBytes || transferBytes.length === 0) {
            throw new Error(`Pending transfer ${transferId} does not exist`);
        }

        const pendingTransfer: PendingTransfer = JSON.parse(transferBytes.toString());

        // 2. Verify transfer is still pending
        if (pendingTransfer.status !== 'PENDING') {
            throw new Error(`Transfer ${transferId} has already been ${pendingTransfer.status.toLowerCase()}`);
        }

        // 3. Authorization: only initiator (fromMSP) or admin can cancel
        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);

        const isAdmin = this.isAdmin(ctx);
        if (!isAdmin && pendingTransfer.fromMSP !== clientMSP) {
            throw new Error(`Only the initiator (${pendingTransfer.fromMSP}) or an admin can cancel this transfer`);
        }

        // 4. Optionally, restore asset status if needed (contract currently leaves asset untouched at initiation)
        try {
            const assetString = await this.ReadAsset(ctx, pendingTransfer.assetId);
            const asset: Asset = JSON.parse(assetString);

            // If the pending transfer stored a previousStatus, ensure asset.status is at least restored
            if (pendingTransfer.previousStatus && asset.status !== pendingTransfer.previousStatus) {
                asset.status = pendingTransfer.previousStatus;
                asset.updatedAt = new Date().toISOString();
                await ctx.stub.putState(asset.id, Buffer.from(JSON.stringify(asset)));
            }
        } catch (err) {
            // If asset read fails, continue — cancellation should still proceed; log for debug
            console.debug(`Warning: could not read asset ${pendingTransfer.assetId} while cancelling transfer ${transferId}: ${err}`);
        }

        // 5. Update PendingTransfer status to CANCELLED and add cancellation metadata
        pendingTransfer.status = 'CANCELLED';
        pendingTransfer.cancellationReason = reason;
        pendingTransfer.cancelledAt = new Date().toISOString();
        pendingTransfer.cancelledBy = clientId;

        await ctx.stub.putState(transferId, Buffer.from(JSON.stringify(pendingTransfer)));

        // 6. Record history entry
        const historyEntry: AssetHistory = {
            assetId: pendingTransfer.assetId,
            action: 'CANCEL_TRANSFER',
            timestamp: pendingTransfer.cancelledAt!,
            actor: clientId,
            previousOwner: pendingTransfer.from,
            newOwner: pendingTransfer.from,
            data: {
                transferId,
                reason,
                cancelledBy: clientId
            }
        };

        await this.recordHistory(ctx, pendingTransfer.assetId, historyEntry);

        console.info(`Transfer ${transferId} cancelled by ${clientMSP} (${clientId}). Reason: ${reason}`);
        console.info(`============= END : CancelPendingTransfer ===========`);
    }

    // Get pending transfers for current user
    @Transaction(false)
    @Returns('string')
    public async GetPendingTransfers(ctx: Context): Promise<string> {
        console.info(`============= START : GetPendingTransfers ===========`);

        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);
        const pendingTransfers: any[] = [];

        // Iterate through all state entries
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();

        while (!result.done) {
            const key = result.value.key;

            // Check if this is a transfer key
            if (key.startsWith('TRANSFER-')) {
                try {
                    const transferBytes = result.value.value;
                    const transfer: PendingTransfer = JSON.parse(transferBytes.toString());

                    // Only include PENDING transfers where user is sender or recipient
                    if (transfer.status === 'PENDING') {
                        if (transfer.fromMSP === clientMSP) {
                            // Outgoing transfer - user initiated it
                            pendingTransfers.push({
                                ...transfer,
                                direction: 'outgoing'
                            });
                        } else if (transfer.toMSP === clientMSP) {
                            // Incoming transfer - user must accept/reject
                            pendingTransfers.push({
                                ...transfer,
                                direction: 'incoming'
                            });
                        }
                    }
                } catch (err) {
                    console.log(`Error parsing transfer ${key}: ${err}`);
                }
            }

            result = await iterator.next();
        }

        await iterator.close();

        console.info(`Found ${pendingTransfers.length} pending transfers for user`);
        console.info(`============= END : GetPendingTransfers ===========`);

        return JSON.stringify(pendingTransfers);
    }

    // Check if asset exists
    @Transaction(false)
    @Returns('boolean')
    public async AssetExists(ctx: Context, assetId: string): Promise<boolean> {
        const assetJSON = await ctx.stub.getState(assetId);
        return assetJSON && assetJSON.length > 0;
    }

    // Helper methods
    private validateAsset(asset: Asset, ctx: Context): void {
        if (!asset.name || !asset.type) {
            throw new Error('Asset must have name and type');
        }

        if (!asset.id) {
            throw new Error('Asset must have an ID');
        }
    }

    private validateTransfer(asset: Asset, newOwner: string, ctx: Context): void {
        const currentMSP = this.getClientMSP(ctx);
        const newOwnerMSP = this.extractMSPFromIdentity(newOwner);

        // Define allowed transfer paths in supply chain
        const allowedTransfers: { [key: string]: string[] } = {
            'ProducerMSP': ['FactoryMSP'],
            'FactoryMSP': ['RetailerMSP'],
            'RetailerMSP': ['ConsumerMSP']
        };

        if (!allowedTransfers[currentMSP] || !allowedTransfers[currentMSP].includes(newOwnerMSP)) {
            throw new Error(`Transfer from ${currentMSP} to ${newOwnerMSP} is not allowed in supply chain`);
        }
    }

    private async recordHistory(ctx: Context, assetId: string, entry: AssetHistory): Promise<void> {
        const historyKey = `HISTORY_${assetId}`;
        const existingHistoryBytes = await ctx.stub.getState(historyKey);

        let history: AssetHistory[] = [];
        if (existingHistoryBytes && existingHistoryBytes.length > 0) {
            history = JSON.parse(existingHistoryBytes.toString());
        }

        // Enrich entry with transaction metadata for auditability
        try {
            const txId = ctx.stub.getTxID();
            // getTxTimestamp returns a protobuf Timestamp - convert to JS ISO string if available
            let txTimestampIso = '';
            try {
                const txTimestamp: any = ctx.stub.getTxTimestamp();
                // txTimestamp has { seconds, nanos } depending on the stub implementation
                if (txTimestamp && (txTimestamp.seconds || txTimestamp.seconds === 0)) {
                    const seconds = typeof txTimestamp.seconds === 'object' ? Number(txTimestamp.seconds.low || txTimestamp.seconds) : Number(txTimestamp.seconds);
                    txTimestampIso = new Date(seconds * 1000).toISOString();
                }
            } catch (err) {
                // ignore timestamp conversion errors
            }

            entry.txId = txId;
            if (txTimestampIso) entry.txTimestamp = txTimestampIso;
        } catch (err) {
            // ignore if stub methods not available in certain test environments
        }

        // Add the explicit submitter identity when available
        try {
            entry.submittedBy = ctx.clientIdentity ? ctx.clientIdentity.getID() : undefined;
        } catch (err) {
            // ignore
        }

        history.push(entry);
        await ctx.stub.putState(historyKey, Buffer.from(JSON.stringify(history)));
    }

    private getClientIdentity(ctx: Context): string {
        // Return the raw client identity string
        return ctx.clientIdentity.getID();
    }

    private normalizeIdentityString(id: string): string {
        if (!id) return '';
        // Try to extract CN from x509 identity strings like 'x509::<DN>::<IssuerDN>'
        const m = id.match(/CN=([^,\/:+]+)/i);
        if (m && m[1]) return m[1].toLowerCase();
        // If it's already a simple username like user@org..., return lowercased
        return id.toLowerCase();
    }

    private getNormalizedClientIdentity(ctx: Context): string {
        try {
            const id = ctx.clientIdentity.getID();
            return this.normalizeIdentityString(id);
        } catch (err) {
            return '';
        }
    }

    private getClientMSP(ctx: Context): string {
        return ctx.clientIdentity.getMSPID();
    }

    private extractMSPFromIdentity(identity: string): string {
        // Extract MSP from identity string
        // Pattern for x509::/C=US/ST=California/L=San Francisco/OU=admin/CN=Admin@ORG.supplychain.com::/C=US/ST=California/L=San Francisco/O=ORG.supplychain.com/CN=ca.ORG.supplychain.com
        const orgMatch = identity.match(/CN=Admin@(\w+)\.supplychain\.com/);
        if (orgMatch) {
            const org = orgMatch[1];
            // Convert organization name to MSP ID (capitalize first letter + MSP)
            return org.charAt(0).toUpperCase() + org.slice(1) + 'MSP';
        }

        // Fallback to original pattern for backward compatibility
        const mspMatch = identity.match(/::CN=.*?,OU=.*?,OU=(.*?)MSP/);
        return mspMatch ? mspMatch[1] + 'MSP' : '';
    }

    private isAdmin(ctx: Context): boolean {
        const attrs = ctx.clientIdentity.getAttributeValue('hf.Type');
        return attrs === 'admin';
    }

    // Helper function to generate unique transfer ID
    private generateTransferId(assetId: string): string {
        const timestamp = Date.now();
        return `TRANSFER-${assetId}-${timestamp}`;
    }

    // Helper function to find pending transfer by asset ID
    private async findPendingTransferByAsset(ctx: Context, assetId: string): Promise<PendingTransfer | null> {
        const iterator = await ctx.stub.getStateByRange('', '');
        let result = await iterator.next();

        while (!result.done) {
            const key = result.value.key;

            // Check if this is a transfer key
            if (key.startsWith('TRANSFER-')) {
                try {
                    const transferBytes = result.value.value;
                    const transfer: PendingTransfer = JSON.parse(transferBytes.toString());

                    // Check if this transfer is for the asset and is still pending
                    if (transfer.assetId === assetId && transfer.status === 'PENDING') {
                        await iterator.close();
                        return transfer;
                    }
                } catch (err) {
                    // Skip invalid entries
                }
            }

            result = await iterator.next();
        }

        await iterator.close();
        return null;
    }

    private async getAllResults(iterator: any, isHistory: boolean = false): Promise<any[]> {
        const results = [];
        let res = await iterator.next();

        while (!res.done) {
            if (res.value && res.value.value.toString()) {
                let jsonRes: any = {};

                if (isHistory && res.value.value && res.value.timestamp) {
                    jsonRes.TxId = res.value.tx_id;
                    jsonRes.Timestamp = res.value.timestamp;
                    jsonRes.IsDelete = res.value.is_delete.toString();

                    try {
                        jsonRes.Value = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        jsonRes.Value = res.value.value.toString('utf8');
                    }
                } else {
                    jsonRes.Key = res.value.key;

                    try {
                        jsonRes.Record = JSON.parse(res.value.value.toString('utf8'));
                    } catch (err) {
                        jsonRes.Record = res.value.value.toString('utf8');
                    }
                }

                results.push(jsonRes);
            }
            res = await iterator.next();
        }

        await iterator.close();
        return results;
    }
}
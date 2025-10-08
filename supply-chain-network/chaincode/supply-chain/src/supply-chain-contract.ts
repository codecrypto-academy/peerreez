/*
 * SPDX-License-Identifier: Apache-2.0
 */

import { Context, Contract, Info, Returns, Transaction } from 'fabric-contract-api';
import { Asset, AssetHistory, AssetTransfer } from './types';

@Info({ title: 'SupplyChainContract', description: 'Smart contract for supply chain traceability' })
export class SupplyChainContract extends Contract {

    // Initialize ledger with sample data (optional)
    @Transaction()
    public async InitLedger(ctx: Context): Promise<void> {
        console.info('============= START : Initialize Ledger ===========');
        console.info('============= END : Initialize Ledger ===========');
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
        asset.createdBy = this.getClientIdentity(ctx);
        asset.currentOwner = asset.createdBy;
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
        const clientId = this.getClientIdentity(ctx);

        // Verify ownership
        if (asset.currentOwner !== clientId) {
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
        const clientId = this.getClientIdentity(ctx);

        // Verify ownership
        if (asset.currentOwner !== clientId) {
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
        if (product.status !== 'MANUFACTURED') {
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
        const clientId = this.getClientIdentity(ctx);
        console.log(`Querying assets for owner: ${clientId}`);

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
                if (record && record.currentOwner === clientId && record.id) {
                    ownedAssets.push(record);
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

    // Query transfer history - Get all assets that were transferred BY the caller
    @Transaction(false)
    @Returns('string')
    public async QueryTransferHistory(ctx: Context): Promise<string> {
        const clientId = this.getClientIdentity(ctx);
        console.log(`Querying transfer history for: ${clientId}`);

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

                    // Find actions where previousOwner was the caller:
                    // 1. TRANSFER actions (complete transfers or complete sales)
                    // 2. CREATE actions where previousOwner === clientId (partial sales - new product for buyer)
                    const transferRecords = historyRecords.filter(record =>
                        (record.action === 'TRANSFER' && record.previousOwner === clientId) ||
                        (record.action === 'CREATE' && record.previousOwner === clientId && record.newOwner !== clientId)
                    );

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

        history.push(entry);
        await ctx.stub.putState(historyKey, Buffer.from(JSON.stringify(history)));
    }

    private getClientIdentity(ctx: Context): string {
        return ctx.clientIdentity.getID();
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
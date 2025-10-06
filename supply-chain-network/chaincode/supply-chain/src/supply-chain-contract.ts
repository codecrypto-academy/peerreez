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
    public async TransformAsset(ctx: Context, rawMaterialIds: string, newAssetId: string, productData: string): Promise<void> {
        const clientId = this.getClientIdentity(ctx);
        const clientMSP = this.getClientMSP(ctx);

        // Only Factory organization can transform assets
        if (clientMSP !== 'FactoryMSP') {
            throw new Error('Only Factory organization can transform raw materials into products');
        }

        const rawIds: string[] = JSON.parse(rawMaterialIds);
        const product: Asset = JSON.parse(productData);

        // Validate all raw materials exist and are owned by factory
        const rawMaterials: Asset[] = [];
        for (const rawId of rawIds) {
            const rawAssetString = await this.ReadAsset(ctx, rawId);
            const rawAsset: Asset = JSON.parse(rawAssetString);

            if (rawAsset.currentOwner !== clientId) {
                throw new Error(`Factory doesn't own raw material ${rawId}`);
            }

            rawMaterials.push(rawAsset);
        }

        // Create new product
        product.createdAt = new Date().toISOString();
        product.updatedAt = product.createdAt;
        product.createdBy = clientId;
        product.currentOwner = clientId;
        product.status = 'MANUFACTURED';
        product.type = 'PRODUCT';
        product.rawMaterials = rawIds;

        await ctx.stub.putState(newAssetId, Buffer.from(JSON.stringify(product)));

        // Update raw materials status to CONSUMED
        for (const rawAsset of rawMaterials) {
            rawAsset.status = 'CONSUMED';
            rawAsset.updatedAt = product.createdAt;
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
                product: product
            }
        };

        await this.recordHistory(ctx, newAssetId, historyEntry);

        console.info(`Product ${newAssetId} created from raw materials: ${rawIds.join(', ')}`);
    }

    // Query all assets owned by calling organization
    @Transaction(false)
    @Returns('string')
    public async QueryAssetsByOwner(ctx: Context): Promise<string> {
        const clientId = this.getClientIdentity(ctx);
        const queryString = JSON.stringify({
            selector: {
                currentOwner: clientId
            }
        });

        const resultsIterator = await ctx.stub.getQueryResult(queryString);
        const results = await this.getAllResults(resultsIterator);
        return JSON.stringify(results);
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

    // Delete an asset (admin only)
    @Transaction()
    public async DeleteAsset(ctx: Context, assetId: string): Promise<void> {
        const exists = await this.AssetExists(ctx, assetId);
        if (!exists) {
            throw new Error(`The asset ${assetId} does not exist`);
        }

        // Only admin can delete
        if (!this.isAdmin(ctx)) {
            throw new Error('Only admin can delete assets');
        }

        await ctx.stub.deleteState(assetId);
        console.info(`Asset ${assetId} deleted successfully`);
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
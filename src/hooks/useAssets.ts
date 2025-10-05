import { useState, useCallback } from 'react';
import { Asset } from '../types';
import { TransactionResult } from '../types/fabric';
import { useFabricNetwork } from './useFabricNetwork';

interface AssetsState {
    assets: Asset[];
    isLoading: boolean;
    error: string | null;
}

export const useAssets = () => {
    const { chaincodeInvoker, isConnected, requiresConnection } = useFabricNetwork();

    const [state, setState] = useState<AssetsState>({
        assets: [],
        isLoading: false,
        error: null
    });

    // Load assets owned by current user
    const loadMyAssets = useCallback(async (): Promise<void> => {
        if (!isConnected) return;

        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await chaincodeInvoker.QueryAssetsByOwner();

            if (result.success && result.data) {
                const assetsData = JSON.parse(result.data as string);
                const assets = assetsData.map((item: { Record?: Asset }) => item.Record || item) as Asset[];

                setState(prev => ({
                    ...prev,
                    assets,
                    isLoading: false
                }));
            } else {
                setState(prev => ({
                    ...prev,
                    assets: [],
                    isLoading: false
                }));
            }
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to load assets'
            }));
        }
    }, [chaincodeInvoker, isConnected]);

    // Create asset (Producer/Factory)
    const createAsset = useCallback(async (assetId: string, assetData: Asset): Promise<TransactionResult> => {
        requiresConnection();
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await chaincodeInvoker.CreateAsset(assetId, JSON.stringify(assetData));

            if (result.success) {
                // Refresh assets list after creation
                await loadMyAssets();
            }

            setState(prev => ({ ...prev, isLoading: false }));
            return result;
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to create asset'
            }));
            throw error;
        }
    }, [chaincodeInvoker, requiresConnection, loadMyAssets]);

    // Read single asset
    const readAsset = useCallback(async (assetId: string): Promise<Asset | null> => {
        requiresConnection();

        try {
            const result = await chaincodeInvoker.ReadAsset(assetId);

            if (result.success && result.data) {
                return JSON.parse(result.data as string) as Asset;
            }

            return null;
        } catch (error: unknown) {
            console.error('Failed to read asset:', error);
            throw error;
        }
    }, [chaincodeInvoker, requiresConnection]);

    // Transfer asset to another owner
    const transferAsset = useCallback(async (
        assetId: string,
        newOwner: string,
        transferData: Record<string, unknown> = {}
    ): Promise<TransactionResult> => {
        requiresConnection();
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await chaincodeInvoker.TransferAsset(
                assetId,
                newOwner,
                JSON.stringify(transferData)
            );

            if (result.success) {
                // Refresh assets list after transfer
                await loadMyAssets();
            }

            setState(prev => ({ ...prev, isLoading: false }));
            return result;
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to transfer asset'
            }));
            throw error;
        }
    }, [chaincodeInvoker, requiresConnection, loadMyAssets]);

    // Transform assets (Factory only)
    const transformAssets = useCallback(async (
        rawMaterialIds: string[],
        newAssetId: string,
        productData: Asset
    ): Promise<TransactionResult> => {
        requiresConnection();
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            const result = await chaincodeInvoker.TransformAsset(
                JSON.stringify(rawMaterialIds),
                newAssetId,
                JSON.stringify(productData)
            );

            if (result.success) {
                // Refresh assets list after transformation
                await loadMyAssets();
            }

            setState(prev => ({ ...prev, isLoading: false }));
            return result;
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Failed to transform assets'
            }));
            throw error;
        }
    }, [chaincodeInvoker, requiresConnection, loadMyAssets]);

    // Get asset history
    const getAssetHistory = useCallback(async (assetId: string) => {
        requiresConnection();

        try {
            const result = await chaincodeInvoker.GetAssetHistory(assetId);

            if (result.success && result.data) {
                return JSON.parse(result.data as string);
            }

            return [];
        } catch (error: unknown) {
            console.error('Failed to get asset history:', error);
            throw error;
        }
    }, [chaincodeInvoker, requiresConnection]);

    // Get complete supply chain trace
    const getSupplyChainTrace = useCallback(async (assetId: string) => {
        requiresConnection();

        try {
            const result = await chaincodeInvoker.GetSupplyChainTrace(assetId);

            if (result.success && result.data) {
                return JSON.parse(result.data as string);
            }

            return null;
        } catch (error: unknown) {
            console.error('Failed to get supply chain trace:', error);
            throw error;
        }
    }, [chaincodeInvoker, requiresConnection]);

    return {
        // State
        ...state,
        isConnected,

        // Asset operations
        createAsset,
        readAsset,
        transferAsset,
        transformAssets,

        // Query operations
        loadMyAssets,
        getAssetHistory,
        getSupplyChainTrace,

        // Utility
        refreshAssets: loadMyAssets
    };
};
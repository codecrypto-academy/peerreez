import { useState, useEffect, useCallback } from 'react';
import { getMockAssetService, Asset } from '../lib/fabric/mock-asset-service';
import { TransactionResult, Role } from '../types/fabric';
import { useCurrentUser } from '../components/auth/RoleGuard';

// Hook para operaciones con assets
export function useAsset() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = useCurrentUser();
    const assetService = getMockAssetService();

    const createAsset = useCallback(async (assetId: string, assetData: Asset): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.createAsset(assetId, assetData, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to create asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create asset';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    const readAsset = useCallback(async (assetId: string): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.readAsset(assetId, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to read asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to read asset';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    const updateAsset = useCallback(async (assetId: string, updates: Partial<Asset>): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.updateAsset(assetId, updates, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to update asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to update asset';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    const transferAsset = useCallback(async (
        assetId: string,
        newOwner: string,
        transferData: any = {}
    ): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.transferAsset(assetId, newOwner, transferData, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to transfer asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to transfer asset';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    const assetExists = useCallback(async (assetId: string): Promise<boolean> => {
        if (!user) return false;

        try {
            return await assetService.assetExists(assetId, user.role);
        } catch {
            return false;
        }
    }, [user, assetService]);

    return {
        loading,
        error,
        createAsset,
        readAsset,
        updateAsset,
        transferAsset,
        assetExists,
        clearError: () => setError(null)
    };
}

// Hook para queries múltiples
export function useAssetQuery() {
    const [assets, setAssets] = useState<Asset[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = useCurrentUser();
    const assetService = getMockAssetService();

    const queryAssetsByOwner = useCallback(async (): Promise<Asset[]> => {
        if (!user) return [];

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.queryAssetsByOwner(user.role);
            if (result.success && Array.isArray(result.data)) {
                setAssets(result.data);
                return result.data;
            } else {
                setError(result.error || 'Failed to query assets');
                return [];
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to query assets';
            setError(errorMsg);
            return [];
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    const getAssetHistory = useCallback(async (assetId: string) => {
        if (!user) return null;

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.getAssetHistory(assetId, user.role);
            if (result.success) {
                return result.data;
            } else {
                setError(result.error || 'Failed to get asset history');
                return null;
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to get asset history';
            setError(errorMsg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    const getSupplyChainTrace = useCallback(async (assetId: string) => {
        if (!user) return null;

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.getSupplyChainTrace(assetId, user.role);
            if (result.success) {
                return result.data;
            } else {
                setError(result.error || 'Failed to get supply chain trace');
                return null;
            }
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to get supply chain trace';
            setError(errorMsg);
            return null;
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    return {
        assets,
        loading,
        error,
        queryAssetsByOwner,
        getAssetHistory,
        getSupplyChainTrace,
        clearError: () => setError(null)
    };
}

// Hook para transformaciones (Factory específico)
export function useAssetTransform() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = useCurrentUser();
    const assetService = getMockAssetService();

    const transformAsset = useCallback(async (
        rawMaterialIds: string[],
        newAssetId: string,
        productData: Asset
    ): Promise<TransactionResult> => {
        if (!user || user.role !== 'factory') {
            return { success: false, error: 'Only factories can transform assets' };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await assetService.transformAsset(rawMaterialIds, newAssetId, productData, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to transform asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to transform asset';
            setError(errorMsg);
            return { success: false, error: errorMsg };
        } finally {
            setLoading(false);
        }
    }, [user, assetService]);

    return {
        loading,
        error,
        transformAsset,
        clearError: () => setError(null)
    };
}

// Hook para notificaciones y estado de transacciones
export function useTransactionStatus() {
    const [transactions, setTransactions] = useState<{ [key: string]: TransactionResult }>({});

    const addTransaction = useCallback((id: string, result: TransactionResult) => {
        setTransactions(prev => ({
            ...prev,
            [id]: result
        }));
    }, []);

    const removeTransaction = useCallback((id: string) => {
        setTransactions(prev => {
            const { [id]: removed, ...rest } = prev;
            return rest;
        });
    }, []);

    const clearTransactions = useCallback(() => {
        setTransactions({});
    }, []);

    return {
        transactions,
        addTransaction,
        removeTransaction,
        clearTransactions
    };
}
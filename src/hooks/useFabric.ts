'use client';

import { useState, useCallback } from 'react';
import { getFabricHttpService, Asset } from '../lib/fabric/http-service';
import { TransactionResult } from '../types/fabric';
import { useCurrentUser } from '../components/auth/RoleGuard';

// Hook simplificado para operaciones con assets usando HTTP API
export function useAsset() {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const user = useCurrentUser();
    const httpService = getFabricHttpService();

    const createAsset = useCallback(async (assetId: string, assetData: Asset): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated', data: null };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.createAsset(assetId, assetData, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to create asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to create asset';
            setError(errorMsg);
            return { success: false, error: errorMsg, data: null };
        } finally {
            setLoading(false);
        }
    }, [user, httpService]);

    const readAsset = useCallback(async (assetId: string): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated', data: null };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.readAsset(assetId, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to read asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to read asset';
            setError(errorMsg);
            return { success: false, error: errorMsg, data: null };
        } finally {
            setLoading(false);
        }
    }, [user, httpService]);

    const updateAsset = useCallback(async (assetId: string, updates: Partial<Asset>): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated', data: null };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.updateAsset(assetId, updates, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to update asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to update asset';
            setError(errorMsg);
            return { success: false, error: errorMsg, data: null };
        } finally {
            setLoading(false);
        }
    }, [user, httpService]);

    const transferAsset = useCallback(async (
        assetId: string,
        newOwner: string,
        transferData: any = {}
    ): Promise<TransactionResult> => {
        if (!user) {
            return { success: false, error: 'User not authenticated', data: null };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.transferAsset(assetId, newOwner, transferData, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to transfer asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to transfer asset';
            setError(errorMsg);
            return { success: false, error: errorMsg, data: null };
        } finally {
            setLoading(false);
        }
    }, [user, httpService]);

    const assetExists = useCallback(async (assetId: string): Promise<boolean> => {
        if (!user) return false;

        try {
            return await httpService.assetExists(assetId, user.role);
        } catch {
            return false;
        }
    }, [user, httpService]);

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
    const httpService = getFabricHttpService();

    const queryAssetsByOwner = useCallback(async (): Promise<Asset[]> => {
        if (!user) return [];

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.queryAssetsByOwner(user.role);
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
    }, [user, httpService]);

    const getAssetHistory = useCallback(async (assetId: string) => {
        if (!user) return null;

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.getAssetHistory(assetId, user.role);
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
    }, [user, httpService]);

    const getSupplyChainTrace = useCallback(async (assetId: string) => {
        if (!user) return null;

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.getSupplyChainTrace(assetId, user.role);
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
    }, [user, httpService]);

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
    const httpService = getFabricHttpService();

    const transformAsset = useCallback(async (
        rawMaterialIds: string[],
        newAssetId: string,
        productData: Asset
    ): Promise<TransactionResult> => {
        if (!user || user.role !== 'factory') {
            return { success: false, error: 'Only factories can transform assets', data: null };
        }

        setLoading(true);
        setError(null);

        try {
            const result = await httpService.transformAsset(rawMaterialIds, newAssetId, productData, user.role);
            if (!result.success) {
                setError(result.error || 'Failed to transform asset');
            }
            return result;
        } catch (err: any) {
            const errorMsg = err.message || 'Failed to transform asset';
            setError(errorMsg);
            return { success: false, error: errorMsg, data: null };
        } finally {
            setLoading(false);
        }
    }, [user, httpService]);

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
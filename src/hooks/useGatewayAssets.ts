'use client';

/**
 * Hook para iniciar una transferencia pendiente (Factory → Retailer)
 */
export function useInitiateTransfer() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assetId,
            recipientMSP,
            transferData,
        }: {
            assetId: string;
            recipientMSP: string;
            transferData?: Record<string, unknown>;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.initiateTransfer(
                toGatewayRole(user.role),
                assetId,
                recipientMSP,
                transferData
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to initiate transfer');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries para refrescar assets y transferencias
            if (user) {
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
                queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.assetId) });
            }
        },
    });
}


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser, UserRole } from '@/components/auth/RoleGuard';
import { gatewayHttpService } from '@/lib/fabric/gateway/gateway-http-service';
import { Role } from '@/lib/fabric/identity/identity-manager';

/**
 * Asset type definition
 */
export interface Asset {
    id: string;
    name?: string;
    type?: string;
    category?: string;
    status?: string;
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    currentOwner?: string;
    [key: string]: unknown;
}

/**
 * Convert UserRole (lowercase) to Gateway Role (capitalized)
 */
function toGatewayRole(userRole: UserRole): Role {
    const roleMap: Record<UserRole, Role> = {
        producer: 'Producer',
        factory: 'Factory',
        retailer: 'Retailer',
        consumer: 'Consumer',
    };
    return roleMap[userRole];
}

/**
 * Query Keys for React Query
 */
export const assetKeys = {
    all: ['assets'] as const,
    byOwner: (role: Role) => [...assetKeys.all, 'owner', role] as const,
    detail: (assetId: string) => [...assetKeys.all, 'detail', assetId] as const,
    history: (assetId: string) => [...assetKeys.all, 'history', assetId] as const,
};

/**
 * Hook to query assets by owner with React Query caching
 */
export function useAssetsByOwner() {
    const user = useCurrentUser();
    const gatewayRole = user ? toGatewayRole(user.role) : 'Producer';

    return useQuery({
        queryKey: assetKeys.byOwner(gatewayRole),
        queryFn: async () => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.queryAssetsByOwner(toGatewayRole(user.role));

            if (!result.success) {
                throw new Error(result.error || 'Failed to query assets');
            }

            return (result.data || []) as Asset[];
        },
        enabled: !!user,
        staleTime: 30 * 1000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
    });
}

/**
 * Hook to read a single asset with caching
 */
export function useAsset(assetId: string | null) {
    const user = useCurrentUser();

    return useQuery({
        queryKey: assetKeys.detail(assetId || ''),
        queryFn: async () => {
            if (!user || !assetId) {
                throw new Error('User not authenticated or asset ID missing');
            }

            const result = await gatewayHttpService.readAsset(toGatewayRole(user.role), assetId);

            if (!result.success) {
                throw new Error(result.error || 'Failed to read asset');
                "use client";

            }

            return result.data as Asset;
        },
        enabled: !!user && !!assetId,
        staleTime: 60 * 1000, // 1 minute
    });
}

/**
 * Hook to get asset history with caching
 */
export function useAssetHistory(assetId: string | null) {
    const user = useCurrentUser();

    return useQuery({
        queryKey: assetKeys.history(assetId || ''),
        queryFn: async () => {
            if (!user || !assetId) {
                throw new Error('User not authenticated or asset ID missing');
            }

            const result = await gatewayHttpService.getSupplyChainTrace(toGatewayRole(user.role), assetId);

            if (!result.success) {
                throw new Error(result.error || 'Failed to get supply chain trace');
            }

            // Parse the trace data if it's a string
            const traceData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

            return traceData;
        },
        enabled: !!user && !!assetId,
        staleTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook to create an asset with optimistic updates
 */
export function useCreateAsset() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assetId,
            assetType,
            quantity,
            unit,
            metadata,
        }: {
            assetId: string;
            assetType: string;
            quantity: number;
            unit: string;
            metadata: Record<string, unknown>;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.createAsset(
                toGatewayRole(user.role),
                assetId,
                assetType,
                quantity,
                unit,
                metadata
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to create asset');
            }

            return result;
        },
        onSuccess: () => {
            // Invalidate and refetch assets by owner
            if (user) {
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
            }
        },
    });
}

/**
 * Hook to transfer an asset with optimistic updates
 */
export function useTransferAsset() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assetId,
            newOwner,
            transferData,
        }: {
            assetId: string;
            newOwner: string;
            transferData?: Record<string, unknown>;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.transferAsset(
                toGatewayRole(user.role),
                assetId,
                newOwner,
                transferData
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to transfer asset');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries for both current owner and potentially new owner
            if (user) {
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
                queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.assetId) });
            }
        },
    });
}

/**
 * Hook to sell product with partial quantity (Retailer to Consumer)
 */
export function useSellProduct() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            productId,
            newOwner,
            quantityToSell,
            transferData,
        }: {
            productId: string;
            newOwner: string;
            quantityToSell: number;
            transferData?: Record<string, unknown>;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.sellProduct(
                toGatewayRole(user.role),
                productId,
                newOwner,
                quantityToSell,
                transferData
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to sell product');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries for retailer inventory and history
            if (user) {
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.productId) });
                queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.productId) });
            }
        },
    });
}

/**
 * Hook to update asset metadata
 */
export function useUpdateAssetMetadata() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assetId,
            metadata,
        }: {
            assetId: string;
            metadata: Record<string, unknown>;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.updateAssetMetadata(
                toGatewayRole(user.role),
                assetId,
                metadata
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to update metadata');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries for this asset
            queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
            if (user) {
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
            }
        },
    });
}

/**
 * Hook to delete an asset or reduce its quantity
 */
export function useDeleteAsset() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            assetId,
            quantityToDelete
        }: {
            assetId: string;
            quantityToDelete?: number;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.deleteAsset(
                toGatewayRole(user.role),
                assetId,
                quantityToDelete
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to delete asset');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate queries for owner and specific asset
            if (user) {
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
                queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.assetId) });
            }
        },
    });
}

/**
 * Hook to manually refetch assets (for refresh buttons)
 */
export function useRefetchAssets() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return () => {
        if (user) {
            queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
        }
    };
}

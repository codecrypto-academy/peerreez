'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser, UserRole } from '@/components/auth/RoleGuard';
import { gatewayHttpService } from '@/lib/fabric/gateway/gateway-http-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { PendingTransfer, InitiateTransferParams } from '@/types/fabric';
import { assetKeys } from './useGatewayAssets';

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
export const pendingTransferKeys = {
    all: ['pendingTransfers'] as const,
    byRole: (role: Role) => [...pendingTransferKeys.all, 'role', role] as const,
};

/**
 * Hook to query pending transfers with React Query caching
 * Returns both incoming and outgoing pending transfers for the current user
 */
export function usePendingTransfers() {
    const user = useCurrentUser();
    const gatewayRole = user ? toGatewayRole(user.role) : 'Producer';

    return useQuery({
        queryKey: pendingTransferKeys.byRole(gatewayRole),
        queryFn: async () => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.getPendingTransfers(toGatewayRole(user.role));

            if (!result.success) {
                throw new Error(result.error || 'Failed to get pending transfers');
            }

            // Parse the data if it's a string (chaincode returns JSON string)
            const transfers = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;

            return (transfers || []) as PendingTransfer[];
        },
        enabled: !!user,
        staleTime: 10 * 1000, // 10 seconds - shorter for real-time feel
        gcTime: 5 * 60 * 1000, // 5 minutes
        refetchOnWindowFocus: true,
        refetchInterval: 30 * 1000, // Auto-refetch every 30 seconds
    });
}

/**
 * Hook to initiate a transfer request (2-step transfer: step 1)
 * Chaincode v4.0: Uses recipientMSP instead of recipientIdentity
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
            recipientMSP: string; // Changed from recipientIdentity to recipientMSP
            transferData?: InitiateTransferParams['transferData'];
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            // Pre-check: if this is a full-asset transfer (no quantityRequested)
            // ensure there is no existing pending transfer for the same asset.
            const qtyRequested = transferData && typeof transferData.quantityRequested === 'number'
                ? transferData.quantityRequested
                : undefined;

            if (qtyRequested === undefined) {
                // Full transfer - check pending transfers to avoid endorsement failure
                const pendingRes = await gatewayHttpService.getPendingTransfers(toGatewayRole(user.role));
                if (!pendingRes.success) {
                    throw new Error(pendingRes.error || 'Failed to check existing pending transfers');
                }

                const pendingList: any[] = typeof pendingRes.data === 'string' ? JSON.parse(pendingRes.data) : (pendingRes.data || []);
                const conflict = pendingList.find((t: any) => t.assetId === assetId && t.status === 'PENDING');
                if (conflict) {
                    throw new Error(`Asset ${assetId} already has a pending transfer: ${conflict.id}`);
                }
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
            // Invalidate pending transfers and asset queries
            if (user) {
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
            }
        },
    });
}

/**
 * Hook to accept a pending transfer (2-step transfer: step 2a)
 */
export function useAcceptTransfer() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            transferId,
            assetId, // Optional: for invalidating asset queries
        }: {
            transferId: string;
            assetId?: string;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.acceptTransfer(
                toGatewayRole(user.role),
                transferId
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to accept transfer');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate pending transfers and asset queries
            if (user) {
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                if (variables.assetId) {
                    queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
                    queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.assetId) });
                }
            }
        },
    });
}

/**
 * Hook to reject a pending transfer (2-step transfer: step 2b)
 */
export function useRejectTransfer() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({
            transferId,
            reason,
            assetId, // Optional: for invalidating asset queries
        }: {
            transferId: string;
            reason: string;
            assetId?: string;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.rejectTransfer(
                toGatewayRole(user.role),
                transferId,
                reason
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to reject transfer');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate pending transfers and asset queries
            if (user) {
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                if (variables.assetId) {
                    queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
                    queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.assetId) });
                }
            }
        },
    });
}

/**
 * Hook to cancel a pending transfer (initiator/admin)
 */
export function useCancelTransfer() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async ({ transferId, reason, assetId }: { transferId: string; reason?: string; assetId?: string; }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.cancelTransfer(
                toGatewayRole(user.role),
                transferId,
                reason
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to cancel transfer');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            if (user) {
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)) });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                if (variables.assetId) {
                    queryClient.invalidateQueries({ queryKey: assetKeys.detail(variables.assetId) });
                    queryClient.invalidateQueries({ queryKey: assetKeys.history(variables.assetId) });
                }
            }
        }
    });
}

/**
 * Hook to manually refetch pending transfers (for refresh buttons)
 */
export function useRefetchPendingTransfers() {
    const user = useCurrentUser();
    const queryClient = useQueryClient();

    return () => {
        if (user) {
            queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)) });
        }
    };
}

'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCurrentUser, UserRole } from '@/components/auth/RoleGuard';
import { gatewayHttpService } from '@/lib/fabric/gateway/gateway-http-service';
import { Role } from '@/lib/fabric/identity/identity-manager';
import { PendingTransfer, InitiateTransferParams } from '@/types/fabric';
import { assetKeys } from './useGatewayAssets';

// Small runtime-safe helper to read assetId from unknown mutation variables
function getAssetIdFromVariables(vars: unknown): string | undefined {
    if (!vars || typeof vars !== 'object') return undefined;
    const maybe = vars as Record<string, unknown>;
    const id = maybe['assetId'];
    return typeof id === 'string' ? id : undefined;
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
export const pendingTransferKeys = {
    all: ['pendingTransfers'] as const,
    // Include optional ownerIdentity in the cache key so queries vary per selected user
    byRole: (role: Role, ownerIdentity?: string) => [...pendingTransferKeys.all, 'role', role, ownerIdentity || ''] as const,
};

/**
 * Hook to query pending transfers with React Query caching
 * Returns both incoming and outgoing pending transfers for the current user
 */
export function usePendingTransfers(ownerAddress?: string) {
    const user = useCurrentUser();
    const gatewayRole = user ? toGatewayRole(user.role) : 'Producer';

    return useQuery({
        // include ownerAddress in the cache key so the query re-runs when the selected user changes
        queryKey: pendingTransferKeys.byRole(gatewayRole, ownerAddress),
        queryFn: async () => {
            if (!user) {
                throw new Error('User not authenticated');
            }

            const result = await gatewayHttpService.getPendingTransfers(toGatewayRole(user.role), ownerAddress);

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
        select: (data: PendingTransfer[]) => {
            // If no ownerAddress provided, return all pending transfers (caller will show org-level)
            if (!ownerAddress) return data;

            const addr = String(ownerAddress).toLowerCase();
            const normalize = (s?: unknown) => (s && typeof s === 'string' ? s.toLowerCase() : '');

            return data.filter((t) => {
                const from = normalize(t.from);
                const to = normalize(t.to);
                const toIdentity = normalize((t as any).toIdentity);
                const tdRecipient = normalize(t.transferData && (t.transferData as any).recipientIdentity);

                // Direct matches: from/to/toIdentity
                if (from === addr || to === addr || toIdentity === addr) return true;

                // Match email-like local part (user@org -> user)
                const localFrom = from.includes('@') ? from.split('@')[0] : '';
                const localTo = (toIdentity || to).includes('@') ? (toIdentity || to).split('@')[0] : '';
                if (localFrom === addr || localTo === addr) return true;

                // Match transferData.recipientIdentity if present
                if (tdRecipient && tdRecipient === addr) return true;

                // Containment heuristics (cover some x509 vs short address variants)
                if ((from && from.includes(addr)) || (to && to.includes(addr)) || (toIdentity && toIdentity.includes(addr)) || (addr.includes(from) && from.length > 0) || (addr.includes(to) && to.length > 0) || (toIdentity && addr.includes(toIdentity) && toIdentity.length > 0)) return true;

                // Do not include org-level toMSP matches when a specific ownerAddress is provided
                return false;
            });
        }
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
            recipientIdentity,
            ownerIdentity,
        }: {
            assetId: string;
            recipientMSP: string; // Changed from recipientIdentity to recipientMSP
            transferData?: InitiateTransferParams['transferData'];
            recipientIdentity?: string;
            ownerIdentity?: string;
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

                const pendingList = (typeof pendingRes.data === 'string' ? JSON.parse(pendingRes.data) : (pendingRes.data || [])) as PendingTransfer[];
                const conflict = pendingList.find((t: PendingTransfer) => t.assetId === assetId && t.status === 'PENDING');
                if (conflict) {
                    throw new Error(`Asset ${assetId} already has a pending transfer: ${conflict.id}`);
                }
            }

            const result = await gatewayHttpService.initiateTransfer(
                toGatewayRole(user.role),
                assetId,
                recipientMSP,
                transferData,
                recipientIdentity,
                ownerIdentity
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to initiate transfer');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate pending transfers and asset queries
            if (user) {
                // Invalidate all pending transfer queries for this role (including owner-specific variants)
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)), exact: false });
                // Clear all asset caches for this role (owner-specific keys are part of the cache)
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)), exact: false });
                const _assetId = getAssetIdFromVariables(variables);
                if (_assetId) queryClient.invalidateQueries({ queryKey: assetKeys.detail(_assetId) });
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
            ownerIdentity,
        }: {
            transferId: string;
            ownerIdentity?: string;
            assetId?: string;
        }) => {
            if (!user) {
                throw new Error('User not authenticated');
            }
            const result = await gatewayHttpService.acceptTransfer(
                toGatewayRole(user.role),
                transferId,
                ownerIdentity
            );

            if (!result.success) {
                throw new Error(result.error || 'Failed to accept transfer');
            }

            return result;
        },
        onSuccess: (_, variables) => {
            // Invalidate pending transfers and asset queries
            if (user) {
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)), exact: false });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)), exact: false });
                const _assetId = getAssetIdFromVariables(variables);
                if (_assetId) {
                    queryClient.invalidateQueries({ queryKey: assetKeys.detail(_assetId) });
                    queryClient.invalidateQueries({ queryKey: assetKeys.history(_assetId) });
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
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)), exact: false });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)), exact: false });
                const _assetId = getAssetIdFromVariables(variables);
                if (_assetId) {
                    queryClient.invalidateQueries({ queryKey: assetKeys.detail(_assetId) });
                    queryClient.invalidateQueries({ queryKey: assetKeys.history(_assetId) });
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
        mutationFn: async ({ transferId, reason }: { transferId: string; reason?: string; assetId?: string; }) => {
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
                queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)), exact: false });
                queryClient.invalidateQueries({ queryKey: assetKeys.byOwner(toGatewayRole(user.role)) });
                const _assetId = getAssetIdFromVariables(variables);
                if (_assetId) {
                    queryClient.invalidateQueries({ queryKey: assetKeys.detail(_assetId) });
                    queryClient.invalidateQueries({ queryKey: assetKeys.history(_assetId) });
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
            queryClient.invalidateQueries({ queryKey: pendingTransferKeys.byRole(toGatewayRole(user.role)), exact: false });
        }
    };
}

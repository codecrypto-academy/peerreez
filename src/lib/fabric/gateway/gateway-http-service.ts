import { Role } from '../identity/identity-manager';
import { TransactionResult } from '@/types/fabric';

/**
 * Gateway HTTP Service
 * Client-side service that calls the Gateway API routes
 * Uses fetch to communicate with Next.js API routes
 */
class GatewayHttpService {
    private static instance: GatewayHttpService;

    private constructor() { }

    public static getInstance(): GatewayHttpService {
        if (!GatewayHttpService.instance) {
            GatewayHttpService.instance = new GatewayHttpService();
        }
        return GatewayHttpService.instance;
    }

    /**
     * Query assets by owner using Gateway API
     */
    async queryAssetsByOwner(role: Role, ownerIdentity?: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] GET /api/fabric/gateway queryByOwner', { role, ownerIdentity });
            const url = ownerIdentity
                ? `/api/fabric/gateway?operation=queryByOwner&role=${role}&ownerIdentity=${encodeURIComponent(ownerIdentity)}`
                : `/api/fabric/gateway?operation=queryByOwner&role=${role}`;
            const response = await fetch(url,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Read a single asset
     */
    async readAsset(role: Role, assetId: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] GET /api/fabric/gateway readAsset', { role, assetId });
            const response = await fetch(
                `/api/fabric/gateway?operation=readAsset&role=${role}&assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Get asset history
     */
    async getAssetHistory(role: Role, assetId: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] GET /api/fabric/gateway getHistory', { role, assetId });
            const response = await fetch(
                `/api/fabric/gateway?operation=getHistory&role=${role}&assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Get complete supply chain trace
     */
    async getSupplyChainTrace(role: Role, assetId: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] GET /api/fabric/gateway getTrace', { role, assetId });
            const response = await fetch(
                `/api/fabric/gateway?operation=getTrace&role=${role}&assetId=${encodeURIComponent(assetId)}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Create a new asset
     */
    async createAsset(
        role: Role,
        assetId: string,
        assetType: string,
        quantity: number,
        unit: string,
        metadata: Record<string, unknown>,
        ownerIdentity?: string
    ): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway createAsset', { role, assetId });
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'createAsset',
                    role,
                    assetId,
                    assetType,
                    quantity,
                    unit,
                    metadata,
                    ownerIdentity
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Transfer an asset to another organization
     */
    async transferAsset(
        role: Role,
        assetId: string,
        newOwner: string,
        transferData?: Record<string, unknown>
    ): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway transferAsset', { role, assetId, newOwner });
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'transferAsset',
                    role,
                    assetId,
                    newOwner,
                    transferData: transferData || {},
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Update asset metadata
     */
    async updateAssetMetadata(
        role: Role,
        assetId: string,
        metadata: Record<string, unknown>
    ): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway updateMetadata', { role, assetId });
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'updateMetadata',
                    role,
                    assetId,
                    metadata,
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Sell product with partial quantity (Retailer to Consumer)
     */
    async sellProduct(
        role: Role,
        productId: string,
        newOwner: string,
        quantityToSell: number,
        transferData?: Record<string, unknown>
    ): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway sellProduct', { role, productId, newOwner, quantityToSell });
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    operation: 'sellProduct',
                    role,
                    productId,
                    newOwner,
                    quantityToSell,
                    transferData: transferData || {},
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Delete an asset or reduce its quantity (Owner or Admin)
     */
    async deleteAsset(role: Role, assetId: string, quantityToDelete?: number, ownerIdentity?: string): Promise<TransactionResult> {
        try {
            const body: Record<string, unknown> = {
                operation: 'deleteAsset',
                role,
                assetId,
            };

            // Only include quantityToDelete if it's provided and valid
            if (quantityToDelete !== undefined && quantityToDelete > 0) {
                body.quantityToDelete = quantityToDelete;
            }
            if (ownerIdentity) {
                body.ownerIdentity = ownerIdentity;
            }

            console.debug('[GatewayHttpService] POST /api/fabric/gateway deleteAsset', { role, assetId, quantityToDelete });
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Initiate a transfer request (2-step transfer: step 1)
     * Creates a pending transfer that requires recipient acceptance
     */
    async initiateTransfer(
        role: Role,
        assetId: string,
        recipientMSP: string,
        transferData?: Record<string, unknown>,
        recipientIdentity?: string,
        ownerIdentity?: string
    ): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway/initiate-transfer', { role, assetId, recipientMSP, recipientIdentity });
            const body: Record<string, unknown> = {
                role,
                assetId,
                recipientMSP,
                transferData: transferData || {},
            };

            if (recipientIdentity) {
                body.recipientIdentity = recipientIdentity;
            }

            if (ownerIdentity) {
                body.ownerIdentity = ownerIdentity;
            }

            const response = await fetch('/api/fabric/gateway/initiate-transfer', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Accept a pending transfer (2-step transfer: step 2a)
     * Recipient accepts the transfer and completes ownership change
     */
    async acceptTransfer(role: Role, transferId: string, ownerIdentity?: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway/accept-transfer', { role, transferId, ownerIdentity });
            const body: Record<string, unknown> = { role, transferId };
            if (ownerIdentity) body.ownerIdentity = ownerIdentity;

            const response = await fetch('/api/fabric/gateway/accept-transfer', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(body),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Reject a pending transfer (2-step transfer: step 2b)
     * Recipient rejects the transfer with a reason
     */
    async rejectTransfer(role: Role, transferId: string, reason: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway/reject-transfer', { role, transferId, reason });
            const response = await fetch('/api/fabric/gateway/reject-transfer', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    role,
                    transferId,
                    reason,
                }),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Get all pending transfers for the caller
     * Returns both incoming and outgoing pending transfers
     */
    async getPendingTransfers(role: Role, ownerIdentity?: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] GET /api/fabric/gateway/pending-transfers', { role, ownerIdentity });
            const url = ownerIdentity
                ? `/api/fabric/gateway/pending-transfers?role=${role}&ownerIdentity=${encodeURIComponent(ownerIdentity)}`
                : `/api/fabric/gateway/pending-transfers?role=${role}`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }

    /**
     * Cancel a pending transfer (initiator/admin)
     */
    async cancelTransfer(role: Role, transferId: string, reason?: string): Promise<TransactionResult> {
        try {
            console.debug('[GatewayHttpService] POST /api/fabric/gateway/cancel-transfer', { role, transferId });
            const response = await fetch('/api/fabric/gateway/cancel-transfer', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ role, transferId, reason }),
            });

            if (!response.ok) {
                const errorData = (await response.json()) as { error?: string } | null;
                return {
                    success: false,
                    error: (errorData && errorData.error) || `HTTP error! status: ${response.status}`,
                };
            }

            return (await response.json()) as TransactionResult;
        } catch (error: unknown) {
            console.error('Gateway HTTP error:', error);
            const message = error instanceof Error ? error.message : String(error);
            return {
                success: false,
                error: message || 'Network error',
            };
        }
    }
}

// Export singleton instance
export const gatewayHttpService = GatewayHttpService.getInstance();

import { TransactionResult, Role } from '../../types/fabric';

// Mock Asset interface para desarrollo
export interface Asset {
    id: string;
    name: string;
    type: 'RAW_MATERIAL' | 'FINISHED_PRODUCT';
    category: string;
    description: string;
    location: string;
    quantity: number;
    certifications?: string[];
    quality?: {
        grade?: string;
        moistureLevel?: string;
        proteinContent?: string;
        tests?: string[];
        defects?: string[];
    };
    createdAt?: string;
    updatedAt?: string;
    createdBy?: string;
    currentOwner?: string;
    status?: string;
}

// Mock database para desarrollo
const mockAssets: Asset[] = [
    {
        id: 'RAW-MOCK-001',
        name: 'Premium Organic Wheat',
        type: 'RAW_MATERIAL',
        category: 'Grains',
        description: 'High-quality organic wheat from sustainable farming practices',
        location: 'Farm Valley, Oregon',
        quantity: 500,
        certifications: ['Organic', 'Non-GMO', 'Sustainable'],
        quality: {
            grade: 'Premium',
            moistureLevel: '12%',
            proteinContent: '14%'
        },
        createdAt: '2025-10-05T10:00:00.000Z',
        updatedAt: '2025-10-05T10:00:00.000Z',
        createdBy: 'producer-001',
        currentOwner: 'producer-001',
        status: 'CREATED'
    }
];

// Simulación de delays de red
const simulateDelay = (ms: number = 1000) =>
    new Promise(resolve => setTimeout(resolve, ms));

export class MockAssetService {
    /**
     * Create a new asset (Mock)
     */
    async createAsset(assetId: string, assetData: Asset, userRole: Role): Promise<TransactionResult> {
        await simulateDelay(1500);

        try {
            // Simular validaciones
            if (mockAssets.find(asset => asset.id === assetId)) {
                return {
                    success: false,
                    error: `Asset ${assetId} already exists`,
                    data: null
                };
            }

            // Agregar timestamps y metadata
            const newAsset: Asset = {
                ...assetData,
                id: assetId,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: `${userRole}-user`,
                currentOwner: `${userRole}-user`,
                status: 'CREATED'
            };

            mockAssets.push(newAsset);

            return {
                success: true,
                txId: `mock-tx-${Date.now()}`,
                data: newAsset
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Read an asset by ID (Mock)
     */
    async readAsset(assetId: string, userRole: Role): Promise<TransactionResult> {
        await simulateDelay(500);

        try {
            const asset = mockAssets.find(a => a.id === assetId);

            if (!asset) {
                return {
                    success: false,
                    error: `Asset ${assetId} does not exist`,
                    data: null
                };
            }

            return {
                success: true,
                data: asset
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Update an existing asset (Mock)
     */
    async updateAsset(assetId: string, updates: Partial<Asset>, userRole: Role): Promise<TransactionResult> {
        await simulateDelay(1200);

        try {
            const assetIndex = mockAssets.findIndex(a => a.id === assetId);

            if (assetIndex === -1) {
                return {
                    success: false,
                    error: `Asset ${assetId} does not exist`,
                    data: null
                };
            }

            // Update asset
            mockAssets[assetIndex] = {
                ...mockAssets[assetIndex],
                ...updates,
                updatedAt: new Date().toISOString()
            };

            return {
                success: true,
                txId: `mock-tx-${Date.now()}`,
                data: mockAssets[assetIndex]
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Check if an asset exists (Mock)
     */
    async assetExists(assetId: string, userRole: Role): Promise<boolean> {
        await simulateDelay(300);
        return mockAssets.some(a => a.id === assetId);
    }

    /**
     * Delete an asset (Mock)
     */
    async deleteAsset(assetId: string, userRole: Role): Promise<TransactionResult> {
        await simulateDelay(800);

        try {
            // Simular restricción de admin
            if (userRole !== 'producer') {
                return {
                    success: false,
                    error: 'Only admins can delete assets',
                    data: null
                };
            }

            const assetIndex = mockAssets.findIndex(a => a.id === assetId);

            if (assetIndex === -1) {
                return {
                    success: false,
                    error: `Asset ${assetId} does not exist`,
                    data: null
                };
            }

            mockAssets.splice(assetIndex, 1);

            return {
                success: true,
                txId: `mock-tx-${Date.now()}`,
                data: null
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Transfer an asset (Mock)
     */
    async transferAsset(
        assetId: string,
        newOwner: string,
        transferData: any = {},
        userRole: Role
    ): Promise<TransactionResult> {
        await simulateDelay(1800);

        try {
            const assetIndex = mockAssets.findIndex(a => a.id === assetId);

            if (assetIndex === -1) {
                return {
                    success: false,
                    error: `Asset ${assetId} does not exist`,
                    data: null
                };
            }

            // Simular validación de roles
            const roleTransitions: { [key: string]: string[] } = {
                'producer': ['factory'],
                'factory': ['retailer'],
                'retailer': ['consumer']
            };

            if (!roleTransitions[userRole]?.includes(newOwner)) {
                return {
                    success: false,
                    error: `Transfer from ${userRole} to ${newOwner} is not allowed`,
                    data: null
                };
            }

            // Update asset
            mockAssets[assetIndex] = {
                ...mockAssets[assetIndex],
                currentOwner: `${newOwner}-user`,
                updatedAt: new Date().toISOString()
            };

            return {
                success: true,
                txId: `mock-tx-${Date.now()}`,
                data: mockAssets[assetIndex]
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Transform raw materials (Mock)
     */
    async transformAsset(
        rawMaterialIds: string[],
        newAssetId: string,
        productData: Asset,
        userRole: Role
    ): Promise<TransactionResult> {
        await simulateDelay(2000);

        try {
            if (userRole !== 'factory') {
                return {
                    success: false,
                    error: 'Only factories can transform assets',
                    data: null
                };
            }

            // Verificar que los materiales existan
            const rawMaterials = mockAssets.filter(a => rawMaterialIds.includes(a.id));
            if (rawMaterials.length !== rawMaterialIds.length) {
                return {
                    success: false,
                    error: 'Some raw materials not found',
                    data: null
                };
            }

            // Crear nuevo producto
            const newProduct: Asset = {
                ...productData,
                id: newAssetId,
                type: 'FINISHED_PRODUCT',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                createdBy: `${userRole}-user`,
                currentOwner: `${userRole}-user`,
                status: 'CREATED'
            };

            mockAssets.push(newProduct);

            return {
                success: true,
                txId: `mock-tx-${Date.now()}`,
                data: newProduct
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Query assets by owner (Mock)
     */
    async queryAssetsByOwner(userRole: Role): Promise<TransactionResult> {
        await simulateDelay(800);

        try {
            const userAssets = mockAssets.filter(a =>
                a.currentOwner?.includes(userRole) || a.createdBy?.includes(userRole)
            );

            return {
                success: true,
                data: userAssets
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Get asset history (Mock)
     */
    async getAssetHistory(assetId: string, userRole: Role): Promise<TransactionResult> {
        await simulateDelay(600);

        try {
            const asset = mockAssets.find(a => a.id === assetId);

            if (!asset) {
                return {
                    success: false,
                    error: `Asset ${assetId} does not exist`,
                    data: null
                };
            }

            // Mock history
            const history = [
                {
                    assetId,
                    action: 'CREATE',
                    timestamp: asset.createdAt,
                    actor: asset.createdBy,
                    data: asset
                }
            ];

            return {
                success: true,
                data: history
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Get supply chain trace (Mock)
     */
    async getSupplyChainTrace(assetId: string, userRole: Role): Promise<TransactionResult> {
        await simulateDelay(900);

        try {
            const asset = mockAssets.find(a => a.id === assetId);

            if (!asset) {
                return {
                    success: false,
                    error: `Asset ${assetId} does not exist`,
                    data: null
                };
            }

            // Mock trace
            const trace = {
                assetId,
                currentStatus: asset.status,
                steps: [
                    {
                        step: 1,
                        role: 'producer',
                        action: 'CREATE',
                        timestamp: asset.createdAt,
                        location: asset.location
                    }
                ]
            };

            return {
                success: true,
                data: trace
            };
        } catch (error: any) {
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    /**
     * Initialize ledger (Mock)
     */
    async initLedger(userRole: Role): Promise<TransactionResult> {
        await simulateDelay(1000);

        return {
            success: true,
            txId: `mock-init-${Date.now()}`,
            data: 'Ledger initialized successfully (MOCK)'
        };
    }
}

// Singleton instance
let mockAssetServiceInstance: MockAssetService | null = null;

/**
 * Get the singleton Mock Asset service instance
 */
export function getMockAssetService(): MockAssetService {
    if (!mockAssetServiceInstance) {
        mockAssetServiceInstance = new MockAssetService();
    }
    return mockAssetServiceInstance;
}
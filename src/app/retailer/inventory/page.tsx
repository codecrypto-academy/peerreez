'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useAssetsByOwner, useDeleteAsset, Asset } from '@/hooks/useGatewayAssets';

export default function InventoryManagementPage() {
    const { data: assets = [], isLoading, refetch } = useAssetsByOwner();
    const deleteMutation = useDeleteAsset();

    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState<string>('all');
    const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
    const [quantityToDelete, setQuantityToDelete] = useState<number>(0);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Filter assets that should be considered inventory:
    // - PRODUCT assets that are MANUFACTURED, DELIVERED or IN_TRANSIT
    // - RAW_MATERIAL assets (e.g., bread batches) that are CREATED or MANUFACTURED
    const allProducts = (assets as Asset[]).filter(
        (asset: Asset) => (
            (asset.type === 'PRODUCT' && (asset.status === 'MANUFACTURED' || asset.status === 'DELIVERED' || asset.status === 'IN_TRANSIT')) ||
            (asset.type === 'RAW_MATERIAL' && (asset.status === 'CREATED' || asset.status === 'MANUFACTURED'))
        )
    ) || [];

    // Get unique categories
    const categories = ['all', ...new Set(allProducts.map((p: Asset) => p.category || 'uncategorized'))];

    // Apply filters
    const filteredProducts = allProducts.filter((product: Asset) => {
        const matchesSearch = !searchTerm ||
            product.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.id?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesCategory = categoryFilter === 'all' || product.category === categoryFilter;

        return matchesSearch && matchesCategory;
    });

    // Calculate statistics
    const totalProducts = allProducts.length;
    const totalQuantity = allProducts.reduce((sum: number, p: Asset) => sum + (typeof p.quantity === 'number' ? p.quantity : Number(p.quantity || 0)), 0);

    const handleDelete = async (assetId: string, availableQuantity: number, unit: string) => {
        // Validate quantity
        if (quantityToDelete <= 0) {
            setNotification({ type: 'error', message: 'Please enter a valid quantity to remove' });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        if (quantityToDelete > availableQuantity) {
            setNotification({ type: 'error', message: `Cannot remove ${quantityToDelete} ${unit}. Only ${availableQuantity} ${unit} available.` });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        try {
            const result = await deleteMutation.mutateAsync({
                assetId,
                quantityToDelete
            });

            // Parse the result data to show appropriate message
            const resultDataRaw = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
            type DeleteResult = { type?: string; quantityDeleted?: number; remainingQuantity?: number };
            const resultData = resultDataRaw as DeleteResult | undefined;

            if (resultData && resultData.type === 'complete') {
                setNotification({
                    type: 'success',
                    message: `✅ Product completely removed: ${resultData.quantityDeleted || availableQuantity} ${unit}`
                });
            } else {
                setNotification({
                    type: 'success',
                    message: `✅ ${resultData?.quantityDeleted || 0} ${unit} removed. ${resultData?.remainingQuantity || 0} ${unit} remaining in stock.`
                });
            }

            setDeleteConfirmId(null);
            setQuantityToDelete(0);
            setTimeout(() => setNotification(null), 5000);
            refetch();
        } catch (err: unknown) {
            console.error('Delete error:', err);
            const message = err instanceof Error ? err.message : String(err);
            setNotification({ type: 'error', message: `❌ Error: ${message}` });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    const handleOpenDeleteModal = (productId: string, availableQuantity: number) => {
        setDeleteConfirmId(productId);
        setQuantityToDelete(availableQuantity); // Default to all quantity
    };

    const handleCancelDelete = () => {
        setDeleteConfirmId(null);
        setQuantityToDelete(0);
    };

    return (
        <Layout title="Inventory Management" description="Manage your product inventory">
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-teal-100">
                <div className="container mx-auto px-6 py-8">
                    {/* Toast Notification */}
                    {notification && (
                        <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl border-2 backdrop-blur-sm animate-slide-in-right ${notification.type === 'success'
                            ? 'bg-green-50/90 border-green-300 text-green-800'
                            : 'bg-red-50/90 border-red-300 text-red-800'
                            }`}>
                            <div className="flex items-center gap-3">
                                {notification.type === 'success' ? (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                )}
                                <p className="font-semibold">{notification.message}</p>
                            </div>
                        </div>
                    )}

                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-4xl font-bold text-gray-900 mb-2">Inventory Management</h1>
                                <p className="text-lg text-gray-600">View and manage your product stock</p>
                            </div>
                            <a
                                href="/retailer"
                                className="px-6 py-3 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-xl transition-colors duration-200 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                                </svg>
                                Back to Dashboard
                            </a>
                        </div>
                    </div>

                    {/* Statistics Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Products</p>
                                    <p className="text-3xl font-bold text-green-600">{totalProducts}</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Total Quantity</p>
                                    <p className="text-3xl font-bold text-blue-600">{totalQuantity.toFixed(1)}</p>
                                </div>
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Filters and Search */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 mb-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Search */}
                            <div>
                                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                                    Search Products
                                </label>
                                <div className="relative">
                                    <input
                                        type="text"
                                        id="search"
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        placeholder="Search by name or ID..."
                                        className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-black"
                                    />
                                    <svg className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                    </svg>
                                </div>
                            </div>

                            {/* Category Filter */}
                            <div>
                                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-2">
                                    Filter by Category
                                </label>
                                <select
                                    id="category"
                                    value={categoryFilter}
                                    onChange={(e) => setCategoryFilter(e.target.value)}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white text-black"
                                >
                                    {categories.map((cat) => (
                                        <option key={cat} value={cat}>
                                            {cat === 'all' ? 'All Categories' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between">
                            <p className="text-sm text-gray-600">
                                Showing <span className="font-semibold">{filteredProducts.length}</span> of <span className="font-semibold">{totalProducts}</span> products
                            </p>
                            <button
                                onClick={() => refetch()}
                                className="px-4 py-2 bg-green-100 hover:bg-green-200 text-green-700 font-medium rounded-lg transition-colors duration-200 flex items-center gap-2"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Refresh
                            </button>
                        </div>
                    </div>

                    {/* Product Table */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 overflow-hidden">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-12">
                                <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                <span className="text-gray-600 ml-3 text-lg">Loading inventory...</span>
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="bg-gradient-to-r from-green-500 to-teal-500 text-white">
                                        <tr>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">Product</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">ID</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">Category</th>
                                            <th className="px-6 py-4 text-center text-sm font-semibold">Quantity</th>
                                            <th className="px-6 py-4 text-left text-sm font-semibold">Status</th>
                                            <th className="px-6 py-4 text-center text-sm font-semibold">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-200">
                                        {filteredProducts.map((product: Asset, index: number) => {
                                            const qty = typeof product.quantity === 'number' ? product.quantity : Number(product.quantity || 0);
                                            const unit = typeof product.unit === 'string' ? product.unit : 'units';
                                            return (
                                                <tr key={product.id} className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-green-50 transition-colors duration-150`}>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                                                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                                </svg>
                                                            </div>
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{String(product.name)}</p>
                                                                {product.description && typeof product.description === 'string' && (
                                                                    <p className="text-xs text-gray-500">{product.description}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">{product.id}</code>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-block px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                            {product.category || 'N/A'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-center">
                                                        <div className="flex flex-col items-center">
                                                            <p className="text-lg font-bold text-gray-900">{qty || 0}</p>
                                                            <p className="text-xs text-gray-500">{unit}</p>
                                                            {qty < 10 && (
                                                                <span className="mt-1 px-2 py-0.5 rounded text-xs font-medium bg-orange-100 text-orange-800">
                                                                    Low Stock
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-block px-3 py-1 rounded-full text-xs font-medium ${product.status === 'MANUFACTURED'
                                                            ? 'bg-green-100 text-green-800'
                                                            : product.status === 'IN_TRANSIT'
                                                                ? 'bg-blue-100 text-blue-800'
                                                                : 'bg-gray-100 text-gray-800'
                                                            }`}>
                                                            {product.status || 'UNKNOWN'}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <div className="flex items-center justify-center gap-2">
                                                            {deleteConfirmId === product.id ? (
                                                                <div className="flex flex-col items-center gap-2 min-w-[200px]">
                                                                    <div className="flex items-center gap-2 w-full">
                                                                        <div className="flex-1">
                                                                            <label className="block text-xs font-medium text-gray-700 mb-1">
                                                                                Quantity to Remove
                                                                            </label>
                                                                            <input
                                                                                type="number"
                                                                                value={quantityToDelete}
                                                                                onChange={(e) => setQuantityToDelete(parseFloat(e.target.value) || 0)}
                                                                                min="0"
                                                                                max={qty}
                                                                                step="0.01"
                                                                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 text-black"
                                                                                placeholder="0"
                                                                            />
                                                                            <p className="text-xs text-gray-500 mt-1">
                                                                                Max: {qty} {unit}
                                                                            </p>
                                                                        </div>
                                                                    </div>
                                                                    <div className="flex items-center gap-2 w-full">
                                                                        <button
                                                                            onClick={() => handleDelete(product.id, qty, unit)}
                                                                            disabled={deleteMutation.isPending || quantityToDelete <= 0}
                                                                            className="flex-1 px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                                                        >
                                                                            {deleteMutation.isPending ? 'Removing...' : 'Remove'}
                                                                        </button>
                                                                        <button
                                                                            onClick={handleCancelDelete}
                                                                            disabled={deleteMutation.isPending}
                                                                            className="flex-1 px-3 py-1.5 bg-gray-300 hover:bg-gray-400 text-gray-800 text-sm font-medium rounded-lg transition-colors duration-200"
                                                                        >
                                                                            Cancel
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleOpenDeleteModal(product.id, qty)}
                                                                    className="px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-sm font-medium rounded-lg transition-colors duration-200 flex items-center gap-1"
                                                                >
                                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                    </svg>
                                                                    Remove
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <svg className="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                                <h3 className="text-xl font-medium text-gray-900 mb-2">No Products Found</h3>
                                <p className="text-gray-500">
                                    {searchTerm || categoryFilter !== 'all'
                                        ? 'Try adjusting your filters'
                                        : 'No products in inventory yet'}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Info Card */}
                    <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-start">
                            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-blue-900 mb-2">Inventory Management Information</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• View all products received from Factory with real-time quantities</li>
                                    <li>• Search and filter products by name, ID, or category</li>
                                    <li>• Monitor low stock items (less than 10 units) with alerts</li>
                                    <li>• <strong>Remove partial or complete quantities</strong> when needed (damaged, expired, obsolete)</li>
                                    <li>• Click &quot;Remove&quot; to specify the exact quantity you want to delete</li>
                                    <li>• Removing the entire quantity will delete the product completely</li>
                                    <li>• All inventory adjustments are recorded on the blockchain for audit trails</li>
                                    <li>• Refresh data to sync with the latest blockchain state</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

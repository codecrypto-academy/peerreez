'use client';

import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useAssetsByOwner } from '../../hooks/useGatewayAssets';
import { useTransferHistory } from '../../hooks/useTransferHistory';

export default function RetailerPage() {
    const { data: assets = [], isLoading: assetsLoading, refetch } = useAssetsByOwner();
    const { data: transferHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useTransferHistory('retailer');

    // Estados para controlar dropdowns
    const [showInventoryList, setShowInventoryList] = useState(false);
    const [showSoldList, setShowSoldList] = useState(false);

    // Calcular estadísticas reales desde los datos del blockchain
    const productsInStock = assets.filter(a => a.type === 'PRODUCT' && (a.status === 'MANUFACTURED' || a.status === 'DELIVERED'));
    const productsSold = transferHistory.filter((a: any) => a.currentOwner?.toLowerCase().includes('consumer'));

    const stats = {
        inventory: productsInStock.length,
        sold: productsSold.length
    };

    const loading = assetsLoading || historyLoading;

    return (
        <Layout title="Retailer Dashboard" description="Distribute products to final consumers">
            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
                <div className="container mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Retailer Dashboard</h1>
                        <p className="text-lg text-gray-600">Distribute products to final consumers</p>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div
                            onClick={() => setShowInventoryList(!showInventoryList)}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 group-hover:text-indigo-600 transition-colors">Products in Stock</p>
                                    {loading ? (
                                        <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <p className="text-3xl font-bold text-indigo-600">{stats.inventory}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showInventoryList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => setShowSoldList(!showSoldList)}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 group-hover:text-green-600 transition-colors">Products Sold</p>
                                    {loading ? (
                                        <div className="w-12 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <p className="text-3xl font-bold text-green-600">{stats.sold}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showSoldList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Distribute Products */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
                            <div className="flex items-center mb-6">
                                <div className="w-14 h-14 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Distribute to Consumers</h2>
                                    <p className="text-gray-600 mt-1">Sell products to final customers</p>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Process sales to consumers with complete blockchain traceability and automatic ownership transfer.
                            </p>

                            <a
                                href="/retailer/distribute"
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Process Sale
                            </a>
                        </div>

                        {/* Inventory Management */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
                            <div className="flex items-center mb-6">
                                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-teal-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Inventory Management</h2>
                                    <p className="text-gray-600 mt-1">Track and organize stock</p>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                View complete inventory, search products, monitor stock levels, and remove obsolete items.
                            </p>

                            <a
                                href="/retailer/inventory"
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-teal-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-teal-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                Manage Inventory
                            </a>
                        </div>
                    </div>

                    {/* Products in Stock Section */}
                    {showInventoryList && (
                        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-blue-500 rounded-xl flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Products in Stock</h2>
                                        <p className="text-gray-600">Products received from Factory</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowInventoryList(false)}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Close
                                </button>
                            </div>

                            <div className="space-y-4">
                                {assetsLoading ? (
                                    <div className="flex items-center justify-center p-8">
                                        <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-600 ml-3">Loading inventory...</span>
                                    </div>
                                ) : productsInStock.length > 0 ? (
                                    productsInStock.map((asset) => (
                                        <div key={asset.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-indigo-200 hover:shadow-lg transition-all duration-200">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                                                    <p className="text-sm text-gray-600">ID: {asset.id}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Category: {asset.category} • Raw Materials: {asset.rawMaterials?.length || 0}
                                                    </p>
                                                    <p className="text-sm font-bold text-indigo-600 mt-1">
                                                        📦 Stock: {asset.quantity || 0} {asset.unit || 'kg'}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                    AVAILABLE
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    Received: {new Date(asset.createdAt).toLocaleDateString()}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Products in Stock</h3>
                                        <p className="text-gray-500">Waiting for products from Factory.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Products Sold Section */}
                    {showSoldList && (
                        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Products Sold</h2>
                                        <p className="text-gray-600">Products sold to Consumers</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowSoldList(false)}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Close
                                </button>
                            </div>

                            <div className="space-y-4">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center p-8">
                                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-600 ml-3">Loading sold products...</span>
                                    </div>
                                ) : productsSold.length > 0 ? (
                                    productsSold.map((asset: any) => (
                                        <div key={asset.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-green-200 hover:shadow-lg transition-all duration-200">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                                    </svg>
                                                </div>
                                                <div>
                                                    <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                                                    <p className="text-sm text-gray-600">ID: {asset.id}</p>
                                                    <p className="text-sm text-gray-500">Type: {asset.type} • Category: {asset.category}</p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                                    SOLD
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {asset.transferHistory && asset.transferHistory.length > 0
                                                        ? `Sold: ${new Date(asset.transferHistory[asset.transferHistory.length - 1].timestamp).toLocaleDateString()}`
                                                        : `Created: ${new Date(asset.createdAt).toLocaleDateString()}`}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    To: {asset.currentOwner?.includes('consumer') ? '👤 Consumer' : 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Products Sold</h3>
                                        <p className="text-gray-500">You haven't sold any products to Consumers yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
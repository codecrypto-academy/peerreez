"use client";

import React, { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { PendingTransferCard } from '../../components/transfers/PendingTransferCard';
import ContainerLogsCard from '../../components/producer/ContainerLogsCard';
import { PendingTransfer, Asset } from '@/types/fabric';
import { useAssetsByOwner } from '../../hooks/useGatewayAssets';
import { useTransferHistory } from '../../hooks/useTransferHistory';
import { usePendingTransfers } from '../../hooks/usePendingTransfers';

export default function RetailerPage() {
    const { data: assets = [], isLoading: assetsLoading, refetch } = useAssetsByOwner();
    const { data: transferHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useTransferHistory('retailer');
    const { data: pendingTransfers = [], isLoading: pendingLoading } = usePendingTransfers();

    // Estados para controlar dropdowns
    const [showInventoryList, setShowInventoryList] = useState(false);
    const [showSoldList, setShowSoldList] = useState(false);
    const [showOutgoingList, setShowOutgoingList] = useState(false);
    const [showContainerLogs, setShowContainerLogs] = useState(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Calcular estadísticas reales desde los datos del blockchain
    // Include products that have been accepted and are IN_TRANSIT so they appear in stock
    // Also include RAW_MATERIAL assets (e.g., bread batches) that are CREATED or MANUFACTURED and represent stock
    const productsInStock = assets.filter(a => (
        (a.type === 'PRODUCT' && (a.status === 'MANUFACTURED' || a.status === 'DELIVERED' || a.status === 'IN_TRANSIT')) ||
        (a.type === 'RAW_MATERIAL' && (a.status === 'CREATED' || a.status === 'MANUFACTURED'))
    ));
    const productsSold = ((transferHistory as Asset[]) || []).filter((a: Asset) => String(a.currentOwner || '').toLowerCase().includes('consumer'));

    const stats = {
        inventory: productsInStock.length,
        sold: productsSold.length
    };

    const loading = assetsLoading || historyLoading;

    // Refetch assets and history after transfer actions
    const refetchAll = () => {
        refetch();
        refetchHistory();
    };

    // Number of incoming pending transfers for this user
    const incomingPending = ((pendingTransfers || []) as PendingTransfer[]).filter((t: PendingTransfer) => t.direction === 'incoming').length;

    return (

        <>
            <Layout title="Retailer Dashboard" description="Distribute products to final consumers">
                <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100">
                    <div className="container mx-auto px-6 py-8">
                        {/* Header */}
                        <div className="mb-8">
                            <h1 className="text-4xl font-bold text-gray-900 mb-2">Retailer Dashboard</h1>
                            <p className="text-lg text-gray-600">Distribute products to final consumers</p>
                        </div>

                        {/* Notification Toast */}
                        {notification && (
                            <div className={`fixed top-4 right-4 z-50 max-w-md p-4 rounded-lg shadow-xl border-2 animate-in slide-in-from-top-5 duration-300 ${notification.type === 'success'
                                ? 'bg-green-50 border-green-500 text-green-800'
                                : 'bg-red-50 border-red-500 text-red-800'
                                }`}>
                                <div className="flex items-center gap-3">
                                    {notification.type === 'success' ? (
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    ) : (
                                        <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    )}
                                    <p className="font-medium flex-1">{notification.message}</p>
                                    <button
                                        onClick={() => setNotification(null)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                        )}

                        // ...existing code...

                        {/* Grid principal: Stats (including Pending Transfers card) */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                            {/* Products in Stock Card */}
                            <div
                                onClick={() => setShowInventoryList(!showInventoryList)}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center">
                                            <p className="text-sm font-medium text-gray-500">Products in Stock</p>
                                            <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showInventoryList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                        {loading ? (
                                            <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                        ) : (
                                            <p className="text-3xl font-bold text-indigo-600 group-hover:text-indigo-700 transition-colors">{stats.inventory}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">Available to distribute</p>
                                    </div>
                                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center group-hover:bg-indigo-200 transition-colors">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Products Sold Card */}
                            <div
                                onClick={() => setShowSoldList(!showSoldList)}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center">
                                            <p className="text-sm font-medium text-gray-500">Products Sold</p>
                                            <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showSoldList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                        {loading ? (
                                            <div className="w-12 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                        ) : (
                                            <p className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{stats.sold}</p>
                                        )}
                                        <p className="text-xs text-gray-400 mt-1">Sold to consumers</p>
                                    </div>
                                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                        <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Pending → Consumers Card */}
                            <div
                                onClick={() => {
                                    const next = !showOutgoingList;
                                    setShowOutgoingList(next);
                                    if (next) {
                                        setTimeout(() => {
                                            const el = document.getElementById('outgoingTransfersSection');
                                            if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                                        }, 120);
                                    }
                                }}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <p className="text-sm font-medium text-gray-500">Pending → Consumers</p>
                                        <p className="text-3xl font-bold text-amber-600">{((pendingTransfers || []) as PendingTransfer[]).filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('consumer')).length}</p>
                                    </div>
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                            </svg>
                                        </div>
                                        <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showOutgoingList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Container Logs Card Expandible */}
                            <div
                                onClick={() => setShowContainerLogs((prev) => !prev)}
                                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                            >
                                <div className="flex items-center justify-between">
                                    <div>
                                        <div className="flex items-center">
                                            <p className="text-sm font-medium text-gray-500">Container Logs</p>
                                            <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showContainerLogs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                        </div>
                                        <p className="text-3xl font-bold text-gray-600 group-hover:text-gray-700 transition-colors">--</p>
                                        <p className="text-xs text-gray-400 mt-1">View container logs</p>
                                    </div>
                                    <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                                        <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Cuadro de mandos y acciones rápidas restaurados */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
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

                        {/* Secciones desplegables y resto del dashboard */}
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
                                                            Category: {asset.category} • Raw Materials: {Array.isArray(asset.rawMaterials) ? asset.rawMaterials.length : 0}
                                                        </p>
                                                        <p className="text-sm font-bold text-indigo-600 mt-1">
                                                            📦 Stock: {String(asset.quantity ?? 0)} {String(asset.unit ?? 'kg')}
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
                        {/* Pending Transfers Section - show ONLY when there are incoming pending transfers */}
                        {incomingPending > 0 && (
                            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    Pending Incoming Transfers
                                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                        {incomingPending}
                                    </span>
                                </h2>

                                {pendingLoading ? (
                                    <div className="flex items-center justify-center py-12">
                                        <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-4">
                                        {(pendingTransfers || [])
                                            .filter((t: PendingTransfer) => t.direction === 'incoming')
                                            .map((transfer: PendingTransfer) => (
                                                <PendingTransferCard
                                                    key={transfer.id}
                                                    transfer={transfer}
                                                    onSuccess={() => {
                                                        refetchAll();
                                                        setNotification({
                                                            type: 'success',
                                                            message: 'Transfer processed successfully!'
                                                        });
                                                        setTimeout(() => setNotification(null), 3000);
                                                    }}
                                                />
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Outgoing Pending Transfers to Consumers */}
                        {showOutgoingList && ((pendingTransfers || []) as PendingTransfer[]).some((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('consumer')) && (
                            <div id="outgoingTransfersSection" className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    Outgoing Transfers to Consumers
                                    <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                        {((pendingTransfers || []) as PendingTransfer[]).filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('consumer')).length}
                                    </span>
                                    <button
                                        onClick={() => {
                                            // trigger a full refetch by reloading assets and pending transfers indirectly
                                            refetchAll();
                                        }}
                                        className="ml-auto px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100"
                                    >
                                        Refresh
                                    </button>
                                </h2>

                                <div className="grid grid-cols-1 gap-4">
                                    {((pendingTransfers || []) as PendingTransfer[])
                                        .filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('consumer'))
                                        .map((transfer: PendingTransfer) => (
                                            <PendingTransferCard
                                                key={transfer.id}
                                                transfer={transfer}
                                                onSuccess={() => {
                                                    refetchAll();
                                                    setNotification({ type: 'success', message: 'Transfer updated.' });
                                                    setTimeout(() => setNotification(null), 3000);
                                                }}
                                            />
                                        ))}
                                </div>
                            </div>
                        )}
                        {/* Container Logs Expandible Content */}
                        {showContainerLogs && (
                            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
                                <ContainerLogsCard containerName="peer0.retailer.supplychain.com" />
                            </div>
                        )}
                    </div>
                </div>
            </Layout>
        </>
    );
}
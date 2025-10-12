'use client';

import Layout from '../../components/layout/Layout';
import { useAssetsByOwner } from '../../hooks/useGatewayAssets';
import { useTransferHistory } from '../../hooks/useTransferHistory';
import { usePendingTransfers } from '../../hooks/usePendingTransfers';
import { PendingTransferCard } from '../../components/transfers/PendingTransferCard';
import { useState } from 'react';
import { PendingTransfer } from '@/types/fabric';
import { Asset } from '../../hooks/useGatewayAssets';

export default function FactoryPage() {
    const [showRawMaterialsList, setShowRawMaterialsList] = useState(false);
    const [showProductsList, setShowProductsList] = useState(false);
    const [showHistoryList, setShowHistoryList] = useState(false);
    const [showOutgoingList, setShowOutgoingList] = useState(false);
    const [transferringProductId, setTransferringProductId] = useState<string | null>(null);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Using Gateway hooks with React Query
    const { data: assets = [], isLoading: assetsLoading, refetch: refetchAssets } = useAssetsByOwner();
    const { data: transferHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useTransferHistory('factory');
    const { data: pendingTransfers = [], isLoading: pendingLoading } = usePendingTransfers();

    // Calculate stats from real data - SEPARANDO CLARAMENTE MATERIALES Y PRODUCTOS
    // Raw Materials DISPONIBLES (listos para usar en transformación)
    // IMPORTANTE: Incluir tanto CREATED como IN_TRANSIT (recién aceptados de Producer)
    const rawMaterialsAvailable = assets?.filter(asset =>
        asset.type === 'RAW_MATERIAL' &&
        (asset.status === 'CREATED' || asset.status === 'IN_TRANSIT')
    ) || [];

    // Raw Materials CONSUMIDOS (ya usados en transformación)
    const rawMaterialsConsumed = assets?.filter(asset =>
        asset.type === 'RAW_MATERIAL' &&
        asset.status === 'CONSUMED'
    ) || [];

    // Finished Products: include manufactured products and those awaiting transfer (pending)
    const finishedProducts = assets?.filter(asset =>
        asset.type === 'PRODUCT' &&
        (asset.status === 'MANUFACTURED' || asset.status === 'PENDING_TRANSFER')
    ) || [];

    // Build set of outgoing pending assetIds so we can display a PENDING badge
    const pendingOutgoingIds = new Set(
        ((pendingTransfers || []) as PendingTransfer[])
            .filter((t: PendingTransfer) => t.direction === 'outgoing' && t.status === 'PENDING' && t.assetId)
            .map((t: PendingTransfer) => t.assetId)
    );

    // Transfer History filtrado: SOLO productos transferidos al Retailer
    const productsTransferredToRetailer = ((transferHistory as Asset[]) || []).filter((asset: Asset) =>
        asset.type === 'PRODUCT' &&
        String(asset.currentOwner || '').toLowerCase().includes('retailer')
    ) || [];

    const stats = {
        rawMaterialsAvailable: rawMaterialsAvailable.length || 0,
        rawMaterialsConsumed: rawMaterialsConsumed.length || 0,
        finishedProducts: finishedProducts.length || 0,
        transferHistory: productsTransferredToRetailer.length || 0,  // Solo productos a Retailer
        loading: assetsLoading || historyLoading,
        error: null
    };

    const refetch = () => {
        refetchAssets();
        refetchHistory();
    };

    // Helper to safely read 'quality' field which may be string or object
    function getQuality(a: Asset) {
        const q = (a as any).quality;
        if (typeof q === 'string') return q;
        if (q && typeof q === 'object') {
            const grade = (q as Record<string, unknown>)['grade'];
            if (typeof grade === 'string') return grade;
            if (typeof grade === 'number') return String(grade);
        }
        return 'N/A';
    }

    function getQuantity(a: Asset) {
        const q = (a as unknown as Record<string, unknown>)['quantity'];
        if (typeof q === 'number') return q;
        if (typeof q === 'string' && !Number.isNaN(Number(q))) return Number(q);
        return 0;
    }

    function getUnit(a: Asset) {
        const u = (a as unknown as Record<string, unknown>)['unit'];
        if (typeof u === 'string') return u;
        return 'kg';
    }

    function getRawMaterialsCount(a: Asset) {
        const rm = (a as unknown as Record<string, unknown>)['rawMaterials'];
        return Array.isArray(rm) ? rm.length : 0;
    }

    function getLastTransferDate(a: Asset) {
        const transfers = (a as unknown as Record<string, unknown>)['transfers'];
        if (Array.isArray(transfers) && transfers.length > 0) {
            const last = transfers[transfers.length - 1] as Record<string, unknown> | undefined;
            const ts = last && last['timestamp'];
            if (typeof ts === 'string') return new Date(ts).toLocaleDateString();
        }
        return a.createdAt ? new Date(a.createdAt).toLocaleDateString() : 'Unknown';
    }



    // Number of incoming pending transfers for this user (Factory)
    const incomingPending = ((pendingTransfers || []) as PendingTransfer[]).filter((t: PendingTransfer) => t.direction === 'incoming').length;

    const handleTransferProduct = async (productId: string) => {
        setTransferringProductId(productId);

        // Use the full X509 identity for Retailer (same as transfer page)
        const retailerIdentity = 'x509::/C=US/ST=California/L=San Francisco/OU=admin/CN=Admin@retailer.supplychain.com::/C=US/ST=California/L=San Francisco/O=retailer.supplychain.com/CN=ca.retailer.supplychain.com';

        const transferData = {
            destination: 'retailer',
            transportMethod: 'Quick Transfer',
            shipmentLocation: 'Factory Warehouse',
            temperature: 20,
            notes: 'Direct transfer from dashboard',
            transferType: 'factory-to-retailer' as const
        };

        try {
            // Use the 2-step initiateTransfer flow so Retailer must accept (pending)
            const response = await fetch('/api/fabric/gateway/initiate-transfer', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    // role will be inferred server-side from cookie (RoleGuard)
                    assetId: productId,
                    recipientMSP: 'RetailerMSP',
                    transferData
                })
            });

            const result = await response.json();

            if (result.success) {
                setNotification({ type: 'success', message: 'Transfer initiated — awaiting Retailer approval (pending).' });
                refetch();
                // Auto-hide notification after 3 seconds
                setTimeout(() => setNotification(null), 3000);
            } else {
                setNotification({ type: 'error', message: `Transfer initiation failed: ${result.error || 'Unknown error'}` });
                setTimeout(() => setNotification(null), 5000);
            }
        } catch (error) {
            console.error('Transfer initiation error:', error);
            setNotification({ type: 'error', message: `Transfer initiation failed: ${error instanceof Error ? error.message : 'Unknown error'}` });
            setTimeout(() => setNotification(null), 5000);
        } finally {
            setTransferringProductId(null);
        }
    };

    return (
        <Layout title="Factory Dashboard" description="Transform raw materials into finished products">
            <div className="min-h-screen bg-gradient-to-br from-orange-50 to-red-100">
                <div className="container mx-auto px-6 py-8">
                    {/* Header */}
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Factory Dashboard</h1>
                        <p className="text-lg text-gray-600">Transform raw materials into finished products</p>
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
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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

                    {/* Stats Cards CON DATOS REALES */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div
                            onClick={() => setShowRawMaterialsList(!showRawMaterialsList)}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-gray-500">Raw Materials</p>
                                        <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showRawMaterialsList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {stats.loading ? (
                                        <div className="w-12 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <div className="flex items-baseline gap-2">
                                            <p className="text-3xl font-bold text-orange-600 group-hover:text-orange-700 transition-colors">{stats.rawMaterialsAvailable}</p>
                                            {stats.rawMaterialsConsumed > 0 && (
                                                <span className="text-xs text-gray-400">({stats.rawMaterialsConsumed} used)</span>
                                            )}
                                        </div>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">Available to transform</p>
                                </div>
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center group-hover:bg-orange-200 transition-colors">
                                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => setShowProductsList(!showProductsList)}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-gray-500">Finished Products</p>
                                        <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showProductsList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {stats.loading ? (
                                        <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <p className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{stats.finishedProducts}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">Ready to ship</p>
                                </div>
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                            </div>
                        </div>

                        <div
                            onClick={() => setShowHistoryList(!showHistoryList)}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="flex items-center">
                                        <p className="text-sm font-medium text-gray-500">Transfer History</p>
                                        <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showHistoryList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                        </svg>
                                    </div>
                                    {stats.loading ? (
                                        <div className="w-12 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <p className="text-3xl font-bold text-purple-600 group-hover:text-purple-700 transition-colors">{stats.transferHistory}</p>
                                    )}
                                    <p className="text-xs text-gray-400 mt-1">Shipped to Retailer</p>
                                </div>
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                        {/* Outgoing to Retailer Card */}
                        <div
                            onClick={() => {
                                const next = !showOutgoingList;
                                setShowOutgoingList(next);
                                if (next) setTimeout(() => { const el = document.getElementById('factoryOutgoingSection'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
                            }}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500">Pending → Retailer</p>
                                    <p className="text-3xl font-bold text-amber-600">{((pendingTransfers || []) as PendingTransfer[]).filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('retailer')).length}</p>
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
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Transform Raw Materials */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
                            <div className="flex items-center mb-6">
                                <div className="w-14 h-14 bg-gradient-to-r from-orange-500 to-red-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Transform Materials</h2>
                                    <p className="text-gray-600 mt-1">Convert raw materials to products</p>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Transform received raw materials into finished products using manufacturing processes with complete traceability.
                            </p>

                            <a
                                href="/factory/transform"
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-orange-500 to-red-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-red-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                </svg>
                                Start Production
                            </a>
                        </div>

                        {/* Transfer to Retailer */}
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
                            <div className="flex items-center mb-6">
                                <div className="w-14 h-14 bg-gradient-to-r from-purple-500 to-pink-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Ship to Retailer</h2>
                                    <p className="text-gray-600 mt-1">Send finished products</p>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                Ship your manufactured products to retail partners with secure blockchain-based ownership transfer.
                            </p>

                            <a
                                href="/factory/transfer"
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                                </svg>
                                Ship Products
                            </a>
                        </div>
                    </div>

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
                                                    refetch();
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

                    {/* Outgoing Pending Transfers to Retailer (collapsible) */}
                    {showOutgoingList && ((pendingTransfers || []) as PendingTransfer[]).some((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('retailer')) && (
                        <div id="factoryOutgoingSection" className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                                    <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                </div>
                                Outgoing Transfers to Retailer
                                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                    {((pendingTransfers || []) as PendingTransfer[]).filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('retailer')).length}
                                </span>
                                <button
                                    onClick={() => { refetch(); }}
                                    className="ml-auto px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100"
                                >
                                    Refresh
                                </button>
                            </h2>

                            <div className="grid grid-cols-1 gap-4">
                                {((pendingTransfers || []) as PendingTransfer[])
                                    .filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('retailer'))
                                    .map((transfer: PendingTransfer) => (
                                        <div key={transfer.id} className="p-4 bg-white rounded-lg border border-amber-100">
                                            <p className="font-medium text-gray-900">Asset: {transfer.assetId}</p>
                                            <p className="text-sm text-gray-600">To: {transfer.toMSP} • Status: {transfer.status}</p>
                                            <p className="text-sm text-gray-500 mt-2">Initiated: {new Date(transfer.initiatedAt).toLocaleString()}</p>
                                        </div>
                                    ))}
                            </div>
                        </div>
                    )}

                    {/* Raw Materials Section */}
                    {showRawMaterialsList && (
                        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-500 rounded-xl flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Raw Materials</h2>
                                        <p className="text-gray-600">Materials received from Producer</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowRawMaterialsList(false)}
                                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                                >
                                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                    Close
                                </button>
                            </div>

                            <div className="space-y-6">
                                {assetsLoading ? (
                                    <div className="flex items-center justify-center p-8">
                                        <div className="w-6 h-6 border-2 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-600 ml-3">Loading raw materials...</span>
                                    </div>
                                ) : (
                                    <>
                                        {/* Available Raw Materials */}
                                        <div>
                                            <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                                <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                                                Available Materials ({rawMaterialsAvailable.length})
                                            </h3>
                                            {rawMaterialsAvailable.length > 0 ? (
                                                <div className="space-y-3">
                                                    {rawMaterialsAvailable.map((asset: Asset) => (
                                                        <div key={asset.id} className="flex items-center justify-between p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl border border-green-200 hover:shadow-md transition-all duration-200">
                                                            <div className="flex items-center space-x-4">
                                                                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                                                                    <span className="text-xl">
                                                                        {asset.category === 'cotton' ? '🌱' : asset.category === 'wheat' ? '🌾' : '📦'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-gray-900">{asset.name}</h4>
                                                                    <p className="text-xs text-gray-600">ID: {asset.id}</p>
                                                                    <p className="text-xs text-gray-500">Category: {asset.category} • Quality: {getQuality(asset)}</p>
                                                                    <p className="text-sm font-bold text-green-600 mt-1">
                                                                        📦 {getQuantity(asset)} {getUnit(asset)} available
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                                    ✓ AVAILABLE
                                                                </span>
                                                                <p className="text-xs text-gray-500 mt-1">
                                                                    Received: {new Date(asset.createdAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="text-center py-6 bg-gray-50 rounded-xl">
                                                    <p className="text-sm text-gray-500">No materials available. Waiting for shipments from Producer.</p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Consumed Raw Materials */}
                                        {rawMaterialsConsumed.length > 0 && (
                                            <div>
                                                <h3 className="text-lg font-semibold text-gray-900 mb-3 flex items-center">
                                                    <span className="w-2 h-2 bg-gray-400 rounded-full mr-2"></span>
                                                    Used Materials ({rawMaterialsConsumed.length})
                                                </h3>
                                                <div className="space-y-3">
                                                    {rawMaterialsConsumed.map((asset: Asset) => (
                                                        <div key={asset.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 opacity-75">
                                                            <div className="flex items-center space-x-4">
                                                                <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                                                                    <span className="text-xl opacity-50">
                                                                        {asset.category === 'cotton' ? '🌱' : asset.category === 'wheat' ? '🌾' : '📦'}
                                                                    </span>
                                                                </div>
                                                                <div>
                                                                    <h4 className="font-semibold text-gray-600">{asset.name}</h4>
                                                                    <p className="text-xs text-gray-500">ID: {asset.id}</p>
                                                                    <p className="text-xs text-gray-400">Used in production</p>
                                                                    <p className="text-sm font-medium text-gray-500 mt-1">
                                                                        ✓ Fully consumed ({getQuantity(asset)} {getUnit(asset)} remaining)
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-600">
                                                                    ⊗ CONSUMED
                                                                </span>
                                                                <p className="text-xs text-gray-400 mt-1">
                                                                    Used: {new Date(asset.updatedAt).toLocaleDateString()}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Empty state cuando no hay ningún material */}
                                        {rawMaterialsAvailable.length === 0 && rawMaterialsConsumed.length === 0 && (
                                            <div className="text-center py-12">
                                                <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                                    <svg className="w-8 h-8 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                    </svg>
                                                </div>
                                                <h3 className="text-lg font-medium text-gray-900 mb-2">No Raw Materials Yet</h3>
                                                <p className="text-gray-500">Waiting for materials from Producer.</p>
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Finished Products Section */}
                    {showProductsList && (
                        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Finished Products</h2>
                                        <p className="text-gray-600">Products ready to ship</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setShowProductsList(false)}
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
                                        <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-600 ml-3">Loading products...</span>
                                    </div>
                                ) : finishedProducts.length > 0 ? (
                                    finishedProducts.map((asset: Asset) => (
                                        <div key={asset.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-green-200 hover:shadow-lg transition-all duration-200">
                                            <div className="flex items-center space-x-4 flex-1">
                                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                                    </svg>
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                                                    <p className="text-sm text-gray-600">ID: {asset.id}</p>
                                                    <p className="text-sm text-gray-500">
                                                        Category: {asset.category} • Raw Materials: {getRawMaterialsCount(asset)}
                                                    </p>
                                                    <p className="text-sm font-bold text-green-600 mt-1">
                                                        📦 Quantity: {getQuantity(asset)} {getUnit(asset)}
                                                    </p>
                                                    {asset.rawMaterialsUsed && Object.keys(asset.rawMaterialsUsed).length > 0 && (
                                                        <p className="text-xs text-gray-500 mt-1">
                                                            Materials used: {Object.entries((asset as any).rawMaterialsUsed || {}).map(([id, qty]) =>
                                                                `${qty} ${getUnit(asset)} of ${id}`
                                                            ).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
                                            <div className="flex flex-col items-end gap-3">
                                                <div className="text-right">
                                                    {pendingOutgoingIds.has(asset.id) ? (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            PENDING
                                                        </span>
                                                    ) : asset.status === 'PENDING_TRANSFER' ? (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                                                            PENDING
                                                        </span>
                                                    ) : (
                                                        <span className="px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            MANUFACTURED
                                                        </span>
                                                    )}
                                                    <p className="text-xs text-gray-500 mt-1">
                                                        Created: {new Date(asset.createdAt).toLocaleDateString()}
                                                    </p>
                                                </div>
                                                <button
                                                    onClick={() => handleTransferProduct(asset.id)}
                                                    disabled={transferringProductId === asset.id}
                                                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-sm font-semibold rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 flex items-center gap-2 whitespace-nowrap"
                                                >
                                                    {transferringProductId === asset.id ? (
                                                        <>
                                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                                                            Transferring...
                                                        </>
                                                    ) : (
                                                        <>
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                                                            </svg>
                                                            Transfer to Retailer
                                                        </>
                                                    )}
                                                </button>
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
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Products</h3>
                                        <p className="text-gray-500">Transform raw materials to create products.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Transfer History Section */}
                    {showHistoryList && (
                        <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center">
                                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Transfer History</h2>
                                        <p className="text-gray-600">Products shipped to Retailer</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <button
                                        onClick={() => refetchHistory()}
                                        disabled={historyLoading}
                                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-gray-700 font-medium transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        {historyLoading ? 'Refreshing...' : 'Refresh'}
                                    </button>
                                    <button
                                        onClick={() => setShowHistoryList(false)}
                                        className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                                    >
                                        <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                        Close
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {historyLoading ? (
                                    <div className="flex items-center justify-center p-8">
                                        <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                                        <span className="text-gray-600 ml-3">Loading transfer history...</span>
                                    </div>
                                ) : productsTransferredToRetailer.length > 0 ? (
                                    productsTransferredToRetailer.map((asset: Asset) => (
                                        <div key={asset.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-purple-200 hover:shadow-lg transition-all duration-200">
                                            <div className="flex items-center space-x-4">
                                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                                                    <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
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
                                                    TRANSFERRED
                                                </span>
                                                <p className="text-xs text-gray-500 mt-1">
                                                    {getLastTransferDate(asset)}
                                                </p>
                                                <p className="text-xs text-gray-400 mt-1">
                                                    To: {asset.currentOwner?.includes('retailer') ? '🏪 Retailer' : 'Unknown'}
                                                </p>
                                            </div>
                                        </div>
                                    ))) : (
                                    <div className="text-center py-12">
                                        <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                            <svg className="w-8 h-8 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <h3 className="text-lg font-medium text-gray-900 mb-2">No Transfer History</h3>
                                        <p className="text-gray-500">You haven't shipped any products to Retailer yet.</p>
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
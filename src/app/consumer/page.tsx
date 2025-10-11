'use client';

import { useState } from 'react';
import Layout from '../../components/layout/Layout';
import { useAssetsByOwner, Asset } from '../../hooks/useGatewayAssets';
import { usePendingTransfers } from '../../hooks/usePendingTransfers';
import { PendingTransfer } from '@/types/fabric';
import { PendingTransferCard } from '../../components/transfers/PendingTransferCard';
import Link from 'next/link';

export default function ConsumerPage() {
    const { data: assets = [], isLoading } = useAssetsByOwner();
    const [showProductsList, setShowProductsList] = useState(false);

    // Consider both DELIVERED and IN_TRANSIT as consumer-owned items that should appear
    // when the consumer has accepted a transfer. Include items regardless of type so
    // purchases that are RAW_MATERIAL (e.g., bread batches) also show up in the UI.
    const myProducts = (assets as Asset[]).filter(a => (a.status === 'DELIVERED' || a.status === 'IN_TRANSIT'));
    const { data: pendingTransfers = [], isLoading: pendingLoading, refetch: refetchPending } = usePendingTransfers();

    const incomingPending = (pendingTransfers as PendingTransfer[]).filter((t) => t.direction === 'incoming').length;

    return (
        <Layout title="Consumer Dashboard" description="View and trace your purchased products">
            <div className="min-h-screen bg-gradient-to-br from-cyan-50 to-blue-100">
                <div className="container mx-auto px-6 py-8">
                    <div className="mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Consumer Dashboard</h1>
                        <p className="text-lg text-gray-600">View and trace your purchased products</p>
                    </div>

                    <div className="grid grid-cols-1 gap-6 mb-8">
                        <div
                            onClick={() => setShowProductsList(!showProductsList)}
                            className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-300 group"
                        >
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm font-medium text-gray-500 group-hover:text-cyan-600 transition-colors">My Products</p>
                                    {isLoading ? (
                                        <div className="w-12 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                                    ) : (
                                        <p className="text-3xl font-bold text-cyan-600">{myProducts.length}</p>
                                    )}
                                </div>
                                <div className="flex flex-col items-center gap-2">
                                    <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <svg className="w-6 h-6 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                        </svg>
                                    </div>
                                    <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showProductsList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </div>
                            </div>
                        </div>
                    </div>

                    {showProductsList && (
                        <div className="mb-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <svg className="w-6 h-6 mr-2 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                                Product Details
                            </h3>
                            {isLoading ? (
                                <div className="text-center py-8">
                                    <div className="inline-block w-8 h-8 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-gray-500 mt-4">Loading products...</p>
                                </div>
                            ) : myProducts.length === 0 ? (
                                <div className="text-center py-8">
                                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                    </svg>
                                    <p className="text-gray-500 text-lg">No products available</p>
                                    <p className="text-gray-400 text-sm mt-2">Products you purchase will appear here</p>
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full">
                                        <thead>
                                            <tr className="bg-gray-50 border-b border-gray-200">
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Product ID</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Name</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Category</th>
                                                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Quantity</th>
                                                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Location</th>
                                                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200">
                                            {myProducts.map((product) => (
                                                <tr key={product.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm font-mono text-gray-600">{product.id}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm font-medium text-gray-900">{product.name}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-100 text-cyan-800">
                                                            {product.category}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <span className="text-sm text-gray-900">{Number(product.quantity).toLocaleString()}</span>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span className="text-sm text-gray-600">{String(product.location)}</span>
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                            {product.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    )}



                    <div className="grid grid-cols-1 gap-8">
                        <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
                            <div className="flex items-center mb-6">
                                <div className="w-14 h-14 bg-gradient-to-r from-cyan-500 to-blue-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                                    <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                </div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Product Traceability</h2>
                                    <p className="text-gray-600 mt-1">Full supply chain transparency</p>
                                </div>
                            </div>

                            <p className="text-gray-600 mb-6 leading-relaxed">
                                View complete traceability from farm to your table. See every step in the supply chain.
                            </p>

                            <Link
                                href="/consumer/trace"
                                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white font-semibold rounded-xl hover:from-cyan-600 hover:to-blue-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
                            >
                                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                </svg>
                                View Traceability
                            </Link>
                        </div>
                    </div>

                    {/* Pending Incoming Transfers (Consumer) - moved to bottom so it appears after main content */}
                    {incomingPending > 0 && (
                        <div className="mt-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
                                <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                                Pending Incoming Transfers ({incomingPending})
                            </h3>
                            {pendingLoading ? (
                                <div className="text-center py-8">Loading pending transfers...</div>
                            ) : (
                                <div className="space-y-4">
                                    {(pendingTransfers as PendingTransfer[]).filter((t) => t.direction === 'incoming').map((transfer) => (
                                        <PendingTransferCard key={transfer.id} transfer={transfer} onSuccess={() => refetchPending()} />
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}

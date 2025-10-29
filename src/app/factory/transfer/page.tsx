'use client';

import React, { useState } from 'react';
import { useAssetsByOwner, useInitiateTransfer } from '../../../hooks/useGatewayAssets';
import { useWallet } from '@/components/wallet/WalletProvider';

interface TransferForm {
    assetId: string;
    retailerId: string;
    shipmentLocation: string;
    transportMethod: string;
    temperature?: number;
    notes?: string;
}

export default function FactoryTransferPage() {
    const [formData, setFormData] = useState<TransferForm>({
        assetId: '',
        retailerId: '',
        shipmentLocation: '',
        transportMethod: '',
        temperature: undefined,
        notes: ''
    });

    const { address } = useWallet();
    const { data: assets = [], isLoading: assetsLoading } = useAssetsByOwner(address || undefined);

    // Retailer identity list for recipient selection
    const [retailerIdentities, setRetailerIdentities] = useState<Array<{ username?: string; address?: string }>>([]);
    const [retailerLoading, setRetailerLoading] = useState(false);

    React.useEffect(() => {
        let mounted = true;
        (async () => {
            setRetailerLoading(true);
            try {
                const res = await fetch('/api/fabric/identity/list?org=retailer.supplychain.com');
                if (res.ok) {
                    const js = await res.json();
                    const ids = js?.identities || [];
                    // Exclude any admin identities from the selector (case-insensitive)
                    const filtered = (ids || []).filter((r: unknown) => {
                        const rec = r as Record<string, unknown>;
                        const v = String(rec['username'] ?? rec['address'] ?? '').toLowerCase();
                        return !v.includes('admin');
                    });
                    if (mounted) setRetailerIdentities(filtered as Array<{ username?: string; address?: string }>);
                }
            } catch {
                // ignore
            } finally {
                if (mounted) setRetailerLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, []);
    const { mutate: initiateTransfer, isPending: loading, isError, error, isSuccess: success, reset } = useInitiateTransfer();

    // Filter only PRODUCT type assets (manufactured products or pending transfers should still be visible)
    const products = assets?.filter(asset => asset.type === 'PRODUCT' && (asset.status === 'MANUFACTURED' || asset.status === 'PENDING_TRANSFER')) || [];

    const handleInputChange = (field: string, value: unknown) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        reset();

        // Validation
        if (!formData.assetId || !formData.retailerId || !formData.shipmentLocation || !formData.transportMethod) {
            return;
        }

        // MSP destino para Retailer
        const retailerMSP = 'RetailerMSP';

        // Resolve owner identity similar to Producer flow
        let ownerIdentity: string | undefined = undefined;
        if (address) {
            try {
                const pres = await fetch('/api/fabric/identity/list?org=factory.supplychain.com');
                if (pres.ok) {
                    const pjs = await pres.json();
                    const pids = pjs?.identities || [];
                    const match = pids.find((p: unknown) => {
                        const rec = p as Record<string, unknown>;
                        const addr = rec['address'];
                        return typeof addr === 'string' && address && addr.toLowerCase() === address.toLowerCase();
                    });
                    if (match) {
                        const mrec = match as Record<string, unknown>;
                        ownerIdentity = String(mrec['username'] ?? mrec['address']);
                    }
                }
            } catch {
                // fallthrough
            }

            if (!ownerIdentity) {
                try {
                    const rr = await fetch(`/api/fabric/identity/resolve?selector=${encodeURIComponent(address)}&org=factory.supplychain.com`);
                    if (rr.ok) {
                        const rjs = await rr.json();
                        if (rjs && rjs.success && rjs.found && rjs.found.username) {
                            ownerIdentity = rjs.found.username;
                        }
                    }
                } catch {
                    // ignore
                }
            }
        }

        const transferData = {
            destination: formData.retailerId,
            transportMethod: formData.transportMethod,
            shipmentLocation: formData.shipmentLocation,
            temperature: formData.temperature,
            notes: formData.notes,
            transferType: 'factory-to-retailer' as const
        };
        // Find the full recipientIdentity (username or address) when possible
        let recipientIdentity: string | undefined = undefined;
        if (formData.retailerId) {
            // If retailerId matches an entry username or address, use that exact identity
            const match = retailerIdentities.find((r) => r.username === formData.retailerId || r.address === formData.retailerId);
            if (match) recipientIdentity = match.username || match.address;
            else recipientIdentity = formData.retailerId;
        }

        initiateTransfer(
            {
                assetId: formData.assetId,
                recipientMSP: retailerMSP,
                transferData,
                recipientIdentity: recipientIdentity,
                ownerIdentity: ownerIdentity || address
            },
            {
                onSuccess: () => {
                    // Reset form on success
                    setFormData({
                        assetId: '',
                        retailerId: '',
                        shipmentLocation: '',
                        transportMethod: '',
                        temperature: undefined,
                        notes: ''
                    });
                }
            }
        );
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-orange-50 via-red-50 to-pink-50">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <a href="/factory" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </a>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Ship to Retailer</h1>
                            <p className="text-lg text-gray-600 mt-2">Send your manufactured products to retail partners</p>
                        </div>
                    </div>

                    {/* Success/Error Messages */}
                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <div className="flex items-center">
                                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                <p className="text-green-800 font-semibold">✅ Product shipped successfully to Retailer!</p>
                            </div>
                        </div>
                    )}

                    {isError && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                    </svg>
                                    <p className="text-red-800">❌ Transfer failed: {error?.message || 'Unknown error'}</p>
                                </div>
                                <button onClick={() => reset()} className="text-red-500 hover:text-red-700">
                                    ×
                                </button>
                            </div>
                        </div>
                    )}
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-black">
                        <form onSubmit={handleSubmit} className="space-y-8 text-black">
                            {/* Product Selection */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    Select Product
                                </h2>

                                <div>
                                    <label htmlFor="assetId" className="block text-sm font-semibold text-gray-800 mb-3 text-black">
                                        Choose Product to Ship *
                                    </label>
                                    {assetsLoading ? (
                                        <div className="text-center py-8">Loading products...</div>
                                    ) : products.length > 0 ? (
                                        <select
                                            id="assetId"
                                            value={formData.assetId}
                                            onChange={(e) => handleInputChange('assetId', e.target.value)}
                                            required
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-purple-500 focus:outline-none transition-colors text-black"
                                        >
                                            <option value="">Select a product...</option>
                                            {products.map((asset) => (
                                                <option key={asset.id} value={asset.id}>
                                                    {asset.id} - {asset.name} ({asset.category})
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <div className="text-center py-8 bg-gray-50 rounded-lg">
                                            <p className="text-gray-600 mb-4">No manufactured products available to ship.</p>
                                            <a
                                                href="/factory/transform"
                                                className="inline-flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                                            >
                                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                                </svg>
                                                Transform Materials First
                                            </a>
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Retailer Information */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-pink-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-pink-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                    </div>
                                    Destination Retailer
                                </h2>

                                <div>
                                    <label htmlFor="retailerId" className="block text-sm font-semibold text-gray-800 mb-3 text-black">
                                        Retailer Partner *
                                    </label>
                                    {retailerLoading ? (
                                        <div className="text-center py-4">Loading retailers...</div>
                                    ) : (
                                        <select
                                            id="retailerId"
                                            value={formData.retailerId}
                                            onChange={(e) => handleInputChange('retailerId', e.target.value)}
                                            required
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-pink-500 focus:outline-none transition-colors text-black"
                                        >
                                            <option value="">Select retailer...</option>
                                            {retailerIdentities.length > 0 ? (
                                                retailerIdentities.map((r) => (
                                                    <option key={r.username || r.address} value={r.username || r.address}>
                                                        {r.username || r.address}
                                                    </option>
                                                ))
                                            ) : (
                                                // Fallback option if identity list is empty
                                                <option value="retailer">Main Retailer Network</option>
                                            )}
                                        </select>
                                    )}
                                </div>
                            </div>

                            {/* Shipment Details */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                    </div>
                                    Shipment Details
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="shipmentLocation" className="block text-sm font-semibold text-gray-800 mb-2 text-black">
                                            Shipment Origin *
                                        </label>
                                        <input
                                            type="text"
                                            id="shipmentLocation"
                                            value={formData.shipmentLocation}
                                            onChange={(e) => handleInputChange('shipmentLocation', e.target.value)}
                                            placeholder="Factory Address, City"
                                            required
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="transportMethod" className="block text-sm font-semibold text-gray-800 mb-2 text-black">
                                            Transport Method *
                                        </label>
                                        <select
                                            id="transportMethod"
                                            value={formData.transportMethod}
                                            onChange={(e) => handleInputChange('transportMethod', e.target.value)}
                                            required
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                        >
                                            <option value="">Select method...</option>
                                            <option value="Truck">Truck</option>
                                            <option value="Rail">Rail</option>
                                            <option value="Ship">Ship</option>
                                            <option value="Air">Air Freight</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="temperature" className="block text-sm font-semibold text-gray-800 mb-2 text-black">
                                            Storage Temperature (°C)
                                        </label>
                                        <input
                                            type="number"
                                            id="temperature"
                                            value={formData.temperature || ''}
                                            onChange={(e) => handleInputChange('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                                            placeholder="e.g., 4"
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="notes" className="block text-sm font-semibold text-gray-800 mb-2 text-black">
                                            Shipment Notes
                                        </label>
                                        <textarea
                                            id="notes"
                                            value={formData.notes}
                                            onChange={(e) => handleInputChange('notes', e.target.value)}
                                            placeholder="Special handling instructions, quality checks, etc."
                                            rows={4}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Submit */}
                            <div className="flex justify-end space-x-4">
                                <button
                                    type="button"
                                    onClick={() => window.history.back()}
                                    className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || products.length === 0}
                                    className="px-8 py-4 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-xl hover:from-purple-600 hover:to-pink-600 font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                                >
                                    {loading ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Shipping...
                                        </div>
                                    ) : (
                                        <div className="flex items-center">
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                            </svg>
                                            Ship to Retailer
                                        </div>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}

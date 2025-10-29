"use client";

import React, { useState } from 'react';
import { useAssetsByOwner } from '../../../hooks/useGatewayAssets';
import { useWallet } from '@/components/wallet/WalletProvider';

interface TransformForm {
    rawMaterialIds: string[];
    quantities: { [materialId: string]: number }; // cantidad a usar de cada material
    newAssetId: string;
    productData: {
        name: string;
        type: 'PRODUCT';
        category: string;
        description: string;
        transformationProcess: string;
    };
}

export default function TransformAssetPage() {
    const [form, setForm] = useState<TransformForm>({
        rawMaterialIds: [],
        quantities: {},
        newAssetId: '',
        productData: {
            name: '',
            type: 'PRODUCT',
            category: '',
            description: '',
            transformationProcess: ''
        }
    });
    const [success, setSuccess] = useState(false);
    const [transformLoading, setTransformLoading] = useState(false);

    const { address } = useWallet();

    const [resolvedOwner, setResolvedOwner] = useState<string | undefined>(undefined);

    // Resolve username for the connected wallet address so hooks can filter by user (not org)
    React.useEffect(() => {
        let mounted = true;
        (async () => {
            setResolvedOwner(undefined);
            if (!address) return;
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
                    if (match && mounted) {
                        const mrec = match as Record<string, unknown>;
                        setResolvedOwner(String(mrec['username'] ?? mrec['address']));
                        return;
                    }
                }
            } catch {
                // fallthrough
            }

            try {
                const rr = await fetch(`/api/fabric/identity/resolve?selector=${encodeURIComponent(address)}&org=factory.supplychain.com`);
                if (rr.ok) {
                    const rjs = await rr.json();
                    if (rjs && rjs.success && rjs.found && rjs.found.username && mounted) {
                        setResolvedOwner(rjs.found.username);
                        return;
                    }
                }
            } catch {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, [address]);

    // Use resolved owner (username) when available; otherwise fall back to raw address
    const ownerParam = resolvedOwner || address || undefined;
    const { data: assets = [], isLoading: assetsLoading, refetch } = useAssetsByOwner(ownerParam);

    const handleRawMaterialToggle = (assetId: string) => {
        setForm(prev => {
            const isSelected = prev.rawMaterialIds.includes(assetId);
            const newQuantities = { ...prev.quantities };

            if (isSelected) {
                // Deselect: remove from list and quantities
                delete newQuantities[assetId];
                return {
                    ...prev,
                    rawMaterialIds: prev.rawMaterialIds.filter(id => id !== assetId),
                    quantities: newQuantities
                };
            } else {
                // Select: add to list with default quantity of 0
                return {
                    ...prev,
                    rawMaterialIds: [...prev.rawMaterialIds, assetId],
                    quantities: { ...newQuantities, [assetId]: 0 }
                };
            }
        });
    };

    const handleQuantityChange = (assetId: string, quantity: number) => {
        setForm(prev => ({
            ...prev,
            quantities: {
                ...prev.quantities,
                [assetId]: quantity
            }
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.rawMaterialIds.length === 0) {
            alert('Please select at least one raw material');
            return;
        }

        // ⚠️ IMPORTANTE: Validar que el Product ID no sea igual a ningún raw material ID
        if (form.rawMaterialIds.includes(form.newAssetId)) {
            alert(`❌ Product ID "${form.newAssetId}" cannot be the same as any raw material ID!\n\nPlease use a different ID for your product (e.g., "PROD-${form.newAssetId}")`);
            return;
        }

        // Validar que el Product ID no exista ya
        const existingAsset = assets?.find(a => a.id === form.newAssetId);
        if (existingAsset) {
            alert(`❌ Asset ID "${form.newAssetId}" already exists!\n\nPlease use a unique ID for your product.`);
            return;
        }

        // Validar que todas las cantidades sean mayores a 0
        for (const materialId of form.rawMaterialIds) {
            const quantity = form.quantities[materialId] || 0;
            if (quantity <= 0) {
                alert(`Please specify a valid quantity for material ${materialId}`);
                return;
            }

            // Validar que no exceda la cantidad disponible
            const material = assets?.find(a => a.id === materialId);
            if (material) {
                const matQty = typeof material.quantity === 'number' ? material.quantity : Number(material.quantity) || 0;
                if (quantity > matQty) {
                    alert(`Insufficient quantity for ${material.name}. Available: ${matQty}, Requested: ${quantity}`);
                    return;
                }
            }
        }

        // Calcular la cantidad total del producto (suma de materiales usados)
        const totalProductQuantity = Object.values(form.quantities).reduce((sum, qty) => sum + qty, 0);

        setTransformLoading(true);
        try {
            // Call Gateway API with correct parameters
            const response = await fetch('/api/fabric/gateway', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    operation: 'transformAsset',
                    role: 'Factory',
                    rawMaterialIds: form.rawMaterialIds,
                    newAssetId: form.newAssetId,
                    quantities: form.quantities,
                    productData: {
                        id: form.newAssetId,
                        name: form.productData.name,
                        type: 'PRODUCT',
                        category: form.productData.category,
                        description: form.productData.description,
                        transformationProcess: form.productData.transformationProcess,
                        quantity: totalProductQuantity,
                        unit: 'kg'
                    }
                    ,
                    // Pass the selected owner identity so the server can submit the transaction
                    // under the user's certificate. This ensures chaincode ownership checks match.
                    ownerIdentity: ownerParam
                })
            });

            const result = await response.json();

            if (result.success) {
                setSuccess(true);
                setForm({
                    rawMaterialIds: [],
                    quantities: {},
                    newAssetId: '',
                    productData: {
                        name: '',
                        type: 'PRODUCT',
                        category: '',
                        description: '',
                        transformationProcess: ''
                    }
                });
                // Refresh assets
                refetch();
            } else {
                alert(`Transform failed: ${result.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.error('Transform failed:', error);
            alert(`Transform failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setTransformLoading(false);
        }
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
                            <h1 className="text-4xl font-bold text-gray-900">Transform Raw Materials</h1>
                            <p className="text-lg text-gray-600 mt-2">Convert raw materials into finished products</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                            <p className="text-green-800 font-semibold">✅ Product transformed successfully!</p>
                        </div>
                    )}

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-black">
                        <form onSubmit={handleSubmit} className="space-y-8 text-black">
                            {/* Raw Materials Selection */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                    </div>
                                    Select Raw Materials
                                </h2>

                                <div>
                                    <label className="block text-sm font-semibold text-black mb-3">
                                        Choose Raw Materials to Transform *
                                    </label>
                                    {assetsLoading ? (
                                        <div className="text-center py-8">Loading raw materials...</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {assets?.filter(asset => asset.type === 'RAW_MATERIAL' && asset.status !== 'CONSUMED').map((asset) => {
                                                const isSelected = form.rawMaterialIds.includes(asset.id);
                                                const availableQty = typeof asset.quantity === 'number' ? asset.quantity : Number(asset.quantity) || 0;
                                                const selectedQty = typeof form.quantities[asset.id] === 'number' ? form.quantities[asset.id] : Number(form.quantities[asset.id]) || 0;

                                                return (
                                                    <div key={asset.id} className={`p-4 bg-white/70 border-2 rounded-xl transition-colors ${isSelected ? 'border-orange-500 bg-orange-50/50' : 'border-gray-200 hover:border-orange-300'}`}>
                                                        <div className="flex items-start gap-4">
                                                            <input
                                                                type="checkbox"
                                                                id={asset.id}
                                                                checked={isSelected}
                                                                onChange={() => handleRawMaterialToggle(asset.id)}
                                                                className="mt-1 w-5 h-5 text-orange-600 rounded"
                                                            />
                                                            <div className="flex-1">
                                                                <label htmlFor={asset.id} className="cursor-pointer block mb-2 text-black">
                                                                    <p className="font-semibold text-black">{asset.name}</p>
                                                                    <p className="text-sm text-black">
                                                                        ID: {asset.id} • Category: {asset.category}
                                                                    </p>
                                                                    <p className="text-sm font-medium text-green-600 mt-1">
                                                                        Available: {availableQty} {(asset.unit as string) || 'kg'}
                                                                    </p>
                                                                </label>

                                                                {isSelected && (
                                                                    <div className="mt-3 flex items-center gap-3">
                                                                        <label htmlFor={`qty-${asset.id}`} className="text-sm font-semibold text-gray-700 min-w-[100px]">
                                                                            Quantity to use:
                                                                        </label>
                                                                        <input
                                                                            type="number"
                                                                            id={`qty-${asset.id}`}
                                                                            min="0"
                                                                            max={availableQty}
                                                                            step="0.1"
                                                                            value={selectedQty}
                                                                            onChange={(e) => handleQuantityChange(asset.id, parseFloat(e.target.value) || 0)}
                                                                            className="flex-1 px-3 py-2 border-2 border-orange-300 rounded-lg focus:border-orange-500 focus:outline-none text-black"
                                                                            placeholder={`Max: ${availableQty}`}
                                                                        />
                                                                        <span className="text-sm text-gray-600 min-w-[50px]">{(asset.unit as string) || 'kg'}</span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Product Details */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    Product Information
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="newAssetId" className="block text-sm font-semibold text-black mb-2">
                                            Product ID *
                                        </label>
                                        <input
                                            type="text"
                                            id="newAssetId"
                                            value={form.newAssetId}
                                            onChange={(e) => setForm(prev => ({ ...prev, newAssetId: e.target.value }))}
                                            className={`w-full p-4 border-2 rounded-xl focus:outline-none transition-colors text-black ${form.rawMaterialIds.includes(form.newAssetId)
                                                ? 'border-red-500 bg-red-50 focus:border-red-600'
                                                : 'border-gray-200 focus:border-blue-500'
                                                }`}
                                            placeholder="PROD_001"
                                            required
                                        />
                                        {form.rawMaterialIds.includes(form.newAssetId) && (
                                            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                                                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                                </svg>
                                                Product ID cannot be the same as a raw material ID!
                                            </p>
                                        )}
                                        <p className="mt-1 text-xs text-gray-500">
                                            ⚠️ Must be unique and different from raw material IDs
                                        </p>
                                    </div>

                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-black mb-2">
                                            Product Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="name"
                                            value={form.productData.name}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                productData: { ...prev.productData, name: e.target.value }
                                            }))}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                            placeholder="Premium Flour"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-semibold text-black mb-2">
                                            Category *
                                        </label>
                                        <input
                                            type="text"
                                            id="category"
                                            value={form.productData.category}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                productData: { ...prev.productData, category: e.target.value }
                                            }))}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                            placeholder="food"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="transformationProcess" className="block text-sm font-semibold text-black mb-2">
                                            Transformation Process *
                                        </label>
                                        <input
                                            type="text"
                                            id="transformationProcess"
                                            value={form.productData.transformationProcess}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                productData: { ...prev.productData, transformationProcess: e.target.value }
                                            }))}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                            placeholder="Milling and Processing"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="description" className="block text-sm font-semibold text-black mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            value={form.productData.description}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                productData: { ...prev.productData, description: e.target.value }
                                            }))}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors text-black"
                                            placeholder="Detailed description of the finished product..."
                                            rows={4}
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
                                    disabled={transformLoading}
                                    className="px-8 py-4 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-xl hover:from-orange-600 hover:to-red-600 font-semibold transition-all transform hover:scale-105 disabled:opacity-50"
                                >
                                    {transformLoading ? 'Transforming...' : 'Transform Product'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
}
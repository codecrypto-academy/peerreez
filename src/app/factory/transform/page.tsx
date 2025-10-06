'use client';

import { useState, useEffect } from 'react';
import { useAssetTransform, useAssetQuery } from '../../../hooks/useFabric';

interface TransformForm {
    rawMaterialIds: string[];
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

    const { assets, loading: assetsLoading, queryAssetsByOwner } = useAssetQuery();
    const { transformAsset, loading: transformLoading } = useAssetTransform();

    useEffect(() => {
        queryAssetsByOwner();
    }, [queryAssetsByOwner]);

    const handleRawMaterialToggle = (assetId: string) => {
        setForm(prev => ({
            ...prev,
            rawMaterialIds: prev.rawMaterialIds.includes(assetId)
                ? prev.rawMaterialIds.filter(id => id !== assetId)
                : [...prev.rawMaterialIds, assetId]
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (form.rawMaterialIds.length === 0) {
            alert('Please select at least one raw material');
            return;
        }

        const result = await transformAsset(
            form.rawMaterialIds,
            form.newAssetId,
            { ...form.productData, id: form.newAssetId }
        );

        if (result.success) {
            setSuccess(true);
            setForm({
                rawMaterialIds: [],
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
            queryAssetsByOwner();
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

                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                        <form onSubmit={handleSubmit} className="space-y-8">
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
                                    <label className="block text-sm font-semibold text-gray-800 mb-3">
                                        Choose Raw Materials to Transform *
                                    </label>
                                    {assetsLoading ? (
                                        <div className="text-center py-8">Loading raw materials...</div>
                                    ) : (
                                        <div className="space-y-3">
                                            {assets?.filter(asset => asset.type === 'RAW_MATERIAL').map((asset) => (
                                                <div key={asset.id} className="flex items-center p-4 bg-white/70 border-2 border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        id={asset.id}
                                                        checked={form.rawMaterialIds.includes(asset.id)}
                                                        onChange={() => handleRawMaterialToggle(asset.id)}
                                                        className="mr-4 w-5 h-5 text-orange-600 rounded"
                                                    />
                                                    <label htmlFor={asset.id} className="flex-1 cursor-pointer">
                                                        <div className="flex justify-between items-center">
                                                            <div>
                                                                <p className="font-semibold text-gray-900">{asset.name}</p>
                                                                <p className="text-sm text-gray-600">
                                                                    ID: {asset.id} • Category: {asset.category}
                                                                </p>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm text-green-600">Available</p>
                                                            </div>
                                                        </div>
                                                    </label>
                                                </div>
                                            ))}
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
                                        <label htmlFor="newAssetId" className="block text-sm font-semibold text-gray-800 mb-2">
                                            Product ID *
                                        </label>
                                        <input
                                            type="text"
                                            id="newAssetId"
                                            value={form.newAssetId}
                                            onChange={(e) => setForm(prev => ({ ...prev, newAssetId: e.target.value }))}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="PROD_001"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="name" className="block text-sm font-semibold text-gray-800 mb-2">
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
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="Premium Flour"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-semibold text-gray-800 mb-2">
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
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="food"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="transformationProcess" className="block text-sm font-semibold text-gray-800 mb-2">
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
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                                            placeholder="Milling and Processing"
                                            required
                                        />
                                    </div>

                                    <div className="md:col-span-2">
                                        <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-2">
                                            Description
                                        </label>
                                        <textarea
                                            id="description"
                                            value={form.productData.description}
                                            onChange={(e) => setForm(prev => ({
                                                ...prev,
                                                productData: { ...prev.productData, description: e.target.value }
                                            }))}
                                            className="w-full p-4 border-2 border-gray-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
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
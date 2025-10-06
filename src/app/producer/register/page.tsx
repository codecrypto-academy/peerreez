'use client';

import { useState } from 'react';
import Layout from '../../../components/layout/Layout';
import RoleGuard from '../../../components/auth/RoleGuard';
import { useAsset } from '../../../hooks/useFabric';
import { Asset } from '../../../lib/fabric/http-service';

export default function RegisterAssetPage() {
  const { createAsset, loading, error, clearError } = useAsset();

  // Form state
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    category: 'Grains',
    description: '',
    location: '',
    quantity: 0,
    certifications: [] as string[]
  });

  // UI state
  const [success, setSuccess] = useState(false);

  // Available options
  const categories = ['Grains', 'Fruits', 'Vegetables', 'Dairy', 'Meat', 'Other'];
  const certificationOptions = ['Organic', 'Non-GMO', 'Fair Trade', 'Sustainable', 'Kosher', 'Halal'];

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleArrayToggle = (field: string, value: string) => {
    const currentArray = (formData as any)[field];
    const newArray = currentArray.includes(value)
      ? currentArray.filter((item: string) => item !== value)
      : [...currentArray, value];

    handleInputChange(field, newArray);
  };

  const generateAssetId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `RAW-${timestamp}-${random}`.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (error) clearError();
    setSuccess(false);

    // Generate ID if not provided
    const assetId = formData.id || generateAssetId();

    // Prepare asset data
    const assetData: Asset = {
      id: assetId,
      name: formData.name,
      type: 'RAW_MATERIAL',
      category: formData.category,
      description: formData.description,
      location: formData.location,
      quantity: formData.quantity,
      certifications: formData.certifications.length > 0 ? formData.certifications : undefined
    };

    try {
      const result = await createAsset(assetId, assetData);

      if (result.success) {
        setSuccess(true);
        setFormData({
          id: '',
          name: '',
          category: 'Grains',
          description: '',
          location: '',
          quantity: 0,
          certifications: []
        });
      }
    } catch (error) {
      console.error('Failed to create asset:', error);
    }
  };

  return (
    <RoleGuard allowedRoles={['producer']}>
      <Layout title="Register Raw Materials" description="Register new raw materials into the supply chain">
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="container mx-auto px-6 py-8">

            {/* Success Alert */}
            {success && (
              <div className="mb-6 bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-xl flex items-center">
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ✅ Asset registered successfully! It&apos;s now part of the blockchain supply chain.
              </div>
            )}

            {/* Error Alert */}
            {error && (
              <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-xl flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  {error}
                </div>
                <button onClick={clearError} className="ml-2 text-red-500 hover:text-red-700">
                  ×
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">

              {/* Basic Information */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Basic Information</h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Asset ID (optional)
                    </label>
                    <input
                      type="text"
                      value={formData.id}
                      onChange={(e) => handleInputChange('id', e.target.value)}
                      placeholder="Auto-generated if empty"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                    <p className="mt-1 text-xs text-gray-500">Leave empty to auto-generate a unique ID</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g., Premium Organic Wheat"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => handleInputChange('category', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    >
                      {categories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Quantity *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={(e) => handleInputChange('quantity', parseInt(e.target.value) || 0)}
                      placeholder="e.g., 500"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Description *
                    </label>
                    <textarea
                      required
                      rows={3}
                      value={formData.description}
                      onChange={(e) => handleInputChange('description', e.target.value)}
                      placeholder="Detailed description of the raw material..."
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Origin Location *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => handleInputChange('location', e.target.value)}
                      placeholder="e.g., Farm Valley, Oregon, USA"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    />
                  </div>
                </div>
              </div>

              {/* Certifications */}
              <div className="mb-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Certifications</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {certificationOptions.map(cert => (
                    <label key={cert} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={formData.certifications.includes(cert)}
                        onChange={() => handleArrayToggle('certifications', cert)}
                        className="rounded border-gray-300 text-green-600 focus:ring-green-500"
                      />
                      <span className="ml-2 text-sm text-gray-700">{cert}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end space-x-4">
                <button
                  type="button"
                  onClick={() => window.history.back()}
                  className="px-6 py-3 border border-gray-300 text-gray-700 font-semibold rounded-xl hover:bg-gray-50 transition-all duration-200"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                >
                  {loading ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Registering...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Register Asset
                    </div>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </RoleGuard>
  );
}
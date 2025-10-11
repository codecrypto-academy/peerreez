'use client';

import { useState } from 'react';
import { useAssetsByOwner } from '../../../hooks/useGatewayAssets';
import { useInitiateTransfer, usePendingTransfers } from '../../../hooks/usePendingTransfers';
import { PendingTransferCard } from '../../../components/transfers/PendingTransferCard';

interface TransferForm {
  assetId: string;
  recipientMSP: string;
  pickupLocation: string;
  transportMethod: string;
  temperature?: number;
  notes?: string;
  reason?: string;
}

export default function TransferAssetPage() {
  const [formData, setFormData] = useState<TransferForm>({
    assetId: '',
    recipientMSP: '',
    pickupLocation: '',
    transportMethod: '',
    temperature: undefined,
    notes: '',
    reason: ''
  });

  const { data: assets = [], isLoading: assetsLoading } = useAssetsByOwner();
  const { data: pendingTransfers = [], isLoading: transfersLoading } = usePendingTransfers();
  const { mutateAsync: initiateTransfer, isPending: loading, isError, error, isSuccess: success, reset } = useInitiateTransfer();

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    // Validation
    if (!formData.assetId || !formData.recipientMSP || !formData.pickupLocation || !formData.transportMethod) {
      alert('Please fill in all required fields');
      return;
    }

    const transferData = {
      reason: formData.reason || 'Transfer to next stage of supply chain',
      location: formData.pickupLocation,
      transportMethod: formData.transportMethod,
      temperature: formData.temperature,
      notes: formData.notes,
    };

    try {
      await initiateTransfer({
        assetId: formData.assetId,
        recipientMSP: formData.recipientMSP,
        transferData
      });

      // Reset form on success
      setFormData({
        assetId: '',
        recipientMSP: '',
        pickupLocation: '',
        transportMethod: '',
        temperature: undefined,
        notes: '',
        reason: ''
      });
    } catch (err: any) {
      console.error('Transfer initiation failed:', err);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <a href="/producer" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Initiate Transfer Request</h1>
              <p className="text-lg text-gray-600 mt-2">Send transfer requests to recipients for approval (2-step transfer)</p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-700 font-medium">Asset transferred successfully!</p>
              </div>
            </div>
          )}

          {isError && error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error instanceof Error ? error.message : 'Transfer failed'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-black">
            <form onSubmit={handleSubmit} className="space-y-8 text-black">
              {/* Asset Selection Section */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  Select Asset
                </h2>

                <div>
                  <label htmlFor="assetId" className="block text-sm font-semibold text-black mb-3">
                    Choose Asset to Transfer *
                  </label>
                  {assetsLoading ? (
                    <div className="w-full px-4 py-3 bg-gray-200 animate-pulse rounded-xl h-12"></div>
                  ) : (
                    <select
                      id="assetId"
                      name="assetId"
                      required
                      value={formData.assetId}
                      onChange={(e) => handleInputChange('assetId', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                    >
                      <option value="">Choose from your available assets...</option>
                      {assets.length > 0 ? (
                        assets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name} - {asset.id} ({asset.category || 'Raw Material'})
                          </option>
                        ))
                      ) : (
                        <option disabled>No assets available for transfer</option>
                      )}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-2">💡 Only assets you own can be transferred</p>
                </div>
              </div>

              {/* Destination & Transport Section */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Destination & Transport
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="recipientMSP" className="block text-sm font-semibold text-gray-800 mb-3">
                      Recipient Organization *
                    </label>
                    <select
                      id="recipientMSP"
                      name="recipientMSP"
                      required
                      value={formData.recipientMSP}
                      onChange={(e) => handleInputChange('recipientMSP', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select recipient...</option>
                      <option value="FactoryMSP">🏭 Factory (Manufacturing)</option>
                      <option value="RetailerMSP">� Retailer (Distribution)</option>
                      <option value="ConsumerMSP">👤 Consumer (End User)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">⚠️ Producer can only transfer to Factory</p>
                  </div>

                  <div>
                    <label htmlFor="pickupLocation" className="block text-sm font-semibold text-black mb-3">
                      Pickup Location *
                    </label>
                    <input
                      type="text"
                      id="pickupLocation"
                      name="pickupLocation"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-black"
                      placeholder="Farm address or GPS coordinates"
                    />
                  </div>

                  <div>
                    <label htmlFor="transportMethod" className="block text-sm font-semibold text-gray-800 mb-3">
                      Transport Method *
                    </label>
                    <select
                      id="transportMethod"
                      name="transportMethod"
                      required
                      value={formData.transportMethod}
                      onChange={(e) => handleInputChange('transportMethod', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select transport method...</option>
                      <option value="truck">🚛 Refrigerated Truck</option>
                      <option value="container">📦 Shipping Container</option>
                      <option value="air">✈️ Air Cargo (Express)</option>
                      <option value="rail">🚂 Rail Transport</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="temperature" className="block text-sm font-semibold text-gray-800 mb-3">
                      Required Temperature (°C)
                    </label>
                    <input
                      type="number"
                      id="temperature"
                      name="temperature"
                      step="0.1"
                      value={formData.temperature || ''}
                      onChange={(e) => handleInputChange('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                      placeholder="e.g., 4.0 for refrigerated transport"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Additional Information
                </h2>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="reason" className="block text-sm font-semibold text-gray-800 mb-3">
                      Transfer Reason
                    </label>
                    <input
                      type="text"
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                      placeholder="e.g., Purchase Order #12345, Contract fulfillment..."
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-semibold text-gray-800 mb-3">
                      Transfer Notes & Instructions
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                      placeholder="Special handling instructions, quality requirements, delivery timeframes, contact information for coordination, etc..."
                    />
                  </div>
                </div>
              </div>

              {/* Transfer Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-900 mb-3">2-Step Transfer Process</h3>
                    <div className="space-y-2 text-blue-800">
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        <strong>Step 1:</strong> You initiate the transfer request (asset is locked)
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        <strong>Step 2:</strong> Recipient must Accept or Reject the transfer
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Ownership changes <strong>only if accepted</strong> by recipient
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        All actions are recorded immutably on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading || !formData.assetId || !formData.recipientMSP || !formData.pickupLocation || !formData.transportMethod}
                  className={`flex-1 px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.02]'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Initiating Transfer...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                      </svg>
                      Initiate Transfer Request
                    </>
                  )}
                </button>
                <a
                  href="/producer"
                  className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-semibold text-lg flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </a>
              </div>
            </form>
          </div>

          {/* Pending Transfers Section */}
          <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              Pending Outgoing Transfers
            </h2>

            {transfersLoading ? (
              <div className="flex items-center justify-center py-12">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : pendingTransfers.filter(t => t.direction === 'outgoing').length === 0 ? (
              <div className="text-center py-12">
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No pending transfers</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Transfers you initiate will appear here waiting for recipient approval.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {pendingTransfers
                  .filter(t => t.direction === 'outgoing')
                  .map(transfer => (
                    <PendingTransferCard key={transfer.id} transfer={transfer} />
                  ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
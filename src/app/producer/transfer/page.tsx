export default function TransferAssetPage() {
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
              <h1 className="text-4xl font-bold text-gray-900">Transfer to Factory</h1>
              <p className="text-lg text-gray-600 mt-2">Send your raw materials to manufacturing facilities</p>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
            <form className="space-y-8">
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
                  <label htmlFor="assetId" className="block text-sm font-semibold text-gray-800 mb-3">
                    Choose Asset to Transfer *
                  </label>
                  <select
                    id="assetId"
                    name="assetId"
                    required
                    className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  >
                    <option value="">Choose from your available assets...</option>
                    <option value="asset1">🌾 Organic Wheat Batch #001 - Available (500kg)</option>
                    <option value="asset2">🍎 Premium Apple Harvest #002 - Available (200kg)</option>
                    <option value="asset3">🥕 Fresh Carrot Batch #003 - Available (150kg)</option>
                  </select>
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
                    <label htmlFor="factoryId" className="block text-sm font-semibold text-gray-800 mb-3">
                      Destination Factory *
                    </label>
                    <select
                      id="factoryId"
                      name="factoryId"
                      required
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select manufacturing facility...</option>
                      <option value="factory1">🏭 Acme Food Processing Ltd.</option>
                      <option value="factory2">🌱 Green Valley Manufacturing</option>
                      <option value="factory3">♻️ Sustainable Foods Inc.</option>
                      <option value="factory4">🥫 Premium Processing Corp.</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-semibold text-gray-800 mb-3">
                      Pickup Location *
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      required
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
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

                <div>
                  <label htmlFor="notes" className="block text-sm font-semibold text-gray-800 mb-3">
                    Transfer Notes & Instructions
                  </label>
                  <textarea
                    id="notes"
                    name="notes"
                    rows={4}
                    className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                    placeholder="Special handling instructions, quality requirements, delivery timeframes, contact information for coordination, etc..."
                  />
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
                    <h3 className="text-xl font-semibold text-blue-900 mb-3">Blockchain Transfer Preview</h3>
                    <div className="space-y-2 text-blue-800">
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Ownership will transfer from <strong>Producer</strong> to <strong>Factory</strong>
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Transaction will be recorded on Hyperledger Fabric blockchain
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Complete audit trail will be maintained for traceability
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Supply chain rules will be enforced automatically
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-8 py-4 rounded-xl hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                  </svg>
                  Initiate Blockchain Transfer
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
        </div>
      </div>
    </div>
  );
}
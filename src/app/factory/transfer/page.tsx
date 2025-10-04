export default function FactoryTransferPage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-rose-50">
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
                            <p className="text-lg text-gray-600 mt-2">Transfer finished products to retail partners</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                        <form className="space-y-8">
                            {/* Product Selection */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    Select Products
                                </h2>

                                <div>
                                    <label htmlFor="productId" className="block text-sm font-semibold text-gray-800 mb-3">
                                        Choose Product to Ship *
                                    </label>
                                    <select
                                        id="productId"
                                        name="productId"
                                        required
                                        className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                    >
                                        <option value="">Choose from your finished products...</option>
                                        <option value="product1">🌾 Premium Wheat Flour Batch #WF001 - Ready (400kg)</option>
                                        <option value="product2">🥫 Organic Vegetable Mix Batch #VM002 - Ready (250kg)</option>
                                        <option value="product3">🍪 Artisan Crackers Batch #AC003 - Ready (100kg)</option>
                                        <option value="product4">🥤 Natural Juice Blend Batch #JB004 - Ready (300L)</option>
                                    </select>
                                </div>
                            </div>

                            {/* Retailer Selection */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                        </svg>
                                    </div>
                                    Destination Retailer
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="retailerId" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Select Retail Partner *
                                        </label>
                                        <select
                                            id="retailerId"
                                            name="retailerId"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                        >
                                            <option value="">Select retail destination...</option>
                                            <option value="retailer1">🏪 FreshMart Supermarkets</option>
                                            <option value="retailer2">🏬 Organic Grocers Network</option>
                                            <option value="retailer3">🛒 Premium Food Stores</option>
                                            <option value="retailer4">🍃 Green Market Chain</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="deliveryAddress" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Delivery Address *
                                        </label>
                                        <input
                                            type="text"
                                            id="deliveryAddress"
                                            name="deliveryAddress"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="Retailer warehouse or store address"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Shipping Details */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                    </div>
                                    Shipping Information
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="transportMethod" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Transport Method *
                                        </label>
                                        <select
                                            id="transportMethod"
                                            name="transportMethod"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                        >
                                            <option value="">Select shipping method...</option>
                                            <option value="truck">🚛 Refrigerated Truck</option>
                                            <option value="container">📦 Standard Container</option>
                                            <option value="express">⚡ Express Delivery</option>
                                            <option value="bulk">🚚 Bulk Transport</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="temperature" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Storage Temperature (°C)
                                        </label>
                                        <input
                                            type="number"
                                            id="temperature"
                                            name="temperature"
                                            step="0.1"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="e.g., 18.0 for room temperature"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="estimatedDelivery" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Estimated Delivery Date
                                        </label>
                                        <input
                                            type="date"
                                            id="estimatedDelivery"
                                            name="estimatedDelivery"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="trackingNumber" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Tracking Reference
                                        </label>
                                        <input
                                            type="text"
                                            id="trackingNumber"
                                            name="trackingNumber"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="Internal tracking or order number"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Quality & Documentation */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    Quality & Documentation
                                </h2>

                                <div>
                                    <label htmlFor="shippingNotes" className="block text-sm font-semibold text-gray-800 mb-3">
                                        Shipping Notes & Quality Certifications
                                    </label>
                                    <textarea
                                        id="shippingNotes"
                                        name="shippingNotes"
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                                        placeholder="Quality test results, certifications, handling instructions, special requirements, delivery contact information..."
                                    />
                                </div>
                            </div>

                            {/* Transfer Preview */}
                            <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-xl p-6">
                                <div className="flex items-start">
                                    <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                        <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-purple-900 mb-3">Blockchain Transfer Preview</h3>
                                        <div className="space-y-2 text-purple-800">
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                                                Ownership will transfer from <strong>Factory</strong> to <strong>Retailer</strong>
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                                                Product status will change to <strong>IN_TRANSIT</strong>
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                                                Complete shipping record will be stored on blockchain
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-purple-500 rounded-full mr-3"></span>
                                                Supply chain flow validation will be enforced
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-8 py-4 rounded-xl hover:from-purple-600 hover:to-pink-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center"
                                >
                                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5" />
                                    </svg>
                                    Ship to Retailer
                                </button>
                                <a
                                    href="/factory"
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
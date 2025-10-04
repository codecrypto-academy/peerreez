export default function TracePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <a href="/consumer" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </a>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Product Traceability</h1>
                            <p className="text-lg text-gray-600 mt-2">Discover the complete journey of your products</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-6xl mx-auto">
                    {/* Search Section */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 mb-8">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                            <div className="w-8 h-8 bg-cyan-100 rounded-lg flex items-center justify-center mr-3">
                                <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </div>
                            Find Your Product
                        </h2>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Manual Search */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800">Enter Product Information</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label htmlFor="productId" className="block text-sm font-semibold text-gray-800 mb-2">
                                            Product ID or Batch Number
                                        </label>
                                        <input
                                            type="text"
                                            id="productId"
                                            name="productId"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="e.g., WF001, VM002, AC003..."
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="receiptId" className="block text-sm font-semibold text-gray-800 mb-2">
                                            Receipt Number (Optional)
                                        </label>
                                        <input
                                            type="text"
                                            id="receiptId"
                                            name="receiptId"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="Receipt or transaction ID"
                                        />
                                    </div>

                                    <button className="w-full bg-gradient-to-r from-cyan-500 to-blue-500 text-white px-6 py-3 rounded-xl hover:from-cyan-600 hover:to-blue-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl font-semibold flex items-center justify-center">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                        </svg>
                                        Search Product
                                    </button>
                                </div>
                            </div>

                            {/* QR Code Scanner */}
                            <div className="space-y-4">
                                <h3 className="text-lg font-semibold text-gray-800">QR Code Scanner</h3>
                                <div className="bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl p-8 text-center">
                                    <div className="w-24 h-24 bg-white rounded-xl mx-auto mb-4 flex items-center justify-center border-2 border-dashed border-gray-400">
                                        <svg className="w-12 h-12 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                                        </svg>
                                    </div>
                                    <p className="text-gray-600 mb-4">Point your camera at the QR code on your product</p>
                                    <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-xl transition-colors font-semibold flex items-center justify-center mx-auto">
                                        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                        Open Camera
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sample Trace Result */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                        <div className="flex items-center justify-between mb-8">
                            <div>
                                <h2 className="text-2xl font-semibold text-gray-900 flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                        </svg>
                                    </div>
                                    Supply Chain Trace
                                </h2>
                                <p className="text-gray-600 mt-1">Complete journey from farm to your table</p>
                            </div>

                            <div className="flex items-center space-x-4">
                                <div className="px-4 py-2 bg-green-100 text-green-800 rounded-lg font-semibold">
                                    ✓ Verified Authentic
                                </div>
                                <button className="px-4 py-2 bg-blue-100 hover:bg-blue-200 text-blue-700 rounded-lg font-medium transition-colors">
                                    Download Report
                                </button>
                            </div>
                        </div>

                        {/* Product Info */}
                        <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 mb-8">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mr-6">
                                        <span className="text-3xl">🌾</span>
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-bold text-gray-900">Premium Wheat Flour</h3>
                                        <p className="text-gray-600">Batch #WF001 • Organic Certified</p>
                                        <p className="text-sm text-blue-700 font-medium mt-1">Asset ID: asset_wheat_001</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm text-gray-600">Purchase Date</div>
                                    <div className="text-lg font-semibold text-gray-900">Dec 2, 2025</div>
                                    <div className="text-sm text-gray-600">2kg package</div>
                                </div>
                            </div>
                        </div>

                        {/* Trace Timeline */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-semibold text-gray-900 mb-6">Supply Chain Journey</h3>

                            {/* Timeline Items */}
                            <div className="relative">
                                <div className="absolute left-6 top-8 bottom-0 w-0.5 bg-gradient-to-b from-green-400 to-blue-400"></div>

                                {/* Producer Stage */}
                                <div className="relative flex items-start space-x-4 pb-8">
                                    <div className="w-12 h-12 bg-green-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">1</div>
                                    <div className="flex-1 bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">🌱 Producer - GreenFarm Organic</h4>
                                                <p className="text-green-700 font-medium">Raw Material Registration</p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <div className="text-gray-600">Nov 15, 2025</div>
                                                <div className="text-green-700 font-medium">✓ Verified</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Origin:</span>
                                                <p className="font-medium">Valley Farm, Organic Fields</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Certifications:</span>
                                                <p className="font-medium">USDA Organic, Non-GMO</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Harvest Date:</span>
                                                <p className="font-medium">Nov 10, 2025</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Quality Grade:</span>
                                                <p className="font-medium text-green-600">Premium A+</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Factory Stage */}
                                <div className="relative flex items-start space-x-4 pb-8">
                                    <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">2</div>
                                    <div className="flex-1 bg-gradient-to-r from-orange-50 to-red-50 rounded-xl p-6 border border-orange-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">🏭 Factory - Acme Food Processing</h4>
                                                <p className="text-orange-700 font-medium">Material Transformation</p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <div className="text-gray-600">Nov 20, 2025</div>
                                                <div className="text-orange-700 font-medium">✓ Processed</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Process:</span>
                                                <p className="font-medium">Stone Milling, Air Classification</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Temperature:</span>
                                                <p className="font-medium">18°C (Controlled)</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Quality Tests:</span>
                                                <p className="font-medium">Protein 12.5%, Moisture 13%</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Processing Date:</span>
                                                <p className="font-medium">Nov 18, 2025</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Retailer Stage */}
                                <div className="relative flex items-start space-x-4 pb-8">
                                    <div className="w-12 h-12 bg-purple-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">3</div>
                                    <div className="flex-1 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">🏪 Retailer - FreshMart Supermarket</h4>
                                                <p className="text-purple-700 font-medium">Distribution & Sale</p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <div className="text-gray-600">Dec 2, 2025</div>
                                                <div className="text-purple-700 font-medium">✓ Sold</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Store Location:</span>
                                                <p className="font-medium">Downtown Branch, Aisle 5</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Storage:</span>
                                                <p className="font-medium">Dry, Room Temperature</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Receipt:</span>
                                                <p className="font-medium">#RCP-789456123</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Price:</span>
                                                <p className="font-medium text-purple-600">€4.99/kg</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Consumer Stage */}
                                <div className="relative flex items-start space-x-4">
                                    <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">4</div>
                                    <div className="flex-1 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-6 border border-blue-200">
                                        <div className="flex items-center justify-between mb-4">
                                            <div>
                                                <h4 className="text-lg font-semibold text-gray-900">👤 You - Final Consumer</h4>
                                                <p className="text-blue-700 font-medium">Product Delivered</p>
                                            </div>
                                            <div className="text-right text-sm">
                                                <div className="text-gray-600">Dec 2, 2025</div>
                                                <div className="text-blue-700 font-medium">✓ In Your Kitchen</div>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <span className="text-gray-600">Purchase Method:</span>
                                                <p className="font-medium">In-store Purchase</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Expiry Date:</span>
                                                <p className="font-medium text-blue-600">Dec 29, 2025</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Storage Recommendation:</span>
                                                <p className="font-medium">Cool, dry place</p>
                                            </div>
                                            <div>
                                                <span className="text-gray-600">Blockchain Verified:</span>
                                                <p className="font-medium text-green-600">100% Authentic</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Additional Info */}
                        <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6 border border-cyan-200">
                                <h4 className="text-lg font-semibold text-cyan-900 mb-3 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                    </svg>
                                    Blockchain Verification
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-cyan-700">Network:</span> Hyperledger Fabric</p>
                                    <p><span className="text-cyan-700">Transaction ID:</span> 0x7a8b9c...</p>
                                    <p><span className="text-cyan-700">Block Number:</span> #4,582,391</p>
                                    <p><span className="text-cyan-700">Timestamp:</span> Dec 2, 2025 10:32 AM</p>
                                </div>
                            </div>

                            <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-200">
                                <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                                    </svg>
                                    Sustainability Metrics
                                </h4>
                                <div className="space-y-2 text-sm">
                                    <p><span className="text-green-700">Carbon Footprint:</span> 0.8 kg CO₂eq</p>
                                    <p><span className="text-green-700">Water Usage:</span> 1.2L per kg</p>
                                    <p><span className="text-green-700">Local Sourcing:</span> 95% within 50km</p>
                                    <p><span className="text-green-700">Sustainability Score:</span> A+ Rating</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
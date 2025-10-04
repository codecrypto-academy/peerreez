export default function TransformAssetPage() {
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
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                        <form className="space-y-8">
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
                                    <div className="space-y-3">
                                        {/* Raw Material Items */}
                                        <div className="flex items-center p-4 bg-white/70 border-2 border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
                                            <input type="checkbox" id="raw1" className="mr-4 w-5 h-5 text-orange-600 rounded" />
                                            <label htmlFor="raw1" className="flex-1 cursor-pointer">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">🌾 Organic Wheat Batch #001</p>
                                                        <p className="text-sm text-gray-600">From: GreenFarm Producer • Received: 2 days ago</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-gray-900">500kg</p>
                                                        <p className="text-sm text-green-600">Available</p>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>

                                        <div className="flex items-center p-4 bg-white/70 border-2 border-gray-200 rounded-xl hover:border-orange-300 transition-colors">
                                            <input type="checkbox" id="raw2" className="mr-4 w-5 h-5 text-orange-600 rounded" />
                                            <label htmlFor="raw2" className="flex-1 cursor-pointer">
                                                <div className="flex justify-between items-center">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">🥕 Fresh Carrot Batch #003</p>
                                                        <p className="text-sm text-gray-600">From: Valley Producer • Received: 1 day ago</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="font-bold text-gray-900">150kg</p>
                                                        <p className="text-sm text-green-600">Available</p>
                                                    </div>
                                                </div>
                                            </label>
                                        </div>
                                    </div>
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
                                        <label htmlFor="productName" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Product Name *
                                        </label>
                                        <input
                                            type="text"
                                            id="productName"
                                            name="productName"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="e.g., Premium Wheat Flour"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="category" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Product Category *
                                        </label>
                                        <select
                                            id="category"
                                            name="category"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                        >
                                            <option value="">Select product category</option>
                                            <option value="flour">🌾 Flour & Grains</option>
                                            <option value="processed">🥫 Processed Foods</option>
                                            <option value="packaged">📦 Packaged Goods</option>
                                            <option value="beverages">🥤 Beverages</option>
                                            <option value="snacks">🍪 Snacks & Confectionery</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="batchNumber" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Product Batch Number *
                                        </label>
                                        <input
                                            type="text"
                                            id="batchNumber"
                                            name="batchNumber"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="Generated product batch ID"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="expiryDate" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Product Expiry Date
                                        </label>
                                        <input
                                            type="date"
                                            id="expiryDate"
                                            name="expiryDate"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Manufacturing Process */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        </svg>
                                    </div>
                                    Manufacturing Process
                                </h2>

                                <div>
                                    <label htmlFor="description" className="block text-sm font-semibold text-gray-800 mb-3">
                                        Process Description & Quality Notes
                                    </label>
                                    <textarea
                                        id="description"
                                        name="description"
                                        rows={4}
                                        className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                                        placeholder="Describe the manufacturing process, quality controls, temperature conditions, processing time, etc..."
                                    />
                                </div>
                            </div>

                            {/* Transformation Preview */}
                            <div className="bg-gradient-to-r from-orange-50 to-red-50 border-2 border-orange-200 rounded-xl p-6">
                                <div className="flex items-start">
                                    <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                        <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-orange-900 mb-3">Blockchain Transformation Preview</h3>
                                        <div className="space-y-2 text-orange-800">
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                                                Raw materials will be marked as <strong>CONSUMED</strong>
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                                                New product will be created with <strong>MANUFACTURED</strong> status
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                                                Complete transformation record will be stored on blockchain
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-orange-500 rounded-full mr-3"></span>
                                                Traceability chain will link product to source materials
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-orange-500 to-red-500 text-white px-8 py-4 rounded-xl hover:from-orange-600 hover:to-red-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center"
                                >
                                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                    </svg>
                                    Execute Transformation
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
export default function DistributePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50">
            <div className="container mx-auto px-6 py-8">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center mb-4">
                        <a href="/retailer" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
                            <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </a>
                        <div>
                            <h1 className="text-4xl font-bold text-gray-900">Distribute to Consumer</h1>
                            <p className="text-lg text-gray-600 mt-2">Process final sale to end customers</p>
                        </div>
                    </div>
                </div>

                <div className="max-w-4xl mx-auto">
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
                        <form className="space-y-8">
                            {/* Product Selection */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                                        </svg>
                                    </div>
                                    Select Product for Sale
                                </h2>

                                <div>
                                    <label htmlFor="productId" className="block text-sm font-semibold text-gray-800 mb-3">
                                        Choose Product from Inventory *
                                    </label>
                                    <select
                                        id="productId"
                                        name="productId"
                                        required
                                        className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                    >
                                        <option value="">Select product to sell...</option>
                                        <option value="product1">🌾 Premium Wheat Flour - Batch #WF001 (400kg available)</option>
                                        <option value="product2">🥫 Organic Vegetable Mix - Batch #VM002 (250kg available)</option>
                                        <option value="product3">🍪 Artisan Crackers - Batch #AC003 (100kg available)</option>
                                        <option value="product4">🥤 Natural Juice Blend - Batch #JB004 (300L available)</option>
                                    </select>
                                </div>

                                {/* Product Details Display */}
                                <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200">
                                    <h3 className="font-semibold text-blue-900 mb-2">Selected Product Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                                        <div>
                                            <span className="text-blue-700 font-medium">Origin:</span>
                                            <p className="text-blue-800">Acme Food Processing</p>
                                        </div>
                                        <div>
                                            <span className="text-blue-700 font-medium">Manufactured:</span>
                                            <p className="text-blue-800">3 days ago</p>
                                        </div>
                                        <div>
                                            <span className="text-blue-700 font-medium">Expires:</span>
                                            <p className="text-blue-800">In 27 days</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Customer Information */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    Customer Information
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="consumerId" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Consumer ID *
                                        </label>
                                        <select
                                            id="consumerId"
                                            name="consumerId"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                        >
                                            <option value="">Select registered consumer...</option>
                                            <option value="consumer1">👤 Alice Johnson - Premium Member</option>
                                            <option value="consumer2">👤 Bob Smith - Regular Customer</option>
                                            <option value="consumer3">👤 Carol White - New Customer</option>
                                            <option value="consumer4">👨‍💼 David Brown - Business Account</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label htmlFor="quantity" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Quantity *
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                id="quantity"
                                                name="quantity"
                                                required
                                                min="0.1"
                                                step="0.1"
                                                className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                                placeholder="Enter quantity"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                                <span className="text-gray-500 text-sm">kg</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="price" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Unit Price
                                        </label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                id="price"
                                                name="price"
                                                step="0.01"
                                                className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                                placeholder="Price per unit"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-4">
                                                <span className="text-gray-500 text-sm">€/kg</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label htmlFor="paymentMethod" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Payment Method
                                        </label>
                                        <select
                                            id="paymentMethod"
                                            name="paymentMethod"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                        >
                                            <option value="">Select payment method...</option>
                                            <option value="cash">💵 Cash</option>
                                            <option value="card">💳 Credit/Debit Card</option>
                                            <option value="digital">📱 Digital Payment</option>
                                            <option value="crypto">₿ Cryptocurrency</option>
                                        </select>
                                    </div>
                                </div>
                            </div>

                            {/* Sale Details */}
                            <div className="border-b border-gray-200 pb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                                        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                    </div>
                                    Sale Documentation
                                </h2>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label htmlFor="saleDate" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Sale Date *
                                        </label>
                                        <input
                                            type="datetime-local"
                                            id="saleDate"
                                            name="saleDate"
                                            required
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200"
                                        />
                                    </div>

                                    <div>
                                        <label htmlFor="receiptNumber" className="block text-sm font-semibold text-gray-800 mb-3">
                                            Receipt Number
                                        </label>
                                        <input
                                            type="text"
                                            id="receiptNumber"
                                            name="receiptNumber"
                                            className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                                            placeholder="Auto-generated receipt ID"
                                            readOnly
                                        />
                                    </div>
                                </div>

                                <div className="mt-6">
                                    <label htmlFor="saleNotes" className="block text-sm font-semibold text-gray-800 mb-3">
                                        Sale Notes & Customer Preferences
                                    </label>
                                    <textarea
                                        id="saleNotes"
                                        name="saleNotes"
                                        rows={3}
                                        className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                                        placeholder="Customer preferences, special requests, loyalty discounts, etc..."
                                    />
                                </div>
                            </div>

                            {/* Sale Summary */}
                            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200 rounded-xl p-6">
                                <div className="flex items-start">
                                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                                        <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                        </svg>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-semibold text-indigo-900 mb-3">Blockchain Sale Summary</h3>
                                        <div className="space-y-2 text-indigo-800">
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                                                Ownership will transfer from <strong>Retailer</strong> to <strong>Consumer</strong>
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                                                Product status will change to <strong>DELIVERED</strong>
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                                                Complete sale record will be stored on blockchain
                                            </p>
                                            <p className="flex items-center">
                                                <span className="w-2 h-2 bg-indigo-500 rounded-full mr-3"></span>
                                                Final traceability link will be established
                                            </p>
                                        </div>

                                        {/* Price Calculation */}
                                        <div className="mt-4 p-4 bg-white/60 rounded-lg">
                                            <div className="flex justify-between items-center text-lg">
                                                <span className="font-semibold">Total Amount:</span>
                                                <span className="text-2xl font-bold text-indigo-900">€0.00</span>
                                            </div>
                                            <p className="text-sm text-indigo-700 mt-1">Calculated: Quantity × Unit Price</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-4 pt-6">
                                <button
                                    type="submit"
                                    className="flex-1 bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-8 py-4 rounded-xl hover:from-indigo-600 hover:to-purple-600 transform hover:scale-[1.02] transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg flex items-center justify-center"
                                >
                                    <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                    </svg>
                                    Complete Sale
                                </button>
                                <a
                                    href="/retailer"
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
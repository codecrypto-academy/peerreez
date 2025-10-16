'use client';

import { useState } from 'react';
import Layout from '@/components/layout/Layout';
import { useAssetsByOwner, Asset } from '@/hooks/useGatewayAssets';
import { useInitiateTransfer } from '@/hooks/usePendingTransfers';

// Consumer identity - Single consumer in the system
const CONSUMER_IDENTITY = 'x509::/C=US/ST=California/L=San Francisco/OU=admin/CN=Admin@consumer.supplychain.com::/C=US/ST=California/L=San Francisco/O=consumer.supplychain.com/CN=ca.consumer.supplychain.com';

export default function DistributePage() {
    const { data: assets, isLoading, error } = useAssetsByOwner();
    // sellMutation is no longer used because Retailer->Consumer sales are now always 2-step

    const [selectedAsset, setSelectedAsset] = useState<string>('');
    const [quantityToSell, setQuantityToSell] = useState<number>(0);
    const [purchaseLocation, setPurchaseLocation] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('');
    const [notes, setNotes] = useState<string>('');
    // requireAcceptance state retained for historical reasons but not used; keep as a constant
    const [requireAcceptance] = useState<boolean>(false);
    const [notification, setNotification] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // Filter assets that can be distributed to consumers:
    // - PRODUCT assets that are MANUFACTURED or IN_TRANSIT
    // - RAW_MATERIAL assets (e.g., bread batches) that are CREATED or MANUFACTURED
    const availableProducts = assets?.filter(
        (asset: Asset) => (
            (asset.type === 'PRODUCT' && (asset.status === 'MANUFACTURED' || asset.status === 'IN_TRANSIT')) ||
            (asset.type === 'RAW_MATERIAL' && (asset.status === 'CREATED' || asset.status === 'MANUFACTURED'))
        )
    ) || [];

    // Values for the currently selected product (render scope)
    const selectedProductInView = availableProducts.find((asset: Asset) => asset.id === selectedAsset);
    const selectedProductQtyInView = selectedProductInView ? (typeof selectedProductInView.quantity === 'number' ? selectedProductInView.quantity : Number(selectedProductInView.quantity) || 0) : 0;

    const initiateTransfer = useInitiateTransfer();

    const handleDistribute = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!selectedAsset) {
            setNotification({ type: 'error', message: 'Please select a product' });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        if (quantityToSell <= 0) {
            setNotification({ type: 'error', message: 'Please specify a valid quantity to sell' });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        // Get selected product to validate quantity
        const selectedProduct = availableProducts.find((asset: Asset) => asset.id === selectedAsset);
        const selectedProductQty = selectedProduct ? (typeof selectedProduct.quantity === 'number' ? selectedProduct.quantity : Number(selectedProduct.quantity) || 0) : 0;
        if (selectedProduct && quantityToSell > selectedProductQty) {
            setNotification({
                type: 'error',
                message: `Insufficient quantity. Available: ${selectedProductQty} ${selectedProduct ? ((selectedProduct.unit as string) || 'units') : 'units'}, Requested: ${quantityToSell}`
            });
            setTimeout(() => setNotification(null), 5000);
            return;
        }

        try {
            const saleDetails = {
                destination: 'consumer',
                purchaseLocation: purchaseLocation || 'Retail Store',
                paymentMethod: paymentMethod || 'card',
                notes: notes || '',
                transferType: 'retailer-to-consumer',
                saleDate: new Date().toISOString(),
            };

            // New behavior: All Retailer->Consumer sales are 2-step pending transfers.
            // Create a pending transfer with the requested quantity; consumer must accept.
            const transferPayload = {
                ...saleDetails,
                recipientIdentity: CONSUMER_IDENTITY,
                quantityRequested: quantityToSell
            };

            await initiateTransfer.mutateAsync({
                assetId: selectedAsset,
                recipientMSP: 'ConsumerMSP',
                transferData: transferPayload
            });

            setNotification({ type: 'success', message: 'Transfer initiated. Waiting for consumer to accept or reject the transfer.' });

            // Reset form
            setSelectedAsset('');
            setQuantityToSell(0);
            setPurchaseLocation('');
            setPaymentMethod('');
            setNotes('');

            setTimeout(() => setNotification(null), 3000);
        } catch (err: unknown) {
            console.error('Distribution error:', err instanceof Error ? err.message : String(err));
            // Prefer mutation error messages when available
            const msg = err instanceof Error ? err.message : (initiateTransfer.error as unknown as { message?: string })?.message || 'Unknown error';
            setNotification({ type: 'error', message: `Error distributing product: ${msg}` });
            setTimeout(() => setNotification(null), 5000);
        }
    };

    return (
        <Layout title="Distribute to Consumers" description="Sell products to final customers">
            {/* Toast Notification (kept for backward compatibility) */}
            {notification && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-4 rounded-lg shadow-2xl border-2 backdrop-blur-sm animate-slide-in-right ${notification.type === 'success'
                    ? 'bg-green-50/90 border-green-300 text-green-800'
                    : 'bg-red-50/90 border-red-300 text-red-800'
                    }`}>
                    <div className="flex items-center gap-3">
                        {notification.type === 'success' ? (
                            <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        ) : (
                            <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        )}
                        <p className="font-medium">{notification.message}</p>
                        <button
                            onClick={() => setNotification(null)}
                            className="ml-4 text-gray-500 hover:text-gray-700 focus:outline-none"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>
            )}

            <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto">
                    {/* Header */}
                    <div className="mb-8">
                        <div className="flex items-center mb-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center mr-4">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">Distribute to Consumers</h1>
                                <p className="text-gray-600 mt-1">Process sales to final customers</p>
                            </div>
                        </div>
                        <a
                            href="/retailer"
                            className="text-indigo-600 hover:text-indigo-800 font-medium inline-flex items-center"
                        >
                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                            </svg>
                            Back to Dashboard
                        </a>
                    </div>

                    {/* Main Card */}
                    <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-black">
                        <form onSubmit={handleDistribute} className="space-y-6 text-black">
                            {/* Product Selection */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2 text-black">
                                    Select Product to Sell
                                </label>
                                {isLoading ? (
                                    <div className="w-full h-12 bg-gray-200 animate-pulse rounded-lg"></div>
                                ) : error ? (
                                    <div className="text-red-600 bg-red-50 p-4 rounded-lg">
                                        Error loading products: {error.message}
                                    </div>
                                ) : availableProducts.length === 0 ? (
                                    <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                                        <svg className="w-12 h-12 text-gray-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                        </svg>
                                        <p className="text-gray-600 font-medium">No products available for sale</p>
                                        <p className="text-gray-500 text-sm mt-2">Wait for Factory to transfer products to your inventory</p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 gap-3">
                                        {availableProducts.map((asset: Asset) => {
                                            return (
                                                <label
                                                    key={asset.id}
                                                    className={`relative flex items-center p-4 border-2 rounded-lg cursor-pointer transition-all ${selectedAsset === asset.id
                                                        ? 'border-indigo-500 bg-indigo-50'
                                                        : 'border-gray-300 hover:border-indigo-300 bg-white'
                                                        }`}
                                                >
                                                    <input
                                                        type="radio"
                                                        name="product"
                                                        value={asset.id}
                                                        checked={selectedAsset === asset.id}
                                                        onChange={(e) => setSelectedAsset(e.target.value)}
                                                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500"
                                                    />
                                                    <div className="ml-4 flex-1">
                                                        <div className="flex items-center justify-between">
                                                            <div>
                                                                <p className="font-semibold text-black">{asset.name}</p>
                                                                <p className="text-sm text-black">ID: {asset.id}</p>
                                                            </div>
                                                            <div className="text-right">
                                                                <span className={`inline-block px-3 py-1 text-xs font-semibold rounded-full ${asset.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                                                                    {asset.status}
                                                                </span>
                                                                {asset.category && (
                                                                    <p className="text-sm text-gray-500 mt-1">{asset.category}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                        {asset.quantity !== undefined && (
                                                            <p className="text-sm text-black mt-2">
                                                                Quantity: {typeof asset.quantity === 'number' ? asset.quantity : Number(asset.quantity || 0)} {typeof asset.unit === 'string' ? asset.unit : 'units'}
                                                            </p>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>

                            {/* Automatic Consumer Info */}
                            <div className="bg-green-50 border-2 border-green-200 rounded-xl p-4">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="text-sm font-semibold text-green-900 mb-1">Destination Consumer</h4>
                                        <p className="text-sm text-green-800">
                                            <span className="font-medium">Consumer Central</span> (California)
                                        </p>
                                        <p className="text-xs text-green-700 mt-1">
                                            ✓ Sales are automatically assigned to the registered consumer
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Quantity to Sell */}
                            {selectedAsset && (() => {
                                const product = availableProducts.find((asset: Asset) => asset.id === selectedAsset);
                                const availableQuantity = product ? (typeof product.quantity === 'number' ? product.quantity : Number(product.quantity) || 0) : 0;
                                const unit = product ? ((product.unit as string) || 'units') : 'units';

                                return (
                                    <div className="bg-indigo-50 border-2 border-indigo-200 rounded-xl p-6">
                                        <div className="flex items-start gap-4">
                                            <div className="w-12 h-12 bg-indigo-500 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                                                </svg>
                                            </div>
                                            <div className="flex-1">
                                                <label htmlFor="quantity" className="block text-sm font-semibold text-black mb-2">
                                                    Quantity to Sell
                                                </label>
                                                <p className="text-sm text-indigo-700 mb-3">
                                                    📦 Available: <span className="font-bold">{availableQuantity} {unit}</span>
                                                </p>
                                                <div className="flex items-center gap-4">
                                                    <input
                                                        type="number"
                                                        id="quantity"
                                                        value={quantityToSell || ''}
                                                        onChange={(e) => {
                                                            const value = parseFloat(e.target.value) || 0;
                                                            setQuantityToSell(Math.min(value, Number(availableQuantity)));
                                                        }}
                                                        min="0"
                                                        max={availableQuantity}
                                                        step="0.01"
                                                        placeholder="Enter quantity"
                                                        className="flex-1 px-4 py-3 border-2 border-indigo-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 font-semibold text-black"
                                                        required
                                                    />
                                                    <span className="text-sm font-medium text-indigo-700 min-w-[60px]">{unit}</span>
                                                    <button
                                                        type="button"
                                                        onClick={() => setQuantityToSell(Number(availableQuantity))}
                                                        className="px-4 py-3 bg-indigo-500 text-white font-medium rounded-lg hover:bg-indigo-600 transition-colors whitespace-nowrap"
                                                    >
                                                        Use All
                                                    </button>
                                                </div>
                                                {quantityToSell > 0 && quantityToSell < availableQuantity && (
                                                    <p className="text-sm text-indigo-600 mt-2">
                                                        💡 Remaining after sale: <span className="font-semibold">{(availableQuantity - quantityToSell).toFixed(2)} {unit}</span>
                                                    </p>
                                                )}
                                                {quantityToSell > availableQuantity && (
                                                    <p className="text-sm text-red-600 mt-2 font-semibold">
                                                        ⚠️ Quantity exceeds available stock
                                                    </p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Require acceptance option removed per request */}

                            {/* Sale Details */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label htmlFor="purchaseLocation" className="block text-sm font-medium text-gray-700 mb-2 text-black">
                                        Purchase Location
                                    </label>
                                    <input
                                        type="text"
                                        id="purchaseLocation"
                                        value={purchaseLocation}
                                        onChange={(e) => setPurchaseLocation(e.target.value)}
                                        placeholder="e.g., Retail Store Downtown"
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="paymentMethod" className="block text-sm font-medium text-gray-700 mb-2 text-black">
                                        Payment Method
                                    </label>
                                    <select
                                        id="paymentMethod"
                                        value={paymentMethod}
                                        onChange={(e) => setPaymentMethod(e.target.value)}
                                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-black"
                                    >
                                        <option value="">Select payment method...</option>
                                        <option value="cash">Cash</option>
                                        <option value="card">Credit/Debit Card</option>
                                        <option value="mobile">Mobile Payment</option>
                                        <option value="online">Online Transfer</option>
                                    </select>
                                </div>
                            </div>

                            {/* Additional Notes */}
                            <div>
                                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2 text-black">
                                    Additional Notes
                                </label>
                                <textarea
                                    id="notes"
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    rows={3}
                                    placeholder="Any special notes about this sale..."
                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-black"
                                />
                            </div>

                            {/* Submit Button */}
                            <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                                <a
                                    href="/retailer"
                                    className="px-6 py-3 bg-gray-200 text-gray-700 font-semibold rounded-xl hover:bg-gray-300 transition-colors"
                                >
                                    Cancel
                                </a>
                                <button
                                    type="submit"
                                    disabled={!selectedAsset || quantityToSell <= 0 || initiateTransfer.isPending}
                                    className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold rounded-xl hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center"
                                >
                                    {initiateTransfer.isPending ? (
                                        <>
                                            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Processing Sale...
                                        </>
                                    ) : (
                                        <>
                                            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                                            </svg>
                                            {requireAcceptance && quantityToSell >= selectedProductQtyInView ? 'Initiate Pending Transfer' : 'Initiate Pending Transfer'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>

                    {/* Info Card */}
                    <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-6">
                        <div className="flex items-start">
                            <svg className="w-6 h-6 text-blue-600 mr-3 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <div className="flex-1">
                                <h3 className="text-sm font-semibold text-blue-900 mb-2">Distribution Information</h3>
                                <ul className="text-sm text-blue-800 space-y-1">
                                    <li>• Only manufactured products are available for sale</li>
                                    <li>• You can sell partial quantities - remaining stock stays in your inventory</li>
                                    <li>• Sale records are stored immutably on the blockchain</li>
                                    <li>• Consumers can trace the complete supply chain of their purchase</li>
                                    <li>• Ownership is automatically transferred upon completion</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}

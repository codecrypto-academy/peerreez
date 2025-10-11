'use client';

import { useState } from 'react';
import { PendingTransfer } from '@/types/fabric';
import { useAcceptTransfer, useRejectTransfer } from '@/hooks/usePendingTransfers';

interface PendingTransferCardProps {
    transfer: PendingTransfer;
    onSuccess?: () => void;
}

export function PendingTransferCard({ transfer, onSuccess }: PendingTransferCardProps) {
    const [showRejectDialog, setShowRejectDialog] = useState(false);
    const [rejectReason, setRejectReason] = useState('');

    const acceptTransfer = useAcceptTransfer();
    const rejectTransfer = useRejectTransfer();

    const handleAccept = async () => {
        try {
            await acceptTransfer.mutateAsync({
                transferId: transfer.id,
                assetId: transfer.assetId,
            });
            onSuccess?.();
        } catch (error: unknown) {
            console.error('[PendingTransferCard] Error accepting transfer:', error);
            const message = error instanceof Error ? error.message : String(error);
            alert('Failed to accept transfer: ' + (message || 'Unknown error'));
        }
    };

    const handleReject = async () => {
        if (!rejectReason.trim()) {
            alert('Por favor, ingresa un motivo de rechazo');
            return;
        }

        try {
            await rejectTransfer.mutateAsync({
                transferId: transfer.id,
                reason: rejectReason,
                assetId: transfer.assetId,
            });
            setShowRejectDialog(false);
            setRejectReason('');
            onSuccess?.();
        } catch (error: unknown) {
            console.error('[PendingTransferCard] Error rejecting transfer:', error);
            const message = error instanceof Error ? error.message : String(error);
            alert('Failed to reject transfer: ' + (message || 'Unknown error'));
        }
    };

    const isIncoming = transfer.direction === 'incoming';
    const isOutgoing = transfer.direction === 'outgoing';

    return (
        <div className="border rounded-lg p-4 bg-white shadow-sm hover:shadow-md transition-shadow text-black">
            {/* Header con dirección */}
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    {isIncoming && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            📥 Incoming
                        </span>
                    )}
                    {isOutgoing && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            📤 Outgoing
                        </span>
                    )}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        ⏳ {transfer.status}
                    </span>
                </div>
                <span className="text-xs text-gray-500">
                    {new Date(transfer.initiatedAt).toLocaleString()}
                </span>
            </div>

            {/* Información de la transferencia */}
            <div className="space-y-2">
                <div>
                    <span className="text-sm font-semibold text-gray-700">Asset ID:</span>
                    <span className="ml-2 text-sm text-black font-mono">{transfer.assetId}</span>
                </div>

                <div>
                    <span className="text-sm font-semibold text-gray-700">From:</span>
                    <span className="ml-2 text-sm text-black">{transfer.fromMSP}</span>
                </div>

                <div>
                    <span className="text-sm font-semibold text-gray-700">To:</span>
                    <span className="ml-2 text-sm text-black">{transfer.toMSP}</span>
                </div>

                {transfer.transferData?.reason && (
                    <div>
                        <span className="text-sm font-semibold text-gray-700">Reason:</span>
                        <span className="ml-2 text-sm text-gray-900">{transfer.transferData.reason}</span>
                    </div>
                )}

                {transfer.transferData?.notes && (
                    <div>
                        <span className="text-sm font-semibold text-gray-700">Notes:</span>
                        <span className="ml-2 text-sm text-gray-900">{transfer.transferData.notes}</span>
                    </div>
                )}

                {transfer.transferData?.location && (
                    <div>
                        <span className="text-sm font-semibold text-gray-700">Location:</span>
                        <span className="ml-2 text-sm text-gray-900">{transfer.transferData.location}</span>
                    </div>
                )}
            </div>

            {/* Botones de acción (solo para incoming) */}
            {isIncoming && !showRejectDialog && (
                <div className="mt-4 flex gap-3">
                    <button
                        onClick={handleAccept}
                        disabled={acceptTransfer.isPending}
                        className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                        {acceptTransfer.isPending ? '⏳ Accepting...' : '✅ Accept Transfer'}
                    </button>
                    <button
                        onClick={() => setShowRejectDialog(true)}
                        disabled={rejectTransfer.isPending}
                        className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                        ❌ Reject Transfer
                    </button>
                </div>
            )}

            {/* Dialog de rechazo */}
            {showRejectDialog && (
                <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                    <h4 className="text-sm font-semibold text-red-900 mb-2">
                        Reject Transfer - Reason Required
                    </h4>
                    <textarea
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Explain why you're rejecting this transfer..."
                        className="w-full px-3 py-2 border border-red-300 rounded-md text-sm focus:ring-2 focus:ring-red-500 focus:border-transparent text-black"
                        rows={3}
                    />
                    <div className="mt-3 flex gap-2">
                        <button
                            onClick={handleReject}
                            disabled={rejectTransfer.isPending || !rejectReason.trim()}
                            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
                        >
                            {rejectTransfer.isPending ? '⏳ Rejecting...' : 'Confirm Rejection'}
                        </button>
                        <button
                            onClick={() => {
                                setShowRejectDialog(false);
                                setRejectReason('');
                            }}
                            disabled={rejectTransfer.isPending}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 transition-colors text-sm font-medium"
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            )}

            {/* Información para outgoing transfers */}
            {isOutgoing && (
                <div className="mt-4 p-3 bg-blue-50 rounded-md border border-blue-200">
                    <p className="text-sm text-blue-900">
                        ℹ️ Waiting for <strong>{transfer.toMSP}</strong> to accept or reject this transfer.
                    </p>
                </div>
            )}

            {/* Transfer ID (colapsable) */}
            <details className="mt-3">
                <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                    Transfer ID
                </summary>
                <p className="text-xs text-gray-600 font-mono mt-1 break-all">{transfer.id}</p>
            </details>
        </div>
    );
}

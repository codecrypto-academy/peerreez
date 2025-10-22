"use client";

import React from 'react';
import { useWallet } from './WalletProvider';

export default function CurrentWalletBadge() {
  const { address, isConnected } = useWallet();
  if (!isConnected || !address) return null;

  return (
    <div className="flex items-center space-x-2 bg-white p-2 rounded shadow-sm">
      <div className="w-8 h-8 bg-indigo-100 text-indigo-700 rounded-full flex items-center justify-center font-mono text-sm">{address.slice(2,6)}</div>
      <div className="text-sm text-gray-700">{address}</div>
    </div>
  );
}

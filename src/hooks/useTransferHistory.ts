'use client';

import { useQuery } from '@tanstack/react-query';
import { Asset } from '../types';

interface TransferHistoryAsset extends Asset {
  transferHistory?: Array<{
    assetId: string;
    action: string;
    timestamp: string;
    actor: string;
    previousOwner: string;
    newOwner: string;
    data?: any;
  }>;
}

/**
 * Hook to fetch transfer history - Assets that were transferred BY the current user
 * Uses the new QueryTransferHistory chaincode function
 */
export function useTransferHistory(org: 'producer' | 'factory' | 'retailer' | 'consumer' = 'producer') {
  return useQuery<TransferHistoryAsset[], Error>({
    queryKey: ['transferHistory', org],
    queryFn: async () => {
      const response = await fetch(`/api/fabric/transfer-history?org=${org}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[useTransferHistory] Received ${data.assets?.length || 0} assets for ${org}`);
      return data.assets || [];
    },
    staleTime: 30000, // 30 seconds
    gcTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true,
    refetchOnWindowFocus: false,
  });
}

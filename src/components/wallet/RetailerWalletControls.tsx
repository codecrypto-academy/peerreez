"use client";

import WalletButton from './WalletButton';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export default function RetailerWalletControls() {
  const { user } = useAuth();
  const role = user?.role ?? null;
  const [identities, setIdentities] = useState<Array<any>>([]);
  const panelOrg = 'retailer.supplychain.com';

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch(`/api/fabric/identity/list?org=${panelOrg}`);
        if (!res.ok) return;
        const js = await res.json();
        if (!mounted) return;
        setIdentities(js?.identities || []);
      } catch (e) {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const panelDisabled = role !== 'retailer';

  return (
    <div className="w-full bg-white shadow-sm border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-sm text-gray-600">Retailer Account</p>
        <p className="text-xs text-gray-500">Choose which identity to display for this role</p>
      </div>
      <div>
        <WalletButton panelIdentities={identities} panelOrg={panelOrg} panelDisabled={panelDisabled} />
      </div>
    </div>
  );
}

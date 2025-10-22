"use client";

import React from 'react';
import { useWallet } from './WalletProvider';
import { useAuth } from '@/components/auth/AuthProvider';

type WalletButtonProps = {
  panelIdentities?: Array<{ username?: string; address: string; fingerprint?: string; certFile?: string; cn?: string }>;
  panelOrg?: string;
  panelDisabled?: boolean;
};

function shorten(addr: string) {
  if (addr.startsWith('x509:')) {
    const fp = addr.slice(5);
    return `x509:${fp.slice(0, 6)}...${fp.slice(-6)}`;
  }
  return addr.slice(0, 6) + '...' + addr.slice(-4);
}

export default function WalletButton({ panelIdentities, panelOrg, panelDisabled }: WalletButtonProps) {
  const { address, connect, disconnect, isConnected, assignToRole, setIdentityFromList, availableIdentities: providerIdentities } = useWallet();
  const { user } = useAuth();
  const role = user?.role ?? null;

  const isMapped = (() => {
    if (!role || !address) return false;
    try {
      const mapped = localStorage.getItem(`wallet_for_${role}`);
      return mapped === address;
    } catch (e) {
      return false;
    }
  })();
  const panelIds = panelIdentities ?? providerIdentities;

  // determine what to display when the panel is showing identities for a different org
  let panelRole: string | undefined = undefined;
  if (panelOrg?.includes('producer')) panelRole = 'producer';
  else if (panelOrg?.includes('factory')) panelRole = 'factory';
  else if (panelOrg?.includes('retailer')) panelRole = 'retailer';
  else if (panelOrg?.includes('consumer')) panelRole = 'consumer';

  // when panelDisabled (i.e., user role != panelOrg) we want to display the panel's identity
  let panelDisplayAddress: string | null = null;
  try {
    if (panelDisabled && panelRole) {
      const mapped = localStorage.getItem(`wallet_for_${panelRole}`);
      if (mapped) panelDisplayAddress = mapped;
      else if (panelIds && panelIds.length > 0) panelDisplayAddress = panelIds[0].address;
    }
  } catch (e) {
    // ignore localStorage errors
  }

  return (
    <div className="flex items-center space-x-3 text-black">
      {isConnected && address ? (
        <div className="flex items-center gap-2">
          <div className="px-2 py-1 bg-gray-100 rounded-md text-sm text-black font-mono">{shorten(panelDisabled && panelDisplayAddress ? panelDisplayAddress : address)}</div>
          <button
            onClick={() => disconnect()}
            className="px-3 py-2 rounded-md text-sm font-medium text-black bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors"
          >
            Disconnect
          </button>
          {role && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => { if (!panelDisabled) assignToRole(); }}
                title={isMapped ? 'Already assigned to this role' : 'Assign this wallet to current role'}
                className={`px-3 py-2 rounded-md text-sm font-medium ${isMapped ? 'bg-green-100 text-black' : 'bg-yellow-100 text-black'} border border-gray-200 shadow-sm ${panelDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={panelDisabled}
              >
                {isMapped ? 'Assigned' : 'Assign to role'}
              </button>

              {/* If panelOrg present, show the selector for that panel's identities */}
              {panelOrg && (
                <select
                  className="ml-2 block w-auto min-w-[220px] rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-black shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  value={panelDisabled && panelDisplayAddress ? panelDisplayAddress : (address || '')}
                  onChange={(e) => setIdentityFromList(e.target.value)}
                  disabled={panelDisabled}
                >
                  {/* Use discovered identities if present */}
                  {panelIds && panelIds.length > 0 ? (
                    panelIds.map((id) => {
                      const short = (id.username || id.cn || id.fingerprint).split('@')[0];
                      const displayAddr = id.address;
                      return <option key={id.username || id.address} value={displayAddr} className="text-black">{short} — {shorten(displayAddr)}</option>;
                    })
                  ) : (
                    /* Fallback hard-coded options (Admin/User1/User2) with known addresses */
                    [
                      { k: 'Admin', addr: '0xefe483736859b31df0a00da551f829b047d395bf' },
                      { k: 'User1', addr: '0x07d8ca3cd5760f036027493aca0c703d6c937075' },
                      { k: 'User2', addr: '0x4ea05b6fe3dc4c31717786962197f0deb62311fb' },
                    ].map((o) => <option key={o.k} value={o.addr} className="text-black">{o.k} — {shorten(o.addr)}</option>)
                  )}
                </select>
              )}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={() => connect()}
          className="px-3 py-2 rounded-md text-sm font-medium text-black bg-indigo-300 hover:bg-indigo-200 shadow-sm transition-colors"
        >
          Connect Wallet
        </button>
      )}
    </div>
  );
}

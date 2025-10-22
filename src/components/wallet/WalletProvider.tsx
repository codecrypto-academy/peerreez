"use client";

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export interface WalletContextValue {
  address: string | null;
  connect: () => Promise<void>;
  disconnect: () => void;
  isConnected: boolean;
  assignToRole: () => void; // save current connected address to current role
  setIdentityFromList: (addressOrFingerprint: string) => void; // set mapping to either 0x or x509:... value
  availableIdentities: Array<{ username: string; address: string; fingerprint: string; certFile: string; cn?: string }>;
}

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error('useWallet must be used within WalletProvider');
  return ctx;
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const role = user?.role ?? null;

  const [address, setAddress] = useState<string | null>(null);
  const [availableIdentities, setAvailableIdentities] = useState<Array<{ username: string; address: string; fingerprint: string; certFile: string; cn?: string }>>([]);

  // Small helper to shorten addresses for UI
  const connect = async () => {
    try {
      const anyWin: any = window;
      if (!anyWin.ethereum) {
        // MetaMask not installed
        console.warn('MetaMask not found');
        return;
      }

      const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_requestAccounts' });
      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setAddress(addr);
        // If role present and mapping exists, persist it
        if (role) {
          try { localStorage.setItem(`wallet_for_${role}`, addr); } catch (e) { /* ignore */ }
        }
      }
    } catch (err) {
      console.error('Wallet connect error', err);
    }
  };

  const disconnect = () => {
    // MetaMask does not support programmatic disconnect; clear local state
    setAddress(null);
  };

  useEffect(() => {
    const anyWin: any = window;
    if (!anyWin?.ethereum) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) setAddress(accounts[0]);
      else setAddress(null);
    };

    // On mount, if we have a role mapping, load that wallet; otherwise probe eth_accounts
    (async () => {
      try {
        if (role) {
          const mapped = localStorage.getItem(`wallet_for_${role}`);
          if (mapped) {
            setAddress(mapped);
          } else {
            const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
            if (accounts && accounts.length) setAddress(accounts[0]);
          }
        } else {
          const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
          if (accounts && accounts.length) setAddress(accounts[0]);
        }
      } catch (e) {
        // fallback to eth_accounts
        const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_accounts' }).catch(() => []);
        if (accounts && accounts.length) setAddress(accounts[0]);
      }
    })();

    anyWin.ethereum.on && anyWin.ethereum.on('accountsChanged', handleAccountsChanged);

    return () => {
      try {
        anyWin.ethereum.removeListener && anyWin.ethereum.removeListener('accountsChanged', handleAccountsChanged);
      } catch (e) {
        // ignore
      }
    };
  }, []);

  // react to role changes: when role changes, load wallet mapped to that role if exists
  useEffect(() => {
    if (!role) return;

    (async () => {
      try {
        const mapped = localStorage.getItem(`wallet_for_${role}`);
        if (mapped) {
          setAddress(mapped);
          return;
        }

        if (role === 'producer' || role === 'factory' || role === 'retailer' || role === 'consumer') {
          const org = role === 'producer'
            ? 'producer.supplychain.com'
            : role === 'factory'
              ? 'factory.supplychain.com'
              : role === 'retailer'
                ? 'retailer.supplychain.com'
                : 'consumer.supplychain.com';
          const res = await fetch(`/api/fabric/identity/list?org=${org}`);
          if (!res.ok) {
            setAvailableIdentities([]);
            setAddress(null);
            return;
          }
          const js = await res.json();
          const ids = (js?.identities || []).map((i: any) => ({ username: i.username, address: i.address, fingerprint: i.fingerprint, certFile: i.certFile, cn: i.cn }));
          setAvailableIdentities(ids);
          setAddress(ids.length > 0 ? ids[0].address : null);
        } else {
          setAvailableIdentities([]);
          setAddress(null);
        }
      } catch (e) {
        // ignore and clear
        setAvailableIdentities([]);
        setAddress(null);
      }
    })();
  }, [role]);

  const assignToRole = () => {
    if (!role) return;
    if (!address) return;
    try {
      localStorage.setItem(`wallet_for_${role}`, address);
    } catch (e) {
      // ignore
    }
  };

  const setIdentityFromList = (addressOrFingerprint: string) => {
    if (!role) return;
    try {
      // persist mapping so role will show the chosen identity
      localStorage.setItem(`wallet_for_${role}`, addressOrFingerprint);
      setAddress(addressOrFingerprint);
    } catch (e) {
      // ignore
    }
  };

  const value: WalletContextValue = {
    address,
    connect,
    disconnect,
    isConnected: !!address,
    assignToRole,
    setIdentityFromList,
    availableIdentities,
  };

  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}

export default WalletProvider;

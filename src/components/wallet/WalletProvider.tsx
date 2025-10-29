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

  // Helper to detect admin selectors (username, CN or admin-derived address forms)
  const isAdminSelector = (s?: string) => {
    if (!s) return false;
    const ss = String(s).toLowerCase();
    if (ss.includes('admin@')) return true; // username-like
    if (ss.includes('cn=admin@')) return true; // x509 CN form
    return false;
  };

  // Small helper to shorten addresses for UI
  type EthereumWindow = Window & { ethereum?: { request: (opts: Record<string, unknown>) => Promise<string[]>, on?: (ev: string, cb: (...args: unknown[]) => void) => void, removeListener?: (ev: string, cb: (...args: unknown[]) => void) => void } };

  const connect = async () => {
    try {
      const anyWin = window as EthereumWindow;
      if (!anyWin.ethereum) {
        // MetaMask not installed
        console.warn('MetaMask not found');
        return;
      }

      const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_requestAccounts' } as Record<string, unknown>);
      if (accounts && accounts.length > 0) {
        const addr = accounts[0];
        setAddress(addr);
        // If role present and mapping exists, persist it
        if (role) {
          try {
            if (!isAdminSelector(addr)) {
              localStorage.setItem(`wallet_for_${role}`, addr);
            }
          } catch { /* ignore */ }
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
    const anyWin = window as EthereumWindow;
    if (!anyWin?.ethereum) return;

    // Cleanup any residual admin mappings left in localStorage from previous versions
    try {
      ['producer', 'factory', 'retailer', 'consumer'].forEach(r => {
        const k = `wallet_for_${r}`;
        const v = localStorage.getItem(k);
        if (v && isAdminSelector(v)) {
          try { localStorage.removeItem(k); } catch { /* ignore */ }
        }
      });
    } catch {
      // ignore
    }

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts && accounts.length > 0) setAddress(accounts[0]);
      else setAddress(null);
    };

    // On mount, if we have a role mapping, load that wallet; otherwise probe eth_accounts
    (async () => {
      try {
        if (role) {
          const mapped = localStorage.getItem(`wallet_for_${role}`);
          // Ignore mappings that explicitly point to Admin identities to avoid using admin as default
          if (mapped && !isAdminSelector(mapped)) {
            setAddress(mapped);
            return;
          }

          const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_accounts' } as Record<string, unknown>).catch(() => []);
          if (accounts && accounts.length) setAddress(accounts[0]);
        } else {
          const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_accounts' } as Record<string, unknown>).catch(() => []);
          if (accounts && accounts.length) setAddress(accounts[0]);
        }
      } catch {
        // fallback to eth_accounts
        const accounts: string[] = await anyWin.ethereum.request({ method: 'eth_accounts' } as Record<string, unknown>).catch(() => []);
        if (accounts && accounts.length) setAddress(accounts[0]);
      }
    })();

    anyWin.ethereum.on?.('accountsChanged', handleAccountsChanged);

    return () => {
      try {
        anyWin.ethereum.removeListener?.('accountsChanged', handleAccountsChanged);
      } catch {
        // ignore
      }
    };

  }, [role]);

  // react to role changes: when role changes, load wallet mapped to that role if exists
  useEffect(() => {
    if (!role) return;

    (async () => {
      try {
        // Load any mapping but don't immediately use it; we'll validate against discovered identities
        const mapped = localStorage.getItem(`wallet_for_${role}`);

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
          const raw = (js?.identities || []) as Array<Record<string, unknown>>;
          const ids = raw
            .map((i) => ({ username: String(i.username || ''), address: String(i.address || ''), fingerprint: String(i.fingerprint || ''), certFile: String(i.certFile || ''), cn: i.cn ? String(i.cn) : undefined }))
            // Filter out Admin user entries
            .filter((x) => !(x.username || '').toLowerCase().startsWith('admin@'));
          setAvailableIdentities(ids);
          // Prefer a non-admin identity when defaulting to avoid accidental use of Admin
          const nonAdmin = ids.find(x => x.username && !/^admin$/i.test(x.username));
          const defaultAddr = nonAdmin ? nonAdmin.address : (ids.length > 0 ? ids[0].address : null);

          // Decide whether to honor an existing mapping: only if it doesn't point to Admin and matches a discovered identity
          const mappedVal = mapped;
          const mappedIsValid = (() => {
            if (!mappedVal) return false;
            if (isAdminSelector(mappedVal)) return false;
            try {
              const mv = String(mappedVal);
              if (mv.toLowerCase().startsWith('0x')) {
                const match = raw.find(r => String(r.address || '').toLowerCase() === mv.toLowerCase());
                if (match && (String(match.username || '').toLowerCase().startsWith('admin@'))) return false;
                return !!match;
              }
              // username or CN
              if (mv.toLowerCase().startsWith('admin@')) return false;
              const match = raw.find(r => String(r.username || '').toLowerCase() === mv.toLowerCase() || (r.cn && String(r.cn || '').toLowerCase() === mv.toLowerCase()));
              return !!match;
            } catch {
              return false;
            }
          })();

          if (mappedIsValid) setAddress(mapped as string);
          else setAddress(defaultAddr);
        } else {
          setAvailableIdentities([]);
          setAddress(null);
        }
      } catch {
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
      // Prevent persisting an Admin mapping
      if (!isAdminSelector(address)) {
        localStorage.setItem(`wallet_for_${role}`, address);
      }
    } catch {
      // ignore
    }
  };

  const setIdentityFromList = (addressOrFingerprint: string) => {
    if (!role) return;
    try {
      // prevent saving admin as the chosen identity
      if (!isAdminSelector(addressOrFingerprint)) {
        localStorage.setItem(`wallet_for_${role}`, addressOrFingerprint);
        setAddress(addressOrFingerprint);
      }
    } catch {
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

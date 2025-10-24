"use client";

import WalletButton from './WalletButton';
import React, { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/AuthProvider';

export default function FactoryWalletControls() {
    const { user } = useAuth();
    const role = user?.role ?? null;
    type Identity = { username: string; address: string; fingerprint: string; certFile: string; cn?: string };
    const [identities, setIdentities] = useState<Identity[]>([]);
    const panelOrg = 'factory.supplychain.com';

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const res = await fetch(`/api/fabric/identity/list?org=${panelOrg}`);
                if (!res.ok) return;
                const js = await res.json();
                if (!mounted) return;
                const raw = js?.identities || [];
                setIdentities((raw as any[]).map(i => ({ username: i.username, address: i.address, fingerprint: i.fingerprint, certFile: i.certFile, cn: i.cn })).filter((x) => !(x.username || '').toLowerCase().startsWith('admin@')));
            } catch (e) {
                // ignore
            }
        })();
        return () => { mounted = false; };
    }, []);

    const panelDisabled = role !== 'factory';

    return (
        <div className="w-full bg-white shadow-sm border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-4">
            <div className="flex-1">
                <p className="text-sm text-gray-600">Factory Account</p>
                <p className="text-xs text-gray-500">Choose which identity to display for this role</p>
            </div>
            <div>
                <WalletButton panelIdentities={identities} panelOrg={panelOrg} panelDisabled={panelDisabled} />
            </div>
        </div>
    );
}

"use client";

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';

export default function ClientBodyToggle() {
    const pathname = usePathname();
    const { user } = useAuth();

    useEffect(() => {
        if (typeof document === 'undefined') return;

        // Never apply readonly mode on the root path
        if (pathname === '/' || pathname === '') {
            try { document.body.removeAttribute('data-role-readonly'); } catch (e) { }
            return;
        }

        const role = user?.role;
        if (!role) {
            try { document.body.removeAttribute('data-role-readonly'); } catch (e) { }
            return;
        }

        // Map role names to route prefixes (handle manufacturer vs factory naming)
        const roleToRoute: Record<string, string> = {
            producer: '/producer',
            manufacturer: '/factory',
            factory: '/factory',
            retailer: '/retailer',
            consumer: '/consumer',
        };

        const ownerPrefix = roleToRoute[role] || `/${role}`;
        const onOwnerPath = pathname?.startsWith(ownerPrefix);

        if (!onOwnerPath) {
            try {
                document.body.setAttribute('data-role-readonly', String(role));
            } catch (e) { }
        } else {
            try { document.body.removeAttribute('data-role-readonly'); } catch (e) { }
        }

        return () => {
            try { document.body.removeAttribute('data-role-readonly'); } catch (e) { }
        };
    }, [pathname, user?.role]);

    return null;
}

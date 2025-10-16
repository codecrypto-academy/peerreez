"use client";

import { useEffect } from 'react';
import { useUser } from './RoleGuard';

export default function SetRoleCookie() {
    const user = useUser();

    useEffect(() => {
        if (!user) return;

        try {
            // Write a simple cookie for demo flows so API can infer role
            document.cookie = `userRole=${user.role}; path=/; samesite=lax`;
        } catch {
            // ignore in non-browser or restricted environments
        }
    }, [user]);

    return null;
}

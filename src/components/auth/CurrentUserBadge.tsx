"use client";

import React from "react";
import { useAuth } from "./AuthProvider";

export default function CurrentUserBadge() {
    const { user, logout } = useAuth();
    const displayName = user?.name ? user.name.replace(/^Demo\s+/i, '') : '';

    return (
        <div className="flex items-center space-x-3 bg-white p-2 rounded shadow-sm">
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-700 font-semibold">{user?.name?.charAt(0) || 'U'}</div>
            <div>
                <div className="text-sm font-medium text-black">{displayName}</div>
                <div className="text-xs text-black/80">{user?.role}</div>
            </div>

            <div className="ml-4">
                <span
                    role="button"
                    tabIndex={0}
                    onClick={() => logout()}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); logout(); } }}
                    className="text-sm text-black/80 hover:underline cursor-pointer"
                >
                    Logout
                </span>
            </div>
        </div>
    );
}

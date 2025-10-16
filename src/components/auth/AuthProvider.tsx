"use client";

import React, { createContext, useContext, useEffect, useState } from "react";

export type Role = "producer" | "factory" | "retailer" | "consumer";

export interface User {
    id: string;
    name: string;
    role: Role;
}

interface AuthContextValue {
    user: User | null;
    login: (role: Role) => void;
    logout: () => void;
    setUser: (u: User | null) => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const LOCAL_KEY = "scd_demo_user";

const defaultUser: User = {
    id: "user-producer",
    name: "Producer",
    role: "producer",
};

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<User | null>(null);

    useEffect(() => {
        try {
            const raw = localStorage.getItem(LOCAL_KEY);
            if (raw) {
                setUser(JSON.parse(raw) as User);
                return;
            }
        } catch {
            // ignore
        }

        // Initialize with default user if none present
        setUser(defaultUser);
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(defaultUser));
        } catch {
            // ignore
        }
    }, []);

    const login = (role: Role) => {
        const u: User = {
            id: `user-${role}`,
            name: `${role.charAt(0).toUpperCase() + role.slice(1)}`,
            role,
        };
        setUser(u);
        try {
            localStorage.setItem(LOCAL_KEY, JSON.stringify(u));
        } catch {
            // ignore
        }
    };

    const logout = () => {
        // For this demo keep a default user logged always; logout will clear and re-add default
        setUser(null);
        try {
            localStorage.removeItem(LOCAL_KEY);
        } catch {
            // ignore
        }
        // Immediately set default back (requirement: always someone logged)
        setTimeout(() => {
            setUser(defaultUser);
            try {
                    localStorage.setItem(LOCAL_KEY, JSON.stringify(defaultUser));
                } catch { }
        }, 200);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, setUser }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error("useAuth must be used within AuthProvider");
    return ctx;
}

export default AuthProvider;

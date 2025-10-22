"use client";

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRef } from 'react';
import { createPortal } from 'react-dom';
import LoginForm from '@/components/auth/LoginForm';
import { useAuth } from '@/components/auth/AuthProvider';
import WalletButton from '@/components/wallet/WalletButton';

export default function Header() {
    const [showLogin, setShowLogin] = useState(false);
    const { user } = useAuth();

    const portalRoot = useRef<HTMLElement | null>(null);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        portalRoot.current = document.body;
    }, []);

    useEffect(() => {
        if (showLogin) {
            // lock scroll
            const original = document.body.style.overflow;
            document.body.style.overflow = 'hidden';

            const onKey = (e: KeyboardEvent) => {
                if (e.key === 'Escape') setShowLogin(false);
            };
            window.addEventListener('keydown', onKey);

            return () => {
                document.body.style.overflow = original;
                window.removeEventListener('keydown', onKey);
            };
        }
        return;
    }, [showLogin]);

    return (
        <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-50">
            <div className="container mx-auto px-6">
                <div className="flex items-center justify-between h-16 relative">
                    {/* Logo */}
                    <div className="flex items-center">
                        <Link href="/" className="flex items-center space-x-3 hover:opacity-80 transition-opacity">
                            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-gray-900">SupplyChain DApp</h1>
                                <p className="text-xs text-gray-500">Hyperledger Fabric</p>
                            </div>
                        </Link>
                    </div>

                    {/* Navigation */}
                    <nav className="hidden md:flex items-center space-x-1">
                        <Link
                            href="/producer"
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-all duration-200"
                        >
                            <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-lg">🌱</span>
                            </div>
                            Producer
                        </Link>

                        <Link
                            href="/factory"
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-all duration-200"
                        >
                            <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-lg">🏭</span>
                            </div>
                            Factory
                        </Link>

                        <Link
                            href="/retailer"
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-all duration-200"
                        >
                            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-lg">🏪</span>
                            </div>
                            Retailer
                        </Link>

                        <Link
                            href="/consumer"
                            className="flex items-center px-4 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all duration-200"
                        >
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                                <span className="text-lg">👤</span>
                            </div>
                            Consumer
                        </Link>
                    </nav>

                    {/* Right area: user badge + login popover */}
                    <div className="flex items-center space-x-4">
                        <div className="hidden lg:block">
                            <div className="px-3 py-1 bg-gray-100 rounded-lg">
                                <span className="text-xs text-gray-600">Network: supply-chain</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            {/* WalletButton removed from header to hide account info */}
                            <div className="relative">
                                <div className="flex items-center gap-3">
                                    <div className="px-2 py-1 bg-gray-100 rounded-full text-sm text-gray-800">{user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Guest'}</div>
                                    <button
                                        onClick={() => setShowLogin((s) => !s)}
                                        aria-expanded={showLogin}
                                        aria-haspopup="dialog"
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-full text-sm font-medium text-black bg-white border border-gray-200 shadow-sm hover:bg-gray-50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m0-4a4 4 0 100-8 4 4 0 000 8z" />
                                        </svg>
                                        <span>Cambiar rol</span>
                                    </button>
                                </div>

                                {showLogin && portalRoot.current && createPortal(
                                    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
                                        {/* Backdrop: click to close */}
                                        <div
                                            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                            onClick={() => setShowLogin(false)}
                                        />

                                        {/* Modal container */}
                                        <div
                                            role="dialog"
                                            aria-modal="true"
                                            className="relative z-[10000] w-full max-w-lg px-4 allow-interaction"
                                        >
                                            <div className="transform transition-all duration-150 scale-100">
                                                <LoginForm onClose={() => setShowLogin(false)} />
                                            </div>
                                        </div>
                                    </div>,
                                    portalRoot.current,
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Mobile Menu Button */}
                    <button className="md:hidden p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                        </svg>
                    </button>
                </div>

                {/* Mobile Navigation */}
                <div className="md:hidden border-t border-gray-200 py-4">
                    <div className="grid grid-cols-2 gap-2">
                        <Link
                            href="/producer"
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                            <span className="text-lg mr-2">🌱</span>
                            Producer
                        </Link>

                        <Link
                            href="/factory"
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                        >
                            <span className="text-lg mr-2">🏭</span>
                            Factory
                        </Link>

                        <Link
                            href="/retailer"
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        >
                            <span className="text-lg mr-2">🏪</span>
                            Retailer
                        </Link>

                        <Link
                            href="/consumer"
                            className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        >
                            <span className="text-lg mr-2">👤</span>
                            Consumer
                        </Link>
                    </div>

                    {/* Mobile Status */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                                <span className="text-sm text-gray-600">Fabric Connected</span>
                            </div>
                            <div className="text-xs text-gray-500">supply-chain network</div>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
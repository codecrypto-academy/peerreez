import Header from './Header';
import ClientBodyToggle from './ClientBodyToggle';

interface LayoutProps {
    children: React.ReactNode;
    title?: string;
    description?: string;
}

export default function Layout({ children, title, description }: LayoutProps) {
    return (
        <div className="min-h-screen bg-gray-50">
            <Header />

            {/* Page Title Section */}
            {title && (
                <div className="bg-white border-b border-gray-200">
                    <div className="container mx-auto px-6 py-6">
                        <div className="flex items-center justify-between">
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
                                {description && (
                                    <p className="text-gray-600 mt-1">{description}</p>
                                )}
                            </div>

                            {/* Breadcrumb placeholder */}
                            <nav className="hidden md:flex items-center space-x-2 text-sm text-gray-500">
                                <span>Home</span>
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                                <span className="text-gray-900">{title}</span>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <main className="flex-1">
                {children}
            </main>

            {/* Toggle body attribute to disable clicks on buttons/links when Producer is viewing non-producer pages */}
            {/* This runs on client only; keep minimal to avoid SSR issues */}
            {/* eslint-disable-next-line react-hooks/rules-of-hooks */}
            <ClientBodyToggle />

            {/* Footer */}
            <footer className="bg-white border-t border-gray-200 mt-16">
                <div className="container mx-auto px-6 py-8">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
                        <div>
                            <div className="flex items-center space-x-2 mb-4">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-green-500 rounded-lg flex items-center justify-center">
                                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                                    </svg>
                                </div>
                                <span className="font-bold text-gray-900">SupplyChain DApp</span>
                            </div>
                            <p className="text-gray-600 text-sm">
                                Blockchain-powered supply chain traceability using Hyperledger Fabric.
                            </p>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">Roles</h3>
                            <ul className="space-y-2 text-sm">
                                <li><a href="/producer" className="text-gray-600 hover:text-green-600 transition-colors">🌱 Producer</a></li>
                                <li><a href="/factory" className="text-gray-600 hover:text-orange-600 transition-colors">🏭 Factory</a></li>
                                <li><a href="/retailer" className="text-gray-600 hover:text-purple-600 transition-colors">🏪 Retailer</a></li>
                                <li><a href="/consumer" className="text-gray-600 hover:text-blue-600 transition-colors">👤 Consumer</a></li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">Technology</h3>
                            <ul className="space-y-2 text-sm text-gray-600">
                                <li>Hyperledger Fabric 2.5</li>
                                <li>TypeScript Chaincode</li>
                                <li>Next.js 15 Frontend</li>
                                <li>TailwindCSS Design</li>
                            </ul>
                        </div>

                        <div>
                            <h3 className="font-semibold text-gray-900 mb-4">Network Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-600">Network: Online</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-gray-600">Peers: 4 Active</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                                    <span className="text-gray-600">Channel: supply-chain</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 mt-8 pt-8 text-center">
                        <p className="text-gray-500 text-sm">
                            © 2025 SupplyChain DApp. Built with Hyperledger Fabric & Next.js
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
}
import Link from "next/link";
import Layout from "../components/layout/Layout";

export default function Home() {
  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        {/* Hero Section */}
        <section className="container mx-auto px-6 py-16">
          <div className="text-center mb-16">
            <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium mb-6">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              Powered by Hyperledger Fabric 2.5
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
              Supply Chain
              <span className="bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent"> Traceability</span>
            </h1>

            <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-8 leading-relaxed">
              Complete transparency from farm to table. Track every step of your product's journey
              with blockchain-powered verification and immutable records.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link
                href="/producer"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-8 py-4 rounded-xl hover:from-blue-700 hover:to-indigo-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl font-semibold text-lg flex items-center"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Start Journey
              </Link>

              <Link
                href="/consumer/trace"
                className="bg-white text-gray-700 px-8 py-4 rounded-xl hover:bg-gray-50 border-2 border-gray-200 hover:border-gray-300 transition-all duration-200 font-semibold text-lg flex items-center"
              >
                <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Trace Product
              </Link>
            </div>
          </div>

          {/* Supply Chain Flow */}
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Supply Chain Flow</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Producer */}
              <Link
                href="/producer"
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">🌱</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Producer</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Register raw materials and begin the supply chain with complete origin tracking
                  </p>
                  <div className="mt-4 text-green-600 font-medium text-sm">
                    → Register Materials
                  </div>
                </div>
              </Link>

              {/* Factory */}
              <Link
                href="/factory"
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-orange-400 to-red-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">🏭</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Factory</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Transform raw materials into finished products with quality control
                  </p>
                  <div className="mt-4 text-orange-600 font-medium text-sm">
                    → Process & Transform
                  </div>
                </div>
              </Link>

              {/* Retailer */}
              <Link
                href="/retailer"
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-purple-400 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">🏪</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Retailer</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Distribute products to consumers with inventory management
                  </p>
                  <div className="mt-4 text-purple-600 font-medium text-sm">
                    → Sell to Consumers
                  </div>
                </div>
              </Link>

              {/* Consumer */}
              <Link
                href="/consumer"
                className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-8 hover:shadow-2xl transform hover:scale-105 transition-all duration-300 group"
              >
                <div className="text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                    <span className="text-3xl">👤</span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 mb-3">Consumer</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    Trace complete product history and verify authenticity
                  </p>
                  <div className="mt-4 text-blue-600 font-medium text-sm">
                    → Verify & Trace
                  </div>
                </div>
              </Link>
            </div>
          </div>

          {/* Features */}
          <div className="mt-24">
            <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">Blockchain Features</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center p-8">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Immutable Records</h3>
                <p className="text-gray-600">
                  Every transaction is permanently recorded on the blockchain, ensuring complete data integrity.
                </p>
              </div>

              <div className="text-center p-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Full Traceability</h3>
                <p className="text-gray-600">
                  Track products from origin to final destination with complete transparency.
                </p>
              </div>

              <div className="text-center p-8">
                <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                  <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-3">Role-Based Access</h3>
                <p className="text-gray-600">
                  Secure permissions ensure each participant can only perform authorized actions.
                </p>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}

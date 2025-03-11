import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-white">
      <div className="container mx-auto p-4">
        <h1 className="text-3xl font-bold mb-6 text-white">Ethereum Tools</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link href="/faucet" className="p-4 bg-blue-100 rounded-lg hover:bg-blue-200 transition-colors">
            <h2 className="text-xl font-semibold text-black">Faucet</h2>
            <p className="text-black">Get test ETH from the faucet</p>
          </Link>
          <Link href="/transfer" className="p-4 bg-green-100 rounded-lg hover:bg-green-200 transition-colors">
            <h2 className="text-xl font-semibold text-black">Transfer</h2>
            <p className="text-black">Transfer ETH between accounts</p>
          </Link>
          <Link href="/balance" className="p-4 bg-purple-100 rounded-lg hover:bg-purple-200 transition-colors">
            <h2 className="text-xl font-semibold text-black">Balance</h2>
            <p className="text-black">Check account balance</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
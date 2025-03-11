'use client'

import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { metaMask } from 'wagmi/connectors';

export default function Header() {
  const { address } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();

  const connectWallet = async () => {
    try {
      await connect({ connector: metaMask() });
    } catch (error) {
      console.error('Failed to connect:', error);
    }
  };

  const disconnectWallet = () => {
    disconnect();
  };

  return (
    <header className="bg-gray-800 text-white">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <nav className="flex items-center space-x-4">
          <Link href="/">
            <Button variant="ghost" className="text-white hover:text-gray-300">Home</Button>
          </Link>
          <Link href="/faucet">
            <Button variant="ghost" className="text-white hover:text-gray-300">Faucet</Button>
          </Link>
          <Link href="/balance">
            <Button variant="ghost" className="text-white hover:text-gray-300">Balance</Button>
          </Link>
          <Link href="/transfer">
            <Button variant="ghost" className="text-white hover:text-gray-300">Transfer</Button>
          </Link>
        </nav>
        <div>
          {address ? (
            <Button 
              onClick={disconnectWallet}
              variant="outline"
              className="text-white border-white hover:bg-gray-700"
            >
              Disconnect {address.substring(0, 6)}...{address.substring(38)}
            </Button>
          ) : (
            <Button 
              onClick={connectWallet}
              variant="outline"
              className="text-white border-white hover:bg-gray-700"
            >
              Connect Wallet
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
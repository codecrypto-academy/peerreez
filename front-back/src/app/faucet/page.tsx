'use client'

import { useState } from 'react';
import { useAccount } from 'wagmi';

export default function Faucet() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const { address } = useAccount();

  const handleRequestEth = async () => {
    setLoading(true);
    setError('');
    setSuccess('');

    try {
      if (!address) {
        throw new Error('Por favor, conecta tu wallet primero');
      }

      const response = await fetch('/api/faucet', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ recipientAddress: address }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error);
      }

      setSuccess(`Transacción exitosa! Se enviaron ${data.amount} desde ${data.from} a tu dirección. Hash: ${data.hash}`);
    } catch (err) {
      setError('Error: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Faucet ETH Local</h1>
      
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-6">
        {address ? (
          <div>
            <div className="mb-4">
              <p className="text-sm text-gray-600">Wallet conectada:</p>
              <p className="font-mono break-all">{address}</p>
            </div>
            
            <button
              onClick={handleRequestEth}
              disabled={loading}
              className={`w-full ${
                loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'
              } text-white py-2 px-4 rounded-md transition-colors`}
            >
              {loading ? 'Procesando...' : 'Solicitar 1 ETH'}
            </button>
          </div>
        ) : (
          <p className="text-center text-gray-600">
            Por favor, conecta tu wallet usando el botón en el header
          </p>
        )}

        {error && (
          <div className="mt-4 p-3 bg-red-100 text-red-700 rounded-md">
            {error}
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 bg-green-100 text-green-700 rounded-md break-all">
            {success}
          </div>
        )}
      </div>

      <div className="mt-8 max-w-md mx-auto">
        <h2 className="text-xl font-semibold mb-3">Información de la Red Local</h2>
        <div className="bg-gray-100 p-4 rounded-lg">
          <p className="mb-2">
            <span className="font-medium">RPC URL:</span> http://localhost:8888
          </p>
        </div>
      </div>
    </div>
  );
} 
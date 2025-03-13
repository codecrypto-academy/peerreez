'use client'

import { useState } from 'react'

export default function Balance() {
  const [address, setAddress] = useState('')
  const [balance, setBalance] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const response = await fetch(`/api/balance?address=${address}`)
      const data = await response.json()
      setBalance(data.balance)
    } catch (error) {
      console.error('Error al obtener el balance:', error)
      setBalance(null)
    }
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Consulta de Balance ETH</h1>
      
      <form onSubmit={handleSubmit} className="mb-4">
        <div className="flex flex-col gap-4">
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Introduce la dirección ETH"
            className="p-2 border rounded-md w-full"
          />
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600"
          >
            Consultar Balance
          </button>
        </div>
      </form>

      {balance !== null && (
        <div className="mt-4">
          <h2 className="text-xl font-semibold">Balance:</h2>
          <p className="text-lg">{balance} ETH</p>
        </div>
      )}
    </div>
  );
} 
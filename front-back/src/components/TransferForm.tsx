'use client'

import { useState } from 'react'
import { ethers } from 'ethers'

export default function TransferForm() {
  const [destinationAddress, setDestinationAddress] = useState('')
  const [amount, setAmount] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStatus('Procesando...')

    try {
      // Verificar si MetaMask está instalado
      if (!window.ethereum) {
        throw new Error('Por favor, instala MetaMask')
      }

      // Solicitar acceso a la cuenta
      const accounts = await window.ethereum.request({ 
        method: 'eth_requestAccounts' 
      })
      
      const fromAddress = accounts[0]

      // Crear provider y signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()
      
      // Enviar la transacción directamente
      const tx = await signer.sendTransaction({
        to: destinationAddress,
        value: ethers.parseEther(amount),
      })

      // Esperar a que la transacción sea minada
      const receipt = await tx.wait()

      if (receipt) {
        setStatus(`Transacción completada con éxito. Hash: ${receipt.hash}`)
      } else {
        setStatus('Transacción enviada pero no se pudo obtener el hash')
      }
      
      // Limpiar el formulario
      setDestinationAddress('')
      setAmount('')
      setDescription('')

    } catch (error: any) {
      console.error('Error:', error)
      setStatus(`Error: ${error.message}`)
    }
  }

  const isError = status.toLowerCase().includes('error')

  return (
    <div className="max-w-md mx-auto p-6 bg-white rounded-xl shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6">Transferir ETH</h2>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="destinationAddress" className="block text-sm font-semibold text-gray-700 mb-2">
            Dirección de destino
          </label>
          <input
            type="text"
            id="destinationAddress"
            value={destinationAddress}
            onChange={(e) => setDestinationAddress(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
            required
          />
        </div>

        <div>
          <label htmlFor="amount" className="block text-sm font-semibold text-gray-700 mb-2">
            Cantidad (ETH)
          </label>
          <input
            type="number"
            id="amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.000000000000000001"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-gray-700 mb-2">
            Descripción
          </label>
          <input
            type="text"
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors text-gray-900"
          />
        </div>

        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Enviar ETH
        </button>

        {status && (
          <div
            className={`mt-4 p-4 rounded-lg break-words ${
              isError 
                ? 'bg-red-50 text-red-700 border border-red-200' 
                : 'bg-green-50 text-green-700 border border-green-200'
            }`}
          >
            <div className="text-sm break-all">
              {status}
            </div>
          </div>
        )}
      </form>
    </div>
  )
} 
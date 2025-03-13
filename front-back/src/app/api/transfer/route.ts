import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { ethers } from 'ethers'

// Configuración de la red Sepolia
const SEPOLIA_RPC_URL = process.env.SEPOLIA_RPC_URL || "https://sepolia.infura.io/v3/b02d687800a0479e9d783b40c80dea43"
const PRIVATE_KEY = process.env.PRIVATE_KEY || ""

export async function POST(request: Request) {
  try {
    // Verificar la sesión del usuario
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    // Obtener datos del cuerpo de la petición
    const { fromAddress, destinationAddress, amount, description } = await request.json()

    // Validar los datos
    if (!fromAddress || !destinationAddress || !amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Datos inválidos' },
        { status: 400 }
      )
    }

    // Validar que las direcciones ETH sean válidas
    if (!ethers.isAddress(destinationAddress) || !ethers.isAddress(fromAddress)) {
      return NextResponse.json(
        { error: 'Dirección ETH inválida' },
        { status: 400 }
      )
    }

    // Solo preparamos los datos de la transacción para el frontend
    const transactionRequest = {
      to: destinationAddress,
      from: fromAddress,
      value: ethers.parseEther(amount.toString()),
      data: '0x'
    }

    return NextResponse.json({
      message: 'Transacción lista para ser ejecutada',
      transactionRequest
    })

  } catch (error) {
    console.error('Error al preparar la transacción:', error)
    return NextResponse.json(
      { error: 'Error al preparar la transacción' },
      { status: 500 }
    )
  }
} 
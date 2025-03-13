import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      )
    }

    const { 
      hash, 
      fromAddress, 
      toAddress, 
      amount, 
      description, 
      gasUsed, 
      blockNumber 
    } = await request.json()

    const transaction = await prisma.transaction.create({
      data: {
        hash,
        amount: Number(amount),
        description: description || 'Transferencia ETH',
        fromAddress,
        toAddress,
        type: 'ETH_TRANSFER',
        status: 'COMPLETED',
        networkName: 'sepolia',
        gasUsed,
        blockNumber,
        date: new Date()
      }
    })

    return NextResponse.json({
      message: 'Transacción registrada con éxito',
      transaction
    })

  } catch (error) {
    console.error('Error al confirmar la transacción:', error)
    return NextResponse.json(
      { error: 'Error al registrar la transacción' },
      { status: 500 }
    )
  }
} 
import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { ethers } from 'ethers';

export async function POST(request: Request) {
  try {
    const { recipientAddress } = await request.json();

    // Leer la clave privada y la dirección del faucet desde los archivos
    const privateKeyPath = '../../web2.5-faucet-besu/nodo/networks/besu-network/bootnode/key.priv';
    const addressPath = '../../web2.5-faucet-besu/nodo/networks/besu-network/bootnode/address';

    const privateKey = await fs.readFile(path.join(process.cwd(), privateKeyPath), 'utf-8');
    const faucetAddress = await fs.readFile(path.join(process.cwd(), addressPath), 'utf-8');

    // Crear el provider y el wallet del faucet
    const provider = new ethers.JsonRpcProvider('http://localhost:8888');
    const faucetWallet = new ethers.Wallet(`0x${privateKey.trim()}`, provider);

    console.log('Faucet address:', `0x${faucetAddress.trim()}`);
    console.log('Sending ETH to:', recipientAddress);

    // Enviar 1 ETH al recipiente
    const transaction = await faucetWallet.sendTransaction({
      to: recipientAddress,
      value: ethers.parseEther('1.0')
    });

    const receipt = await transaction.wait();

    if (!receipt) {
      throw new Error('No se recibió confirmación de la transacción');
    }

    return NextResponse.json({ 
      success: true, 
      hash: receipt.hash,
      from: `0x${faucetAddress.trim()}`,
      to: recipientAddress,
      amount: '1 ETH'
    });
    
  } catch (error) {
    console.error('Error en el faucet:', error);
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
} 
import { NextResponse } from 'next/server';
import { ethers } from 'ethers';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const address = searchParams.get('address');
    const selectedNetwork = searchParams.get('network') || 'local';

    if (!address || !ethers.isAddress(address)) {
      return NextResponse.json(
        { error: 'Dirección de Ethereum no válida o no proporcionada' },
        { status: 400 }
      );
    }

    console.log("Network:", selectedNetwork);

    const INFURA_API_KEY = process.env.INFURA_API_KEY;
    const LOCAL_RPC_URL = process.env.LOCAL_RPC_URL;

    // Configuración de los RPC URLs para diferentes redes
    const networkConfigs: { [key: string]: string } = {
      sepolia: `https://sepolia.infura.io/v3/${INFURA_API_KEY}`,
      local: LOCAL_RPC_URL || 'http://localhost:8888'
    };

    // Verificar si la red seleccionada está soportada
    if (!networkConfigs[selectedNetwork]) {
      return NextResponse.json(
        { error: 'Red no soportada' },
        { status: 400 }
      );
    }

    const ethProvider = new ethers.JsonRpcProvider(networkConfigs[selectedNetwork]);

    const balanceWei = await ethProvider.getBalance(address);
    const balanceEth = ethers.formatEther(balanceWei);

    return NextResponse.json({ 
      balance: balanceEth, 
      network: selectedNetwork,
      networkUrl: networkConfigs[selectedNetwork]
    });

  } catch (error: any) {
    if (error.code === 'NETWORK_ERROR') {
      return NextResponse.json(
        { error: 'No se pudo conectar con la red Ethereum' },
        { status: 503 }
      );
    }
    console.error('Error inesperado:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

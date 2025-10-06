import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { Role } from '../../../../types/fabric';

const execAsync = promisify(exec);

// Mapeo de roles a MSP IDs y puertos
const ROLE_CONFIG = {
  producer: { msp: 'ProducerMSP', port: '7051', org: 'producer' },
  factory: { msp: 'FactoryMSP', port: '8051', org: 'factory' },
  retailer: { msp: 'RetailerMSP', port: '9051', org: 'retailer' },
  consumer: { msp: 'ConsumerMSP', port: '10051', org: 'consumer' }
};

// Función para ejecutar comandos de chaincode a través del CLI de Docker
async function executeFabricCommand(role: Role, operation: string, ...args: string[]): Promise<any> {
  const config = ROLE_CONFIG[role];
  if (!config) {
    throw new Error(`Invalid role: ${role}`);
  }

  // Construir comando para el contenedor CLI
  const baseEnvVars = [
    'export CORE_PEER_TLS_ENABLED=true',
    `export CORE_PEER_LOCALMSPID=${config.msp}`,
    `export CORE_PEER_ADDRESS=peer0.${config.org}.supplychain.com:${config.port}`,
    `export CORE_PEER_TLS_ROOTCERT_FILE=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${config.org}.supplychain.com/peers/peer0.${config.org}.supplychain.com/tls/ca.crt`,
    `export CORE_PEER_MSPCONFIGPATH=/opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${config.org}.supplychain.com/users/Admin@${config.org}.supplychain.com/msp`
  ].join(' && ');

  let chaincodeCommand: string;

  if (operation === 'query') {
    // Usar la sintaxis exacta que funciona manualmente con escape JSON correcto
    const func = args[0];
    const funcArgs = args.slice(1);

    if (funcArgs.length === 0) {
      chaincodeCommand = `peer chaincode query -C supply-chain-channel -n supply-chain-chaincode -c "{\\"function\\":\\"${func}\\",\\"args\\":[]}"`;
    } else {
      const argsStr = funcArgs.map(arg => `\\"${arg}\\"`).join(',');
      chaincodeCommand = `peer chaincode query -C supply-chain-channel -n supply-chain-chaincode -c "{\\"function\\":\\"${func}\\",\\"args\\":[${argsStr}]}"`;
    }
  } else if (operation === 'invoke') {
    // Usar la sintaxis exacta que funciona manualmente con escape JSON correcto
    const func = args[0];
    const funcArgs = args.slice(1);

    let jsonCall;
    if (funcArgs.length === 0) {
      jsonCall = `"{\\"function\\":\\"${func}\\",\\"Args\\":[]}"`;
    } else {
      // Escapar correctamente las cadenas JSON anidadas
      const escapedArgs = funcArgs.map(arg => {
        // Si el argumento es un objeto JSON, escaparlo correctamente
        if (typeof arg === 'string' && (arg.startsWith('{') || arg.startsWith('['))) {
          return arg.replace(/"/g, '\\\\\\"');
        }
        return arg;
      });
      const argsStr = escapedArgs.map(arg => `\\"${arg}\\"`).join(',');
      jsonCall = `"{\\"function\\":\\"${func}\\",\\"Args\\":[${argsStr}]}"`;
    }

    chaincodeCommand = `peer chaincode invoke -o orderer.supplychain.com:7050 --ordererTLSHostnameOverride orderer.supplychain.com --tls --cafile /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/ordererOrganizations/supplychain.com/orderers/orderer.supplychain.com/msp/tlscacerts/tlsca.supplychain.com-cert.pem -C supply-chain-channel -n supply-chain-chaincode --peerAddresses peer0.${config.org}.supplychain.com:${config.port} --tlsRootCertFiles /opt/gopath/src/github.com/hyperledger/fabric/peer/crypto/peerOrganizations/${config.org}.supplychain.com/peers/peer0.${config.org}.supplychain.com/tls/ca.crt -c ${jsonCall}`;
  } else {
    throw new Error(`Invalid operation: ${operation}`);
  }

  const fullCommand = `docker exec -i cli bash -c '${baseEnvVars} && ${chaincodeCommand}'`;

  try {
    const { stdout, stderr } = await execAsync(fullCommand, {
      timeout: 30000, // 30 segundos timeout
      maxBuffer: 1024 * 1024 // 1MB buffer
    });

    if (stderr && stderr.includes('Error:')) {
      throw new Error(stderr);
    }

    // Intentar parsear como JSON, si falla devolver como string
    try {
      return JSON.parse(stdout.trim());
    } catch {
      return stdout.trim();
    }
  } catch (error: any) {
    console.error('Fabric command error:', error);
    throw new Error(`Chaincode execution failed: ${error.message}`);
  }
}

// API Route para operaciones especiales usando comandos CLI directos
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { operation, role } = body;

    if (!role || !ROLE_CONFIG[role]) {
      return NextResponse.json({
        success: false,
        error: 'Valid role is required'
      }, { status: 400 });
    }

    let result;

    switch (operation) {
      case 'transform':
        const { rawMaterialIds, newAssetId, productData } = body;
        if (!rawMaterialIds || !newAssetId || !productData) {
          return NextResponse.json({
            success: false,
            error: 'rawMaterialIds, newAssetId and productData are required'
          }, { status: 400 });
        }

        result = await executeFabricCommand(
          role,
          'invoke',
          'TransformAsset',
          JSON.stringify(rawMaterialIds),
          newAssetId,
          JSON.stringify(productData)
        );

        return NextResponse.json({
          success: true,
          data: result
        });

      case 'getHistory':
        const { assetId } = body;
        if (!assetId) {
          return NextResponse.json({
            success: false,
            error: 'assetId is required'
          }, { status: 400 });
        }

        result = await executeFabricCommand(role, 'query', 'GetAssetHistory', assetId);

        return NextResponse.json({
          success: true,
          data: typeof result === 'string' ? JSON.parse(result) : result
        });

      case 'getTrace':
        const { traceAssetId } = body;
        if (!traceAssetId) {
          return NextResponse.json({
            success: false,
            error: 'assetId is required'
          }, { status: 400 });
        }

        result = await executeFabricCommand(role, 'query', 'GetSupplyChainTrace', traceAssetId);

        return NextResponse.json({
          success: true,
          data: typeof result === 'string' ? JSON.parse(result) : result
        });

      case 'initLedger':
        result = await executeFabricCommand(role, 'invoke', 'InitLedger');

        return NextResponse.json({
          success: true,
          data: result
        });

      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid operation. Supported: transform, getHistory, getTrace, initLedger'
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'Internal server error'
    }, { status: 500 });
  }
}
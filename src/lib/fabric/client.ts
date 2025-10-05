import { Gateway, Network, Contract, Wallets } from 'fabric-network';
import * as fs from 'fs';
import * as path from 'path';
import {
    FabricUser,
    TransactionResult,
    Role,
    FabricError
} from '../../types/fabric';

export class FabricClient {
    private gateway: Gateway | null = null;
    private network: Network | null = null;
    private contract: Contract | null = null;
    private currentUser: FabricUser | null = null;

    constructor() {
        this.gateway = new Gateway();
    }

    /**
     * Connect to the Hyperledger Fabric network
     */
    async connect(userRole: Role): Promise<void> {
        try {
            // Connection profile path (adjust according to your network setup)
            const networkConfigPath = this.getConnectionProfilePath();
            const connectionProfile = JSON.parse(fs.readFileSync(networkConfigPath, 'utf8'));

            // Wallet setup
            const walletPath = this.getWalletPath();
            const wallet = await Wallets.newFileSystemWallet(walletPath);

            // User identity
            const userId = this.getUserId(userRole);

            // Check if user exists in wallet
            const identity = await wallet.get(userId);
            if (!identity) {
                throw new FabricError({
                    message: `User identity ${userId} not found in wallet`,
                    code: 'USER_NOT_FOUND'
                });
            }

            // Gateway connection options
            const gatewayOptions = {
                wallet,
                identity: userId,
                discovery: { enabled: true, asLocalhost: true },
                eventHandlerOptions: {
                    commitTimeout: 100,
                    strategy: null // Use default strategy
                }
            };

            // Connect to gateway
            await this.gateway!.connect(connectionProfile, gatewayOptions);

            // Get network and contract
            this.network = await this.gateway!.getNetwork('supply-chain-channel');
            this.contract = this.network.getContract('supply-chain-chaincode');

            // Set current user
            this.currentUser = {
                role: userRole,
                mspId: this.getMspId(userRole),
                identity: userId,
                certificate: '', // Will be populated from wallet
                privateKey: ''   // Will be populated from wallet
            };

            console.log(`✅ Connected to Fabric network as ${userRole}`);
        } catch (error) {
            console.error('❌ Failed to connect to Fabric network:', error);
            throw new FabricError({
                message: `Failed to connect as ${userRole}`,
                code: 'CONNECTION_FAILED',
                details: { error }
            });
        }
    }

    /**
     * Disconnect from the network
     */
    async disconnect(): Promise<void> {
        if (this.gateway) {
            await this.gateway.disconnect();
            this.gateway = null;
            this.network = null;
            this.contract = null;
            this.currentUser = null;
            console.log('✅ Disconnected from Fabric network');
        }
    }

    /**
     * Execute a transaction (invoke)
     */
    async submitTransaction(functionName: string, ...args: string[]): Promise<TransactionResult> {
        if (!this.contract) {
            throw new FabricError({
                message: 'Not connected to network',
                code: 'NOT_CONNECTED'
            });
        }

        try {
            console.log(`🔄 Submitting transaction: ${functionName}`, args);

            const result = await this.contract.submitTransaction(functionName, ...args);

            console.log(`✅ Transaction ${functionName} submitted successfully`);

            return {
                success: true,
                txId: `tx-${Date.now()}`, // Mock transaction ID
                data: result.toString() ? JSON.parse(result.toString()) : null
            };
        } catch (error: any) {
            console.error(`❌ Transaction ${functionName} failed:`, error);

            return {
                success: false,
                error: error.message || 'Transaction failed',
                data: null
            };
        }
    }

    /**
     * Evaluate a transaction (query)
     */
    async evaluateTransaction(functionName: string, ...args: string[]): Promise<TransactionResult> {
        if (!this.contract) {
            throw new FabricError({
                message: 'Not connected to network',
                code: 'NOT_CONNECTED'
            });
        }

        try {
            console.log(`🔍 Evaluating query: ${functionName}`, args);

            const result = await this.contract.evaluateTransaction(functionName, ...args);
            let data: any = null;

            // Try to parse as JSON, fallback to string
            try {
                data = result.toString() ? JSON.parse(result.toString()) : null;
            } catch {
                data = result.toString();
            }

            console.log(`✅ Query ${functionName} evaluated successfully`);

            return {
                success: true,
                data
            };
        } catch (error: any) {
            console.error(`❌ Query ${functionName} failed:`, error);

            return {
                success: false,
                error: error.message || 'Query failed',
                data: null
            };
        }
    }

    /**
     * Get current user information
     */
    getCurrentUser(): FabricUser | null {
        return this.currentUser;
    }

    /**
     * Check if connected
     */
    isConnected(): boolean {
        return this.gateway !== null && this.contract !== null;
    }

    // Private helper methods

    private getConnectionProfilePath(): string {
        // In development, we'll use a mock connection profile
        // In production, this should point to the real connection profile
        if (process.env.NODE_ENV === 'development') {
            return path.join(process.cwd(), 'src/lib/fabric/connection-mock.json');
        }
        return path.join(process.cwd(), 'supply-chain-network/connection-profile.json');
    }

    private getWalletPath(): string {
        return path.join(process.cwd(), 'fabric-wallet');
    }

    private getUserId(role: Role): string {
        const userMap = {
            'producer': 'Admin@producer.supplychain.com',
            'factory': 'Admin@factory.supplychain.com',
            'retailer': 'Admin@retailer.supplychain.com',
            'consumer': 'Admin@consumer.supplychain.com'
        };
        return userMap[role];
    }

    private getMspId(role: Role): string {
        const mspMap = {
            'producer': 'ProducerMSP',
            'factory': 'FactoryMSP',
            'retailer': 'RetailerMSP',
            'consumer': 'ConsumerMSP'
        };
        return mspMap[role];
    }
}

// Singleton instance
let fabricClientInstance: FabricClient | null = null;

/**
 * Get the singleton Fabric client instance
 */
export function getFabricClient(): FabricClient {
    if (!fabricClientInstance) {
        fabricClientInstance = new FabricClient();
    }
    return fabricClientInstance;
}
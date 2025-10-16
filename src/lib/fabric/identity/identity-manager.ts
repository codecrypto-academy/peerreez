import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

export interface Identity {
    mspId: string;
    credentials: {
        certificate: string;
        privateKey: string;
    };
}

export type Role = 'Producer' | 'Factory' | 'Retailer' | 'Consumer';

/**
 * Manages identities and certificates for Hyperledger Fabric organizations
 */
export class IdentityManager {
    private static instance: IdentityManager;
    private identityCache = new Map<string, Identity>();
    private cryptoBasePath: string;

    private constructor() {
        // Base path to crypto-config directory
        // Use __dirname for proper resolution in both dev and build contexts
        const projectRoot = process.env.FABRIC_CRYPTO_PATH || path.resolve(
            process.cwd(),
            'supply-chain-network/crypto-config/peerOrganizations'
        );
        this.cryptoBasePath = projectRoot;
    }

    public static getInstance(): IdentityManager {
        if (!IdentityManager.instance) {
            IdentityManager.instance = new IdentityManager();
        }
        return IdentityManager.instance;
    }

    /**
     * Get identity for a specific role/organization
     */
    public async getIdentity(role: Role): Promise<Identity> {
        const cacheKey = role.toLowerCase();

        // Check cache first
        if (this.identityCache.has(cacheKey)) {
            return this.identityCache.get(cacheKey)!;
        }

        // Load from filesystem
        const identity = await this.loadIdentityFromDisk(role);
        this.identityCache.set(cacheKey, identity);
        return identity;
    }

    /**
     * Load identity from crypto-config directory
     */
    private async loadIdentityFromDisk(role: Role): Promise<Identity> {
        const orgName = this.getOrgName(role);
        const mspId = this.getMspId(role);

        const userPath = path.join(
            this.cryptoBasePath,
            `${orgName}.supplychain.com/users/Admin@${orgName}.supplychain.com`
        );

        // Load certificate
        const certPath = path.join(userPath, 'msp/signcerts');
        const certFiles = await fs.readdir(certPath);
        const certFile = certFiles.find(f => f.endsWith('.pem'));
        if (!certFile) {
            throw new Error(`Certificate not found for ${role} at ${certPath}`);
        }
        const certificate = await fs.readFile(
            path.join(certPath, certFile),
            'utf8'
        );

        // Load private key
        const keyPath = path.join(userPath, 'msp/keystore');
        const keyFiles = await fs.readdir(keyPath);
        const keyFile = keyFiles[0]; // First file in keystore
        if (!keyFile) {
            throw new Error(`Private key not found for ${role} at ${keyPath}`);
        }
        const privateKey = await fs.readFile(
            path.join(keyPath, keyFile),
            'utf8'
        );

        return {
            mspId,
            credentials: {
                certificate,
                privateKey,
            },
        };
    }

    /**
     * Get organization name from role
     */
    private getOrgName(role: Role): string {
        return role.toLowerCase();
    }

    /**
     * Get MSP ID from role
     */
    private getMspId(role: Role): string {
        const mspMap: Record<Role, string> = {
            Producer: 'ProducerMSP',
            Factory: 'FactoryMSP',
            Retailer: 'RetailerMSP',
            Consumer: 'ConsumerMSP',
        };
        return mspMap[role];
    }

    /**
     * Create TLS credentials for gRPC connection
     */
    public async getTlsCredentials(role: Role): Promise<grpc.ChannelCredentials> {
        const orgName = this.getOrgName(role);
        const tlsCertPath = path.join(
            this.cryptoBasePath,
            `${orgName}.supplychain.com/peers/peer0.${orgName}.supplychain.com/tls/ca.crt`
        );

        try {
            const tlsCert = await fs.readFile(tlsCertPath);
            return grpc.credentials.createSsl(tlsCert);
        } catch {
            console.warn(`TLS certificate not found for ${role}, using insecure credentials`);
            return grpc.credentials.createInsecure();
        }
    }

    /**
     * Sign a message using the identity's private key
     */
    public sign(privateKeyPem: string, message: Buffer): Buffer {
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        const signature = crypto.sign(null, message, privateKey);
        return signature;
    }

    /**
     * Hash a message using SHA256
     */
    public hash(message: Buffer): Buffer {
        return crypto.createHash('sha256').update(message).digest();
    }

    /**
     * Clear the identity cache (useful for testing or refresh)
     */
    public clearCache(): void {
        this.identityCache.clear();
    }
}

// Export singleton instance
export const identityManager = IdentityManager.getInstance();

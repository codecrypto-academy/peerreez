import * as grpc from '@grpc/grpc-js';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { getMapping } from '../../../bridge/identityMapper';

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
    // mappingsPath removed: mappings support intentionally disabled when file is unused

    private constructor() {
        // Base path to crypto-config directory
        // Use __dirname for proper resolution in both dev and build contexts
        const projectRoot = process.env.FABRIC_CRYPTO_PATH || path.resolve(
            process.cwd(),
            'supply-chain-network/crypto-config/peerOrganizations'
        );
        this.cryptoBasePath = projectRoot;
        // mapping file support disabled — resolution will fall back to certificate discovery only
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
     * Load identity by username (e.g., 'User1@producer.supplychain.com' or 'Admin@producer.supplychain.com')
     */
    public async getIdentityByUsername(role: Role, username: string): Promise<Identity> {
        const cacheKey = `${role.toLowerCase()}::${username}`;
        if (this.identityCache.has(cacheKey)) return this.identityCache.get(cacheKey)!;

        const identity = await this.loadIdentityForUser(role, username);
        this.identityCache.set(cacheKey, identity);
        return identity;
    }

    /**
     * Find an identity by selector (username, CN or derived address) under a role's users directory
     */
    public async findIdentity(role: Role, selector: string): Promise<{ username: string; identity: Identity } | null> {
        // First check in-memory/runtime mappings (bridge) so wallet addresses can be
        // mapped to Fabric usernames without needing on-disk JSON mappings.
        try {
            // Try several normalized selector variants when consulting runtime mapping
            const selLower = (selector || '').toLowerCase();
            const no0x = selLower.replace(/^0x/, '');
            const variants = [selLower, no0x, `0x${no0x}`].filter(Boolean);
            let mapped: string | null = null;
            for (const v of variants) {
                try {
                    mapped = await getMapping(v);
                    if (mapped) break;
                } catch {
                    // ignore per-variant errors
                }
            }

            // Also consult file-backed mappings (loadMappings) for flexible key formats
            if (!mapped) {
                try {
                    const fileMaps = await this.loadMappings();
                    // try exact match
                    if (fileMaps[selLower]) mapped = fileMaps[selLower];
                    // try without 0x
                    if (!mapped && fileMaps[no0x]) mapped = fileMaps[no0x];
                    // try keys that end with the selector (e.g., 'producer:0xabc...')
                    if (!mapped) {
                        for (const k of Object.keys(fileMaps)) {
                            const kk = k.toLowerCase();
                            if (kk.endsWith(`:${selLower}`) || kk.endsWith(`:${no0x}`) || kk === selLower) {
                                mapped = fileMaps[k];
                                break;
                            }
                        }
                    }
                } catch {
                    // ignore
                }
            }

            if (mapped) {
                try {
                    const ident = await this.loadIdentityForUser(role, mapped);
                    return { username: mapped, identity: ident };
                } catch {
                    // If the mapped username doesn't exist under this role, fall through
                }
            }
        } catch {
            // ignore mapping errors and continue to disk discovery
        }
        const orgName = this.getOrgName(role);
        const usersDir = path.join(this.cryptoBasePath, `${orgName}.supplychain.com`, 'users');
        try {
            const entries = await fs.readdir(usersDir, { withFileTypes: true });
            for (const e of entries) {
                if (!e.isDirectory()) continue;
                const username = e.name;
                try {
                    const certsDir = path.join(usersDir, username, 'msp', 'signcerts');
                    const files = await fs.readdir(certsDir).catch(() => []);
                    if (!files || files.length === 0) continue;
                    const certFile = path.join(certsDir, files[0]);
                    const pem = await fs.readFile(certFile, 'utf8');
                    const der = pemToDer(Buffer.from(pem, 'utf8'));
                    const fp = crypto.createHash('sha256').update(der).digest('hex');
                    const addr = '0x' + fp.slice(-40);
                    const cn = extractCNFromPem(pem);
                    const sel = selector.toLowerCase();
                    if (username.toLowerCase() === sel || (cn && cn.toLowerCase() === sel) || addr.toLowerCase() === sel) {
                        // load full identity for this user and return username
                        const ident = await this.loadIdentityForUser(role, username);
                        return { username, identity: ident };
                    }
                } catch {
                    // ignore and continue
                }
            }
        } catch {
            // ignore
        }
        return null;
    }

    /**
     * Load mappings from JSON file. Returns an object with keys like 'producer:0xabc...': 'User1@producer.supplychain.com'
     */
    private async loadMappings(): Promise<Record<string, string>> {
        // Try to load a file-backed mapping (addressToFabric.json) located next to the bridge
        // This allows mappings created via the bridge `/map` endpoint or a local file to be
        // visible to the Next.js server process.
        try {
            const file = path.join(__dirname, '..', '..', '..', 'bridge', 'addressToFabric.json');
            const raw = await fs.readFile(file, 'utf8').catch(() => '');
            if (!raw) return {};
            const parsed = JSON.parse(raw || '{}') as Record<string, string>;
            const normalized: Record<string, string> = {};
            for (const k of Object.keys(parsed)) {
                normalized[k.toLowerCase()] = parsed[k];
            }
            return normalized;
        } catch (e) {
            return {};
        }
    }

    /**
     * Add or update a mapping (orgName:selector -> username)
     */
    public async addMapping(orgName: string, selector: string, username: string): Promise<void> {
        // Mappings persistence disabled. No-op to remain backward compatible with callers.
        // If you want to re-enable mappings, restore the identity-mappings.json handling.
        return;
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
     * Load identity for a specific user directory
     */
    private async loadIdentityForUser(role: Role, username: string): Promise<Identity> {
        const orgName = this.getOrgName(role);
        const mspId = this.getMspId(role);

        const userPath = path.join(
            this.cryptoBasePath,
            `${orgName}.supplychain.com`,
            'users',
            username
        );

        const certPath = path.join(userPath, 'msp', 'signcerts');
        const certFiles = await fs.readdir(certPath).catch(() => []);
        const certFile = certFiles.find(f => f.endsWith('.pem'));
        if (!certFile) throw new Error(`Certificate not found for ${username} at ${certPath}`);
        const certificate = await fs.readFile(path.join(certPath, certFile), 'utf8');

        const keyPath = path.join(userPath, 'msp', 'keystore');
        const keyFiles = await fs.readdir(keyPath).catch(() => []);
        const keyFile = keyFiles[0];
        if (!keyFile) throw new Error(`Private key not found for ${username} at ${keyPath}`);
        const privateKey = await fs.readFile(path.join(keyPath, keyFile), 'utf8');

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

function pemToDer(pemBuffer: Buffer) {
    const pem = pemBuffer.toString();
    const b = pem.replace(/-----BEGIN CERTIFICATE-----/, '')
        .replace(/-----END CERTIFICATE-----/, '')
        .replace(/\s+/g, '');
    return Buffer.from(b, 'base64');
}

function extractCNFromPem(pem: string) {
    const m = pem.match(/Subject:.*CN=([^,\n/]+)/);
    if (m && m[1]) return m[1].trim();
    // alternative: try CN= in DN lines
    const m2 = pem.match(/CN=([^,\n/]+)/i);
    if (m2 && m2[1]) return m2[1].trim();
    return undefined;
}

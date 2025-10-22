import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

const BASE = path.resolve(process.cwd(), 'supply-chain-network', 'crypto-config', 'peerOrganizations');

function getCertPathForRole(role: string) {
  // Only expose public certs (signcerts) for known roles. Map role -> user cert path.
  switch (role) {
    case 'producer':
      return path.join(BASE, 'producer.supplychain.com', 'users', 'User2@producer.supplychain.com', 'msp', 'signcerts', 'User2@producer.supplychain.com-cert.pem');
    case 'factory':
      // adjust if you have a factory user cert available
      return path.join(BASE, 'factory.supplychain.com', 'users', 'User1@factory.supplychain.com', 'msp', 'signcerts', 'User1@factory.supplychain.com-cert.pem');
    case 'retailer':
      return path.join(BASE, 'retailer.supplychain.com', 'users', 'User1@retailer.supplychain.com', 'msp', 'signcerts', 'User1@retailer.supplychain.com-cert.pem');
    case 'consumer':
      return path.join(BASE, 'consumer.supplychain.com', 'users', 'User1@consumer.supplychain.com', 'msp', 'signcerts', 'User1@consumer.supplychain.com-cert.pem');
    default:
      return null;
  }
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const role = (url.searchParams.get('role') || '').toLowerCase();
    if (!role) return NextResponse.json({ error: 'role is required' }, { status: 400 });

    const certPath = getCertPathForRole(role);
    if (!certPath) return NextResponse.json({ error: 'unknown role or cert not configured' }, { status: 404 });

    const pem = await fs.readFile(certPath, 'utf8');
    // Compute SHA256 fingerprint of DER
    const der = pemToDer(Buffer.from(pem, 'utf8'));
    const fp = crypto.createHash('sha256').update(der).digest('hex');

    return NextResponse.json({ role, fingerprint: fp, certPem: pem });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

function pemToDer(pemBuffer: Buffer) {
  const pem = pemBuffer.toString();
  const b = pem.replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  return Buffer.from(b, 'base64');
}

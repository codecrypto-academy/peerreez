import { promises as fs } from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

const ORGS_BASE = path.resolve(process.cwd(), 'supply-chain-network', 'crypto-config', 'peerOrganizations');

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const org = url.searchParams.get('org') || 'producer.supplychain.com';
    // restrict to known orgs for safety
    const allowed = ['producer.supplychain.com', 'factory.supplychain.com', 'retailer.supplychain.com', 'consumer.supplychain.com'];
    if (!allowed.includes(org)) return NextResponse.json({ error: 'unknown org' }, { status: 404 });

    const usersDir = path.join(ORGsPath(org), 'users');
    const entries = await fs.readdir(usersDir, { withFileTypes: true });
    const results: Array<{ username: string; certFile: string; fingerprint: string; address: string; cn?: string }> = [];

    for (const e of entries) {
      if (!e.isDirectory()) continue;
      try {
        const certsDir = path.join(usersDir, e.name, 'msp', 'signcerts');
        const files = await fs.readdir(certsDir).catch(() => []);
        if (!files || files.length === 0) continue;
        const certFile = path.join(certsDir, files[0]);
        const pem = await fs.readFile(certFile, 'utf8');
        const der = pemToDer(Buffer.from(pem, 'utf8'));
        const fp = crypto.createHash('sha256').update(der).digest('hex');
        // derive a 0x-like address from last 20 bytes of sha256
        const addr = '0x' + fp.slice(-40);
        // try to extract CN from subject
        const cn = extractCNFromPem(pem);
        results.push({ username: e.name, certFile: path.relative(process.cwd(), certFile), fingerprint: fp, address: addr, cn });
      } catch {
        // ignore individual failures
      }
    }

    return NextResponse.json({ org, identities: results });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function ORGsPath(org: string) {
  return path.join(ORGS_BASE, org);
}

function pemToDer(pemBuffer: Buffer) {
  const pem = pemBuffer.toString();
  const b = pem.replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');
  return Buffer.from(b, 'base64');
}

function extractCNFromPem(pem: string) {
  // simple regex on subject line if present; otherwise undefined
  // fallback: attempt to parse with regex for 'CN='
  const m = pem.match(/Subject:.*CN=([^,\n/]+)/);
  if (m && m[1]) return m[1].trim();
  return undefined;
}

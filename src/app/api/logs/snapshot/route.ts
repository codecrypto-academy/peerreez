export const runtime = 'nodejs';

import { NextRequest } from 'next/server';
import { spawn } from 'child_process';

const ALLOWED = new Set([
    'peer0.producer.supplychain.com',
    'peer0.factory.supplychain.com',
    'peer0.retailer.supplychain.com',
    'peer0.consumer.supplychain.com',
    'orderer.supplychain.com'
]);

export async function GET(req: NextRequest): Promise<Response> {
    const url = new URL(req.url);
    const container = (url.searchParams.get('container') || 'peer0.producer.supplychain.com').trim();

    if (!ALLOWED.has(container)) {
        return new Response('Contenedor no permitido', { status: 400 });
    }

    return await new Promise<Response>((resolve: (res: Response) => void) => {
        const child = spawn('docker', ['logs', container], { stdio: ['ignore', 'pipe', 'pipe'] });

        let out = '';
        let err = '';

        child.stdout.setEncoding('utf8');
        child.stdout.on('data', (chunk: string) => { out += chunk; });

        child.stderr.setEncoding('utf8');
        child.stderr.on('data', (chunk: string) => { err += chunk; });

        child.on('error', (e: Error) => {
            console.error('docker logs spawn error:', e);
            resolve(new Response(`Error spawning docker: ${String(e)}`, { status: 500 }));
        });

        // Handle process close
        child.on('close', () => {
            const combined = out + (err ? `\n[stderr]\n${err}` : '');
            clearTimeout(killTimeout);
            resolve(new Response(combined, {
                status: 200,
                headers: {
                    'Content-Type': 'text/plain; charset=utf-8',
                    'Cache-Control': 'no-cache, no-store, must-revalidate'
                }
            }));
        });
        // safety timeout: kill if takes too long
        const killTimeout = setTimeout(() => {
            try { child.kill(); } catch (e) { console.error('error killing child on timeout', e); }
            resolve(new Response('[timeout reading docker logs]', { status: 504 }));
        }, 20_000);
    });
}

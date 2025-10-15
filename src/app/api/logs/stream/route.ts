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

export async function GET(req: NextRequest) {
    const url = new URL(req.url);
    const container = (url.searchParams.get('container') || 'peer0.producer.supplychain.com').trim();

    if (!ALLOWED.has(container)) {
        return new Response('Contenedor no permitido', { status: 400 });
    }

    // Create readable stream for SSE
    const { readable, writable } = new TransformStream();
    const writer = writable.getWriter();

    // Spawn docker logs -f
    const child = spawn('docker', ['logs', '-f', container], { stdio: ['ignore', 'pipe', 'pipe'] });

    const send = async (data: string) => {
        // SSE format: data: <line>\n\n
        try {
            await writer.write(new TextEncoder().encode(`data: ${data.replace(/\n/g, '\ndata: ')}\n\n`));
        } catch (err) {
            // ignore write errors
        }
    };

    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk: string) => {
        send(chunk);
    });

    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk: string) => {
        send(chunk);
    });

    child.on('close', (code) => {
        send(`[docker process exited ${code}]`);
        writer.close();
    });

    child.on('error', (err) => {
        console.error('docker logs -f spawn error:', err);
        try { writer.write(new TextEncoder().encode(`data: [docker spawn error]\n\n`)); } catch (e) { }
    });

    // If client disconnects, kill child process
    const abort = () => {
        try { child.kill(); } catch (e) { }
        try { writer.close(); } catch (e) { }
    };

    // Listen for client disconnect via request signal
    req.signal.addEventListener('abort', () => {
        abort();
    });

    return new Response(readable, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            Connection: 'keep-alive'
        }
    });
}

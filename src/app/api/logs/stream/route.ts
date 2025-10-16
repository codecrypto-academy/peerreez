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
        } catch {
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

    child.on('close', async () => {
        // Notify client and then try to close the writer. The stream may already
        // be closed if the client disconnected, so guard the close in try/catch
        try {
            await send('[docker process exited]');
        } catch {
            // ignore send failures
        }

        try {
            // writer.close() returns a promise and may reject if the stream is
            // already closed. Await and catch to avoid an unhandled rejection.
            await writer.close();
        } catch {
            // writer may already be closed/released; ignore
        }
    });

    child.on('error', (err) => {
        console.error('docker logs -f spawn error:', err);
        // Use send() which already handles write errors internally and avoids
        // unhandled promise rejections from calling writer.write() directly.
        void send('[docker spawn error]');
    });

    // If client disconnects, kill child process
    const abort = () => {
        try { child.kill(); } catch (e) { void e; }
        try {
            // Use .catch on the returned promise to swallow rejections when
            // the writer is already closed; also wrap in try/catch in case
            // writer.close() throws synchronously in some environments.
            const p = writer.close();
            if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => { });
        } catch (e) { void e; }
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

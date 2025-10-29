import { NextResponse } from 'next/server';
import { spawn } from 'child_process';
import path from 'path';

const SCRIPTS_ROOT = path.resolve(process.cwd(), 'supply-chain-network');

const ALLOWED: Record<string, { cmd: string; args?: string[] }> = {
    cleanup: { cmd: 'bash', args: ['./cleanup.sh'] },
    deploy: { cmd: 'bash', args: ['./deploy.sh'] },
    validate: { cmd: 'bash', args: ['./validate.sh'] },
    monitor: { cmd: 'bash', args: ['./explorer/monitor.sh'] },
    start: { cmd: 'bash', args: ['./start_network.sh'] },
    stop: { cmd: 'bash', args: ['./stop_network.sh'] },
    register_user: { cmd: 'bash', args: ['./register_user.sh'] },
};

export async function POST(req: Request) {
    try {
        const body = await req.json() as unknown;
        const b = (body as Record<string, unknown> | null) || null;
        const script = typeof b?.script === 'string' ? String(b.script) : '';
        const args = Array.isArray(b?.args) ? (b.args as unknown[]).map(String) : [];

        if (!script || !(script in ALLOWED)) {
            return NextResponse.json({ error: 'Invalid or missing script name' }, { status: 400 });
        }

        const mapping = ALLOWED[script];
        const cmd = mapping.cmd;
        const baseArgs = mapping.args ? mapping.args.slice() : [];
        const finalArgs = baseArgs.concat(args.map(String));

        // Basic sanitization
        for (const a of finalArgs) {
            if (a.includes('..') || a.startsWith('/')) {
                return NextResponse.json({ error: 'Invalid argument' }, { status: 400 });
            }
        }

        const stream = new ReadableStream({
            start(controller) {
                try {
                    const child = spawn(cmd, finalArgs, { cwd: SCRIPTS_ROOT, env: process.env });

                    child.stdout.on('data', (chunk: Buffer) => {
                        const text = chunk.toString();
                        controller.enqueue(new TextEncoder().encode(text));
                    });

                    child.stderr.on('data', (chunk: Buffer) => {
                        const text = chunk.toString();
                        controller.enqueue(new TextEncoder().encode(text));
                    });

                    child.on('close', (code: number) => {
                        controller.enqueue(new TextEncoder().encode(`\nPROCESS_EXIT_CODE:${code}\n`));
                        controller.close();
                    });

                    child.on('error', (err: unknown) => {
                        controller.enqueue(new TextEncoder().encode(`\nPROCESS_ERROR:${String(err)}\n`));
                        controller.close();
                    });
                } catch (err: unknown) {
                    controller.enqueue(new TextEncoder().encode(`\nSTREAM_ERROR:${String(err)}\n`));
                    controller.close();
                }
            }
        });

        return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

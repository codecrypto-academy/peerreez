import { NextResponse } from 'next/server';
import { execFile } from 'child_process';
import type { ExecFileOptions } from 'child_process';
import { promisify } from 'util';
import path from 'path';

const execFileAsync = promisify(execFile);

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

        // Ensure we pass only strings
        const finalArgs = baseArgs.concat(args.map(String));

        // Security: prevent path traversal by refusing args with .. or starting with /
        for (const a of finalArgs) {
            if (a.includes('..') || a.startsWith('/')) {
                return NextResponse.json({ error: 'Invalid argument' }, { status: 400 });
            }
        }

        // Execute in the supply-chain-network directory
        const options: ExecFileOptions = { cwd: SCRIPTS_ROOT, maxBuffer: 10 * 1024 * 1024 };

        // Run the command
        const { stdout, stderr } = await execFileAsync(cmd, finalArgs, options);

        const output = `${stdout || ''}\n${stderr || ''}`.trim();

        return NextResponse.json({ output });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

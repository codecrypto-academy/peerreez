import { NextResponse } from 'next/server';
import { promisify } from 'util';

// GET /api/logs?containerName=nombre&tail=100
// Obtiene los logs de un contenedor específico

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const containerName = searchParams.get('containerName');
        const tail = searchParams.get('tail') || '100';

        if (!containerName) {
            return NextResponse.json({ error: 'containerName es requerido' }, { status: 400 });
        }

        const { exec } = await import('child_process');
        const execAsync = promisify(exec);

        // Verificar si el contenedor existe
        try {
            await execAsync(`docker inspect ${containerName}`);
        } catch (error) {
            return NextResponse.json({ error: `Contenedor '${containerName}' no encontrado` }, { status: 404 });
        }

        // Obtener los logs
        const command = `docker logs --tail ${tail} ${containerName}`;
        const { stdout, stderr } = await execAsync(command);

        // Combinar stdout y stderr
        const logs = [stdout, stderr].filter(Boolean).join('\n');

        return NextResponse.json({
            logs: logs || 'No hay logs disponibles',
            containerName,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        return NextResponse.json({
            error: error?.message || 'Error al obtener los logs'
        }, { status: 500 });
    }
}

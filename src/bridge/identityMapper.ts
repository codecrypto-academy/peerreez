/**
 * identityMapper.ts (moved under src/bridge)
 */

import fs from 'fs/promises';
import path from 'path';

const DATA_DIR = path.resolve(__dirname);
const MAP_FILE = path.join(DATA_DIR, 'addressToFabric.json');

let cache: Record<string, string> | null = null;

async function ensureLoaded() {
    if (cache) return;
    try {
        const raw = await fs.readFile(MAP_FILE, 'utf8');
        cache = JSON.parse(raw || '{}');
    } catch (err) {
        cache = {};
        try { await fs.writeFile(MAP_FILE, JSON.stringify(cache, null, 2), 'utf8'); } catch { };
    }
}

export async function getMapping(address: string): Promise<string | null> {
    if (!address) return null;
    await ensureLoaded();
    const key = address.toLowerCase();
    return (cache && cache[key]) || null;
}

export async function setMapping(address: string, fabricIdentity: string): Promise<void> {
    if (!address || !fabricIdentity) throw new Error('address and fabricIdentity required');
    await ensureLoaded();
    cache![address.toLowerCase()] = fabricIdentity;
    await fs.writeFile(MAP_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export async function removeMapping(address: string): Promise<void> {
    await ensureLoaded();
    delete cache![address.toLowerCase()];
    await fs.writeFile(MAP_FILE, JSON.stringify(cache, null, 2), 'utf8');
}

export async function listMappings(): Promise<Record<string, string>> {
    await ensureLoaded();
    return { ...(cache || {}) };
}

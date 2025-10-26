/**
 * identityMapper.ts (moved under src/bridge)
 */

// Identity mapper with optional file-backed persistence (addressToFabric.json)
// Stores mappings both in-memory and persists to a JSON file in the same
// directory so other server processes can read them as a fallback.

import { promises as fs } from 'fs';
import * as path from 'path';

const runtimeMap: Record<string, string> = {};
const mappingsFile = path.join(__dirname, 'addressToFabric.json');

// Try to load existing mappings from disk at startup (best-effort)
(async () => {
    try {
        const raw = await fs.readFile(mappingsFile, 'utf8').catch(() => '');
        if (!raw) return;
        const parsed = JSON.parse(raw || '{}') as Record<string, string>;
        for (const k of Object.keys(parsed)) {
            runtimeMap[k.toLowerCase()] = parsed[k];
        }
    } catch {
        // ignore
    }
})();

export async function getMapping(address: string): Promise<string | null> {
    if (!address) return null;
    const key = address.toLowerCase();
    if (runtimeMap[key]) return runtimeMap[key];

    // As a fallback, try to read the file (useful if another process updated it)
    try {
        const raw = await fs.readFile(mappingsFile, 'utf8').catch(() => '');
        if (!raw) return null;
        const parsed = JSON.parse(raw || '{}') as Record<string, string>;
        const val = parsed[key];
        if (val) {
            // cache in memory for faster subsequent lookups
            runtimeMap[key] = val;
            return val;
        }
    } catch {
        // ignore
    }
    return null;
}

export async function setMapping(address: string, fabricIdentity: string): Promise<void> {
    if (!address || !fabricIdentity) throw new Error('address and fabricIdentity required');
    const key = address.toLowerCase();
    runtimeMap[key] = fabricIdentity;
    // Persist to disk (best-effort)
    try {
        const copy = { ...runtimeMap };
        await fs.writeFile(mappingsFile, JSON.stringify(copy, null, 2), 'utf8');
    } catch (err) {
        // ignore persistence errors
    }
}

export async function removeMapping(address: string): Promise<void> {
    if (!address) return;
    const key = address.toLowerCase();
    delete runtimeMap[key];
    try {
        const copy = { ...runtimeMap };
        await fs.writeFile(mappingsFile, JSON.stringify(copy, null, 2), 'utf8');
    } catch {
        // ignore
    }
}

export async function listMappings(): Promise<Record<string, string>> {
    return { ...runtimeMap };
}

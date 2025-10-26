/**
 * identityMapper.ts (moved under src/bridge)
 */

// In-memory identity mapper for bridge
// This implementation intentionally avoids any on-disk persistence such as
// `addressToFabric.json`. Mappings live only for the process lifetime.

const runtimeMap: Record<string, string> = {};

export async function getMapping(address: string): Promise<string | null> {
    if (!address) return null;
    const key = address.toLowerCase();
    return runtimeMap[key] || null;
}

export async function setMapping(address: string, fabricIdentity: string): Promise<void> {
    if (!address || !fabricIdentity) throw new Error('address and fabricIdentity required');
    runtimeMap[address.toLowerCase()] = fabricIdentity;
}

export async function removeMapping(address: string): Promise<void> {
    if (!address) return;
    delete runtimeMap[address.toLowerCase()];
}

export async function listMappings(): Promise<Record<string, string>> {
    return { ...runtimeMap };
}

// Simple in-memory index to map pending transfer IDs to a recipient/owner identity
// This is intentionally ephemeral (not persisted) and exists to support UI filtering
// in development environments where the chaincode does not record recipientIdentity.

const transferToRecipient = new Map<string, string>();

export function addPendingTransferIndex(transferId: string, recipientIdentity: string | undefined) {
    if (!transferId || !recipientIdentity) return;
    transferToRecipient.set(transferId, recipientIdentity);
}

export function getRecipientForTransfer(transferId: string): string | undefined {
    return transferToRecipient.get(transferId);
}

export function dumpAllEntries(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const [k, v] of transferToRecipient.entries()) out[k] = v;
    return out;
}

export function filterTransfersByOwner(transfers: any[], ownerIdentity: string) {
    if (!ownerIdentity) return [];
    const owner = ownerIdentity.toLowerCase();
    return transfers.filter((t: any) => {
        const mapped = getRecipientForTransfer(t.id);
        if (!mapped) return false;
        return String(mapped).toLowerCase() === owner;
    });
}

export function clearIndex() {
    transferToRecipient.clear();
}

export default {
    addPendingTransferIndex,
    getRecipientForTransfer,
    filterTransfersByOwner,
    clearIndex,
};

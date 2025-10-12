export const getActionIcon = (action: string) => {
    switch (action) {
        case 'CREATE':
            return '✨';
        case 'TRANSFER':
            return '🚚';
        case 'TRANSFORM':
            return '⚙️';
        case 'UPDATE':
            return '📝';
        case 'DELETE':
            return '🗑️';
        default:
            return '📦';
    }
};

export const getActionColor = (action: string) => {
    switch (action) {
        case 'CREATE':
            return 'from-green-50 to-emerald-50 border-green-200';
        case 'TRANSFER':
            return 'from-blue-50 to-cyan-50 border-blue-200';
        case 'TRANSFORM':
            return 'from-purple-50 to-indigo-50 border-purple-200';
        case 'UPDATE':
            return 'from-yellow-50 to-amber-50 border-yellow-200';
        case 'DELETE':
            return 'from-red-50 to-pink-50 border-red-200';
        default:
            return 'from-gray-50 to-slate-50 border-gray-200';
    }
};

export const extractOrgFromIdentity = (identity?: string) => {
    if (!identity || typeof identity !== 'string') return 'Unknown';

    // Try several common identity formats: CN=Admin@org.supplychain.com, Admin@org.supplychain.com, org.supplychain.com, simple MSP id
    try {
        let m = identity.match(/CN=Admin@([\w-]+)\.supplychain\.com/i);
        if (m && m[1]) return capitalize(m[1]);

        m = identity.match(/([\w-]+)@([\w-]+)\.supplychain\.com/i);
        if (m && m[2]) return capitalize(m[2]);

        m = identity.match(/([\w-]+)\.supplychain\.com/i);
        if (m && m[1]) return capitalize(m[1]);

        // Try MSP-like identifiers (e.g., FactoryMSP)
        m = identity.match(/(\w+MSP)/i);
        if (m && m[1]) return m[1].replace(/MSP/i, '');
    } catch (_e) {
        // fallthrough
    }

    // As a fallback, return a short fingerprint so it's not 'Unknown'
    return String(identity).slice(0, 12) || 'Unknown';
};

const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();

export const formatTimestamp = (timestamp: string) => {
    try {
        return new Date(timestamp).toLocaleString('es-ES', {
            year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });
    } catch (_err) {
        return String(timestamp || '');
    }
};

export const getOriginBadge = (origin?: 'raw' | 'parent' | 'asset') => {
    switch (origin) {
        case 'raw':
            return { label: 'RAW', classes: 'bg-amber-100 text-amber-800' };
        case 'parent':
            return { label: 'PARENT', classes: 'bg-slate-100 text-slate-800' };
        case 'asset':
            return { label: 'ASSET', classes: 'bg-blue-100 text-blue-800' };
        default:
            return { label: 'UNKNOWN', classes: 'bg-gray-100 text-gray-800' };
    }
};

export const formatQuantities = (quantities: any) => {
    if (quantities === null || quantities === undefined) return null;

    // If it's already a primitive, just stringify
    // If it's a JSON-string, try to parse
    if (typeof quantities === 'string') {
        try {
            const parsed = JSON.parse(quantities);
            return formatQuantities(parsed);
        } catch (_e) {
            // not JSON, return raw string
            return quantities;
        }
    }
    if (typeof quantities !== 'object') return String(quantities);

    try {
        const parts: string[] = [];
        const nf = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 3 });
        for (const [k, v] of Object.entries(quantities)) {
            // handle nested objects with amount/unit
            if (v && typeof v === 'object') {
                // common shape: { amount: 1000, unit: 'kg' }
                const amount = (v as any).amount ?? (v as any).quantity ?? (v as any).qty ?? null;
                const unit = (v as any).unit ?? (v as any).u ?? '';
                if (amount !== null) parts.push(`${k}: ${nf.format(Number(amount))}${unit ? ` ${unit}` : ' units'}`);
                else parts.push(`${k}: ${JSON.stringify(v)}`);
            } else {
                // primitive value
                // if numeric, format
                if (typeof v === 'number' || (!isNaN(Number(v)) && v !== '')) parts.push(`${k}: ${nf.format(Number(v))} units`);
                else parts.push(`${k}: ${v}`);
            }
        }
        return parts.join(', ');
    } catch (_e) {
        try { return JSON.stringify(quantities); } catch (__) { return String(quantities); }
    }
};

import React, { useState } from 'react';

interface StopNetworkButtonProps {
    networkName: string;
}

const StopNetworkButton: React.FC<StopNetworkButtonProps> = ({ networkName }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState<string | null>(null);

    const handleStopNetwork = async () => {
        setLoading(true);
        setMessage(null);
        try {
            const res = await fetch('/api/stopNetwork', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName }),
            });
            const data = await res.json();
            setMessage(data.message);
        } catch (err: any) {
            setMessage('Error al detener la red.');
        }
        setLoading(false);
    };

    return (
        <div>
            <button
                onClick={handleStopNetwork}
                disabled={loading}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
                {loading ? 'Deteniendo...' : 'Detener Red'}
            </button>
            {message && <p className="mt-2 text-sm">{message}</p>}
        </div>
    );
};

export default StopNetworkButton;

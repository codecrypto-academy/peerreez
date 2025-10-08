'use client';

import { useState, useEffect } from 'react';

interface FactoryStats {
    rawMaterials: number;
    inProduction: number;
    finishedProducts: number;
    shipped: number;
    loading: boolean;
    error: string | null;
}

export function useFactoryStats() {
    const [stats, setStats] = useState<FactoryStats>({
        rawMaterials: 0,
        inProduction: 0,
        finishedProducts: 0,
        shipped: 0,
        loading: true,
        error: null
    });

    const fetchStats = async () => {
        try {
            setStats(prev => ({ ...prev, loading: true, error: null }));

            // Simular delay de red realista
            await new Promise(resolve => setTimeout(resolve, 800));

            // Datos realistas basados en nuestras pruebas:
            // - Factory recibió COTTON_RAW_FRESH_001 y WHEAT_RAW_FRESH_001
            // - Transformó ambos en PREMIUM_BLEND_PRODUCT_001
            // - Transfirió el producto al Retailer
            const realisticStats = {
                rawMaterials: 0,     // 0 raw materials (fueron consumidos en la transformación)
                inProduction: 0,     // 0 en producción actualmente
                finishedProducts: 0, // 0 productos (fue enviado al retailer)
                shipped: 1,          // 1 producto enviado (PREMIUM_BLEND_PRODUCT_001)
                loading: false,
                error: null
            };

            setStats(realisticStats);
        } catch (error: any) {
            console.error('Error fetching factory stats:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch stats'
            }));
        }
    };

    const refetch = () => {
        fetchStats();
    };

    useEffect(() => {
        fetchStats();

        // Auto-refresh cada 30 segundos
        const interval = setInterval(fetchStats, 30000);

        return () => clearInterval(interval);
    }, []);

    return { stats, refetch, fetchStats };
}
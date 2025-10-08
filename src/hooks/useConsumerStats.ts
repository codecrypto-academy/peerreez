'use client';

import { useState, useEffect } from 'react';

interface ConsumerStats {
    myProducts: number;
    verifiedProducts: number;
    scannedToday: number;
    loading: boolean;
    error: string | null;
}

interface RecentPurchase {
    id: string;
    name: string;
    category: string;
    status: string;
    updatedAt: string;
    type: string;
}

export function useConsumerStats() {
    const [stats, setStats] = useState<ConsumerStats>({
        myProducts: 0,
        verifiedProducts: 0,
        scannedToday: 0,
        loading: true,
        error: null
    });

    const [recentPurchases, setRecentPurchases] = useState<RecentPurchase[]>([]);

    const fetchData = async () => {
        try {
            setStats(prev => ({ ...prev, loading: true, error: null }));

            // Por ahora usaremos datos realistas basados en nuestras pruebas
            // TODO: Implementar consulta real de assets por owner
            // Datos realistas basados en nuestras pruebas exitosas:
            // Consumer recibió PREMIUM_BLEND_PRODUCT_001 del Retailer
            const realisticStats = {
                myProducts: 1,           // 1 producto recibido del retailer
                verifiedProducts: 1,     // 1 producto verificado en blockchain  
                scannedToday: 1,         // 1 producto escaneado/trazado hoy
                loading: false,
                error: null
            };

            const realisticPurchases: RecentPurchase[] = [
                {
                    id: 'PREMIUM_BLEND_PRODUCT_001',
                    name: 'Premium Cotton-Wheat Blend Product',
                    category: 'textile-food',
                    status: 'DELIVERED',
                    updatedAt: '2025-10-06T10:53:20Z',  // Timestamp real de nuestras pruebas
                    type: 'PRODUCT',
                }
            ];

            setStats(realisticStats);
            setRecentPurchases(realisticPurchases);
        } catch (error: any) {
            console.error('Error fetching consumer data:', error);
            setStats(prev => ({
                ...prev,
                loading: false,
                error: error.message || 'Failed to fetch data'
            }));
        }
    };

    const refetch = () => {
        fetchData();
    };

    useEffect(() => {
        fetchData();

        // Auto-refresh cada 30 segundos
        const interval = setInterval(fetchData, 30000);

        return () => clearInterval(interval);
    }, []);

    return { stats, recentPurchases, refetch, fetchData };
}
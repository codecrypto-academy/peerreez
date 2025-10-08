'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactNode, useState } from 'react';

/**
 * React Query Provider for the application
 * Provides caching, background refetching, and automatic retry logic
 */
export function QueryProvider({ children }: { children: ReactNode }) {
    const [queryClient] = useState(
        () =>
            new QueryClient({
                defaultOptions: {
                    queries: {
                        // Data is considered fresh for 30 seconds
                        staleTime: 30 * 1000,
                        // Cache data for 5 minutes
                        gcTime: 5 * 60 * 1000,
                        // Retry failed queries 2 times
                        retry: 2,
                        // Refetch on window focus
                        refetchOnWindowFocus: true,
                        // Refetch on mount if data is stale
                        refetchOnMount: true,
                        // Refetch on reconnect
                        refetchOnReconnect: true,
                    },
                    mutations: {
                        // Retry failed mutations 1 time
                        retry: 1,
                    },
                },
            })
    );

    return (
        <QueryClientProvider client={queryClient}>
            {children}
        </QueryClientProvider>
    );
}

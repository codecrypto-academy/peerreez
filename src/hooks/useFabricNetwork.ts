import { useState, useEffect, useCallback } from 'react';
import { Role } from '../types/fabric';
import { ChaincodeInvoker } from '../lib/fabric/chaincode/chaincodeInvoker';

interface FabricNetworkState {
    isConnected: boolean;
    currentRole: Role | null;
    currentUser: string | null;
    isLoading: boolean;
    error: string | null;
}

export const useFabricNetwork = () => {
    const [state, setState] = useState<FabricNetworkState>({
        isConnected: false,
        currentRole: null,
        currentUser: null,
        isLoading: false,
        error: null
    });

    const [chaincodeInvoker] = useState(() => new ChaincodeInvoker());

    // Connect to network as specific role
    const connectAs = useCallback(async (role: Role, userId: string) => {
        setState(prev => ({ ...prev, isLoading: true, error: null }));

        try {
            await chaincodeInvoker.connectAs(role, userId);

            setState(prev => ({
                ...prev,
                isConnected: true,
                currentRole: role,
                currentUser: userId,
                isLoading: false,
                error: null
            }));

            console.log(`✅ Connected to Fabric as ${role}: ${userId}`);
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isConnected: false,
                currentRole: null,
                currentUser: null,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Connection failed'
            }));

            console.error('❌ Failed to connect to Fabric:', error);
        }
    }, [chaincodeInvoker]);

    // Disconnect from network
    const disconnect = useCallback(async () => {
        setState(prev => ({ ...prev, isLoading: true }));

        try {
            await chaincodeInvoker.disconnect();

            setState({
                isConnected: false,
                currentRole: null,
                currentUser: null,
                isLoading: false,
                error: null
            });

            console.log('✅ Disconnected from Fabric');
        } catch (error: unknown) {
            setState(prev => ({
                ...prev,
                isLoading: false,
                error: error instanceof Error ? error.message : 'Disconnect failed'
            }));

            console.error('❌ Failed to disconnect:', error);
        }
    }, [chaincodeInvoker]);

    // Auto-connect based on stored role/user (localStorage)
    useEffect(() => {
        const storedRole = localStorage.getItem('fabricRole') as Role;
        const storedUser = localStorage.getItem('fabricUser');

        if (storedRole && storedUser && !state.isConnected && !state.isLoading) {
            connectAs(storedRole, storedUser);
        }
    }, [connectAs, state.isConnected, state.isLoading]);

    // Store connection info in localStorage
    useEffect(() => {
        if (state.isConnected && state.currentRole && state.currentUser) {
            localStorage.setItem('fabricRole', state.currentRole);
            localStorage.setItem('fabricUser', state.currentUser);
        } else {
            localStorage.removeItem('fabricRole');
            localStorage.removeItem('fabricUser');
        }
    }, [state.isConnected, state.currentRole, state.currentUser]);

    return {
        // Connection state
        ...state,

        // Connection methods
        connectAs,
        disconnect,

        // Chaincode invoker
        chaincodeInvoker,

        // Utility methods
        isRole: (role: Role) => state.currentRole === role,
        requiresConnection: () => {
            if (!state.isConnected) {
                throw new Error('Not connected to Fabric network');
            }
        }
    };
};
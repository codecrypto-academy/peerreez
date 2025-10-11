import { ReactNode, useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type UserRole = 'producer' | 'factory' | 'retailer' | 'consumer';

interface User {
    role: UserRole;
    id: string;
    name: string;
    organization: string;
    mspId: string;
}

interface RoleGuardProps {
    children: ReactNode;
    allowedRoles: UserRole[];
    fallbackPath?: string;
}

// Mock user context - En producción esto vendría de un contexto de autenticación real
const getMockUser = (pathname: string): User | null => {
    // Determinar rol basado en la ruta actual
    if (pathname.startsWith('/producer')) {
        return {
            role: 'producer',
            id: 'producer-001',
            name: 'Farm Valley Co.',
            organization: 'ProducerMSP',
            mspId: 'ProducerMSP'
        };
    } else if (pathname.startsWith('/factory')) {
        return {
            role: 'factory',
            id: 'factory-001',
            name: 'Processing Industries Ltd.',
            organization: 'FactoryMSP',
            mspId: 'FactoryMSP'
        };
    } else if (pathname.startsWith('/retailer')) {
        return {
            role: 'retailer',
            id: 'retailer-001',
            name: 'FreshMart Supermarket',
            organization: 'RetailerMSP',
            mspId: 'RetailerMSP'
        };
    } else if (pathname.startsWith('/consumer')) {
        return {
            role: 'consumer',
            id: 'consumer-001',
            name: 'John Consumer',
            organization: 'ConsumerMSP',
            mspId: 'ConsumerMSP'
        };
    }

    return null;
};

export default function RoleGuard({ children, allowedRoles, fallbackPath = '/' }: RoleGuardProps) {
    const router = useRouter();
    const pathname = usePathname();
    const [isLoading, setIsLoading] = useState(true);

    const user = getMockUser(pathname);

    useEffect(() => {
        // Simular carga inicial
        const timer = setTimeout(() => {
            setIsLoading(false);
        }, 100);

        return () => clearTimeout(timer);
    }, []);

    // Keep a lightweight cookie so server-side routes can infer role in demo/staging
    useEffect(() => {
        if (user) {
            try {
                // Store simple role identifier for server to read (note: this is NOT a substitute for real auth)
                document.cookie = `userRole=${user.role}; path=/; samesite=lax`;
            } catch (e) {
                // ignore (e.g., SSR or strict environments)
            }
        }
    }, [user]);

    // Mostrar loading inicial
    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Verificando permisos...</p>
                </div>
            </div>
        );
    }

    // Si no hay usuario, mostrar error (no redirigir automáticamente)
    if (!user) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
                    <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Requerido</h2>
                    <p className="text-gray-600 mb-6">
                        Necesitas acceder desde una ruta de rol específico.
                    </p>

                    <div className="space-y-2">
                        <button
                            onClick={() => router.push('/producer')}
                            className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            🌱 Producer Dashboard
                        </button>
                        <button
                            onClick={() => router.push('/factory')}
                            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
                        >
                            🏭 Factory Dashboard
                        </button>
                        <button
                            onClick={() => router.push('/retailer')}
                            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                        >
                            🏪 Retailer Dashboard
                        </button>
                        <button
                            onClick={() => router.push('/consumer')}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            👤 Consumer Dashboard
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Si el usuario no tiene el rol adecuado
    if (!allowedRoles.includes(user.role)) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="max-w-md mx-auto text-center bg-white rounded-lg shadow-lg p-8">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                        </svg>
                    </div>

                    <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Denegado</h2>
                    <p className="text-gray-600 mb-4">
                        No tienes permisos para acceder a esta sección.
                    </p>

                    <div className="bg-gray-50 rounded-lg p-4 mb-6">
                        <p className="text-sm text-gray-700">
                            <strong>Tu rol:</strong> {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                        </p>
                        <p className="text-sm text-gray-700">
                            <strong>Organización:</strong> {user.organization}
                        </p>
                        <p className="text-sm text-gray-700">
                            <strong>Roles permitidos:</strong> {allowedRoles.join(', ')}
                        </p>
                    </div>

                    <div className="space-y-2">
                        <button
                            onClick={() => router.push(`/${user.role}`)}
                            className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Ir a mi Dashboard
                        </button>
                        <button
                            onClick={() => router.push('/')}
                            className="w-full px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                        >
                            Volver al Inicio
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Si el usuario tiene permisos, mostrar el contenido
    return <>{children}</>;
}

// Hook para obtener información del usuario actual
export function useCurrentUser(): User | null {
    const pathname = usePathname();
    return getMockUser(pathname);
}

// Hook para verificar si el usuario tiene un rol específico
export function useHasRole(requiredRole: UserRole): boolean {
    const pathname = usePathname();
    const user = getMockUser(pathname);
    return user?.role === requiredRole || false;
}

// Hook para verificar si el usuario tiene alguno de los roles permitidos
export function useHasAnyRole(allowedRoles: UserRole[]): boolean {
    const pathname = usePathname();
    const user = getMockUser(pathname);
    return user ? allowedRoles.includes(user.role) : false;
}

// Hook para obtener información del usuario actual (alias de useCurrentUser)
export function useUser(): User | null {
    const pathname = usePathname();
    return getMockUser(pathname);
}
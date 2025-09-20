
"use client";
import React, { useState, useEffect } from 'react';

// Componente AddNetworkForm: formulario para crear una nueva red Besu
interface AddNetworkFormProps {
    onNetworkAdded?: () => void;
}

export default function AddNetworkForm({ onNetworkAdded }: AddNetworkFormProps) {
    // Estados para los campos y feedback
    const [name, setName] = useState(''); // Nombre de la red
    const [chainId, setChainId] = useState(''); // Chain ID
    const [loading, setLoading] = useState(false); // Indicador de carga
    const [error, setError] = useState(''); // Mensaje de error
    const [validationErrors, setValidationErrors] = useState<{ name?: string; chainId?: string }>({}); // Errores de validación

    // Función para validar el nombre de la red
    const validateNetworkName = (value: string): string | undefined => {
        if (!value.trim()) {
            return 'El nombre de la red es requerido';
        }
        if (value.length < 3) {
            return 'El nombre debe tener al menos 3 caracteres';
        }
        if (value.length > 20) {
            return 'El nombre no puede tener más de 20 caracteres';
        }
        if (!/^[a-zA-Z0-9-_]+$/.test(value)) {
            return 'Solo se permiten letras, números, guiones y guiones bajos';
        }
        if (value.startsWith('-') || value.endsWith('-')) {
            return 'El nombre no puede empezar o terminar con guión';
        }
        return undefined;
    };

    // Función para validar el Chain ID
    const validateChainId = (value: string): string | undefined => {
        if (!value.trim()) {
            return 'El Chain ID es requerido';
        }
        const numValue = parseInt(value);
        if (isNaN(numValue)) {
            return 'El Chain ID debe ser un número válido';
        }
        if (numValue <= 0) {
            return 'El Chain ID debe ser un número positivo';
        }
        if (numValue > 4294967295) {
            return 'El Chain ID es demasiado grande (máximo: 4294967295)';
        }
        // Chain IDs reservados más comunes
        const reservedChainIds = [1, 3, 4, 5, 42, 11155111];
        if (reservedChainIds.includes(numValue)) {
            return 'Este Chain ID está reservado para redes públicas';
        }
        return undefined;
    };

    // Función para validar todos los campos
    const validateForm = () => {
        const errors: { name?: string; chainId?: string } = {};

        const nameError = validateNetworkName(name);
        if (nameError) errors.name = nameError;

        const chainIdError = validateChainId(chainId);
        if (chainIdError) errors.chainId = chainIdError;

        setValidationErrors(errors);
        return Object.keys(errors).length === 0;
    };

    // Manejar cambio en el nombre de la red
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setName(value);
        // Validación en tiempo real
        const nameError = validateNetworkName(value);
        setValidationErrors(prev => ({
            ...prev,
            name: nameError
        }));
    };

    // Manejar cambio en el Chain ID
    const handleChainIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setChainId(value);
        // Validación en tiempo real
        const chainIdError = validateChainId(value);
        setValidationErrors(prev => ({
            ...prev,
            chainId: chainIdError
        }));
    };

    // Maneja el envío del formulario
    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validar formulario antes de enviar
        if (!validateForm()) {
            return;
        }

        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/deploy', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ networkName: name, chainId: parseInt(chainId) }),
            });
            if (!res.ok) {
                const errorData = await res.json().catch(() => ({}));
                throw new Error(errorData.error || 'Error al añadir la red');
            }
            // Limpiar formulario y errores al éxito
            setName('');
            setChainId('');
            setValidationErrors({});
            if (onNetworkAdded) onNetworkAdded();
        } catch (err) {
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Error desconocido');
            }
        } finally {
            setLoading(false);
        }
    };

    // Renderizado del formulario
    return (
        <form onSubmit={handleSubmit} className="bg-gradient-to-br from-gray-900 via-blue-950 to-gray-950 border border-gray-800 rounded-2xl shadow-2xl p-8 sm:p-12 w-full max-w-2xl mx-auto text-gray-100 mb-8 flex flex-col gap-8 animate-fade-in" aria-label="Formulario para añadir red Besu">
            <h2 className="text-3xl font-extrabold mb-6 text-cyan-400 tracking-tight text-center drop-shadow-lg" aria-label="Título añadir red">Añadir Red</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <label className="block mb-2 text-purple-300 text-lg font-semibold" htmlFor="network-name">Nombre de la red</label>
                    <input
                        id="network-name"
                        value={name}
                        onChange={handleNameChange}
                        className={`border ${validationErrors.name ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-gray-100 rounded-xl p-4 w-full text-lg focus:outline-none focus:border-cyan-400 transition-colors font-mono placeholder:text-gray-500`}
                        required
                        autoComplete="off"
                        placeholder="Ej: besu-testnet"
                        aria-label="Nombre de la red"
                        aria-invalid={!!validationErrors.name}
                        aria-describedby={validationErrors.name ? "network-name-error" : undefined}
                    />
                    {validationErrors.name && (
                        <p id="network-name-error" className="text-red-400 text-sm mt-2" role="alert">
                            {validationErrors.name}
                        </p>
                    )}
                </div>
                <div>
                    <label className="block mb-2 text-purple-300 text-lg font-semibold" htmlFor="chain-id">Chain ID</label>
                    <input
                        id="chain-id"
                        value={chainId}
                        onChange={handleChainIdChange}
                        className={`border ${validationErrors.chainId ? 'border-red-500' : 'border-gray-700'} bg-gray-800 text-gray-100 rounded-xl p-4 w-full text-lg focus:outline-none focus:border-cyan-400 transition-colors font-mono placeholder:text-gray-500`}
                        required
                        autoComplete="off"
                        placeholder="Ej: 2025"
                        aria-label="Chain ID"
                        type="number"
                        min="1"
                        aria-invalid={!!validationErrors.chainId}
                        aria-describedby={validationErrors.chainId ? "chain-id-error" : undefined}
                    />
                    {validationErrors.chainId && (
                        <p id="chain-id-error" className="text-red-400 text-sm mt-2" role="alert">
                            {validationErrors.chainId}
                        </p>
                    )}
                </div>
            </div>
            <button
                type="submit"
                disabled={loading || Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors])}
                className={`${loading || Object.keys(validationErrors).some(key => validationErrors[key as keyof typeof validationErrors])
                        ? 'bg-gray-600 cursor-not-allowed'
                        : 'bg-gradient-to-r from-blue-500 via-cyan-400 to-cyan-600 hover:from-cyan-500 hover:to-blue-600'
                    } text-white font-bold px-10 py-4 rounded-2xl shadow-lg transition-all text-xl w-full md:w-auto mx-auto mt-4 focus:outline-none focus:ring-2 focus:ring-cyan-400`}
                aria-label="Botón añadir red"
            >
                {loading ? (
                    <span className="flex items-center gap-2 justify-center">
                        <svg className="animate-spin h-6 w-6 text-cyan-200" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" /></svg>
                        Añadiendo...
                    </span>
                ) : (
                    <span className="flex items-center gap-2 justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        Añadir Red
                    </span>
                )}
            </button>
            {/* Mensaje de error si ocurre */}
            {error && <div className="text-red-400 mt-6 text-center text-lg font-semibold" aria-live="polite">{error}</div>}
        </form>
    );
}

"use client";

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAssetsByOwner } from '../../../hooks/useGatewayAssets';
import { useInitiateTransfer } from '../../../hooks/usePendingTransfers';

interface TransferForm {
  assetId: string;
  recipientMSP: string;
  recipientIdentity?: string;
  pickupLocation: string;
  transportMethod: string;
  temperature?: number;
  notes?: string;
  reason?: string;
}

export default function TransferAssetPage() {
  const [formData, setFormData] = useState<TransferForm>({
    assetId: '',
    recipientMSP: 'FactoryMSP',
    pickupLocation: '',
    transportMethod: '',
    temperature: undefined,
    notes: '',
    reason: ''
  });

  const searchParams = useSearchParams();
  const ownerParam = searchParams.get('owner') || undefined;
  // New: try fallback using producer identity CN when owner is an address but chaincode stores CN
  const [producerIdentities, setProducerIdentities] = useState<{ username: string; address: string; fingerprint: string; certFile: string; cn?: string }[]>([]);
  const [ownerCandidate, setOwnerCandidate] = useState<string | undefined>(ownerParam);

  useEffect(() => {
    // initialize candidate from query param
    setOwnerCandidate(ownerParam || undefined);
  }, [ownerParam]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/fabric/identity/list?org=producer.supplychain.com');
        if (!res.ok) return;
        const js = await res.json();
        if (!mounted) return;
        const raw = (js?.identities || []) as Array<Record<string, unknown>>;
        const parsedProducer = raw
          .map((i) => ({ username: String(i.username || ''), address: String(i.address || ''), fingerprint: String(i.fingerprint || ''), certFile: String(i.certFile || ''), cn: i.cn ? String(i.cn) : undefined }))
          .filter((x) => !(x.username || '').toLowerCase().startsWith('admin@'));
        setProducerIdentities(parsedProducer);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  // If ownerCandidate changes, use it to query assets. If initial query by address returns
  // no assets and we have a matching producer identity with CN, retry using CN.
  // Re-run the query by passing ownerCandidate into useAssetsByOwner - we will create a local
  // effect to trigger a retry with CN if needed (see below). For now, get assets using ownerCandidate.
  const { data: candidateAssets = [], isLoading: candidateLoading } = useAssetsByOwner(ownerCandidate);

  // Displayed assets and loading state (driven by ownerCandidate query)
  const displayedAssets = candidateAssets;
  const displayedLoading = candidateLoading;

  useEffect(() => {
    // if no assets found for the candidate and candidate looks like an address, try fallback CN
    if (!candidateLoading && ownerCandidate && candidateAssets.length === 0) {
      const isAddressLike = /^0x[0-9a-fA-F]{8,}$/i.test(ownerCandidate);
      if (isAddressLike && producerIdentities.length > 0) {
        const match = producerIdentities.find(pi => pi.address && pi.address.toLowerCase() === ownerCandidate.toLowerCase());
        if (match && match.cn) {
          console.warn('[TransferPage] fallback: no assets for address, retrying with CN', { address: ownerCandidate, cn: match.cn });
          setOwnerCandidate(match.cn);
        }
      }
    }
  }, [candidateLoading, ownerCandidate, candidateAssets, producerIdentities]);
  // pending transfers UI removed from this route per request
  const { mutateAsync: initiateTransfer, isPending: loading, isError, error, isSuccess: success, reset } = useInitiateTransfer();

  const handleInputChange = (field: keyof TransferForm, value: TransferForm[keyof TransferForm]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const [factoryIdentities, setFactoryIdentities] = useState<{ username: string; address: string; fingerprint: string; certFile: string; cn?: string }[]>([]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/api/fabric/identity/list?org=factory.supplychain.com');
        if (!res.ok) return;
        const js = await res.json();
        if (!mounted) return;
        const rawF = (js?.identities || []) as Array<Record<string, unknown>>;
        const parsedFactory = rawF
          .map((i) => ({ username: String(i.username || ''), address: String(i.address || ''), fingerprint: String(i.fingerprint || ''), certFile: String(i.certFile || ''), cn: i.cn ? String(i.cn) : undefined }))
          .filter((x) => !(x.username || '').toLowerCase().startsWith('admin@'));
        setFactoryIdentities(parsedFactory);
      } catch {
        // ignore
      }
    })();
    return () => { mounted = false; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    reset();

    // Validation
    if (!formData.assetId || !formData.recipientMSP || !formData.pickupLocation || !formData.transportMethod) {
      alert('Please fill in all required fields');
      return;
    }

    const transferData = {
      reason: formData.reason || 'Transfer to next stage of supply chain',
      location: formData.pickupLocation,
      transportMethod: formData.transportMethod,
      temperature: formData.temperature,
      notes: formData.notes,
    };

    try {
      // Determine owner selector (from query param or candidate state)
      const ownerSelector = ownerCandidate || ownerParam;

      // Pre-submit validation: ensure ownerCandidate resolves to a known username
      if (ownerSelector) {
        try {
          const res = await fetch(`/api/fabric/identity/resolve?selector=${encodeURIComponent(ownerSelector)}&org=producer.supplychain.com`);
          // If server responds with non-2xx, treat as unresolved and block submit
          if (!res.ok) {
            let message = `No se pudo resolver la identidad del productor a partir de: ${ownerSelector}.`;
            try {
              const body = await res.json();
              if (body && body.error) message += ` ${body.error}`;
            } catch {
              // ignore
            }
            alert(`${message} Por favor selecciona la identidad (username) listada en el Wallet.`);
            return;
          }

          const js = await res.json();
          if (!js || !js.success || !js.found || !js.found.username) {
            alert(`No se pudo resolver la identidad del productor a partir de: ${ownerSelector}. Por favor selecciona la identidad (username) listada en el Wallet.`);
            return;
          }

          // Use resolved username as owner selector going forward
          // This ensures we only send a username that exists on the server
          // to the backend for per-user submission
          // Note: producerIdentities local match is still used below as fallback
          // but we prioritize the server-resolved username

          // (we'll assign to ownerIdentityToSend later)
        } catch (err) {
          console.warn('[TransferPage] identity resolve failed', err);
          alert(`Error contactando el servidor para resolver la identidad del productor. Intenta de nuevo.`);
          return;
        }
      }

      // find recipientIdentity from selected MSP + dropdown if available (prefer username)
      const selectedFactory = factoryIdentities.find(id => {
        const sel = String(formData.recipientIdentity || formData.recipientMSP || '').toLowerCase();
        return (id.address && id.address.toLowerCase() === sel)
          || (id.username && id.username.toLowerCase() === sel)
          || (id.cn && id.cn.toLowerCase() === sel)
          || (id.certFile && id.certFile.toLowerCase() === sel);
      });
      let recipientIdentity = selectedFactory ? selectedFactory.username : (formData.recipientIdentity || undefined);

      // If recipientIdentity is provided but not a known username, try resolving it via server
      if (recipientIdentity) {
        const isLikelyUsername = /^[^@\s]+@/.test(recipientIdentity); // simple heuristic: contains '@'
        if (!isLikelyUsername) {
          try {
            const r = await fetch(`/api/fabric/identity/resolve?selector=${encodeURIComponent(recipientIdentity)}&org=factory.supplychain.com`);
            if (r.ok) {
              const js = await r.json();
              if (js && js.success && js.found && js.found.username) {
                recipientIdentity = js.found.username;
              } else {
                alert(`No se pudo resolver la identidad del destinatario Factory a partir de: ${recipientIdentity}. Por favor seleccione un usuario de Factory en la lista.`);
                return;
              }
            } else {
              console.warn('[TransferPage] recipient resolve endpoint returned non-ok', r.status);
            }
          } catch (err) {
            console.warn('[TransferPage] recipient resolve failed', err);
          }
        }
      }

      // Try to resolve owner username from producerIdentities (if we have a matching entry)
      let ownerIdentityToSend: string | undefined = undefined;
      if (ownerSelector) {
        // If we can map locally to a username, prefer that
        const producerMatch = producerIdentities.find(pi => {
          const s = ownerSelector.toLowerCase();
          return (pi.address && pi.address.toLowerCase() === s)
            || (pi.username && pi.username.toLowerCase() === s)
            || (pi.cn && pi.cn.toLowerCase() === s)
            || (pi.certFile && pi.certFile.toLowerCase() === s);
        });
        if (producerMatch && producerMatch.username) {
          ownerIdentityToSend = producerMatch.username;
        } else {
          // As we've already performed a server resolve above (and aborted if unresolved),
          // we can safely pass ownerSelector as it's expected to resolve server-side. However,
          // to be conservative, prefer to fetch the resolved username from the resolve endpoint
          try {
            const r = await fetch(`/api/fabric/identity/resolve?selector=${encodeURIComponent(ownerSelector)}&org=producer.supplychain.com`);
            if (r.ok) {
              const js = await r.json();
              if (js && js.success && js.found && js.found.username) {
                ownerIdentityToSend = js.found.username;
              } else {
                // If resolve unexpectedly failed now, abort
                alert(`No se pudo resolver la identidad del productor a partir de: ${ownerSelector}. Por favor selecciona la identidad (username) listada en el Wallet.`);
                return;
              }
            } else {
              alert(`No se pudo resolver la identidad del productor a partir de: ${ownerSelector}. Por favor selecciona la identidad (username) listada en el Wallet.`);
              return;
            }
          } catch (err) {
            console.warn('[TransferPage] owner second-pass resolve failed', err);
            alert(`Error contactando el servidor para resolver la identidad del productor. Intenta de nuevo.`);
            return;
          }
        }
      }

      await initiateTransfer({
        assetId: formData.assetId,
        recipientMSP: formData.recipientMSP,
        transferData,
        recipientIdentity,
        // include explicit owner so the server knows which producer is initiating on behalf of
        ownerIdentity: ownerIdentityToSend
      });

      // Reset form on success
      setFormData({
        assetId: '',
        recipientMSP: '',
        pickupLocation: '',
        transportMethod: '',
        temperature: undefined,
        notes: '',
        reason: ''
      });
    } catch (err: unknown) {
      console.error('Transfer initiation failed:', err instanceof Error ? err.message : String(err));
    }
  };

  // Helper: bind provided ownerCandidate (address) to a chosen username from producerIdentities
  const [binding, setBinding] = useState(false);
  const bindAddressToUsername = async (username: string) => {
    if (!ownerCandidate) return;
    try {
      setBinding(true);
      const res = await fetch('/api/fabric/identity/mapping', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ org: 'producer.supplychain.com', selector: ownerCandidate, username })
      });
      const js = await res.json();
      if (res.ok && js && js.success) {
        alert('Mapping saved. You can now retry the transfer and the server will submit on behalf of the mapped username.');
      } else {
        alert('Failed to save mapping: ' + (js?.error || res.status));
      }
    } catch (e) {
      console.error('bind failed', e);
      alert('Error saving mapping');
    } finally {
      setBinding(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-cyan-50 to-teal-50">
      <div className="container mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center mb-4">
            <a href="/producer" className="mr-4 p-2 hover:bg-white/50 rounded-lg transition-colors">
              <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </a>
            <div>
              <h1 className="text-4xl font-bold text-gray-900">Initiate Transfer Request</h1>
              <p className="text-lg text-gray-600 mt-2">Send transfer requests to recipients for approval (2-step transfer)</p>
            </div>
          </div>

          {/* Success/Error Messages */}
          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <p className="text-green-700 font-medium">Asset transferred successfully!</p>
              </div>
            </div>
          )}

          {isError && error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{error instanceof Error ? error.message : 'Transfer failed'}</p>
              </div>
            </div>
          )}
        </div>

        <div className="max-w-4xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 text-black">
            <form onSubmit={handleSubmit} className="space-y-8 text-black">
              {/* Asset Selection Section */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                    </svg>
                  </div>
                  Select Asset
                </h2>

                <div>
                  <label htmlFor="assetId" className="block text-sm font-semibold text-black mb-3">
                    Choose Asset to Transfer *
                  </label>
                  {displayedLoading ? (
                    <div className="w-full px-4 py-3 bg-gray-200 animate-pulse rounded-xl h-12"></div>
                  ) : (
                    <select
                      id="assetId"
                      name="assetId"
                      required
                      value={formData.assetId}
                      onChange={(e) => handleInputChange('assetId', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 text-black"
                    >
                      <option value="">Choose from your available assets...</option>
                      {displayedAssets.length > 0 ? (
                        displayedAssets.map((asset) => (
                          <option key={asset.id} value={asset.id}>
                            {asset.name} - {asset.id} ({asset.category || 'Raw Material'})
                          </option>
                        ))
                      ) : (
                        <option disabled>No assets available for transfer</option>
                      )}
                    </select>
                  )}
                  <p className="text-xs text-gray-500 mt-2">💡 Only assets you own can be transferred</p>
                </div>
                {/* If ownerCandidate exists but current displayedAssets is empty, offer binding helper */}
                {ownerCandidate && !displayedLoading && displayedAssets.length === 0 && (
                  <div className="mt-4 p-4 bg-yellow-50 border border-yellow-100 rounded-lg">
                    <p className="text-sm text-yellow-800">No assets were found for the provided owner identifier: <code className="font-mono">{ownerCandidate}</code></p>
                    <p className="text-xs text-gray-600 mt-2">If this is an address from your wallet, you can bind it to an existing Producer username so the server can submit transactions on your behalf.</p>
                    <div className="mt-3 flex items-center gap-3">
                      <select className="px-3 py-2 border rounded" onChange={() => { /* noop - handled below */ }} id="bind-username">
                        <option value="">Select username to bind...</option>
                        {producerIdentities.map(pi => (
                          <option key={pi.username} value={pi.username}>{pi.username} — {pi.address}</option>
                        ))}
                      </select>
                      <button type="button" onClick={() => {
                        const sel = (document.getElementById('bind-username') as HTMLSelectElement)?.value;
                        if (!sel) return alert('Select a username to bind');
                        bindAddressToUsername(sel);
                      }} disabled={binding} className="px-4 py-2 bg-yellow-400 text-black rounded">
                        {binding ? 'Binding...' : 'Bind address to username'}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Destination & Transport Section */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  Destination & Transport
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="recipientMSP" className="block text-sm font-semibold text-gray-800 mb-3">
                      Recipient Organization *
                    </label>
                    <select
                      id="recipientMSP"
                      name="recipientMSP"
                      required
                      value={formData.recipientMSP}
                      onChange={(e) => handleInputChange('recipientMSP', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      {/* Only allow Factory as recipient for Producer transfers */}
                      <option value="FactoryMSP">🏭 Factory (Manufacturing)</option>
                    </select>
                    <p className="text-xs text-gray-500 mt-2">⚠️ Producer can only transfer to Factory</p>
                    {/* If Factory selected, show identity dropdown to pick specific Factory user */}
                    {formData.recipientMSP === 'FactoryMSP' && (
                      <div className="mt-4">
                        <label htmlFor="recipientIdentity" className="block text-sm font-semibold text-gray-800 mb-2">Choose Factory Recipient *</label>
                        <select
                          id="recipientIdentity"
                          name="recipientIdentity"
                          value={formData.recipientIdentity || ''}
                          onChange={(e) => handleInputChange('recipientIdentity', e.target.value)}
                          className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        >
                          <option value="">Factory (select user)</option>
                          {factoryIdentities.map((fi) => (
                            <option key={fi.address} value={fi.address}>{fi.cn ? `${fi.cn} — ${fi.address}` : fi.address}</option>
                          ))}
                        </select>
                        <p className="text-xs text-gray-500 mt-2">Select the specific Factory user who should receive this asset</p>
                      </div>
                    )}
                  </div>

                  <div>
                    <label htmlFor="pickupLocation" className="block text-sm font-semibold text-black mb-3">
                      Pickup Location *
                    </label>
                    <input
                      type="text"
                      id="pickupLocation"
                      name="pickupLocation"
                      required
                      value={formData.pickupLocation}
                      onChange={(e) => handleInputChange('pickupLocation', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 text-black"
                      placeholder="Farm address or GPS coordinates"
                    />
                  </div>

                  <div>
                    <label htmlFor="transportMethod" className="block text-sm font-semibold text-gray-800 mb-3">
                      Transport Method *
                    </label>
                    <select
                      id="transportMethod"
                      name="transportMethod"
                      required
                      value={formData.transportMethod}
                      onChange={(e) => handleInputChange('transportMethod', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="">Select transport method...</option>
                      <option value="truck">🚛 Refrigerated Truck</option>
                      <option value="container">📦 Shipping Container</option>
                      <option value="air">✈️ Air Cargo (Express)</option>
                      <option value="rail">🚂 Rail Transport</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="temperature" className="block text-sm font-semibold text-gray-800 mb-3">
                      Required Temperature (°C)
                    </label>
                    <input
                      type="number"
                      id="temperature"
                      name="temperature"
                      step="0.1"
                      value={formData.temperature || ''}
                      onChange={(e) => handleInputChange('temperature', e.target.value ? parseFloat(e.target.value) : undefined)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                      placeholder="e.g., 4.0 for refrigerated transport"
                    />
                  </div>
                </div>
              </div>

              {/* Additional Information Section */}
              <div className="border-b border-gray-200 pb-8">
                <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mr-3">
                    <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  Additional Information
                </h2>

                <div className="space-y-6">
                  <div>
                    <label htmlFor="reason" className="block text-sm font-semibold text-gray-800 mb-3">
                      Transfer Reason
                    </label>
                    <input
                      type="text"
                      id="reason"
                      name="reason"
                      value={formData.reason}
                      onChange={(e) => handleInputChange('reason', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400"
                      placeholder="e.g., Purchase Order #12345, Contract fulfillment..."
                    />
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-semibold text-gray-800 mb-3">
                      Transfer Notes & Instructions
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={4}
                      value={formData.notes}
                      onChange={(e) => handleInputChange('notes', e.target.value)}
                      className="w-full px-4 py-3 bg-white/70 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 placeholder-gray-400 resize-none"
                      placeholder="Special handling instructions, quality requirements, delivery timeframes, contact information for coordination, etc..."
                    />
                  </div>
                </div>
              </div>

              {/* Transfer Preview */}
              <div className="bg-gradient-to-r from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-xl p-6">
                <div className="flex items-start">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-4 flex-shrink-0">
                    <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-blue-900 mb-3">2-Step Transfer Process</h3>
                    <div className="space-y-2 text-blue-800">
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        <strong>Step 1:</strong> You initiate the transfer request (asset is locked)
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        <strong>Step 2:</strong> Recipient must Accept or Reject the transfer
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        Ownership changes <strong>only if accepted</strong> by recipient
                      </p>
                      <p className="flex items-center">
                        <span className="w-2 h-2 bg-blue-500 rounded-full mr-3"></span>
                        All actions are recorded immutably on the blockchain
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 pt-6">
                <button
                  type="submit"
                  disabled={loading || !formData.assetId || !formData.recipientMSP || !formData.pickupLocation || !formData.transportMethod}
                  className={`flex-1 px-8 py-4 rounded-xl font-semibold text-lg flex items-center justify-center transition-all duration-200 shadow-lg hover:shadow-xl ${loading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white hover:from-blue-600 hover:to-cyan-600 transform hover:scale-[1.02]'
                    }`}
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Initiating Transfer...
                    </>
                  ) : (
                    <>
                      <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                      </svg>
                      Initiate Transfer Request
                    </>
                  )}
                </button>
                <a
                  href="/producer"
                  className="px-8 py-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all duration-200 font-semibold text-lg flex items-center justify-center"
                >
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancel
                </a>
              </div>
            </form>
          </div>

          {/* Pending Outgoing Transfers removed from this page by request */}
        </div>
      </div>
    </div>
  );
}
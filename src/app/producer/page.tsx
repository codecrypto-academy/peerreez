'use client';

import Layout from '../../components/layout/Layout';
import ProducerWalletControls from '@/components/wallet/ProducerWalletControls';
import { useAssetsByOwner, useRefetchAssets, Asset } from '../../hooks/useGatewayAssets';
import { useTransferHistory, TransferHistoryAsset } from '../../hooks/useTransferHistory';
import { useInitiateTransfer, usePendingTransfers } from '../../hooks/usePendingTransfers';
import { PendingTransferCard } from '../../components/transfers/PendingTransferCard';
import ContainerLogsCard from '../../components/producer/ContainerLogsCard';
import { useState } from 'react';
import { useWallet } from '@/components/wallet/WalletProvider';
import { PendingTransfer } from '@/types/fabric';

export default function ProducerPage() {
  const [showAssetsList, setShowAssetsList] = useState(false);
  const [showHistoryList, setShowHistoryList] = useState(false);
  const [showOutgoingList, setShowOutgoingList] = useState(false);
  const [transferringAssetId, setTransferringAssetId] = useState<string | null>(null);
  const [showFactoryModal, setShowFactoryModal] = useState(false);

  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [showContainerLogs, setShowContainerLogs] = useState(false);

  // conservative typing for identities coming from server: unknown records
  const [factoryIdentities, setFactoryIdentities] = useState<Array<Record<string, unknown>>>([]);
  const [selectedFactoryIdentity, setSelectedFactoryIdentity] = useState<string | undefined>(undefined);
  const [ownerIdentityToSend, setOwnerIdentityToSend] = useState<string | undefined>(undefined);
  // Using new Gateway hooks with React Query
  const { address } = useWallet();
  const { data: assets = [], isLoading: assetsLoading } = useAssetsByOwner(address || undefined);
  const { data: transferHistory = [], isLoading: historyLoading, refetch: refetchHistory } = useTransferHistory('producer', address || undefined);
  const initiateMutation = useInitiateTransfer();
  const { data: pendingTransfers = [] } = usePendingTransfers(address || undefined);
  const typedPendingTransfers = (pendingTransfers || []) as PendingTransfer[];
  const refreshAssets = useRefetchAssets();

  const transferLoading = initiateMutation.isPending;
  const transferError = initiateMutation.error?.message || null;
  const transferSuccess = initiateMutation.isSuccess;

  // Calcular estadísticas reales basadas en assets cargados
  // IMPORTANTE: useAssetsByOwner() solo devuelve assets que aún pertenecen al Producer
  // Los assets transferidos ya no aparecen aquí (owner cambió a Factory)

  const rawMaterials = assets?.filter((asset: Asset) => asset.type === 'RAW_MATERIAL') || [];

  // Build a set of assetIds that have outgoing pending transfers so we can
  // render a visible "Pending" badge on the producer's assets list without
  // changing ledger-side asset.status (we keep stock visible).
  const pendingOutgoingIds = new Set(
    typedPendingTransfers.filter((t) => t.direction === 'outgoing' && t.status && t.assetId).map((t) => t.assetId)
  );

  const realStats = {
    totalAssets: rawMaterials.length || 0, // Total materias primas en poder del Producer
    transferHistory: (transferHistory as TransferHistoryAsset[]).length || 0, // Assets transferidos a Factory
    loading: assetsLoading || historyLoading,
    error: null
  };

  const handleConfirmFactoryTransfer = async () => {
    if (!transferringAssetId) return;
    setModalLoading(true);
    setModalError(null);
    try {
      await initiateMutation.mutateAsync({
        assetId: transferringAssetId,
        recipientMSP: 'FactoryMSP',
        transferData: {
          pickupLocation: 'Producer Facility',
          transportMethod: 'Standard Truck',
          reason: 'Quick transfer to Factory (via modal)'
        },
        recipientIdentity: selectedFactoryIdentity,
        ownerIdentity: ownerIdentityToSend || address
      });
      // close modal and reset
      setShowFactoryModal(false);
      setTransferringAssetId(null);
      refreshAssets();
    } catch (err: unknown) {
      // Preserve behavior: extract message if Error, otherwise stringify
      setModalError(err instanceof Error ? err.message : String(err));
    } finally {
      setModalLoading(false);
    }
  };

  // Siempre usar stats reales para mostrar datos actualizados
  const displayStats = realStats;

  // Helper to safely read 'quality' which may be a string or an object with a 'grade'
  function getQuality(a: Asset | TransferHistoryAsset) {
    const q = (a as Record<string, unknown>)['quality'];
    if (typeof q === 'string') return q;
    if (q && typeof q === 'object') {
      const grade = (q as Record<string, unknown>)['grade'];
      if (typeof grade === 'string') return grade;
      if (typeof grade === 'number') return String(grade);
    }
    return 'N/A';
  }

  // Handle quick transfer request to factory (2-step process)
  const handleQuickTransfer = async (assetId: string) => {
    // Open modal and preload factory identities + resolve owner identity
    setTransferringAssetId(assetId);
    setModalError(null);
    setModalLoading(true);
    initiateMutation.reset(); // Clear previous state

    try {
      // Load factory identities (conservative unknown->Record narrowing)
      try {
        const res = await fetch('/api/fabric/identity/list?org=factory.supplychain.com');
        if (res.ok) {
          const js = await res.json();
          const ids: unknown[] = js?.identities || [];
          // filter out admin usernames
          const filtered = ids.filter((i: unknown) => {
            const obj = i as Record<string, unknown>;
            const uname = String(obj['username'] || obj['address'] || '');
            return !uname.toLowerCase().includes('admin');
          }) as Array<Record<string, unknown>>;
          setFactoryIdentities(filtered.length ? filtered : (ids as Array<Record<string, unknown>>));
          const preferred = (filtered.length ? filtered[0] : (ids[0] as Record<string, unknown>)) || undefined;
          setSelectedFactoryIdentity(preferred ? String(preferred['username'] || preferred['address'] || '') : undefined);
        }
      } catch {
        // ignore - modal will still allow MSP-only transfer
        setFactoryIdentities([]);
        setSelectedFactoryIdentity(undefined);
      }

      // Resolve owner identity for the connected address
      let resolvedOwner: string | undefined = undefined;
      if (address) {
        try {
          const pres = await fetch('/api/fabric/identity/list?org=producer.supplychain.com');
          if (pres.ok) {
            const pjs = await pres.json();
            const pids: unknown[] = pjs?.identities || [];
            const match = pids.find((p: unknown) => {
              const pp = p as Record<string, unknown>;
              const addr = pp['address'];
              return typeof addr === 'string' && address && addr.toLowerCase() === address.toLowerCase();
            }) as Record<string, unknown> | undefined;
            if (match) resolvedOwner = String(match['username'] || match['address'] || undefined);
          }
        } catch {
          // fallthrough
        }

        if (!resolvedOwner) {
          try {
            const rr = await fetch(`/api/fabric/identity/resolve?selector=${encodeURIComponent(address)}&org=producer.supplychain.com`);
            if (rr.ok) {
              const rjs = await rr.json();
              if (rjs && rjs.success && rjs.found && rjs.found.username) {
                resolvedOwner = rjs.found.username;
              }
            }
          } catch {
            // ignore - we'll allow owner to default to address in modal
          }
        }
      }

      setOwnerIdentityToSend(resolvedOwner || address || undefined);
      setShowFactoryModal(true);
    } finally {
      setModalLoading(false);
    }
  };

  const toggleAssetsList = () => {
    setShowAssetsList(!showAssetsList);
    if (!showAssetsList && assets.length === 0) {
      refreshAssets();
    }
  };

  // ProducerIdentitySelector removed per UI simplification request

  return (
    <Layout title="Producer Dashboard" description="Manage your raw materials and supply chain operations">
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
        <div className="container mx-auto px-6 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Producer Dashboard</h1>
            <p className="text-lg text-gray-600">Manage your raw materials and supply chain operations</p>
            <div className="mt-4">
              {/* Wallet selector for Producer role - full width card */}
              <ProducerWalletControls />

              {/* New: Producer identity selector + Connect (UI-only) */}
              {/* Producer identity selector removed */}
            </div>
            {displayStats.error && (
              <div className="mt-2 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">⚠️ {displayStats.error}</p>
              </div>
            )}
          </div>

          {/* Success/Error Messages */}
          {transferSuccess && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-green-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                <div className="flex-1">
                  <p className="text-green-700 font-medium">Transfer request sent to Factory successfully!</p>
                  <p className="text-green-600 text-sm mt-1">⏳ Waiting for Factory to accept the transfer request</p>
                </div>
                <button onClick={() => initiateMutation.reset()} className="ml-auto text-green-600 hover:text-green-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {transferError && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <div className="flex items-center">
                <svg className="w-5 h-5 text-red-400 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-red-700">{transferError}</p>
                <button onClick={() => initiateMutation.reset()} className="ml-auto text-red-600 hover:text-red-800">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}

          {/* Stats Cards CON DATOS REALES */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {/* Clickeable Total Assets Card */}
            <div
              onClick={toggleAssetsList}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-500">Total Assets</p>
                    <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showAssetsList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {displayStats.loading ? (
                    <div className="w-16 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-3xl font-bold text-green-600 group-hover:text-green-700 transition-colors">{displayStats.totalAssets}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Click to view assets</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center group-hover:bg-green-200 transition-colors">
                  <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                </div>
              </div>
            </div>

            <div
              onClick={() => setShowHistoryList(!showHistoryList)}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-500">Transfer History</p>
                    <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showHistoryList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  {displayStats.loading ? (
                    <div className="w-12 h-8 bg-gray-200 animate-pulse rounded mt-1"></div>
                  ) : (
                    <p className="text-3xl font-bold text-emerald-600 group-hover:text-emerald-700 transition-colors">{displayStats.transferHistory}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Completed transfers</p>
                </div>
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center group-hover:bg-emerald-200 transition-colors">
                  <svg className="w-6 h-6 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Outgoing to Factory Card */}
            <div
              onClick={() => {
                const next = !showOutgoingList;
                setShowOutgoingList(next);
                if (next) setTimeout(() => { const el = document.getElementById('producerOutgoingSection'); if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' }); }, 120);
              }}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500">Pending → Factory</p>
                  <p className="text-3xl font-bold text-amber-600">{typedPendingTransfers.filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('factory')).length}</p>
                </div>
                <div className="flex flex-col items-center gap-2">
                  <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform">
                    <svg className="w-6 h-6 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${showOutgoingList ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>
            {/* Container Logs Card Expandible */}
            <div
              onClick={() => setShowContainerLogs((prev) => !prev)}
              className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 cursor-pointer hover:shadow-xl hover:scale-105 transition-all duration-200 group"
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center">
                    <p className="text-sm font-medium text-gray-500">Container Logs</p>
                    <svg className={`w-4 h-4 ml-2 text-gray-400 transition-transform duration-200 ${showContainerLogs ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                  <p className="text-3xl font-bold text-gray-600 group-hover:text-gray-700 transition-colors">--</p>
                  <p className="text-xs text-gray-400 mt-1">View container logs</p>
                </div>
                <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center group-hover:bg-gray-200 transition-colors">
                  <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Register New Assets */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Register Raw Materials</h2>
                  <p className="text-gray-600 mt-1">Begin your supply chain journey</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Register new raw materials with complete traceability information to start the supply chain process with full transparency.
              </p>

              <a
                href={`/producer/register${address ? `?owner=${encodeURIComponent(address)}` : ''}`}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 text-white font-semibold rounded-xl hover:from-green-600 hover:to-emerald-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Register New Asset
              </a>
            </div>

            {/* Transfer Assets */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 hover:shadow-2xl transition-all duration-300 group">
              <div className="flex items-center mb-6">
                <div className="w-14 h-14 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform duration-300">
                  <svg className="w-7 h-7 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Transfer to Factory</h2>
                  <p className="text-gray-600 mt-1">Send materials for processing</p>
                </div>
              </div>

              <p className="text-gray-600 mb-6 leading-relaxed">
                Transfer your registered materials to manufacturing facilities with secure blockchain transactions and complete audit trail.
              </p>

              <a
                href={`/producer/transfer${address ? `?owner=${encodeURIComponent(address)}` : ''}`}
                className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold rounded-xl hover:from-blue-600 hover:to-cyan-600 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                </svg>
                Transfer Assets
              </a>
            </div>
          </div>

          {/* Outgoing Pending Transfers to Factory (collapsible) */}
          {showOutgoingList && typedPendingTransfers.some((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('factory')) && (
            <div id="producerOutgoingSection" className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8">
              <h2 className="text-2xl font-semibold text-gray-900 mb-6 flex items-center">
                <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center mr-3">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                Outgoing Transfers to Factory
                <span className="ml-3 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                  {typedPendingTransfers.filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('factory')).length}
                </span>
                <button
                  onClick={() => { refreshAssets(); }}
                  className="ml-auto px-3 py-1 bg-gray-50 border border-gray-200 rounded-lg text-sm hover:bg-gray-100"
                >
                  Refresh
                </button>
              </h2>

              <div className="grid grid-cols-1 gap-4">
                {typedPendingTransfers
                  .filter((t) => t.direction === 'outgoing' && (t.toMSP || '').toLowerCase().includes('factory'))
                  .map((transfer) => (
                    <div key={transfer.id} className="p-0">
                      {/* Use PendingTransferCard so initiator can Cancel inline */}
                      <PendingTransferCard
                        transfer={transfer}
                        onSuccess={() => {
                          // Trigger a lightweight refetch of assets and pending transfers
                          refreshAssets();
                        }}
                      />
                    </div>
                  ))}
              </div>
            </div>
          )}
          {/* Container Logs Expandible Content */}
          {showContainerLogs && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
              <ContainerLogsCard />
            </div>
          )}
          {/* Expandable Assets Section */}
          {showAssetsList && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">My Raw Materials</h2>
                    <p className="text-gray-600">View and manage all your registered assets</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      refreshAssets();
                    }}
                    disabled={assetsLoading || displayStats.loading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-gray-700 font-medium transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {assetsLoading ? 'Refreshing...' : 'Refresh'}
                  </button>

                  <button
                    onClick={() => setShowAssetsList(false)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
              </div>

              {/* Asset List with Transfer Buttons */}
              <div className="space-y-4">
                {assetsLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Loading assets from Hyperledger Fabric...</span>
                    </div>
                  </div>
                ) : assets && assets.length > 0 ? (
                  assets.filter((asset: Asset) => asset.type === 'RAW_MATERIAL').map((asset: Asset) => (
                    <div key={asset.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-gray-200 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">
                            {asset.category === 'cotton' ? '🌱' :
                              asset.category === 'wheat' ? '🌾' :
                                '📦'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                          <p className="text-sm text-gray-600">ID: {asset.id}</p>
                          <p className="text-sm text-gray-500">Category: {asset.category} • Quality: {getQuality(asset)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          {/* If there's an outgoing pending transfer for this asset, show a pending badge */}
                          {pendingOutgoingIds.has(asset.id) ? (
                            <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              PENDING
                            </span>
                          ) : (
                            <span className={`px-3 py-1 rounded-full text-xs font-medium ${asset.status === 'CREATED' ? 'bg-green-100 text-green-800' :
                              asset.status === 'IN_TRANSIT' ? 'bg-blue-100 text-blue-800' :
                                asset.status === 'CONSUMED' ? 'bg-purple-100 text-purple-800' :
                                  'bg-gray-100 text-gray-800'
                              }`}>
                              {asset.status}
                            </span>
                          )}
                          <p className="text-xs text-gray-500 mt-1">
                            Created: {new Date(asset.createdAt).toLocaleDateString()}
                          </p>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          {asset.status === 'CREATED' && (
                            <>
                              <button
                                onClick={() => handleQuickTransfer(asset.id)}
                                disabled={transferLoading && transferringAssetId === asset.id}
                                className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${transferLoading && transferringAssetId === asset.id
                                  ? 'bg-gray-400 cursor-not-allowed text-white'
                                  : 'bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transform hover:scale-105'
                                  }`}
                              >
                                {transferLoading && transferringAssetId === asset.id ? (
                                  <>
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white inline" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Transferring...
                                  </>
                                ) : (
                                  <>
                                    <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                                    </svg>
                                    Request Transfer
                                  </>
                                )}
                              </button>

                              <a
                                href={`/producer/transfer?assetId=${asset.id}${address ? `&owner=${encodeURIComponent(address)}` : ''}`}
                                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-medium transition-all duration-200 border border-gray-300 hover:border-gray-400"
                              >
                                <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
                                </svg>
                                Advanced Transfer
                              </a>
                            </>
                          )}

                          {asset.status === 'IN_TRANSIT' && (
                            <div className="px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 font-medium">
                              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              In Transit
                            </div>
                          )}

                          {asset.status === 'CONSUMED' && (
                            <div className="px-4 py-2 bg-purple-50 text-purple-700 rounded-lg border border-purple-200 font-medium">
                              <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Processed
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Raw Materials Found</h3>
                    <p className="text-gray-500 mb-4">Create your first raw material to start your supply chain journey.</p>
                    <a
                      href={`/producer/register${address ? `?owner=${encodeURIComponent(address)}` : ''}`}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                      Register First Asset
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Transfer History Assets Section */}
          {showHistoryList && (
            <div className="mt-8 bg-white/80 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-8 animate-in slide-in-from-top-2 duration-300">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-500 rounded-xl flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Transfer History</h2>
                    <p className="text-gray-600">Assets transferred to Factory</p>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => refetchHistory()}
                    disabled={historyLoading}
                    className="px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 rounded-lg text-gray-700 font-medium transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {historyLoading ? 'Refreshing...' : 'Refresh'}
                  </button>

                  <button
                    onClick={() => setShowHistoryList(false)}
                    className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 font-medium rounded-lg transition-colors duration-200"
                  >
                    <svg className="w-5 h-5 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    Close
                  </button>
                </div>
              </div>

              {/* Transfer History Asset List */}
              <div className="space-y-4">
                {historyLoading ? (
                  <div className="flex items-center justify-center p-8">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-gray-600">Loading transfer history...</span>
                    </div>
                  </div>
                ) : transferHistory.length > 0 ? (
                  transferHistory.map((asset: TransferHistoryAsset) => (
                    <div key={asset.id} className="flex items-center justify-between p-6 bg-white rounded-xl border border-emerald-200 hover:shadow-lg transition-all duration-200">
                      <div className="flex items-center space-x-4">
                        <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center">
                          <span className="text-2xl">
                            {asset.category === 'cotton' ? '🌱' :
                              asset.category === 'wheat' ? '🌾' :
                                '📦'}
                          </span>
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900">{asset.name}</h3>
                          <p className="text-sm text-gray-600">ID: {asset.id}</p>
                          <p className="text-sm text-gray-500">Category: {asset.category} • Quality: {getQuality(asset)}</p>
                        </div>
                      </div>

                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            TRANSFERRED
                          </span>
                          <p className="text-xs text-gray-500 mt-1">
                            {asset.transferHistory && asset.transferHistory.length > 0
                              ? `Transferred: ${new Date(asset.transferHistory[asset.transferHistory.length - 1].timestamp).toLocaleDateString()}`
                              : `Created: ${new Date(asset.createdAt).toLocaleDateString()}`}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            Current Owner: {asset.currentOwner?.includes('factory') ? '🏭 Factory' : asset.currentOwner?.split('@')[1]?.split('.')[0] || 'Unknown'}
                          </p>
                        </div>

                        {/* Info Badge */}
                        <div className="px-4 py-2 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 font-medium">
                          <svg className="w-4 h-4 inline mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Completed
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No Transfer History</h3>
                    <p className="text-gray-500">You haven&apos;t transferred any assets to Factory yet.</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Factory selection modal */}
      {showFactoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black opacity-40" onClick={() => { if (!modalLoading) { setShowFactoryModal(false); setTransferringAssetId(null); } }} />
          <div className="bg-white rounded-lg shadow-xl z-60 w-11/12 max-w-lg p-6">
            <h3 className="text-lg font-semibold mb-3 text-black">Select Factory recipient</h3>
            <p className="text-sm text-black mb-4">Choose which Factory user should receive asset <span className="font-mono">{transferringAssetId}</span></p>

            <div className="mb-4">
              <label className="block text-sm text-black mb-2">Factory User</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black"
                value={selectedFactoryIdentity || ''}
                onChange={(e) => setSelectedFactoryIdentity(e.target.value || undefined)}
                disabled={modalLoading}
              >
                <option className="text-black" value="">-- Select Factory user (or leave blank to use MSP) --</option>
                {factoryIdentities.map((f: Record<string, unknown>) => (
                  <option className="text-black" key={String(f['username'] || f['address'] || '')} value={String(f['username'] || f['address'] || '')}>
                    {f['username'] ? `${String(f['username'])} (${String(f['address'] || 'addr')})` : String(f['address'] || '')}
                  </option>
                ))}
              </select>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-black mb-2">Submitting as (owner)</label>
              <div className="px-3 py-2 border border-gray-200 rounded-lg bg-gray-50 text-sm text-black">{ownerIdentityToSend || address || 'Unknown'}</div>
            </div>

            {modalError && <div className="mb-3 text-sm text-red-700">{modalError}</div>}

            <div className="flex justify-end gap-3">
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-black" onClick={() => { if (!modalLoading) { setShowFactoryModal(false); setTransferringAssetId(null); } }} disabled={modalLoading}>Cancel</button>
              <button className="px-4 py-2 rounded-lg bg-gray-100 text-black border border-gray-300" onClick={handleConfirmFactoryTransfer} disabled={modalLoading}>
                {modalLoading ? 'Sending...' : 'Confirm Transfer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}

// Note: Modal markup is appended to the component return via React portal-style in same file

export function ProducerFactoryModalWrapper() {
  // This wrapper reads nothing; the real stateful modal is rendered in the ProducerPage scope.
  return null;
}

// To keep things simple (no portal), append a small modal render function that will be
// included by the bundler. The actual visibility is controlled by the state in ProducerPage.

// NOTE: We can't directly access the ProducerPage's state from here; the modal JSX was
// injected inline earlier. If further refactor is needed, we can move modal to its own component.
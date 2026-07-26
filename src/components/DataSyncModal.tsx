import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle, 
  Database, 
  UploadCloud, 
  DownloadCloud, 
  X,
  Layers,
  Activity,
  ArrowRightLeft
} from 'lucide-react';
import { KemetDB } from '../utils/mockDb';
import { 
  reconcileDatabaseWithFirestore, 
  verifyFirestoreSync, 
  SyncStatusReport, 
  ReconciliationResult 
} from '../utils/firestoreDb';

interface DataSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  db: KemetDB;
  onDbUpdated: (newDb: KemetDB) => void;
}

export default function DataSyncModal({ isOpen, onClose, db, onDbUpdated }: DataSyncModalProps) {
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [report, setReport] = useState<SyncStatusReport | null>(null);
  const [lastReconciliation, setLastReconciliation] = useState<ReconciliationResult | null>(null);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);

  // Listen to network status changes
  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      addLog('Network restored: Device back online.');
      handleVerify();
    };

    const handleOffline = () => {
      setIsOnline(false);
      addLog('Network transition: Device currently offline. Operations queued locally.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (isOpen) {
      handleVerify();
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOpen]);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setSyncLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 20)]);
  };

  const handleVerify = async () => {
    setIsSyncing(true);
    addLog('Verifying local cache vs Firestore remote documents...');
    try {
      const status = await verifyFirestoreSync(db);
      setReport(status);
      if (status.isSynced) {
        addLog('Verification Complete: Local state and Firestore collections are perfectly synchronized.');
      } else if (!status.isOnline) {
        addLog('Verification Pending: Device offline. Local storage serving cached records.');
      } else {
        addLog(`Verification Notice: Found record mismatch (Local: ${status.totalLocal}, Remote: ${status.totalRemote}). Reconciliation recommended.`);
      }
    } catch (err) {
      addLog(`Verification Failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleReconcile = async () => {
    if (!isOnline) {
      addLog('Reconciliation skipped: Network offline.');
      return;
    }

    setIsSyncing(true);
    addLog('Initiating bi-directional data reconciliation & conflict resolution...');
    try {
      const res = await reconcileDatabaseWithFirestore(db);
      setLastReconciliation(res);
      if (res.errors.length > 0) {
        addLog(`Reconciliation completed with warnings: ${res.errors.join('; ')}`);
      } else {
        addLog(`Reconciliation Success: ${res.syncedCount} total records verified. Remote merged: +${res.remoteAddedCount}, Local uploaded: +${res.localUploadedCount}, Conflicts resolved: ${res.conflictsResolved}.`);
      }
      onDbUpdated(res.mergedDb);
      // Re-verify after merging
      const updatedReport = await verifyFirestoreSync(res.mergedDb);
      setReport(updatedReport);
    } catch (err) {
      addLog(`Reconciliation Error: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setIsSyncing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-slate-200 overflow-hidden my-8"
        >
          {/* Header */}
          <div className="bg-slate-900 text-white p-5 flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-xl ${isOnline ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
              </div>
              <div>
                <h3 className="font-bold text-lg text-white">Firestore & Local DB Synchronization</h3>
                <p className="text-xs text-slate-400">Reconcile offline cache with Firebase cloud storage</p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto">
            {/* Connection & Network Status Banner */}
            <div className={`p-4 rounded-xl border flex items-center justify-between ${
              isOnline ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-amber-50 border-amber-200 text-amber-900'
            }`}>
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-sm">
                    {isOnline ? 'Network Connection Active' : 'Offline Mode Active'}
                  </div>
                  <div className="text-xs opacity-80">
                    {isOnline 
                      ? 'Connected to Firestore. Reads/writes are synced directly.' 
                      : 'Network offline. Operations are buffered in local storage and will reconcile on reconnect.'}
                  </div>
                </div>
              </div>
              <span className={`px-2.5 py-1 text-xs font-medium rounded-full ${
                isOnline ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
              }`}>
                {isOnline ? 'ONLINE' : 'OFFLINE'}
              </span>
            </div>

            {/* Reconciliation Stats Card */}
            {lastReconciliation && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <div className="flex items-center gap-2 font-semibold text-slate-800 text-sm mb-3">
                  <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
                  Last Reconciliation Summary
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-medium">Total Verified</div>
                    <div className="text-lg font-bold text-slate-800">{lastReconciliation.syncedCount}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-medium">Remote Pulled</div>
                    <div className="text-lg font-bold text-emerald-600">+{lastReconciliation.remoteAddedCount}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-medium">Local Uploaded</div>
                    <div className="text-lg font-bold text-blue-600">+{lastReconciliation.localUploadedCount}</div>
                  </div>
                  <div className="bg-white p-3 rounded-lg border border-slate-200 text-center">
                    <div className="text-xs text-slate-500 font-medium">Conflicts Merged</div>
                    <div className="text-lg font-bold text-purple-600">{lastReconciliation.conflictsResolved}</div>
                  </div>
                </div>
              </div>
            )}

            {/* Collection Verification Matrix */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-bold text-slate-800 flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  Collection Verification Matrix
                </div>
                {report && (
                  <div className="text-xs text-slate-500">
                    Local: <span className="font-semibold text-slate-700">{report.totalLocal}</span> | 
                    Remote: <span className="font-semibold text-slate-700">{report.totalRemote}</span>
                  </div>
                )}
              </div>

              <div className="bg-white border border-slate-200 rounded-xl divide-y divide-slate-100 text-xs">
                {report?.collectionStats.map(stat => (
                  <div key={stat.collection} className="p-3 flex items-center justify-between hover:bg-slate-50/80 transition">
                    <div className="flex items-center gap-2 font-medium text-slate-700 capitalize">
                      <Layers className="w-3.5 h-3.5 text-slate-400" />
                      {stat.collection}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">
                        Local: <strong className="text-slate-800">{stat.localCount}</strong>
                      </span>
                      <span className="text-slate-500">
                        Remote: <strong className="text-slate-800">{stat.remoteCount >= 0 ? stat.remoteCount : '—'}</strong>
                      </span>
                      <span className={`px-2 py-0.5 rounded font-medium ${
                        stat.synced ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                      }`}>
                        {stat.synced ? 'IN SYNC' : 'PENDING'}
                      </span>
                    </div>
                  </div>
                ))}

                {!report && (
                  <div className="p-4 text-center text-slate-400">
                    Click "Verify Sync" to inspect collection document states.
                  </div>
                )}
              </div>
            </div>

            {/* Synchronization Activity Log */}
            <div>
              <div className="text-xs font-bold text-slate-700 mb-2 flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-slate-500" />
                Network & Sync Console Output
              </div>
              <div className="bg-slate-900 text-emerald-400 font-mono text-xs p-3 rounded-xl h-32 overflow-y-auto space-y-1 border border-slate-800">
                {syncLogs.length === 0 ? (
                  <div className="text-slate-500 italic">Console output initialized...</div>
                ) : (
                  syncLogs.map((log, idx) => (
                    <div key={idx} className="leading-tight">{log}</div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="bg-slate-50 p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <button
                onClick={handleVerify}
                disabled={isSyncing}
                className="px-4 py-2 bg-white border border-slate-300 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-100 transition flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-emerald-600' : ''}`} />
                Verify Sync
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleReconcile}
                disabled={isSyncing || !isOnline}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl transition shadow-sm flex items-center gap-2 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                {isSyncing ? 'Reconciling Data...' : 'Reconcile & Sync Data'}
              </button>
              <button
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-xl transition"
              >
                Close
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Tractor, 
  Map, 
  MessageSquare, 
  CloudRain, 
  CheckSquare, 
  BookOpen, 
  Info,
  ExternalLink,
  Github,
  CheckCircle,
  Database,
  ArrowRight,
  TrendingUp,
  Sparkles,
  Bot,
  Maximize2,
  Minimize2,
  User,
  HardDrive,
  ShieldCheck,
  Upload,
  Camera,
  Wallet,
  Radio,
  Calendar,
  Wifi,
  WifiOff,
  RefreshCw,
  ArrowRightLeft,
  ChevronDown,
  ChevronRight,
  Layers
} from 'lucide-react';
import { loadDatabase, saveDatabase, handleInboundWhatsApp, assignDailyTask, triggerWeatherAlert } from './utils/mockDb';
import { initializeFirestoreData, syncDatabaseToFirestore, reconcileDatabaseWithFirestore, verifyFirestoreSync, syncUserProfileToFirestore, ADMIN_USER_ID } from './utils/firestoreDb';
import { CropLog, Field, StaffMember, WhatsAppMessage } from './types';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from './lib/firebase';

// Import our modular components
import Dashboard from './components/Dashboard';
import AdminDashboard from './components/AdminDashboard';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import WeatherTriggerPanel from './components/WeatherTriggerPanel';
import Checklist from './components/Checklist';
import SOPDocs from './components/SOPDocs';
import Analytics from './components/Analytics';
import AiAssistantSidebar from './components/AiAssistantSidebar';
import AuthModal from './components/AuthModal';
import StorageManagerModal from './components/StorageManagerModal';
import MediaIngestionPanel from './components/MediaIngestionPanel';
import SeedFundLedger from './components/SeedFundLedger';
import CommandDispatchPanel from './components/CommandDispatchPanel';
import MaintenanceTracker from './components/MaintenanceTracker';
import DataSyncModal from './components/DataSyncModal';

export default function App() {
  const [db, setDb] = useState(() => loadDatabase());
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [preFilledText, setPreFilledText] = useState<string>('');
  const [isAiSidebarOpen, setIsAiSidebarOpen] = useState<boolean>(true);
  const [densityMode, setDensityMode] = useState<'compact' | 'detailed'>('detailed');
  const [isAdvancedModulesOpen, setIsAdvancedModulesOpen] = useState<boolean>(false);

  // Auth, Storage & Sync Modals state
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);
  const [isStorageModalOpen, setIsStorageModalOpen] = useState<boolean>(false);
  const [isSyncModalOpen, setIsSyncModalOpen] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [isOnline, setIsOnline] = useState<boolean>(navigator.onLine);
  const [syncStatus, setSyncStatus] = useState<'synced' | 'syncing' | 'offline' | 'error'>('synced');

  // Listen to Firebase Auth state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await syncUserProfileToFirestore(user);
        if (user.uid === ADMIN_USER_ID) {
          setActiveView('admin');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Monitor Network Transitions and trigger automated reconciliation on reconnect
  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      setSyncStatus('syncing');
      try {
        const res = await reconcileDatabaseWithFirestore(db);
        if (res.mergedDb) {
          setDb(res.mergedDb);
          saveDatabase(res.mergedDb);
        }
        setSyncStatus('synced');
      } catch (e) {
        console.error('Auto-reconciliation on reconnect error:', e);
        setSyncStatus('error');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus('offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [db]);

  // Initialize Firestore seed data and reconcile on boot
  useEffect(() => {
    const bootSync = async () => {
      if (navigator.onLine) {
        setSyncStatus('syncing');
        await initializeFirestoreData(db);
        const res = await reconcileDatabaseWithFirestore(db);
        if (res.mergedDb) {
          setDb(res.mergedDb);
          saveDatabase(res.mergedDb);
        }
        setSyncStatus('synced');
      } else {
        setSyncStatus('offline');
      }
    };
    bootSync();
  }, []);

  // Auto-sync React State to LocalStorage Database and Firebase Firestore
  useEffect(() => {
    saveDatabase(db);
    syncDatabaseToFirestore(db);
  }, [db]);

  // Handlers
  const handleAssignTask = (fieldId: string, actionType: string, staffId: string) => {
    setDb(prevDb => assignDailyTask(prevDb, fieldId, actionType, staffId));
  };

  const handleVerifyTask = (logId: string) => {
    setDb(prevDb => {
      const updatedLogs = prevDb.cropLogs.map(log => 
        log.id === logId 
          ? { ...log, verified_at: new Date().toISOString() } 
          : log
      );
      return { ...prevDb, cropLogs: updatedLogs };
    });
  };

  const handleAddCustomLog = (newLogData: Omit<CropLog, 'id' | 'recorded_at'>) => {
    const newLog: CropLog = {
      ...newLogData,
      id: crypto.randomUUID(),
      recorded_at: new Date().toISOString()
    };
    setDb(prevDb => ({
      ...prevDb,
      cropLogs: [...prevDb.cropLogs, newLog]
    }));
  };

  const handleInboundWhatsAppMessage = (fromPhone: string, body: string) => {
    const { updatedDb, twilioPayload, responseMessage } = handleInboundWhatsApp(db, fromPhone, body);
    setDb(updatedDb);
    return { twilioPayload, responseMessage };
  };

  const handleTriggerWeatherAlert = (fieldId: string, alertType: 'RAIN' | 'HEAT', metricVal: number) => {
    setDb(prevDb => triggerWeatherAlert(prevDb, fieldId, alertType, metricVal));
  };

  const handleClearWeatherAlerts = () => {
    setDb(prevDb => {
      const restoredFields = prevDb.fields.map(f => ({
        ...f,
        currentTask: undefined,
        soilMoisture: f.crop_type === 'PALM' ? 45 : 60 // Reset to baseline
      }));
      alert('Weather alerts deactivated. Fields restored to standard atmospheric baselines.');
      return {
        ...prevDb,
        fields: restoredFields
      };
    });
  };

  // Nav definitions
  const isAdminUser = currentUser?.uid === ADMIN_USER_ID;

  const primaryNavigationItems = [
    ...(isAdminUser ? [{ id: 'admin', label: 'Admin View', icon: ShieldCheck, badge: 'ADMIN' }] : []),
    { id: 'dashboard', label: 'Operations Dashboard', icon: Tractor },
    { id: 'media', label: 'Media & Gemini Vision', icon: Camera },
    { id: 'ledger', label: 'Seed Fund Ledger', icon: Wallet },
    { id: 'dispatch', label: 'Command Dispatch', icon: Radio },
    { id: 'maintenance', label: 'Maintenance Schedule', icon: Calendar },
  ];

  const advancedNavigationItems = [
    { id: 'analytics', label: 'Analytics Insights', icon: TrendingUp },
    { id: 'weather', label: 'Weather Telemetry', icon: CloudRain },
    { id: 'checklist', label: 'Pre-flight Checklist', icon: CheckSquare },
    { id: 'sop', label: 'Staff SOPs', icon: BookOpen },
    { id: 'whatsapp', label: 'WhatsApp Bot', icon: MessageSquare }
  ];

  const navigationItems = [...primaryNavigationItems, ...advancedNavigationItems];
  const isAdvancedActive = advancedNavigationItems.some(item => item.id === activeView);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-gray-800">
      
      {/* LEFT NAVIGATION DRAWER (Desktop) / TOP PANEL (Mobile) */}
      <aside className="w-full md:w-64 bg-slate-900 text-white flex-shrink-0 flex flex-col border-r border-slate-800">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <div className="p-1.5 bg-emerald-600 rounded-lg text-slate-900">
              <Tractor size={18} />
            </div>
            <div>
              <h1 className="font-semibold text-sm tracking-wider uppercase font-display text-white">Kemet Farms OS</h1>
              <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-widest block mt-0.5">CORE ENGINE ACTIVE</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {/* Primary Core Navigation Items */}
          <div className="space-y-1">
            {primaryNavigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setPreFilledText('');
                  }}
                  className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                    isActive 
                      ? 'bg-emerald-600 text-slate-900 shadow-xs font-bold' 
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Icon size={16} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge && (
                    <span className="px-2 py-0.5 bg-emerald-400 text-slate-950 text-3xs font-extrabold font-mono rounded-full">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Secondary "Advanced Modules" Dropdown */}
          <div className="pt-3 border-t border-slate-800/80 mt-2">
            <button
              onClick={() => setIsAdvancedModulesOpen(prev => !prev)}
              className={`w-full p-2.5 rounded-xl text-left text-xs font-semibold flex items-center justify-between transition-all cursor-pointer ${
                isAdvancedActive 
                  ? 'bg-slate-800 text-emerald-400 font-bold border border-emerald-800/60' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <div className="flex items-center space-x-2.5">
                <Layers size={15} className="text-emerald-400" />
                <span>Advanced Modules</span>
              </div>
              {(isAdvancedModulesOpen || isAdvancedActive) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
            </button>

            {(isAdvancedModulesOpen || isAdvancedActive) && (
              <div className="mt-1.5 pl-2 space-y-1 border-l-2 border-slate-800 ml-3">
                {advancedNavigationItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeView === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActiveView(item.id);
                        setPreFilledText('');
                      }}
                      className={`w-full p-2 rounded-lg text-left text-xs font-medium flex items-center space-x-2.5 transition-all cursor-pointer ${
                        isActive 
                          ? 'bg-emerald-600 text-slate-900 shadow-xs font-bold' 
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                      }`}
                    >
                      <Icon size={14} />
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* AI Assistant Dedicated Sidebar Toggle Button */}
          <div className="pt-3 border-t border-slate-800/80">
            <button
              onClick={() => setIsAiSidebarOpen(true)}
              className="w-full p-3 rounded-xl text-left text-xs font-bold flex items-center justify-between bg-gradient-to-r from-emerald-950 via-slate-900 to-slate-900 border border-emerald-800/60 text-emerald-400 hover:border-emerald-500 hover:text-emerald-300 transition-all cursor-pointer group shadow-sm"
            >
              <div className="flex items-center space-x-2.5">
                <Sparkles size={16} className="text-emerald-400 group-hover:rotate-12 transition-transform" />
                <span>AI Agronomist</span>
              </div>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded font-bold border border-emerald-500/30">
                OPEN
              </span>
            </button>
          </div>
        </nav>

        {/* Connected Database Panel */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="flex justify-between items-center text-3xs text-slate-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
              <Database size={10} className="text-emerald-500 animate-pulse" />
              <span>Firebase Status</span>
            </span>
            <span className="font-mono bg-emerald-950 text-emerald-400 px-1.5 py-0.5 rounded text-[8px] font-bold border border-emerald-800/60">FIRESTORE CONNECTED</span>
          </div>
          
          <div className="space-y-1 text-3xs text-slate-400 leading-relaxed font-mono">
            <div>Project: <span className="text-slate-300 font-semibold">biijayslab</span></div>
            <div>Region: <span className="text-slate-300 font-semibold">us-east1</span></div>
          </div>
        </div>
      </aside>

      {/* MAIN WORKSPACE CONTENT PANEL */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        {/* Top Header Workspace Status */}
        <header className="bg-white border-b border-gray-100 px-6 py-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-2xs font-semibold text-gray-400 uppercase tracking-widest font-mono">WORKSPACE</span>
              <span className="text-3xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">FIREBASE ACTIVE</span>
            </div>
            <h2 className="text-xl font-bold font-display text-gray-800 mt-1">
              {navigationItems.find(item => item.id === activeView)?.label || 'Workspace'}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs">
            {/* View Density Toggle Button Group */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/80 shadow-3xs" id="view_density_toggle">
              <button
                onClick={() => setDensityMode('compact')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  densityMode === 'compact'
                    ? 'bg-white text-emerald-800 shadow-xs border border-gray-200 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Compact View (High density layout for smaller screens or overview)"
              >
                <Minimize2 size={13} className={densityMode === 'compact' ? 'text-emerald-600' : ''} />
                <span>Compact</span>
              </button>
              <button
                onClick={() => setDensityMode('detailed')}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  densityMode === 'detailed'
                    ? 'bg-white text-emerald-800 shadow-xs border border-gray-200 font-bold'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
                title="Detailed View (Expanded spacing & rich operational details)"
              >
                <Maximize2 size={13} className={densityMode === 'detailed' ? 'text-emerald-600' : ''} />
                <span>Detailed</span>
              </button>
            </div>

            {/* Data Sync & Reconciliation Trigger Button */}
            <button
              onClick={() => setIsSyncModalOpen(true)}
              className={`flex items-center space-x-1.5 font-bold text-xs px-3.5 py-2 rounded-xl border shadow-3xs transition-all cursor-pointer ${
                syncStatus === 'offline' 
                  ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                  : syncStatus === 'syncing'
                  ? 'bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100'
                  : syncStatus === 'error'
                  ? 'bg-red-50 text-red-800 border-red-200 hover:bg-red-100'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
              }`}
              title="Data Synchronization & Offline Reconciliation Status"
            >
              {syncStatus === 'offline' ? (
                <WifiOff size={14} className="text-amber-600" />
              ) : syncStatus === 'syncing' ? (
                <RefreshCw size={14} className="text-blue-600 animate-spin" />
              ) : (
                <ArrowRightLeft size={14} className="text-emerald-600" />
              )}
              <span>
                {syncStatus === 'offline' ? 'Offline' : syncStatus === 'syncing' ? 'Syncing...' : 'Data Sync'}
              </span>
            </button>

            {/* Firebase Storage Hub Trigger Button */}
            <button
              onClick={() => setIsStorageModalOpen(true)}
              className="flex items-center space-x-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-3.5 py-2 rounded-xl border border-slate-200 shadow-3xs transition-all cursor-pointer"
              title="Upload & manage files in Firebase Storage"
            >
              <HardDrive size={14} className="text-emerald-600" />
              <span>Firebase Storage</span>
            </button>

            {/* Firebase Auth Account Button */}
            <button
              onClick={() => setIsAuthModalOpen(true)}
              className={`flex items-center space-x-1.5 font-bold text-xs px-3.5 py-2 rounded-xl shadow-3xs transition-all cursor-pointer border ${
                currentUser 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100' 
                  : 'bg-slate-900 text-white border-slate-800 hover:bg-slate-800'
              }`}
            >
              <ShieldCheck size={14} className={currentUser ? 'text-emerald-600' : 'text-emerald-400'} />
              <span className="truncate max-w-28">
                {currentUser ? (currentUser.email ? currentUser.email.split('@')[0] : 'User Account') : 'Sign In / Register'}
              </span>
            </button>

            <button
              onClick={() => setIsAiSidebarOpen(prev => !prev)}
              className="flex items-center space-x-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-3.5 py-2 rounded-xl shadow-xs transition-all cursor-pointer border border-emerald-400/30"
            >
              <Sparkles size={15} className="animate-pulse text-emerald-200" />
              <span>AI Crop Advisor</span>
              <span className="bg-emerald-950/60 text-emerald-200 text-[10px] px-1.5 py-0.5 rounded-full font-mono border border-emerald-400/30">
                GEMINI
              </span>
            </button>

            <a 
              href="https://console.firebase.google.com/project/biijayslab/firestore" 
              target="_blank" 
              rel="noreferrer"
              className="text-gray-600 hover:text-emerald-700 flex items-center space-x-1.5 border border-emerald-200 rounded-xl px-3.5 py-1.5 bg-emerald-50/50 font-semibold transition-colors cursor-pointer"
            >
              <span>Firebase Console</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </header>

        {/* Active View Container */}
        <div className="p-6 flex-1">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeView}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.15 }}
            >
              {activeView === 'admin' && (
                <AdminDashboard
                  db={db}
                  currentUserId={currentUser?.uid}
                  onSwitchToNormalView={() => setActiveView('dashboard')}
                  onDbUpdated={(newDb) => {
                    setDb(newDb);
                    saveDatabase(newDb);
                  }}
                />
              )}

              {activeView === 'dashboard' && (
                <Dashboard 
                  fields={db.fields}
                  cropLogs={db.cropLogs}
                  staff={db.staff}
                  weatherTriggers={db.weatherTriggers}
                  db={db}
                  onUpdateDb={setDb}
                  onAssignTask={handleAssignTask}
                  onVerifyTask={handleVerifyTask}
                  onAddCustomLog={handleAddCustomLog}
                  densityMode={densityMode}
                  onNavigateTab={(tab) => setActiveView(tab)}
                />
              )}

              {activeView === 'media' && (
                <MediaIngestionPanel 
                  db={db} 
                  onUpdateDb={setDb} 
                />
              )}

              {activeView === 'ledger' && (
                <SeedFundLedger 
                  db={db} 
                  onUpdateDb={setDb} 
                />
              )}

              {activeView === 'dispatch' && (
                <CommandDispatchPanel 
                  db={db} 
                  onUpdateDb={setDb} 
                />
              )}

              {activeView === 'maintenance' && (
                <MaintenanceTracker 
                  db={db} 
                  onUpdateDb={setDb} 
                />
              )}

              {activeView === 'whatsapp' && (
                <WhatsAppSimulator 
                  staff={db.staff}
                  messages={db.messages}
                  onInboundMessage={handleInboundWhatsAppMessage}
                  preFilledText={preFilledText}
                />
              )}

              {activeView === 'weather' && (
                <WeatherTriggerPanel 
                  fields={db.fields}
                  onTriggerAlert={handleTriggerWeatherAlert}
                  onClearWeatherAlerts={handleClearWeatherAlerts}
                />
              )}

              {activeView === 'analytics' && (
                <Analytics 
                  fields={db.fields}
                  cropLogs={db.cropLogs}
                  staff={db.staff}
                />
              )}

              {activeView === 'checklist' && (
                <Checklist />
              )}

              {activeView === 'sop' && (
                <SOPDocs 
                  fields={db.fields}
                  staff={db.staff}
                  onAssignTask={handleAssignTask}
                  onPreFillWhatsApp={(text) => {
                    setPreFilledText(text);
                  }}
                  onNavigateToTab={(tab) => {
                    setActiveView(tab);
                  }}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* AI ASSISTANT SIDEBAR DRAWER (Accessible across all application views) */}
      <AiAssistantSidebar
        isOpen={isAiSidebarOpen}
        onClose={() => setIsAiSidebarOpen(false)}
        fields={db.fields}
        cropLogs={db.cropLogs}
        staff={db.staff}
        onAssignTask={handleAssignTask}
        onPreFillWhatsApp={(text) => setPreFilledText(text)}
        onNavigateToTab={(tab) => setActiveView(tab)}
      />

      {/* FIREBASE AUTHENTICATION MODAL */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* FIREBASE STORAGE MANAGER MODAL */}
      <StorageManagerModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        db={db}
        onDbUpdated={(newDb) => {
          setDb(newDb);
          saveDatabase(newDb);
          syncDatabaseToFirestore(newDb);
        }}
      />

      {/* DATA SYNCHRONIZATION & RECONCILIATION MODAL */}
      <DataSyncModal
        isOpen={isSyncModalOpen}
        onClose={() => setIsSyncModalOpen(false)}
        db={db}
        onDbUpdated={(newDb) => {
          setDb(newDb);
          saveDatabase(newDb);
        }}
      />
    </div>
  );
}

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
  TrendingUp
} from 'lucide-react';
import { loadDatabase, saveDatabase, handleInboundWhatsApp, assignDailyTask, triggerWeatherAlert } from './utils/mockDb';
import { CropLog, Field, StaffMember, WhatsAppMessage } from './types';

// Import our modular components
import Dashboard from './components/Dashboard';
import WhatsAppSimulator from './components/WhatsAppSimulator';
import WeatherTriggerPanel from './components/WeatherTriggerPanel';
import Checklist from './components/Checklist';
import SOPDocs from './components/SOPDocs';
import Analytics from './components/Analytics';

export default function App() {
  const [db, setDb] = useState(() => loadDatabase());
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [preFilledText, setPreFilledText] = useState<string>('');

  // Auto-sync React State to LocalStorage Database
  useEffect(() => {
    saveDatabase(db);
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
  const navigationItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Tractor },
    { id: 'whatsapp', label: 'WhatsApp Bot', icon: MessageSquare },
    { id: 'weather', label: 'Weather Telemetry', icon: CloudRain },
    { id: 'analytics', label: 'Analytics Insights', icon: TrendingUp },
    { id: 'checklist', label: 'Pre-flight Checklist', icon: CheckSquare },
    { id: 'sop', label: 'Staff SOPs', icon: BookOpen }
  ];

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
              <span className="text-[10px] text-emerald-400 font-mono font-bold tracking-widest block mt-0.5">PROTOTYPE SIMULATOR</span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex-1 p-4 space-y-1">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setPreFilledText('');
                }}
                className={`w-full p-3 rounded-xl text-left text-xs font-semibold flex items-center space-x-3 transition-all cursor-pointer ${
                  isActive 
                    ? 'bg-emerald-600 text-slate-900 shadow-xs font-bold' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                }`}
              >
                <Icon size={16} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Connected Database Panel */}
        <div className="p-4 border-t border-slate-800 space-y-3 bg-slate-950/40">
          <div className="flex justify-between items-center text-3xs text-slate-400">
            <span className="flex items-center gap-1.5 uppercase tracking-wider font-bold">
              <Database size={10} className="text-emerald-500 animate-pulse" />
              <span>Supabase Status</span>
            </span>
            <span className="font-mono bg-slate-900 text-emerald-400 px-1 py-0.5 rounded text-[8px]">PROTOTYPE MOCK</span>
          </div>
          
          <div className="space-y-1 text-3xs text-slate-400 leading-relaxed font-mono">
            <div>Ref: <span className="text-slate-300 font-semibold">ohxjkbpkon...</span></div>
            <div>Lagos Time: <span className="text-slate-300 font-semibold">17-Jul-2026</span></div>
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
              <span className="text-3xs bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full border border-emerald-100">STABLE FEED</span>
            </div>
            <h2 className="text-xl font-bold font-display text-gray-800 mt-1">
              {navigationItems.find(item => item.id === activeView)?.label || 'Workspace'}
            </h2>
          </div>

          <div className="flex items-center space-x-3 text-xs">
            <a 
              href="https://supabase.com/dashboard/project/ohxjkbpkonfbaalldqqw" 
              target="_blank" 
              rel="noreferrer"
              className="text-gray-500 hover:text-slate-800 flex items-center space-x-1 border border-gray-200 rounded-xl px-3.5 py-1.5 bg-slate-50 font-medium transition-colors cursor-pointer"
            >
              <span>Project Supabase</span>
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
              {activeView === 'dashboard' && (
                <Dashboard 
                  fields={db.fields}
                  cropLogs={db.cropLogs}
                  staff={db.staff}
                  weatherTriggers={db.weatherTriggers}
                  onAssignTask={handleAssignTask}
                  onVerifyTask={handleVerifyTask}
                  onAddCustomLog={handleAddCustomLog}
                />
              )}

              {activeView === 'whatsapp' && (
                <WhatsAppSimulator 
                  staff={db.staff}
                  messages={db.messages}
                  onInboundMessage={handleInboundWhatsAppMessage}
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
                  onPreFillWhatsApp={(text) => {
                    // pre-fill action (could pass to WhatsApp simulator)
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
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { CheckCircle, Circle, AlertCircle, Sparkles, Database, MessageSquare, Cloud, CheckSquare } from 'lucide-react';

interface ChecklistItem {
  id: string;
  category: 'supabase' | 'twilio' | 'n8n' | 'verification';
  title: string;
  description: string;
  checked: boolean;
}

const initialChecklist: ChecklistItem[] = [
  // Supabase
  { id: 'sb-1', category: 'supabase', title: 'Apply SQL Schema', description: 'Run contents of Supabase/kemet_crop_logs_schema.sql in the Supabase SQL Editor.', checked: false },
  { id: 'sb-2', category: 'supabase', title: 'Verify Tables Creation', description: 'Confirm tables kemet_crop_logs, kemet_whatsapp_messages, and kemet_weather_triggers exist.', checked: false },
  { id: 'sb-3', category: 'supabase', title: 'Capture API Credentials', description: 'Get Host, database, public keys, and service_role keys from Project Settings.', checked: false },
  
  // Twilio
  { id: 'tw-1', category: 'twilio', title: 'Join WhatsApp Sandbox', description: 'Send join sandbox message from registered operator mobile phones to +1 415 523 8886.', checked: false },
  { id: 'tw-2', category: 'twilio', title: 'Capture Twilio Sid/Token', description: 'Copy Twilio Account SID and Auth Token to credentials store.', checked: false },
  { id: 'tw-3', category: 'twilio', title: 'Configure Sandbox Webhook', description: 'Point "When a message comes in" to n8n webhook URL: /webhook/kemet-whatsapp.', checked: false },
  
  // n8n
  { id: 'n8n-1', category: 'n8n', title: 'Import n8n JSON Workflows', description: 'Import both kemet_weather_trigger.json and kemet_whatsapp_loop.json into n8n.', checked: false },
  { id: 'n8n-2', category: 'n8n', title: 'Bind Environment Variables', description: 'Set SUPABASE_URL, TWILIO_WHATSAPP_NUMBER, and keys in n8n or .env file.', checked: false },
  
  // Verification
  { id: 'v-1', category: 'verification', title: 'Trigger Weather n8n integration', description: 'Check if Open-Meteo requests complete with 200 OK and insert weather_triggers.', checked: false },
  { id: 'v-2', category: 'verification', title: 'Receive outbound message dispatch', description: 'Check if staff phone receives WhatsApp alerts from the sandbox.', checked: false }
];

export default function Checklist() {
  const [items, setItems] = useState<ChecklistItem[]>([]);

  useEffect(() => {
    // Load from local storage
    try {
      const stored = localStorage.getItem('kemet_preflight_checklist');
      if (stored) {
        setItems(JSON.parse(stored));
      } else {
        setItems(initialChecklist);
      }
    } catch {
      setItems(initialChecklist);
    }
  }, []);

  const toggleItem = (id: string) => {
    const updated = items.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
    setItems(updated);
    try {
      localStorage.setItem('kemet_preflight_checklist', JSON.stringify(updated));
    } catch {
      // Ignore quota exceptions gracefully
    }
  };

  const getPercentage = (cat?: 'supabase' | 'twilio' | 'n8n' | 'verification') => {
    const filtered = cat ? items.filter(i => i.category === cat) : items;
    if (filtered.length === 0) return 0;
    const checked = filtered.filter(i => i.checked).length;
    return Math.round((checked / filtered.length) * 100);
  };

  const totalPercent = getPercentage();

  return (
    <div className="space-y-6" id="checklist_panel">
      {/* Health Overview */}
      <div className="bg-white rounded-2xl border border-gray-100 p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <span className="text-3xs uppercase tracking-wider font-bold text-amber-600 bg-amber-50 px-2.5 py-1 rounded-md">DEPLOYMENT READY CHECK</span>
          <h3 className="text-lg font-semibold font-display text-gray-800">Pre-Flight Integration Checklist</h3>
          <p className="text-xs text-gray-500 max-w-xl">
            Pass all live production checklists in <code className="bg-gray-100 px-1 py-0.5 rounded text-gray-600">twilio_supabase_checklist.md</code> before removing the Twilio sandbox flag.
          </p>
        </div>

        <div className="flex items-center space-x-4">
          <div className="relative w-20 h-20 flex items-center justify-center rounded-full bg-slate-50 border border-gray-100 shadow-2xs">
            <span className="text-sm font-bold font-display text-gray-800">{totalPercent}%</span>
            <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-emerald-500 animate-spin opacity-40"></div>
          </div>
          <div>
            <h4 className="font-semibold text-xs text-gray-800">Deployment Health</h4>
            <p className="text-3xs text-gray-400 mt-0.5">
              {totalPercent === 100 ? '✅ Ready for Live Production!' : `${items.filter(i => !i.checked).length} pending items to verify`}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Supabase & Twilio Lists */}
        <div className="lg:col-span-8 space-y-6">
          {/* Supabase Section */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="font-semibold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Database size={14} className="text-emerald-500" />
                <span>1. Supabase Setup</span>
              </h4>
              <span className="text-3xs font-mono font-bold text-emerald-600">{getPercentage('supabase')}%</span>
            </div>

            <div className="divide-y divide-gray-100">
              {items.filter(i => i.category === 'supabase').map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-4 hover:bg-gray-50/30 text-left flex items-start space-x-3 transition-colors cursor-pointer border-none"
                >
                  {item.checked ? (
                    <CheckCircle className="text-emerald-500 flex-shrink-0 mt-0.5" size={16} />
                  ) : (
                    <Circle className="text-gray-300 flex-shrink-0 mt-0.5" size={16} />
                  )}
                  <div>
                    <h5 className={`font-semibold text-xs ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.title}
                    </h5>
                    <p className="text-3xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Twilio Section */}
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="font-semibold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <MessageSquare size={14} className="text-blue-500" />
                <span>2. Twilio WhatsApp Sandbox</span>
              </h4>
              <span className="text-3xs font-mono font-bold text-blue-600">{getPercentage('twilio')}%</span>
            </div>

            <div className="divide-y divide-gray-100">
              {items.filter(i => i.category === 'twilio').map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className="w-full p-4 hover:bg-gray-50/30 text-left flex items-start space-x-3 transition-colors cursor-pointer border-none"
                >
                  {item.checked ? (
                    <CheckCircle className="text-blue-500 flex-shrink-0 mt-0.5" size={16} />
                  ) : (
                    <Circle className="text-gray-300 flex-shrink-0 mt-0.5" size={16} />
                  )}
                  <div>
                    <h5 className={`font-semibold text-xs ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.title}
                    </h5>
                    <p className="text-3xs text-gray-500 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* n8n Workflows Section */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
              <h4 className="font-semibold text-xs text-gray-800 uppercase tracking-wider flex items-center gap-2">
                <Cloud size={14} className="text-indigo-500" />
                <span>3. n8n Automation</span>
              </h4>
              <span className="text-3xs font-mono font-bold text-indigo-600">{getPercentage('n8n')}%</span>
            </div>

            <div className="p-4 space-y-3">
              {items.filter(i => i.category === 'n8n').map(item => (
                <button
                  key={item.id}
                  onClick={() => toggleItem(item.id)}
                  className={`w-full p-3 rounded-xl text-left border flex items-start space-x-3.5 transition-all cursor-pointer ${
                    item.checked 
                      ? 'bg-slate-50 border-gray-100' 
                      : 'bg-white border-gray-200 hover:bg-gray-50/50'
                  }`}
                >
                  {item.checked ? (
                    <CheckSquare className="text-indigo-500 flex-shrink-0 mt-0.5" size={14} />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded border border-gray-300 flex-shrink-0 mt-0.5"></div>
                  )}
                  <div>
                    <h5 className={`font-semibold text-2xs ${item.checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                      {item.title}
                    </h5>
                    <p className="text-[10px] text-gray-400 mt-1 leading-relaxed">{item.description}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Guide Card */}
          <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 relative overflow-hidden">
            <Sparkles className="text-emerald-400/20 absolute top-0 right-0 p-4" size={72} />
            <h4 className="font-bold text-xs tracking-wider uppercase mb-1.5 text-emerald-400">verification test loop</h4>
            <p className="text-2xs text-slate-300 leading-relaxed mb-4">
              Our interactive simulator is fully designed to act as your pre-flight validation environment. Complete actions in the <strong>WhatsApp Simulator</strong> tab to verify task confirmation, database insertion, and n8n loop formats without incurring Twilio billing costs!
            </p>
            <div className="border-t border-slate-800 pt-3 flex justify-between items-center text-3xs text-slate-400 font-mono">
              <span>Sandbox Number:</span>
              <span className="font-bold text-slate-300">+1 415 523 8886</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

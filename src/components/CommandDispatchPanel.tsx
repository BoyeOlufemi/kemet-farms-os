import React, { useState } from 'react';
import { KemetDB, DispatchFeedback, WhatsAppMessage } from '../types';
import { 
  Send, 
  MessageSquare, 
  UserCheck, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  PhoneCall, 
  Sparkles, 
  MessageCircle,
  CornerDownRight,
  Radio
} from 'lucide-react';

interface CommandDispatchPanelProps {
  db: KemetDB;
  onUpdateDb: (updatedDb: KemetDB) => void;
}

export default function CommandDispatchPanel({ db, onUpdateDb }: CommandDispatchPanelProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(db.staff[0]?.id || 'staff-1');
  const [selectedFieldId, setSelectedFieldId] = useState<string>(db.fields[0]?.id || 'field-1');
  const [dispatchType, setDispatchType] = useState<'instruction' | 'feedback' | 'status_ping'>('instruction');
  const [bodyText, setBodyText] = useState('');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSendDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bodyText.trim()) return;

    const staff = db.staff.find(s => s.id === selectedStaffId);
    if (!staff) return;

    // 1. Create DispatchFeedback item
    const newDispatch: DispatchFeedback = {
      id: `disp-${Date.now()}`,
      target_staff_id: selectedStaffId,
      field_id: selectedFieldId,
      type: dispatchType,
      body: bodyText,
      status: 'sent',
      created_at: new Date().toISOString()
    };

    // 2. Also send as Outbound WhatsApp Message to operator's phone
    const prefix = dispatchType === 'status_ping' 
      ? '📌 STATUS PING: ' 
      : dispatchType === 'feedback' 
        ? '💬 MEDIA FEEDBACK: ' 
        : '🌹 DIRECTIVE: ';

    const outboundWhatsappMsg: WhatsAppMessage = {
      id: crypto.randomUUID(),
      from_number: '+14155238886',
      to_number: staff.phone,
      direction: 'outbound',
      body: `${prefix}${bodyText}`,
      created_at: new Date().toISOString()
    };

    // Update DB state
    const updatedDb: KemetDB = {
      ...db,
      dispatchFeedbacks: [newDispatch, ...db.dispatchFeedbacks],
      messages: [...db.messages, outboundWhatsappMsg]
    };

    onUpdateDb(updatedDb);

    setStatusMessage(`Command dispatched to ${staff.name} (${staff.phone}) via WhatsApp.`);
    setBodyText('');

    setTimeout(() => setStatusMessage(null), 4000);
  };

  const handleQuickPreset = (presetText: string, type: 'instruction' | 'feedback' | 'status_ping') => {
    setDispatchType(type);
    setBodyText(presetText);
  };

  const handleMarkResolved = (dispatchId: string) => {
    const updatedDispatches = db.dispatchFeedbacks.map(d => 
      d.id === dispatchId ? { ...d, status: 'resolved' as const } : d
    );
    onUpdateDb({ ...db, dispatchFeedbacks: updatedDispatches });
  };

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Radio size={22} className="animate-pulse text-emerald-600" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-gray-900 font-display">Command & Feedback Dispatch</h3>
              <span className="text-3xs font-bold font-mono bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full flex items-center gap-1">
                <MessageSquare size={10} />
                <span>WHATSAPP INTEGRATED</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Two-way dispatch interface for sending direct instructions, media feedback, and status pings
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Dispatch Form (7 cols) */}
        <div className="lg:col-span-7 bg-slate-50 p-5 rounded-2xl border border-gray-200/80 space-y-4">
          <h4 className="font-bold text-xs text-gray-800 font-display flex items-center space-x-2">
            <Send size={15} className="text-emerald-600" />
            <span>Compose Operator Dispatch</span>
          </h4>

          <form onSubmit={handleSendDispatch} className="space-y-3 text-xs">
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Operator</label>
                <select
                  value={selectedStaffId}
                  onChange={(e) => setSelectedStaffId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-medium"
                >
                  {db.staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Target Field</label>
                <select
                  value={selectedFieldId}
                  onChange={(e) => setSelectedFieldId(e.target.value)}
                  className="w-full bg-white border border-gray-200 rounded-xl p-2.5 font-medium"
                >
                  {db.fields.map(f => (
                    <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Dispatch Mode</label>
              <div className="grid grid-cols-3 gap-2 bg-white p-1 rounded-xl border border-gray-200">
                <button
                  type="button"
                  onClick={() => setDispatchType('instruction')}
                  className={`py-2 rounded-lg font-bold text-3xs uppercase tracking-wider ${
                    dispatchType === 'instruction' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Instruction
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchType('feedback')}
                  className={`py-2 rounded-lg font-bold text-3xs uppercase tracking-wider ${
                    dispatchType === 'feedback' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Photo Feedback
                </button>
                <button
                  type="button"
                  onClick={() => setDispatchType('status_ping')}
                  className={`py-2 rounded-lg font-bold text-3xs uppercase tracking-wider ${
                    dispatchType === 'status_ping' ? 'bg-emerald-600 text-white shadow-xs' : 'text-gray-500'
                  }`}
                >
                  Status Ping
                </button>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="space-y-1">
              <span className="text-3xs font-mono text-gray-400 font-bold block">QUICK DISPATCH PRESETS:</span>
              <div className="flex flex-wrap gap-1.5 text-3xs font-semibold">
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Please apply 1.5kg NPK fertilizer around palm ring clearance.', 'instruction')}
                  className="bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 px-2.5 py-1 rounded-lg"
                >
                  + Apply NPK Fertilizer
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Reviewed inspection photo: excellent leaf condition. Proceed with pruning.', 'feedback')}
                  className="bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 px-2.5 py-1 rounded-lg"
                >
                  + Positive Photo Review
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickPreset('Please confirm soybean drip line hydration status immediately. Reply DONE when complete.', 'status_ping')}
                  className="bg-white hover:bg-emerald-50 text-gray-700 hover:text-emerald-800 border border-gray-200 px-2.5 py-1 rounded-lg"
                >
                  + Urgent Status Ping
                </button>
              </div>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Dispatch Message Body</label>
              <textarea
                value={bodyText}
                onChange={(e) => setBodyText(e.target.value)}
                placeholder="Type direct instructions or feedback for the operator..."
                rows={3}
                className="w-full bg-white border border-gray-200 rounded-xl p-3 font-medium text-xs focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-xl shadow-xs flex items-center justify-center space-x-2 transition-all cursor-pointer"
            >
              <Send size={15} />
              <span>Dispatch Command via WhatsApp</span>
            </button>

            {statusMessage && (
              <div className="p-3 bg-emerald-100 text-emerald-900 border border-emerald-200 rounded-xl text-xs font-medium flex items-center space-x-2">
                <CheckCircle2 size={15} className="text-emerald-600" />
                <span>{statusMessage}</span>
              </div>
            )}

          </form>
        </div>

        {/* Dispatch History List (5 cols) */}
        <div className="lg:col-span-5 bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase font-display text-emerald-400 flex items-center space-x-1.5">
                <MessageCircle size={14} />
                <span>Active Field Dispatches ({db.dispatchFeedbacks.length})</span>
              </span>
              <span className="text-3xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-800">
                LIVE
              </span>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
              {db.dispatchFeedbacks.map((disp) => {
                const staff = db.staff.find(s => s.id === disp.target_staff_id);
                const field = db.fields.find(f => f.id === disp.field_id);

                return (
                  <div key={disp.id} className="bg-slate-900/90 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-emerald-300">{staff ? staff.name : disp.target_staff_id}</span>
                      <span className={`text-3xs font-mono font-bold px-2 py-0.5 rounded uppercase ${
                        disp.type === 'status_ping' 
                          ? 'bg-amber-950 text-amber-300 border border-amber-800' 
                          : disp.type === 'feedback' 
                            ? 'bg-teal-950 text-teal-300 border border-teal-800' 
                            : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {disp.type.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-slate-200 text-2xs leading-relaxed">{disp.body}</p>

                    <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-3xs font-mono text-slate-400">
                      <span>Field: {field ? field.name : 'General'}</span>
                      <button
                        onClick={() => handleMarkResolved(disp.id)}
                        className={`font-bold hover:underline cursor-pointer ${
                          disp.status === 'resolved' ? 'text-emerald-400' : 'text-amber-400'
                        }`}
                      >
                        {disp.status === 'resolved' ? '✓ RESOLVED' : 'MARK RESOLVED'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 text-3xs font-mono text-slate-400">
            Outbound messages stream directly to WhatsApp SMS Bot
          </div>
        </div>

      </div>

    </div>
  );
}

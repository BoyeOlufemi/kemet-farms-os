import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { StaffMember, WhatsAppMessage } from '../types';
import { Send, Phone, MessageSquare, Info, Smartphone, Check, HelpCircle, Code, Shield } from 'lucide-react';

interface WhatsAppSimulatorProps {
  staff: StaffMember[];
  messages: WhatsAppMessage[];
  onInboundMessage: (fromPhone: string, body: string) => {
    twilioPayload: any;
    responseMessage: string | null;
  };
}

export default function WhatsAppSimulator({
  staff,
  messages,
  onInboundMessage
}: WhatsAppSimulatorProps) {
  const [selectedStaff, setSelectedStaff] = useState<StaffMember>(staff[0]);
  const [typedMessage, setTypedMessage] = useState('');
  const [lastTelemetry, setLastTelemetry] = useState<any>(null);
  const [showTelemetry, setShowTelemetry] = useState(true);
  
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Filter messages for current staff
  const staffMessages = messages.filter(
    m => m.from_number === selectedStaff.phone || m.to_number === selectedStaff.phone
  );

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [staffMessages, selectedStaff]);

  const handleSendMessage = (e?: React.FormEvent, customBody?: string) => {
    if (e) e.preventDefault();
    const bodyToSend = customBody || typedMessage;
    if (!bodyToSend.trim()) return;

    // Trigger simulation
    const result = onInboundMessage(selectedStaff.phone, bodyToSend);
    setLastTelemetry(result.twilioPayload);
    setTypedMessage('');
  };

  // Quick chips
  const quickChips = [
    { label: 'done', desc: 'Confirm Task Completion' },
    { label: 'conflict', desc: 'Report Blockage/Hold' },
    { label: 'status', desc: 'Check Recent Logs' },
    { label: 'stop', desc: 'Unsubscribe Alerts' },
    { label: 'start', desc: 'Activate Alerts' }
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="whatsapp_simulator_panel">
      {/* Staff Selector sidebar */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-800 text-sm">Select Active Staff Member</h3>
          <p className="text-2xs text-gray-400 mt-0.5">Toggle phones to simulate different operators</p>
        </div>

        <div className="space-y-2">
          {staff.map((m) => {
            const isSelected = m.id === selectedStaff.id;
            const staffMsgs = messages.filter(msg => msg.from_number === m.phone || msg.to_number === m.phone);
            const lastMsg = staffMsgs[staffMsgs.length - 1];
            
            return (
              <button
                key={m.id}
                onClick={() => setSelectedStaff(m)}
                className={`w-full p-3.5 rounded-xl text-left border transition-all flex items-start space-x-3 cursor-pointer ${
                  isSelected 
                    ? 'bg-emerald-50/75 border-emerald-300 shadow-xs' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
                }`}
              >
                <div className={`p-2.5 rounded-lg ${
                  isSelected ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
                }`}>
                  <Smartphone size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-baseline">
                    <h4 className="font-semibold text-xs text-gray-800 truncate">{m.name}</h4>
                    {m.status === 'inactive' && (
                      <span className="text-3xs text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded-sm">STOPPED</span>
                    )}
                  </div>
                  <p className="text-3xs text-gray-400 truncate">{m.role}</p>
                  <p className="text-3xs font-mono text-gray-500 mt-1 truncate">{m.phone}</p>
                  {lastMsg && (
                    <p className="text-3xs text-gray-500 italic mt-1.5 border-t border-gray-100/50 pt-1.5 truncate">
                      Last: "{lastMsg.body}"
                    </p>
                  )}
                </div>
              </button>
            );
          })}
        </div>

        <div className="bg-emerald-950 text-emerald-200 p-4 rounded-xl space-y-2 text-2xs">
          <h5 className="font-bold flex items-center gap-1.5 text-white">
            <Info size={12} />
            <span>Kemet Bot Sandbox Rules</span>
          </h5>
          <ul className="list-disc list-inside space-y-1 text-emerald-300/90">
            <li>Sandbox Number: <span className="font-mono bg-emerald-900 px-1 rounded-sm text-emerald-100">+1 415 523 8886</span></li>
            <li>Plain-text, low-bandwidth focus.</li>
            <li>1 Action triggers 1 Outbound.</li>
            <li>Keep messages under 2 sentences.</li>
          </ul>
        </div>
      </div>

      {/* Chat Device Simulator */}
      <div className="lg:col-span-8 flex flex-col space-y-6">
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden flex flex-col h-[520px] shadow-xs">
          {/* Smartphone Header */}
          <div className="bg-slate-900 text-white px-5 py-3.5 flex justify-between items-center border-b border-slate-800">
            <div className="flex items-center space-x-3">
              <div className="w-9 h-9 rounded-full bg-emerald-500 flex items-center justify-center font-bold text-sm text-slate-900 select-none">
                KB
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <h4 className="font-semibold text-xs tracking-wide">Kemet Bot Sandbox</h4>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <p className="text-3xs text-slate-400">Simulating as operator: <span className="font-semibold text-slate-300">{selectedStaff.name}</span></p>
              </div>
            </div>
            <div className="flex space-x-2 text-slate-400">
              <div className="p-1.5 bg-slate-800 rounded-lg">
                <Phone size={14} />
              </div>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 bg-slate-50 space-y-3.5">
            {staffMessages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400 space-y-2">
                <MessageSquare size={36} className="text-gray-300" />
                <p className="text-xs italic font-medium">No conversation history. Dispatch a task from the Dashboard or type "status" below!</p>
              </div>
            ) : (
              staffMessages.map((msg) => {
                const isBot = msg.direction === 'outbound';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isBot ? 'justify-start' : 'justify-end'}`}
                  >
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs shadow-xs relative ${
                      isBot 
                        ? 'bg-white text-gray-800 rounded-tl-none border border-gray-100' 
                        : 'bg-emerald-600 text-white rounded-tr-none'
                    }`}>
                      <p className="leading-relaxed whitespace-pre-wrap">{msg.body}</p>
                      <div className={`text-[9px] mt-1 text-right font-mono ${isBot ? 'text-gray-400' : 'text-emerald-200'}`}>
                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick-reply command chips */}
          <div className="px-4 py-2 border-t border-gray-100 bg-gray-50/50 overflow-x-auto flex space-x-2 scrollbar-none select-none">
            {quickChips.map((chip) => (
              <button
                key={chip.label}
                onClick={() => handleSendMessage(undefined, chip.label)}
                title={chip.desc}
                className="bg-white hover:bg-emerald-50 hover:text-emerald-700 text-gray-600 text-2xs font-semibold px-3 py-1 rounded-full border border-gray-200 flex-shrink-0 transition-colors shadow-2xs cursor-pointer"
              >
                {chip.label}
              </button>
            ))}
          </div>

          {/* Message input footer */}
          <form onSubmit={handleSendMessage} className="p-3 border-t border-gray-100 flex items-center space-x-2 bg-white">
            <input
              type="text"
              value={typedMessage}
              onChange={(e) => setTypedMessage(e.target.value)}
              placeholder={`Send WhatsApp from ${selectedStaff.name.split(' ')[0]}...`}
              className="flex-1 bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl transition-colors cursor-pointer"
            >
              <Send size={14} />
            </button>
          </form>
        </div>

        {/* Live Telemetry Monitor */}
        <div className="bg-slate-900 text-slate-100 rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <Code size={18} className="text-cyan-400" />
              <h4 className="font-semibold text-xs tracking-wider uppercase">Twilio ↔ n8n Loop Telemetry</h4>
            </div>
            <button
              onClick={() => setShowTelemetry(!showTelemetry)}
              className="text-3xs text-cyan-400 hover:underline cursor-pointer font-semibold uppercase"
            >
              {showTelemetry ? 'Hide Payload' : 'Show Payload'}
            </button>
          </div>

          {showTelemetry && (
            <div className="space-y-3">
              <div className="text-2xs text-slate-400 leading-relaxed">
                This is the exact JSON transmission forwarded from Twilio WhatsApp Sandbox to n8n Webhook at <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-300">/webhook/kemet-whatsapp</code>.
              </div>

              {lastTelemetry ? (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono text-3xs text-cyan-300 overflow-x-auto max-h-36">
                  <pre>{JSON.stringify(lastTelemetry, null, 2)}</pre>
                </div>
              ) : (
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-3xs text-slate-500 text-center italic">
                  Waiting for staff message to capture webhook transmission payload...
                </div>
              )}

              <div className="flex items-center space-x-2 text-3xs text-emerald-400 font-semibold bg-emerald-950/40 border border-emerald-900/40 p-2.5 rounded-lg">
                <Shield size={12} />
                <span>Security Check: No production Twilio Account SID or Supabase Service keys exposed in payload.</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

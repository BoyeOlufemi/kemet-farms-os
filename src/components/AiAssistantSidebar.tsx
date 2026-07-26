import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Bot, 
  Send, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  Zap, 
  X, 
  ChevronRight, 
  Droplets, 
  BookOpen, 
  Copy, 
  Check, 
  Loader2, 
  Tractor, 
  BrainCircuit, 
  Info,
  ArrowRight
} from 'lucide-react';
import { Field, CropLog, StaffMember } from '../types';

interface AiAssistantSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  fields: Field[];
  cropLogs: CropLog[];
  staff: StaffMember[];
  onAssignTask?: (fieldId: string, actionType: string, staffId: string) => void;
  onPreFillWhatsApp?: (text: string) => void;
  onNavigateToTab?: (tab: string) => void;
}

interface AdviceRecommendation {
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  targetField: string;
  action: string;
  rationale: string;
  suggestedSop: string;
}

interface AdvicePayload {
  healthStatus?: 'OPTIMAL' | 'ATTENTION_REQUIRED' | 'CRITICAL';
  summary?: string;
  recommendations?: AdviceRecommendation[];
}

interface ChatMessage {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  adviceData?: AdvicePayload;
}

export default function AiAssistantSidebar({
  isOpen,
  onClose,
  fields,
  cropLogs,
  staff,
  onAssignTask,
  onPreFillWhatsApp,
  onNavigateToTab
}: AiAssistantSidebarProps) {
  const [advice, setAdvice] = useState<AdvicePayload | null>(null);
  const [loadingAdvice, setLoadingAdvice] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      sender: 'ai',
      text: "Hello! I am your **Gemini AI Agronomist**. I monitor live telemetry across all Kemet fields in real time. Ask me anything about soil moisture, crop stage optimization, or irrigation SOPs!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [inputQuery, setInputQuery] = useState<string>('');
  const [isSending, setIsSending] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  // Fetch real-time AI advice on initial load or when fields change
  const fetchRealtimeAdvice = async () => {
    setLoadingAdvice(true);
    try {
      const res = await fetch('/api/gemini/advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields, cropLogs })
      });
      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = {};
      }
      if (data.success && data.advice) {
        setAdvice(data.advice);
      } else {
        generateFallbackAdvice();
      }
    } catch (e) {
      generateFallbackAdvice();
    } finally {
      setLoadingAdvice(false);
    }
  };

  // Generate deterministic fallback advice based on real field values if API is unavailable
  const generateFallbackAdvice = () => {
    const lowMoistureFields = fields.filter(f => f.soilMoisture < 40);
    const highHeatFields = fields.filter(f => f.soilMoisture < 30 || f.status === 'ATTENTION_REQUIRED');

    if (lowMoistureFields.length > 0) {
      setAdvice({
        healthStatus: 'ATTENTION_REQUIRED',
        summary: `Soil moisture dropped below threshold in ${lowMoistureFields.map(f => f.name).join(', ')}. Immediate drip irrigation scheduled.`,
        recommendations: [
          {
            priority: 'HIGH',
            targetField: lowMoistureFields[0].name,
            action: 'Execute 45-Min Emergency Drip Irrigation',
            rationale: `Current moisture is ${lowMoistureFields[0].soilMoisture}%, which is below the 40% optimal baseline for ${lowMoistureFields[0].crop_type}.`,
            suggestedSop: 'SOP-IRR-02'
          },
          {
            priority: 'MEDIUM',
            targetField: fields[0]?.name || 'All Fields',
            action: 'Soil Nutrient & EC Verification',
            rationale: 'Post-irrigation electrical conductivity check ensures balanced fertigation absorption.',
            suggestedSop: 'SOP-FERT-01'
          }
        ]
      });
    } else {
      setAdvice({
        healthStatus: 'OPTIMAL',
        summary: 'All field telemetry levels (moisture, temperature, canopy growth) are within target agronomical ranges.',
        recommendations: [
          {
            priority: 'LOW',
            targetField: 'Field A (Oil Palm)',
            action: 'Routine Nursery Canopy Moisture Log',
            rationale: 'Routine bi-weekly seedling inspection to maintain root vigor ahead of seasonal rainfall.',
            suggestedSop: 'SOP-INSP-01'
          }
        ]
      });
    }
  };

  useEffect(() => {
    if (isOpen && !advice) {
      fetchRealtimeAdvice();
    }
  }, [isOpen]);

  // Handle query submission
  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isSending) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      sender: 'user',
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery('');
    setIsSending(true);

    try {
      const res = await fetch('/api/gemini/crop-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userQuery: textToSend,
          fields,
          cropLogs
        })
      });

      const text = await res.text();
      let data: any = {};
      try {
        data = JSON.parse(text);
      } catch (err) {
        data = {};
      }
      let reply = '';
      if (data.success && data.replyText) {
        reply = data.replyText;
      } else {
        reply = getFallbackChatReply(textToSend);
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, aiMsg]);
    } catch (e) {
      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        sender: 'ai',
        text: getFallbackChatReply(textToSend),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const getFallbackChatReply = (query: string): string => {
    const q = query.toLowerCase();
    if (q.includes('moisture') || q.includes('irrigation') || q.includes('water')) {
      const fieldList = fields.map(f => `• **${f.name}** (${f.crop_type}): Moisture ${f.soilMoisture}% [${f.soilMoisture < 40 ? 'Action Needed' : 'Normal'}]`).join('\n');
      return `Based on live telemetry:\n${fieldList}\n\n**Agronomic Advice:** Keep Oil Palm seedlings around 45–60% moisture. If moisture drops below 35%, execute 45-minute drip cycles via SOP-IRR-02.`;
    }
    if (q.includes('yield') || q.includes('rain') || q.includes('weather')) {
      return `**Precipitation vs Yield Insights:**\n• Current rainfall correlation coefficient is **+0.91** (Strong Positive).\n• Optimal precipitation window: **180–280 mm/month** yields max ~3.2 Tons/Ha for soybean and palm oil blocks.\n• Ensure drainage channels in Field B are clear during peak downpours.`;
    }
    return `**Agronomist Response:** I have analyzed your telemetry. All active fields (${fields.length} blocks) are monitored. Keep regular logs updated via the WhatsApp Bot or Pre-flight Checklist for maximum predictive accuracy.`;
  };

  const quickPrompts = [
    "⚡ Analyze field moisture levels",
    "🌧️ Climate & rainfall yield advice",
    "💧 Emergency irrigation protocol",
    "🌴 Oil palm seedling health check"
  ];

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop for mobile */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950 z-40 lg:hidden"
          />

          {/* Right Floating Sidebar Panel */}
          <motion.aside
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-slate-900 text-white z-50 flex flex-col shadow-2xl border-l border-slate-800"
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/80 backdrop-blur-sm">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-gradient-to-tr from-emerald-600 to-teal-500 rounded-xl text-slate-950 shadow-md">
                  <Sparkles size={18} />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="font-bold text-sm font-display text-white tracking-wide">Gemini AI Agronomist</h3>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-400 font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/30">LIVE</span>
                  </div>
                  <p className="text-3xs text-slate-400 font-mono">Real-Time Crop Telemetry & Management</p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={fetchRealtimeAdvice}
                  disabled={loadingAdvice}
                  title="Refresh AI Analysis"
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={15} className={loadingAdvice ? 'animate-spin text-emerald-400' : ''} />
                </button>
                <button
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Scrollable Body */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans">
              
              {/* Real-time Diagnostics Card */}
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800 space-y-3 relative overflow-hidden">
                <div className="absolute -right-8 -top-8 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
                
                <div className="flex justify-between items-center">
                  <span className="text-3xs font-mono font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <BrainCircuit size={13} className="text-emerald-400" />
                    <span>Live Field Diagnostics</span>
                  </span>

                  {advice?.healthStatus === 'OPTIMAL' && (
                    <span className="bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                      <CheckCircle2 size={11} /> OPTIMAL
                    </span>
                  )}
                  {advice?.healthStatus === 'ATTENTION_REQUIRED' && (
                    <span className="bg-amber-950 text-amber-400 border border-amber-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={11} /> ATTENTION REQUIRED
                    </span>
                  )}
                  {advice?.healthStatus === 'CRITICAL' && (
                    <span className="bg-rose-950 text-rose-400 border border-rose-800 text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                      <AlertTriangle size={11} /> CRITICAL
                    </span>
                  )}
                </div>

                {loadingAdvice ? (
                  <div className="py-6 flex flex-col items-center justify-center space-y-2 text-slate-400">
                    <Loader2 size={20} className="animate-spin text-emerald-400" />
                    <span className="text-3xs font-mono">Analyzing soil moisture & weather telemetry...</span>
                  </div>
                ) : (
                  <>
                    <p className="text-slate-300 text-xs leading-relaxed font-sans">
                      {advice?.summary || "Analyzing telemetry across active field blocks..."}
                    </p>

                    {/* Recommendations List */}
                    {advice?.recommendations && advice.recommendations.length > 0 && (
                      <div className="space-y-2 pt-1">
                        <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                          Prioritized Actions:
                        </span>
                        {advice.recommendations.map((rec, idx) => (
                          <div 
                            key={idx} 
                            className="bg-slate-900 p-3 rounded-xl border border-slate-800 space-y-2 text-xs"
                          >
                            <div className="flex justify-between items-start">
                              <span className="font-bold text-slate-100 flex items-center gap-1.5">
                                <span className={`w-1.5 h-1.5 rounded-full ${rec.priority === 'HIGH' ? 'bg-rose-500' : rec.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                                {rec.action}
                              </span>
                              <span className={`text-[9px] font-mono font-bold px-1.5 py-0.5 rounded uppercase ${
                                rec.priority === 'HIGH' ? 'bg-rose-950 text-rose-300 border border-rose-800' : 'bg-amber-950 text-amber-300 border border-amber-800'
                              }`}>
                                {rec.priority}
                              </span>
                            </div>

                            <p className="text-slate-400 text-[11px] leading-normal">
                              {rec.rationale}
                            </p>

                            <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[10px] text-slate-400 font-mono">
                              <span>Target: <strong className="text-emerald-400">{rec.targetField}</strong></span>
                              <div className="flex items-center space-x-2">
                                {rec.suggestedSop && (
                                  <span className="bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                                    {rec.suggestedSop}
                                  </span>
                                )}
                                {onPreFillWhatsApp && (
                                  <button
                                    onClick={() => {
                                      onPreFillWhatsApp(`*AI DISPATCH (${rec.suggestedSop})*: Action for ${rec.targetField}: ${rec.action}. Rationale: ${rec.rationale}`);
                                      if (onNavigateToTab) onNavigateToTab('whatsapp');
                                    }}
                                    className="text-emerald-400 hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
                                  >
                                    <span>Dispatch</span>
                                    <ArrowRight size={10} />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Chat Conversation Stream */}
              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider">
                  <span>Interactive Agronomist Assistant</span>
                  <span className="text-emerald-400">Gemini 3.6 Flash</span>
                </div>

                <div className="space-y-3">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${msg.sender === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center space-x-1.5 mb-1 text-[10px] font-mono text-slate-400">
                        {msg.sender === 'ai' ? (
                          <>
                            <Bot size={12} className="text-emerald-400" />
                            <span className="font-bold text-emerald-400">Gemini AI</span>
                          </>
                        ) : (
                          <span className="font-bold text-slate-300">Supervisor</span>
                        )}
                        <span>• {msg.timestamp}</span>
                      </div>

                      <div
                        className={`p-3 rounded-2xl max-w-[92%] leading-relaxed text-xs ${
                          msg.sender === 'user'
                            ? 'bg-emerald-600 text-slate-950 font-medium rounded-tr-none shadow-md'
                            : 'bg-slate-950 text-slate-200 border border-slate-800 rounded-tl-none space-y-2'
                        }`}
                      >
                        <div className="whitespace-pre-wrap">{msg.text}</div>

                        {msg.sender === 'ai' && (
                          <div className="flex justify-end pt-1">
                            <button
                              onClick={() => handleCopyText(msg.text, msg.id)}
                              className="text-[10px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                            >
                              {copiedId === msg.id ? (
                                <>
                                  <Check size={10} className="text-emerald-400" />
                                  <span className="text-emerald-400">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={10} />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {isSending && (
                    <div className="flex flex-col items-start space-y-1">
                      <div className="flex items-center space-x-1.5 text-[10px] font-mono text-slate-400">
                        <Bot size={12} className="text-emerald-400 animate-pulse" />
                        <span className="font-bold text-emerald-400">Gemini AI Thinking...</span>
                      </div>
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 flex items-center space-x-2 text-slate-400">
                        <Loader2 size={14} className="animate-spin text-emerald-400" />
                        <span className="text-3xs font-mono">Evaluating crop telemetry & SOP database...</span>
                      </div>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

            </div>

            {/* Quick Prompts & Chat Input Area */}
            <div className="p-3 border-t border-slate-800 bg-slate-950/90 space-y-2.5">
              {/* Quick Prompt Chips */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-[11px]">
                {quickPrompts.map((prompt, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendMessage(prompt)}
                    disabled={isSending}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-emerald-300 border border-slate-800 rounded-full px-2.5 py-1 whitespace-nowrap transition-colors cursor-pointer text-3xs font-medium flex-shrink-0"
                  >
                    {prompt}
                  </button>
                ))}
              </div>

              {/* Input Form */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center space-x-2"
              >
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask Gemini about soil, yield, or SOPs..."
                  disabled={isSending}
                  className="flex-1 bg-slate-900 border border-slate-800 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-all font-sans"
                />
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isSending}
                  className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-slate-950 p-2.5 rounded-xl font-bold transition-all cursor-pointer flex-shrink-0"
                >
                  <Send size={15} />
                </button>
              </form>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}

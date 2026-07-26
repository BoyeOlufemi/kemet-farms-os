import React, { useState } from 'react';
import Markdown from 'react-markdown';
import { 
  BookOpen, 
  PhoneCall, 
  Calendar, 
  Copy, 
  Check, 
  MessageSquare, 
  ArrowRight, 
  Sparkles, 
  Bot, 
  Send, 
  RefreshCw, 
  Sprout, 
  ShieldCheck, 
  Droplets, 
  Bug, 
  CheckSquare, 
  Share2, 
  AlertCircle,
  FileText,
  Layers,
  Leaf
} from 'lucide-react';
import { Field } from '../types';

interface SOPDocsProps {
  onPreFillWhatsApp?: (text: string) => void;
  onNavigateToTab?: (tab: string) => void;
  fields?: Field[];
}

// Preset Organic Farming Scenarios for quick generation
const ORGANIC_SCENARIOS = [
  {
    id: 'pest_control',
    title: 'Organic Pest & Insect Control',
    icon: Bug,
    crop: 'SOYBEAN',
    prompt: 'Provide a standardized organic pest management SOP for Soybeans targeting leaf chewers and pod borers using neem oil emulsification, companion planting, and biological controls.',
    desc: 'Neem spray emulsification, biological controls, and monitoring.'
  },
  {
    id: 'palm_ring_weeding',
    title: 'Palm Seedling Ring Clearance',
    icon: Sprout,
    crop: 'PALM',
    prompt: 'Provide a high-efficiency manual weed ring clearance and mulching SOP for Tenera Palm seedlings (2-meter radius, zero chemical herbicide). Include exact steps and tool safety.',
    desc: '2m radius weed-free ring, palm frond mulching & root protection.'
  },
  {
    id: 'composting_cn',
    title: 'Thermophilic Composting Protocol',
    icon: Leaf,
    crop: 'GENERAL',
    prompt: 'Provide a high-efficiency 30:1 Carbon-to-Nitrogen thermophilic composting SOP using agricultural residues (oil palm bunch refuse, soy stover, poultry manure). Include pile dimensions, moisture test (sponge test), and turning schedule.',
    desc: '30:1 C:N ratio, moisture sponge test, pile turning intervals.'
  },
  {
    id: 'soil_nutrition',
    title: 'Bio-Fertilizer & N-Fixation SOP',
    icon: ShieldCheck,
    crop: 'SOYBEAN',
    prompt: 'Provide an organic soil nutrition SOP for Soybeans incorporating Bradyrhizobium japonicum seed inoculation, rock phosphate application, and wood ash potash booster.',
    desc: 'Rhizobium strain seed inoculation, rock phosphate, & ash booster.'
  },
  {
    id: 'irrigation_drought',
    title: 'Organic Drought & Evapotranspiration',
    icon: Droplets,
    crop: 'GENERAL',
    prompt: 'Provide a drought mitigation and soil moisture retention SOP for dual-cropped fields during high heat alerts (>36°C). Include organic straw mulching, shade canopy management, and micro-irrigation timing.',
    desc: 'Soil moisture retention, organic straw mulching, irrigation timing.'
  },
  {
    id: 'post_harvest',
    title: 'Post-Harvest Organic Seed Storage',
    icon: CheckSquare,
    crop: 'SOYBEAN',
    prompt: 'Provide an organic post-harvest handling and seed storage SOP for Soybeans. Include moisture meter verification (below 10%), solar drying protocols, and botanical pest repellents (neem leaf powder) for hermetic bags.',
    desc: 'Moisture target <10%, solar drying, neem powder hermetic storage.'
  }
];

export default function SOPDocs({
  onPreFillWhatsApp,
  onNavigateToTab,
  fields = []
}: SOPDocsProps) {
  const [activeDoc, setActiveDoc] = useState<'ai-manager' | 'whatsapp' | 'voice' | 'crops'>('ai-manager');
  const [selectedCrop, setSelectedCrop] = useState<string>('GENERAL');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedScenario, setSelectedScenario] = useState<string>('pest_control');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Default initial SOP response
  const [sopResponse, setSopResponse] = useState<string>(`### 🌾 Standard Operating Procedure: Organic Pest & Insect Control
**Target Crops:** Soybeans (Field B) & Tenera Palm Nursery  
**Protocol Basis:** USDA Organic / IFOAM Standardized Biological Pest Management  
**Field Efficiency Target:** 100% Non-Chemical, Zero Harvest Residue  

---

#### 1. Pre-Flight Preparation & Tools Required
- [ ] **Personal Protective Equipment (PPE):** Safety goggles, cloth face mask, rubber gloves, long-sleeved cotton coveralls.
- [ ] **Application Equipment:** 15-Liter knapsack sprayer fitted with a hollow-cone brass nozzle (calibrated to 2.0 bar pressure).
- [ ] **Organic Active Mixture (per 15L tank):**
  - **Cold-pressed Neem Oil (100% Pure):** 75 ml (0.5% v/v concentration).
  - **Organic Potassium Soft Soap (Emulsifier):** 30 ml.
  - **Clean Well Water:** 14.9 Liters (pH 6.2 - 6.8).

---

#### 2. Emulsification & Mixing Sequence
1. **Premixing Step:** In a clean 1-liter vessel, combine 75ml cold-pressed neem oil with 30ml organic soft soap. Stir vigorously for 120 seconds until a milky, uniform emulsion forms.
2. **Tank Loading:** Fill knapsack sprayer half-full (7.5L) with clean well water.
3. **Agitation:** Pour the emulsified neem solution into the tank, then add remaining water to reach the 15-Liter fill line. Shake tank vigorously for 30 seconds.

---

#### 3. Field Application Protocol
- [ ] **Application Window:** Apply strictly between **06:30 - 08:30 AM** or **05:00 - 06:30 PM** to prevent leaf scorching from solar radiation and protect beneficial pollinators (bees).
- [ ] **Spraying Technique:** Walk at a steady pace of 1 meter per second. Hold nozzle 30cm above crop canopy. Ensure 100% coverage on underside of leaves where soybean pod borer larvae feed.
- [ ] **Tree Ring Exclusion Zone:** Maintain a 1-meter spray buffer around Tenera Palm stems to avoid unnecessary oil residue buildup on young frond stems.

---

#### 4. Safety, Cleanup & Inspection Log
- [ ] **Post-Application Washdown:** Rinse knapsack sprayer 3x with fresh water. Triple-rinsate must be discharged onto non-crop field perimeter.
- [ ] **Field Verification:** Inspect leaf undersides 48 hours post-application. If pest count exceeds threshold of 3 larvae per plant, log a WhatsApp dispatch for biological parasitoid wasp release.`);

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleSimulateCommand = (text: string) => {
    if (onPreFillWhatsApp) {
      onPreFillWhatsApp(text);
    }
    if (onNavigateToTab) {
      onNavigateToTab('whatsapp');
    }
  };

  // Generate SOP via Gemini Backend API
  const handleGenerateSOP = async (overridePrompt?: string, scenarioId?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const activeScenarioObj = ORGANIC_SCENARIOS.find(s => s.id === (scenarioId || selectedScenario));
    const finalPrompt = overridePrompt || customPrompt || activeScenarioObj?.prompt || "Provide an organic farming SOP checklist.";
    const fieldObj = fields.find(f => f.id === selectedField);

    try {
      const response = await fetch('/api/sop/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          cropType: selectedCrop,
          fieldName: fieldObj ? fieldObj.name : undefined,
          scenario: activeScenarioObj ? activeScenarioObj.title : 'Field Operation'
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to communicate with AI Operations backend.");
      }

      if (data.sopText) {
        setSopResponse(data.sopText);
      } else {
        throw new Error("No SOP text returned from server.");
      }
    } catch (err: any) {
      console.error("SOP Generation Error:", err);
      setErrorMsg(err.message || "An error occurred while generating the SOP. Please check the server.");
    } finally {
      setIsLoading(false);
    }
  };

  const docs = {
    whatsapp: {
      title: 'WhatsApp Staff SOP',
      desc: 'Channel communication templates and automated response rules.',
      sections: [
        {
          title: 'Daily Task Assignment',
          template: '🌹 Kemet daily task: {{action_type}} on {{crop_type}} at {{field_id}}. Reply done when complete, or conflict if blocked.',
          example: 'done',
          note: 'Sent out in the morning by the n8n schedule. Staff reply "done" or "conflict".'
        },
        {
          title: 'Rain / Meteorological Warning',
          template: '🌧️ Rain alert for {{field_id}}: {{rain_mm}}mm+ expected in the next hour. Hold fertilizer and irrigation for {{hold_hours}} hours.',
          example: 'status',
          note: 'Triggered automatically when Open-Meteo forecasts rain > 5mm.'
        },
        {
          title: 'Extreme Heat Warning',
          template: '🌡️ Heat alert for {{field_id}}: temp above {{temp_c}}°C. Increase hydration checks for {{crop_type}} rows.',
          example: 'status',
          note: 'Triggered automatically when local temperatures exceed 36°C.'
        },
        {
          title: 'Unsubscribe Protocol',
          template: 'You have been removed from WhatsApp alerts. Contact the farm office to reactivate.',
          example: 'stop',
          note: 'Triggers when staff reply "stop" or "unsubscribe".'
        }
      ]
    },
    voice: {
      title: 'Voice SOP & Training',
      desc: 'SOP guidelines for field managers communicating with local staff.',
      guidelines: [
        'Keep farm operational guidelines low-bandwidth, conversational, and visual.',
        'Use simple, clear WhatsApp automated checklists to notify field staff of daily tasks.',
        'Phrase all instruction packets strictly as actions and responses. Avoid academic jargon.',
        'No media attachments (images/videos) should be transmitted unless specifically approved by the General Supervisor to conserve operator cellular bandwidth.'
      ]
    },
    crops: {
      title: 'Dual-Crop Timeline',
      desc: 'Maturation timelines and agricultural parameters for Kemet crops.',
      crops: [
        {
          name: '🌴 Tenera Palm Seedlings (Long-Term Asset)',
          maturation: '3–4 years maturation',
          spacing: '8m x 8m (160 seedlings across 1.5 Hectares)',
          action: 'Monthly manual weed ring clearance & focused root fertilizer application.'
        },
        {
          name: '🌱 Soybeans (Short-Term Cash Flow)',
          maturation: '90–120 days cycle',
          spacing: 'Intercropped perfectly between Tenera Palm rows',
          action: 'Automated rain, solar radiation, and soil evapotranspiration balancing.'
        }
      ]
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="sop_docs_panel">
      
      {/* Sidebar Selector Navigation */}
      <div className="lg:col-span-4 bg-white rounded-2xl border border-gray-100 p-4 space-y-2 h-fit shadow-3xs">
        
        {/* Featured Tab: AI Operations Manager */}
        <button
          onClick={() => setActiveDoc('ai-manager')}
          className={`w-full p-3.5 rounded-xl text-left border flex items-center space-x-3 transition-all cursor-pointer relative overflow-hidden ${
            activeDoc === 'ai-manager' 
              ? 'bg-gradient-to-r from-emerald-50 to-teal-50/70 border-emerald-400 shadow-2xs' 
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeDoc === 'ai-manager' ? 'bg-emerald-600 text-white' : 'bg-emerald-100 text-emerald-800'}`}>
            <Bot size={18} />
          </div>
          <div>
            <div className="flex items-center space-x-1.5">
              <h4 className="font-bold text-xs text-gray-900">AI Operations Manager</h4>
              <span className="bg-emerald-600 text-white text-[8px] font-mono uppercase px-1.5 py-0.5 rounded-md font-extrabold tracking-wider">
                ACTIVE AI
              </span>
            </div>
            <p className="text-3xs text-gray-500 mt-0.5">Organic protocols & SOP generator</p>
          </div>
        </button>

        {/* Existing Tab: WhatsApp SOP */}
        <button
          onClick={() => setActiveDoc('whatsapp')}
          className={`w-full p-3.5 rounded-xl text-left border flex items-center space-x-3 transition-all cursor-pointer ${
            activeDoc === 'whatsapp' 
              ? 'bg-emerald-50/75 border-emerald-300' 
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeDoc === 'whatsapp' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
            <MessageSquare size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-gray-800">WhatsApp SOP</h4>
            <p className="text-3xs text-gray-400 mt-0.5">Automated bot response schema</p>
          </div>
        </button>

        {/* Existing Tab: Voice Guidelines */}
        <button
          onClick={() => setActiveDoc('voice')}
          className={`w-full p-3.5 rounded-xl text-left border flex items-center space-x-3 transition-all cursor-pointer ${
            activeDoc === 'voice' 
              ? 'bg-emerald-50/75 border-emerald-300' 
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeDoc === 'voice' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
            <PhoneCall size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-gray-800">Voice Guidelines</h4>
            <p className="text-3xs text-gray-400 mt-0.5">Low-bandwidth training rules</p>
          </div>
        </button>

        {/* Existing Tab: Dual-Crop Timeline */}
        <button
          onClick={() => setActiveDoc('crops')}
          className={`w-full p-3.5 rounded-xl text-left border flex items-center space-x-3 transition-all cursor-pointer ${
            activeDoc === 'crops' 
              ? 'bg-emerald-50/75 border-emerald-300' 
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50'
          }`}
        >
          <div className={`p-2.5 rounded-xl ${activeDoc === 'crops' ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'}`}>
            <Calendar size={16} />
          </div>
          <div>
            <h4 className="font-semibold text-xs text-gray-800">Crop Schedules</h4>
            <p className="text-3xs text-gray-400 mt-0.5">Tenera Palm & Soybean specs</p>
          </div>
        </button>

        {/* Agricultural Standards Notice */}
        <div className="pt-3 border-t border-gray-100 space-y-2 text-2xs text-gray-500">
          <div className="flex items-center space-x-2 text-emerald-700 font-bold">
            <ShieldCheck size={14} />
            <span>USDA Organic Compliant</span>
          </div>
          <p className="text-3xs text-gray-400 leading-relaxed">
            All generated SOPs enforce non-chemical, high-efficiency organic farming protocols tailored for Nigerian agricultural zones.
          </p>
        </div>

      </div>

      {/* Main Content Area */}
      <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-3xs">
        
        {/* 🤖 FEATURED VIEW: AI Operations Manager Workspace */}
        {activeDoc === 'ai-manager' && (
          <div className="space-y-6">
            
            {/* Header Banner */}
            <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
                    <Sparkles size={16} />
                  </span>
                  <h3 className="text-base font-bold font-display text-white">AI Agricultural Operations Manager</h3>
                </div>
                <p className="text-2xs text-slate-300 leading-relaxed">
                  Real-time organic protocol engine powered by server-side Gemini API. Generates high-efficiency, step-by-step field checklists with zero vague advice.
                </p>
              </div>

              <div className="flex items-center space-x-2 bg-slate-800/80 px-3 py-1.5 rounded-xl border border-slate-700 text-3xs font-mono text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Gemini 3.6 Flash Engine</span>
              </div>
            </div>

            {/* Quick Organic Scenario Trigger Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 font-display flex items-center justify-between">
                <span>Select Standardized Organic Scenario</span>
                <span className="text-3xs text-gray-400 font-normal">Click to trigger instant SOP generation</span>
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {ORGANIC_SCENARIOS.map((sec) => {
                  const IconComp = sec.icon;
                  const isSelected = selectedScenario === sec.id;
                  
                  return (
                    <button
                      key={sec.id}
                      onClick={() => {
                        setSelectedScenario(sec.id);
                        setSelectedCrop(sec.crop);
                        handleGenerateSOP(sec.prompt, sec.id);
                      }}
                      className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between space-y-2 ${
                        isSelected 
                          ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20' 
                          : 'bg-slate-50/60 border-gray-200 hover:bg-slate-100/80 hover:border-gray-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-700'}`}>
                          <IconComp size={14} />
                        </span>
                        <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 rounded-md font-bold bg-white text-gray-600 border border-gray-100">
                          {sec.crop}
                        </span>
                      </div>
                      <div>
                        <h5 className="font-bold text-xs text-gray-800">{sec.title}</h5>
                        <p className="text-[10px] text-gray-500 line-clamp-2 mt-0.5">{sec.desc}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Controls Toolbar: Field Filter & Custom Query Prompt */}
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200/80 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                
                {/* Crop Type Selector */}
                <div>
                  <label className="text-2xs font-bold text-gray-700 block mb-1">Target Crop Protocol</label>
                  <select
                    value={selectedCrop}
                    onChange={(e) => setSelectedCrop(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="GENERAL">🌱 All Organic Crops (General Farm Protocols)</option>
                    <option value="PALM">🌴 Tenera Palm Seedlings (Asset Management)</option>
                    <option value="SOYBEAN">🌱 Soybeans (Cash Crop Operations)</option>
                  </select>
                </div>

                {/* Field Location Selector */}
                <div>
                  <label className="text-2xs font-bold text-gray-700 block mb-1">Apply to Farm Field</label>
                  <select
                    value={selectedField}
                    onChange={(e) => setSelectedField(e.target.value)}
                    className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2 text-xs font-semibold text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="all">Entire Operational Farm Boundary</option>
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.crop_type}) - {f.sizeHectares} Ha</option>
                    ))}
                  </select>
                </div>

              </div>

              {/* Custom Prompt Input */}
              <div className="space-y-1.5 pt-1">
                <label className="text-2xs font-bold text-gray-700 block">
                  Custom Organic Operation Query or Specific Field Challenge
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isLoading) {
                        handleGenerateSOP();
                      }
                    }}
                    placeholder="e.g. Generate a high-efficiency SOP for bio-char soil amendment mixture ratios..."
                    className="flex-1 bg-white border border-gray-300 rounded-xl px-3.5 py-2.5 text-xs text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => handleGenerateSOP()}
                    disabled={isLoading}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center space-x-2 transition-all disabled:opacity-50 cursor-pointer shadow-xs"
                  >
                    {isLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Generate SOP</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="bg-rose-50 border border-rose-200 p-3.5 rounded-xl flex items-start space-x-2.5 text-rose-800 text-xs">
                <AlertCircle size={16} className="text-rose-600 mt-0.5 flex-shrink-0" />
                <div className="space-y-0.5">
                  <span className="font-bold">Backend Communication Notice:</span>
                  <p>{errorMsg}</p>
                </div>
              </div>
            )}

            {/* Generated SOP Result Container */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-md relative">
              
              {/* Header Action Bar */}
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white font-display">Generated Field Checklist</h4>
                    <span className="text-[10px] text-slate-400 font-mono">Formatted for immediate WhatsApp & supervisor log dispatch</span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {/* Copy Checklist Button */}
                  <button
                    onClick={() => handleCopy(sopResponse, 'ai-sop-response')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 text-2xs font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
                    title="Copy SOP Checklist"
                  >
                    {copiedId === 'ai-sop-response' ? (
                      <>
                        <Check size={12} className="text-emerald-400" />
                        <span className="text-emerald-400 font-bold">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy size={12} />
                        <span>Copy SOP</span>
                      </>
                    )}
                  </button>

                  {/* Test in WhatsApp Simulator */}
                  {onPreFillWhatsApp && (
                    <button
                      onClick={() => handleSimulateCommand(sopResponse.slice(0, 300) + '... [Full SOP in logs]')}
                      className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-2xs font-bold flex items-center space-x-1.5 transition-colors cursor-pointer shadow-2xs"
                      title="Send preview to WhatsApp Simulator"
                    >
                      <Share2 size={12} />
                      <span>Test in WhatsApp Bot</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Loading State Spinner overlay */}
              {isLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-emerald-400">
                  <RefreshCw size={28} className="animate-spin" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold font-mono">Synthesizing Organic Protocol...</p>
                    <p className="text-[10px] text-slate-400">Consulting USDA/IFOAM organic ratios & field checklist guidelines</p>
                  </div>
                </div>
              ) : (
                /* Markdown Rendered Content */
                <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 text-slate-200 font-sans">
                  <div className="markdown-body text-slate-200">
                    <Markdown>{sopResponse}</Markdown>
                  </div>
                </div>
              )}

              {/* Bottom Verification Footer */}
              <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-[10px] font-mono text-slate-400">
                <div className="flex items-center space-x-1.5 text-emerald-400">
                  <ShieldCheck size={12} />
                  <span>Verified Operational Checklist</span>
                </div>
                <span>Standardized organic farming protocols</span>
              </div>

            </div>

          </div>
        )}

        {/* 💬 TAB VIEW: WhatsApp SOP */}
        {activeDoc === 'whatsapp' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold font-display text-gray-800">{docs.whatsapp.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{docs.whatsapp.desc}</p>
            </div>

            <div className="space-y-4">
              {docs.whatsapp.sections.map((sec, idx) => (
                <div key={idx} className="bg-slate-50/50 p-4 rounded-xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-start gap-4">
                    <h4 className="font-semibold text-xs text-gray-800">{sec.title}</h4>
                    <span className="text-3xs text-gray-400 italic font-mono">{sec.note}</span>
                  </div>
                  
                  <div className="bg-slate-900 text-slate-100 p-3 rounded-lg font-mono text-3xs border border-slate-800 relative group">
                    <p className="pr-12 whitespace-pre-wrap">{sec.template}</p>
                    <button
                      onClick={() => handleCopy(sec.template, `template-${idx}`)}
                      className="absolute right-2 top-2 p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
                      title="Copy template"
                    >
                      {copiedId === `template-${idx}` ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                    </button>
                  </div>

                  {onPreFillWhatsApp && (
                    <div className="flex justify-end pt-1">
                      <button
                        onClick={() => handleSimulateCommand(sec.example)}
                        className="text-3xs text-emerald-600 font-bold hover:text-emerald-700 flex items-center space-x-1 hover:underline cursor-pointer"
                      >
                        <span>Test command "{sec.example}" in Simulator</span>
                        <ArrowRight size={10} />
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🎙️ TAB VIEW: Voice & Training Guidelines */}
        {activeDoc === 'voice' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold font-display text-gray-800">{docs.voice.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{docs.voice.desc}</p>
            </div>

            <div className="space-y-3">
              {docs.voice.guidelines.map((line, idx) => (
                <div key={idx} className="flex items-start space-x-3 text-xs text-gray-600 leading-relaxed bg-slate-50/50 p-3.5 rounded-xl border border-gray-100">
                  <span className="text-emerald-500 font-bold font-mono">0{idx + 1}.</span>
                  <p>{line}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 🗓️ TAB VIEW: Dual-Crop Timeline */}
        {activeDoc === 'crops' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-base font-bold font-display text-gray-800">{docs.crops.title}</h3>
              <p className="text-xs text-gray-500 mt-1">{docs.crops.desc}</p>
            </div>

            <div className="space-y-4">
              {docs.crops.crops.map((crop, idx) => (
                <div key={idx} className="bg-slate-50/50 p-5 rounded-2xl border border-gray-100 space-y-3">
                  <div className="flex justify-between items-center border-b border-gray-200/50 pb-2">
                    <h4 className="font-semibold text-xs text-gray-800">{crop.name}</h4>
                    <span className="text-3xs uppercase font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">{crop.maturation}</span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                    <div className="space-y-1">
                      <span className="text-3xs uppercase tracking-wider font-semibold text-gray-400">Spacing Matrix</span>
                      <p className="text-gray-700 font-medium">{crop.spacing}</p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-3xs uppercase tracking-wider font-semibold text-gray-400">Field SOP Duty</span>
                      <p className="text-gray-700 font-medium">{crop.action}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

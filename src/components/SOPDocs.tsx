import React, { useState, useEffect, useMemo } from 'react';
import Markdown from 'react-markdown';
import { authenticatedFetch } from '../utils/authenticatedFetch';
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
  Leaf,
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Printer,
  Download,
  Calculator,
  UserCheck,
  ChevronRight,
  ChevronLeft,
  Sliders,
  Plus,
  Trash2,
  ClipboardList,
  Search,
  X,
  Filter
} from 'lucide-react';
import { Field, StaffMember } from '../types';

interface SOPDocsProps {
  onPreFillWhatsApp?: (text: string) => void;
  onNavigateToTab?: (tab: string) => void;
  fields?: Field[];
  staff?: StaffMember[];
  onAssignTask?: (fieldId: string, actionType: string, staffId: string) => void;
}

interface InteractiveStep {
  id: string;
  section: string;
  text: string;
  completed: boolean;
  notes?: string;
}

// Preset Organic Farming Scenarios for quick generation
const ORGANIC_SCENARIOS = [
  {
    id: 'pest_control',
    title: 'Organic Pest & Insect Control',
    icon: Bug,
    crop: 'SOYBEAN',
    category: 'Pest Management',
    prompt: 'Provide a standardized organic pest management SOP for Soybeans targeting leaf chewers and pod borers using neem oil emulsification, companion planting, and biological controls.',
    desc: 'Neem spray emulsification, biological controls, and monitoring.'
  },
  {
    id: 'palm_ring_weeding',
    title: 'Palm Seedling Ring Clearance',
    icon: Sprout,
    crop: 'PALM',
    category: 'Asset Maintenance',
    prompt: 'Provide a high-efficiency manual weed ring clearance and mulching SOP for Tenera Palm seedlings (2-meter radius, zero chemical herbicide). Include exact steps and tool safety.',
    desc: '2m radius weed-free ring, palm frond mulching & root protection.'
  },
  {
    id: 'composting_cn',
    title: 'Thermophilic Composting Protocol',
    icon: Leaf,
    crop: 'GENERAL',
    category: 'Soil & Fertilizer',
    prompt: 'Provide a high-efficiency 30:1 Carbon-to-Nitrogen thermophilic composting SOP using agricultural residues (oil palm bunch refuse, soy stover, poultry manure). Include pile dimensions, moisture test (sponge test), and turning schedule.',
    desc: '30:1 C:N ratio, moisture sponge test, pile turning intervals.'
  },
  {
    id: 'soil_nutrition',
    title: 'Bio-Fertilizer & N-Fixation SOP',
    icon: ShieldCheck,
    crop: 'SOYBEAN',
    category: 'Soil & Fertilizer',
    prompt: 'Provide an organic soil nutrition SOP for Soybeans incorporating Bradyrhizobium japonicum seed inoculation, rock phosphate application, and wood ash potash booster.',
    desc: 'Rhizobium strain seed inoculation, rock phosphate, & ash booster.'
  },
  {
    id: 'irrigation_drought',
    title: 'Organic Drought & Evapotranspiration',
    icon: Droplets,
    crop: 'GENERAL',
    category: 'Irrigation & Drought',
    prompt: 'Provide a drought mitigation and soil moisture retention SOP for dual-cropped fields during high heat alerts (>36°C). Include organic straw mulching, shade canopy management, and micro-irrigation timing.',
    desc: 'Soil moisture retention, organic straw mulching, irrigation timing.'
  },
  {
    id: 'post_harvest',
    title: 'Post-Harvest Organic Seed Storage',
    icon: CheckSquare,
    crop: 'SOYBEAN',
    category: 'Post-Harvest',
    prompt: 'Provide an organic post-harvest handling and seed storage SOP for Soybeans. Include moisture meter verification (below 10%), solar drying protocols, and botanical pest repellents (neem leaf powder) for hermetic bags.',
    desc: 'Moisture target <10%, solar drying, neem powder hermetic storage.'
  }
];

// Helper to extract checklist steps from generated Markdown text
const parseStepsFromMarkdown = (text: string): InteractiveStep[] => {
  const lines = text.split('\n');
  const steps: InteractiveStep[] = [];
  let currentSection = 'Pre-Flight Preparation';
  let stepCounter = 1;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line.startsWith('#') || line.startsWith('###') || line.startsWith('####')) {
      currentSection = line.replace(/^[#\s]+/, '').replace(/[\*\_]+/g, '').trim();
    } else if (line.startsWith('- [ ]') || line.startsWith('- [x]') || line.startsWith('* [ ]') || line.startsWith('* [x]')) {
      const isDone = line.includes('[x]');
      const cleanText = line.replace(/^[\-\*]\s*\[[ x]\]\s*/, '').replace(/[\*\_]+/g, '').trim();
      if (cleanText) {
        steps.push({
          id: `step-${stepCounter++}`,
          section: currentSection,
          text: cleanText,
          completed: isDone,
          notes: ''
        });
      }
    } else if (/^\d+\.\s+/.test(line)) {
      const cleanText = line.replace(/^\d+\.\s+/, '').replace(/[\*\_]+/g, '').trim();
      if (cleanText) {
        steps.push({
          id: `step-${stepCounter++}`,
          section: currentSection,
          text: cleanText,
          completed: false,
          notes: ''
        });
      }
    }
  }

  // Fallback if no formatted checkboxes/numbers found
  if (steps.length === 0) {
    const defaultPoints = lines.filter(l => l.trim().length > 15 && !l.startsWith('#')).slice(0, 6);
    defaultPoints.forEach((pt, idx) => {
      steps.push({
        id: `step-${idx + 1}`,
        section: 'Field Operations',
        text: pt.replace(/^[-\*\d\.]+\s*/, '').replace(/[\*\_]+/g, '').trim(),
        completed: false,
        notes: ''
      });
    });
  }

  return steps;
};

export default function SOPDocs({
  onPreFillWhatsApp,
  onNavigateToTab,
  fields = [],
  staff = [],
  onAssignTask
}: SOPDocsProps) {
  const [activeDoc, setActiveDoc] = useState<'ai-manager' | 'whatsapp' | 'voice' | 'crops'>('ai-manager');
  const [selectedCrop, setSelectedCrop] = useState<string>('GENERAL');
  const [selectedField, setSelectedField] = useState<string>('all');
  const [selectedScenario, setSelectedScenario] = useState<string>('pest_control');
  const [customPrompt, setCustomPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Search & Filter States
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('all');

  // Interactive Checklist & View Mode States
  const [sopViewMode, setSopViewMode] = useState<'markdown' | 'checklist' | 'guided'>('checklist');
  const [guidedStepIndex, setGuidedStepIndex] = useState<number>(0);
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(false);
  const [newCustomStepText, setNewCustomStepText] = useState<string>('');

  // Direct Staff Dispatcher States
  const [assignedStaffId, setAssignedStaffId] = useState<string>(staff[0]?.id || '');
  const [dispatchPriority, setDispatchPriority] = useState<'Routine' | 'Urgent' | 'Weather Alert'>('Routine');
  const [dispatchSuccessMsg, setDispatchSuccessMsg] = useState<string | null>(null);

  // Interactive Resource Calculator States
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [calcType, setCalcType] = useState<'neem_emulsion' | 'rhizobium_inoculant' | 'compost_ratio' | 'rock_phosphate'>('neem_emulsion');
  const [calcAreaHa, setCalcAreaHa] = useState<number>(1.5);
  const [calcTankLiters, setCalcTankLiters] = useState<number>(15);

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
- [ ] **Premixing Step:** In a clean 1-liter vessel, combine 75ml cold-pressed neem oil with 30ml organic soft soap. Stir vigorously for 120 seconds until a milky, uniform emulsion forms.
- [ ] **Tank Loading:** Fill knapsack sprayer half-full (7.5L) with clean well water.
- [ ] **Agitation:** Pour the emulsified neem solution into the tank, then add remaining water to reach the 15-Liter fill line. Shake tank vigorously for 30 seconds.

---

#### 3. Field Application Protocol
- [ ] **Application Window:** Apply strictly between **06:30 - 08:30 AM** or **05:00 - 06:30 PM** to prevent leaf scorching from solar radiation and protect beneficial pollinators (bees).
- [ ] **Spraying Technique:** Walk at a steady pace of 1 meter per second. Hold nozzle 30cm above crop canopy. Ensure 100% coverage on underside of leaves where soybean pod borer larvae feed.
- [ ] **Tree Ring Exclusion Zone:** Maintain a 1-meter spray buffer around Tenera Palm stems to avoid unnecessary oil residue buildup on young frond stems.

---

#### 4. Safety, Cleanup & Inspection Log
- [ ] **Post-Application Washdown:** Rinse knapsack sprayer 3x with fresh water. Triple-rinsate must be discharged onto non-crop field perimeter.
- [ ] **Field Verification:** Inspect leaf undersides 48 hours post-application. If pest count exceeds threshold of 3 larvae per plant, log a WhatsApp dispatch for biological parasitoid wasp release.`);

  // Interactive Parsed Steps
  const [interactiveSteps, setInteractiveSteps] = useState<InteractiveStep[]>(() => parseStepsFromMarkdown(sopResponse));

  // Sync interactive steps whenever new SOP response is loaded or generated
  useEffect(() => {
    setInteractiveSteps(parseStepsFromMarkdown(sopResponse));
    setGuidedStepIndex(0);
  }, [sopResponse]);

  // Derived filtered categories list
  const categoriesList = useMemo(() => {
    const cats = Array.from(new Set(ORGANIC_SCENARIOS.map(s => s.category)));
    return ['all', ...cats];
  }, []);

  // Filter scenarios based on search query and active category filter
  const filteredScenarios = useMemo(() => {
    return ORGANIC_SCENARIOS.filter((sec) => {
      const matchesCategory = selectedCategoryFilter === 'all' || sec.category === selectedCategoryFilter;
      const q = searchQuery.toLowerCase().trim();
      if (!q) return matchesCategory;

      const matchesTitle = sec.title.toLowerCase().includes(q);
      const matchesDesc = sec.desc.toLowerCase().includes(q);
      const matchesCrop = sec.crop.toLowerCase().includes(q);
      const matchesCategoryName = sec.category.toLowerCase().includes(q);
      const matchesPrompt = sec.prompt.toLowerCase().includes(q);

      return matchesCategory && (matchesTitle || matchesDesc || matchesCrop || matchesCategoryName || matchesPrompt);
    });
  }, [searchQuery, selectedCategoryFilter]);

  // Filter interactive steps based on search query
  const filteredInteractiveSteps = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return interactiveSteps;
    return interactiveSteps.filter(step => 
      step.text.toLowerCase().includes(q) || 
      step.section.toLowerCase().includes(q) ||
      (step.notes && step.notes.toLowerCase().includes(q))
    );
  }, [interactiveSteps, searchQuery]);

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

  // Toggle step completion status
  const handleToggleStep = (stepId: string) => {
    setInteractiveSteps(prev => prev.map(s => s.id === stepId ? { ...s, completed: !s.completed } : s));
  };

  // Update notes for a specific step
  const handleUpdateStepNote = (stepId: string, note: string) => {
    setInteractiveSteps(prev => prev.map(s => s.id === stepId ? { ...s, notes: note } : s));
  };

  // Add custom step
  const handleAddCustomStep = () => {
    if (!newCustomStepText.trim()) return;
    const newStep: InteractiveStep = {
      id: `custom-step-${Date.now()}`,
      section: 'Custom Supervisor Checklist Item',
      text: newCustomStepText.trim(),
      completed: false,
      notes: ''
    };
    setInteractiveSteps(prev => [...prev, newStep]);
    setNewCustomStepText('');
  };

  // Remove custom step
  const handleRemoveStep = (stepId: string) => {
    setInteractiveSteps(prev => prev.filter(s => s.id !== stepId));
  };

  // Mark all steps complete / reset
  const handleToggleAllSteps = (complete: boolean) => {
    setInteractiveSteps(prev => prev.map(s => ({ ...s, completed: complete })));
  };

  // Text-To-Speech Audio Voice Readout
  const handleSpeakSOP = (textToSpeak?: string) => {
    if (!('speechSynthesis' in window)) {
      alert("Speech synthesis is not supported in this browser environment.");
      return;
    }

    if (isPlayingAudio) {
      window.speechSynthesis.cancel();
      setIsPlayingAudio(false);
      return;
    }

    const cleanText = textToSpeak || sopResponse.replace(/[#\*_`-]/g, ' ');
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.rate = 0.95; // Clear conversational tone for field instructions
    utterance.pitch = 1.0;
    utterance.onend = () => setIsPlayingAudio(false);
    utterance.onerror = () => setIsPlayingAudio(false);

    setIsPlayingAudio(true);
    window.speechSynthesis.speak(utterance);
  };

  // Dispatch SOP Task to Staff via WhatsApp & DB
  const handleDispatchTaskToStaff = () => {
    const selectedStaffObj = staff.find(s => s.id === assignedStaffId) || staff[0];
    const fieldObj = fields.find(f => f.id === selectedField);
    const activeScenarioObj = ORGANIC_SCENARIOS.find(s => s.id === selectedScenario);

    const staffName = selectedStaffObj ? selectedStaffObj.name : 'Field Operator';
    const fieldName = fieldObj ? fieldObj.name : 'All Fields';
    const actionTitle = activeScenarioObj ? activeScenarioObj.title : 'Organic Operations';

    const dispatchMessage = `📋 *KEMET ORGANIC FIELD DISPATCH* (${dispatchPriority.toUpperCase()})
Assignee: ${staffName}
Location: ${fieldName}
Action: ${actionTitle}
Steps:
${interactiveSteps.map((s, i) => `${i + 1}. ${s.completed ? '✅' : '[ ]'} ${s.text}`).slice(0, 5).join('\n')}

Reply "done" upon field completion or "conflict" if blocked.`;

    if (onAssignTask && selectedStaffObj) {
      onAssignTask(fieldObj ? fieldObj.id : 'field_a', actionTitle, selectedStaffObj.id);
    }

    if (onPreFillWhatsApp) {
      onPreFillWhatsApp(dispatchMessage);
    }

    setDispatchSuccessMsg(`SOP Task successfully dispatched to ${staffName} for ${fieldName}!`);
    setTimeout(() => setDispatchSuccessMsg(null), 4000);

    if (onNavigateToTab) {
      onNavigateToTab('whatsapp');
    }
  };

  // Download SOP as Markdown file
  const handleDownloadMD = () => {
    const blob = new Blob([sopResponse], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const timestamp = new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute('download', `kemet_sop_${selectedScenario}_${timestamp}.md`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Generate SOP via Gemini Backend API
  const handleGenerateSOP = async (overridePrompt?: string, scenarioId?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const activeScenarioObj = ORGANIC_SCENARIOS.find(s => s.id === (scenarioId || selectedScenario));
    const finalPrompt = overridePrompt || customPrompt || activeScenarioObj?.prompt || "Provide an organic farming SOP checklist.";
    const fieldObj = fields.find(f => f.id === selectedField);

    try {
      const response = await authenticatedFetch('/api/sop/consult', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: finalPrompt,
          cropType: selectedCrop,
          fieldName: fieldObj ? fieldObj.name : undefined,
          scenario: activeScenarioObj ? activeScenarioObj.title : 'Field Operation'
        })
      });

      const resText = await response.text();
      let data: any = {};
      try {
        data = JSON.parse(resText);
      } catch (e) {
        data = {};
      }

      if (data.sopText) {
        setSopResponse(data.sopText);
      } else {
        throw new Error(data.error || "Could not retrieve SOP checklist from server.");
      }
    } catch (err: any) {
      console.error("SOP Generation Error:", err);
      setErrorMsg(err.message || "An error occurred while generating the SOP. Please check the server.");
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate completed steps statistics
  const completedCount = interactiveSteps.filter(s => s.completed).length;
  const totalCount = interactiveSteps.length;
  const completionPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

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
        
        {/* Universal SOP Search Bar */}
        <div className="relative mb-2">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-emerald-600" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              if (activeDoc !== 'ai-manager') setActiveDoc('ai-manager');
            }}
            placeholder="Search SOPs, tasks, keywords..."
            className="w-full bg-slate-50 border border-gray-200 rounded-xl pl-9 pr-8 py-2 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 focus:bg-white transition-all shadow-2xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded-full cursor-pointer"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>
        
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

        {/* Resource & Mixing Calculator Toggle Button */}
        <button
          onClick={() => setShowCalculator(!showCalculator)}
          className={`w-full p-3.5 rounded-xl text-left border flex items-center justify-between transition-all cursor-pointer ${
            showCalculator 
              ? 'bg-blue-50/90 border-blue-400 text-blue-950 font-bold' 
              : 'bg-gray-50 border-gray-200 hover:bg-gray-100/50 text-gray-700'
          }`}
        >
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg ${showCalculator ? 'bg-blue-600 text-white' : 'bg-blue-100 text-blue-800'}`}>
              <Calculator size={16} />
            </div>
            <div>
              <h4 className="font-semibold text-xs">Resource Mixer</h4>
              <p className="text-3xs text-gray-400 mt-0.5">Neem, Inoculant & Compost calc</p>
            </div>
          </div>
          <ChevronRight size={14} className={`transform transition-transform ${showCalculator ? 'rotate-90 text-blue-600' : 'text-gray-400'}`} />
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
      <div className="lg:col-span-8 bg-white rounded-2xl border border-gray-100 p-5 sm:p-6 shadow-3xs space-y-6">
        
        {/* 🧪 INTERACTIVE RESOURCE & EMULSIFICATION CALCULATOR (Collapsible) */}
        {showCalculator && (
          <div className="bg-gradient-to-br from-blue-50/90 via-slate-50 to-blue-50/40 p-5 rounded-2xl border border-blue-200/80 space-y-4 shadow-3xs animate-fadeIn">
            <div className="flex justify-between items-start">
              <div className="flex items-center space-x-2">
                <span className="p-2 bg-blue-600 text-white rounded-xl shadow-2xs">
                  <Calculator size={18} />
                </span>
                <div>
                  <h4 className="font-bold text-xs text-blue-950 font-display">Interactive Organic Resource & Emulsification Calculator</h4>
                  <p className="text-3xs text-blue-700 mt-0.5">Instant exact liquid mixing & application ratios for field sprayers and soil amendments</p>
                </div>
              </div>

              <button
                onClick={() => setShowCalculator(false)}
                className="text-gray-400 hover:text-gray-600 text-xs font-bold px-2 py-1 rounded-lg hover:bg-gray-200/60"
              >
                Close ✕
              </button>
            </div>

            {/* Calculator Type Selector */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-2xs font-bold">
              <button
                onClick={() => setCalcType('neem_emulsion')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  calcType === 'neem_emulsion' 
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                    : 'bg-white border-blue-100 text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                Neem Spray
              </button>
              <button
                onClick={() => setCalcType('rhizobium_inoculant')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  calcType === 'rhizobium_inoculant' 
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                    : 'bg-white border-blue-100 text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                Soy Inoculant
              </button>
              <button
                onClick={() => setCalcType('compost_ratio')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  calcType === 'compost_ratio' 
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                    : 'bg-white border-blue-100 text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                Compost 30:1
              </button>
              <button
                onClick={() => setCalcType('rock_phosphate')}
                className={`p-2.5 rounded-xl border text-center transition-all cursor-pointer ${
                  calcType === 'rock_phosphate' 
                    ? 'bg-blue-600 text-white border-blue-700 shadow-2xs' 
                    : 'bg-white border-blue-100 text-blue-900 hover:bg-blue-100/50'
                }`}
              >
                Rock Phosphate
              </button>
            </div>

            {/* Parameter Sliders / Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-white p-4 rounded-xl border border-blue-100 text-2xs">
              {calcType === 'neem_emulsion' && (
                <>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Knapsack Sprayer Tank Capacity: <span className="text-blue-600">{calcTankLiters} Liters</span>
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      step="1"
                      value={calcTankLiters}
                      onChange={(e) => setCalcTankLiters(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-gray-700 block mb-1">
                      Target Coverage Area: <span className="text-blue-600">{calcAreaHa} Hectares</span>
                    </label>
                    <input
                      type="range"
                      min="0.5"
                      max="10"
                      step="0.5"
                      value={calcAreaHa}
                      onChange={(e) => setCalcAreaHa(Number(e.target.value))}
                      className="w-full accent-blue-600 cursor-pointer"
                    />
                  </div>
                </>
              )}

              {calcType !== 'neem_emulsion' && (
                <div className="sm:col-span-2">
                  <label className="font-bold text-gray-700 block mb-1">
                    Target Farm Operation Area: <span className="text-blue-600">{calcAreaHa} Hectares</span>
                  </label>
                  <input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={calcAreaHa}
                    onChange={(e) => setCalcAreaHa(Number(e.target.value))}
                    className="w-full accent-blue-600 cursor-pointer"
                  />
                </div>
              )}
            </div>

            {/* Calculated Output Recipe Table */}
            <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-2 text-2xs font-mono">
              <div className="flex justify-between items-center text-emerald-400 font-bold border-b border-slate-800 pb-2">
                <span>INGREDIENT RATIO RECIPE</span>
                <span>TARGET AREA: {calcAreaHa} Ha</span>
              </div>

              {calcType === 'neem_emulsion' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cold-Pressed Neem Oil (100% Pure):</span>
                    <span className="text-white font-bold">{Math.round((calcTankLiters / 15) * 75)} ml per tank ({Math.round(calcAreaHa * 500)} ml total)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Potassium Soft Soap Emulsifier:</span>
                    <span className="text-white font-bold">{Math.round((calcTankLiters / 15) * 30)} ml per tank ({Math.round(calcAreaHa * 200)} ml total)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Clean Well Water:</span>
                    <span className="text-white font-bold">{(calcTankLiters - ((calcTankLiters / 15) * 0.105)).toFixed(2)} L per tank ({Math.round(calcAreaHa * 100)} L spray mix)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Estimated Knapsack Tank Loads:</span>
                    <span className="text-emerald-400 font-bold">{Math.ceil((calcAreaHa * 100) / calcTankLiters)} Tanks Required</span>
                  </div>
                </div>
              )}

              {calcType === 'rhizobium_inoculant' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Soybean Seed Requirement (40kg/Ha):</span>
                    <span className="text-white font-bold">{Math.round(calcAreaHa * 40)} kg certified seed</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bradyrhizobium japonicum Inoculant:</span>
                    <span className="text-emerald-400 font-bold">{Math.round(calcAreaHa * 200)} grams powder</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Gum Arabic / Sugar Solution Sticker:</span>
                    <span className="text-white font-bold">{Math.round(calcAreaHa * 300)} ml liquid</span>
                  </div>
                </div>
              )}

              {calcType === 'compost_ratio' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Oil Palm Empty Fruit Bunch Refuse (High Carbon):</span>
                    <span className="text-white font-bold">{Math.round(calcAreaHa * 1.2 * 1000)} kg (60%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Soybean Stover / Crop Residue:</span>
                    <span className="text-white font-bold">{Math.round(calcAreaHa * 0.5 * 1000)} kg (25%)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Poultry Manure (High Nitrogen):</span>
                    <span className="text-emerald-400 font-bold">{Math.round(calcAreaHa * 0.3 * 1000)} kg (15%)</span>
                  </div>
                </div>
              )}

              {calcType === 'rock_phosphate' && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Ground Rock Phosphate (Organic Phosphorus):</span>
                    <span className="text-white font-bold">{Math.round(calcAreaHa * 150)} kg</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Wood Ash Potash Booster:</span>
                    <span className="text-emerald-400 font-bold">{Math.round(calcAreaHa * 50)} kg</span>
                  </div>
                </div>
              )}

              <div className="pt-2 border-t border-slate-800 flex justify-end">
                <button
                  onClick={() => {
                    const appendText = `\n\n#### 🧪 Calculated Mixing Recipe (${calcAreaHa} Ha / ${calcTankLiters}L Tank):
- Neem Oil: ${Math.round((calcTankLiters / 15) * 75)}ml per tank (${Math.round(calcAreaHa * 500)}ml total)
- Soft Soap: ${Math.round((calcTankLiters / 15) * 30)}ml per tank
- Water: ${(calcTankLiters - 0.1).toFixed(1)}L per tank (${Math.round(calcAreaHa * 100)}L total spray mix)`;
                    setSopResponse(prev => prev + appendText);
                  }}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center space-x-1 cursor-pointer"
                >
                  <Plus size={11} />
                  <span>Append Recipe to Active SOP</span>
                </button>
              </div>
            </div>
          </div>
        )}

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

            {/* Search & Category Filter Toolbar for SOPs */}
            <div className="bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-gray-200 space-y-3 shadow-3xs">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                
                {/* Search Input Field */}
                <div className="relative flex-1">
                  <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-emerald-600" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search SOPs by title or keyword (e.g. neem, weed, compost, drought, soybean, palm)..."
                    className="w-full bg-white border border-gray-200 rounded-xl pl-10 pr-9 py-2 text-xs font-semibold text-gray-800 placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 shadow-2xs"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 rounded-full cursor-pointer"
                      title="Clear search"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* Filter Summary & Count Badge */}
                <div className="flex items-center space-x-2 text-3xs font-mono text-gray-500 shrink-0 self-end sm:self-center">
                  <span className="bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-lg font-bold border border-emerald-200/60">
                    {filteredScenarios.length} {filteredScenarios.length === 1 ? 'SOP Found' : 'SOPs Available'}
                  </span>
                  {(searchQuery || selectedCategoryFilter !== 'all') && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('all'); }}
                      className="text-2xs text-rose-600 hover:underline cursor-pointer font-sans font-bold"
                    >
                      Reset Filters
                    </button>
                  )}
                </div>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-gray-200/60">
                <span className="text-[10px] font-bold text-gray-500 font-mono uppercase tracking-wider mr-1">Filter by Category:</span>
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategoryFilter(cat)}
                    className={`px-2.5 py-1 rounded-lg text-3xs font-bold transition-all cursor-pointer ${
                      selectedCategoryFilter === cat
                        ? 'bg-emerald-700 text-white shadow-2xs'
                        : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-100/80'
                    }`}
                  >
                    {cat === 'all' ? 'All Categories' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Organic Scenario Trigger Buttons */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-800 font-display flex items-center justify-between">
                <span>Standardized Operating Procedures</span>
                <span className="text-3xs text-gray-400 font-normal">Click any procedure to load & generate steps</span>
              </label>

              {filteredScenarios.length === 0 ? (
                <div className="py-8 px-4 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 space-y-2">
                  <AlertCircle size={22} className="mx-auto text-emerald-600" />
                  <p className="text-xs font-bold text-gray-800">No Standard Operating Procedures found matching "{searchQuery}"</p>
                  <p className="text-3xs text-gray-500">Try searching for keywords like "neem", "weed", "compost", "palm", or "soybean".</p>
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategoryFilter('all'); }}
                    className="mt-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-2xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                  >
                    <RefreshCw size={12} />
                    <span>Clear Search Filters</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                  {filteredScenarios.map((sec) => {
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
                            ? 'bg-emerald-50/90 border-emerald-400 ring-2 ring-emerald-500/20 shadow-2xs' 
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
              )}
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

            {/* Dispatch Success Alert Banner */}
            {dispatchSuccessMsg && (
              <div className="bg-emerald-50 border border-emerald-300 p-3.5 rounded-xl flex items-center space-x-2.5 text-emerald-900 text-xs animate-fadeIn">
                <CheckCircleIcon size={18} className="text-emerald-600 flex-shrink-0" />
                <span className="font-bold">{dispatchSuccessMsg}</span>
              </div>
            )}

            {/* Generated SOP Result Container */}
            <div className="bg-slate-900 text-slate-100 rounded-2xl border border-slate-800 p-5 space-y-4 shadow-md relative">
              
              {/* Header Action Bar & Interactive Mode Switcher */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-3">
                <div className="flex items-center space-x-2">
                  <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
                    <FileText size={16} />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-white font-display">Generated Field Protocol</h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Progress: {completedCount}/{totalCount} steps ({completionPercentage}%)
                    </span>
                  </div>
                </div>

                {/* Mode Selector Tabs */}
                <div className="flex flex-wrap items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-2xs">
                  <button
                    onClick={() => setSopViewMode('checklist')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      sopViewMode === 'checklist' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <CheckSquare size={12} />
                    <span>Checklist</span>
                  </button>
                  <button
                    onClick={() => setSopViewMode('guided')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      sopViewMode === 'guided' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <SmartphoneIcon size={12} />
                    <span>Guided Field Mode</span>
                  </button>
                  <button
                    onClick={() => setSopViewMode('markdown')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer flex items-center space-x-1 ${
                      sopViewMode === 'markdown' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText size={12} />
                    <span>Markdown</span>
                  </button>
                </div>
              </div>

              {/* Toolbar Actions: Audio Briefing, Copy, Download, Print */}
              <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 text-2xs font-mono">
                
                {/* Audio Voice Briefing Control */}
                <button
                  onClick={() => handleSpeakSOP()}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                    isPlayingAudio ? 'bg-rose-600 text-white animate-pulse' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {isPlayingAudio ? (
                    <>
                      <VolumeX size={13} />
                      <span>Stop Voice Briefing</span>
                    </>
                  ) : (
                    <>
                      <Volume2 size={13} className="text-emerald-400" />
                      <span>Play Audio SOP Briefing</span>
                    </>
                  )}
                </button>

                <div className="flex items-center space-x-1.5">
                  {/* Download Markdown */}
                  <button
                    onClick={handleDownloadMD}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 flex items-center space-x-1 cursor-pointer"
                    title="Download SOP Markdown file"
                  >
                    <Download size={12} />
                    <span className="hidden sm:inline">Export MD</span>
                  </button>

                  {/* Print Printable SOP */}
                  <button
                    onClick={handleDownloadMD}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 flex items-center space-x-1 cursor-pointer"
                    title="Print SOP Document"
                  >
                    <Printer size={12} />
                    <span className="hidden sm:inline">Print</span>
                  </button>

                  {/* Copy Text */}
                  <button
                    onClick={() => handleCopy(sopResponse, 'ai-sop-response')}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 flex items-center space-x-1 cursor-pointer"
                    title="Copy SOP Checklist"
                  >
                    {copiedId === 'ai-sop-response' ? (
                      <Check size={12} className="text-emerald-400" />
                    ) : (
                      <Copy size={12} />
                    )}
                    <span className="hidden sm:inline">Copy</span>
                  </button>
                </div>

              </div>

              {/* Progress Completion Bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Field Execution Progress</span>
                  <span className="text-emerald-400 font-bold">{completionPercentage}% Completed</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-300" 
                    style={{ width: `${completionPercentage}%` }} 
                  />
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
                <>
                  {/* MODE 1: Interactive Checklist View */}
                  {sopViewMode === 'checklist' && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-3xs font-mono text-slate-400 border-b border-slate-800 pb-2">
                        <span>Click checkboxes to log completion or add field notes</span>
                        <div className="space-x-2">
                          <button 
                            onClick={() => handleToggleAllSteps(true)} 
                            className="text-emerald-400 hover:underline cursor-pointer"
                          >
                            Mark All Done
                          </button>
                          <span>•</span>
                          <button 
                            onClick={() => handleToggleAllSteps(false)} 
                            className="text-slate-400 hover:underline cursor-pointer"
                          >
                            Reset
                          </button>
                        </div>
                      </div>

                      {/* Active Step Search Notice */}
                      {searchQuery && (
                        <div className="bg-emerald-950/60 border border-emerald-500/40 p-2.5 rounded-xl text-3xs font-mono text-emerald-300 flex items-center justify-between">
                          <span>Filtering steps matching "{searchQuery}" ({filteredInteractiveSteps.length} of {interactiveSteps.length} steps shown)</span>
                          <button onClick={() => setSearchQuery('')} className="text-emerald-400 hover:underline cursor-pointer font-bold">Show All Steps</button>
                        </div>
                      )}

                      <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                        {filteredInteractiveSteps.length === 0 ? (
                          <div className="py-6 text-center text-xs text-slate-400 font-mono">
                            No checklist steps match "{searchQuery}"
                          </div>
                        ) : (
                          filteredInteractiveSteps.map((step) => (
                            <div 
                              key={step.id} 
                              className={`p-3 rounded-xl border transition-all ${
                                step.completed 
                                  ? 'bg-emerald-950/30 border-emerald-800/60 text-slate-300' 
                                  : 'bg-slate-800/40 border-slate-700/60 text-slate-100 hover:bg-slate-800/70'
                              }`}
                            >
                              <div className="flex items-start space-x-3">
                                <input
                                  type="checkbox"
                                  checked={step.completed}
                                  onChange={() => handleToggleStep(step.id)}
                                  className="mt-1 w-4 h-4 accent-emerald-500 cursor-pointer rounded-xs"
                                />
                                <div className="flex-1 space-y-1">
                                  <span className="text-[9px] font-mono text-emerald-400 uppercase font-bold tracking-wider block">
                                    {step.section}
                                  </span>
                                  <p className={`text-xs leading-relaxed ${step.completed ? 'line-through text-slate-400' : 'text-slate-100 font-medium'}`}>
                                    {step.text}
                                  </p>

                                  {/* Step Note Input */}
                                  <div className="pt-1">
                                    <input
                                      type="text"
                                      value={step.notes || ''}
                                      onChange={(e) => handleUpdateStepNote(step.id, e.target.value)}
                                      placeholder="Add operator field observations (e.g. Tank pressure set to 2.2 bar)..."
                                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-slate-300 placeholder-slate-600 focus:outline-hidden focus:border-emerald-500"
                                    />
                                  </div>
                                </div>

                                <button
                                  onClick={() => handleRemoveStep(step.id)}
                                  className="text-slate-600 hover:text-rose-400 p-1 rounded-md transition-colors"
                                  title="Remove step"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Add Custom Step Row */}
                      <div className="flex gap-2 pt-2">
                        <input
                          type="text"
                          value={newCustomStepText}
                          onChange={(e) => setNewCustomStepText(e.target.value)}
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCustomStep()}
                          placeholder="Add custom supervisor field instruction step..."
                          className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                        />
                        <button
                          onClick={handleAddCustomStep}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl text-xs font-bold flex items-center space-x-1 cursor-pointer"
                        >
                          <Plus size={14} />
                          <span>Add Step</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MODE 2: Smartphone Guided Step-by-Step Mode */}
                  {sopViewMode === 'guided' && interactiveSteps.length > 0 && (
                    <div className="bg-slate-950 p-6 rounded-2xl border border-slate-800 space-y-5 text-center">
                      <div className="flex justify-between items-center text-3xs font-mono text-slate-400 border-b border-slate-800/80 pb-2">
                        <span className="text-emerald-400 font-bold uppercase tracking-wider">
                          STEP {guidedStepIndex + 1} OF {interactiveSteps.length}
                        </span>
                        <span>{interactiveSteps[guidedStepIndex].section}</span>
                      </div>

                      <div className="py-4 space-y-3">
                        <p className="text-sm md:text-base font-semibold text-slate-100 leading-relaxed max-w-xl mx-auto">
                          {interactiveSteps[guidedStepIndex].text}
                        </p>

                        <button
                          onClick={() => handleSpeakSOP(interactiveSteps[guidedStepIndex].text)}
                          className="px-3 py-1 bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-lg text-2xs font-mono inline-flex items-center space-x-1 cursor-pointer"
                        >
                          <Volume2 size={12} />
                          <span>Hear Step Audio</span>
                        </button>
                      </div>

                      {/* Step Controls */}
                      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                        <button
                          disabled={guidedStepIndex === 0}
                          onClick={() => setGuidedStepIndex(prev => Math.max(0, prev - 1))}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <ChevronLeft size={16} />
                          <span>Previous Step</span>
                        </button>

                        <button
                          onClick={() => {
                            handleToggleStep(interactiveSteps[guidedStepIndex].id);
                            if (guidedStepIndex < interactiveSteps.length - 1) {
                              setGuidedStepIndex(prev => prev + 1);
                            }
                          }}
                          className={`w-full sm:w-auto px-6 py-2.5 rounded-xl text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-sm ${
                            interactiveSteps[guidedStepIndex].completed
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold'
                          }`}
                        >
                          <CheckSquare size={16} />
                          <span>{interactiveSteps[guidedStepIndex].completed ? 'Marked Done (Next)' : 'Mark Step Completed'}</span>
                        </button>

                        <button
                          disabled={guidedStepIndex === interactiveSteps.length - 1}
                          onClick={() => setGuidedStepIndex(prev => Math.min(interactiveSteps.length - 1, prev + 1))}
                          className="w-full sm:w-auto px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 text-white rounded-xl text-xs font-bold flex items-center justify-center space-x-1 cursor-pointer"
                        >
                          <span>Next Step</span>
                          <ChevronRight size={16} />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* MODE 3: Raw Markdown View */}
                  {sopViewMode === 'markdown' && (
                    <div className="prose prose-invert max-w-none text-xs leading-relaxed space-y-3 text-slate-200 font-sans max-h-96 overflow-y-auto pr-1">
                      <div className="markdown-body text-slate-200">
                        <Markdown>{sopResponse}</Markdown>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Direct WhatsApp Staff Dispatch Panel */}
              <div className="pt-4 border-t border-slate-800 space-y-3 bg-slate-950/80 p-4 rounded-xl">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
                  <div className="flex items-center space-x-2 text-xs font-bold text-emerald-400">
                    <UserCheck size={16} />
                    <span>Direct WhatsApp Staff Dispatcher</span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono">Assign task to roster staff via WhatsApp</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-2xs">
                  <div>
                    <label className="text-slate-400 block mb-1">Assigned Field Operator</label>
                    <select
                      value={assignedStaffId}
                      onChange={(e) => setAssignedStaffId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium"
                    >
                      {staff.map(s => (
                        <option key={s.id} value={s.id}>{s.name} ({s.role})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-slate-400 block mb-1">Task Priority Level</label>
                    <select
                      value={dispatchPriority}
                      onChange={(e) => setDispatchPriority(e.target.value as any)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 font-medium"
                    >
                      <option value="Routine">Standard Routine</option>
                      <option value="Urgent">Urgent Priority</option>
                      <option value="Weather Alert">Meteorological Warning</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      onClick={handleDispatchTaskToStaff}
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 px-3 rounded-lg text-xs flex items-center justify-center space-x-1.5 transition-all cursor-pointer shadow-xs"
                    >
                      <Send size={13} />
                      <span>Dispatch to WhatsApp</span>
                    </button>
                  </div>
                </div>
              </div>

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

// Inline missing icon helper components
function CheckCircleIcon({ size = 16, className = "" }: { size?: number, className?: string }) {
  return <CheckSquare size={size} className={className} />;
}

function SmartphoneIcon({ size = 16, className = "" }: { size?: number, className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect width="14" height="20" x="5" y="2" rx="2" ry="2"/>
      <path d="M12 18h.01"/>
    </svg>
  );
}

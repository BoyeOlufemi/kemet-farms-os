import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Field, CropLog, StaffMember, WeatherTrigger } from '../types';
import { Map, Users, ClipboardList, CheckCircle, AlertTriangle, Play, HelpCircle, FileCheck, Check, Plus, Tractor } from 'lucide-react';

interface DashboardProps {
  fields: Field[];
  cropLogs: CropLog[];
  staff: StaffMember[];
  weatherTriggers?: WeatherTrigger[];
  onAssignTask: (fieldId: string, actionType: string, staffId: string) => void;
  onVerifyTask: (logId: string) => void;
  onAddCustomLog: (log: Omit<CropLog, 'id' | 'recorded_at'>) => void;
}

export default function Dashboard({
  fields,
  cropLogs,
  staff,
  weatherTriggers = [],
  onAssignTask,
  onVerifyTask,
  onAddCustomLog
}: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'dispatch'>('overview');
  
  // Dispatch form state
  const [dispatchField, setDispatchField] = useState(fields[0]?.id || '');
  const [dispatchAction, setDispatchAction] = useState('Weed ring clearance');
  const [dispatchStaff, setDispatchStaff] = useState(staff[0]?.id || '');
  const [customAction, setCustomAction] = useState('');

  // Custom log form state
  const [showCustomLogModal, setShowCustomLogModal] = useState(false);
  const [newLogField, setNewLogField] = useState(fields[0]?.id || '');
  const [newLogAction, setNewLogAction] = useState('Monthly weed ring clearance');
  const [newLogStatus, setNewLogStatus] = useState<'todo' | 'done' | 'conflict'>('todo');
  const [newLogStaff, setNewLogStaff] = useState(staff[0]?.id || '');
  const [newLogNotes, setNewLogNotes] = useState('');

  const handleSubmitDispatch = (e: React.FormEvent) => {
    e.preventDefault();
    const finalAction = dispatchAction === 'Other' ? customAction : dispatchAction;
    if (!finalAction) return;
    onAssignTask(dispatchField, finalAction, dispatchStaff);
    setCustomAction('');
    alert(`Task "${finalAction}" assigned successfully and dispatched to Operator WhatsApp!`);
  };

  const handleCreateCustomLog = (e: React.FormEvent) => {
    e.preventDefault();
    onAddCustomLog({
      field_id: newLogField,
      crop_type: fields.find(f => f.id === newLogField)?.crop_type || 'PALM',
      action_type: newLogAction,
      action_status: newLogStatus,
      staff_id: newLogStaff,
      notes: newLogNotes
    });
    setShowCustomLogModal(false);
    setNewLogNotes('');
    alert('Crop activity log entered directly into Supabase simulation.');
  };

  // Stats
  const totalPalmSeedlings = fields
    .filter(f => f.crop_type === 'PALM')
    .reduce((acc, curr) => acc + (curr.seedlingCount || 0), 0);
  const totalHectares = fields.reduce((acc, curr) => acc + curr.sizeHectares, 0);
  const pendingTasksCount = cropLogs.filter(l => l.action_status === 'todo').length;
  const conflictCount = cropLogs.filter(l => l.action_status === 'conflict').length;

  return (
    <div className="space-y-6" id="dashboard_panel">
      {/* Overview Stats Bento Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Tractor size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Total Hectares</p>
            <p className="text-2xl font-bold font-display text-gray-800">{totalHectares.toFixed(1)} Ha</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Map size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Palm Seedlings</p>
            <p className="text-2xl font-bold font-display text-gray-800">{totalPalmSeedlings} Seedlings</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <ClipboardList size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending Field Tasks</p>
            <p className="text-2xl font-bold font-display text-gray-800">{pendingTasksCount}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl shadow-xs border border-gray-100 flex items-center space-x-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">Logged Conflicts</p>
            <p className="text-2xl font-bold font-display text-gray-800">{conflictCount}</p>
          </div>
        </div>
      </div>

      {/* Tabs Menu */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('overview')}
          className={`pb-4 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'overview'
              ? 'border-emerald-500 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🚜 Field Overview
        </button>
        <button
          onClick={() => setActiveTab('logs')}
          className={`pb-4 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'logs'
              ? 'border-emerald-500 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          🗂️ Supabase Crop Logs
        </button>
        <button
          onClick={() => setActiveTab('dispatch')}
          className={`pb-4 px-6 font-medium text-sm transition-colors border-b-2 -mb-px ${
            activeTab === 'dispatch'
              ? 'border-emerald-500 text-emerald-600 font-semibold'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          ✉️ Dispatch Tasks
        </button>
      </div>

      {/* Overview Tab content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Farm Grid View */}
            <div className="lg:col-span-2 space-y-6">
              <h3 className="text-lg font-semibold font-display text-gray-800">Operational Farm Map (Active Fields)</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {fields.map((field) => (
                  <motion.div
                    key={field.id}
                    whileHover={{ scale: 1.01 }}
                    className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden"
                  >
                    <div className={`p-4 ${
                      field.crop_type === 'PALM' 
                        ? 'bg-gradient-to-r from-emerald-50 to-teal-50/50 border-b border-emerald-100' 
                        : 'bg-gradient-to-r from-amber-50 to-orange-50/50 border-b border-amber-100'
                    } flex justify-between items-center`}>
                      <div>
                        <span className={`text-2xs font-semibold px-2 py-0.5 rounded-full ${
                          field.crop_type === 'PALM' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {field.crop_type === 'PALM' ? '🌴 PALM SEEDLINGS' : '🌱 SOYBEAN'}
                        </span>
                        <h4 className="font-semibold text-gray-800 mt-1">{field.name}</h4>
                      </div>
                      <span className="text-xs font-medium text-gray-500">{field.sizeHectares} Hectares</span>
                    </div>
                    
                    <div className="p-4 space-y-4">
                      {field.crop_type === 'PALM' && (
                        <div className="flex justify-between text-xs text-gray-600 border-b border-gray-50 pb-2">
                          <span>Plant Spacing:</span>
                          <span className="font-medium text-gray-800">8m x 8m (160/Ha spacing)</span>
                        </div>
                      )}
                      
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-gray-600">Soil Evapotranspiration Balance:</span>
                        <div className="flex items-center space-x-2">
                          <div className="w-20 bg-gray-100 h-2 rounded-full overflow-hidden">
                            <div 
                              className={`h-full rounded-full ${
                                field.soilMoisture > 70 ? 'bg-blue-500' : field.soilMoisture > 40 ? 'bg-emerald-500' : 'bg-rose-400'
                              }`}
                              style={{ width: `${field.soilMoisture}%` }}
                            />
                          </div>
                          <span className="font-semibold text-gray-800">{field.soilMoisture}%</span>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-xl border border-gray-100">
                        <span className="text-2xs uppercase tracking-wider font-semibold text-gray-400 block mb-1">Current Task status</span>
                        {field.currentTask ? (
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-medium text-gray-800">{field.currentTask}</span>
                            <span className={`text-2xs px-2 py-0.5 rounded-md font-semibold flex items-center space-x-1 ${
                              field.currentTask.includes('Hold') || field.currentTask.includes('BLOCKED')
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800 animate-pulse'
                            }`}>
                              <span>●</span>
                              <span>IN PROGRESS</span>
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-gray-400 italic">No task assigned. Free to receive dispatch.</span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>

              {/* Quick Farm Operation Summary */}
              <div className="bg-gradient-to-br from-emerald-900 to-teal-950 text-white p-6 rounded-2xl shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 p-8 opacity-10">
                  <Tractor size={120} />
                </div>
                <h4 className="text-lg font-semibold font-display mb-2">Dual-Crop Strategy Note</h4>
                <p className="text-sm text-emerald-100/90 leading-relaxed mb-4">
                  Kemet Farms utilizes <strong>intercropping</strong>: high-value long-term assets (<strong>Tenera Palms</strong>) spacing leaves optimal sunlight channels for fast cash-crop <strong>Soybeans</strong>. Monthly manual weed ring clearance ensures high-yield growth while n8n moisture automations optimize irrigation routines based on live Nigeria meteorological telemetry.
                </p>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-emerald-800/60 text-emerald-200 text-2xs px-2.5 py-1 rounded-full font-mono">Latitude: 7.6244 (Ilesha)</span>
                  <span className="bg-emerald-800/60 text-emerald-200 text-2xs px-2.5 py-1 rounded-full font-mono">Timezone: Africa/Lagos</span>
                  <span className="bg-emerald-800/60 text-emerald-200 text-2xs px-2.5 py-1 rounded-full font-mono">Evapotranspiration Index: FAO-56 Penman-Monteith</span>
                </div>
              </div>
            </div>

            {/* Sidebar Action Station (Active Staff list) */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold font-display text-gray-800 mb-4">Active Field Operators</h3>
                <div className="space-y-3">
                  {staff.map((member) => (
                    <div key={member.id} className="bg-white p-4 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <h5 className="font-semibold text-sm text-gray-800">{member.name}</h5>
                        <p className="text-2xs text-gray-500 mt-0.5">{member.role}</p>
                        <p className="text-2xs font-mono text-emerald-600 mt-1">{member.phone}</p>
                      </div>
                      <div>
                        <span className={`text-2xs px-2.5 py-1 rounded-full font-semibold ${
                          member.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                            : 'bg-rose-50 text-rose-700 border border-rose-100'
                        }`}>
                          {member.status === 'active' ? 'WhatsApp ON' : 'WhatsApp STOPPED'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Supervisor Action Box */}
              <div className="bg-amber-50/50 p-4 rounded-2xl border border-amber-200/60">
                <h4 className="text-sm font-semibold text-amber-800 mb-2 flex items-center space-x-2">
                  <AlertTriangle size={16} />
                  <span>Conflict Resolution Hub</span>
                </h4>
                <p className="text-2xs text-amber-700 leading-relaxed">
                  When operators report a field block, the system flags a <strong>Conflict</strong> in Supabase. Review reports under the Logs tab to apply manual corrective overrides or clear blockage alerts.
                </p>
              </div>
            </div>
          </div>

          {/* Weather Alert History section */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5 shadow-3xs" id="weather_alert_history">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-50">
              <div>
                <h4 className="text-sm font-bold font-display text-gray-800 flex items-center gap-2">
                  <span className="p-1 bg-amber-50 text-amber-600 rounded-lg">
                    <AlertTriangle size={15} />
                  </span>
                  <span>Weather Alert History</span>
                </h4>
                <p className="text-3xs text-gray-400 mt-0.5">
                  Historical logs of agricultural warnings generated from meteorological anomalies
                </p>
              </div>
              <span className="text-3xs font-mono bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold">
                Total Warnings: {weatherTriggers.length}
              </span>
            </div>

            {weatherTriggers.length === 0 ? (
              <div className="text-center py-6 text-xs text-gray-400 italic bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                No weather alerts have been triggered yet.
              </div>
            ) : (
              <div className="overflow-x-auto animate-fade-in">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-[9px] font-bold text-gray-400 uppercase tracking-wider bg-gray-50/50">
                      <th className="py-2.5 px-3 rounded-l-xl">Timestamp</th>
                      <th className="py-2.5 px-3">Field ID / Name</th>
                      <th className="py-2.5 px-3">Alert Type</th>
                      <th className="py-2.5 px-3">Metrics / Payload</th>
                      <th className="py-2.5 px-3 rounded-r-xl">SOP Dispatch Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {weatherTriggers.slice().reverse().map((trigger) => {
                      const field = fields.find(f => f.id === trigger.field_id);
                      const fieldName = field ? field.name : `Field ID: ${trigger.field_id}`;
                      const isRain = trigger.trigger_type === 'RAIN';
                      const isHeat = trigger.trigger_type === 'HEAT';
                      const isNormal = trigger.trigger_type === 'NORMAL';
                      
                      return (
                        <tr key={trigger.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">
                            {new Date(trigger.created_at).toLocaleString('en-NG', {
                              day: 'numeric',
                              month: 'short',
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </td>
                          <td className="py-2.5 px-3">
                            <div className="font-semibold text-gray-800">{fieldName}</div>
                            <div className="text-3xs text-gray-400 font-mono">ID: {trigger.field_id}</div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1 text-[9px] px-2 py-0.5 rounded-full font-bold ${
                              isRain 
                                ? 'bg-blue-50 text-blue-700 border border-blue-100'
                                : isHeat
                                ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            }`}>
                              <span>{isRain ? '🌧️' : isHeat ? '🌡️' : '☀️'}</span>
                              <span>{trigger.trigger_type}</span>
                            </span>
                          </td>
                          <td className="py-2.5 px-3 max-w-xs sm:max-w-md">
                            <div className="text-gray-700 font-medium text-xs">{trigger.payload.description}</div>
                            <div className="text-3xs text-gray-400 font-mono mt-0.5">
                              {isRain && `Intensity: ${trigger.payload.rain_mm}mm | Lockout: ${trigger.payload.hold_hours} hours`}
                              {isHeat && `Temperature: ${trigger.payload.temp_c}°C`}
                              {isNormal && 'Normal agricultural background'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3">
                            <span className={`inline-flex items-center gap-1.5 text-3xs font-bold font-mono ${
                              trigger.consumed 
                                ? 'text-gray-400' 
                                : 'text-emerald-600'
                            }`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${trigger.consumed ? 'bg-gray-300' : 'bg-emerald-500 animate-pulse'}`} />
                              <span>{trigger.consumed ? 'SOP Cleared' : 'SOP Broadcasted'}</span>
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Logs Tab content */}
      {activeTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <div className="p-5 border-b border-gray-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-gray-50/50">
            <div>
              <h3 className="font-semibold text-gray-800 flex items-center space-x-2">
                <ClipboardList size={20} className="text-emerald-500" />
                <span>Supabase Table: `kemet_crop_logs`</span>
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">Database log persistence representing field task history</p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => setShowCustomLogModal(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-3.5 py-2 rounded-xl font-medium flex items-center space-x-1.5 transition-colors cursor-pointer"
              >
                <Plus size={14} />
                <span>Create Manual Log</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-gray-100/50 border-b border-gray-200 text-gray-500 font-semibold uppercase tracking-wider text-3xs">
                  <th className="py-3 px-4">Log UUID</th>
                  <th className="py-3 px-4">Field ID</th>
                  <th className="py-3 px-4">Crop Type</th>
                  <th className="py-3 px-4">Action Type</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Staff ID</th>
                  <th className="py-3 px-4">Recorded At</th>
                  <th className="py-3 px-4 text-right">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {cropLogs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-gray-400 italic">No logs persisted in the database. Assign or simulate tasks.</td>
                  </tr>
                ) : (
                  [...cropLogs].reverse().map((log) => {
                    const fieldName = fields.find(f => f.id === log.field_id)?.name || log.field_id;
                    const staffName = staff.find(s => s.id === log.staff_id)?.name || log.staff_id;
                    return (
                      <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4 font-mono text-2xs text-gray-400 max-w-16 truncate" title={log.id}>
                          {log.id.split('-')[0]}...
                        </td>
                        <td className="py-3 px-4 font-semibold text-gray-700">{fieldName}</td>
                        <td className="py-3 px-4">
                          <span className={`text-3xs font-semibold px-2 py-0.5 rounded-md ${
                            log.crop_type === 'PALM' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {log.crop_type}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-800 font-medium">
                          {log.action_type}
                          {log.notes && (
                            <span className="block text-2xs text-gray-400 font-normal italic mt-0.5">Note: {log.notes}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 text-2xs font-semibold px-2 py-0.5 rounded-full ${
                            log.action_status === 'done' 
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                              : log.action_status === 'conflict'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200 animate-pulse'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}>
                            <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                            {log.action_status.toUpperCase()}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-600 font-medium">{staffName}</td>
                        <td className="py-3 px-4 text-gray-500 font-mono text-3xs">
                          {new Date(log.recorded_at).toLocaleDateString()} {new Date(log.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {log.verified_at ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-3xs bg-emerald-50 border border-emerald-100 px-2 py-1 rounded-lg">
                              <FileCheck size={12} />
                              <span>VERIFIED</span>
                            </span>
                          ) : log.action_status === 'done' ? (
                            <button
                              onClick={() => onVerifyTask(log.id)}
                              className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-3xs font-semibold px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
                            >
                              Verify Done
                            </button>
                          ) : log.action_status === 'conflict' ? (
                            <button
                              onClick={() => onVerifyTask(log.id)}
                              className="bg-amber-50 hover:bg-amber-100 text-amber-700 text-3xs font-semibold px-2.5 py-1 rounded-lg border border-amber-200 transition-colors cursor-pointer"
                            >
                              Resolve/Verify
                            </button>
                          ) : (
                            <span className="text-gray-400 italic text-2xs">-</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Dispatch Tab content */}
      {activeTab === 'dispatch' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="max-w-xl mx-auto space-y-6">
            <div>
              <h3 className="text-lg font-semibold font-display text-gray-800">Dispatch Automated Field Task</h3>
              <p className="text-xs text-gray-500 mt-1">
                Trigger a Supabase job simulation that creates a task entry and dispatches a low-bandwidth WhatsApp task alert to the selected operator.
              </p>
            </div>

            <form onSubmit={handleSubmitDispatch} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Select Target Field</label>
                  <select
                    value={dispatchField}
                    onChange={(e) => setDispatchField(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {fields.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Select Assigned Staff</label>
                  <select
                    value={dispatchStaff}
                    onChange={(e) => setDispatchStaff(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  >
                    {staff.filter(s => s.status === 'active').map(s => (
                      <option key={s.id} value={s.id}>{s.name} ({s.phone})</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600">Select Task Action Type</label>
                <select
                  value={dispatchAction}
                  onChange={(e) => setDispatchAction(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                >
                  <option value="Weed ring clearance">Weed ring clearance (Palm)</option>
                  <option value="Monthly fertilizer application">Monthly fertilizer application (Palm)</option>
                  <option value="Soil hydration mapping">Soil hydration mapping (Soybean)</option>
                  <option value="Manual soil moisture probe">Manual soil moisture probe (Soybean)</option>
                  <option value="Rain gauge calibration check">Rain gauge calibration check (General)</option>
                  <option value="Other">Write Custom Action...</option>
                </select>
              </div>

              {dispatchAction === 'Other' && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-600">Custom Task Action Description</label>
                  <input
                    type="text"
                    value={customAction}
                    onChange={(e) => setCustomAction(e.target.value)}
                    placeholder="e.g. Cleared drainage canal at boundaries"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs focus:ring-1 focus:ring-emerald-500 focus:outline-hidden"
                  />
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2.5 rounded-xl flex items-center justify-center space-x-2 transition-colors cursor-pointer shadow-xs"
              >
                <Play size={14} />
                <span>Simulate Task Dispatch Outbound Loop</span>
              </button>
            </form>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 flex items-start space-x-3 text-2xs text-gray-500 leading-relaxed">
              <span className="text-amber-500">💡</span>
              <span>
                <strong>System Logic Workflow:</strong> Dispatched messages will appear immediately as outbound alerts in the <strong>WhatsApp Simulator</strong> tab. The operator can reply <strong>done</strong> or <strong>conflict</strong> to simulate staff field responses and automatically update the database.
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Direct Manual Log Modal */}
      {showCustomLogModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-gray-100">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold text-gray-800">Add Manual Crop Log Entry</h4>
              <button onClick={() => setShowCustomLogModal(false)} className="text-gray-400 hover:text-gray-600 text-lg">×</button>
            </div>

            <form onSubmit={handleCreateCustomLog} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Field</label>
                <select
                  value={newLogField}
                  onChange={(e) => setNewLogField(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                >
                  {fields.map(f => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Action Type</label>
                <input
                  type="text"
                  value={newLogAction}
                  onChange={(e) => setNewLogAction(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Status</label>
                  <select
                    value={newLogStatus}
                    onChange={(e) => setNewLogStatus(e.target.value as any)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="todo">TODO</option>
                    <option value="done">DONE</option>
                    <option value="conflict">CONFLICT</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-gray-600">Operator</label>
                  <select
                    value={newLogStaff}
                    onChange={(e) => setNewLogStaff(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  >
                    {staff.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-gray-600">Supervisor / Operator Notes</label>
                <textarea
                  value={newLogNotes}
                  onChange={(e) => setNewLogNotes(e.target.value)}
                  placeholder="e.g. Added mulch around palm ring"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs h-20"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs py-2 rounded-xl transition-colors cursor-pointer"
              >
                Save Log directly
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

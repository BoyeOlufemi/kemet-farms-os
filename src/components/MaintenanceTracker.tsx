import React, { useState } from 'react';
import { MaintenanceItem, KemetDB } from '../types';
import { uploadFileToFirebaseStorage } from '../utils/storage';
import { 
  Calendar, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  PlusCircle, 
  Filter, 
  Check, 
  Upload, 
  ExternalLink,
  Sprout,
  ShieldAlert,
  Loader2
} from 'lucide-react';

interface MaintenanceTrackerProps {
  db: KemetDB;
  onUpdateDb: (updatedDb: KemetDB) => void;
}

export default function MaintenanceTracker({ db, onUpdateDb }: MaintenanceTrackerProps) {
  const [activeCropFilter, setActiveCropFilter] = useState<'ALL' | 'PALM' | 'SOYBEAN'>('ALL');
  const [activeStatusFilter, setActiveStatusFilter] = useState<string>('all');
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [completingItem, setCompletingItem] = useState<MaintenanceItem | null>(null);
  const [completionNotes, setCompletionNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [isUploadingEvidence, setIsUploadingEvidence] = useState(false);

  // Form states for new schedule item
  const [title, setTitle] = useState('');
  const [fieldId, setFieldId] = useState(db.fields[0]?.id || 'field-1');
  const [category, setCategory] = useState<MaintenanceItem['category']>('Fertilization');
  const [frequency, setFrequency] = useState<MaintenanceItem['frequency']>('Weekly');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [staffId, setStaffId] = useState(db.staff[0]?.id || 'staff-1');

  // Metrics
  const totalOverdue = db.maintenanceItems.filter(m => m.status === 'overdue').length;
  const totalDueToday = db.maintenanceItems.filter(m => m.status === 'due_today').length;
  const totalUpcoming = db.maintenanceItems.filter(m => m.status === 'upcoming').length;
  const totalCompleted = db.maintenanceItems.filter(m => m.status === 'completed').length;

  const handleCreateScheduleItem = (e: React.FormEvent) => {
    e.preventDefault();
    const field = db.fields.find(f => f.id === fieldId);
    if (!field) return;

    const newItem: MaintenanceItem = {
      id: `maint-${Date.now()}`,
      field_id: fieldId,
      crop_type: field.crop_type,
      title,
      category,
      frequency,
      due_date: dueDate,
      status: 'upcoming',
      assigned_staff_id: staffId
    };

    onUpdateDb({
      ...db,
      maintenanceItems: [newItem, ...db.maintenanceItems]
    });

    setShowAddModal(false);
    setTitle('');
  };

  const handleConfirmCompletion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingItem) return;

    let evidenceUrl: string | undefined = undefined;

    if (evidenceFile) {
      setIsUploadingEvidence(true);
      try {
        evidenceUrl = await uploadFileToFirebaseStorage(evidenceFile, 'maintenance_evidence');
      } catch (err) {
        console.error('Evidence upload failed:', err);
      } finally {
        setIsUploadingEvidence(false);
      }
    }

    const updatedItems = db.maintenanceItems.map(m => {
      if (m.id === completingItem.id) {
        return {
          ...m,
          status: 'completed' as const,
          last_completed_at: new Date().toISOString(),
          completion_notes: completionNotes || 'Marked completed on schedule.',
          evidence_url: evidenceUrl || m.evidence_url
        };
      }
      return m;
    });

    onUpdateDb({ ...db, maintenanceItems: updatedItems });
    setCompletingItem(null);
    setCompletionNotes('');
    setEvidenceFile(null);
  };

  const filteredItems = db.maintenanceItems.filter(item => {
    if (activeCropFilter !== 'ALL' && item.crop_type !== activeCropFilter) return false;
    if (activeStatusFilter !== 'all' && item.status !== activeStatusFilter) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Calendar size={22} />
          </div>
          <div>
            <h3 className="font-bold text-base text-gray-900 font-display">Plant Maintenance Scheduler & Tracker</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              Timetable schedule for routine agronomic plant maintenance across Palm and Soybean blocks
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs px-4 py-2.5 rounded-2xl shadow-xs flex items-center space-x-2 transition-all cursor-pointer"
        >
          <PlusCircle size={15} />
          <span>New Maintenance Task</span>
        </button>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-rose-50 p-3.5 rounded-2xl border border-rose-200/80 flex items-center justify-between">
          <div>
            <span className="text-3xs font-mono font-bold uppercase text-rose-700">Overdue Tasks</span>
            <p className="text-xl font-bold font-mono text-rose-800">{totalOverdue}</p>
          </div>
          <AlertTriangle size={20} className="text-rose-500" />
        </div>

        <div className="bg-amber-50 p-3.5 rounded-2xl border border-amber-200/80 flex items-center justify-between">
          <div>
            <span className="text-3xs font-mono font-bold uppercase text-amber-700">Due Today</span>
            <p className="text-xl font-bold font-mono text-amber-800">{totalDueToday}</p>
          </div>
          <Clock size={20} className="text-amber-500" />
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-gray-200/80 flex items-center justify-between">
          <div>
            <span className="text-3xs font-mono font-bold uppercase text-gray-600">Upcoming</span>
            <p className="text-xl font-bold font-mono text-gray-800">{totalUpcoming}</p>
          </div>
          <Calendar size={20} className="text-gray-400" />
        </div>

        <div className="bg-emerald-50 p-3.5 rounded-2xl border border-emerald-200/80 flex items-center justify-between">
          <div>
            <span className="text-3xs font-mono font-bold uppercase text-emerald-700">Completed</span>
            <p className="text-xl font-bold font-mono text-emerald-800">{totalCompleted}</p>
          </div>
          <CheckCircle2 size={20} className="text-emerald-600" />
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-gray-200/80">
        
        {/* Crop Filter */}
        <div className="flex items-center space-x-1.5 text-xs">
          <span className="font-bold text-gray-600 text-3xs font-mono uppercase">CROP:</span>
          {['ALL', 'PALM', 'SOYBEAN'].map((c) => (
            <button
              key={c}
              onClick={() => setActiveCropFilter(c as any)}
              className={`px-3 py-1 rounded-xl text-2xs font-bold transition-all cursor-pointer ${
                activeCropFilter === c ? 'bg-emerald-600 text-white shadow-3xs' : 'bg-white text-gray-600 border border-gray-200'
              }`}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Status Filter */}
        <div className="flex items-center space-x-1 text-2xs font-semibold">
          <span className="font-bold text-gray-600 text-3xs font-mono uppercase mr-1">STATUS:</span>
          {['all', 'overdue', 'due_today', 'upcoming', 'completed'].map((s) => (
            <button
              key={s}
              onClick={() => setActiveStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                activeStatusFilter === s ? 'bg-slate-900 text-white font-bold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              {s.replace('_', ' ')}
            </button>
          ))}
        </div>

      </div>

      {/* Maintenance Timetable List */}
      <div className="space-y-3">
        {filteredItems.map((item) => {
          const field = db.fields.find(f => f.id === item.field_id);
          const staff = db.staff.find(s => s.id === item.assigned_staff_id);

          return (
            <div 
              key={item.id}
              className={`p-4 rounded-2xl border transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ${
                item.status === 'overdue' 
                  ? 'bg-rose-50/50 border-rose-200' 
                  : item.status === 'due_today' 
                    ? 'bg-amber-50/50 border-amber-200' 
                    : item.status === 'completed'
                      ? 'bg-emerald-50/30 border-emerald-100 opacity-80'
                      : 'bg-white border-gray-200/80 hover:border-emerald-200'
              }`}
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center space-x-2">
                  <span className={`text-3xs font-bold font-mono px-2 py-0.5 rounded-full uppercase ${
                    item.status === 'overdue' 
                      ? 'bg-rose-600 text-white' 
                      : item.status === 'due_today' 
                        ? 'bg-amber-500 text-white' 
                        : item.status === 'completed'
                          ? 'bg-emerald-600 text-white'
                          : 'bg-slate-800 text-white'
                  }`}>
                    {item.status.replace('_', ' ')}
                  </span>

                  <span className="text-3xs font-bold font-mono bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                    {item.crop_type}
                  </span>

                  <span className="text-3xs font-bold text-emerald-800 font-mono">
                    {item.category} ({item.frequency})
                  </span>
                </div>

                <h4 className="font-bold text-xs text-gray-900">{item.title}</h4>

                <div className="flex flex-wrap items-center gap-3 text-3xs font-mono text-gray-500">
                  <span>Field: <strong className="text-gray-800">{field ? field.name : item.field_id}</strong></span>
                  <span>Assigned: <strong className="text-gray-800">{staff ? staff.name : item.assigned_staff_id}</strong></span>
                  <span>Due Date: <strong className="text-gray-800">{item.due_date}</strong></span>
                </div>

                {item.completion_notes && (
                  <p className="text-3xs text-emerald-800 font-medium italic bg-emerald-50 p-2 rounded-lg border border-emerald-100">
                    Completion Notes: {item.completion_notes}
                  </p>
                )}
              </div>

              <div className="flex items-center space-x-2 shrink-0">
                {item.evidence_url && (
                  <a
                    href={item.evidence_url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 rounded-xl text-3xs font-bold font-mono flex items-center space-x-1"
                  >
                    <ExternalLink size={12} />
                    <span>Evidence</span>
                  </a>
                )}

                {item.status !== 'completed' && (
                  <button
                    onClick={() => setCompletingItem(item)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white text-3xs font-bold px-3 py-2 rounded-xl shadow-xs flex items-center space-x-1 cursor-pointer"
                  >
                    <Check size={12} />
                    <span>Mark Done</span>
                  </button>
                )}
              </div>

            </div>
          );
        })}
      </div>

      {/* Complete Task Modal */}
      {completingItem && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-base text-gray-900 font-display">Confirm Maintenance Completion</h3>
            <p className="text-xs text-gray-600">{completingItem.title}</p>

            <form onSubmit={handleConfirmCompletion} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Completion Notes</label>
                <textarea
                  value={completionNotes}
                  onChange={(e) => setCompletionNotes(e.target.value)}
                  placeholder="e.g., Applied 1.5kg NPK 15-15-15 around palm base ring clearance..."
                  rows={3}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                />
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Upload Photo Evidence (Firebase Storage)</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setEvidenceFile(e.target.files ? e.target.files[0] : null)}
                  className="w-full text-2xs bg-slate-50 p-2 rounded-xl border border-gray-200"
                />
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCompletingItem(null)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingEvidence}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center space-x-1"
                >
                  {isUploadingEvidence ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Uploading...</span>
                    </>
                  ) : (
                    <span>Confirm Completion</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 space-y-4">
            <h3 className="font-bold text-base text-gray-900 font-display">New Maintenance Schedule Item</h3>

            <form onSubmit={handleCreateScheduleItem} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-gray-700 block mb-1">Task Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Weed Ring Clearance around seedling base"
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Target Field</label>
                  <select
                    value={fieldId}
                    onChange={(e) => setFieldId(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                  >
                    {db.fields.map(f => (
                      <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value as any)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                  >
                    <option value="Fertilization">Fertilization</option>
                    <option value="Weed Control">Weed Control</option>
                    <option value="Pruning">Pruning</option>
                    <option value="Irrigation">Irrigation</option>
                    <option value="Pest Control">Pest Control</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">Frequency</label>
                  <select
                    value={frequency}
                    onChange={(e) => setFrequency(e.target.value as any)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                  >
                    <option value="Daily">Daily</option>
                    <option value="Weekly">Weekly</option>
                    <option value="Bi-Weekly">Bi-Weekly</option>
                    <option value="Monthly">Monthly</option>
                  </select>
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">Due Date</label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="font-bold text-gray-700 block mb-1">Assigned Operator</label>
                <select
                  value={staffId}
                  onChange={(e) => setStaffId(e.target.value)}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl p-2.5 font-medium"
                >
                  {db.staff.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex space-x-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-xs"
                >
                  Schedule Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

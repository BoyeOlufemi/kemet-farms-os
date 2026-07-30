import React, { useState } from 'react';
import { MediaItem, KemetDB, LedgerEntry } from '../types';
import { uploadFileToFirebaseStorage } from '../utils/storage';
import { auth, db as firestoreDb } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { authenticatedFetch } from '../utils/authenticatedFetch';
import { 
  Upload, 
  Sparkles, 
  FileText, 
  Image as ImageIcon, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  ExternalLink, 
  DollarSign, 
  Tag, 
  Calendar, 
  Filter, 
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';

interface MediaIngestionPanelProps {
  db: KemetDB;
  onUpdateDb: (updatedDb: KemetDB) => void;
}

export default function MediaIngestionPanel({ db, onUpdateDb }: MediaIngestionPanelProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFieldId, setSelectedFieldId] = useState<string>(db.fields[0]?.id || 'field-1');
  const [selectedStaffId, setSelectedStaffId] = useState<string>(db.staff[0]?.id || 'staff-1');
  const [mediaCategory, setMediaCategory] = useState<'plant_health' | 'receipt' | 'task_screenshot' | 'general'>('receipt');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isScanningWithAi, setIsScanningWithAi] = useState(false);
  
  const [scanResult, setScanResult] = useState<any>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setScanResult(null);
      setStatusMessage(null);
    }
  };

  const handleProcessUploadAndScan = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage('Uploading photo to Firebase Storage bucket...');

    try {
      // 1. Upload to Firebase Storage
      const folder = mediaCategory === 'receipt' ? 'receipts' : 'crop_inspection_media';
      const uploadRes = await uploadFileToFirebaseStorage(selectedFile, folder, (prog) => {
        setUploadProgress(prog);
      });
      const firebaseUrl = typeof uploadRes === 'string' ? uploadRes : uploadRes.downloadUrl;

      setIsUploading(false);
      setIsScanningWithAi(true);
      setStatusMessage('Analyzing photo with Gemini AI Vision model...');

      // Convert file to base64 for Gemini Vision API payload
      const base64Data = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });

      // 2. Call Gemini AI Vision API server endpoint
      const staffMember = db.staff.find(s => s.id === selectedStaffId);
      let scanData: any = {};
      try {
        const scanRes = await authenticatedFetch('/api/gemini/scan-media', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            base64Data,
            mimeType: selectedFile.type,
            mediaCategory
          })
        });

        const rawText = await scanRes.text();
        try {
          scanData = JSON.parse(rawText);
        } catch (e) {
          console.warn('Scan response was not JSON:', rawText.substring(0, 100));
          scanData = {
            data: {
              summary: 'Uploaded and stored successfully in Firebase Storage.',
              detectedCategory: mediaCategory
            }
          };
        }
      } catch (err) {
        console.warn('Scan request error:', err);
        scanData = {
          data: {
            summary: 'Uploaded and stored successfully in Firebase Storage.',
            detectedCategory: mediaCategory
          }
        };
      }

      const aiData = scanData.data || {};
      setScanResult(aiData);

      // 3. Create MediaItem
      const currentUser = auth.currentUser;
      const staffName = staffMember 
        ? staffMember.name 
        : (currentUser?.displayName || 'Farm Operator');

      const storagePath = typeof uploadRes === 'object' ? uploadRes.fullPath : `${folder}/${selectedFile.name}`;

      const newMediaItem: MediaItem = {
        id: `media-${Date.now()}`,
        field_id: selectedFieldId,
        category: mediaCategory,
        title: aiData.receipt?.itemName || aiData.taskUpdate?.taskTitle || `${selectedFile.name}`,
        url: firebaseUrl,
        storage_path: storagePath,
        uploaded_by: staffName,
        userId: currentUser?.uid,
        amount_spent: aiData.receipt?.amount || undefined,
        notes: aiData.summary || aiData.plantHealth?.diagnosis || 'Uploaded via Firebase Storage & scanned with Gemini AI',
        created_at: new Date().toISOString()
      };

      // Save media item directly to Firestore
      try {
        await setDoc(doc(firestoreDb, 'mediaItems', newMediaItem.id), newMediaItem, { merge: true });
      } catch (fErr) {
        console.warn('Firestore setDoc notice for mediaItem:', fErr);
      }

      let updatedLedger = [...db.ledgerEntries];

      // If it's a receipt with parsed amount, auto-populate Financial Ledger!
      if (mediaCategory === 'receipt' && aiData.receipt?.amount) {
        const newLedgerEntry: LedgerEntry = {
          id: `ledg-${Date.now()}`,
          manager_id: selectedStaffId,
          manager_name: staffName,
          type: 'expense',
          category: aiData.receipt.category || 'Chemicals/Fertilizer',
          amount: Number(aiData.receipt.amount),
          description: `Auto-parsed receipt: ${aiData.receipt.itemName || 'Supply Purchase'} from ${aiData.receipt.supplier || 'Agro Depot'}`,
          field_id: selectedFieldId,
          receipt_url: firebaseUrl,
          created_at: new Date().toISOString(),
          verified: true
        };
        updatedLedger.unshift(newLedgerEntry);

        try {
          await setDoc(doc(firestoreDb, 'ledgerEntries', newLedgerEntry.id), newLedgerEntry, { merge: true });
        } catch (fErr) {
          console.warn('Firestore setDoc notice for ledgerEntry:', fErr);
        }
      }

      // Update Database state
      const updatedDb: KemetDB = {
        ...db,
        mediaItems: [newMediaItem, ...db.mediaItems],
        ledgerEntries: updatedLedger
      };

      onUpdateDb(updatedDb);

      setStatusMessage(
        aiData.receipt?.amount 
          ? `Success! Media uploaded to Firebase & expense of ₦${aiData.receipt.amount.toLocaleString()} auto-posted to Ledger.`
          : `Success! Media uploaded to Firebase & analyzed by Gemini Vision.`
      );

      setSelectedFile(null);
    } catch (err: any) {
      console.error('Upload or Vision Scan error:', err);
      setStatusMessage(`Processing error: ${err.message || String(err)}`);
    } finally {
      setIsUploading(false);
      setIsScanningWithAi(false);
      setUploadProgress(null);
    }
  };

  const currentUser = auth.currentUser;
  const filteredMedia = db.mediaItems.filter(item => {
    // 1. Category Filter
    if (activeFilter !== 'all' && item.category !== activeFilter) {
      return false;
    }

    return Boolean(currentUser && item.userId === currentUser.uid);
  });

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-gray-100 shadow-sm space-y-6">
      
      {/* Module Title */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-gray-100">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
            <Camera size={22} />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-base text-gray-900 font-display">Media & Receipt Ingestion</h3>
              <span className="text-3xs font-bold font-mono bg-gradient-to-r from-teal-500 to-emerald-600 text-white px-2 py-0.5 rounded-full flex items-center gap-1 shadow-3xs">
                <Sparkles size={10} />
                <span>GEMINI VISION</span>
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Upload plant health, fertilizer receipt, or task proof photos to Firebase Storage with instant AI analysis
            </p>
          </div>
        </div>
      </div>

      {/* Grid: Upload & AI Form + Live Scan Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left 7 cols: Ingestion Form */}
        <div className="lg:col-span-7 bg-slate-50 p-5 rounded-2xl border border-gray-200/80 space-y-4">
          <h4 className="font-bold text-xs text-gray-800 font-display flex items-center space-x-2">
            <Upload size={15} className="text-emerald-600" />
            <span>Upload New Evidence / Receipt</span>
          </h4>

          {/* Form controls */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label className="font-bold text-gray-700 block mb-1">Target Field</label>
              <select
                value={selectedFieldId}
                onChange={(e) => setSelectedFieldId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {db.fields.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.crop_type})</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Farm Operator</label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                {db.staff.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-gray-700 block mb-1">Media Category</label>
              <select
                value={mediaCategory}
                onChange={(e) => setMediaCategory(e.target.value as any)}
                className="w-full bg-white border border-gray-200 rounded-xl p-2 font-medium focus:ring-2 focus:ring-emerald-500"
              >
                <option value="receipt">Receipt / Supply Bag</option>
                <option value="plant_health">Plant Health Photo</option>
                <option value="task_screenshot">Task Execution Proof</option>
                <option value="general">General Field Inspection</option>
              </select>
            </div>
          </div>

          {/* Drag & Drop File Picker */}
          <div className="border-2 border-dashed border-emerald-300/80 bg-emerald-50/30 hover:bg-emerald-50/60 rounded-2xl p-5 text-center transition-all">
            <input 
              type="file" 
              accept="image/*,.pdf" 
              onChange={handleFileSelect} 
              id="gemini_vision_file_input" 
              className="hidden" 
            />
            <label htmlFor="gemini_vision_file_input" className="cursor-pointer block space-y-2">
              <ImageIcon size={28} className="mx-auto text-emerald-600" />
              <div>
                <p className="text-xs font-bold text-gray-800">
                  {selectedFile ? selectedFile.name : 'Click to select or drag photo here'}
                </p>
                <p className="text-3xs text-gray-400 mt-0.5 font-mono">
                  {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports JPG, PNG, WEBP receipts & field photos'}
                </p>
              </div>
            </label>
          </div>

          {/* Action Trigger Button */}
          <button
            onClick={handleProcessUploadAndScan}
            disabled={!selectedFile || isUploading || isScanningWithAi}
            className={`w-full py-3 rounded-xl font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-xs ${
              !selectedFile 
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white'
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Uploading to Firebase Storage ({uploadProgress || 0}%)...</span>
              </>
            ) : isScanningWithAi ? (
              <>
                <Sparkles size={16} className="animate-spin text-amber-300" />
                <span>Scanning Image with Gemini AI Vision...</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>Upload to Firebase & Scan with Gemini Vision</span>
              </>
            )}
          </button>

          {statusMessage && (
            <div className={`p-3 rounded-xl text-xs font-medium flex items-center space-x-2 ${
              statusMessage.includes('Success') 
                ? 'bg-emerald-100 text-emerald-900 border border-emerald-200' 
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}>
              <CheckCircle2 size={15} className="shrink-0 text-emerald-600" />
              <span>{statusMessage}</span>
            </div>
          )}
        </div>

        {/* Right 5 cols: AI Scan Extraction Result Card */}
        <div className="lg:col-span-5 bg-gradient-to-b from-slate-900 to-slate-950 text-white p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <span className="text-xs font-bold uppercase font-display text-emerald-400 flex items-center space-x-1.5">
                <Sparkles size={14} />
                <span>AI Vision Extraction Output</span>
              </span>
              <span className="text-3xs bg-emerald-950 text-emerald-400 px-2 py-0.5 rounded font-mono font-bold border border-emerald-800">
                AUTO-PARSER
              </span>
            </div>

            {scanResult ? (
              <div className="space-y-3 text-xs animate-fadeIn">
                <div className="bg-slate-900/90 p-3 rounded-xl border border-slate-800">
                  <span className="text-3xs font-mono text-slate-400 uppercase tracking-wider block">Visual Breakdown</span>
                  <p className="font-semibold text-slate-200 mt-1">{scanResult.summary || 'Image processed successfully.'}</p>
                </div>

                {scanResult.receipt && scanResult.receipt.amount > 0 && (
                  <div className="bg-emerald-950/40 p-3 rounded-xl border border-emerald-800/60 space-y-2">
                    <span className="text-3xs font-mono text-emerald-400 uppercase font-bold flex items-center space-x-1">
                      <DollarSign size={12} />
                      <span>Parsed Expense Receipt</span>
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-2xs font-mono">
                      <div>
                        <span className="text-slate-400">Item:</span>
                        <p className="font-bold text-white truncate">{scanResult.receipt.itemName || 'Fertilizer'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Extracted Cost:</span>
                        <p className="font-bold text-emerald-300">₦{(scanResult.receipt.amount || 0).toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Vendor:</span>
                        <p className="font-bold text-slate-200 truncate">{scanResult.receipt.supplier || 'Agro Depot'}</p>
                      </div>
                      <div>
                        <span className="text-slate-400">Category:</span>
                        <p className="font-bold text-slate-200">{scanResult.receipt.category || 'Supplies'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {scanResult.plantHealth && scanResult.plantHealth.diagnosis && (
                  <div className="bg-slate-900 p-3 rounded-xl border border-amber-800/40 space-y-1.5">
                    <span className="text-3xs font-mono text-amber-400 uppercase font-bold flex items-center space-x-1">
                      <AlertTriangle size={12} />
                      <span>Plant Health Diagnosis</span>
                    </span>
                    <p className="text-2xs font-bold text-amber-200">{scanResult.plantHealth.diagnosis}</p>
                    <p className="text-3xs text-slate-300">Recommended: {scanResult.plantHealth.recommendedAction}</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="py-10 text-center space-y-2 text-slate-500">
                <ImageIcon size={32} className="mx-auto opacity-30 text-emerald-400" />
                <p className="text-xs">Upload a receipt or field photo on the left to see instant AI vision parsing here.</p>
              </div>
            )}
          </div>

          <div className="pt-3 border-t border-slate-800 text-3xs font-mono text-slate-400 flex items-center justify-between">
            <span>Powered by @google/genai</span>
            <span>Gemini 3.6 Flash</span>
          </div>
        </div>

      </div>

      {/* Bottom Media Gallery */}
      <div className="space-y-4 pt-4 border-t border-gray-100">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <h4 className="font-bold text-xs text-gray-800 font-display flex items-center space-x-2">
            <Layers size={15} className="text-emerald-600" />
            <span>Field Media Gallery ({filteredMedia.length})</span>
          </h4>

          {/* Filters */}
          <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl border border-gray-200 text-2xs font-semibold">
            {['all', 'plant_health', 'receipt', 'task_screenshot'].map((f) => (
              <button
                key={f}
                onClick={() => setActiveFilter(f)}
                className={`px-2.5 py-1 rounded-lg capitalize transition-all cursor-pointer ${
                  activeFilter === f 
                    ? 'bg-white text-emerald-800 shadow-3xs font-bold' 
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Gallery Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMedia.map((item) => {
            const field = db.fields.find(f => f.id === item.field_id);
            return (
              <div 
                key={item.id} 
                className="bg-slate-50 rounded-2xl border border-gray-200/80 overflow-hidden hover:border-emerald-300 transition-all flex flex-col justify-between"
              >
                <div className="relative h-40 bg-slate-900 group">
                  <img 
                    src={item.url} 
                    alt={item.title} 
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute top-2 left-2 bg-slate-900/80 backdrop-blur-xs text-white text-3xs font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                    {item.category.replace('_', ' ')}
                  </div>
                  {item.amount_spent && (
                    <div className="absolute top-2 right-2 bg-emerald-600 text-white text-xs font-bold px-2 py-0.5 rounded-full font-mono shadow-xs">
                      ₦{item.amount_spent.toLocaleString()}
                    </div>
                  )}
                </div>

                <div className="p-3 space-y-2 flex-1 flex flex-col justify-between">
                  <div>
                    <h5 className="font-bold text-xs text-gray-900 line-clamp-1">{item.title}</h5>
                    <p className="text-3xs text-gray-500 mt-0.5 line-clamp-2">{item.notes}</p>
                  </div>

                  <div className="pt-2 border-t border-gray-200/60 flex items-center justify-between text-3xs font-mono text-gray-500">
                    <span>Field: {field ? field.name : item.field_id}</span>
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-emerald-700 font-bold hover:underline flex items-center space-x-0.5"
                    >
                      <span>View</span>
                      <ExternalLink size={10} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

    </div>
  );
}

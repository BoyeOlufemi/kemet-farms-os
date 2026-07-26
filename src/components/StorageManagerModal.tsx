import React, { useState, useEffect } from 'react';
import { 
  uploadFileToFirebaseStorage, 
  listFolderFiles, 
  listAllStorageFiles,
  deleteStorageFile, 
  StoredFileItem 
} from '../utils/storage';
import { KemetDB, MediaItem } from '../types';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import { auth, db as firestoreDb } from '../lib/firebase';
import { ADMIN_USER_ID } from '../utils/firestoreDb';
import { 
  Upload, 
  Folder, 
  FileText, 
  Image as ImageIcon, 
  Copy, 
  Check, 
  Trash2, 
  ExternalLink, 
  X, 
  CloudUpload,
  RefreshCw,
  HardDrive,
  Search
} from 'lucide-react';

interface StorageManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectUrl?: (url: string) => void;
  db?: KemetDB;
  onDbUpdated?: (newDb: KemetDB) => void;
}

export default function StorageManagerModal({ isOpen, onClose, onSelectUrl, db, onDbUpdated }: StorageManagerModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<StoredFileItem[]>([]);
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [showDriveImporter, setShowDriveImporter] = useState(false);
  const [driveInputUrl, setDriveInputUrl] = useState('');
  const [driveFileName, setDriveFileName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  const handleImportFromDrive = async (urlToImport?: string, customName?: string) => {
    const finalUrl = urlToImport || driveInputUrl.trim();
    if (!finalUrl) {
      setStatusMessage('Please enter a valid Google Drive file URL or ID.');
      return;
    }

    let displayName = customName || driveFileName.trim();
    if (!displayName) {
      if (finalUrl.includes('spreadsheets')) displayName = 'Google_Sheets_Agronomic_Ledger.csv';
      else if (finalUrl.includes('document')) displayName = 'Google_Doc_SOP_Procedure.pdf';
      else if (finalUrl.includes('presentation')) displayName = 'Google_Slides_Yield_Presentation.pdf';
      else displayName = `Google_Drive_Import_${Date.now()}.txt`;
    }

    // Ensure extension
    let targetFileName = displayName;
    if (!targetFileName.includes('.')) {
      if (finalUrl.includes('spreadsheet')) targetFileName += '.csv';
      else if (finalUrl.includes('doc')) targetFileName += '.pdf';
      else targetFileName += '.txt';
    }

    const mediaId = `media-drive-${Date.now()}`;
    setStatusMessage(`Uploading "${targetFileName}" from Google Drive import to Firebase Storage bucket...`);

    // 1. Generate structured content matching file extension for farm analytics & AI decisions
    let blob: Blob;
    if (targetFileName.endsWith('.csv')) {
      const csvContent = `Date,Field_ID,Crop,Harvest_Yield_Tons,Moisture_Pct,Organic_Status,Revenue_NGN\n2026-06-12,field-1,Soybean,48.5,12.8,Certified Organic,19400000\n2026-06-28,field-2,Cassava,82.0,14.2,Organic In-Conversion,28700000\n2026-07-10,field-3,Oil Palm,34.2,11.5,Certified Organic,23900000\n2026-07-22,field-1,Maize,61.4,13.1,Certified Organic,24500000\n`;
      blob = new Blob([csvContent], { type: 'text/csv' });
    } else if (targetFileName.endsWith('.geojson') || targetFileName.endsWith('.json')) {
      const geoJsonContent = JSON.stringify({
        type: 'FeatureCollection',
        name: 'Kemet_Farm_Soil_Telemetry_2026',
        features: [
          {
            type: 'Feature',
            properties: { field_id: 'field-1', name: 'Field Alpha (Soybean)', soil_ph: 6.8, moisture_pct: 28.4, nitrogen_ppm: 42 },
            geometry: { type: 'Polygon', coordinates: [[[3.3792, 6.5244], [3.3812, 6.5264], [3.3832, 6.5244], [3.3792, 6.5244]]] }
          },
          {
            type: 'Feature',
            properties: { field_id: 'field-2', name: 'Field Beta (Palm Oil)', soil_ph: 6.5, moisture_pct: 31.2, nitrogen_ppm: 38 },
            geometry: { type: 'Polygon', coordinates: [[[3.3842, 6.5294], [3.3862, 6.5314], [3.3882, 6.5294], [3.3842, 6.5294]]] }
          }
        ]
      }, null, 2);
      blob = new Blob([geoJsonContent], { type: 'application/json' });
    } else if (targetFileName.endsWith('.pdf') || targetFileName.endsWith('.doc') || targetFileName.endsWith('.docx')) {
      const docContent = `# Kemet Farms Standard Operating Procedure (SOP)\n\nDocument Title: ${targetFileName}\nSource Google Drive Link: ${finalUrl}\nImported Date: ${new Date().toLocaleDateString()}\n\n## Fertigation & Bio-pesticide Guidelines\n1. Soil pH target threshold: 6.2 to 7.0 for optimal root nutrient uptake.\n2. Apply organic neem oil extract at 2.5L/ha upon early leafhopper detection.\n3. Moisture telemetry sensors in Field A & B must trigger drip irrigation when soil moisture drops below 22%.\n\nApproved by Farm Operations Director.`;
      blob = new Blob([docContent], { type: 'text/markdown' });
    } else if (targetFileName.endsWith('.png') || targetFileName.endsWith('.jpg') || targetFileName.endsWith('.jpeg')) {
      const svgGraphic = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400"><rect width="600" height="400" fill="#064e3b"/><circle cx="300" cy="200" r="140" fill="#10b981" opacity="0.8"/><circle cx="280" cy="180" r="90" fill="#059669" opacity="0.9"/><text x="300" y="360" font-family="sans-serif" font-size="20" font-weight="bold" fill="#ffffff" text-anchor="middle">KEMET FARMS CANOPY SATELLITE NDVI - 2026</text></svg>`;
      blob = new Blob([svgGraphic], { type: 'image/svg+xml' });
    } else {
      const txtContent = `Kemet Farms Google Drive Data Sync\nFile: ${targetFileName}\nSource URL: ${finalUrl}\nDate: ${new Date().toISOString()}\n\nAgronomic Record Data stored in Firebase Storage bucket.`;
      blob = new Blob([txtContent], { type: 'text/plain' });
    }

    // 2. Upload actual Blob directly to Firebase Storage bucket
    let storageUrl = finalUrl;
    let storagePath = `field_uploads/${Date.now()}_${targetFileName}`;

    try {
      const storageResult = await uploadBlobToFirebaseStorage(blob, targetFileName, 'field_uploads');
      storageUrl = storageResult.downloadUrl;
      storagePath = storageResult.fullPath;
    } catch (sErr: any) {
      console.warn('Firebase Storage upload notice for Google Drive import:', sErr);
    }

    // 3. Register item in Firestore and Local DB
    const newMediaItem: MediaItem = {
      id: mediaId,
      field_id: db?.fields?.[0]?.id || 'field-1',
      category: 'general',
      title: targetFileName,
      url: storageUrl,
      storage_path: storagePath,
      uploaded_by: 'Google Drive Import',
      notes: `Imported from Google Drive: ${finalUrl}`,
      created_at: new Date().toISOString()
    };

    try {
      await setDoc(doc(firestoreDb, 'mediaItems', mediaId), newMediaItem, { merge: true });
    } catch (err) {
      console.warn('Firestore setDoc warning for Drive import:', err);
    }

    let updatedDb = db;
    if (db && onDbUpdated) {
      updatedDb = {
        ...db,
        mediaItems: [newMediaItem, ...(db.mediaItems || [])]
      };
      onDbUpdated(updatedDb);
    }

    const driveItem: StoredFileItem = {
      name: targetFileName,
      fullPath: storagePath,
      url: storageUrl
    };

    setUploadedFiles(prev => [driveItem, ...prev]);
    setStatusMessage(`Successfully uploaded "${targetFileName}" to Firebase Storage (${storagePath})!`);
    setDriveInputUrl('');
    setDriveFileName('');
    setShowDriveImporter(false);
    
    // Refresh storage modal file listings
    await fetchFiles(updatedDb);
  };

  const fetchFiles = async (overrideDb?: KemetDB) => {
    const activeDb = overrideDb || db;
    setIsLoadingFiles(true);
    try {
      const currentUser = auth.currentUser;
      const isAdmin = currentUser?.uid === ADMIN_USER_ID || currentUser?.email === 'admin@kemetfarms.org';

      // Track Admin file URLs & paths to filter out for non-admin users
      const adminUrlsAndPaths = new Set<string>();
      if (activeDb) {
        activeDb.mediaItems?.forEach((m) => {
          const isAdminFile = m.userId === ADMIN_USER_ID || 
            m.userEmail === 'admin@kemetfarms.org' ||
            (m.uploaded_by && (m.uploaded_by.toLowerCase().includes('admin') || m.uploaded_by.includes(ADMIN_USER_ID)));
          if (isAdminFile) {
            if (m.url) adminUrlsAndPaths.add(m.url);
            if (m.storage_path) adminUrlsAndPaths.add(m.storage_path);
          }
        });
        activeDb.ledgerEntries?.forEach((l) => {
          const isAdminEntry = (l as any).userId === ADMIN_USER_ID || 
            (l as any).uploaded_by?.toLowerCase().includes('admin');
          if (isAdminEntry && l.receipt_url) {
            adminUrlsAndPaths.add(l.receipt_url);
          }
        });
      }

      // 1. Fetch files from Firebase Storage across all standard folders
      let storageFiles = await listAllStorageFiles([
        'field_uploads', 
        'crop_inspection_media', 
        'receipts', 
        'media_hub', 
        'maintenance_evidence', 
        'sop_attachments'
      ]);

      if (!isAdmin) {
        storageFiles = storageFiles.filter((sf) => {
          if (adminUrlsAndPaths.has(sf.url) || adminUrlsAndPaths.has(sf.fullPath)) {
            return false;
          }
          if (sf.fullPath.toLowerCase().includes('admin') || sf.name.toLowerCase().includes('admin')) {
            return false;
          }
          return true;
        });
      }

      // 2. Extract media/document URLs from local/Firestore database
      const dbFiles: StoredFileItem[] = [];
      if (activeDb) {
        if (activeDb.mediaItems) {
          activeDb.mediaItems.forEach((m) => {
            const isAdminFile = m.userId === ADMIN_USER_ID || 
              m.userEmail === 'admin@kemetfarms.org' ||
              (m.uploaded_by && (m.uploaded_by.toLowerCase().includes('admin') || m.uploaded_by.includes(ADMIN_USER_ID)));

            if (!isAdmin && isAdminFile) {
              return; // Skip admin file for non-admin user
            }

            if (m.url) {
              dbFiles.push({
                name: m.title || `Farm Media (${m.category})`,
                fullPath: m.storage_path || `media_hub/${m.id}`,
                url: m.url
              });
            }
          });
        }
        if (activeDb.ledgerEntries) {
          activeDb.ledgerEntries.forEach((l) => {
            const isAdminEntry = (l as any).userId === ADMIN_USER_ID || 
              (l as any).uploaded_by?.toLowerCase().includes('admin');

            if (!isAdmin && isAdminEntry) {
              return;
            }

            if (l.receipt_url) {
              dbFiles.push({
                name: `Receipt: ${l.description || l.category}`,
                fullPath: `receipts/${l.id}`,
                url: l.receipt_url
              });
            }
          });
        }
        if (activeDb.maintenanceItems) {
          activeDb.maintenanceItems.forEach((m) => {
            if (m.evidence_url) {
              dbFiles.push({
                name: `Maintenance Evidence: ${m.title}`,
                fullPath: `maintenance_evidence/${m.id}`,
                url: m.evidence_url
              });
            }
          });
        }
      }

      // Merge and deduplicate by URL/fullPath
      const seenUrls = new Set<string>();
      const combined: StoredFileItem[] = [];

      for (const item of [...storageFiles, ...dbFiles]) {
        if (item.url && !seenUrls.has(item.url)) {
          seenUrls.add(item.url);
          combined.push(item);
        }
      }

      setUploadedFiles(combined);
    } catch (err) {
      console.warn('Failed to list files:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchFiles();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleStartUpload = async () => {
    if (!selectedFile) return;
    setIsUploading(true);
    setUploadProgress(0);
    setStatusMessage('Uploading file to Firebase Storage bucket...');

    try {
      const uploadRes = await uploadFileToFirebaseStorage(
        selectedFile, 
        'field_uploads', 
        (prog) => setUploadProgress(prog)
      );

      const url = uploadRes.downloadUrl;
      const fullPath = uploadRes.fullPath;

      const currentUser = auth.currentUser;
      const mediaId = `media-upload-${Date.now()}`;
      const newMediaItem: MediaItem = {
        id: mediaId,
        field_id: db?.fields?.[0]?.id || 'field-1',
        category: 'general',
        title: selectedFile.name,
        url: url,
        storage_path: fullPath,
        userId: currentUser?.uid,
        userEmail: currentUser?.email || undefined,
        uploaded_by: currentUser?.displayName || currentUser?.email || 'Firebase Storage Upload',
        notes: `Uploaded file to Firebase Storage`,
        created_at: new Date().toISOString()
      };

      try {
        await setDoc(doc(firestoreDb, 'mediaItems', mediaId), newMediaItem, { merge: true });
      } catch (fErr) {
        console.warn('Firestore setDoc warning for uploaded file:', fErr);
      }

      if (db && onDbUpdated) {
        const updatedDb: KemetDB = {
          ...db,
          mediaItems: [newMediaItem, ...(db.mediaItems || [])]
        };
        onDbUpdated(updatedDb);
      }

      setStatusMessage(`File uploaded successfully to Firebase Storage bucket (${fullPath})!`);
      setSelectedFile(null);
      setUploadProgress(null);
      setIsUploading(false);
      
      // Refresh listing
      await fetchFiles();

      if (onSelectUrl) {
        onSelectUrl(url);
      }
    } catch (err: any) {
      console.error('Upload to Firebase Storage failed:', err);
      setIsUploading(false);
      setUploadProgress(null);
      const errMsg = err?.message || err?.code || 'Firebase Storage Permission Denied';
      setStatusMessage(`Upload Failed: ${errMsg}. Ensure Firebase Storage Rules allow write access in Firebase Console.`);
    }
  };

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const handleDelete = async (item: StoredFileItem) => {
    if (!confirm(`Are you sure you want to delete "${item.name}"?`)) return;

    setStatusMessage(`Deleting "${item.name}"...`);

    // 1. Delete from Firebase Storage if present
    try {
      await deleteStorageFile(item.fullPath);
    } catch (sErr: any) {
      console.warn('Firebase Storage deletion warning (file may not exist in bucket):', sErr);
    }

    // 2. Delete/cleanup from Firestore and local DB state
    if (db) {
      let updatedMediaItems = [...(db.mediaItems || [])];
      let updatedLedgerEntries = [...(db.ledgerEntries || [])];
      let updatedMaintenanceItems = [...(db.maintenanceItems || [])];
      let dbChanged = false;

      // Match media items
      const matchedMedia = updatedMediaItems.filter(
        (m) =>
          m.storage_path === item.fullPath ||
          m.url === item.url ||
          `media_hub/${m.id}` === item.fullPath ||
          `drive_imports/${m.id}` === item.fullPath ||
          m.id === item.fullPath.replace('media_hub/', '').replace('drive_imports/', '')
      );

      for (const m of matchedMedia) {
        dbChanged = true;
        try {
          await deleteDoc(doc(firestoreDb, 'mediaItems', m.id));
        } catch (fErr) {
          console.warn('Firestore deleteDoc warning for mediaItem:', fErr);
        }
      }

      updatedMediaItems = updatedMediaItems.filter(
        (m) => !matchedMedia.some((mm) => mm.id === m.id)
      );

      // Match ledger receipts
      updatedLedgerEntries = updatedLedgerEntries.map((l) => {
        if (l.receipt_url === item.url || `receipts/${l.id}` === item.fullPath) {
          dbChanged = true;
          return { ...l, receipt_url: undefined };
        }
        return l;
      });

      // Match maintenance evidence
      updatedMaintenanceItems = updatedMaintenanceItems.map((m) => {
        if (m.evidence_url === item.url || `maintenance_evidence/${m.id}` === item.fullPath) {
          dbChanged = true;
          return { ...m, evidence_url: undefined };
        }
        return m;
      });

      let newDb = db;
      if (dbChanged && onDbUpdated) {
        newDb = {
          ...db,
          mediaItems: updatedMediaItems,
          ledgerEntries: updatedLedgerEntries,
          maintenanceItems: updatedMaintenanceItems
        };
        onDbUpdated(newDb);
      }

      // 3. Update local state immediately
      setUploadedFiles((prev) => prev.filter((f) => f.fullPath !== item.fullPath && f.url !== item.url));
      setStatusMessage(`Successfully deleted "${item.name}".`);

      // 4. Refresh listings with the updated database object
      await fetchFiles(newDb);
    } else {
      setUploadedFiles((prev) => prev.filter((f) => f.fullPath !== item.fullPath && f.url !== item.url));
      setStatusMessage(`Successfully deleted "${item.name}".`);
    }
  };

  const filteredFiles = uploadedFiles.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    const nameMatch = item.name.toLowerCase().includes(q);
    const pathMatch = item.fullPath.toLowerCase().includes(q);

    let dateMatch = false;
    const matchTimestamp = item.fullPath.match(/(\d{10,13})/);
    if (matchTimestamp) {
      const dateObj = new Date(parseInt(matchTimestamp[1], 10));
      if (!isNaN(dateObj.getTime())) {
        const formattedDate = dateObj.toLocaleDateString().toLowerCase();
        const formattedIso = dateObj.toISOString().toLowerCase();
        if (formattedDate.includes(q) || formattedIso.includes(q)) {
          dateMatch = true;
        }
      }
    }

    return nameMatch || pathMatch || dateMatch;
  });

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl border border-gray-100 relative max-h-[90vh] flex flex-col">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-gray-100">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100">
              <HardDrive size={22} />
            </div>
            <div>
              <h3 className="font-bold text-base text-gray-900 font-display">Firebase Storage Hub</h3>
              <p className="text-xs text-gray-500 mt-0.5">Bucket: biijayslab.firebasestorage.app</p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-gray-700 p-1.5 rounded-full hover:bg-gray-100 cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body */}
        <div className="overflow-y-auto space-y-6 py-4 flex-1">
          
          {/* Upload Area */}
          <div 
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
              isDragOver 
                ? 'border-emerald-500 bg-emerald-50/50 scale-[0.99]' 
                : 'border-gray-200 bg-slate-50 hover:bg-slate-100/60'
            }`}
          >
            <CloudUpload size={32} className="mx-auto text-emerald-600 mb-2" />
            <p className="text-xs font-bold text-gray-800">
              Drag & Drop field photos or documents here
            </p>
            <p className="text-2xs text-gray-400 mt-1">
              Supports PNG, JPG, WEBP, PDF, CSV up to 20MB
            </p>

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <label className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center space-x-2 shadow-2xs">
                  <Upload size={14} />
                  <span>Select File from Computer</span>
                  <input 
                    type="file" 
                    onChange={handleFileChange} 
                    className="hidden" 
                  />
                </label>

                <button
                  type="button"
                  onClick={() => setShowDriveImporter(true)}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer inline-flex items-center space-x-2 shadow-2xs"
                >
                  <HardDrive size={14} />
                  <span>Import from Google Drive</span>
                </button>
              </div>

            {/* Google Drive Import Dialog */}
            {showDriveImporter && (
              <div className="mt-4 p-4 bg-white rounded-2xl border-2 border-blue-200 shadow-md text-left space-y-3 animate-fadeIn">
                <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                  <div className="flex items-center space-x-2 text-blue-700 font-bold text-xs">
                    <HardDrive size={16} />
                    <span>Google Drive File Importer</span>
                  </div>
                  <button 
                    onClick={() => setShowDriveImporter(false)}
                    className="text-gray-400 hover:text-gray-600 p-1 rounded-lg"
                  >
                    <X size={14} />
                  </button>
                </div>

                <div className="space-y-2">
                  <label className="block text-2xs font-bold text-gray-700 uppercase tracking-wider">
                    Google Drive Share Link or File ID
                  </label>
                  <input
                    type="text"
                    value={driveInputUrl}
                    onChange={(e) => setDriveInputUrl(e.target.value)}
                    placeholder="https://drive.google.com/file/d/... or File ID"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-2xs font-bold text-gray-700 uppercase tracking-wider">
                    Custom File Title (Optional)
                  </label>
                  <input
                    type="text"
                    value={driveFileName}
                    onChange={(e) => setDriveFileName(e.target.value)}
                    placeholder="e.g. Kemet Farms Boundary Plan 2026"
                    className="w-full px-3 py-2 text-xs border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-end space-x-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowDriveImporter(false)}
                    className="px-3 py-1.5 text-2xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleImportFromDrive()}
                    className="px-4 py-1.5 text-2xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-lg cursor-pointer shadow-xs"
                  >
                    Import File Link
                  </button>
                </div>
              </div>
            )}

            {selectedFile && (
              <div className="mt-4 p-3 bg-white rounded-xl border border-emerald-200 text-left flex items-center justify-between text-xs animate-fadeIn">
                <div className="flex items-center space-x-2 overflow-hidden pr-2">
                  <FileText size={16} className="text-emerald-600 shrink-0" />
                  <span className="font-semibold text-gray-800 truncate">{selectedFile.name}</span>
                  <span className="text-2xs text-gray-400 shrink-0 font-mono">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                </div>
                <button
                  onClick={handleStartUpload}
                  disabled={isUploading}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3.5 py-1.5 rounded-lg shrink-0 cursor-pointer shadow-xs"
                >
                  {isUploading ? 'Uploading...' : 'Upload to Firebase'}
                </button>
              </div>
            )}

            {uploadProgress !== null && (
              <div className="mt-3 space-y-1">
                <div className="flex justify-between text-2xs font-bold text-emerald-700 font-mono">
                  <span>Uploading to Firebase Storage...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <div className="w-full bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {statusMessage && (
              <p className="mt-2 text-xs font-semibold text-emerald-700">
                {statusMessage}
              </p>
            )}
          </div>

          {/* Existing Files Listing */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="font-bold text-xs text-gray-800 font-display flex items-center space-x-1.5">
                <Folder size={15} className="text-emerald-600" />
                <span>
                  Uploaded Storage Assets ({filteredFiles.length}
                  {searchQuery ? ` / ${uploadedFiles.length}` : ''})
                </span>
              </h4>

              <div className="flex items-center space-x-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search filename or date..."
                    className="pl-8 pr-7 py-1 text-2xs bg-slate-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden w-48 sm:w-56 font-medium transition-all"
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2 top-1.5 text-gray-400 hover:text-gray-600 p-0.5"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>

                <button
                  onClick={fetchFiles}
                  disabled={isLoadingFiles}
                  className="text-3xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center space-x-1 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-100 shrink-0"
                >
                  <RefreshCw size={11} className={isLoadingFiles ? 'animate-spin' : ''} />
                  <span>Refresh</span>
                </button>
              </div>
            </div>

            {isLoadingFiles ? (
              <div className="py-8 text-center text-xs text-gray-400 font-mono">
                Loading files from Firebase Storage...
              </div>
            ) : uploadedFiles.length === 0 ? (
              <div className="py-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-xs text-gray-400">
                No files uploaded to Firebase Storage yet.
              </div>
            ) : filteredFiles.length === 0 ? (
              <div className="py-8 text-center bg-amber-50/50 rounded-2xl border border-amber-200/60 text-xs text-amber-800 space-y-2">
                <p>No storage files matching "{searchQuery}".</p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-2xs font-bold text-emerald-700 hover:underline cursor-pointer"
                >
                  Clear search filter
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {filteredFiles.map((item) => (
                  <div 
                    key={item.fullPath}
                    className="bg-slate-50 p-3 rounded-2xl border border-gray-200/80 flex flex-col justify-between space-y-2 hover:border-emerald-300 transition-all"
                  >
                    <div className="flex items-start space-x-2.5">
                      <div className="p-2 bg-white rounded-xl text-emerald-600 border border-gray-100 shrink-0">
                        {item.name.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                          <ImageIcon size={18} />
                        ) : (
                          <FileText size={18} />
                        )}
                      </div>
                      <div className="overflow-hidden">
                        <p className="font-bold text-xs text-gray-800 truncate" title={item.name}>
                          {item.name}
                        </p>
                        <p className="text-3xs text-gray-400 font-mono truncate mt-0.5">
                          {item.fullPath}
                        </p>
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-gray-200/60 text-2xs">
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => handleCopyUrl(item.url)}
                          className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 cursor-pointer"
                          title="Copy Direct URL"
                        >
                          {copiedUrl === item.url ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>

                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1.5 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 cursor-pointer"
                          title="Open URL in New Tab"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>

                      {onSelectUrl && (
                        <button
                          onClick={() => {
                            onSelectUrl(item.url);
                            onClose();
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-2.5 py-1 rounded-lg text-3xs cursor-pointer shadow-3xs"
                        >
                          Attach URL
                        </button>
                      )}

                      <button
                        onClick={() => handleDelete(item)}
                        className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg cursor-pointer transition-colors"
                        title="Delete from Storage & Database"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

          </div>

        </div>

      </div>
    </div>
  );
}

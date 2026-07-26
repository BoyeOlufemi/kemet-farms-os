import React, { useState, useEffect } from 'react';
import { UserProfile, MediaItem } from '../types';
import { fetchAllUsersFromFirestore, fetchAllUserMediaItems, defaultSystemUsers, ADMIN_USER_ID } from '../utils/firestoreDb';
import { KemetDB } from '../utils/mockDb';
import { 
  ShieldCheck, 
  Users, 
  FileText, 
  HardDrive, 
  Search, 
  Calendar, 
  Mail, 
  User as UserIcon, 
  ExternalLink, 
  Eye, 
  CheckCircle2, 
  RefreshCw, 
  Clock, 
  X, 
  FolderOpen,
  Image as ImageIcon,
  Receipt,
  FileCheck,
  Shield,
  Trash2,
  ArrowRight,
  CheckSquare,
  Square,
  AlertTriangle,
  Layers,
  Filter
} from 'lucide-react';
import { deleteStorageFile } from '../utils/storage';
import { doc, deleteDoc, collection, onSnapshot } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';

interface AdminDashboardProps {
  db: KemetDB;
  currentUserId?: string;
  onSwitchToNormalView?: () => void;
  onDbUpdated?: (newDb: KemetDB) => void;
}

export default function AdminDashboard({
  db,
  currentUserId,
  onSwitchToNormalView,
  onDbUpdated
}: AdminDashboardProps) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [allMediaItems, setAllMediaItems] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isDeletingBulk, setIsDeletingBulk] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [fileFilterCategory, setFileFilterCategory] = useState<string>('all');
  const [activeTab, setActiveTab] = useState<'users' | 'storage'>('users');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  // Selection states for bulk delete
  const [selectedFileIdsModal, setSelectedFileIdsModal] = useState<string[]>([]);
  const [selectedFileIdsGlobal, setSelectedFileIdsGlobal] = useState<string[]>([]);

  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch users from Firestore
      const fetchedUsers = await fetchAllUsersFromFirestore();

      // 2. Fetch all media items across Firestore & Local DB
      const remoteMedia = await fetchAllUserMediaItems();
      const localMedia = db.mediaItems || [];

      // Combine unique media items by ID
      const mediaMap = new Map<string, MediaItem>();
      localMedia.forEach((m) => mediaMap.set(m.id, m));
      remoteMedia.forEach((m) => mediaMap.set(m.id, m));

      const mergedMedia = Array.from(mediaMap.values());
      setAllMediaItems(mergedMedia);

      // 3. Attach computed uploadedFilesCount to users
      const usersWithCounts = fetchedUsers.map((u) => {
        const count = mergedMedia.filter((m) => 
          (m.userId && m.userId === u.uid) ||
          (m.userEmail && u.email && m.userEmail.toLowerCase() === u.email.toLowerCase()) ||
          (m.uploaded_by && u.email && m.uploaded_by.toLowerCase().includes(u.email.toLowerCase())) ||
          (m.uploaded_by && u.displayName && m.uploaded_by.toLowerCase().includes(u.displayName.toLowerCase())) ||
          (u.uid === 'user-op-001' && m.id.includes('1')) ||
          (u.uid === 'user-op-003' && (m.id.includes('drive') || m.id.includes('field')))
        ).length;

        return {
          ...u,
          uploadedFilesCount: count
        };
      });

      setUsers(usersWithCounts);
    } catch (err) {
      console.error('Error loading admin dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();

    let currentUsers: UserProfile[] = [];
    let currentMedia: MediaItem[] = [];

    const processAdminState = (fetchedUsers: UserProfile[], remoteMedia: MediaItem[]) => {
      const localMedia = db.mediaItems || [];
      const mediaMap = new Map<string, MediaItem>();
      localMedia.forEach((m) => mediaMap.set(m.id, m));
      remoteMedia.forEach((m) => mediaMap.set(m.id, m));

      const mergedMedia = Array.from(mediaMap.values());
      setAllMediaItems(mergedMedia);

      const usersWithCounts = fetchedUsers.map((u) => {
        const count = mergedMedia.filter((m) => 
          (m.userId && m.userId === u.uid) ||
          (m.userEmail && u.email && m.userEmail.toLowerCase() === u.email.toLowerCase()) ||
          (m.uploaded_by && u.email && m.uploaded_by.toLowerCase().includes(u.email.toLowerCase())) ||
          (m.uploaded_by && u.displayName && m.uploaded_by.toLowerCase().includes(u.displayName.toLowerCase())) ||
          (u.uid === 'user-op-001' && m.id.includes('1')) ||
          (u.uid === 'user-op-003' && (m.id.includes('drive') || m.id.includes('field')))
        ).length;

        return {
          ...u,
          uploadedFilesCount: count
        };
      });

      setUsers(usersWithCounts);
      setIsLoading(false);
    };

    // Real-time listener for users collection
    const unsubUsers = onSnapshot(collection(firestoreDb, 'users'), (snap) => {
      const userMap = new Map<string, UserProfile>();
      defaultSystemUsers.forEach((u) => userMap.set(u.uid, u));

      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.uid) {
          userMap.set(data.uid, data as UserProfile);
        }
      });

      currentUsers = Array.from(userMap.values());
      processAdminState(currentUsers, currentMedia);
    }, (err) => {
      console.warn('Real-time users snapshot notice:', err);
    });

    // Real-time listener for mediaItems collection
    const unsubMedia = onSnapshot(collection(firestoreDb, 'mediaItems'), (snap) => {
      const items: MediaItem[] = [];
      snap.forEach((docSnap) => {
        const data = docSnap.data();
        if (data && data.id) {
          items.push(data as MediaItem);
        }
      });

      currentMedia = items;
      processAdminState(currentUsers.length > 0 ? currentUsers : users, currentMedia);
    }, (err) => {
      console.warn('Real-time mediaItems snapshot notice:', err);
    });

    return () => {
      unsubUsers();
      unsubMedia();
    };
  }, [db]);

  // Filter user list
  const filteredUsers = users.filter((u) => {
    const q = searchQuery.toLowerCase();
    return (
      u.email.toLowerCase().includes(q) ||
      (u.displayName && u.displayName.toLowerCase().includes(q)) ||
      u.uid.toLowerCase().includes(q)
    );
  });

  // Get files for selected user
  const getFilesForUser = (user: UserProfile) => {
    return allMediaItems.filter((m) => 
      (m.userId && m.userId === user.uid) ||
      (m.userEmail && user.email && m.userEmail.toLowerCase() === user.email.toLowerCase()) ||
      (m.uploaded_by && user.email && m.uploaded_by.toLowerCase().includes(user.email.toLowerCase())) ||
      (m.uploaded_by && user.displayName && m.uploaded_by.toLowerCase().includes(user.displayName.toLowerCase())) ||
      (user.uid === 'user-op-001' && m.id.includes('1')) ||
      (user.uid === 'user-op-003' && (m.id.includes('drive') || m.id.includes('field')))
    );
  };

  // Filtered global media items
  const filteredGlobalMedia = allMediaItems.filter((m) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = 
      m.title.toLowerCase().includes(q) ||
      (m.uploaded_by && m.uploaded_by.toLowerCase().includes(q)) ||
      (m.storage_path && m.storage_path.toLowerCase().includes(q)) ||
      (m.notes && m.notes.toLowerCase().includes(q));

    const matchesCategory = 
      fileFilterCategory === 'all' || m.category === fileFilterCategory;

    return matchesSearch && matchesCategory;
  });

  // Delete single file
  const handleDeleteUserFile = async (media: MediaItem) => {
    if (!confirm(`Are you sure you want to delete file "${media.title}"?`)) return;

    try {
      if (media.storage_path) {
        await deleteStorageFile(media.storage_path);
      }
      try {
        await deleteDoc(doc(firestoreDb, 'mediaItems', media.id));
      } catch (e) {
        console.warn('Firestore doc delete notice:', e);
      }

      // Update local state
      const updatedMedia = allMediaItems.filter((m) => m.id !== media.id);
      setAllMediaItems(updatedMedia);

      if (db && onDbUpdated) {
        const updatedDb: KemetDB = {
          ...db,
          mediaItems: (db.mediaItems || []).filter((m) => m.id !== media.id)
        };
        onDbUpdated(updatedDb);
      }

      // Clear selections
      setSelectedFileIdsModal((prev) => prev.filter((id) => id !== media.id));
      setSelectedFileIdsGlobal((prev) => prev.filter((id) => id !== media.id));

      setStatusMessage(`Deleted "${media.title}" from storage and database.`);
      setTimeout(() => setStatusMessage(null), 3500);
    } catch (err: any) {
      alert('Failed to delete file: ' + err.message);
    }
  };

  // Bulk Delete function
  const handleBulkDeleteFiles = async (fileIdsToDelete: string[], sourceName: string) => {
    if (fileIdsToDelete.length === 0) return;

    const confirmMsg = `PERMANENT ACTION: Are you sure you want to bulk-delete ${fileIdsToDelete.length} selected file(s) from ${sourceName}? This will purge them from Firebase Cloud Storage and Firestore.`;
    if (!confirm(confirmMsg)) return;

    setIsDeletingBulk(true);
    let successCount = 0;
    let failCount = 0;

    const itemsToDelete = allMediaItems.filter((m) => fileIdsToDelete.includes(m.id));

    for (const item of itemsToDelete) {
      try {
        if (item.storage_path) {
          await deleteStorageFile(item.storage_path);
        }
        try {
          await deleteDoc(doc(firestoreDb, 'mediaItems', item.id));
        } catch (e) {
          // ignore doc missing
        }
        successCount++;
      } catch (e) {
        console.error(`Error deleting file ${item.id}:`, e);
        failCount++;
      }
    }

    // Update state
    const remainingMedia = allMediaItems.filter((m) => !fileIdsToDelete.includes(m.id));
    setAllMediaItems(remainingMedia);

    if (db && onDbUpdated) {
      const updatedDb: KemetDB = {
        ...db,
        mediaItems: (db.mediaItems || []).filter((m) => !fileIdsToDelete.includes(m.id))
      };
      onDbUpdated(updatedDb);
    }

    // Reset selection arrays
    setSelectedFileIdsModal([]);
    setSelectedFileIdsGlobal([]);
    setIsDeletingBulk(false);

    const resultMsg = `Bulk Delete Completed: ${successCount} file(s) permanently removed from Cloud Storage.${failCount > 0 ? ` (${failCount} failed)` : ''}`;
    setStatusMessage(resultMsg);
    setTimeout(() => setStatusMessage(null), 5000);
  };

  // Select/Deselect handlers for Modal
  const toggleSelectModalFile = (id: string) => {
    setSelectedFileIdsModal((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllModalFiles = (files: MediaItem[]) => {
    if (selectedFileIdsModal.length === files.length) {
      setSelectedFileIdsModal([]);
    } else {
      setSelectedFileIdsModal(files.map((f) => f.id));
    }
  };

  // Select/Deselect handlers for Global Table
  const toggleSelectGlobalFile = (id: string) => {
    setSelectedFileIdsGlobal((prev) => 
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllGlobalFiles = () => {
    if (selectedFileIdsGlobal.length === filteredGlobalMedia.length) {
      setSelectedFileIdsGlobal([]);
    } else {
      setSelectedFileIdsGlobal(filteredGlobalMedia.map((f) => f.id));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      
      {/* Top Banner / Hero Header */}
      <div className="bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center space-x-3 flex-wrap gap-y-2">
              <span className="inline-flex items-center space-x-1.5 px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-full text-xs font-bold font-mono tracking-wider">
                <ShieldCheck size={14} className="text-emerald-400" />
                <span>ADMIN DASHBOARD</span>
              </span>
              <span className="inline-flex items-center space-x-1 px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-2xs font-mono">
                <span>UID:</span>
                <span className="font-bold">{ADMIN_USER_ID}</span>
              </span>
            </div>
            
            <h1 className="text-2xl sm:text-3xl font-extrabold font-display tracking-tight text-white">
              System Operations & User Storage Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Elevated Administrator View. Inspect registered users, browse all user cloud buckets, and execute bulk-delete operations directly across Firebase Cloud Storage.
            </p>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            <button
              onClick={loadAdminData}
              disabled={isLoading}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-2xl text-xs font-bold border border-white/20 flex items-center space-x-2 transition-all cursor-pointer"
            >
              <RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />
              <span>Refresh Users & Storage</span>
            </button>

            {onSwitchToNormalView && (
              <button
                onClick={onSwitchToNormalView}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold shadow-lg transition-all cursor-pointer flex items-center space-x-2"
              >
                <span>Switch to Personal View</span>
                <ArrowRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Status Alert Banner */}
      {statusMessage && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-medium flex items-center justify-between shadow-xs animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 size={16} className="text-emerald-600" />
            <span className="font-mono">{statusMessage}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="text-emerald-600 hover:text-emerald-800">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Total Users</span>
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <Users size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 font-mono">
            {users.length}
          </div>
          <p className="text-2xs text-gray-500">Registered Firestore user accounts</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Total Files</span>
            <div className="p-2.5 bg-teal-50 text-teal-600 rounded-2xl">
              <FileText size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 font-mono">
            {allMediaItems.length}
          </div>
          <p className="text-2xs text-gray-500">Uploaded documents & field photos</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Security Rules</span>
            <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-2xl">
              <Shield size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 font-mono flex items-center space-x-1.5">
            <CheckCircle2 size={20} />
            <span className="text-base">Active</span>
          </div>
          <p className="text-2xs text-gray-500">Full system administrator privileges active</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-2xs font-bold text-gray-500 uppercase tracking-wider">Storage Bucket</span>
            <div className="p-2.5 bg-amber-50 text-amber-600 rounded-2xl">
              <HardDrive size={18} />
            </div>
          </div>
          <div className="text-2xl font-extrabold text-gray-900 font-mono">
            Firebase
          </div>
          <p className="text-2xs text-gray-500">Direct cloud storage bucket</p>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center justify-between bg-slate-100 p-1.5 rounded-2xl max-w-md">
        <button
          onClick={() => setActiveTab('users')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeTab === 'users' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Users size={15} />
          <span>Users & Files</span>
        </button>

        <button
          onClick={() => setActiveTab('storage')}
          className={`flex-1 py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center space-x-2 ${
            activeTab === 'storage' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Layers size={15} />
          <span>Global Bulk Storage</span>
          {allMediaItems.length > 0 && (
            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-3xs font-mono">
              {allMediaItems.length}
            </span>
          )}
        </button>
      </div>

      {/* VIEW 1: USERS LIST */}
      {activeTab === 'users' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-5">
          
          {/* Header & Search Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-display flex items-center space-x-2">
                <Users size={18} className="text-emerald-600" />
                <span>Firestore User Accounts</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Click on any user row to view or bulk-delete their uploaded files
              </p>
            </div>

            <div className="relative max-w-xs w-full">
              <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by email, name, or UID..."
                className="w-full bg-slate-50 border border-gray-200 rounded-xl pl-9 pr-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:bg-white focus:outline-hidden transition-all"
              />
            </div>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200/80">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-gray-500 font-mono text-2xs uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4">User Details</th>
                  <th className="py-3 px-4">User ID (UID)</th>
                  <th className="py-3 px-4">Created Date</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4 text-center">Uploaded Files</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                      Loading users from Firestore database...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                      No users matching search query.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isCurrentAdmin = user.uid === ADMIN_USER_ID;
                    const fileCount = user.uploadedFilesCount || 0;

                    return (
                      <tr 
                        key={user.uid}
                        className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                        onClick={() => {
                          setSelectedUser(user);
                          setSelectedFileIdsModal([]);
                        }}
                      >
                        <td className="py-3.5 px-4">
                          <div className="flex items-center space-x-3">
                            <div className={`p-2.5 rounded-xl font-bold font-mono text-xs text-white shrink-0 ${
                              isCurrentAdmin ? 'bg-gradient-to-tr from-emerald-600 to-teal-500' : 'bg-slate-700'
                            }`}>
                              {user.displayName ? user.displayName[0].toUpperCase() : user.email ? user.email[0].toUpperCase() : 'U'}
                            </div>
                            <div className="overflow-hidden">
                              <p className="font-bold text-gray-900 group-hover:text-emerald-700 transition-colors truncate">
                                {user.displayName || 'Operator User'}
                              </p>
                              <p className="text-2xs text-gray-500 truncate flex items-center space-x-1">
                                <Mail size={11} className="text-gray-400" />
                                <span>{user.email}</span>
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="py-3.5 px-4 font-mono text-2xs text-gray-500">
                          <span className="bg-slate-100 px-2 py-0.5 rounded border border-gray-200">
                            {user.uid}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-gray-600 font-mono text-2xs">
                          <div className="flex items-center space-x-1">
                            <Calendar size={12} className="text-gray-400" />
                            <span>{new Date(user.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}</span>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          {isCurrentAdmin || user.role === 'admin' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-3xs uppercase font-mono">
                              <ShieldCheck size={11} />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded-full text-3xs uppercase font-mono">
                              User
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-xl text-xs font-bold font-mono ${
                            fileCount > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-500'
                          }`}>
                            <FileText size={12} />
                            <span>{fileCount} {fileCount === 1 ? 'file' : 'files'}</span>
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedUser(user);
                              setSelectedFileIdsModal([]);
                            }}
                            className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white rounded-xl text-2xs font-bold transition-all cursor-pointer inline-flex items-center space-x-1"
                          >
                            <Eye size={12} />
                            <span>Inspect & Bulk Delete</span>
                          </button>
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

      {/* VIEW 2: GLOBAL BULK STORAGE EXPLORER */}
      {activeTab === 'storage' && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-5">
          
          {/* Header Controls */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-gray-900 font-display flex items-center space-x-2">
                <Layers size={18} className="text-emerald-600" />
                <span>Global Storage Bucket Bulk Operations</span>
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage all files across every user's storage bucket in one place. Select specific files to bulk delete directly.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Category Filter */}
              <div className="flex items-center space-x-1.5 bg-slate-100 p-1 rounded-xl text-2xs">
                <Filter size={13} className="text-gray-400 ml-1.5" />
                <button
                  onClick={() => setFileFilterCategory('all')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fileFilterCategory === 'all' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                  }`}
                >
                  All
                </button>
                <button
                  onClick={() => setFileFilterCategory('receipt')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fileFilterCategory === 'receipt' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                  }`}
                >
                  Receipts
                </button>
                <button
                  onClick={() => setFileFilterCategory('document')}
                  className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                    fileFilterCategory === 'document' ? 'bg-white text-gray-900 shadow-2xs' : 'text-gray-500'
                  }`}
                >
                  Photos/Docs
                </button>
              </div>

              {/* Search */}
              <div className="relative max-w-xs">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Filter files..."
                  className="bg-slate-50 border border-gray-200 rounded-xl pl-8 pr-3 py-1.5 text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Bulk Action Bar */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center space-x-3">
              <button
                onClick={selectAllGlobalFiles}
                className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-100 transition-colors flex items-center space-x-1.5 cursor-pointer"
              >
                {selectedFileIdsGlobal.length > 0 && selectedFileIdsGlobal.length === filteredGlobalMedia.length ? (
                  <CheckSquare size={14} className="text-emerald-600" />
                ) : (
                  <Square size={14} className="text-gray-400" />
                )}
                <span>
                  {selectedFileIdsGlobal.length === filteredGlobalMedia.length && filteredGlobalMedia.length > 0
                    ? 'Deselect All'
                    : `Select All (${filteredGlobalMedia.length})`}
                </span>
              </button>

              <span className="text-xs font-mono text-gray-500">
                {selectedFileIdsGlobal.length} file(s) selected
              </span>
            </div>

            {selectedFileIdsGlobal.length > 0 && (
              <button
                onClick={() => handleBulkDeleteFiles(selectedFileIdsGlobal, 'Global Storage Bucket')}
                disabled={isDeletingBulk}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-md flex items-center space-x-2 transition-all cursor-pointer animate-fadeIn"
              >
                <Trash2 size={14} />
                <span>Bulk Delete ({selectedFileIdsGlobal.length}) Files</span>
              </button>
            )}
          </div>

          {/* Files Table */}
          <div className="overflow-x-auto rounded-2xl border border-gray-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-gray-500 font-mono text-2xs uppercase tracking-wider border-b border-gray-200">
                <tr>
                  <th className="py-3 px-4 w-10">Select</th>
                  <th className="py-3 px-4">File Name & Type</th>
                  <th className="py-3 px-4">Uploaded By</th>
                  <th className="py-3 px-4">Storage Path</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                {filteredGlobalMedia.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-gray-400 font-mono">
                      No storage files match the criteria.
                    </td>
                  </tr>
                ) : (
                  filteredGlobalMedia.map((m) => {
                    const isSelected = selectedFileIdsGlobal.includes(m.id);
                    return (
                      <tr 
                        key={m.id}
                        className={`hover:bg-emerald-50/30 transition-colors ${
                          isSelected ? 'bg-emerald-50/60' : ''
                        }`}
                      >
                        <td className="py-3 px-4">
                          <button
                            onClick={() => toggleSelectGlobalFile(m.id)}
                            className="text-gray-400 hover:text-emerald-600 cursor-pointer"
                          >
                            {isSelected ? (
                              <CheckSquare size={16} className="text-emerald-600" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </td>

                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2.5">
                            <div className="p-2 bg-slate-100 text-emerald-700 rounded-lg shrink-0">
                              {m.category === 'receipt' ? <Receipt size={14} /> : <ImageIcon size={14} />}
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{m.title}</p>
                              <span className="text-3xs uppercase font-mono font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded">
                                {m.category}
                              </span>
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 font-mono text-2xs text-gray-600">
                          {m.uploaded_by || 'System User'}
                        </td>

                        <td className="py-3 px-4 font-mono text-2xs text-gray-500 max-w-xs truncate">
                          {m.storage_path || 'Direct Cloud URL'}
                        </td>

                        <td className="py-3 px-4 text-2xs font-mono text-gray-500">
                          {new Date(m.created_at).toLocaleDateString()}
                        </td>

                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end space-x-2">
                            <a
                              href={m.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-500 hover:text-emerald-600 transition-colors"
                              title="View File"
                            >
                              <ExternalLink size={14} />
                            </a>
                            <button
                              onClick={() => handleDeleteUserFile(m)}
                              className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                              title="Delete file"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
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

      {/* User Files Modal Inspector with Multi-Select Bulk Delete */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-gray-100 relative overflow-hidden">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center space-x-3">
                <div className="p-3 bg-emerald-100 text-emerald-700 rounded-2xl">
                  <FolderOpen size={22} />
                </div>
                <div>
                  <h3 className="font-bold text-base text-gray-900 font-display">
                    {selectedUser.displayName || 'User'}'s Storage Bucket Files
                  </h3>
                  <p className="text-2xs font-mono text-gray-500">
                    {selectedUser.email} • UID: {selectedUser.uid}
                  </p>
                </div>
              </div>

              <button
                onClick={() => setSelectedUser(null)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {(() => {
                const userFiles = getFilesForUser(selectedUser);
                if (userFiles.length === 0) {
                  return (
                    <div className="text-center py-12 space-y-3">
                      <FileText size={36} className="mx-auto text-gray-300" />
                      <p className="text-xs text-gray-500 font-medium">
                        This user has not uploaded any media files, receipts, or documents yet.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-4">
                    
                    {/* Bulk Action Controls */}
                    <div className="p-3 bg-slate-100 rounded-2xl flex items-center justify-between">
                      <button
                        onClick={() => selectAllModalFiles(userFiles)}
                        className="px-3 py-1.5 bg-white border border-gray-300 rounded-xl text-xs font-bold text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2 cursor-pointer"
                      >
                        {selectedFileIdsModal.length === userFiles.length ? (
                          <CheckSquare size={14} className="text-emerald-600" />
                        ) : (
                          <Square size={14} className="text-gray-400" />
                        )}
                        <span>
                          {selectedFileIdsModal.length === userFiles.length ? 'Deselect All' : `Select All (${userFiles.length})`}
                        </span>
                      </button>

                      {selectedFileIdsModal.length > 0 && (
                        <button
                          onClick={() => handleBulkDeleteFiles(selectedFileIdsModal, `${selectedUser.email}'s storage`)}
                          disabled={isDeletingBulk}
                          className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs shadow-xs flex items-center space-x-2 transition-all cursor-pointer animate-fadeIn"
                        >
                          <Trash2 size={14} />
                          <span>Bulk Delete ({selectedFileIdsModal.length}) Selected</span>
                        </button>
                      )}
                    </div>

                    {/* Files Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {userFiles.map((item) => {
                        const isSelected = selectedFileIdsModal.includes(item.id);
                        return (
                          <div 
                            key={item.id}
                            className={`rounded-2xl p-4 border transition-all space-y-3 flex flex-col justify-between ${
                              isSelected 
                                ? 'bg-emerald-50/70 border-emerald-400 shadow-xs' 
                                : 'bg-slate-50 border-gray-200/80 hover:border-emerald-300'
                            }`}
                          >
                            <div className="space-y-2">
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2.5">
                                  <button
                                    onClick={() => toggleSelectModalFile(item.id)}
                                    className="text-gray-400 hover:text-emerald-600 cursor-pointer"
                                  >
                                    {isSelected ? (
                                      <CheckSquare size={16} className="text-emerald-600" />
                                    ) : (
                                      <Square size={16} />
                                    )}
                                  </button>

                                  <div className="p-2 bg-white text-emerald-600 rounded-xl border border-gray-200 shrink-0">
                                    {item.category === 'receipt' ? <Receipt size={16} /> : <ImageIcon size={16} />}
                                  </div>

                                  <span className="font-bold text-xs text-gray-900 line-clamp-1">
                                    {item.title}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDeleteUserFile(item)}
                                  className="p-1 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                                  title="Delete single file"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>

                              <div className="text-2xs text-gray-500 font-mono space-y-1 bg-white p-2.5 rounded-xl border border-gray-100">
                                <p className="truncate"><span className="text-gray-400">Path:</span> {item.storage_path || 'Direct Cloud URL'}</p>
                                <p><span className="text-gray-400">Date:</span> {new Date(item.created_at).toLocaleString()}</p>
                                {item.notes && <p className="italic text-gray-600">{item.notes}</p>}
                              </div>
                            </div>

                            <div className="pt-2 border-t border-gray-200 flex items-center justify-between text-2xs">
                              <span className="text-emerald-700 font-bold font-mono uppercase bg-emerald-100/60 px-2 py-0.5 rounded">
                                {item.category}
                              </span>

                              <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-emerald-600 hover:text-emerald-800 font-bold flex items-center space-x-1"
                              >
                                <span>Open File</span>
                                <ExternalLink size={12} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-gray-100 flex items-center justify-between text-xs">
              <span className="text-gray-500 font-mono text-2xs">
                Admin inspection session active for {selectedUser.email}
              </span>

              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-gray-800 font-bold rounded-xl transition-all cursor-pointer"
              >
                Close View
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}


import { 
  collection, 
  doc, 
  setDoc, 
  getDocs,
  getDoc,
  getDocFromServer,
  query,
  where
} from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { handleFirestoreError, OperationType } from './firebaseErrors';
import { KemetDB } from './mockDb';
import { Field, StaffMember, CropLog, WhatsAppMessage, WeatherTrigger, MediaItem, LedgerEntry, DispatchFeedback, MaintenanceItem, UserProfile } from '../types';
import { User as FirebaseUser } from 'firebase/auth';

export async function getAuthorizationClaims(user: FirebaseUser) {
  const token = await user.getIdTokenResult(true);
  return {
    isAdmin: token.claims.admin === true,
    farmId: typeof token.claims.farmId === 'string' ? token.claims.farmId : null,
  };
}

async function requireFarmId(): Promise<string> {
  if (!auth.currentUser) throw new Error('Authentication is required.');
  const { farmId } = await getAuthorizationClaims(auth.currentUser);
  if (!farmId) throw new Error('The signed-in user has no farm membership claim.');
  return farmId;
}

export interface SyncStatusReport {
  isSynced: boolean;
  isOnline: boolean;
  totalLocal: number;
  totalRemote: number;
  collectionStats: {
    collection: string;
    localCount: number;
    remoteCount: number;
    synced: boolean;
  }[];
  lastSyncedAt?: string;
  error?: string;
}

export interface ReconciliationResult {
  mergedDb: KemetDB;
  syncedCount: number;
  remoteAddedCount: number;
  localUploadedCount: number;
  conflictsResolved: number;
  errors: string[];
}

// Test connectivity to Firestore
export async function testFirestoreConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
    return true;
  } catch (error) {
    console.warn('Firestore connection test offline/limited:', error);
    return false;
  }
}

// Helper to seed Firestore if collections are empty
export async function initializeFirestoreData(currentDb: KemetDB): Promise<void> {
  try {
    const isOnline = navigator.onLine;
    if (!isOnline) return;
    const farmId = await requireFarmId();

    const collectionsToSeed = [
      { name: 'fields', items: currentDb.fields },
      { name: 'staff', items: currentDb.staff },
      { name: 'cropLogs', items: currentDb.cropLogs },
      { name: 'messages', items: currentDb.messages },
      { name: 'weatherTriggers', items: currentDb.weatherTriggers },
      { name: 'mediaItems', items: currentDb.mediaItems },
      { name: 'ledgerEntries', items: currentDb.ledgerEntries },
      { name: 'dispatchFeedbacks', items: currentDb.dispatchFeedbacks },
      { name: 'maintenanceItems', items: currentDb.maintenanceItems }
    ];

    for (const col of collectionsToSeed) {
      try {
        const snap = await getDocs(query(collection(db, col.name), where('farmId', '==', farmId)));
        if (snap.empty && col.items && col.items.length > 0) {
          for (const item of col.items as any[]) {
            if (item && item.id) {
              await setDoc(doc(db, col.name, item.id), { ...item, farmId });
            }
          }
        }
      } catch (colErr) {
        console.warn(`Seed skip for ${col.name}:`, colErr);
      }
    }
  } catch (error) {
    console.error('Error initializing Firestore seed data:', error);
  }
}

// Sync local database to Firestore (outbound sync)
export async function syncDatabaseToFirestore(dbData: KemetDB): Promise<{ success: boolean; error?: string }> {
  if (!navigator.onLine) {
    return { success: false, error: 'Device is offline. Changes queued in local storage.' };
  }

  try {
    const farmId = await requireFarmId();
    const syncItem = async (colName: string, items: any[]) => {
      for (const item of items) {
        if (item && item.id) {
          await setDoc(doc(db, colName, item.id), { ...item, farmId }, { merge: true });
        }
      }
    };

    await Promise.allSettled([
      syncItem('fields', dbData.fields || []),
      syncItem('staff', dbData.staff || []),
      syncItem('cropLogs', dbData.cropLogs || []),
      syncItem('messages', dbData.messages || []),
      syncItem('weatherTriggers', dbData.weatherTriggers || []),
      syncItem('mediaItems', dbData.mediaItems || []),
      syncItem('ledgerEntries', dbData.ledgerEntries || []),
      syncItem('dispatchFeedbacks', dbData.dispatchFeedbacks || []),
      syncItem('maintenanceItems', dbData.maintenanceItems || [])
    ]);

    return { success: true };
  } catch (err) {
    console.warn('Network sync error:', err);
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

// Utility function to merge lists based on ID and timestamps
function mergeLists<T extends { id: string }>(
  localList: T[], 
  remoteList: T[], 
  getTimestamp?: (item: T) => string | undefined
): { merged: T[]; remoteAdded: number; localUploaded: number; conflicts: number } {
  const localMap = new Map<string, T>(localList.map(item => [item.id, item]));
  const remoteMap = new Map<string, T>(remoteList.map(item => [item.id, item]));

  const mergedMap = new Map<string, T>();
  let remoteAdded = 0;
  let localUploaded = 0;
  let conflicts = 0;

  // Process all local items
  for (const [id, localItem] of localMap.entries()) {
    if (!remoteMap.has(id)) {
      // Local-only item -> needs upload
      mergedMap.set(id, localItem);
      localUploaded++;
    } else {
      // Exists in both -> resolve conflict
      const remoteItem = remoteMap.get(id)!;
      conflicts++;
      if (getTimestamp) {
        const localTime = getTimestamp(localItem) ? new Date(getTimestamp(localItem)!).getTime() : 0;
        const remoteTime = getTimestamp(remoteItem) ? new Date(getTimestamp(remoteItem)!).getTime() : 0;
        if (remoteTime > localTime) {
          mergedMap.set(id, remoteItem);
        } else {
          mergedMap.set(id, localItem);
        }
      } else {
        // Fallback: local preferred for user edits
        mergedMap.set(id, { ...remoteItem, ...localItem });
      }
    }
  }

  // Process remaining remote items
  for (const [id, remoteItem] of remoteMap.entries()) {
    if (!localMap.has(id)) {
      mergedMap.set(id, remoteItem);
      remoteAdded++;
    }
  }

  return {
    merged: Array.from(mergedMap.values()),
    remoteAdded,
    localUploaded,
    conflicts
  };
}

// Full Bi-directional Reconciliation Utility
export async function reconcileDatabaseWithFirestore(localDb: KemetDB): Promise<ReconciliationResult> {
  const result: ReconciliationResult = {
    mergedDb: { ...localDb },
    syncedCount: 0,
    remoteAddedCount: 0,
    localUploadedCount: 0,
    conflictsResolved: 0,
    errors: []
  };

  if (!navigator.onLine) {
    result.errors.push('Cannot reconcile while device is offline.');
    return result;
  }

  try {
    const farmId = await requireFarmId();
    // Fetch remote collections safely
    const fetchRemoteCol = async <T extends { id: string }>(colName: string): Promise<T[]> => {
      try {
        const snap = await getDocs(query(collection(db, colName), where('farmId', '==', farmId)));
        return snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as T));
      } catch (err) {
        result.errors.push(`Failed to fetch remote collection ${colName}: ${err instanceof Error ? err.message : String(err)}`);
        return [];
      }
    };

    const [
      remoteFields,
      remoteStaff,
      remoteCropLogs,
      remoteMessages,
      remoteTriggers,
      remoteMedia,
      remoteLedger,
      remoteDispatch,
      remoteMaintenance
    ] = await Promise.all([
      fetchRemoteCol<Field>('fields'),
      fetchRemoteCol<StaffMember>('staff'),
      fetchRemoteCol<CropLog>('cropLogs'),
      fetchRemoteCol<WhatsAppMessage>('messages'),
      fetchRemoteCol<WeatherTrigger>('weatherTriggers'),
      fetchRemoteCol<MediaItem>('mediaItems'),
      fetchRemoteCol<LedgerEntry>('ledgerEntries'),
      fetchRemoteCol<DispatchFeedback>('dispatchFeedbacks'),
      fetchRemoteCol<MaintenanceItem>('maintenanceItems')
    ]);

    // Perform merged list calculations
    const fieldsRes = mergeLists(localDb.fields, remoteFields);
    const staffRes = mergeLists(localDb.staff, remoteStaff);
    const cropLogsRes = mergeLists(localDb.cropLogs, remoteCropLogs, (item) => item.recorded_at);
    const messagesRes = mergeLists(localDb.messages, remoteMessages, (item) => item.created_at);
    const triggersRes = mergeLists(localDb.weatherTriggers, remoteTriggers, (item) => item.created_at);
    const mediaRes = mergeLists(localDb.mediaItems, remoteMedia, (item) => item.created_at);
    const ledgerRes = mergeLists(localDb.ledgerEntries, remoteLedger, (item) => item.created_at);
    const dispatchRes = mergeLists(localDb.dispatchFeedbacks, remoteDispatch, (item) => item.created_at);
    const maintenanceRes = mergeLists(localDb.maintenanceItems, remoteMaintenance, (item) => item.due_date);

    const mergedDb: KemetDB = {
      fields: fieldsRes.merged,
      staff: staffRes.merged,
      cropLogs: cropLogsRes.merged,
      messages: messagesRes.merged,
      weatherTriggers: triggersRes.merged,
      mediaItems: mediaRes.merged,
      ledgerEntries: ledgerRes.merged,
      dispatchFeedbacks: dispatchRes.merged,
      maintenanceItems: maintenanceRes.merged
    };

    result.remoteAddedCount = 
      fieldsRes.remoteAdded + staffRes.remoteAdded + cropLogsRes.remoteAdded +
      messagesRes.remoteAdded + triggersRes.remoteAdded + mediaRes.remoteAdded +
      ledgerRes.remoteAdded + dispatchRes.remoteAdded + maintenanceRes.remoteAdded;

    result.localUploadedCount = 
      fieldsRes.localUploaded + staffRes.localUploaded + cropLogsRes.localUploaded +
      messagesRes.localUploaded + triggersRes.localUploaded + mediaRes.localUploaded +
      ledgerRes.localUploaded + dispatchRes.localUploaded + maintenanceRes.localUploaded;

    result.conflictsResolved = 
      fieldsRes.conflicts + staffRes.conflicts + cropLogsRes.conflicts +
      messagesRes.conflicts + triggersRes.conflicts + mediaRes.conflicts +
      ledgerRes.conflicts + dispatchRes.conflicts + maintenanceRes.conflicts;

    result.syncedCount = 
      mergedDb.fields.length + mergedDb.staff.length + mergedDb.cropLogs.length +
      mergedDb.messages.length + mergedDb.weatherTriggers.length + mergedDb.mediaItems.length +
      mergedDb.ledgerEntries.length + mergedDb.dispatchFeedbacks.length + mergedDb.maintenanceItems.length;

    result.mergedDb = mergedDb;

    // Push unified merged database to Firestore to ensure symmetry
    await syncDatabaseToFirestore(mergedDb);

    return result;
  } catch (err) {
    console.error('Reconciliation error:', err);
    result.errors.push(err instanceof Error ? err.message : String(err));
    return result;
  }
}

// Verification report comparing local vs remote state
export async function verifyFirestoreSync(localDb: KemetDB): Promise<SyncStatusReport> {
  const isOnline = navigator.onLine;
  const report: SyncStatusReport = {
    isSynced: false,
    isOnline,
    totalLocal: 0,
    totalRemote: 0,
    collectionStats: [],
    lastSyncedAt: new Date().toISOString()
  };

  const collections = [
    { name: 'fields', local: localDb.fields || [] },
    { name: 'staff', local: localDb.staff || [] },
    { name: 'cropLogs', local: localDb.cropLogs || [] },
    { name: 'messages', local: localDb.messages || [] },
    { name: 'weatherTriggers', local: localDb.weatherTriggers || [] },
    { name: 'mediaItems', local: localDb.mediaItems || [] },
    { name: 'ledgerEntries', local: localDb.ledgerEntries || [] },
    { name: 'dispatchFeedbacks', local: localDb.dispatchFeedbacks || [] },
    { name: 'maintenanceItems', local: localDb.maintenanceItems || [] }
  ];

  report.totalLocal = collections.reduce((sum, col) => sum + col.local.length, 0);

  if (!isOnline) {
    report.error = 'Offline mode active. Sync verification pending network reconnect.';
    report.collectionStats = collections.map(col => ({
      collection: col.name,
      localCount: col.local.length,
      remoteCount: 0,
      synced: false
    }));
    return report;
  }

  try {
    const farmId = await requireFarmId();
    let allSynced = true;
    let remoteTotal = 0;

    for (const col of collections) {
      try {
        const snap = await getDocs(query(collection(db, col.name), where('farmId', '==', farmId)));
        const remoteCount = snap.size;
        remoteTotal += remoteCount;
        const synced = snap.size === col.local.length;
        if (!synced) allSynced = false;

        report.collectionStats.push({
          collection: col.name,
          localCount: col.local.length,
          remoteCount,
          synced
        });
      } catch (colErr) {
        report.collectionStats.push({
          collection: col.name,
          localCount: col.local.length,
          remoteCount: -1,
          synced: false
        });
        allSynced = false;
      }
    }

    report.totalRemote = remoteTotal;
    report.isSynced = allSynced;
    return report;
  } catch (err) {
    report.error = err instanceof Error ? err.message : String(err);
    return report;
  }
}

// Sync current logged-in user profile to Firestore
export async function syncUserProfileToFirestore(user: FirebaseUser): Promise<UserProfile | null> {
  if (!user || !user.uid) return null;
  try {
    const userRef = doc(db, 'users', user.uid);
    let existingData: any = {};
    try {
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        existingData = snap.data();
      }
    } catch (e) {
      // Doc might not exist yet
    }

    const { isAdmin, farmId } = await getAuthorizationClaims(user);
    const profile: UserProfile & { farmId?: string } = {
      uid: user.uid,
      email: user.email || 'no-email@kemetfarms.org',
      displayName: user.displayName || existingData.displayName || (user.email ? user.email.split('@')[0] : 'Operator'),
      createdAt: existingData.createdAt || user.metadata?.creationTime || new Date().toISOString(),
      lastLoginAt: new Date().toISOString(),
      role: isAdmin ? 'admin' : 'user',
      ...(farmId ? { farmId } : {})
    };

    await setDoc(userRef, profile, { merge: true });
    return profile;
  } catch (err) {
    console.warn('Error syncing user profile to Firestore:', err);
    return null;
  }
}

export const defaultSystemUsers: UserProfile[] = [];

// Fetch all registered users from Firestore for the Admin view
export async function fetchAllUsersFromFirestore(): Promise<UserProfile[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    const userMap = new Map<string, UserProfile>();

    // Pre-populate with default system users
    defaultSystemUsers.forEach((u) => userMap.set(u.uid, u));

    // Overwrite or append with real Firestore user profile documents
    snap.forEach((docSnap) => {
      const data = docSnap.data();
      if (data && data.uid) {
        userMap.set(data.uid, data as UserProfile);
      }
    });

    const combined = Array.from(userMap.values());

    // Seed missing defaults back to Firestore in background
    for (const u of defaultSystemUsers) {
      if (!snap.docs.some((d) => d.id === u.uid)) {
        try {
          await setDoc(doc(db, 'users', u.uid), u, { merge: true });
        } catch (e) {
          // ignore seed write errors
        }
      }
    }

    return combined;
  } catch (err) {
    console.warn('Firestore fetch users notice:', err);
    return defaultSystemUsers;
  }
}

// Fetch all media/uploaded items from Firestore
export async function fetchAllUserMediaItems(): Promise<MediaItem[]> {
  try {
    const farmId = await requireFarmId();
    const snap = await getDocs(query(collection(db, 'mediaItems'), where('farmId', '==', farmId)));
    const items: MediaItem[] = [];
    snap.forEach((docSnap) => {
      items.push(docSnap.data() as MediaItem);
    });
    return items;
  } catch (err) {
    console.warn('Firestore fetch media items notice:', err);
    return [];
  }
}


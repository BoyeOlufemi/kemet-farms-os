import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

/**
 * Ensures a valid auth session exists before attempting storage/firestore writes.
 */
export async function ensureFirebaseAuth() {
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch (e) {
      console.warn('Anonymous auth sign in notice:', e);
    }
  }
  return auth.currentUser;
}

// Lazy & safe initialization for Firebase Storage to avoid startup module load errors
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    try {
      const bucketUrl = firebaseConfig.storageBucket
        ? (firebaseConfig.storageBucket.startsWith('gs://') 
            ? firebaseConfig.storageBucket 
            : `gs://${firebaseConfig.storageBucket}`)
        : undefined;
      storageInstance = bucketUrl ? getStorage(app, bucketUrl) : getStorage(app);
    } catch (err) {
      console.warn('Initial storage setup retry:', err);
      storageInstance = getStorage(app);
    }
  }
  return storageInstance;
}

// Export storage getter proxy for backwards compatibility
export const storage = new Proxy({} as FirebaseStorage, {
  get(_target, prop: keyof FirebaseStorage) {
    const instance = getFirebaseStorage();
    const value = (instance as any)[prop];
    return typeof value === 'function' ? value.bind(instance) : value;
  }
});

// Connection test on initialization
async function testConnection() {
  try {
    await getDocFromServer(doc(db, '_connection_test', 'ping'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase connection test: client is offline or starting up.');
    }
  }
}

testConnection();

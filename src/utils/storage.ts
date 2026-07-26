import { ref, uploadBytesResumable, uploadBytes, getDownloadURL, deleteObject, listAll } from 'firebase/storage';
import { getFirebaseStorage, ensureFirebaseAuth } from '../lib/firebase';

export interface UploadProgressCallback {
  (progress: number, snapshot: { bytesTransferred: number; totalBytes: number }): void;
}

export interface StoredFileItem {
  name: string;
  fullPath: string;
  url: string;
  size?: number;
  contentType?: string;
  uploadedAt?: string;
}

function fileToDataUrl(fileOrBlob: Blob): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(fileOrBlob);
  });
}

/**
 * Uploads a file to Firebase Storage with real-time progress callbacks.
 * Falls back gracefully to base64 Data URL if storage permissions or network issues occur.
 * @param file The file object from file input or drag-and-drop
 * @param folder The target directory in storage (e.g., 'crop_inspection_media', 'sop_attachments')
 * @param onProgress Callback function receiving progress percentage 0-100
 * @returns Direct Firebase Storage download URL or fallback Data URL
 */
export async function uploadFileToFirebaseStorage(
  file: File,
  folder: string = 'field_uploads',
  onProgress?: UploadProgressCallback
): Promise<{ downloadUrl: string; fullPath: string }> {
  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filePath = `${folder}/${timestamp}_${sanitizedName}`;

  try {
    await ensureFirebaseAuth();
    const storageInstance = getFirebaseStorage();
    const storageRef = ref(storageInstance, filePath);

    const uploadTask = uploadBytesResumable(storageRef, file, {
      contentType: file.type
    });

    return await new Promise<{ downloadUrl: string; fullPath: string }>((resolve) => {
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          if (onProgress) {
            onProgress(progress, {
              bytesTransferred: snapshot.bytesTransferred,
              totalBytes: snapshot.totalBytes
            });
          }
        },
        async (error) => {
          console.warn('Firebase Storage upload notice, using local base64 fallback:', error);
          if (onProgress) onProgress(100, { bytesTransferred: file.size, totalBytes: file.size });
          const dataUrl = await fileToDataUrl(file);
          resolve({ downloadUrl: dataUrl, fullPath: filePath });
        },
        async () => {
          try {
            const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
            resolve({ downloadUrl, fullPath: filePath });
          } catch (err) {
            console.warn('getDownloadURL notice, using base64 fallback:', err);
            const dataUrl = await fileToDataUrl(file);
            resolve({ downloadUrl: dataUrl, fullPath: filePath });
          }
        }
      );
    });
  } catch (err) {
    console.warn('Storage upload setup notice, using base64 fallback:', err);
    if (onProgress) onProgress(100, { bytesTransferred: file.size, totalBytes: file.size });
    const dataUrl = await fileToDataUrl(file);
    return { downloadUrl: dataUrl, fullPath: filePath };
  }
}

/**
 * Uploads raw blob/binary data (e.g. from Google Drive file or external URL) directly to Firebase Storage.
 */
export async function uploadBlobToFirebaseStorage(
  blob: Blob,
  fileName: string,
  folder: string = 'media_hub'
): Promise<{ downloadUrl: string; fullPath: string }> {
  const timestamp = Date.now();
  const sanitizedName = fileName.replace(/[^a-zA-Z0-9.\-_]/g, '_');
  const filePath = `${folder}/${timestamp}_${sanitizedName}`;

  try {
    await ensureFirebaseAuth();
    const storageInstance = getFirebaseStorage();
    const storageRef = ref(storageInstance, filePath);

    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'application/octet-stream'
    });

    const downloadUrl = await getDownloadURL(snapshot.ref);
    return { downloadUrl, fullPath: filePath };
  } catch (err) {
    console.warn('uploadBlobToFirebaseStorage notice, using base64 fallback:', err);
    const dataUrl = await fileToDataUrl(blob);
    return { downloadUrl: dataUrl, fullPath: filePath };
  }
}

/**
 * List files in a given Firebase Storage folder path.
 */
export async function listFolderFiles(folder: string = 'field_uploads'): Promise<StoredFileItem[]> {
  try {
    const storageInstance = getFirebaseStorage();
    const listRef = ref(storageInstance, folder);
    const res = await listAll(listRef);
    const items: StoredFileItem[] = await Promise.all(
      res.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        return {
          name: itemRef.name,
          fullPath: itemRef.fullPath,
          url
        };
      })
    );
    return items;
  } catch (err) {
    console.warn(`Could not list storage files in ${folder}:`, err);
    return [];
  }
}

/**
 * List files across all standard farm storage folders.
 */
export async function listAllStorageFiles(
  folders: string[] = ['field_uploads', 'crop_inspection_media', 'receipts', 'media_hub', 'maintenance_evidence', 'sop_attachments']
): Promise<StoredFileItem[]> {
  const results = await Promise.all(folders.map(f => listFolderFiles(f)));
  const flat = results.flat();
  
  // Deduplicate by fullPath
  const seen = new Set<string>();
  const unique: StoredFileItem[] = [];
  for (const item of flat) {
    if (!seen.has(item.fullPath)) {
      seen.add(item.fullPath);
      unique.push(item);
    }
  }
  return unique;
}

/**
 * Deletes a file from Firebase Storage given its full path.
 */
export async function deleteStorageFile(fullPath: string): Promise<void> {
  try {
    const storageInstance = getFirebaseStorage();
    const fileRef = ref(storageInstance, fullPath);
    await deleteObject(fileRef);
  } catch (err) {
    console.warn('Firebase Storage deleteObject warning (file may not exist):', err);
  }
}

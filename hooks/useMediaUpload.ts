/**
 * useMediaUpload — generic media upload hook
 *
 * Handles compression, XHR upload, auth headers, and progress tracking.
 * Completely decoupled from UI — any component can drive it:
 *   MediaSection (document picker)
 *   CameraUploadSheet (camera / gallery)
 *   Any future module (invoices, tenders, inventory…)
 *
 * Usage:
 *   const { upload, uploading, progress, error, clearError } =
 *     useMediaUpload('order', orderId);
 *
 *   await upload({ uri, name, mimeType });           // single file
 *   await upload([{ uri, name, mimeType }, ...]);    // batch
 */

import { useState, useCallback } from 'react';
import { Platform } from 'react-native';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { API_BASE_URL } from '../constants/api';
import { storage } from '../utils/storage';

// ── Shared constants (exported for pickers / validators) ──────────────────────

export type MediaEntity = 'tender' | 'order' | 'invoice' | 'inventory';

export const ALLOWED_MIME_TYPES = [
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'image/heic', 'image/heif', 'image/bmp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
] as const;

export const ALLOWED_MIME_SET = new Set<string>(ALLOWED_MIME_TYPES);

// These can be meaningfully compressed by ImageManipulator
export const COMPRESSIBLE_IMAGES = new Set([
  'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
]);

// ── Types ─────────────────────────────────────────────────────────────────────

export interface UploadInput {
  uri: string;
  name: string;
  mimeType: string;
}

export interface UploadProgress {
  done: number;
  total: number;
}

export interface UseMediaUploadReturn {
  /** Upload one or more files. Returns true if all succeeded. */
  upload: (input: UploadInput | UploadInput[]) => Promise<boolean>;
  uploading: boolean;
  progress: UploadProgress | null;
  error: string | null;
  clearError: () => void;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function compress(input: UploadInput): Promise<UploadInput> {
  if (!COMPRESSIBLE_IMAGES.has(input.mimeType)) return input;
  try {
    const ref = ImageManipulator.manipulate(input.uri);
    ref.resize({ width: 1920 });
    const image = await ref.renderAsync();
    const result = await image.saveAsync({ compress: 0.8, format: SaveFormat.JPEG });
    return {
      uri:      result.uri,
      name:     input.name.replace(/\.[^.]+$/, '') + '.jpg',
      mimeType: 'image/jpeg',
    };
  } catch {
    return input; // compression failed — upload original
  }
}

async function uploadOne(
  entity: MediaEntity,
  entityId: number,
  raw: UploadInput,
): Promise<void> {
  const input = await compress(raw);

  const fd = new FormData();
  fd.append('entity', entity);
  fd.append('entityId', String(entityId));

  if (Platform.OS === 'web') {
    // Browser FormData requires a real Blob — { uri, name, type } is RN-only
    const blob = await fetch(input.uri).then(r => r.blob());
    fd.append('file', blob, input.name);
  } else {
    fd.append('file', { uri: input.uri, name: input.name, type: input.mimeType } as any);
  }

  // Use XHR (not axios) so React Native's native layer sets the multipart
  // boundary automatically — axios's default Content-Type: application/json
  // header causes express.json() to consume the body before multer reads it.
  const token = await storage.get('auth_token');

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_BASE_URL}/api/media/upload`);
    if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
    xhr.timeout = 60_000;

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) { resolve(); return; }
      try {
        const body = JSON.parse(xhr.responseText);
        reject(new Error(body.error || `Server error ${xhr.status}`));
      } catch {
        reject(new Error(`Server error ${xhr.status}`));
      }
    };
    xhr.onerror   = () => reject(new Error('Network error'));
    xhr.ontimeout = () => reject(new Error('Upload timed out'));
    xhr.send(fd);
  });
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMediaUpload(
  entity: MediaEntity,
  entityId: number,
): UseMediaUploadReturn {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress]   = useState<UploadProgress | null>(null);
  const [error, setError]         = useState<string | null>(null);

  const upload = useCallback(
    async (input: UploadInput | UploadInput[]): Promise<boolean> => {
      const list = Array.isArray(input) ? input : [input];
      if (!list.length) return true;

      setUploading(true);
      setError(null);
      setProgress({ done: 0, total: list.length });

      let allOk = true;
      let lastError = '';

      for (let i = 0; i < list.length; i++) {
        try {
          await uploadOne(entity, entityId, list[i]);
        } catch (e: any) {
          lastError = e?.message ?? 'Upload failed';
          allOk = false;
        }
        setProgress({ done: i + 1, total: list.length });
      }

      if (!allOk) setError(lastError);
      setUploading(false);
      setProgress(null);
      return allOk;
    },
    [entity, entityId],
  );

  const clearError = useCallback(() => setError(null), []);

  return { upload, uploading, progress, error, clearError };
}

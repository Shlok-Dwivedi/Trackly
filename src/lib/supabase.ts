// Supabase configuration — used for photo uploads and avatar uploads to Supabase Storage
// Get them from: Supabase Dashboard → Project Settings → API
//
// IMPORTANT: Storage Bucket Policies
// To fix RLS errors, go to Supabase Dashboard → Storage → Policies and add:
// - event-photos bucket: Allow authenticated users to upload (INSERT)
//   SQL: (auth.role() = 'authenticated')
// - avatars bucket: Same policy for authenticated users

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

const isConfigured = supabaseUrl.startsWith("http");
export const supabase: SupabaseClient | null = isConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const PHOTO_BUCKET = "event-photos";

/** Path for avatar: avatars/{uid}/avatar.jpg (overwrite each time) */
export function avatarPath(uid: string): string {
  return `avatars/${uid}/avatar.jpg`;
}

export interface UploadPhotoResult {
  url: string;
  storagePath: string;
}

/**
 * Upload a file to Supabase Storage and return public URL + storage path.
 * Optional onProgress callback: 0–100 (simulated; Supabase JS has no native progress).
 */
export async function uploadEventPhoto(
  file: File,
  eventId: string,
  userId: string,
  onProgress?: (percent: number) => void
): Promise<UploadPhotoResult> {
  if (!supabase) {
    throw new Error("Photo storage is not configured. Please add Supabase credentials.");
  }
  const ext = file.name.split(".").pop() || "jpg";
  const path = `events/${eventId}/${userId}-${Date.now()}.${ext}`;

  if (onProgress) {
    let tick = 0;
    const interval = setInterval(() => {
      tick += 1;
      if (tick <= 90) onProgress(tick);
    }, 30);
    try {
      const { error } = await supabase.storage
        .from(PHOTO_BUCKET)
        .upload(path, file, { upsert: false, contentType: file.type });
      clearInterval(interval);
      onProgress(100);
      if (error) {
        // Check for RLS (Row Level Security) error
        if (error.message.includes("row-level security") || error.message.includes("RLS")) {
          throw new Error("Photo upload failed — storage permissions issue. Please contact admin.");
        }
        throw new Error(error.message);
      }
    } catch (e) {
      clearInterval(interval);
      onProgress(100);
      throw e;
    }
  } else {
    const { error } = await supabase.storage
      .from(PHOTO_BUCKET)
      .upload(path, file, { upsert: false, contentType: file.type });
    if (error) {
      // Check for RLS (Row Level Security) error
      if (error.message.includes("row-level security") || error.message.includes("RLS")) {
        throw new Error("Photo upload failed — storage permissions issue. Please contact admin.");
      }
      throw new Error(error.message);
    }
  }

  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return { url: data.publicUrl, storagePath: path };
}

/**
 * Upload avatar to avatars/{uid}/avatar.jpg (overwrites).
 */
export async function uploadAvatar(file: File, uid: string): Promise<string> {
  if (!supabase) {
    throw new Error("Storage is not configured. Please add Supabase credentials.");
  }
  const path = avatarPath(uid);
  const { error } = await supabase.storage
    .from(PHOTO_BUCKET)
    .upload(path, file, { upsert: true, contentType: file.type });
  if (error) {
    // Check for RLS (Row Level Security) error
    if (error.message.includes("row-level security") || error.message.includes("RLS")) {
      throw new Error("Photo upload failed — storage permissions issue. Please contact admin.");
    }
    throw new Error(error.message);
  }
  const { data } = supabase.storage.from(PHOTO_BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete a file from Supabase Storage by path (e.g. events/{eventId}/...).
 */
export async function deleteStorageFile(storagePath: string): Promise<void> {
  if (!supabase) {
    throw new Error("Storage is not configured.");
  }
  const { error } = await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
  if (error) throw new Error(error.message);
}

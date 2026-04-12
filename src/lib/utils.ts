import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Convert Firestore timestamp or various date formats to a Date object
 * Handles: Firestore Timestamp, Unix timestamp (ms), Date object, string
 */
export const toDate = (val: any): Date => {
  if (!val) return new Date();
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (val.toDate && typeof val.toDate === 'function') return val.toDate();
  if (val.seconds) return new Date(val.seconds * 1000);
  return new Date(val);
};

/**
 * Convert a timestamp to a Date object (UTC interpretation).
 * Note: Firestore timestamps are stored as UTC.
 * Use formatInIST() for displaying in Indian Standard Time.
 */
export function toIST(ts: number | Date): Date {
  // new Date(timestamp) interprets timestamp as UTC
  // The formatInIST function handles the timezone conversion
  return new Date(ts);
}

/**
 * Get current time in IST timezone as a Date object
 * This is used for comparing timestamps in IST
 */
export function nowInIST(): Date {
  // Just return current local time - JavaScript Date handles it correctly
  // The IST conversion is only needed for display purposes, not comparisons
  return new Date();
}

/**
 * Get the start of today in IST
 */
export function todayInIST(): Date {
  const now = nowInIST();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/**
 * Format date/time in IST timezone
 * @param ts - timestamp in milliseconds (interpreted as UTC)
 * @param options - Intl.DateTimeFormat options
 */
export function formatInIST(ts: number | Date, options?: Intl.DateTimeFormatOptions): string {
  // new Date(ts) interprets ts as UTC, then toLocaleString with timeZone converts to IST
  return new Date(ts).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    ...options
  });
}

/**
 * Format date in IST timezone
 */
export function formatDateInIST(ts: number | Date, formatStr: string = "MMM d, yyyy"): string {
  const date = new Date(ts);
  // Use toLocaleString with timeZone to get IST components
  const d = date.toLocaleString("en-IN", { day: "numeric", timeZone: "Asia/Kolkata" });
  const m = date.toLocaleString("en-IN", { month: "short", timeZone: "Asia/Kolkata" });
  const y = date.toLocaleString("en-IN", { year: "numeric", timeZone: "Asia/Kolkata" });
  const h = date.toLocaleString("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" });
  const min = date.toLocaleString("en-IN", { minute: "2-digit", timeZone: "Asia/Kolkata" });
  const ampm = parseInt(h) >= 12 ? "PM" : "AM";
  const h12 = parseInt(h) % 12 || 12;

  return formatStr
    .replace("yyyy", y)
    .replace("MMM", m)
    .replace("d", d)
    .replace("h:mm a", `${h12}:${min} ${ampm}`)
    .replace("h:mm:ss a", `${h12}:${min}:${date.getSeconds().toString().padStart(2, "0")} ${ampm}`);
}

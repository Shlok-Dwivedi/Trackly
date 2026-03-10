import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase";

export type ActivityAction =
  | "event_created"
  | "event_updated"
  | "event_deleted"
  | "event_cancelled"
  | "event_reactivated"
  | "status_changed"
  | "photo_uploaded"
  | "photo_deleted"
  | "user_role_changed"
  | "role_changed"
  | "user_login"
  | "profile_updated";

export interface ActivityLogDetails {
  previousValue?: unknown;
  newValue?: unknown;
  note?: string;
  oldValue?: unknown;
}

export async function writeActivityLog(
  action: ActivityAction,
  performedBy: string,
  performedByName: string,
  targetType: "event" | "user",
  targetId: string,
  targetTitle: string,
  details?: ActivityLogDetails
): Promise<void> {
  await addDoc(collection(db, "activityLog"), {
    action,
    performedBy,
    performedByName,
    targetType,
    targetId,
    targetTitle,
    details: details || {},
    createdAt: serverTimestamp(),
  });
}

import { useEffect, useState } from "react";
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  updateDoc, 
  doc, 
  arrayUnion, 
  Timestamp 
} from "firebase/firestore";
import { db } from "@/lib/firebase";
import { FirestoreEvent, EventStatus } from "@/types";

/**
 * Safely convert any date value from Firestore to a JS Date.
 * Handles: plain ms number, Firestore Timestamp object, ISO string.
 */
function toDate(value: unknown): Date | null {
  if (!value) return null;
  // Firestore Timestamp object
  if (typeof value === "object" && "seconds" in (value as object)) {
    return new Date((value as { seconds: number }).seconds * 1000);
  }
  // Plain number (ms) or ISO string
  const d = new Date(value as number | string);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Auto-update event status based on event dates.
 * Runs immediately when onSnapshot fires for every event.
 * Skips events with "Cancelled" status.
 */
async function autoUpdateEventStatus(event: FirestoreEvent): Promise<void> {
  const now = new Date();

  if (!event.startDate || !event.endDate) return;
  if (event.status === "Cancelled") return;

  const start = toDate(event.startDate);
  const end = toDate(event.endDate);

  if (!start || !end) {
    console.warn(`Invalid dates for event ${event.id}`, event.startDate, event.endDate);
    return;
  }

  let suggestedStatus: EventStatus;
  if (now < start) {
    suggestedStatus = "Planned";
  } else if (now >= start && now <= end) {
    suggestedStatus = "Ongoing";
  } else {
    suggestedStatus = "Completed";
  }

  if (suggestedStatus !== event.status) {
    try {
      await updateDoc(doc(db, "events", event.id), {
        status: suggestedStatus,
        updatedAt: Timestamp.now(),
        statusHistory: arrayUnion({
          status: suggestedStatus,
          changedBy: "system",
          changedAt: Timestamp.now(),
          note: "Auto-updated based on event dates"
        })
      });
    } catch (err) {
      console.error("Failed to auto-update event status:", err);
    }
  }
}

export function useEvents() {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("startDate", "desc"));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const loadedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreEvent[];

      loadedEvents.forEach((event) => {
        autoUpdateEventStatus(event).catch((err) =>
          console.error("Auto-update failed:", event.id, err)
        );
      });

      setEvents(loadedEvents);
      setLoading(false);
    }, (error) => {
      console.log("Firebase not available:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { events, loading };
}

export default useEvents;

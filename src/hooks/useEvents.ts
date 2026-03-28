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
import { nowInIST } from "@/lib/utils";

/**
 * Auto-update event status based on event dates.
 * Runs immediately when onSnapshot fires for every event.
 * Skips events with "Cancelled" status.
 */
async function autoUpdateEventStatus(event: FirestoreEvent): Promise<void> {
  // Use IST for comparisons
  const now = nowInIST();
  console.log('NOW (IST):', now.toString());
  
  if (!event.startDate || !event.endDate) return;
  if (event.status === "Cancelled") return;

  // Convert timestamps to Date objects for comparison
  const start = new Date(event.startDate);
  const end = new Date(event.endDate);
  console.log('START:', start.toString());
  console.log('END:', end.toString());

  let suggestedStatus: EventStatus;
  if (now < start) {
    suggestedStatus = "Planned";
  } else if (now >= start && now <= end) {
    suggestedStatus = "Ongoing";
  } else {
    suggestedStatus = "Completed";
  }

  console.log(`Checking event: ${event.title} | status: "${event.status}" | suggested: "${suggestedStatus}"`);

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
      // Log all Firestore status values to debug
      snapshot.docs.forEach(doc => {
        const data = doc.data()
        console.log(`[Firestore] id:${doc.id} status:"${data.status}" type:${typeof data.status}`)
      })
      
      const loadedEvents = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as FirestoreEvent[];

      // Run auto-update on EVERY event in the snapshot
      // Wrap in try/catch to prevent crashes from individual event failures
      loadedEvents.forEach((event) => {
        try {
          autoUpdateEventStatus(event).catch((err) =>
            console.error("Auto-update failed:", event.id, err)
          );
        } catch (err) {
          console.error("Auto-update failed:", event.id, err);
        }
      });

      setEvents(loadedEvents);
      setLoading(false);
    }, (error) => {
      // If Firebase fails, still set loading to false
      console.log("Firebase not available:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return { events, loading };
}

export default useEvents;

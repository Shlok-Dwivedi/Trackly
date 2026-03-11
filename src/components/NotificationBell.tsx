import { useState, useEffect } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  orderBy,
  writeBatch,
  doc,
} from "firebase/firestore";
import { Bell } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { Notification } from "@/types";
import NotificationDrawer from "./NotificationDrawer";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;

    const q = query(
      collection(db, "notifications"),
      where("userId", "==", user.uid),
      orderBy("createdAt", "desc")
    );

    const unsub = onSnapshot(q, (snap) => {
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
      setNotifications(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() } as Notification))
          .filter((n) => {
            const ts = n.createdAt;
            if (!ts) return false;
            const ms = typeof ts === "object" && "toMillis" in ts
              ? (ts as { toMillis: () => number }).toMillis()
              : typeof ts === "number" ? (ts < 1e12 ? ts * 1000 : ts) : 0;
            return ms > sevenDaysAgo;
          })
      );
    });

    return unsub;
  }, [user?.uid]);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    if (!user?.uid) return;
    const unread = notifications.filter((n) => !n.read);
    if (unread.length === 0) return;
    const batch = writeBatch(db);
    unread.forEach((n) =>
      batch.update(doc(db, "notifications", n.id), { read: true })
    );
    await batch.commit();
  }

  function handleOpen() {
    setOpen(true);
    markAllRead();
  }

  return (
    <>
      <button
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount ? ` — ${unreadCount} unread` : ""}`}
        className={cn(
          "relative flex h-9 w-9 items-center justify-center rounded-lg transition-colors",
          "text-sidebar-foreground hover:bg-sidebar-accent focus-ring"
        )}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            aria-hidden="true"
            className={cn(
              "absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full",
              "gradient-accent text-[10px] font-bold text-accent-foreground",
              "animate-badge-pulse"
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      <NotificationDrawer
        open={open}
        onClose={() => setOpen(false)}
        notifications={notifications}
      />
    </>
  );
}

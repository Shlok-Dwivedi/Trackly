import { useNavigate } from "react-router-dom";
import { createPortal } from "react-dom";
import { X, Bell, CheckCheck } from "lucide-react";
import { Notification } from "@/types";
import { cn } from "@/lib/utils";

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  notifications: Notification[];
}

function timeAgo(ts: unknown): string {
  // Handle Firestore Timestamp objects
  let ms: number;
  if (ts && typeof ts === "object" && "toMillis" in ts) {
    ms = (ts as { toMillis: () => number }).toMillis();
  } else if (typeof ts === "number") {
    // If it looks like seconds (< year 2100 in seconds), convert to ms
    ms = ts < 1e12 ? ts * 1000 : ts;
  } else {
    return "";
  }
  const diff = Date.now() - ms;
  if (diff < 0) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;
  return `${Math.floor(months / 12)}y ago`;
}

export default function NotificationDrawer({
  open,
  onClose,
  notifications,
}: NotificationDrawerProps) {
  const navigate = useNavigate();

  if (!open) return null;

  function handleNotificationClick(n: Notification) {
    if (n.eventId) {
      navigate(`/events/${n.eventId}`);
      onClose();
    }
  }

  return createPortal(
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[9998] bg-foreground/20 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer */}
      <aside
        role="dialog"
        aria-label="Notifications"
        className={cn(
          "fixed right-0 top-0 z-[9999] flex h-full w-full max-w-sm flex-col bg-card shadow-2xl",
          "animate-slide-in-right"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-4">
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <h2 className="text-base font-semibold text-foreground">
              Notifications
            </h2>
            {notifications.length > 0 && (
              <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                {notifications.length}
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            aria-label="Close notifications"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center px-6">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
                <CheckCheck className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium text-foreground">
                All caught up!
              </p>
              <p className="text-xs text-muted-foreground">
                No notifications yet.
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleNotificationClick(n)}
                    className={cn(
                      "w-full text-left px-4 py-3.5 transition-colors hover:bg-muted/50 active:bg-muted",
                      !n.read && "bg-primary-light/40"
                    )}
                    aria-label={n.title}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={cn(
                          "mt-0.5 h-2 w-2 rounded-full shrink-0",
                          n.read ? "bg-transparent" : "bg-primary"
                        )}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground leading-snug">
                          {n.title}
                        </p>
                        <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">
                          {n.body}
                        </p>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          {timeAgo(n.createdAt)}
                        </p>
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </aside>
    </>,
    document.body
  );
}

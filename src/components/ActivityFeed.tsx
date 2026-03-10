import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection, query, orderBy, limit,
  onSnapshot, where, Query,
} from "firebase/firestore";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, RefreshCw, XCircle, Camera, UserPlus,
  Edit, Trash2, Shield, LogIn, User,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { cn } from "@/lib/utils";
import { ActivityAction } from "@/lib/activityLog";

interface ActivityEntry {
  id: string;
  action: ActivityAction;
  performedBy: string;
  performedByName: string;
  targetType: "event" | "user";
  targetId: string;
  targetTitle: string;
  details?: Record<string, unknown>;
  createdAt: unknown;
}

interface ActivityFeedProps {
  /** If provided, only shows activity for this event */
  eventId?: string;
  /** Max items to show */
  maxItems?: number;
  /** Show compact single-line style (for sidebar) */
  compact?: boolean;
  className?: string;
}

// ── Config per action type ────────────────────────────────────────────────────
const ACTION_CONFIG: Record<ActivityAction, {
  label: string;
  color: string;
  bg: string;
  icon: React.ElementType;
}> = {
  event_created:    { label: "Event created",      color: "#10B981", bg: "rgba(16,185,129,0.15)",  icon: Plus      },
  event_updated:    { label: "Event updated",      color: "#3B82F6", bg: "rgba(59,130,246,0.15)",  icon: Edit      },
  event_deleted:    { label: "Event deleted",      color: "#DC2626", bg: "rgba(220,38,38,0.15)",   icon: Trash2    },
  event_cancelled:  { label: "Event cancelled",    color: "#DC2626", bg: "rgba(220,38,38,0.15)",   icon: XCircle   },
  event_reactivated:{ label: "Event reactivated",  color: "#10B981", bg: "rgba(16,185,129,0.15)",  icon: RefreshCw },
  status_changed:   { label: "Status changed",     color: "#F59E0B", bg: "rgba(245,158,11,0.15)",  icon: RefreshCw },
  photo_uploaded:   { label: "Photo uploaded",     color: "#8B5CF6", bg: "rgba(139,92,246,0.15)",  icon: Camera    },
  photo_deleted:    { label: "Photo deleted",      color: "#DC2626", bg: "rgba(220,38,38,0.15)",   icon: Camera    },
  user_role_changed:{ label: "Role changed",       color: "#06B6D4", bg: "rgba(6,182,212,0.15)",   icon: Shield    },
  role_changed:     { label: "Role changed",       color: "#06B6D4", bg: "rgba(6,182,212,0.15)",   icon: Shield    },
  user_login:       { label: "User logged in",     color: "#6B7280", bg: "rgba(107,114,128,0.15)", icon: LogIn     },
  profile_updated:  { label: "Profile updated",    color: "#3B82F6", bg: "rgba(59,130,246,0.15)",  icon: User      },
};

const DEFAULT_CONFIG = {
  label: "Activity", color: "#6B7280", bg: "rgba(107,114,128,0.15)", icon: Edit,
};

// ── Time helpers ──────────────────────────────────────────────────────────────
function toMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "object" && val !== null && "toMillis" in val) {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === "number") return val < 1e12 ? val * 1000 : val;
  return 0;
}

function timeAgo(val: unknown): string {
  const ms = toMs(val);
  if (!ms) return "";
  const diff = Date.now() - ms;
  if (diff < 60000) return "just now";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

function buildDescription(entry: ActivityEntry): string {
  const name = entry.performedByName || "Someone";
  const title = entry.targetTitle || "an item";
  const d = entry.details || {};

  switch (entry.action) {
    case "event_created":    return `${name} created "${title}"`;
    case "event_updated":    return `${name} updated "${title}"`;
    case "event_deleted":    return `${name} deleted "${title}"`;
    case "event_cancelled":  return `${name} cancelled "${title}"`;
    case "event_reactivated":return `${name} reactivated "${title}"`;
    case "status_changed":   return `${name} changed status of "${title}" to ${String(d.newValue || "")}`;
    case "photo_uploaded":   return `${name} uploaded a photo to "${title}"`;
    case "photo_deleted":    return `${name} deleted a photo from "${title}"`;
    case "user_role_changed":
    case "role_changed":     return `${name}'s role changed to ${String(d.newValue || "")}`;
    case "user_login":       return `${name} logged in`;
    case "profile_updated":  return `${name} updated their profile`;
    default:                 return `${name} performed an action on "${title}"`;
  }
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ActivityFeed({
  eventId,
  maxItems = 8,
  compact = false,
  className,
}: ActivityFeedProps) {
  const [entries, setEntries] = useState<ActivityEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q: Query;

    if (eventId) {
      q = query(
        collection(db, "activityLog"),
        where("targetId", "==", eventId),
        orderBy("createdAt", "desc"),
        limit(maxItems)
      );
    } else {
      q = query(
        collection(db, "activityLog"),
        orderBy("createdAt", "desc"),
        limit(maxItems)
      );
    }

    const unsub = onSnapshot(q, (snap) => {
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() } as ActivityEntry)));
      setLoading(false);
    }, () => setLoading(false));

    return () => unsub();
  }, [eventId, maxItems]);

  if (loading) {
    return (
      <div className={cn("space-y-3", className)}>
        {[...Array(3)].map((_, i) => (
          <div key={i} className="flex gap-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-white/10 shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-white/10 rounded w-3/4" />
              <div className="h-2 bg-white/10 rounded w-1/3" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <div className={cn("text-center py-8", className)}>
        <p className="text-sm text-muted-foreground">No activity yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("relative", className)}>
      {/* Vertical line */}
      {!compact && (
        <div className="absolute left-4 top-4 bottom-4 w-px bg-white/08" />
      )}

      <AnimatePresence initial={false}>
        <div className="space-y-1">
          {entries.map((entry, i) => {
            const config = ACTION_CONFIG[entry.action] ?? DEFAULT_CONFIG;
            const Icon = config.icon;
            const description = buildDescription(entry);
            const time = timeAgo(entry.createdAt);
            const isEvent = entry.targetType === "event" && entry.targetId && entry.action !== "event_deleted";

            return (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -12 }}
                transition={{ duration: 0.25, delay: i * 0.04 }}
                className={cn(
                  "flex gap-3 items-start rounded-xl transition-colors",
                  compact ? "py-2 px-2 hover:bg-white/05" : "py-3 px-2 pl-1 hover:bg-white/03"
                )}
              >
                {/* Icon dot */}
                <div
                  className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ backgroundColor: config.bg }}
                >
                  <Icon className="h-3.5 w-3.5" style={{ color: config.color }} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  {isEvent ? (
                    <Link
                      to={`/events/${entry.targetId}`}
                      className="text-sm text-foreground leading-snug hover:text-violet-400 transition-colors line-clamp-2"
                    >
                      {description}
                    </Link>
                  ) : (
                    <p className="text-sm text-foreground leading-snug line-clamp-2">
                      {description}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-0.5">{time}</p>
                </div>

                {/* Color accent bar */}
                <div
                  className="self-stretch w-0.5 rounded-full shrink-0 opacity-60"
                  style={{ backgroundColor: config.color }}
                />
              </motion.div>
            );
          })}
        </div>
      </AnimatePresence>
    </div>
  );
}

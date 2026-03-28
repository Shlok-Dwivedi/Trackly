import { useEffect, useState, Component, ReactNode } from "react";
import { Link } from "react-router-dom";
import { collection, query, orderBy, getDocs, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { Search, Plus, Filter, X, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FirestoreEvent, EventStatus } from "@/types";
import Layout from "@/components/layout/Layout";
import EventCard from "@/components/EventCard";
import { cn } from "@/lib/utils";

const STATUS_TABS: Array<EventStatus | "All"> = ["All", "Planned", "Ongoing", "Completed"];
const CATEGORIES = [
  "All","Workshop","Seminar","Training","Community Outreach",
  "Fundraiser","Meeting","Field Trip","Cultural","Sports","Other",
];

/** Compute the correct status from dates, ignoring whatever is stored in Firestore */
function computeStatus(event: FirestoreEvent): EventStatus {
  if (event.status === "Cancelled") return "Cancelled";
  const now = Date.now();
  const toMs = (v: unknown): number => {
    if (!v) return 0;
    if (typeof v === "object" && "seconds" in (v as object))
      return (v as { seconds: number }).seconds * 1000;
    return typeof v === "number" ? v : new Date(v as string).getTime();
  };
  const start = toMs(event.startDate);
  const end = toMs(event.endDate);
  if (!start || !end) return event.status as EventStatus ?? "Planned";
  if (now < start) return "Planned";
  if (now >= start && now <= end) return "Ongoing";
  return "Completed";
}

class EventsErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() {
    if (this.state.hasError) return (
      <div className="glass-card p-12 text-center">
        <p className="text-sm text-destructive">Failed to load events.</p>
        <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary hover:underline">Refresh</button>
      </div>
    );
    return this.props.children;
  }
}

export default function EventsList() {
  const { role } = useAuth();
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<EventStatus | "All">("All");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    async function load() {
      setError(null);
      try {
        const snap = await Promise.race([
          getDocs(query(collection(db, "events"), orderBy("startDate", "desc"))),
          new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 4000)),
        ]);

        const allEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEvent));

        // Apply computed status to every event in memory
        const now = Date.now();
        const eventsWithStatus = allEvents.map(e => ({
          ...e,
          status: computeStatus(e),
        }));

        // Batch-write any status that differs from what Firestore has
        const toUpdate = eventsWithStatus.filter((e, i) => e.status !== allEvents[i].status);
        if (toUpdate.length > 0) {
          const batch = writeBatch(db);
          toUpdate.forEach(e => {
            batch.update(doc(db, "events", e.id), { status: e.status, updatedAt: serverTimestamp() });
          });
          batch.commit().catch(() => {});
        }

        setEvents(eventsWithStatus);
      } catch {
        setError("Failed to load events. Please refresh.");
        setEvents([]);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.title.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase()) ||
      e.location?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "All" || e.status === statusFilter;
    const matchCat = categoryFilter === "All" || e.category === categoryFilter;
    return matchSearch && matchStatus && matchCat;
  });

  const hasExtraFilters = categoryFilter !== "All" || search !== "";

  return (
    <Layout title="Events">
      <EventsErrorBoundary>
        <div className="p-4 md:p-6 space-y-4 animate-fade-in">

          {/* Page heading + create button */}
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Events</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Manage and browse all events</p>
            </div>
            {(role === "admin" || role === "staff") && (
              <Link
                to="/events/create"
                className="flex items-center gap-2 px-4 py-2 rounded-xl gradient-primary text-white text-sm font-semibold shadow-lg shadow-violet-500/25 hover:opacity-90 active:scale-[0.98] transition-all"
              >
                <Plus className="h-4 w-4" />
                Create Event
              </Link>
            )}
          </div>

          {/* Search + filter toggle */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="search"
                placeholder="Search events…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full glass rounded-xl border border-white/10 pl-9 pr-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              aria-expanded={showFilters}
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border transition-all",
                showFilters
                  ? "bg-violet-600 text-white border-violet-600 shadow-lg shadow-violet-500/25"
                  : "glass border-white/10 text-muted-foreground hover:text-foreground"
              )}
            >
              <Filter className="h-4 w-4" />
            </button>
          </div>

          {/* Status tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            {STATUS_TABS.map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-all",
                  statusFilter === s
                    ? "bg-violet-600 text-white shadow-lg shadow-violet-500/25"
                    : "glass border border-white/10 text-muted-foreground hover:text-foreground"
                )}
                aria-pressed={statusFilter === s}
              >
                {s}
              </button>
            ))}
          </div>

          {/* Category filters (collapsible) */}
          {showFilters && (
            <div className="glass-card !p-4 space-y-3 animate-fade-in">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Category</p>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((c) => (
                  <button
                    key={c}
                    onClick={() => setCategoryFilter(c)}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-medium transition-all",
                      categoryFilter === c
                        ? "bg-violet-600 text-white"
                        : "glass border border-white/10 text-muted-foreground hover:text-foreground"
                    )}
                    aria-pressed={categoryFilter === c}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active filter summary */}
          {hasExtraFilters && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{filtered.length} result{filtered.length !== 1 ? "s" : ""}</span>
              <button
                onClick={() => { setSearch(""); setCategoryFilter("All"); }}
                className="flex items-center gap-1 text-xs text-violet-400 hover:underline"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            </div>
          )}

          {/* Grid */}
          {loading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : error ? (
            <div className="glass-card p-12 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <button onClick={() => window.location.reload()} className="mt-3 text-sm text-primary hover:underline">Refresh</button>
            </div>
          ) : filtered.length === 0 ? (
            <div className="glass-card p-12 text-center">
              <p className="text-sm font-medium text-foreground">No events found</p>
              <p className="mt-1 text-xs text-muted-foreground">Try adjusting your search or filters.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((e) => (
                <EventCard key={e.id} event={e} />
              ))}
            </div>
          )}
        </div>
      </EventsErrorBoundary>
    </Layout>
  );
}

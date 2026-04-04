import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalendarDays, Users, CheckCircle, TrendingUp, Loader2, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { FirestoreEvent } from "@/types";
import Layout from "@/components/layout/Layout";
import StatusBadge from "@/components/StatusBadge";
import { BarChartComponent, DonutChart } from "@/components/charts/Charts";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

const STATUS_COLORS: Record<string, string> = {
  Planned: "#8B5CF6",
  Ongoing: "#EC4899",
  Completed: "#F59E0B",
};

// Safely convert Firestore Timestamp | number | undefined → milliseconds
function toMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "object" && val !== null && "toMillis" in val) {
    return (val as { toMillis: () => number }).toMillis();
  }
  if (typeof val === "number") {
    return val < 1e12 ? val * 1000 : val; // handle seconds vs ms
  }
  return 0;
}

function buildVolunteerData(events: FirestoreEvent[]) {
  // Map of month → Set of unique user IDs
  const map: Record<number, Set<string>> = {};
  events.forEach((e) => {
    const ms = toMs(e.startDate);
    if (!ms) return;
    const m = new Date(ms).getMonth();
    if (!map[m]) map[m] = new Set();
    // Add assigned users
    (e.assignedTo || []).forEach((uid: string) => map[m].add(uid));
    // Add attendees — Set deduplicates automatically
    (e.attendees || []).forEach((a: { uid: string }) => map[m].add(a.uid));
  });
  // Last 6 months rolling window
  const currentMonth = new Date().getMonth();
  const last6 = Array.from({ length: 6 }, (_, i) => (currentMonth - 5 + i + 12) % 12);
  return last6.map((i) => ({ name: MONTH_LABELS[i], value: map[i]?.size ?? 0 }));
}

export default function Reports() {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [lineDetail, setLineDetail] = useState<{ name: string; value: number } | null>(null);
  const [userNames, setUserNames] = useState<Record<string, string>>({});

  useEffect(() => {
    async function load() {
      try {
        const [eventsSnap, usersSnap] = await Promise.all([
          Promise.race([
            getDocs(query(collection(db, "events"), orderBy("createdAt", "desc"))),
            new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 4000)),
          ]),
          getDocs(collection(db, "users")).catch(() => null),
        ]);
        setEvents(eventsSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEvent)));
        if (usersSnap) {
          const names: Record<string, string> = {};
          usersSnap.docs.forEach((d) => {
            const data = d.data();
            names[d.id] = data.displayName || data.email || d.id.slice(0, 10) + "…";
          });
          setUserNames(names);
        }
      } catch {
        setEvents(demoEvents);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const statusCounts = useMemo(() => ({
    Planned: events.filter((e) => e.status === "Planned").length,
    Ongoing: events.filter((e) => e.status === "Ongoing").length,
    Completed: events.filter((e) => e.status === "Completed").length,
  }), [events]);

  const totalEvents = events.length;
  const totalParticipants = useMemo(() => {
    const seen = new Set<string>();
    events.forEach((e) => {
      (e.assignedTo || []).forEach((id: string) => seen.add(id));
      (e.attendees || []).forEach((a: { uid: string }) => seen.add(a.uid));
    });
    return seen.size;
  }, [events]);
  const completionRate = totalEvents > 0
    ? Math.round((statusCounts.Completed / totalEvents) * 100) : 0;

  const monthlyData = useMemo(() => {
    const map: Record<number, number> = {};
    events.forEach((e) => {
      const ms = toMs(e.createdAt) || toMs(e.startDate);
      if (!ms) return;
      const m = new Date(ms).getMonth();
      map[m] = (map[m] ?? 0) + 1;
    });
    return MONTH_LABELS.map((name, i) => ({ name, value: map[i] ?? 0 }));
  }, [events]);

  const growthRate = useMemo(() => {
    const nonZero = monthlyData.filter((d) => d.value > 0);
    if (nonZero.length < 2) return 0;
    const cur = nonZero[nonZero.length - 1].value;
    const prev = nonZero[nonZero.length - 2].value;
    return prev === 0 ? 0 : Math.round(((cur - prev) / prev) * 100);
  }, [monthlyData]);

  const statusData = useMemo(() =>
    Object.entries(statusCounts).map(([name, value]) => ({
      name, value, color: STATUS_COLORS[name],
    })), [statusCounts]
  );

  const catMap: Record<string, number> = {};
  events.forEach((e) => { if (e.category) catMap[e.category] = (catMap[e.category] ?? 0) + 1; });
  const catData = Object.entries(catMap).map(([name, value]) => ({ name, value }));

  const staffMap: Record<string, { created: number; completed: number }> = {};
  events.forEach((e) => {
    if (!e.createdBy) return;
    if (!staffMap[e.createdBy]) staffMap[e.createdBy] = { created: 0, completed: 0 };
    staffMap[e.createdBy].created++;
    if (e.status === "Completed") staffMap[e.createdBy].completed++;
  });
  const staffData = Object.entries(staffMap).map(([uid, s]) => ({
    name: userNames[uid] || uid.slice(0, 12) + "…",
    ...s,
  }));

  const volunteerData = useMemo(() => buildVolunteerData(events), [events]);

  const statCards = [
    { icon: CalendarDays, label: "Total Events", value: totalEvents, color: "#8B5CF6" },
    { icon: Users, label: "Total Participants", value: totalParticipants, color: "#EC4899" },
    { icon: CheckCircle, label: "Completion Rate", value: `${completionRate}%`, color: "#10B981" },
    { icon: TrendingUp, label: "Growth Rate", value: `${growthRate >= 0 ? "+" : ""}${growthRate}%`, color: "#F59E0B" },
  ];

  if (loading) {
    return (
      <Layout title="Reports">
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Reports">
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analytics and insights for your events</p>
        </div>

        {/* 4 Summary stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value, color }) => (
            <div key={label} className="glass-card text-center">
              <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${color}20` }}>
                <Icon className="h-5 w-5" style={{ color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{value}</p>
              <p className="text-xs text-muted-foreground mt-1">{label}</p>
            </div>
          ))}
        </div>

        {/* Donut + Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DonutChart title="Events by Status" data={statusData} />
          <BarChartComponent title="Events per Month" data={monthlyData} />
        </div>

        {/* Volunteer Participation line chart */}
        <div className="glass-card p-4 sm:p-6 relative">
          <h3 className="font-semibold mb-4 text-foreground">Volunteer Participation</h3>
          <div className="h-64 relative">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={volunteerData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "rgba(15,12,41,0.92)", border: "1px solid rgba(139,92,246,0.25)", borderRadius: "12px" }} />
                <Line type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2.5}
                  dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4, cursor: "pointer" }}
                  activeDot={{ r: 6, cursor: "pointer",
                    onClick: ((_: unknown, p: unknown) => {
                      const pay = (p as { payload?: { name: string; value: number } })?.payload;
                      if (pay) setLineDetail(pay);
                    }) as never,
                  }}
                />
              </LineChart>
            </ResponsiveContainer>
            <AnimatePresence>
              {lineDetail && (
                <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.85 }} transition={{ duration: 0.2 }}
                  className="absolute inset-0 flex items-center justify-center z-20">
                  <div className="glass-card p-5 rounded-xl relative text-center min-w-[170px] shadow-2xl border border-violet-500/20">
                    <button onClick={() => setLineDetail(null)} className="absolute top-2 right-2 p-1 rounded-full hover:bg-white/10 transition-colors">
                      <X className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <p className="text-sm text-muted-foreground">{lineDetail.name}</p>
                    <p className="text-3xl font-bold text-foreground mt-1">{lineDetail.value}</p>
                    <p className="text-xs text-muted-foreground mt-1">{lineDetail.value} volunteers in {lineDetail.name}</p>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {catData.length > 0 && <DonutChart title="Events by Category" data={catData} />}

        {/* Staff table */}
        {staffData.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Staff Activity</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/08">
                    {["Name", "Created", "Completed"].map((h) => (
                      <th key={h} className="py-2 px-2 text-left text-xs font-medium text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {staffData.map((row) => (
                    <tr key={row.name} className="border-b border-white/05 last:border-0">
                      <td className="py-2.5 px-2 text-sm text-foreground font-medium">{row.name}</td>
                      <td className="py-2.5 px-2 font-semibold text-foreground">{row.created}</td>
                      <td className="py-2.5 px-2 font-semibold text-emerald-400">{row.completed}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All events table */}
        <div className="glass-card p-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">All Events ({events.length})</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/08">
                  {["Title", "Category", "Status", "Start Date"].map((h) => (
                    <th key={h} className="py-2 px-2 text-left text-xs font-medium text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {events.map((e) => (
                  <tr key={e.id} className="border-b border-white/05 last:border-0">
                    <td className="py-2.5 px-2 font-medium text-foreground max-w-[160px] truncate">{e.title}</td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground">{e.category || "—"}</td>
                    <td className="py-2.5 px-2"><StatusBadge status={e.status} size="sm" /></td>
                    <td className="py-2.5 px-2 text-xs text-muted-foreground whitespace-nowrap">
                      {toMs(e.startDate) ? new Date(toMs(e.startDate)).toLocaleDateString() : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
}

const demoEvents: FirestoreEvent[] = [
  { id: "d1", title: "Literacy Workshop", description: "", location: "Nagpur", startDate: Date.now() - 5*86400000, endDate: Date.now() - 4*86400000, status: "Completed", createdBy: "staff1", assignedTo: ["a","b","c"], photos: [], category: "Workshop", tags: [], createdAt: Date.now() - 10*86400000, updatedAt: Date.now() },
  { id: "d2", title: "Teacher Training", description: "", location: "Online", startDate: Date.now() + 86400000, endDate: Date.now() + 2*86400000, status: "Planned", createdBy: "staff1", assignedTo: [], photos: [], category: "Seminar", tags: [], createdAt: Date.now() - 3*86400000, updatedAt: Date.now() },
  { id: "d3", title: "Supply Drive", description: "", location: "Mumbai", startDate: Date.now() - 86400000, endDate: Date.now() + 86400000, status: "Ongoing", createdBy: "staff2", assignedTo: ["x","y"], photos: [], category: "Community Outreach", tags: [], createdAt: Date.now() - 7*86400000, updatedAt: Date.now() },
  { id: "d4", title: "Annual Gala", description: "", location: "Pune", startDate: Date.now() - 20*86400000, endDate: Date.now() - 19*86400000, status: "Completed", createdBy: "staff2", assignedTo: ["a","b","c","d","e"], photos: [], category: "Fundraiser", tags: [], createdAt: Date.now() - 30*86400000, updatedAt: Date.now() },
];

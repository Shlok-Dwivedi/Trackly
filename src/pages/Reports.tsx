import { useEffect, useState, useMemo } from "react";
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend,
} from "recharts";
import { CalendarDays, Users, CheckCircle, TrendingUp, Loader2, X, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db } from "@/lib/firebase";
import { FirestoreEvent } from "@/types";
import Layout from "@/components/layout/Layout";
import StatusBadge from "@/components/StatusBadge";
import { BarChartComponent, DonutChart } from "@/components/charts/Charts";
import { cn } from "@/lib/utils";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const STATUS_COLORS: Record<string, string> = { Planned: "#8B5CF6", Ongoing: "#EC4899", Completed: "#10B981" };

function toMs(val: unknown): number {
  if (!val) return 0;
  if (typeof val === "object" && val !== null && "toMillis" in val)
    return (val as { toMillis: () => number }).toMillis();
  if (typeof val === "object" && val !== null && "seconds" in val)
    return (val as { seconds: number }).seconds * 1000;
  if (typeof val === "number") return val < 1e12 ? val * 1000 : val;
  if (typeof val === "string") { const d = Date.parse(val); return isNaN(d) ? 0 : d; }
  return 0;
}

function buildVolunteerData(events: FirestoreEvent[]) {
  const map: Record<number, Set<string>> = {};
  events.forEach((e) => {
    const ms = toMs(e.startDate);
    if (!ms) return;
    const m = new Date(ms).getMonth();
    if (!map[m]) map[m] = new Set();
    (e.assignedTo || []).forEach((uid: string) => map[m].add(uid));
    (e.attendees || []).forEach((a: { uid: string }) => map[m].add(a.uid));
  });
  const currentMonth = new Date().getMonth();
  const last6 = Array.from({ length: 6 }, (_, i) => (currentMonth - 5 + i + 12) % 12);
  return last6.map((i) => ({ name: MONTH_LABELS[i], value: map[i]?.size ?? 0 }));
}

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number; name?: string; color?: string }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const isRate = label === "Attendance Rate %";
  return (
    <div className="glass-card !p-3 !rounded-xl border border-violet-500/20 text-sm space-y-1">
      <p className="text-muted-foreground text-xs mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="font-bold" style={{ color: p.color }}>
          {p.name ? `${p.name}: ` : ""}{p.value}{isRate ? "%" : ""}
        </p>
      ))}
    </div>
  );
}

type CompareMode = "month" | "year" | "event";

export default function Reports() {
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [userNames, setUserNames] = useState<Record<string, string>>({});
  const [selectedEvent, setSelectedEvent] = useState<FirestoreEvent | null>(null);
  const [compareMode, setCompareMode] = useState<CompareMode>("month");
  // Month comparison selectors
  const [compareMonthA, setCompareMonthA] = useState(new Date().getMonth());
  const [compareMonthB, setCompareMonthB] = useState((new Date().getMonth() - 1 + 12) % 12);
  const [compareYearA, setCompareYearA] = useState(new Date().getFullYear());
  const [compareYearB, setCompareYearB] = useState(new Date().getMonth() === 0 ? new Date().getFullYear() - 1 : new Date().getFullYear());
  // Event comparison selectors
  const [compareEventA, setCompareEventA] = useState<string>("");
  const [compareEventB, setCompareEventB] = useState<string>("");

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
      } catch { setEvents(demoEvents); }
      finally { setLoading(false); }
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

  const completionRate = totalEvents > 0 ? Math.round((statusCounts.Completed / totalEvents) * 100) : 0;

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
    Object.entries(statusCounts).map(([name, value]) => ({ name, value, color: STATUS_COLORS[name] })),
    [statusCounts]
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
  const staffData = Object.entries(staffMap).map(([uid, s]) => ({ name: userNames[uid] || uid.slice(0, 12) + "…", ...s }));

  const volunteerData = useMemo(() => buildVolunteerData(events), [events]);

  // Comparison data
  const monthCompareData = useMemo(() => {
    const thisYear = new Date().getFullYear();
    const map: Record<number, { thisYear: number; lastYear: number }> = {};
    events.forEach((e) => {
      const ms = toMs(e.startDate);
      if (!ms) return;
      const d = new Date(ms);
      const m = d.getMonth();
      const y = d.getFullYear();
      if (!map[m]) map[m] = { thisYear: 0, lastYear: 0 };
      if (y === thisYear) map[m].thisYear++;
      else if (y === thisYear - 1) map[m].lastYear++;
    });
    return MONTH_LABELS.map((name, i) => ({ name, thisYear: map[i]?.thisYear ?? 0, lastYear: map[i]?.lastYear ?? 0 }));
  }, [events]);

  const yearCompareData = useMemo(() => {
    const map: Record<number, number> = {};
    events.forEach((e) => {
      const ms = toMs(e.startDate);
      if (!ms) return;
      const y = new Date(ms).getFullYear();
      map[y] = (map[y] ?? 0) + 1;
    });
    return Object.entries(map).sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, count]) => ({ name: year, value: count }));
  }, [events]);

  const top5Events = useMemo(() =>
    [...events]
      .sort((a, b) => ((b.attendees?.length ?? 0) + (b.assignedTo?.length ?? 0)) - ((a.attendees?.length ?? 0) + (a.assignedTo?.length ?? 0)))
      .slice(0, 5)
      .map((e) => ({ name: e.title.slice(0, 20), participants: new Set([...(e.assignedTo || []), ...(e.attendees || []).map((a: {uid:string}) => a.uid)]).size })),
    [events]
  );

  const statCards = [
    { icon: CalendarDays, label: "Total Events",      value: totalEvents,          color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
    { icon: Users,        label: "Total Participants", value: totalParticipants,    color: "#EC4899", bg: "rgba(236,72,153,0.12)" },
    { icon: CheckCircle,  label: "Completion Rate",   value: `${completionRate}%`, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
    { icon: TrendingUp,   label: "Growth Rate",       value: `${growthRate >= 0 ? "+" : ""}${growthRate}%`, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
  ];

  if (loading) return (
    <Layout title="Reports">
      <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </Layout>
  );

  return (
    <Layout title="Reports">
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Reports</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Analytics and insights for your events</p>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map(({ icon: Icon, label, value, color, bg }, i) => (
            <motion.div key={label} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }} className="glass-card flex items-center gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl" style={{ backgroundColor: bg }}>
                <Icon className="h-6 w-6" style={{ color }} />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Donut + Bar */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <DonutChart title="Events by Status" data={statusData} />
          <BarChartComponent title="Events per Month" data={monthlyData} />
        </div>

        {/* Volunteer Participation */}
        <div className="glass-card p-4 sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="font-semibold text-foreground">Volunteer Participation</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Unique participants per month</p>
            </div>
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-violet-500/10 px-3 py-1.5 rounded-full">
              <span className="w-2 h-2 rounded-full bg-violet-500" /> Volunteers
            </div>
          </div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={volunteerData}>
                <defs>
                  <linearGradient id="volGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                <Area type="monotone" dataKey="value" stroke="#8B5CF6" strokeWidth={2.5} fill="url(#volGrad)"
                  dot={{ fill: "#8B5CF6", strokeWidth: 2, r: 4 }} activeDot={{ r: 6, fill: "#8B5CF6" }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Comparison Charts */}
        <div className="glass-card p-4 sm:p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <h3 className="font-semibold text-foreground">Comparison</h3>
            <div className="flex gap-1 glass rounded-xl p-1">
              {(["month", "year", "event"] as CompareMode[]).map((m) => (
                <button key={m} onClick={() => setCompareMode(m)}
                  className={cn("px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                    compareMode === m ? "bg-violet-600 text-white" : "text-muted-foreground hover:text-foreground")}>
                  {m === "month" ? "Month vs Month" : m === "year" ? "Year vs Year" : "Event vs Event"}
                </button>
              ))}
            </div>
          </div>

          {/* Selectors */}
          {compareMode === "month" && (
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-1 h-4 rounded-full bg-violet-500 inline-block" />
                <select value={compareMonthA} onChange={(e) => setCompareMonthA(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none">
                  {MONTH_LABELS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={compareYearA} onChange={(e) => setCompareYearA(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none">
                  {Array.from(new Set(events.map((e) => toMs(e.startDate) ? new Date(toMs(e.startDate)).getFullYear() : 0).filter(Boolean))).sort((a,b)=>b-a).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <span className="text-xs text-muted-foreground">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-1 h-4 rounded-full bg-pink-500 inline-block" />
                <select value={compareMonthB} onChange={(e) => setCompareMonthB(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none">
                  {MONTH_LABELS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                </select>
                <select value={compareYearB} onChange={(e) => setCompareYearB(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none">
                  {Array.from(new Set(events.map((e) => toMs(e.startDate) ? new Date(toMs(e.startDate)).getFullYear() : 0).filter(Boolean))).sort((a,b)=>b-a).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {compareMode === "year" && (
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-1 h-4 rounded-full bg-emerald-500 inline-block" />
                <select value={compareYearA} onChange={(e) => setCompareYearA(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none">
                  {Array.from(new Set(events.map((e) => toMs(e.startDate) ? new Date(toMs(e.startDate)).getFullYear() : 0).filter(Boolean))).sort((a,b)=>b-a).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
              <span className="text-xs text-muted-foreground">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-1 h-4 rounded-full bg-amber-500 inline-block" />
                <select value={compareYearB} onChange={(e) => setCompareYearB(Number(e.target.value))}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none">
                  {Array.from(new Set(events.map((e) => toMs(e.startDate) ? new Date(toMs(e.startDate)).getFullYear() : 0).filter(Boolean))).sort((a,b)=>b-a).map((y) => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>
          )}

          {compareMode === "event" && (
            <div className="flex flex-wrap gap-3 items-center">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-1 h-4 rounded-full bg-violet-500 inline-block" />
                <select value={compareEventA} onChange={(e) => setCompareEventA(e.target.value)}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none max-w-[180px]">
                  <option value="">Select event A</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.title.slice(0,30)}</option>)}
                </select>
              </div>
              <span className="text-xs text-muted-foreground">vs</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground w-1 h-4 rounded-full bg-pink-500 inline-block" />
                <select value={compareEventB} onChange={(e) => setCompareEventB(e.target.value)}
                  className="rounded-lg border border-white/10 bg-background text-xs text-foreground px-2 py-1 focus:outline-none max-w-[180px]">
                  <option value="">Select event B</option>
                  {events.map((e) => <option key={e.id} value={e.id}>{e.title.slice(0,30)}</option>)}
                </select>
              </div>
            </div>
          )}

          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              {(() => {
                // Shared metric builder — same 4 metrics for all 3 modes
                const metrics = (evList: FirestoreEvent[], label: string, color: string) => {
                  // Count unique participants: assignedTo UIDs + attendee UIDs (deduped)
                  const allUids = new Set([
                    ...evList.flatMap((e) => e.assignedTo || []),
                    ...evList.flatMap((e) => (e.attendees || []).map((a: {uid:string}) => a.uid)),
                  ]);
                  const participants = allUids.size;
                  // Attendance rate: per-event avg of (actual / capacity) for events that have capacity set
                  const cappedEvents = evList.filter((e) => e.capacity && e.capacity > 0);
                  const attendanceRate = cappedEvents.length > 0
                    ? Math.round(
                        cappedEvents.reduce((acc, e) => {
                          const actual = new Set([
                            ...(e.assignedTo || []),
                            ...(e.attendees || []).map((a: {uid:string}) => a.uid),
                          ]).size;
                          return acc + Math.min(100, Math.round((actual / e.capacity!) * 100));
                        }, 0) / cappedEvents.length
                      )
                    : 0;
                  const durationHrs = evList.length === 1
                    ? Math.round((toMs(evList[0].endDate) - toMs(evList[0].startDate)) / 3600000)
                    : 0;
                  return {
                    label, color,
                    "Events": evList.length,
                    "Participants": participants,
                    "Attendance Rate %": attendanceRate,
                    "Duration (hrs)": durationHrs,
                  };
                };

                let mA: ReturnType<typeof metrics>;
                let mB: ReturnType<typeof metrics>;

                if (compareMode === "month") {
                  const filterM = (m: number, y: number) => events.filter((e) => { const ms = toMs(e.startDate); if (!ms) return false; const d = new Date(ms); return d.getMonth() === m && d.getFullYear() === y; });
                  mA = metrics(filterM(compareMonthA, compareYearA), `${MONTH_LABELS[compareMonthA]} ${compareYearA}`, "#8B5CF6");
                  mB = metrics(filterM(compareMonthB, compareYearB), `${MONTH_LABELS[compareMonthB]} ${compareYearB}`, "#EC4899");
                } else if (compareMode === "year") {
                  const filterY = (y: number) => events.filter((e) => { const ms = toMs(e.startDate); return ms && new Date(ms).getFullYear() === y; });
                  mA = metrics(filterY(compareYearA), String(compareYearA), "#10B981");
                  mB = metrics(filterY(compareYearB), String(compareYearB), "#F59E0B");
                } else {
                  const eA = events.find((e) => e.id === compareEventA);
                  const eB = events.find((e) => e.id === compareEventB);
                  mA = metrics(eA ? [eA] : [], eA?.title?.slice(0, 18) || "Event A", "#8B5CF6");
                  mB = metrics(eB ? [eB] : [], eB?.title?.slice(0, 18) || "Event B", "#EC4899");
                }

                const METRIC_KEYS = (compareMode === "event"
                  ? ["Participants", "Attendance Rate %", "Duration (hrs)"]
                  : ["Events", "Participants", "Attendance Rate %"]) as readonly string[];
                const data = METRIC_KEYS.map((k) => ({
                  metric: k,
                  [mA.label]: mA[k],
                  [mB.label]: mB[k],
                }));

                return (
                  <BarChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                    <XAxis dataKey="metric" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }} axisLine={false} tickLine={false} />
                    <YAxis
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                      axisLine={false} tickLine={false} allowDecimals={false}
                      domain={METRIC_KEYS.includes("Attendance Rate %") ? [0, 100] : [0, "auto"]}
                      tickFormatter={(v) => METRIC_KEYS.length === 1 && METRIC_KEYS[0] === "Attendance Rate %" ? `${v}%` : String(v)}
                    />
                    <Tooltip content={<CustomTooltip />} wrapperStyle={{ background: "transparent", border: "none", boxShadow: "none" }} cursor={{ fill: "rgba(255,255,255,0.04)" }} />
                    <Legend wrapperStyle={{ fontSize: "11px", color: "hsl(var(--muted-foreground))" }} />
                    <Bar dataKey={mA.label} fill={mA.color} radius={[4,4,0,0]} />
                    <Bar dataKey={mB.label} fill={mB.color} radius={[4,4,0,0]} />
                  </BarChart>
                );
              })()}
            </ResponsiveContainer>
          </div>
        </div>

        {catData.length > 0 && <DonutChart title="Events by Category" data={catData} />}

        {/* Staff table */}
        {staffData.length > 0 && (
          <div className="glass-card p-4">
            <h2 className="mb-4 text-sm font-semibold text-foreground">Staff Activity</h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/08">
                  {["Name", "Created", "Completed"].map((h) => (
                    <th key={h} className="pb-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/05">
                {staffData.map((row) => (
                  <tr key={row.name} className="hover:bg-white/02 transition-colors">
                    <td className="py-3 px-2 text-sm text-foreground font-medium">{row.name}</td>
                    <td className="py-3 px-2"><span className="inline-flex items-center rounded-full bg-violet-500/10 text-violet-400 px-2.5 py-0.5 text-xs font-semibold">{row.created}</span></td>
                    <td className="py-3 px-2"><span className="inline-flex items-center rounded-full bg-emerald-500/10 text-emerald-400 px-2.5 py-0.5 text-xs font-semibold">{row.completed}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* All events table — click for summary */}
        <div className="glass-card p-4">
          <h2 className="mb-4 text-sm font-semibold text-foreground">All Events <span className="text-muted-foreground font-normal">({events.length})</span></h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/08">
                {["Title", "Category", "Status", "Start Date", ""].map((h, i) => (
                  <th key={i} className="pb-3 px-2 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/05">
              {events.map((e) => (
                <tr key={e.id} className="hover:bg-white/02 transition-colors cursor-pointer" onClick={() => setSelectedEvent(e)}>
                  <td className="py-3 px-2 font-medium text-foreground max-w-[160px] truncate">{e.title}</td>
                  <td className="py-3 px-2">
                    {e.category ? <span className="text-xs rounded-full bg-white/08 px-2.5 py-0.5 text-muted-foreground">{e.category}</span> : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="py-3 px-2"><StatusBadge status={e.status} size="sm" /></td>
                  <td className="py-3 px-2 text-xs text-muted-foreground whitespace-nowrap">
                    {toMs(e.startDate) ? new Date(toMs(e.startDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"}
                  </td>
                  <td className="py-3 px-2"><ChevronRight className="h-4 w-4 text-muted-foreground" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Event Summary Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={() => setSelectedEvent(null)}>
            <motion.div initial={{ opacity: 0, scale: 0.92, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.92, y: 20 }} transition={{ duration: 0.2 }}
              className="glass-card w-full max-w-lg max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}>
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">{selectedEvent.title}</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{selectedEvent.category || "No category"}</p>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
                  <X className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2 mb-4">
                <StatusBadge status={selectedEvent.status} size="sm" />
              </div>

              {/* Key metrics */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                {[
                  { label: "Assigned", value: selectedEvent.assignedTo?.length ?? 0, color: "#8B5CF6" },
                  { label: "Attendees", value: selectedEvent.attendees?.length ?? 0, color: "#10B981" },
                  { label: "Photos", value: selectedEvent.photos?.length ?? 0, color: "#F59E0B" },
                ].map((m) => (
                  <div key={m.label} className="glass rounded-xl p-3 text-center">
                    <p className="text-xl font-bold" style={{ color: m.color }}>{m.value}</p>
                    <p className="text-xs text-muted-foreground">{m.label}</p>
                  </div>
                ))}
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                <div className="glass rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">Start</p>
                  <p className="text-foreground font-medium">
                    {toMs(selectedEvent.startDate) ? new Date(toMs(selectedEvent.startDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
                <div className="glass rounded-xl p-3">
                  <p className="text-xs text-muted-foreground mb-1">End</p>
                  <p className="text-foreground font-medium">
                    {toMs(selectedEvent.endDate) ? new Date(toMs(selectedEvent.endDate)).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"}
                  </p>
                </div>
              </div>

              {/* Description */}
              {selectedEvent.description && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-1 font-medium">Description</p>
                  <p className="text-sm text-foreground">{selectedEvent.description}</p>
                </div>
              )}

              {/* Attendees */}
              {selectedEvent.attendees && selectedEvent.attendees.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs text-muted-foreground mb-2 font-medium">Attendees</p>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto">
                    {selectedEvent.attendees.map((a) => (
                      <div key={a.uid} className="flex items-center gap-2 py-1 px-2 rounded-lg bg-white/03 text-sm">
                        <span className="text-foreground flex-1">{a.displayName}</span>
                        <span className="text-xs text-muted-foreground capitalize">{a.joinType}</span>
                        {a.committeeName && <span className="text-xs text-violet-400">{a.committeeName}</span>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              {selectedEvent.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {selectedEvent.tags.map((t) => (
                    <span key={t} className="text-xs rounded-full bg-white/08 border border-white/10 px-2.5 py-0.5 text-muted-foreground">#{t}</span>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </Layout>
  );
}

const demoEvents: FirestoreEvent[] = [
  { id: "d1", title: "Literacy Workshop", description: "", location: "Nagpur", startDate: Date.now() - 5*86400000, endDate: Date.now() - 4*86400000, status: "Completed", createdBy: "staff1", assignedTo: ["a","b","c"], photos: [], category: "Workshop", tags: [], createdAt: Date.now() - 10*86400000, updatedAt: Date.now() },
  { id: "d2", title: "Teacher Training", description: "", location: "Online", startDate: Date.now() + 86400000, endDate: Date.now() + 2*86400000, status: "Planned", createdBy: "staff1", assignedTo: [], photos: [], category: "Seminar", tags: [], createdAt: Date.now() - 3*86400000, updatedAt: Date.now() },
  { id: "d3", title: "Supply Drive", description: "", location: "Mumbai", startDate: Date.now() - 86400000, endDate: Date.now() + 86400000, status: "Ongoing", createdBy: "staff2", assignedTo: ["x","y"], photos: [], category: "Community Outreach", tags: [], createdAt: Date.now() - 7*86400000, updatedAt: Date.now() },
];

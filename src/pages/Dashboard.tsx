import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  collection, query, orderBy, limit, onSnapshot, where,
} from "firebase/firestore";
import {
  AreaChart, Area, ResponsiveContainer,
} from "recharts";
import {
  Calendar, CheckCircle, Clock, Loader2, Plus,
  MapPin, Sparkles, CalendarDays, Users,
} from "lucide-react";
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameDay, isToday as isTodayFn,
} from "date-fns";
import { motion } from "framer-motion";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FirestoreEvent } from "@/types";
import Layout from "@/components/layout/Layout";
import StatusBadge from "@/components/StatusBadge";
import GoogleCalendarCard from "@/components/GoogleCalendarCard";
import { cn } from "@/lib/utils";
import { STATUS_COLORS, getCategoryColor } from "@/lib/constants";
import ActivityFeed from "@/components/ActivityFeed";
import { DonutChart, BarChartComponent } from "@/components/charts/Charts";
import { toIST, formatInIST, nowInIST, todayInIST } from "@/lib/utils";

const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

// ── Helpers ────────────────────────────────────────────────────────────────────
const normalizeStatus = (s?: string) =>
  s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : "Unknown";

function getBadgeInfo(events: { status: string }[]) {
  const allCompleted = events.every(e => normalizeStatus(e.status) === "Completed");
  const hasOngoing   = events.some(e => normalizeStatus(e.status) === "Ongoing");
  if (allCompleted) return { color: "#22c55e", showCheck: true,  count: events.length };
  if (hasOngoing)   return { color: "#f59e0b", showCheck: false, count: events.length };
  return               { color: "#8B5CF6",  showCheck: false, count: events.length };
}

// ── Animated counter ───────────────────────────────────────────────────────────
function useAnimatedCounter(endValue: number, duration = 1500) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let startTime: number;
    let raf: number;
    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const t = Math.min((now - startTime) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4);
      setCount(Math.floor(eased * endValue));
      if (t < 1) raf = requestAnimationFrame(animate);
    };
    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
  }, [endValue, duration]);
  return count;
}

// ── Mini sparkline ─────────────────────────────────────────────────────────────
function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const id = `spark-${color.replace("#", "")}`;
  return (
    <div className="h-10 w-full mt-2">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data.map((v, i) => ({ v, i }))}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%"   stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={2}
            fill={`url(#${id})`} dot={false} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, gradient,
  sparklineData, sparklineColor }: {
  label: string; value: number; icon: React.ElementType;
  gradient: string;
  sparklineData?: number[]; sparklineColor?: string;
}) {
  const animated = useAnimatedCounter(value);
  return (
    <div className="glass-card !p-4 !rounded-2xl hover:-translate-y-1 transition-transform duration-200">
      <div className="flex items-start justify-between">
        <div className={cn("p-2.5 rounded-xl bg-gradient-to-br shadow-lg", gradient)}>
          <Icon className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
      </div>
      <div className="mt-3">
        <p className="text-2xl sm:text-3xl font-bold text-foreground">{animated.toLocaleString()}</p>
        <p className="text-xs text-muted-foreground mt-1 font-medium">{label}</p>
      </div>
      {sparklineData && sparklineColor && <MiniSparkline data={sparklineData} color={sparklineColor} />}
    </div>
  );
}

// ── Mini calendar ──────────────────────────────────────────────────────────────
function MiniCalendarWidget({ events, onDateClick }: {
  events: FirestoreEvent[]; onDateClick: (d: Date) => void;
}) {
  const [month, setMonth] = useState(new Date());
  const days = useMemo(() =>
    eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }), [month]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, { status: string }[]> = {};
    events.forEach(e => {
      const key = format(toIST(e.startDate), "yyyy-MM-dd");
      if (!map[key]) map[key] = [];
      map[key].push({ status: e.status });
    });
    return map;
  }, [events]);

  return (
    <div className="glass-card !rounded-2xl w-full h-full">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h3 className="text-sm font-semibold text-foreground">{format(month, "MMMM yyyy")}</h3>
        <button onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
          className="p-1.5 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["S","M","T","W","T","F","S"].map((d, i) => (
          <div key={i} className="text-center text-[11px] font-medium text-violet-500">{d}</div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: days[0]?.getDay() || 0 }).map((_, i) => <div key={`e-${i}`} className="h-10" />)}
        {days.map(day => {
          const key = format(day, "yyyy-MM-dd");
          const dayEvents = eventsByDate[key] || [];
          const badge = getBadgeInfo(dayEvents);
          const isToday = isTodayFn(day);
          return (
            <button key={key} onClick={() => onDateClick(day)}
              className={cn("h-10 relative flex items-center justify-center rounded-lg transition-all duration-150",
                isToday ? "bg-violet-600 text-white" : "hover:bg-muted/70")}>
              <span className={cn("text-xs font-medium", isToday ? "text-white" : "text-foreground")}>
                {format(day, "d")}
              </span>
              {dayEvents.length > 0 && (
                <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center rounded-full text-[10px] font-bold text-white z-10"
                  style={{ width: "18px", height: "18px", backgroundColor: badge.color }}>
                  {badge.showCheck ? "✓" : (badge.count > 9 ? "9+" : badge.count)}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div className="mt-3 pt-2 border-t border-border/50 text-center">
        <Link to="/calendar" className="text-xs text-violet-500 hover:underline font-medium">View full calendar</Link>
      </div>
    </div>
  );
}

// ── Circular progress ──────────────────────────────────────────────────────────
function CircularProgress({ percentage, label, sublabel, color }: {
  percentage: number; label: string; sublabel: string; color: string;
}) {
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;
  return (
    <div className="flex flex-col items-center">
      <div className="relative w-24 h-24">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r={radius} fill="none" stroke="var(--border)" strokeWidth="6" />
          <motion.circle
            cx="50" cy="50" r={radius} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
            strokeDasharray={circumference}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-bold text-foreground">{percentage}%</span>
        </div>
      </div>
      <p className="text-xs font-medium text-foreground mt-2 text-center">{label}</p>
      <p className="text-[10px] text-muted-foreground text-center">{sublabel}</p>
    </div>
  );
}

// ── Upcoming event card ────────────────────────────────────────────────────────
function UpcomingEventCard({ event }: { event: FirestoreEvent }) {
  return (
    <Link to={`/events/${event.id}`}
      className="block p-3 rounded-xl border border-border/50 bg-background/40 hover:bg-muted/30 transition-all hover:-translate-y-0.5">
      <div className="flex items-start justify-between gap-2 mb-1">
        <h4 className="font-medium text-sm text-foreground line-clamp-1">{event.title}</h4>
        <StatusBadge status={event.status} size="sm" />
      </div>
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
        <Calendar className="h-3 w-3 shrink-0" />
        {formatInIST(event.startDate, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </div>
      {event.location && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3 shrink-0" />
          <span className="truncate">{event.location}</span>
        </div>
      )}
      {event.category && (
        <span className="inline-block mt-2 text-xs font-medium px-2 py-0.5 rounded-md"
          style={{ backgroundColor: `${getCategoryColor(event.category)}20`, color: getCategoryColor(event.category) }}>
          {event.category}
        </span>
      )}
    </Link>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [volunteers, setVolunteers] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, "events"), orderBy("startDate", "desc"), limit(100));
    const unsub = onSnapshot(q, snap => {
      setEvents(snap.docs.map(d => ({ id: d.id, ...d.data() } as FirestoreEvent)));
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "volunteer"));
    const unsub = onSnapshot(q, snap => setVolunteers(snap.size));
    return () => unsub();
  }, []);

  const planned   = events.filter(e => normalizeStatus(e.status) === "Planned").length;
  const ongoing   = events.filter(e => normalizeStatus(e.status) === "Ongoing").length;
  const completed = events.filter(e => normalizeStatus(e.status) === "Completed").length;

  const statusData = [
    { name: "Planned",   value: planned,   color: STATUS_COLORS["Planned"]   },
    { name: "Ongoing",   value: ongoing,   color: STATUS_COLORS["Ongoing"]   },
    { name: "Completed", value: completed, color: STATUS_COLORS["Completed"] },
  ].filter(d => d.value > 0);

  const monthly: Record<number, number> = {};
  const monthlyCompleted: Record<number, number> = {};
  const monthlyPlanned: Record<number, number> = {};
  events.forEach(e => {
    const m = (e.startDate ? toIST(e.startDate) : new Date()).getMonth();
    monthly[m] = (monthly[m] ?? 0) + 1;
    if (normalizeStatus(e.status) === "Completed") monthlyCompleted[m] = (monthlyCompleted[m] ?? 0) + 1;
    if (normalizeStatus(e.status) === "Planned")   monthlyPlanned[m]   = (monthlyPlanned[m]   ?? 0) + 1;
  });
  const sparkTotal     = MONTH_LABELS.map((_, i) => monthly[i] ?? 0);
  const sparkCompleted = MONTH_LABELS.map((_, i) => monthlyCompleted[i] ?? 0);
  const sparkPlanned   = MONTH_LABELS.map((_, i) => monthlyPlanned[i] ?? 0);
  // Volunteers is a single live count — flat line at that value
  const sparkVolunteers = MONTH_LABELS.map(() => volunteers);
  const barData = MONTH_LABELS.map((name, i) => ({ name, value: monthly[i] ?? 0 }));

  const todayEvents = useMemo(() => {
    const today = todayInIST();
    return events.filter(e => isSameDay(toIST(e.startDate), today));
  }, [events]);

  const now = nowInIST();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const upcoming = events.filter(e => {
    const d = toIST(e.startDate);
    return d >= now && d <= weekEnd;
  });

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good Morning" : hour < 18 ? "Good Afternoon" : "Good Evening";
  const firstName = user?.displayName?.split(" ")[0] || "there";

  if (loading) {
    return (
      <Layout title="Dashboard">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Dashboard">
      <div className="space-y-8 pb-8 p-4 md:p-6">

        {/* ── Welcome Header ── */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative"
        >
          <div className="absolute -top-10 -right-10 w-72 h-72 bg-violet-500/10 rounded-full blur-3xl opacity-50 pointer-events-none" />
          <div className="absolute -top-20 -left-10 w-96 h-96 bg-pink-500/10 rounded-full blur-3xl opacity-30 pointer-events-none" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-violet-500 animate-pulse" />
                <span className="text-sm font-medium text-violet-500">
                  {format(new Date(), "EEEE, MMMM d, yyyy")}
                </span>
              </div>
              {(role === "admin" || role === "staff") && (
                <Link to="/events/create"
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white text-sm font-medium shadow-lg shadow-violet-500/40 hover:shadow-violet-500/50 transition-all hover:scale-105"
                  style={{ background: "#8B5CF6" }}>
                  <Plus className="h-4 w-4" />
                  New Event
                </Link>
              )}
            </div>

            <h1 className="text-3xl lg:text-4xl font-bold">
              <span className="text-purple-500">
                {greeting}
              </span>
              {", "}
              <span className="text-foreground">{firstName}</span>
              {" "}
              <motion.span className="inline-block"
                animate={{ rotate: [0, 14, -8, 14, -4, 10, 0] }}
                transition={{ duration: 2.5, delay: 0.5 }}>
                👋
              </motion.span>
            </h1>
            <p className="text-muted-foreground mt-1 text-base sm:text-lg max-w-2xl">
              Here's what's happening with your events.
            </p>
          </div>
        </motion.div>

        {/* ── Google Calendar Banner ── */}
        <GoogleCalendarCard />

        {/* ── Mini Calendar + Today's Events ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6">
          <MiniCalendarWidget events={events}
            onDateClick={date => navigate(`/calendar?date=${date.toISOString()}`)} />

          <motion.div className="glass-card !rounded-2xl"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Today's Events</h3>
              <Link to="/calendar" className="text-xs text-violet-500 hover:underline">View calendar</Link>
            </div>
            {todayEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <Calendar className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No events scheduled for today</p>
              </div>
            ) : (
              <div className="space-y-2">
                <p className="text-2xl font-bold text-foreground">
                  {todayEvents.length} {todayEvents.length === 1 ? "event" : "events"} today
                </p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {todayEvents.slice(0, 5).map(e => (
                    <Link key={e.id} to={`/events/${e.id}`}
                      className="block p-2 rounded-lg hover:bg-muted/50 transition-colors">
                      <p className="text-sm font-medium text-foreground truncate">{e.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatInIST(e.startDate, { hour: "numeric", minute: "2-digit" })} · {e.location}
                      </p>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard label="Total Events"  value={events.length}   icon={CalendarDays}
            gradient="from-violet-500 to-purple-600" sparklineColor="#8B5CF6" sparklineData={sparkTotal} />
          <StatCard label="Volunteers"    value={volunteers}      icon={Users}
            gradient="from-pink-500 to-rose-500"     sparklineColor="#EC4899" sparklineData={sparkVolunteers} />
          <StatCard label="Completed"     value={completed}       icon={CheckCircle}
            gradient="from-cyan-500 to-sky-500"      sparklineColor="#06B6D4" sparklineData={sparkCompleted} />
          <StatCard label="Upcoming (7d)" value={upcoming.length} icon={Clock}
            gradient="from-emerald-500 to-green-500" sparklineColor="#10B981" sparklineData={sparkPlanned} />
        </div>

        {/* ── Analytics Overview ── */}
        <div className="space-y-6">
          <motion.h2
            initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
            className="text-xl sm:text-2xl font-bold text-foreground">
            Analytics Overview
          </motion.h2>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <motion.div className="glass-card !p-0 !rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.4 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 via-transparent to-transparent pointer-events-none" />
              <DonutChart title="Events by Status" data={statusData} />
            </motion.div>

            <motion.div className="glass-card !p-0 !rounded-2xl overflow-hidden"
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.5 }}>
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent pointer-events-none" />
              <BarChartComponent title="Events per Month" data={barData} />
            </motion.div>
          </div>
        </div>

        {/* ── Recent Activity + Event Stats ── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div className="glass-card !rounded-2xl !p-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.6 }}>
            <h3 className="text-lg font-semibold text-foreground mb-4">Recent Activity</h3>
            <ActivityFeed maxItems={5} compact />
          </motion.div>

          <motion.div className="glass-card !rounded-2xl !p-6"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.7 }}>
            <h3 className="text-lg font-semibold text-foreground mb-5">Event Breakdown</h3>
            <div className="space-y-4">
              {[
                { label: "Completed", value: completed, total: events.length, color: "#10B981", bg: "rgba(16,185,129,0.12)" },
                { label: "Ongoing",   value: ongoing,   total: events.length, color: "#F59E0B", bg: "rgba(245,158,11,0.12)" },
                { label: "Planned",   value: planned,   total: events.length, color: "#8B5CF6", bg: "rgba(139,92,246,0.12)" },
                { label: "Upcoming (7 days)", value: upcoming.length, total: Math.max(upcoming.length, planned + ongoing), color: "#06B6D4", bg: "rgba(6,182,212,0.12)" },
              ].map(row => {
                const pct = row.total > 0 ? Math.round((row.value / row.total) * 100) : 0;
                return (
                  <div key={row.label}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-sm font-medium text-foreground">{row.label}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold" style={{ color: row.color }}>{row.value}</span>
                        <span className="text-xs text-muted-foreground">/ {row.total}</span>
                      </div>
                    </div>
                    <div className="h-2 rounded-full overflow-hidden" style={{ background: row.bg }}>
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: row.color }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 1.2, ease: "easeOut", delay: 0.8 }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-5 pt-4 border-t border-border/50 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">Total events tracked</span>
              <span className="text-lg font-bold text-foreground">{events.length}</span>
            </div>
          </motion.div>
        </div>

        {/* ── Upcoming Events ── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <motion.h2
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }}
              className="text-xl sm:text-2xl font-bold text-foreground">
              Upcoming Events
            </motion.h2>
            <Link to="/events" className="text-sm text-violet-500 hover:underline">View all</Link>
          </div>
          {upcoming.length === 0 ? (
            <div className="glass-card !rounded-2xl p-8 text-center">
              <p className="text-sm text-muted-foreground">No upcoming events</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {upcoming.slice(0, 6).map(e => <UpcomingEventCard key={e.id} event={e} />)}
            </div>
          )}
        </div>

        {/* ── Footer ── */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }}
          className="flex items-center justify-center pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Sparkles className="h-4 w-4 text-violet-500" />
            <span>Trackly Dashboard</span>
            <span className="text-violet-500">•</span>
            <span>Making a difference together</span>
          </div>
        </motion.div>

      </div>
    </Layout>
  );
}

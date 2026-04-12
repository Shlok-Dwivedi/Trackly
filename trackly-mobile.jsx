import { useState } from "react";

const C = {
  teal: "#0d9488", tealLight: "#ccfbf1", tealDark: "#0f766e",
  amber: "#f59e0b", amberLight: "#fef3c7",
  blue: "#3b82f6", blueLight: "#dbeafe",
  green: "#22c55e", greenLight: "#dcfce7",
  red: "#ef4444", redLight: "#fee2e2",
  grey: "#9ca3af", greyLight: "#f3f4f6",
  purple: "#8b5cf6", orange: "#f97316", pink: "#ec4899",
  bg: "#f8fafc", card: "#ffffff", border: "#e2e8f0",
  text: "#0f172a", textMuted: "#64748b",
  sidebar: "#0f172a",
};

const CATEGORY_COLORS = {
  Workshop: C.purple, Training: C.blue, Outreach: C.orange,
  Meeting: C.teal, "Community Event": C.pink, Sports: "#16a34a",
  Seminar: "#6366f1", Other: C.grey,
};

const STATUS = {
  Planned: { color: C.blue, bg: C.blueLight },
  Ongoing: { color: C.amber, bg: C.amberLight },
  Completed: { color: C.green, bg: C.greenLight },
  Cancelled: { color: C.red, bg: C.redLight },
};

// ── MICRO COMPONENTS ───────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.Planned;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: "3px 9px", fontSize: 11, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 4 }}>
      <span style={{ width: 5, height: 5, borderRadius: "50%", background: s.color, display: "inline-block" }} />
      {status}
    </span>
  );
};

const CategoryTag = ({ category }) => (
  <span style={{ background: (CATEGORY_COLORS[category] || C.grey) + "20", color: CATEGORY_COLORS[category] || C.grey, borderRadius: 99, padding: "2px 8px", fontSize: 10, fontWeight: 700 }}>
    {category}
  </span>
);

const Avatar = ({ name, size = 34, color = C.teal }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color + "20", color, fontWeight: 800, fontSize: size * 0.38, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${color}40`, flexShrink: 0 }}>
    {name?.[0]?.toUpperCase()}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 16, ...style }}>
    {children}
  </div>
);

const Btn = ({ children, variant = "primary", onClick, style = {} }) => {
  const styles = {
    primary: { background: C.teal, color: "#fff", border: "none" },
    outline: { background: "transparent", color: C.teal, border: `1.5px solid ${C.teal}` },
    ghost: { background: C.greyLight, color: C.textMuted, border: "none" },
    danger: { background: C.red, color: "#fff", border: "none" },
  };
  return (
    <button onClick={onClick} style={{ borderRadius: 10, padding: "10px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, ...styles[variant], ...style }}>
      {children}
    </button>
  );
};

const Toggle = ({ on }) => (
  <div style={{ width: 42, height: 24, borderRadius: 99, background: on ? C.teal : C.greyLight, position: "relative", cursor: "pointer", flexShrink: 0 }}>
    <div style={{ width: 18, height: 18, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 21 : 3, transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
  </div>
);

// ── BOTTOM NAV ─────────────────────────────────────────
const NAV_ITEMS = [
  { id: "dashboard", icon: "⊞", label: "Home" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "events", icon: "☰", label: "Events" },
  { id: "profile", icon: "◯", label: "Profile" },
  { id: "more", icon: "⋯", label: "More" },
];

const BottomNav = ({ active, onNav }) => (
  <div style={{ display: "flex", background: C.card, borderTop: `1px solid ${C.border}`, paddingBottom: 8 }}>
    {NAV_ITEMS.map(n => (
      <div key={n.id} onClick={() => onNav(n.id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 2, padding: "8px 0 2px", cursor: "pointer" }}>
        <span style={{ fontSize: 20 }}>{n.icon}</span>
        <span style={{ fontSize: 10, fontWeight: active === n.id ? 700 : 400, color: active === n.id ? C.teal : C.textMuted }}>{n.label}</span>
        {active === n.id && <div style={{ width: 4, height: 4, borderRadius: "50%", background: C.teal }} />}
      </div>
    ))}
  </div>
);

// ── TOP BAR ────────────────────────────────────────────
const TopBar = ({ title, right, showBack, onBack }) => (
  <div style={{ background: C.card, padding: "14px 16px 12px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      {showBack && (
        <button onClick={onBack} style={{ background: C.greyLight, border: "none", borderRadius: 8, width: 32, height: 32, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16 }}>‹</button>
      )}
      {!showBack && (
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: 7, background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
          <span style={{ fontWeight: 900, fontSize: 16, color: C.text }}>Trackly</span>
        </div>
      )}
      {title && <span style={{ fontWeight: 800, fontSize: 16, color: C.text }}>{title}</span>}
    </div>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>{right}</div>
  </div>
);

// ── MINI CALENDAR ──────────────────────────────────────
const MiniCalendar = () => {
  const days = ["S","M","T","W","T","F","S"];
  const eventDays = { 8: { count: 1, status: "Planned" }, 12: { count: 2, status: "Ongoing" }, 18: { count: 1, status: "Completed" }, 25: { count: 3, status: "Ongoing" } };
  const today = 8;
  const cells = [null,null,null,null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];

  return (
    <Card style={{ marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span style={{ fontWeight: 800, fontSize: 14, color: C.text }}>March 2026</span>
        <div style={{ display: "flex", gap: 8 }}>
          <span style={{ color: C.textMuted, fontSize: 18, cursor: "pointer" }}>‹</span>
          <span style={{ color: C.textMuted, fontSize: 18, cursor: "pointer" }}>›</span>
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
        {days.map((d, i) => (
          <div key={i} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.teal, paddingBottom: 6 }}>{d}</div>
        ))}
        {cells.map((d, i) => {
          const ev = d ? eventDays[d] : null;
          const isToday = d === today;
          const badgeColor = ev?.status === "Completed" ? C.green : ev?.status === "Ongoing" ? C.amber : C.blue;
          return (
            <div key={i} style={{ position: "relative", display: "flex", alignItems: "center", justifyContent: "center", height: 32, borderRadius: 8, background: isToday ? C.teal : "transparent" }}>
              {d && <span style={{ fontSize: 11, fontWeight: isToday ? 700 : 400, color: isToday ? "#fff" : C.text }}>{d}</span>}
              {ev && d && (
                <div style={{ position: "absolute", top: -5, right: -3, width: 15, height: 15, borderRadius: "50%", background: badgeColor, color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", border: "1.5px solid #fff", zIndex: 1 }}>
                  {ev.status === "Completed" ? "✓" : ev.count}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.border}` }}>
        {[
          { title: "Youth Workshop", date: "Mar 8", cat: "Workshop", status: "Planned" },
          { title: "Field Outreach", date: "Mar 12", cat: "Outreach", status: "Ongoing" },
          { title: "Team Meeting", date: "Mar 18", cat: "Meeting", status: "Completed" },
        ].map((ev, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: i < 2 ? `1px solid ${C.border}` : "none" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: CATEGORY_COLORS[ev.cat], flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: C.text, fontWeight: 500 }}>{ev.title}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ fontSize: 10, color: C.textMuted }}>{ev.date}</span>
              {ev.status === "Completed"
                ? <span style={{ color: C.green, fontSize: 11, fontWeight: 700 }}>✓</span>
                : <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS[ev.status]?.color, display: "inline-block" }} />}
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <span style={{ color: C.teal, fontSize: 12, fontWeight: 700 }}>View full calendar →</span>
      </div>
    </Card>
  );
};

// ── EVENT CARD ─────────────────────────────────────────
const EventCard = ({ title, status, category, date, location, photos, assignees, onClick }) => (
  <Card style={{ marginBottom: 10, cursor: "pointer" }} onClick={onClick}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: C.text, flex: 1, paddingRight: 8, lineHeight: 1.3 }}>{title}</div>
      <StatusBadge status={status} />
    </div>
    <CategoryTag category={category} />
    <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 3 }}>
      <div style={{ fontSize: 11, color: C.textMuted }}>📅 {date}</div>
      <div style={{ fontSize: 11, color: C.textMuted }}>📍 {location}</div>
      <div style={{ display: "flex", gap: 10 }}>
        {assignees > 0 && <div style={{ fontSize: 11, color: C.textMuted }}>👥 {assignees} assigned</div>}
        {photos > 0 && <div style={{ fontSize: 11, color: C.textMuted }}>📷 {photos} photos</div>}
      </div>
    </div>
  </Card>
);

// ── SCREENS ────────────────────────────────────────────

const LoginScreen = () => (
  <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, background: `linear-gradient(160deg, ${C.teal}15, ${C.bg} 50%)` }}>
    <div style={{ textAlign: "center", marginBottom: 32 }}>
      <div style={{ width: 60, height: 60, borderRadius: 16, background: `linear-gradient(135deg, ${C.teal}, ${C.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 12px" }}>⚡</div>
      <div style={{ fontWeight: 900, fontSize: 26, color: C.text }}>Trackly</div>
      <div style={{ color: C.textMuted, fontSize: 13, marginTop: 4 }}>NGO Event Management</div>
    </div>
    <div style={{ width: "100%" }}>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Email</label>
        <input placeholder="you@ngo.org" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "12px 14px", fontSize: 14, background: C.card, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Password</label>
        <input type="password" placeholder="••••••••" style={{ width: "100%", borderRadius: 12, border: `1.5px solid ${C.border}`, padding: "12px 14px", fontSize: 14, background: C.card, outline: "none", boxSizing: "border-box" }} />
      </div>
      <Btn style={{ width: "100%", padding: "13px 0", fontSize: 15, borderRadius: 12 }}>Sign In</Btn>
      <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0" }}>
        <div style={{ flex: 1, height: 1, background: C.border }} />
        <span style={{ fontSize: 12, color: C.textMuted }}>or</span>
        <div style={{ flex: 1, height: 1, background: C.border }} />
      </div>
      <button style={{ width: "100%", padding: "12px 0", borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.card, fontWeight: 600, fontSize: 13, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, color: C.text }}>
        🌐 Continue with Google
      </button>
    </div>
    <div style={{ marginTop: 20, fontSize: 12, color: C.textMuted }}>
      Don't have an account? <span style={{ color: C.teal, fontWeight: 700 }}>Sign up</span>
    </div>
  </div>
);

const DashboardScreen = ({ onNav }) => (
  <>
    <TopBar
      right={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative" }}>
            <span style={{ fontSize: 20 }}>🔔</span>
            <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
          </div>
          <Avatar name="Shlok" size={30} color={C.teal} />
        </div>
      }
    />
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text }}>Welcome back, Shlok! 👋</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>Here's what's happening today.</div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[["📋", "12", "Total Events", C.teal], ["🕐", "4", "Planned", C.blue], ["📈", "3", "Ongoing", C.amber], ["✅", "5", "Completed", C.green]].map(([icon, val, label, accent]) => (
          <Card key={label} style={{ display: "flex", alignItems: "center", gap: 10, padding: 14 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>{icon}</div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: C.text, lineHeight: 1 }}>{val}</div>
              <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{label}</div>
            </div>
          </Card>
        ))}
      </div>

      {/* Today's events */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <span style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Today's Events</span>
          <span style={{ color: C.teal, fontSize: 11, fontWeight: 700 }}>View all</span>
        </div>
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text, marginBottom: 10 }}>1 event today</div>
        <div style={{ background: C.bg, borderRadius: 10, padding: 12, borderLeft: `3px solid ${C.teal}` }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>Youth Literacy Drive</div>
          <div style={{ fontSize: 11, color: C.textMuted, marginTop: 3 }}>10:00 AM • Barangay Hall, Cebu</div>
          <div style={{ marginTop: 6 }}><StatusBadge status="Ongoing" /></div>
        </div>
      </Card>

      {/* Mini Calendar */}
      <MiniCalendar />

      {/* Upcoming */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <span style={{ fontWeight: 800, fontSize: 13, color: C.text }}>Upcoming This Week</span>
        <span style={{ color: C.teal, fontSize: 11, fontWeight: 700 }}>View all</span>
      </div>
      <EventCard title="Youth Literacy Workshop" status="Planned" category="Workshop" date="Mar 9, 2026" location="Barangay Hall" assignees={3} onClick={() => onNav("event-detail")} />
      <EventCard title="Field Outreach Drive" status="Ongoing" category="Outreach" date="Mar 8, 2026" location="Cebu City" photos={2} assignees={5} onClick={() => onNav("event-detail")} />
    </div>
  </>
);

const EventsScreen = ({ onNav }) => {
  const [filter, setFilter] = useState("All");
  const events = [
    { title: "Youth Literacy Workshop", status: "Planned", category: "Workshop", date: "Mar 9", location: "Barangay Hall", assignees: 3 },
    { title: "Field Outreach Drive", status: "Ongoing", category: "Outreach", date: "Mar 8", location: "Cebu City", photos: 2, assignees: 5 },
    { title: "Staff Training Day", status: "Planned", category: "Training", date: "Mar 12", location: "Main Office", assignees: 8 },
    { title: "Community Meeting", status: "Completed", category: "Meeting", date: "Mar 1", location: "Town Hall", photos: 4 },
    { title: "Sports Fest", status: "Completed", category: "Sports", date: "Feb 28", location: "City Park", photos: 10 },
    { title: "Annual Seminar", status: "Cancelled", category: "Seminar", date: "Mar 5", location: "Conference Room" },
  ];
  const filtered = filter === "All" ? events : events.filter(e => e.status === filter);
  return (
    <>
      <TopBar
        title="Events"
        right={<Btn style={{ padding: "6px 12px", fontSize: 12 }}>+ New</Btn>}
      />
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <input placeholder="🔍  Search events..." style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "10px 12px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box", marginBottom: 12 }} />
        <div style={{ display: "flex", gap: 6, marginBottom: 14, overflowX: "auto", paddingBottom: 4 }}>
          {["All", "Planned", "Ongoing", "Completed", "Cancelled"].map(s => (
            <button key={s} onClick={() => setFilter(s)} style={{ padding: "5px 12px", borderRadius: 99, fontSize: 11, fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", border: filter === s ? "none" : `1.5px solid ${C.border}`, background: filter === s ? C.teal : C.card, color: filter === s ? "#fff" : C.textMuted, flexShrink: 0 }}>
              {s}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.textMuted, marginBottom: 10 }}>{filtered.length} event{filtered.length !== 1 ? "s" : ""}</div>
        {filtered.map((ev, i) => <EventCard key={i} {...ev} onClick={() => onNav("event-detail")} />)}
      </div>
    </>
  );
};

const CalendarScreen = () => {
  const [view, setView] = useState("Month");
  const days = ["Su","Mo","Tu","We","Th","Fr","Sa"];
  const eventDays = { 8:[C.teal], 9:[C.purple], 12:[C.orange,C.blue], 15:[C.green], 18:[C.teal], 20:[C.amber,C.blue], 25:[C.green] };
  const cells = [null,null,null,null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];

  return (
    <>
      <TopBar title="Calendar" right={
        <div style={{ display: "flex", gap: 4 }}>
          {["Month","List"].map(v => (
            <button key={v} onClick={() => setView(v)} style={{ padding: "4px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, border: "none", background: view === v ? C.teal : C.greyLight, color: view === v ? "#fff" : C.textMuted, cursor: "pointer" }}>{v}</button>
          ))}
        </div>
      } />
      <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
          <button style={{ background: C.greyLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>‹</button>
          <span style={{ fontWeight: 800, fontSize: 15, color: C.text }}>March 2026</span>
          <button style={{ background: C.greyLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>›</button>
        </div>

        {view === "Month" && (
          <Card style={{ padding: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 6 }}>
              {days.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: C.teal, padding: "2px 0" }}>{d}</div>)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
              {cells.map((d, i) => {
                const evs = d ? eventDays[d] : null;
                const isToday = d === 8;
                return (
                  <div key={i} style={{ minHeight: 44, padding: 3, borderRadius: 8, background: isToday ? `${C.teal}12` : "transparent", cursor: d ? "pointer" : "default" }}>
                    {d && (
                      <>
                        <div style={{ width: 22, height: 22, borderRadius: "50%", background: isToday ? C.teal : "transparent", color: isToday ? "#fff" : C.text, fontSize: 11, fontWeight: isToday ? 700 : 400, display: "flex", alignItems: "center", justifyContent: "center" }}>{d}</div>
                        {evs && (
                          <div style={{ display: "flex", flexDirection: "column", gap: 1, marginTop: 2 }}>
                            {evs.slice(0, 2).map((c, j) => (
                              <div key={j} style={{ height: 4, borderRadius: 2, background: c }} />
                            ))}
                            {evs.length > 2 && <div style={{ fontSize: 8, color: C.textMuted }}>+{evs.length-2}</div>}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {view === "List" && (
          <div>
            {[
              { date: "Today, Mar 8", events: [{ title: "Youth Literacy Drive", time: "10:00 AM", cat: "Workshop", status: "Ongoing" }] },
              { date: "Tomorrow, Mar 9", events: [{ title: "Youth Literacy Workshop", time: "9:00 AM", cat: "Workshop", status: "Planned" }] },
              { date: "Mar 12", events: [{ title: "Staff Training Day", time: "8:00 AM", cat: "Training", status: "Planned" }, { title: "Field Outreach", time: "2:00 PM", cat: "Outreach", status: "Planned" }] },
            ].map((group, i) => (
              <div key={i} style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 800, color: C.textMuted, textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>{group.date}</div>
                {group.events.map((ev, j) => (
                  <Card key={j} style={{ marginBottom: 8, display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 3, height: "100%", minHeight: 40, borderRadius: 2, background: CATEGORY_COLORS[ev.cat], flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: C.text }}>{ev.title}</div>
                      <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{ev.time}</div>
                      <div style={{ marginTop: 6, display: "flex", gap: 6 }}>
                        <CategoryTag category={ev.cat} />
                        <StatusBadge status={ev.status} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Legend */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
          {Object.entries(CATEGORY_COLORS).slice(0, 5).map(([cat, color]) => (
            <span key={cat} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 10, color: C.textMuted }}>
              <span style={{ width: 8, height: 8, borderRadius: 2, background: color, display: "inline-block" }} />{cat}
            </span>
          ))}
        </div>
      </div>
    </>
  );
};

const EventDetailScreen = ({ onBack }) => (
  <>
    <TopBar showBack onBack={onBack} right={
      <div style={{ display: "flex", gap: 8 }}>
        <button style={{ background: C.greyLight, border: "none", borderRadius: 8, padding: "6px 10px", cursor: "pointer", fontSize: 14 }}>✏️</button>
      </div>
    } />
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      <div style={{ marginBottom: 14 }}>
        <h1 style={{ fontWeight: 900, fontSize: 20, color: C.text, margin: "0 0 8px" }}>Youth Literacy Workshop</h1>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          <StatusBadge status="Planned" />
          <CategoryTag category="Workshop" />
        </div>
      </div>

      <Card style={{ marginBottom: 12 }}>
        <p style={{ color: C.textMuted, fontSize: 13, margin: 0, lineHeight: 1.6 }}>A hands-on workshop to improve reading and writing skills among youth in rural communities. Volunteers work in small groups with participants aged 10–18.</p>
      </Card>

      <Card style={{ marginBottom: 12 }}>
        {[["📅","Starts","Mon, Mar 9, 2026, 10:00 AM"],["📅","Ends","Mon, Mar 9, 2026, 4:00 PM"],["📍","Location","Barangay Hall, Cebu City"],["👥","Assigned","3 members"]].map(([icon,label,val],i)=>(
          <div key={i} style={{ display:"flex", gap:10, padding:"8px 0", borderBottom: i<3?`1px solid ${C.border}`:"none" }}>
            <span style={{ fontSize:16 }}>{icon}</span>
            <div><div style={{ fontSize:10, color:C.textMuted }}>{label}</div><div style={{ fontSize:13, fontWeight:600, color:C.text }}>{val}</div></div>
          </div>
        ))}
      </Card>

      {/* Enrollment */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", marginBottom:10 }}>
          <div><div style={{ fontSize:10, color:C.textMuted }}>Enrollment</div><div style={{ fontSize:14, fontWeight:800, color:C.text }}>Open Enrollment</div></div>
          <div style={{ textAlign:"right" }}><div style={{ fontSize:10, color:C.textMuted }}>Capacity</div><div style={{ fontSize:14, fontWeight:800, color:C.text }}>3 / 15</div></div>
        </div>
        <Btn style={{ width:"100%", padding:"11px 0" }}>👤+ Request to Join</Btn>
      </Card>

      {/* Attendees */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ fontWeight:800, fontSize:13, color:C.text, marginBottom:10 }}>Attendees (3)</div>
        <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
          {[["Maria Santos",C.teal],["John Doe",C.blue],["Jane Smith",C.purple]].map(([name,color])=>(
            <div key={name} style={{ display:"flex", alignItems:"center", gap:8 }}>
              <Avatar name={name} size={32} color={color} />
              <div>
                <div style={{ fontSize:13, fontWeight:600, color:C.text }}>{name}</div>
                <div style={{ fontSize:10, color:C.textMuted }}>assigned</div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Photos */}
      <Card style={{ marginBottom: 12 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
          <div style={{ fontWeight:800, fontSize:13, color:C.text }}>Photos (2)</div>
          <Btn variant="outline" style={{ fontSize:11, padding:"5px 10px" }}>📷 Upload</Btn>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8 }}>
          {[C.teal, C.blue].map((c,i)=>(
            <div key={i} style={{ height:80, borderRadius:10, background:`${c}18`, border:`1px solid ${c}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:20 }}>🖼️</div>
          ))}
          <div style={{ height:80, borderRadius:10, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMuted, fontSize:12 }}>+ Add</div>
        </div>
      </Card>

      {/* Tags */}
      <div style={{ display:"flex", gap:6, marginBottom:12 }}>
        {["#literacy","#youth","#community"].map(t=>(
          <span key={t} style={{ background:C.greyLight, color:C.textMuted, borderRadius:99, padding:"3px 10px", fontSize:11 }}>{t}</span>
        ))}
      </div>

      {/* Google Calendar */}
      <Card style={{ marginBottom:12, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div><div style={{ fontWeight:700, fontSize:13 }}>Google Calendar</div><div style={{ fontSize:11, color:C.textMuted }}>Export this event</div></div>
        <Btn variant="outline" style={{ fontSize:11, padding:"6px 12px" }}>↗ Export</Btn>
      </Card>

      {/* Cancel */}
      <Card style={{ border:`1px solid ${C.redLight}`, marginBottom:20 }}>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div><div style={{ fontWeight:700, fontSize:13, color:C.red }}>Cancel Event</div><div style={{ fontSize:11, color:C.textMuted }}>Admin only</div></div>
          <Btn variant="danger" style={{ fontSize:11, padding:"6px 12px" }}>Cancel</Btn>
        </div>
      </Card>
    </div>
  </>
);

const CreateEventScreen = ({ onBack }) => (
  <>
    <TopBar showBack onBack={onBack} title="New Event" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {[
        { label: "Event Title *", placeholder: "e.g. Youth Literacy Workshop" },
      ].map(f => (
        <div key={f.label} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>{f.label}</label>
          <input placeholder={f.placeholder} style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box" }} />
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Description</label>
        <textarea rows={3} placeholder="What is this event about?" style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box", resize: "none" }} />
      </div>
      {[["Start Date & Time *", "datetime-local"], ["End Date & Time *", "datetime-local"], ["Location", "text"]].map(([label, type]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>{label}</label>
          <input type={type} style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box" }} />
        </div>
      ))}
      {[["Category", Object.keys(CATEGORY_COLORS)], ["Priority", ["Low","Medium","High"]], ["Enrollment Type", ["Assigned Only","Open Enrollment","Both"]]].map(([label, opts]) => (
        <div key={label} style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>{label}</label>
          <select style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box" }}>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        </div>
      ))}
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Max Attendees (0 = unlimited)</label>
        <input type="number" placeholder="0" style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box" }} />
      </div>
      <div style={{ marginBottom: 14 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Assign To</label>
        <input placeholder="🔍 Search users..." style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box", marginBottom: 8 }} />
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["Maria Santos","John Doe"].map(n => (
            <div key={n} style={{ display:"flex", alignItems:"center", gap:5, background:C.tealLight, borderRadius:99, padding:"4px 10px 4px 5px" }}>
              <Avatar name={n} size={18} color={C.teal} />
              <span style={{ fontSize:11, fontWeight:700, color:C.tealDark }}>{n}</span>
              <span style={{ color:C.teal, fontSize:14, cursor:"pointer" }}>×</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ marginBottom: 20 }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: C.text, display: "block", marginBottom: 6 }}>Tags (comma-separated)</label>
        <input placeholder="e.g. literacy, youth" style={{ width: "100%", borderRadius: 10, border: `1.5px solid ${C.border}`, padding: "11px 13px", fontSize: 13, background: C.card, outline: "none", boxSizing: "border-box" }} />
      </div>
      <Btn style={{ width: "100%", padding: "13px 0", fontSize: 15, borderRadius: 12, marginBottom: 20 }}>Create Event</Btn>
    </div>
  </>
);

const ProfileScreen = () => (
  <>
    <TopBar title="Profile" right={<Btn variant="ghost" style={{ fontSize: 12, padding: "6px 10px" }}>✏️ Edit</Btn>} />
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {/* Header */}
      <Card style={{ marginBottom: 14, textAlign: "center", paddingTop: 24, paddingBottom: 20 }}>
        <div style={{ position: "relative", display: "inline-block", marginBottom: 12 }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: `${C.teal}20`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, fontWeight: 900, color: C.teal, border: `2px solid ${C.teal}40`, margin: "0 auto" }}>S</div>
          <div style={{ position: "absolute", bottom: 0, right: 0, width: 22, height: 22, borderRadius: "50%", background: C.teal, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff" }}>📷</div>
        </div>
        <div style={{ fontWeight: 900, fontSize: 18, color: C.text }}>Shlok Dwivedi</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 2 }}>shlok@ngo.org</div>
        <div style={{ display: "flex", gap: 6, justifyContent: "center", marginTop: 8 }}>
          <span style={{ background: C.tealLight, color: C.tealDark, borderRadius: 99, padding: "3px 12px", fontSize: 11, fontWeight: 700 }}>Admin</span>
          <span style={{ background: C.greyLight, color: C.textMuted, borderRadius: 99, padding: "3px 12px", fontSize: 11 }}>Education</span>
        </div>
        <div style={{ fontSize: 12, color: C.textMuted, marginTop: 10, lineHeight: 1.5 }}>Passionate about education and community development.</div>
        <div style={{ fontSize: 11, color: C.textMuted, marginTop: 6 }}>📞 +91 98765 43210</div>
      </Card>

      {/* Stats */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 14 }}>
        {[["📋","18","Events Assigned",C.teal],["✅","12","Completed",C.green],["📷","34","Photos",C.blue],["📅","Jan 2024","Member Since",C.purple]].map(([icon,val,label,accent])=>(
          <Card key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:12 }}>
            <div style={{ width:34, height:34, borderRadius:9, background:accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:15 }}>{icon}</div>
            <div><div style={{ fontSize:15, fontWeight:900, color:C.text, lineHeight:1 }}>{val}</div><div style={{ fontSize:10, color:C.textMuted, marginTop:1 }}>{label}</div></div>
          </Card>
        ))}
      </div>

      {/* My Events */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 12 }}>My Events</div>
        {[
          { title:"Youth Workshop", status:"Planned", date:"Mar 9", cat:"Workshop" },
          { title:"Field Outreach", status:"Ongoing", date:"Mar 8", cat:"Outreach" },
          { title:"Team Meeting", status:"Completed", date:"Mar 1", cat:"Meeting" },
        ].map((ev,i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
            <div style={{ display:"flex", gap:8, alignItems:"center" }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:CATEGORY_COLORS[ev.cat], flexShrink:0 }} />
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:C.text }}>{ev.title}</div>
                <div style={{ fontSize:10, color:C.textMuted }}>{ev.date}</div>
              </div>
            </div>
            <StatusBadge status={ev.status} />
          </div>
        ))}
      </Card>

      {/* Notification Prefs */}
      <Card style={{ marginBottom: 14 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 12 }}>Notifications</div>
        {[["Email notifications",true],["Push notifications",true],["When assigned",true],["Status changes",false],["24hr reminders",true]].map(([label,on],i)=>(
          <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
            <span style={{ fontSize:13, color:C.text }}>{label}</span>
            <Toggle on={on} />
          </div>
        ))}
      </Card>

      {/* Security */}
      <Card style={{ marginBottom: 20 }}>
        <div style={{ fontWeight: 800, fontSize: 13, color: C.text, marginBottom: 12 }}>Security</div>
        <div style={{ fontSize: 12, color: C.textMuted, marginBottom: 12 }}>Last login: Mar 8, 2026, 9:00 AM</div>
        <Btn variant="outline" style={{ width: "100%", justifyContent: "center" }}>🔒 Change Password</Btn>
      </Card>
    </div>
  </>
);

const MoreScreen = ({ onNav }) => (
  <>
    <TopBar title="More" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {[
        { icon: "📊", label: "Reports & Analytics", sub: "View stats and insights", page: "reports" },
        { icon: "👥", label: "User Management", sub: "Manage team roles", page: "users" },
        { icon: "🔔", label: "Notifications", sub: "3 unread", page: null },
        { icon: "⚙️", label: "Settings", sub: "App preferences", page: null },
        { icon: "❓", label: "Help & Support", sub: "FAQs and contact", page: null },
      ].map((item, i) => (
        <Card key={i} style={{ marginBottom: 10, display: "flex", alignItems: "center", gap: 14, cursor: "pointer", padding: 14 }} onClick={() => item.page && onNav(item.page)}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.greyLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{item.icon}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: 14, color: C.text }}>{item.label}</div>
            <div style={{ fontSize: 11, color: C.textMuted, marginTop: 2 }}>{item.sub}</div>
          </div>
          <span style={{ fontSize: 16, color: C.textMuted }}>›</span>
        </Card>
      ))}
      <Card style={{ marginTop: 10, border: `1px solid ${C.redLight}` }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, cursor: "pointer" }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: C.redLight, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>⬚</div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.red }}>Log Out</div>
        </div>
      </Card>
    </div>
  </>
);

const NotifScreen = ({ onBack }) => (
  <>
    <TopBar showBack onBack={onBack} title="Notifications" />
    <div style={{ flex: 1, overflowY: "auto", padding: 14 }}>
      {[
        { title:"Assigned to Youth Workshop", body:"You've been assigned to Youth Literacy Workshop on Mar 9", time:"5m ago", unread:true },
        { title:"Join Request Approved", body:"Your request to join Field Outreach was approved ✓", time:"1h ago", unread:true },
        { title:"Event starts tomorrow", body:"Staff Training Day starts in 24 hours", time:"3h ago", unread:true },
        { title:"New photo uploaded", body:"Maria Santos uploaded a photo to Community Meeting", time:"Yesterday", unread:false },
        { title:"Status changed", body:"Youth Workshop status changed to Ongoing", time:"2 days ago", unread:false },
      ].map((n, i) => (
        <div key={i} style={{ padding:"12px 14px", borderRadius:12, background:n.unread?`${C.teal}08`:C.card, borderLeft:n.unread?`3px solid ${C.teal}`:"3px solid transparent", marginBottom:8, border:`1px solid ${C.border}`, cursor:"pointer" }}>
          <div style={{ fontWeight:n.unread?800:500, fontSize:13, color:C.text }}>{n.title}</div>
          <div style={{ fontSize:12, color:C.textMuted, marginTop:3, lineHeight:1.4 }}>{n.body}</div>
          <div style={{ fontSize:11, color:C.teal, marginTop:5, fontWeight:600 }}>{n.time}</div>
        </div>
      ))}
    </div>
  </>
);

// ── PHONE SHELL ────────────────────────────────────────
const SCREENS = ["login","dashboard","events","calendar","event-detail","create-event","profile","more","notifications"];

export default function App() {
  const [screen, setScreen] = useState("dashboard");
  const [prevScreen, setPrevScreen] = useState("dashboard");

  const navigate = (to) => {
    setPrevScreen(screen);
    setScreen(to);
  };

  const goBack = () => setScreen(prevScreen);

  const renderScreen = () => {
    switch(screen) {
      case "login": return <LoginScreen />;
      case "dashboard": return <DashboardScreen onNav={navigate} />;
      case "events": return <EventsScreen onNav={navigate} />;
      case "calendar": return <CalendarScreen />;
      case "event-detail": return <EventDetailScreen onBack={goBack} />;
      case "create-event": return <CreateEventScreen onBack={goBack} />;
      case "profile": return <ProfileScreen />;
      case "more": return <MoreScreen onNav={navigate} />;
      case "notifications": return <NotifScreen onBack={goBack} />;
      default: return <DashboardScreen onNav={navigate} />;
    }
  };

  const showBottomNav = !["login","event-detail","create-event","notifications"].includes(screen);

  return (
    <div style={{ minHeight: "100vh", background: "#e2e8f0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", padding: "20px 0 40px", fontFamily: "'DM Sans', 'Segoe UI', sans-serif" }}>

      {/* Screen selector */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "center", marginBottom: 16, maxWidth: 500, padding: "0 16px" }}>
        {SCREENS.map(s => (
          <button key={s} onClick={() => navigate(s)} style={{ padding: "5px 12px", borderRadius: 8, border: "none", background: screen === s ? C.teal : C.card, color: screen === s ? "#fff" : C.textMuted, fontSize: 11, fontWeight: screen === s ? 700 : 500, cursor: "pointer", boxShadow: "0 1px 4px rgba(0,0,0,0.08)" }}>
            {s}
          </button>
        ))}
      </div>

      {/* Phone frame */}
      <div style={{ width: 390, background: C.bg, borderRadius: 44, overflow: "hidden", boxShadow: "0 24px 80px rgba(0,0,0,0.18), 0 0 0 8px #1e293b, 0 0 0 10px #334155", display: "flex", flexDirection: "column", minHeight: 844, maxHeight: 844, position: "relative" }}>

        {/* Status bar */}
        <div style={{ background: screen === "login" ? "transparent" : C.card, padding: "10px 24px 6px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: screen === "login" ? C.text : C.text }}>9:41</span>
          <div style={{ width: 80, height: 20, background: "#0f172a", borderRadius: 99, margin: "0 auto" }} />
          <span style={{ fontSize: 11, color: C.textMuted }}>●●● 📶 🔋</span>
        </div>

        {/* Screen content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: C.bg }}>
          {renderScreen()}
        </div>

        {/* Bottom nav */}
        {showBottomNav && <BottomNav active={screen} onNav={navigate} />}

        {/* Home indicator */}
        <div style={{ background: C.card, padding: "6px 0 8px", display: "flex", justifyContent: "center" }}>
          <div style={{ width: 120, height: 4, borderRadius: 2, background: C.border }} />
        </div>
      </div>

      <div style={{ marginTop: 16, fontSize: 11, color: "#94a3b8", textAlign: "center" }}>
        Trackly Mobile — Designer Reference Prototype
      </div>
    </div>
  );
}

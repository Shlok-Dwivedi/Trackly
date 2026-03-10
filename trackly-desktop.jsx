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
  sidebar: "#0f172a", sidebarText: "#94a3b8", sidebarActive: "#1e293b",
};

const CATEGORY_COLORS = {
  Workshop: "#8b5cf6", Training: "#3b82f6", Outreach: "#f97316",
  Meeting: "#0d9488", "Community Event": "#ec4899", Sports: "#16a34a",
  Seminar: "#6366f1", Other: "#9ca3af",
};

const STATUS = {
  Planned: { color: "#3b82f6", bg: "#dbeafe" },
  Ongoing: { color: "#f59e0b", bg: "#fef3c7" },
  Completed: { color: "#22c55e", bg: "#dcfce7" },
  Cancelled: { color: "#ef4444", bg: "#fee2e2" },
};

// ── ATOMS ──────────────────────────────────────────────────────
const StatusBadge = ({ status }) => {
  const s = STATUS[status] || STATUS.Planned;
  return (
    <span style={{ background: s.bg, color: s.color, borderRadius: 99, padding: "3px 10px", fontSize: 12, fontWeight: 700, display: "inline-flex", alignItems: "center", gap: 5 }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: s.color }} />{status}
    </span>
  );
};

const CategoryTag = ({ category }) => (
  <span style={{ background: (CATEGORY_COLORS[category] || C.grey) + "22", color: CATEGORY_COLORS[category] || C.grey, borderRadius: 99, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
    {category}
  </span>
);

const Avatar = ({ name, size = 34, color = C.teal }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: color + "20", color, fontWeight: 800, fontSize: size * 0.38, display: "flex", alignItems: "center", justifyContent: "center", border: `1.5px solid ${color}40`, flexShrink: 0 }}>
    {name?.[0]?.toUpperCase()}
  </div>
);

const Card = ({ children, style = {} }) => (
  <div style={{ background: C.card, borderRadius: 16, border: `1px solid ${C.border}`, padding: 20, ...style }}>{children}</div>
);

const Btn = ({ children, variant = "primary", onClick, style = {} }) => {
  const v = { primary: { background: C.teal, color: "#fff", border: "none" }, outline: { background: "transparent", color: C.teal, border: `1.5px solid ${C.teal}` }, ghost: { background: C.greyLight, color: C.textMuted, border: "none" }, danger: { background: C.red, color: "#fff", border: "none" } };
  return <button onClick={onClick} style={{ borderRadius: 9, padding: "8px 16px", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6, ...v[variant], ...style }}>{children}</button>;
};

const StatCard = ({ icon, value, label, accent }) => (
  <Card style={{ display: "flex", alignItems: "center", gap: 14, padding: 18 }}>
    <div style={{ width: 46, height: 46, borderRadius: 12, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 900, color: C.text, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: 12, color: C.textMuted, marginTop: 3 }}>{label}</div>
    </div>
  </Card>
);

const Toggle = ({ on }) => (
  <div style={{ width: 40, height: 22, borderRadius: 99, background: on ? C.teal : C.greyLight, position: "relative", cursor: "pointer", flexShrink: 0 }}>
    <div style={{ width: 16, height: 16, borderRadius: "50%", background: "#fff", position: "absolute", top: 3, left: on ? 20 : 3, boxShadow: "0 1px 3px rgba(0,0,0,0.2)" }} />
  </div>
);

// ── SIDEBAR ────────────────────────────────────────────────────
const NAV = [
  { id: "dashboard", icon: "⊞", label: "Dashboard" },
  { id: "calendar", icon: "📅", label: "Calendar" },
  { id: "events", icon: "☰", label: "Events" },
  { id: "profile", icon: "◯", label: "Profile" },
  { id: "reports", icon: "↗", label: "Reports" },
  { id: "users", icon: "👥", label: "Users" },
];

const Sidebar = ({ active, onNav, onNotif }) => (
  <div style={{ width: 230, background: C.sidebar, height: "100vh", position: "fixed", left: 0, top: 0, display: "flex", flexDirection: "column", zIndex: 100 }}>
    <div style={{ padding: "22px 18px 14px", borderBottom: "1px solid #1e293b", display: "flex", alignItems: "center", gap: 10 }}>
      <div style={{ width: 34, height: 34, borderRadius: 9, background: `linear-gradient(135deg,${C.teal},${C.tealDark})`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17 }}>⚡</div>
      <div>
        <div style={{ color: "#f1f5f9", fontWeight: 900, fontSize: 16 }}>Trackly</div>
        <div style={{ color: C.teal, fontSize: 10, fontWeight: 700 }}>Admin</div>
      </div>
    </div>
    <nav style={{ flex: 1, padding: "10px 8px" }}>
      {NAV.map(n => (
        <div key={n.id} onClick={() => onNav(n.id)} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 12px", borderRadius: 9, marginBottom: 2, cursor: "pointer", background: active === n.id ? C.sidebarActive : "transparent", color: active === n.id ? "#f1f5f9" : C.sidebarText, fontWeight: active === n.id ? 700 : 400, fontSize: 14, borderLeft: active === n.id ? `3px solid ${C.teal}` : "3px solid transparent" }}>
          <span style={{ fontSize: 16 }}>{n.icon}</span>{n.label}
        </div>
      ))}
    </nav>
    <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
      <div onClick={onNotif} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10, cursor: "pointer" }}>
        <div style={{ position: "relative" }}>
          <span style={{ fontSize: 18 }}>🔔</span>
          <span style={{ position: "absolute", top: -4, right: -4, width: 14, height: 14, borderRadius: "50%", background: C.red, color: "#fff", fontSize: 8, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>3</span>
        </div>
        <span style={{ color: C.sidebarText, fontSize: 13 }}>Notifications</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
        <Avatar name="Shlok" size={30} color={C.teal} />
        <div>
          <div style={{ color: "#f1f5f9", fontSize: 12, fontWeight: 700 }}>Shlok Dwivedi</div>
          <div style={{ color: C.sidebarText, fontSize: 10 }}>Admin</div>
        </div>
      </div>
      <div style={{ color: C.sidebarText, fontSize: 12, cursor: "pointer" }}>⬚ Log out</div>
    </div>
  </div>
);

// ── TOPBAR ─────────────────────────────────────────────────────
const TopBar = ({ title, right }) => (
  <div style={{ position: "sticky", top: 0, background: `${C.card}f0`, backdropFilter: "blur(10px)", borderBottom: `1px solid ${C.border}`, padding: "14px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", zIndex: 50 }}>
    <h1 style={{ margin: 0, fontSize: 20, fontWeight: 900, color: C.text }}>{title}</h1>
    <div>{right}</div>
  </div>
);

// ── MINI CALENDAR ──────────────────────────────────────────────
const MiniCalendar = () => {
  const days = ["S","M","T","W","T","F","S"];
  const eventDays = { 8:{count:1,status:"Planned"}, 12:{count:2,status:"Ongoing"}, 18:{count:1,status:"Completed"}, 25:{count:3,status:"Ongoing"} };
  const today = 8;
  const cells = [null,null,null,null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31];
  return (
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <span style={{ fontWeight:800, fontSize:15, color:C.text }}>March 2026</span>
        <div style={{ display:"flex", gap:8 }}>
          <span style={{ cursor:"pointer", color:C.textMuted, fontSize:18 }}>‹</span>
          <span style={{ cursor:"pointer", color:C.textMuted, fontSize:18 }}>›</span>
        </div>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:2 }}>
        {days.map((d,i)=><div key={i} style={{ textAlign:"center", fontSize:11, fontWeight:700, color:C.teal, paddingBottom:8 }}>{d}</div>)}
        {cells.map((d,i)=>{
          const ev=d?eventDays[d]:null;
          const isToday=d===today;
          const bc=ev?.status==="Completed"?C.green:ev?.status==="Ongoing"?C.amber:C.blue;
          return(
            <div key={i} style={{ position:"relative", display:"flex", alignItems:"center", justifyContent:"center", height:36, borderRadius:9, background:isToday?C.teal:"transparent", cursor:d?"pointer":"default" }}>
              {d&&<span style={{ fontSize:12, fontWeight:isToday?700:400, color:isToday?"#fff":C.text }}>{d}</span>}
              {ev&&d&&<div style={{ position:"absolute", top:-5, right:-4, width:17, height:17, borderRadius:"50%", background:bc, color:"#fff", fontSize:9, fontWeight:700, display:"flex", alignItems:"center", justifyContent:"center", border:"1.5px solid #fff", zIndex:1 }}>{ev.status==="Completed"?"✓":ev.count}</div>}
            </div>
          );
        })}
      </div>
      <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}` }}>
        {[{title:"Youth Workshop",date:"Mar 8",cat:"Workshop",status:"Planned"},{title:"Field Outreach",date:"Mar 12",cat:"Outreach",status:"Ongoing"},{title:"Team Meeting",date:"Mar 18",cat:"Meeting",status:"Completed"}].map((ev,i)=>(
          <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"6px 0", borderBottom:i<2?`1px solid ${C.border}`:"none" }}>
            <div style={{ display:"flex", alignItems:"center", gap:7 }}>
              <span style={{ width:7, height:7, borderRadius:"50%", background:CATEGORY_COLORS[ev.cat], flexShrink:0 }}/>
              <span style={{ fontSize:12, color:C.text, fontWeight:500 }}>{ev.title}</span>
            </div>
            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
              <span style={{ fontSize:11, color:C.textMuted }}>{ev.date}</span>
              {ev.status==="Completed"?<span style={{ color:C.green, fontSize:12, fontWeight:700 }}>✓</span>:<span style={{ width:6, height:6, borderRadius:"50%", background:STATUS[ev.status]?.color, display:"inline-block" }}/>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ textAlign:"center", marginTop:12 }}>
        <span style={{ color:C.teal, fontSize:12, fontWeight:700, cursor:"pointer" }}>View full calendar →</span>
      </div>
    </Card>
  );
};

// ── EVENT CARD ─────────────────────────────────────────────────
const EventCard = ({ title, status, category, date, location, photos, assignees, onClick }) => (
  <Card style={{ cursor:"pointer" }} onClick={onClick}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
      <div style={{ fontWeight:700, fontSize:14, color:C.text, flex:1, paddingRight:8, lineHeight:1.3 }}>{title}</div>
      <StatusBadge status={status}/>
    </div>
    <CategoryTag category={category}/>
    <div style={{ marginTop:10, display:"flex", flexDirection:"column", gap:4 }}>
      <div style={{ fontSize:12, color:C.textMuted }}>📅 {date}</div>
      <div style={{ fontSize:12, color:C.textMuted }}>📍 {location}</div>
      <div style={{ display:"flex", gap:10 }}>
        {assignees>0&&<div style={{ fontSize:12, color:C.textMuted }}>👥 {assignees} assigned</div>}
        {photos>0&&<div style={{ fontSize:12, color:C.textMuted }}>📷 {photos} photos</div>}
      </div>
    </div>
  </Card>
);

// ── NOTIFICATION DRAWER ────────────────────────────────────────
const NotifDrawer = ({ onClose }) => (
  <div style={{ position:"fixed", top:0, right:0, width:360, height:"100vh", background:C.card, boxShadow:"-4px 0 30px rgba(0,0,0,0.10)", zIndex:200, display:"flex", flexDirection:"column" }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"20px 20px 16px", borderBottom:`1px solid ${C.border}` }}>
      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
        <span style={{ fontSize:18 }}>🔔</span>
        <span style={{ fontWeight:800, fontSize:16, color:C.text }}>Notifications</span>
        <span style={{ background:C.red, color:"#fff", borderRadius:99, padding:"1px 7px", fontSize:11, fontWeight:700 }}>3</span>
      </div>
      <button onClick={onClose} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:C.textMuted }}>×</button>
    </div>
    <div style={{ flex:1, overflowY:"auto", padding:12 }}>
      {[{title:"Assigned to Youth Workshop",body:"You've been assigned to Youth Literacy Workshop on Mar 9",time:"5m ago",unread:true},{title:"Join Request Approved",body:"Your request to join Field Outreach was approved ✓",time:"1h ago",unread:true},{title:"Event starts tomorrow",body:"Staff Training Day starts in 24 hours",time:"3h ago",unread:true},{title:"New photo uploaded",body:"Maria Santos uploaded a photo to Community Meeting",time:"Yesterday",unread:false}].map((n,i)=>(
        <div key={i} style={{ padding:"12px 10px", borderRadius:10, background:n.unread?`${C.teal}08`:"transparent", borderLeft:n.unread?`3px solid ${C.teal}`:"3px solid transparent", marginBottom:4, cursor:"pointer" }}>
          <div style={{ fontWeight:n.unread?800:500, fontSize:13, color:C.text }}>{n.title}</div>
          <div style={{ fontSize:12, color:C.textMuted, marginTop:2, lineHeight:1.4 }}>{n.body}</div>
          <div style={{ fontSize:11, color:C.teal, marginTop:4, fontWeight:600 }}>{n.time}</div>
        </div>
      ))}
    </div>
  </div>
);

// ── GOOGLE CALENDAR CONNECT CARD ───────────────────────────────
const GoogleCalendarCard = ({ connected, onConnect }) => (
  <Card style={{ border: connected ? `1.5px solid ${C.green}` : `1.5px solid ${C.border}`, marginBottom: 16 }}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
      <div style={{ display:"flex", alignItems:"center", gap:12 }}>
        <div style={{ width:42, height:42, borderRadius:10, background:"#fff", border:`1px solid ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>📆</div>
        <div>
          <div style={{ fontWeight:800, fontSize:14, color:C.text }}>Google Calendar</div>
          <div style={{ fontSize:12, color:C.textMuted, marginTop:2 }}>
            {connected ? "✅ Connected — events sync automatically" : "Connect to sync Trackly events to your Google Calendar"}
          </div>
        </div>
      </div>
      {connected
        ? <Btn variant="ghost" style={{ fontSize:12 }}>Disconnect</Btn>
        : <Btn onClick={onConnect} style={{ fontSize:12, background:"#4285f4" }}>🔗 Connect Google Calendar</Btn>
      }
    </div>
    {connected && (
      <div style={{ marginTop:14, paddingTop:12, borderTop:`1px solid ${C.border}`, display:"flex", gap:8 }}>
        <Btn variant="outline" style={{ fontSize:11 }}>↗ Export All Events</Btn>
        <Btn variant="ghost" style={{ fontSize:11 }}>⚙️ Sync Settings</Btn>
        <div style={{ marginLeft:"auto", fontSize:11, color:C.textMuted, display:"flex", alignItems:"center", gap:4 }}>
          <span style={{ width:6, height:6, borderRadius:"50%", background:C.green, display:"inline-block" }}/>
          Last synced: 2 min ago
        </div>
      </div>
    )}
  </Card>
);

// ── PAGES ──────────────────────────────────────────────────────

const LoginPage = () => (
  <div style={{ minHeight:"100vh", background:`linear-gradient(135deg,${C.teal}15,${C.blue}10)`, display:"flex", alignItems:"center", justifyContent:"center" }}>
    <div style={{ width:420, background:C.card, borderRadius:22, border:`1px solid ${C.border}`, padding:40, boxShadow:"0 8px 40px rgba(0,0,0,0.08)" }}>
      <div style={{ textAlign:"center", marginBottom:30 }}>
        <div style={{ width:56, height:56, borderRadius:15, background:`linear-gradient(135deg,${C.teal},${C.tealDark})`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:26, margin:"0 auto 12px" }}>⚡</div>
        <div style={{ fontWeight:900, fontSize:26, color:C.text }}>Trackly</div>
        <div style={{ color:C.textMuted, fontSize:13, marginTop:4 }}>NGO Event Management System</div>
      </div>
      {[["Email","email","you@ngo.org"],["Password","password","••••••••"]].map(([label,type,ph])=>(
        <div key={label} style={{ marginBottom:14 }}>
          <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>{label}</label>
          <input type={type} placeholder={ph} style={{ width:"100%", borderRadius:10, border:`1.5px solid ${C.border}`, padding:"11px 13px", fontSize:14, background:C.bg, outline:"none", boxSizing:"border-box" }}/>
        </div>
      ))}
      <Btn style={{ width:"100%", justifyContent:"center", padding:"12px 0", fontSize:14, marginTop:6, marginBottom:18, borderRadius:11 }}>Sign In</Btn>
      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:18 }}>
        <div style={{ flex:1, height:1, background:C.border }}/><span style={{ fontSize:12, color:C.textMuted }}>or</span><div style={{ flex:1, height:1, background:C.border }}/>
      </div>
      <button style={{ width:"100%", padding:"11px 0", borderRadius:11, border:`1.5px solid ${C.border}`, background:C.card, fontWeight:700, fontSize:13, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"center", gap:8, color:C.text }}>
        🌐 Continue with Google
      </button>
      <div style={{ textAlign:"center", marginTop:18, fontSize:12, color:C.textMuted }}>
        Don't have an account? <span style={{ color:C.teal, fontWeight:700, cursor:"pointer" }}>Sign up</span>
      </div>
    </div>
  </div>
);

const DashboardPage = ({ onNav }) => (
  <div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:900, color:C.text, margin:0 }}>Welcome back, Shlok! 👋</h1>
        <p style={{ color:C.textMuted, fontSize:13, margin:"4px 0 0" }}>Here's what's happening with your events.</p>
      </div>
      <Btn>+ New Event</Btn>
    </div>
    <GoogleCalendarCard connected={true} />
    <div style={{ display:"grid", gridTemplateColumns:"3fr 2fr", gap:16, marginBottom:16 }}>
      <MiniCalendar/>
      <Card>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
          <span style={{ fontWeight:800, fontSize:14, color:C.text }}>Today's Events</span>
          <span style={{ color:C.teal, fontSize:12, cursor:"pointer", fontWeight:700 }}>View calendar</span>
        </div>
        <div style={{ fontWeight:900, fontSize:22, color:C.text, marginBottom:14 }}>1 event today</div>
        <div style={{ padding:"12px 14px", background:C.bg, borderRadius:10, borderLeft:`3px solid ${C.teal}` }}>
          <div style={{ fontWeight:700, fontSize:13, color:C.text }}>Youth Literacy Drive</div>
          <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>10:00 AM • Barangay Hall, Cebu</div>
          <div style={{ marginTop:6 }}><StatusBadge status="Ongoing"/></div>
        </div>
      </Card>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:12, marginBottom:16 }}>
      <StatCard icon="📋" value="12" label="Total Events" accent={C.teal}/>
      <StatCard icon="🕐" value="4" label="Planned" accent={C.blue}/>
      <StatCard icon="📈" value="3" label="Ongoing" accent={C.amber}/>
      <StatCard icon="✅" value="5" label="Completed" accent={C.green}/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginBottom:16 }}>
      <Card>
        <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Events by Status</div>
        <div style={{ display:"flex", justifyContent:"center" }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.greyLight} strokeWidth="22"/>
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.green} strokeWidth="22" strokeDasharray="150 151" strokeDashoffset="0" transform="rotate(-90 65 65)"/>
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.blue} strokeWidth="22" strokeDasharray="100 201" strokeDashoffset="-150" transform="rotate(-90 65 65)"/>
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.amber} strokeWidth="22" strokeDasharray="51 250" strokeDashoffset="-250" transform="rotate(-90 65 65)"/>
          </svg>
        </div>
        <div style={{ display:"flex", gap:10, justifyContent:"center", flexWrap:"wrap", marginTop:8 }}>
          {[["Planned",C.blue],["Ongoing",C.amber],["Completed",C.green]].map(([l,c])=>(
            <span key={l} style={{ fontSize:11, color:C.textMuted, display:"flex", alignItems:"center", gap:4 }}>
              <span style={{ width:8, height:8, borderRadius:"50%", background:c, display:"inline-block" }}/>{l}
            </span>
          ))}
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Events per Month</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:110 }}>
          {[1,0,2,0,3,5,4,2,0,1,3,2].map((v,i)=>(
            <div key={i} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
              <div style={{ width:"100%", height:`${v*20}px`, background:v>0?C.teal:C.greyLight, borderRadius:"4px 4px 0 0", minHeight:4 }}/>
              <span style={{ fontSize:9, color:C.textMuted }}>{"JFMAMJJASOND"[i]}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
      <h2 style={{ fontWeight:800, fontSize:15, color:C.text, margin:0 }}>Upcoming This Week</h2>
      <span style={{ color:C.teal, fontSize:12, cursor:"pointer", fontWeight:700 }}>View all</span>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
      <EventCard title="Youth Literacy Workshop" status="Planned" category="Workshop" date="Mar 9, 2026" location="Barangay Hall" assignees={3} onClick={()=>onNav("event-detail")}/>
      <EventCard title="Field Outreach Drive" status="Ongoing" category="Outreach" date="Mar 8, 2026" location="Cebu City" photos={2} assignees={5} onClick={()=>onNav("event-detail")}/>
      <EventCard title="Staff Training Day" status="Planned" category="Training" date="Mar 12, 2026" location="Main Office" assignees={8} onClick={()=>onNav("event-detail")}/>
    </div>
  </div>
);

const EventsPage = ({ onNav }) => {
  const [filter,setFilter]=useState("All");
  const events=[{title:"Youth Literacy Workshop",status:"Planned",category:"Workshop",date:"Mar 9, 2026",location:"Barangay Hall",assignees:3},{title:"Field Outreach Drive",status:"Ongoing",category:"Outreach",date:"Mar 8, 2026",location:"Cebu City",photos:2,assignees:5},{title:"Staff Training Day",status:"Planned",category:"Training",date:"Mar 12, 2026",location:"Main Office",assignees:8},{title:"Community Meeting",status:"Completed",category:"Meeting",date:"Mar 1, 2026",location:"Town Hall",photos:4,assignees:6},{title:"Sports Fest",status:"Completed",category:"Sports",date:"Feb 28, 2026",location:"City Park",photos:10,assignees:12},{title:"Annual Seminar",status:"Cancelled",category:"Seminar",date:"Mar 5, 2026",location:"Conference Room",assignees:15}];
  const filtered=filter==="All"?events:events.filter(e=>e.status===filter);
  return(
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div/>
        <Btn>+ New Event</Btn>
      </div>
      <div style={{ display:"flex", gap:10, marginBottom:16, alignItems:"center" }}>
        <input placeholder="🔍  Search events..." style={{ flex:1, borderRadius:9, border:`1.5px solid ${C.border}`, padding:"9px 13px", fontSize:13, background:C.bg, outline:"none" }}/>
      </div>
      <div style={{ display:"flex", gap:8, marginBottom:20, flexWrap:"wrap" }}>
        {["All","Planned","Ongoing","Completed","Cancelled"].map(s=>(
          <button key={s} onClick={()=>setFilter(s)} style={{ padding:"5px 14px", borderRadius:99, fontSize:12, fontWeight:700, cursor:"pointer", border:filter===s?"none":`1.5px solid ${C.border}`, background:filter===s?C.teal:C.card, color:filter===s?"#fff":C.textMuted }}>
            {s}
          </button>
        ))}
        <span style={{ marginLeft:"auto", fontSize:12, color:C.textMuted, alignSelf:"center" }}>{filtered.length} events</span>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:14 }}>
        {filtered.map((ev,i)=><EventCard key={i} {...ev} onClick={()=>onNav("event-detail")}/>)}
      </div>
    </div>
  );
};

const CalendarPage = () => {
  const [view,setView]=useState("Month");
  const days=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const eventDays={8:[C.teal],9:[C.purple],12:[C.orange,C.blue],15:[C.green],18:[C.teal],20:[C.amber,C.blue],25:[C.green]};
  const cells=[null,null,null,null,null,null,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26,27,28,29,30,31,null];
  return(
    <div>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
        <div style={{ display:"flex", alignItems:"center", gap:12 }}>
          <span style={{ fontWeight:900, fontSize:20, color:C.text }}>March 2026</span>
          <div style={{ display:"flex", gap:4 }}>
            <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:16 }}>‹</Btn>
            <Btn variant="ghost" style={{ padding:"4px 10px", fontSize:16 }}>›</Btn>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          <button style={{ background:C.tealLight, color:C.tealDark, border:"none", borderRadius:99, padding:"6px 14px", fontSize:12, fontWeight:700, cursor:"pointer" }}>My Events</button>
          {["Month","Week","List"].map(v=>(
            <button key={v} onClick={()=>setView(v)} style={{ background:view===v?C.teal:C.card, color:view===v?"#fff":C.textMuted, border:`1px solid ${C.border}`, borderRadius:7, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:view===v?700:400 }}>{v}</button>
          ))}
        </div>
      </div>
      <Card style={{ padding:0, overflow:"hidden" }}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", borderBottom:`1px solid ${C.border}` }}>
          {days.map(d=><div key={d} style={{ padding:"12px 0", textAlign:"center", fontSize:12, fontWeight:700, color:C.teal }}>{d}</div>)}
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)" }}>
          {cells.map((d,i)=>{
            const evs=d?eventDays[d]:null;
            const isToday=d===8;
            return(
              <div key={i} style={{ minHeight:100, padding:8, borderRight:i%7!==6?`1px solid ${C.border}`:"none", borderBottom:i<cells.length-7?`1px solid ${C.border}`:"none", background:isToday?`${C.teal}08`:"transparent", cursor:d?"pointer":"default" }}>
                {d&&(
                  <>
                    <div style={{ width:26, height:26, borderRadius:"50%", background:isToday?C.teal:"transparent", color:isToday?"#fff":C.text, fontSize:12, fontWeight:isToday?700:400, display:"flex", alignItems:"center", justifyContent:"center", marginBottom:4 }}>{d}</div>
                    {evs&&(
                      <div style={{ display:"flex", flexDirection:"column", gap:2 }}>
                        {evs.slice(0,2).map((c,j)=>(
                          <div key={j} style={{ background:c+"22", borderLeft:`3px solid ${c}`, borderRadius:"0 4px 4px 0", padding:"2px 5px", fontSize:10, fontWeight:600, color:c }}>Event</div>
                        ))}
                        {evs.length>2&&<div style={{ fontSize:10, color:C.textMuted }}>+{evs.length-2} more</div>}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <div style={{ display:"flex", gap:12, flexWrap:"wrap", marginTop:14 }}>
        {Object.entries(CATEGORY_COLORS).map(([cat,color])=>(
          <span key={cat} style={{ display:"flex", alignItems:"center", gap:5, fontSize:11, color:C.textMuted }}>
            <span style={{ width:10, height:10, borderRadius:3, background:color, display:"inline-block" }}/>{cat}
          </span>
        ))}
      </div>
    </div>
  );
};

const EventDetailPage = ({ onBack }) => (
  <div style={{ maxWidth:760, margin:"0 auto" }}>
    <button onClick={onBack} style={{ background:C.greyLight, border:"none", borderRadius:9, padding:"7px 14px", cursor:"pointer", fontSize:13, fontWeight:600, color:C.textMuted, marginBottom:18, display:"flex", alignItems:"center", gap:6 }}>‹ Back</button>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:16 }}>
      <div>
        <h1 style={{ fontSize:24, fontWeight:900, color:C.text, margin:"0 0 10px" }}>Youth Literacy Workshop</h1>
        <div style={{ display:"flex", gap:8 }}><StatusBadge status="Planned"/><CategoryTag category="Workshop"/></div>
      </div>
      <div style={{ display:"flex", gap:8 }}>
        <Btn variant="outline">✏️ Edit</Btn>
        <Btn variant="danger">🗑 Delete</Btn>
      </div>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"2fr 1fr", gap:14 }}>
      <div>
        <Card style={{ marginBottom:12 }}>
          <p style={{ color:C.textMuted, fontSize:14, margin:0, lineHeight:1.7 }}>A hands-on workshop designed to improve reading and writing skills among youth in rural communities. Volunteers will work in small groups with participants aged 10–18.</p>
        </Card>
        <Card style={{ marginBottom:12 }}>
          {[["📅","Starts","Mon, Mar 9, 2026, 10:00 AM"],["📅","Ends","Mon, Mar 9, 2026, 4:00 PM"],["📍","Location","Barangay Hall, Cebu City"],["👥","Assigned","3 members assigned"]].map(([icon,label,val],i)=>(
            <div key={i} style={{ display:"flex", gap:12, padding:"9px 0", borderBottom:i<3?`1px solid ${C.border}`:"none" }}>
              <span style={{ fontSize:16 }}>{icon}</span>
              <div><div style={{ fontSize:11, color:C.textMuted }}>{label}</div><div style={{ fontSize:13, fontWeight:600, color:C.text }}>{val}</div></div>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontWeight:800, fontSize:14, color:C.text }}>Photos (2)</div>
            <Btn variant="outline" style={{ fontSize:12 }}>📷 Upload Photo</Btn>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:10 }}>
            {[C.teal,C.blue].map((c,i)=>(
              <div key={i} style={{ height:90, borderRadius:10, background:`${c}18`, border:`1px solid ${c}30`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:22 }}>🖼️</div>
            ))}
            <div style={{ height:90, borderRadius:10, border:`2px dashed ${C.border}`, display:"flex", alignItems:"center", justifyContent:"center", color:C.textMuted, fontSize:12, cursor:"pointer" }}>+ Add</div>
          </div>
        </Card>
        <div style={{ display:"flex", gap:8, marginBottom:12 }}>
          {["#literacy","#youth","#community"].map(t=>(
            <span key={t} style={{ background:C.greyLight, color:C.textMuted, borderRadius:99, padding:"3px 10px", fontSize:12 }}>{t}</span>
          ))}
        </div>
        <Card style={{ border:`1px solid ${C.redLight}` }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div><div style={{ fontWeight:700, fontSize:13, color:C.red }}>Cancel Event</div><div style={{ fontSize:11, color:C.textMuted }}>Admin only — logged permanently</div></div>
            <Btn variant="danger" style={{ fontSize:12 }}>Cancel Event</Btn>
          </div>
        </Card>
      </div>
      <div>
        <Card style={{ marginBottom:12 }}>
          <div style={{ display:"flex", justifyContent:"space-between", marginBottom:12 }}>
            <div><div style={{ fontSize:11, color:C.textMuted }}>Enrollment</div><div style={{ fontSize:14, fontWeight:800, color:C.text }}>Open</div></div>
            <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:C.textMuted }}>Capacity</div><div style={{ fontSize:14, fontWeight:800, color:C.text }}>3 / 15</div></div>
          </div>
          <Btn style={{ width:"100%", justifyContent:"center", padding:"10px 0" }}>👤+ Request to Join</Btn>
        </Card>
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:13, color:C.text, marginBottom:12 }}>Attendees (3)</div>
          {[["Maria Santos",C.teal,"assigned"],["John Doe",C.blue,"assigned"],["Jane Smith",C.purple,"enrolled"]].map(([name,color,type])=>(
            <div key={name} style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
              <Avatar name={name} size={30} color={color}/>
              <div><div style={{ fontSize:12, fontWeight:600, color:C.text }}>{name}</div><div style={{ fontSize:10, color:C.textMuted }}>{type}</div></div>
            </div>
          ))}
        </Card>
        <Card style={{ marginBottom:12 }}>
          <div style={{ fontWeight:800, fontSize:13, color:C.text, marginBottom:10 }}>Google Calendar</div>
          <div style={{ fontSize:12, color:C.textMuted, marginBottom:10 }}>Export this event to your calendar</div>
          <Btn variant="outline" style={{ width:"100%", justifyContent:"center", fontSize:12 }}>↗ Export Event</Btn>
        </Card>
        <Card>
          <div style={{ fontWeight:800, fontSize:13, color:C.text, marginBottom:10 }}>Status History</div>
          {[{status:"Planned",by:"System",date:"Mar 1"},{status:"Ongoing",by:"System",date:"Mar 9"}].map((h,i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"6px 0", borderBottom:i<1?`1px solid ${C.border}`:"none" }}>
              <StatusBadge status={h.status}/>
              <div style={{ textAlign:"right" }}><div style={{ fontSize:11, color:C.textMuted }}>{h.by}</div><div style={{ fontSize:10, color:C.textMuted }}>{h.date}</div></div>
            </div>
          ))}
        </Card>
      </div>
    </div>
  </div>
);

const CreateEventPage = ({ onBack }) => (
  <div style={{ maxWidth:680, margin:"0 auto" }}>
    <button onClick={onBack} style={{ background:C.greyLight, border:"none", borderRadius:9, padding:"7px 14px", cursor:"pointer", fontSize:13, fontWeight:600, color:C.textMuted, marginBottom:18, display:"flex", alignItems:"center", gap:6 }}>‹ Back</button>
    <Card>
      <h2 style={{ margin:"0 0 20px", fontSize:18, fontWeight:900, color:C.text }}>New Event</h2>
      {[["Event Title *","text","e.g. Youth Literacy Workshop"],["Location","text","e.g. Barangay Hall, Cebu City"]].map(([label,type,ph])=>(
        <div key={label} style={{ marginBottom:14 }}>
          <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>{label}</label>
          <input type={type} placeholder={ph} style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box" }}/>
        </div>
      ))}
      <div style={{ marginBottom:14 }}>
        <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>Description</label>
        <textarea rows={3} placeholder="What is this event about?" style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box", resize:"vertical" }}/>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {[["Start Date & Time *","datetime-local"],["End Date & Time *","datetime-local"]].map(([label,type])=>(
          <div key={label} style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>{label}</label>
            <input type={type} style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box" }}/>
          </div>
        ))}
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
        {[["Category",Object.keys(CATEGORY_COLORS)],["Priority",["Low","Medium","High"]]].map(([label,opts])=>(
          <div key={label} style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>{label}</label>
            <select style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box" }}>
              {opts.map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
        ))}
      </div>
      <div style={{ borderTop:`1px solid ${C.border}`, paddingTop:16, marginTop:4, marginBottom:16 }}>
        <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Enrollment Settings</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 }}>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>Enrollment Type</label>
            <select style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box" }}>
              {["Assigned Only","Open Enrollment","Both"].map(o=><option key={o}>{o}</option>)}
            </select>
          </div>
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>Max Attendees (0 = unlimited)</label>
            <input type="number" placeholder="0" style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box" }}/>
          </div>
        </div>
        <div style={{ marginBottom:14 }}>
          <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>Assign To</label>
          <input placeholder="🔍  Search users to assign..." style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box", marginBottom:8 }}/>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {["Maria Santos","John Doe"].map(n=>(
              <div key={n} style={{ display:"flex", alignItems:"center", gap:5, background:C.tealLight, borderRadius:99, padding:"4px 10px 4px 5px" }}>
                <Avatar name={n} size={18} color={C.teal}/>
                <span style={{ fontSize:11, fontWeight:700, color:C.tealDark }}>{n}</span>
                <span style={{ color:C.teal, fontSize:14, cursor:"pointer" }}>×</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div style={{ marginBottom:16 }}>
        <label style={{ fontSize:13, fontWeight:700, color:C.text, display:"block", marginBottom:6 }}>Tags (comma-separated)</label>
        <input placeholder="e.g. literacy, youth, community" style={{ width:"100%", borderRadius:9, border:`1.5px solid ${C.border}`, padding:"10px 12px", fontSize:13, background:C.bg, outline:"none", boxSizing:"border-box" }}/>
      </div>
      <div style={{ display:"flex", gap:10, justifyContent:"flex-end" }}>
        <Btn variant="outline" onClick={onBack}>Cancel</Btn>
        <Btn>Create Event</Btn>
      </div>
    </Card>
  </div>
);

const ProfilePage = () => (
  <div style={{ maxWidth:800, margin:"0 auto" }}>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 2fr", gap:16, marginBottom:16 }}>
      <Card style={{ textAlign:"center", paddingTop:28, paddingBottom:24 }}>
        <div style={{ position:"relative", display:"inline-block", marginBottom:14 }}>
          <div style={{ width:80, height:80, borderRadius:"50%", background:`${C.teal}20`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:30, fontWeight:900, color:C.teal, border:`2px solid ${C.teal}40`, margin:"0 auto" }}>S</div>
          <div style={{ position:"absolute", bottom:0, right:0, width:24, height:24, borderRadius:"50%", background:C.teal, display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, color:"#fff", cursor:"pointer" }}>📷</div>
        </div>
        <div style={{ fontWeight:900, fontSize:18, color:C.text }}>Shlok Dwivedi</div>
        <div style={{ fontSize:12, color:C.textMuted, marginTop:3 }}>shlok@ngo.org</div>
        <div style={{ display:"flex", gap:6, justifyContent:"center", marginTop:10 }}>
          <span style={{ background:C.tealLight, color:C.tealDark, borderRadius:99, padding:"3px 12px", fontSize:11, fontWeight:800 }}>Admin</span>
          <span style={{ background:C.greyLight, color:C.textMuted, borderRadius:99, padding:"3px 12px", fontSize:11 }}>Education</span>
        </div>
        <div style={{ fontSize:12, color:C.textMuted, marginTop:12, lineHeight:1.6 }}>Passionate about education and community development.</div>
        <div style={{ fontSize:11, color:C.textMuted, marginTop:8 }}>📞 +91 98765 43210</div>
        <Btn variant="outline" style={{ marginTop:14, fontSize:12 }}>✏️ Edit Profile</Btn>
      </Card>
      <div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10, marginBottom:14 }}>
          {[["📋","18","Events Assigned",C.teal],["✅","12","Completed",C.green],["📷","34","Photos",C.blue],["📅","Jan 2024","Member Since",C.purple]].map(([icon,val,label,accent])=>(
            <Card key={label} style={{ display:"flex", alignItems:"center", gap:10, padding:14 }}>
              <div style={{ width:36, height:36, borderRadius:9, background:accent+"18", display:"flex", alignItems:"center", justifyContent:"center", fontSize:16 }}>{icon}</div>
              <div><div style={{ fontSize:18, fontWeight:900, color:C.text, lineHeight:1 }}>{val}</div><div style={{ fontSize:11, color:C.textMuted, marginTop:2 }}>{label}</div></div>
            </Card>
          ))}
        </div>
        <Card>
          <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:12 }}>Notification Preferences</div>
          {[["Email notifications",true],["Push notifications",true],["When assigned to event",true],["Event status changes",false],["24hr reminders",true]].map(([label,on],i)=>(
            <div key={i} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"9px 0", borderBottom:i<4?`1px solid ${C.border}`:"none" }}>
              <span style={{ fontSize:13, color:C.text }}>{label}</span>
              <Toggle on={on}/>
            </div>
          ))}
        </Card>
      </div>
    </div>
    <Card style={{ marginBottom:16 }}>
      <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>My Events</div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10 }}>
        {[{title:"Youth Workshop",status:"Planned",date:"Mar 9",cat:"Workshop"},{title:"Field Outreach",status:"Ongoing",date:"Mar 8",cat:"Outreach"},{title:"Team Meeting",status:"Completed",date:"Mar 1",cat:"Meeting"}].map((ev,i)=>(
          <div key={i} style={{ padding:"10px 12px", background:C.bg, borderRadius:10, cursor:"pointer" }}>
            <div style={{ display:"flex", justifyContent:"space-between", marginBottom:6 }}>
              <CategoryTag category={ev.cat}/><StatusBadge status={ev.status}/>
            </div>
            <div style={{ fontWeight:700, fontSize:13, color:C.text }}>{ev.title}</div>
            <div style={{ fontSize:11, color:C.textMuted, marginTop:3 }}>{ev.date}</div>
          </div>
        ))}
      </div>
    </Card>
  </div>
);

const UsersPage = () => (
  <div>
    <Card style={{ padding:0, overflow:"hidden" }}>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr style={{ background:C.bg }}>
            {["User","Email","Department","Assign Role","Current Role",""].map(h=>(
              <th key={h} style={{ padding:"13px 16px", textAlign:"left", fontSize:12, fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {[{name:"Shlok Dwivedi",email:"shlok@ngo.org",dept:"Education",role:"admin",color:C.teal},{name:"Priya Sharma",email:"priya@ngo.org",dept:"Field Team",role:"staff",color:C.blue},{name:"Arjun Patel",email:"arjun@ngo.org",dept:"Outreach",role:"volunteer",color:C.purple},{name:"Sneha Rao",email:"sneha@ngo.org",dept:"Finance",role:"viewer",color:C.orange}].map((u,i)=>(
            <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
              <td style={{ padding:"13px 16px" }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <Avatar name={u.name} size={32} color={u.color}/>
                  <span style={{ fontSize:13, fontWeight:700, color:C.text }}>{u.name}</span>
                </div>
              </td>
              <td style={{ padding:"13px 16px", fontSize:12, color:C.textMuted }}>{u.email}</td>
              <td style={{ padding:"13px 16px", fontSize:12, color:C.textMuted }}>{u.dept}</td>
              <td style={{ padding:"13px 16px" }}>
                <select defaultValue={u.role} style={{ borderRadius:7, border:`1px solid ${C.border}`, padding:"6px 10px", fontSize:12, color:C.text, background:C.bg }}>
                  {["admin","staff","volunteer","viewer"].map(r=><option key={r}>{r}</option>)}
                </select>
              </td>
              <td style={{ padding:"13px 16px" }}>
                <span style={{ background:{admin:C.tealLight,staff:C.blueLight,volunteer:C.amberLight,viewer:C.greyLight}[u.role], color:{admin:C.tealDark,staff:C.blue,volunteer:C.amber,viewer:C.grey}[u.role], borderRadius:99, padding:"3px 10px", fontSize:11, fontWeight:800, textTransform:"capitalize" }}>{u.role}</span>
              </td>
              <td style={{ padding:"13px 16px" }}>
                <div style={{ display:"flex", gap:6 }}>
                  <Btn style={{ fontSize:11, padding:"4px 10px" }}>Assign</Btn>
                  <Btn variant="outline" style={{ fontSize:11, padding:"4px 10px" }}>View Profile</Btn>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

const ReportsPage = () => (
  <div>
    <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:16 }}>
      <StatCard icon="🕐" value="4" label="Planned" accent={C.blue}/>
      <StatCard icon="📈" value="3" label="Ongoing" accent={C.amber}/>
      <StatCard icon="✅" value="5" label="Completed" accent={C.green}/>
    </div>
    <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16, marginBottom:16 }}>
      <Card>
        <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Events by Status</div>
        <div style={{ display:"flex", justifyContent:"center" }}>
          <svg width="130" height="130" viewBox="0 0 130 130">
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.green} strokeWidth="22" strokeDasharray="150 151" strokeDashoffset="0" transform="rotate(-90 65 65)"/>
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.blue} strokeWidth="22" strokeDasharray="100 201" strokeDashoffset="-150" transform="rotate(-90 65 65)"/>
            <circle cx="65" cy="65" r="48" fill="none" stroke={C.amber} strokeWidth="22" strokeDasharray="51 250" strokeDashoffset="-250" transform="rotate(-90 65 65)"/>
          </svg>
        </div>
      </Card>
      <Card>
        <div style={{ fontWeight:800, fontSize:14, color:C.text, marginBottom:14 }}>Events by Category</div>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {[["Workshop",4,C.purple],["Training",3,C.blue],["Outreach",3,C.orange],["Meeting",2,C.teal],["Sports",2,"#16a34a"]].map(([cat,count,color])=>(
            <div key={cat} style={{ display:"flex", alignItems:"center", gap:10 }}>
              <span style={{ fontSize:12, color:C.textMuted, width:100 }}>{cat}</span>
              <div style={{ flex:1, height:8, background:C.greyLight, borderRadius:4 }}>
                <div style={{ height:"100%", width:`${count*20}%`, background:color, borderRadius:4 }}/>
              </div>
              <span style={{ fontSize:12, fontWeight:700, color:C.text, width:16 }}>{count}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
    <Card>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
        <div style={{ fontWeight:800, fontSize:14, color:C.text }}>All Events</div>
        <div style={{ display:"flex", gap:8 }}>
          <Btn variant="outline" style={{ fontSize:12 }}>📄 Export PDF</Btn>
          <Btn variant="outline" style={{ fontSize:12 }}>📊 Export CSV</Btn>
        </div>
      </div>
      <table style={{ width:"100%", borderCollapse:"collapse" }}>
        <thead>
          <tr>{["Title","Category","Status","Start Date","Assigned"].map(h=><th key={h} style={{ padding:"9px 12px", textAlign:"left", fontSize:12, fontWeight:700, color:C.textMuted, borderBottom:`1px solid ${C.border}` }}>{h}</th>)}</tr>
        </thead>
        <tbody>
          {[["Youth Literacy Workshop","Workshop","Planned","Mar 9, 2026",3],["Field Outreach Drive","Outreach","Ongoing","Mar 8, 2026",5],["Staff Training","Training","Planned","Mar 12, 2026",8],["Community Meeting","Meeting","Completed","Mar 1, 2026",6]].map(([title,cat,status,date,assigned],i)=>(
            <tr key={i} style={{ borderBottom:`1px solid ${C.border}` }}>
              <td style={{ padding:"10px 12px", fontSize:13, fontWeight:600, color:C.text }}>{title}</td>
              <td style={{ padding:"10px 12px" }}><CategoryTag category={cat}/></td>
              <td style={{ padding:"10px 12px" }}><StatusBadge status={status}/></td>
              <td style={{ padding:"10px 12px", fontSize:12, color:C.textMuted }}>{date}</td>
              <td style={{ padding:"10px 12px", fontSize:12, color:C.textMuted }}>👥 {assigned}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  </div>
);

// ── APP ────────────────────────────────────────────────────────
const PAGES = {
  login: { title: "", comp: null },
  dashboard: { title: "Dashboard" },
  events: { title: "Events" },
  calendar: { title: "Calendar" },
  "event-detail": { title: "Event Detail" },
  "create-event": { title: "Create Event" },
  profile: { title: "My Profile" },
  users: { title: "User Management" },
  reports: { title: "Reports & Analytics" },
};

export default function App() {
  const [page,setPage]=useState("dashboard");
  const [prev,setPrev]=useState("dashboard");
  const [showNotif,setShowNotif]=useState(false);

  const nav=(to)=>{ setPrev(page); setPage(to); };
  const back=()=>setPage(prev);

  if(page==="login") return(
    <div>
      <div style={{ position:"fixed", top:12, left:"50%", transform:"translateX(-50%)", zIndex:999, display:"flex", gap:6 }}>
        {Object.keys(PAGES).map(p=>(
          <button key={p} onClick={()=>nav(p)} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:page===p?C.teal:C.card, color:page===p?"#fff":C.textMuted, fontSize:11, cursor:"pointer", fontWeight:600, boxShadow:"0 1px 4px rgba(0,0,0,0.1)" }}>{p}</button>
        ))}
      </div>
      <LoginPage/>
    </div>
  );

  const renderPage=()=>{
    switch(page){
      case "dashboard": return <DashboardPage onNav={nav}/>;
      case "events": return <EventsPage onNav={nav}/>;
      case "calendar": return <CalendarPage/>;
      case "event-detail": return <EventDetailPage onBack={back}/>;
      case "create-event": return <CreateEventPage onBack={back}/>;
      case "profile": return <ProfilePage/>;
      case "users": return <UsersPage/>;
      case "reports": return <ReportsPage/>;
      default: return <DashboardPage onNav={nav}/>;
    }
  };

  return(
    <div style={{ display:"flex", background:C.bg, minHeight:"100vh", fontFamily:"'DM Sans','Segoe UI',sans-serif" }}>
      <Sidebar active={page} onNav={nav} onNotif={()=>setShowNotif(!showNotif)}/>
      {showNotif&&<NotifDrawer onClose={()=>setShowNotif(false)}/>}
      <div style={{ flex:1, marginLeft:230, minHeight:"100vh" }}>
        <div style={{ position:"fixed", top:0, left:230, right:0, zIndex:99, background:`${C.card}f0`, backdropFilter:"blur(10px)", borderBottom:`1px solid ${C.border}`, padding:"12px 32px", display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <h1 style={{ margin:0, fontSize:18, fontWeight:900, color:C.text }}>{PAGES[page]?.title}</h1>
          <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
            {Object.keys(PAGES).map(p=>(
              <button key={p} onClick={()=>nav(p)} style={{ padding:"4px 10px", borderRadius:6, border:"none", background:page===p?C.teal:C.greyLight, color:page===p?"#fff":C.textMuted, fontSize:11, cursor:"pointer", fontWeight:page===p?700:500 }}>{p}</button>
            ))}
          </div>
        </div>
        <div style={{ padding:"76px 32px 32px" }}>
          {renderPage()}
        </div>
      </div>
    </div>
  );
}

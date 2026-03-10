import { useEffect, useState, useMemo, useCallback } from "react";
import React from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Calendar as BigCalendar, dateFnsLocalizer, SlotInfo } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, toDate } from "date-fns";
import { enUS } from "date-fns/locale";
import { collection, query, onSnapshot } from "firebase/firestore";
import { List, Grid3X3, Clock, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FirestoreEvent } from "@/types";
import Layout from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { CATEGORY_COLORS, getCategoryColor } from "@/lib/constants";

const locales = { "en-US": enUS };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: { status: string; category: string; eventId: string };
}

type CalendarView = "month" | "week" | "agenda";

export default function CalendarPage() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState<FirestoreEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<CalendarView>("month"); // Always default month — never force agenda
  const [myEventsOnly, setMyEventsOnly] = useState(false);
  const [date, setDate] = useState<Date>(new Date());

  useEffect(() => {
    const dateParam = searchParams.get("date");
    if (dateParam) {
      const parsed = new Date(dateParam);
      if (!isNaN(parsed.getTime())) setDate(parsed);
    }
  }, [searchParams]);

  useEffect(() => {
    const q = query(collection(db, "events"));
    const unsub = onSnapshot(q, (snap) => {
      setEvents(snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEvent)));
      setLoading(false);
    }, () => setLoading(false));
    return () => unsub();
  }, []);

  const calendarEvents = useMemo(() => {
    return events
      .filter((e) => {
        if (myEventsOnly && user?.uid) {
          return e.assignedTo?.includes(user.uid) || e.createdBy === user.uid;
        }
        return true;
      })
      .map((e): CalendarEvent => ({
        id: e.id,
        title: e.title,
        start: toDate(new Date(e.startDate)),
        end: toDate(new Date(e.endDate)),
        resource: { status: e.status || "Planned", category: e.category || "", eventId: e.id },
      }));
  }, [events, myEventsOnly, user?.uid]);

  const eventsByDate = useMemo(() => {
    const map: Record<string, number> = {};
    events.forEach((e) => {
      const key = format(new Date(e.startDate), "yyyy-MM-dd");
      map[key] = (map[key] || 0) + 1;
    });
    return map;
  }, [events]);

  const handleSelectEvent = useCallback((event: CalendarEvent) => {
    navigate(`/events/${event.resource.eventId}`);
  }, [navigate]);

  const handleSelectSlot = useCallback((slotInfo: SlotInfo) => {
    if (role !== "admin" && role !== "staff") return;
    navigate(`/events/create?startDate=${encodeURIComponent(format(slotInfo.start, "yyyy-MM-dd'T'HH:mm"))}`);
  }, [role, navigate]);

  const handleNavigate = useCallback((newDate: Date) => {
    setDate(newDate);
    setSearchParams({ date: newDate.toISOString() });
  }, [setSearchParams]);

  const eventStyleGetter = useCallback((event: CalendarEvent) => ({
    style: {
      backgroundColor: getCategoryColor(event.resource.category),
      borderRadius: "6px",
      opacity: 0.9,
      color: "white",
      border: "none",
      fontSize: "12px",
      padding: "2px 6px",
    },
  }), []);

  if (loading) {
    return (
      <Layout title="Calendar">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Calendar">
      {/* Self-contained rbc styles — no external CSS import needed */}
      <style>{`
        .rbc-calendar { box-sizing: border-box; height: 100%; display: flex; flex-direction: column; align-items: stretch; background: transparent; color: hsl(var(--foreground)); }
        .rbc-calendar *, .rbc-calendar *:before, .rbc-calendar *:after { box-sizing: inherit; }
        .rbc-abs-full, .rbc-row-bg { overflow: hidden; position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
        .rbc-ellipsis, .rbc-show-more, .rbc-row-segment .rbc-event-content, .rbc-events-container .rbc-event-content { display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .rbc-rtl { direction: rtl; }
        .rbc-off-range { color: rgba(255,255,255,0.3); }
        .rbc-off-range-bg { background: rgba(0,0,0,0.25); }
        .rbc-header { overflow: hidden; flex: 1 0 0%; text-overflow: ellipsis; white-space: nowrap; padding: 8px 4px; text-align: center; font-weight: 600; font-size: 12px; color: hsl(var(--muted-foreground)); border-bottom: 1px solid rgba(255,255,255,0.06); background: rgba(139,92,246,0.08); }
        .rbc-header + .rbc-header { border-left: 1px solid rgba(255,255,255,0.06); }
        .rbc-rtl .rbc-header + .rbc-header { border-left-width: 0; border-right: 1px solid rgba(255,255,255,0.06); }
        .rbc-header > a, .rbc-header > a:active, .rbc-header > a:visited { color: inherit; text-decoration: none; }
        .rbc-button-link { color: hsl(var(--foreground)); background: none; margin: 0; padding: 0; border: none; cursor: pointer; user-select: text; }
        .rbc-row-content { position: relative; user-select: none; z-index: 4; }
        .rbc-row-content-scrollable { display: flex; flex-direction: column; height: 100%; }
        .rbc-row-content-scrollable .rbc-row-content-scroll-container { height: 100%; overflow-y: scroll; }
        .rbc-today { background: rgba(139,92,246,0.10); }
        .rbc-toolbar { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; margin-bottom: 10px; font-size: 14px; gap: 8px; }
        .rbc-toolbar .rbc-toolbar-label { flex-grow: 1; padding: 0 10px; text-align: center; font-weight: 700; font-size: 16px; color: hsl(var(--foreground)); }
        .rbc-toolbar button { color: hsl(var(--foreground)); background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; cursor: pointer; transition: all 0.2s; font-size: 13px; }
        .rbc-toolbar button:hover { background: rgba(139,92,246,0.2); border-color: rgba(139,92,246,0.4); }
        .rbc-toolbar button:focus { outline: 2px solid rgba(139,92,246,0.5); outline-offset: 2px; }
        .rbc-toolbar button.rbc-active { background: rgba(139,92,246,0.35) !important; border-color: rgba(139,92,246,0.6) !important; color: white !important; }
        .rbc-toolbar button.rbc-active:hover { background: rgba(139,92,246,0.45) !important; }
        .rbc-btn-group { display: inline-flex; gap: 2px; }
        .rbc-slot-selecting .rbc-slot-selection { z-index: 10; position: absolute; cursor: default; background-color: rgba(139,92,246,0.2); color: white; font-size: 75%; width: 100%; padding: 3px; }
        .rbc-slot-selecting .rbc-event { cursor: inherit; pointer-events: none; }
        .rbc-event-label { font-size: 80%; }
        .rbc-event-overlaps { box-shadow: -1px 1px 5px rgba(0,0,0,0.5); }
        .rbc-event-continues-prior { border-top-left-radius: 0; border-bottom-left-radius: 0; }
        .rbc-event-continues-after { border-top-right-radius: 0; border-bottom-right-radius: 0; }
        .rbc-event-continues-earlier { border-top-left-radius: 0; border-top-right-radius: 0; }
        .rbc-event-continues-later { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
        .rbc-row { display: flex; flex-direction: row; }
        .rbc-row-segment { padding: 0 1px 1px 1px; }
        .rbc-selected-cell { background-color: rgba(139,92,246,0.15); }
        .rbc-show-more { z-index: 4; font-weight: bold; font-size: 85%; height: auto; line-height: normal; color: #8B5CF6; cursor: pointer; }
        .rbc-month-view { position: relative; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-direction: column; flex: 1 0 0; width: 100%; user-select: none; border-radius: 12px; overflow: hidden; }
        .rbc-month-header { display: flex; flex-direction: row; }
        .rbc-month-row { display: flex; position: relative; flex-direction: column; flex: 1 0 0; flex-basis: 0px; overflow: hidden; height: 100%; border-top: 1px solid rgba(255,255,255,0.06); }
        .rbc-month-row + .rbc-month-row { border-top: 1px solid rgba(255,255,255,0.06); }
        .rbc-date-cell { flex: 1 1 0; min-width: 0; padding: 4px 6px; text-align: right; font-size: 12px; color: hsl(var(--muted-foreground)); }
        .rbc-date-cell.rbc-now { font-weight: bold; }
        .rbc-date-cell.rbc-now .rbc-button-link { color: #8B5CF6; }
        .rbc-date-cell > a, .rbc-date-cell > a:active, .rbc-date-cell > a:visited { color: inherit; text-decoration: none; }
        .rbc-row-bg { display: flex; flex-direction: row; flex: 1 0 0; overflow: hidden; }
        .rbc-day-bg { flex: 1 0 0%; }
        .rbc-day-bg + .rbc-day-bg { border-left: 1px solid rgba(255,255,255,0.04); }
        .rbc-rtl .rbc-day-bg + .rbc-day-bg { border-left-width: 0; border-right: 1px solid rgba(255,255,255,0.04); }
        .rbc-overlay { position: absolute; z-index: 5; border: 1px solid rgba(255,255,255,0.1); background: rgba(15,12,41,0.95); backdrop-filter: blur(20px); border-radius: 12px; box-shadow: 0 8px 32px rgba(0,0,0,0.4); padding: 10px; }
        .rbc-overlay-header { border-bottom: 1px solid rgba(255,255,255,0.1); margin: -10px -10px 5px -10px; padding: 2px 10px; color: hsl(var(--foreground)); }
        .rbc-agenda-view { display: flex; flex-direction: column; flex: 1 0 0; overflow: auto; }
        .rbc-agenda-view table.rbc-agenda-table { width: 100%; border-collapse: collapse; border-spacing: 0; }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td { padding: 5px 10px; vertical-align: top; color: hsl(var(--foreground)); }
        .rbc-agenda-view table.rbc-agenda-table .rbc-agenda-time-cell { padding-left: 15px; padding-right: 15px; text-transform: lowercase; color: hsl(var(--muted-foreground)); }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td { border-left: 1px solid rgba(255,255,255,0.06); }
        .rbc-rtl .rbc-agenda-view table.rbc-agenda-table tbody > tr > td + td { border-left-width: 0; border-right: 1px solid rgba(255,255,255,0.06); }
        .rbc-agenda-view table.rbc-agenda-table tbody > tr + tr { border-top: 1px solid rgba(255,255,255,0.06); }
        .rbc-agenda-view table.rbc-agenda-table thead > tr > th { padding: 3px 5px; text-align: left; border-bottom: 1px solid rgba(255,255,255,0.06); color: hsl(var(--muted-foreground)); }
        .rbc-rtl .rbc-agenda-view table.rbc-agenda-table thead > tr > th { text-align: right; }
        .rbc-agenda-time-cell { text-transform: lowercase; }
        .rbc-agenda-time-cell .rbc-continues-after:after { content: ' \BB'; }
        .rbc-agenda-time-cell .rbc-continues-prior:before { content: '\AB  '; }
        .rbc-agenda-date-cell, .rbc-agenda-time-cell { white-space: nowrap; }
        .rbc-agenda-event-cell { width: 100%; }
        .rbc-time-column { display: flex; flex-direction: column; min-height: 100%; }
        .rbc-time-column .rbc-timeslot-group { flex: 1; }
        .rbc-timeslot-group { border-bottom: 1px solid rgba(255,255,255,0.04); min-height: 40px; display: flex; flex-flow: column nowrap; }
        .rbc-time-gutter, .rbc-header-gutter { flex: none; }
        .rbc-label { padding: 0 5px; font-size: 11px; color: hsl(var(--muted-foreground)); }
        .rbc-day-slot { position: relative; }
        .rbc-day-slot .rbc-events-container { bottom: 0; left: 0; position: absolute; right: 0; margin-right: 10px; top: 0; }
        .rbc-day-slot .rbc-events-container.rbc-rtl { left: 10px; right: 0; }
        .rbc-day-slot .rbc-event, .rbc-day-slot .rbc-background-event { border: 1px solid rgba(139,92,246,0.3); display: flex; max-height: 100%; min-height: 20px; flex-flow: column wrap; align-items: flex-start; overflow: hidden; position: absolute; }
        .rbc-day-slot .rbc-background-event { opacity: 0.75; }
        .rbc-day-slot .rbc-event-label { flex: none; padding-right: 5px; width: auto; }
        .rbc-day-slot .rbc-event-content { width: 100%; flex: 1 1 0; word-wrap: break-word; line-height: 1; height: 100%; min-height: 1em; }
        .rbc-day-slot .rbc-time-slot { border-top: 1px solid rgba(255,255,255,0.03); }
        .rbc-time-view-resources .rbc-time-gutter, .rbc-time-view-resources .rbc-time-header-gutter { position: sticky; left: 0; background-color: transparent; z-index: 10; }
        .rbc-time-header-content + .rbc-time-header-content { margin-left: -1px; }
        .rbc-time-content { display: flex; flex: 1 0 0%; align-items: flex-start; width: 100%; border-top: 1px solid rgba(255,255,255,0.06); overflow-y: auto; position: relative; }
        .rbc-time-content > .rbc-time-gutter { flex: none; }
        .rbc-time-content > * + * > * { border-left: 1px solid rgba(255,255,255,0.06); }
        .rbc-rtl .rbc-time-content > * + * > * { border-left-width: 0; border-right: 1px solid rgba(255,255,255,0.06); }
        .rbc-time-content > .rbc-day-slot { width: 100%; user-select: none; }
        .rbc-current-time-indicator { position: absolute; z-index: 3; left: 0; right: 0; height: 1px; background-color: #8B5CF6; pointer-events: none; }
        .rbc-event, .rbc-background-event { border: none; box-sizing: border-box; box-shadow: none; margin: 0; padding: 2px 5px; background-color: #8B5CF6; border-radius: 6px; color: #fff; cursor: pointer; width: 100%; text-align: left; font-size: 12px; }
        .rbc-event:focus, .rbc-background-event:focus { outline: 2px solid rgba(139,92,246,0.8); }
        .rbc-event.rbc-selected, .rbc-background-event.rbc-selected { background-color: rgba(139,92,246,0.8); }
        .rbc-time-view { display: flex; flex-direction: column; flex: 1; width: 100%; border: 1px solid rgba(255,255,255,0.08); min-height: 0; border-radius: 12px; overflow: hidden; }
        .rbc-time-view .rbc-time-gutter { white-space: nowrap; }
        .rbc-time-view .rbc-allday-cell { box-sizing: content-box; width: 100%; height: 100%; position: relative; }
        .rbc-time-view .rbc-allday-cell + .rbc-allday-cell { border-left: 1px solid rgba(255,255,255,0.06); }
        .rbc-time-view .rbc-allday-events { position: relative; z-index: 4; }
        .rbc-time-view .rbc-row { box-sizing: border-box; min-height: 20px; }
        .rbc-time-header { display: flex; flex: 0 0 auto; flex-direction: row; }
        .rbc-time-header.rbc-overflowing { border-right: 1px solid rgba(255,255,255,0.06); }
        .rbc-rtl .rbc-time-header.rbc-overflowing { border-right-width: 0; border-left: 1px solid rgba(255,255,255,0.06); }
        .rbc-time-header > .rbc-row:first-child { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .rbc-time-header > .rbc-row.rbc-row-resource { border-bottom: 1px solid rgba(255,255,255,0.06); }
        .rbc-time-header-cell-single-day { display: none; }
        .rbc-time-header-content { flex: 1; display: flex; min-width: 0; flex-direction: column; border-left: 1px solid rgba(255,255,255,0.06); }
        .rbc-rtl .rbc-time-header-content { border-left-width: 0; border-right: 1px solid rgba(255,255,255,0.06); }
      `}</style>

      <div className="p-4 md:p-6 space-y-4 animate-fade-in">

        {/* Page title */}
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar</h1>
          <p className="text-sm text-muted-foreground mt-0.5">View and manage your schedule</p>
        </div>

        {/* Status legend */}
        <div className="flex items-center gap-5">
          {([
            { label: "Completed", color: "#10B981" },
            { label: "Ongoing",   color: "#F59E0B" },
            { label: "Planned",   color: "#8B5CF6" },
          ]).map(s => (
            <div key={s.label} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
              <span className="text-sm text-muted-foreground">{s.label}</span>
            </div>
          ))}
        </div>

        {/* My Events toggle + view buttons */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Pill toggle */}
          <button
            onClick={() => setMyEventsOnly(!myEventsOnly)}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <div className={cn(
              "relative w-9 h-5 rounded-full transition-colors duration-200",
              myEventsOnly ? "bg-violet-600" : "bg-white/10"
            )}>
              <div className={cn(
                "absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200",
                myEventsOnly ? "translate-x-4" : "translate-x-0.5"
              )} />
            </div>
            My Events
          </button>

          {/* View toggle */}
          <div className="flex items-center gap-1 glass rounded-xl p-1">
            {([
              { v: "month",  label: "Month",  Icon: Grid3X3 },
              { v: "week",   label: "Week",   Icon: Clock },
              { v: "agenda", label: "Agenda", Icon: List },
            ] as { v: CalendarView; label: string; Icon: React.ElementType }[]).map(({ v, label, Icon }) => (
              <button
                key={v}
                onClick={() => setView(v)}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all",
                  view === v
                    ? "bg-violet-600 text-white shadow-sm"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/10"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Calendar — CSS scoped to .rbc-wrap to prevent global bleed */}
        <div className="glass-card rbc-wrap !rounded-2xl !p-4" style={{ minHeight: "calc(100vh - 200px)" }}>
          <BigCalendar
            localizer={localizer}
            events={calendarEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={(v) => setView(v as CalendarView)}
            date={date}
            onNavigate={handleNavigate}
            onSelectEvent={handleSelectEvent}
            onSelectSlot={handleSelectSlot}
            selectable={role === "admin" || role === "staff"}
            eventPropGetter={eventStyleGetter}
            style={{ height: "calc(100vh - 260px)", minHeight: 480 }}
            views={["month", "week", "agenda"]}
            popup
            showMultiDayTimes
            components={{
              toolbar: () => null,
              month: {
                dateHeader: ({ date }: { date: Date }) => {
                  const count = eventsByDate[format(date, "yyyy-MM-dd")] || 0;
                  return (
                    <div className="relative w-full h-full flex items-center justify-center">
                      <span className="text-sm">{format(date, "d")}</span>
                      {count > 0 && (
                        <span
                          className="absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-violet-600 text-[9px] text-white font-bold"
                          style={{ width: "14px", height: "14px" }}
                        >
                          {count > 9 ? "9+" : count}
                        </span>
                      )}
                    </div>
                  );
                },
              },
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Category:</span>
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
              {cat}
            </div>
          ))}
        </div>
      </div>
    </Layout>
  );
}

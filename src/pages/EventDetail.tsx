import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  doc, onSnapshot, updateDoc, arrayUnion, serverTimestamp,
  collection, addDoc, query, where, getDocs, deleteDoc,
} from "firebase/firestore";
import {
  MapPin, Calendar, Users, Edit, Loader2, ExternalLink, ImageIcon,
  Trash2, UserPlus, Clock, CheckCircle, XCircle, AlertTriangle,
  Ban, PlayCircle, Tag, Download,
} from "lucide-react";
import { db } from "@/lib/firebase";
import { deleteStorageFile } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import ActivityFeed from "@/components/ActivityFeed";
import { FirestoreEvent, EventPhoto, JoinRequest, Attendee, EnrollmentType } from "@/types";
import Layout from "@/components/layout/Layout";
import StatusBadge from "@/components/StatusBadge";
import PhotoUploader from "@/components/PhotoUploader";
import { cn, toIST } from "@/lib/utils";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  connectGoogleCalendar, createGoogleCalendarEvent,
  isGoogleCalendarConnected, updateLastSyncTime,
} from "@/lib/googleCalendar";
import { toDate } from "@/lib/utils";
import { getCategoryColor } from "@/lib/constants";
import { writeActivityLog } from "@/lib/activityLog";

const FLASK_BASE = import.meta.env.VITE_FLASK_API_URL || "";

async function downloadPhoto(url: string, filename?: string) {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    const ext = blob.type.split("/")[1] || "jpg";
    const name = filename || `photo.${ext}`;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.click();
    URL.revokeObjectURL(a.href);
  } catch {
    window.open(url, "_blank");
  }
}

function fmt(ts: number) {
  return toIST(ts).toLocaleString("en-IN", {
    weekday: "short", month: "short", day: "numeric",
    year: "numeric", hour: "2-digit", minute: "2-digit",
    timeZone: "Asia/Kolkata",
  });
}

export default function EventDetail() {
  const { id } = useParams<{ id: string }>();
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<FirestoreEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportMsg, setExportMsg] = useState<string | null>(null);
  const [lightboxPhoto, setLightboxPhoto] = useState<EventPhoto | null>(null);
  const [deletingPhotoUrl, setDeletingPhotoUrl] = useState<string | null>(null);
  const [deletingEvent, setDeletingEvent] = useState(false);
  const [userJoinRequest, setUserJoinRequest] = useState<JoinRequest | null>(null);
  const [requesting, setRequesting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    if (!id) { setLoading(false); return; }
    const unsub = onSnapshot(doc(db, "events", id), (snap) => {
      if (!snap.exists()) { setEvent(null); setLoading(false); return; }
      const data = { id: snap.id, ...snap.data() } as FirestoreEvent;
      const now = Date.now();
      const endMs = typeof data.endDate === "number" ? data.endDate : 0;
      if (endMs > 0 && endMs < now &&
          (data.status?.toLowerCase() === "planned" || data.status?.toLowerCase() === "ongoing")) {
        updateDoc(doc(db, "events", id), { status: "Completed", updatedAt: serverTimestamp() }).catch(() => {});
        data.status = "Completed";
      }
      setEvent(data);
      setLoading(false);
    }, () => { setEvent(null); setLoading(false); });
    return () => unsub();
  }, [id]);

  useEffect(() => {
    if (!id || !user) return;
    async function checkJoinRequest() {
      try {
        const q = query(collection(db, "events", id!, "joinRequests"), where("uid", "==", user!.uid));
        const snap = await getDocs(q);
        if (!snap.empty) setUserJoinRequest(snap.docs[0].data() as JoinRequest);
      } catch {}
    }
    checkJoinRequest();
  }, [id, user]);

  async function handlePhotoUploaded(result: { url: string; storagePath: string }) {
    if (!user || !id || !event) return;
    const photo: EventPhoto = {
      url: result.url, storagePath: result.storagePath,
      uploadedBy: user.uid, uploadedByName: user.displayName ?? undefined, timestamp: Date.now(),
    };
    await updateDoc(doc(db, "events", id), { photos: arrayUnion(photo), updatedAt: serverTimestamp() });
    setEvent((prev) => prev ? { ...prev, photos: [...(prev.photos ?? []), photo] } : prev);
    await writeActivityLog("photo_uploaded", user.uid, user.displayName || "User", "event", id, event.title, { newValue: { photoUrl: result.url } });
  }

  async function handleDeletePhoto(photo: EventPhoto) {
    if (!user || !id || !event || !(role === "admin" || photo.uploadedBy === user.uid)) return;
    setDeletingPhotoUrl(photo.url);
    try {
      if (photo.storagePath) await deleteStorageFile(photo.storagePath);
      const newPhotos = (event.photos ?? []).filter(
        (p) => !(p.url === photo.url && p.uploadedBy === photo.uploadedBy && p.timestamp === photo.timestamp)
      );
      await updateDoc(doc(db, "events", id), { photos: newPhotos, updatedAt: serverTimestamp() });
      setEvent((prev) => prev ? { ...prev, photos: newPhotos } : prev);
      toast.success("Photo deleted");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete photo");
    } finally { setDeletingPhotoUrl(null); }
  }

  async function handleDeleteEvent() {
    if (!user || !id || !event || role !== "admin") return;
    setDeletingEvent(true);
    try {
      for (const photo of event.photos ?? []) {
        if (photo.storagePath) try { await deleteStorageFile(photo.storagePath); } catch {}
      }
      await deleteDoc(doc(db, "events", id));
      await writeActivityLog("event_deleted", user.uid, user.displayName || "Admin", "event", id, event.title, { note: "Deleted by admin" });
      toast.success("Event deleted");
      navigate("/events");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete event");
    } finally { setDeletingEvent(false); setShowDeleteModal(false); }
  }

  async function handleCancelEvent() {
    if (!user || !id || !event || role !== "admin") return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, "events", id), {
        status: "Cancelled", updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({ status: "Cancelled", changedBy: user.uid, changedAt: Date.now(), note: "Cancelled by admin" }),
      });
      await writeActivityLog("event_cancelled", user.uid, user.displayName || "Admin", "event", id, event.title, {});
      toast.success("Event cancelled");
      setShowCancelModal(false);
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setCancelling(false); }
  }

  async function handleReactivateEvent() {
    if (!user || !id || !event || role !== "admin") return;
    setCancelling(true);
    try {
      await updateDoc(doc(db, "events", id), {
        status: "Planned", updatedAt: serverTimestamp(),
        statusHistory: arrayUnion({ status: "Planned", changedBy: user.uid, changedAt: Date.now(), note: "Reactivated by admin" }),
      });
      toast.success("Event reactivated");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Failed"); }
    finally { setCancelling(false); }
  }

  async function handleExportCalendar() {
    if (!event) return;
    if (!isGoogleCalendarConnected()) {
      if (confirm("Connect Google Calendar to export events?")) {
        try { connectGoogleCalendar(); } catch { toast.error("Failed to connect Google Calendar."); }
      }
      return;
    }
    setExporting(true); setExportMsg(null);
    try {
      const result = await createGoogleCalendarEvent({
        title: event.title, description: event.description || "",
        location: event.location || "", startDate: toDate(event.startDate), endDate: toDate(event.endDate),
      });
      await updateDoc(doc(db, "events", event.id), { googleCalendarEventId: result.id, updatedAt: serverTimestamp() });
      setEvent((prev) => prev ? { ...prev, googleCalendarEventId: result.id } : prev);
      updateLastSyncTime();
      setExportMsg("Exported to Google Calendar ✅");
      toast.success("Exported to Google Calendar");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Export failed";
      setExportMsg(`Export failed: ${msg}`);
      toast.error(`Export failed: ${msg}`);
    } finally { setExporting(false); }
  }

  async function handleJoinEvent() {
    if (!id || !user || !event) return;
    setRequesting(true);
    try {
      const newAttendee: Attendee = {
        uid: user.uid, displayName: user.displayName || "Unknown",
        photoURL: user.photoURL || "", joinedAt: Date.now(), joinType: "enrolled",
      };
      await updateDoc(doc(db, "events", id), { attendees: arrayUnion(newAttendee), updatedAt: serverTimestamp() });
      setEvent((prev) => prev ? { ...prev, attendees: [...(prev.attendees ?? []), newAttendee] } : prev);
      toast.success("You've joined this event!");
    } catch (err) { toast.error(err instanceof Error ? err.message : "Failed to join"); }
    finally { setRequesting(false); }
  }

  const canEdit = role === "admin" || role === "staff";
  const canDelete = role === "admin";
  const canUpload = role === "admin" || role === "staff" ||
    (role === "volunteer" && event?.assignedTo?.includes(user?.uid ?? ""));
  const isAttending = event && user && event.attendees?.some((a) => a.uid === user.uid);
  const isEventPast = event ? (typeof event.endDate === "number" && event.endDate < Date.now()) : false;
  const canJoin = event && user &&
    (event.enrollmentType === "open" || event.enrollmentType === "both") &&
    (role === "volunteer" || role === "staff") && !isAttending && !userJoinRequest &&
    !isEventPast &&
    event.status?.toLowerCase() !== "completed" &&
    event.status?.toLowerCase() !== "cancelled";

  if (loading) return (
    <Layout title="Event" showBack>
      <div className="flex justify-center py-24"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
    </Layout>
  );

  if (!event) return (
    <Layout title="Not Found" showBack>
      <div className="p-6 text-center">
        <p className="text-muted-foreground">Event not found.</p>
        <Link to="/events" className="mt-3 inline-block text-sm text-primary hover:underline">Back to events</Link>
      </div>
    </Layout>
  );

  const accentColor = getCategoryColor(event.category || "");
  const heroPhoto = event.photos?.[0];

  return (
    <Layout title={event.title} showBack>
      <div className="animate-fade-in">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6 items-start p-4 md:p-6">

        {/* ── Main column ── */}
        <div className="min-w-0">

        {/* Hero header */}
        <div
          className="relative h-48 md:h-64 flex items-end overflow-hidden rounded-2xl"
          style={{ background: heroPhoto ? undefined : `${accentColor}40` }}
        >
          {heroPhoto && (
            <img src={heroPhoto.url} alt={event.title} className="absolute inset-0 w-full h-full object-cover" />
          )}
          {/* No dark overlay — title/badges moved below the hero */}
          {/* Action buttons top-right */}
          <div className="absolute top-4 right-4 flex gap-2 z-10">
            {role === "admin" && (
              event.status === "Cancelled" ? (
                <button onClick={handleReactivateEvent} disabled={cancelling}
                  className="flex items-center gap-1.5 rounded-xl bg-emerald-600/90 backdrop-blur text-white px-3 py-1.5 text-xs font-semibold hover:bg-emerald-600 transition-all">
                  {cancelling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <PlayCircle className="h-3.5 w-3.5" />}
                  Reactivate
                </button>
              ) : (
                <button onClick={() => setShowCancelModal(true)}
                  className="flex items-center gap-1.5 rounded-xl bg-red-600/80 backdrop-blur text-white px-3 py-1.5 text-xs font-semibold hover:bg-red-600 transition-all">
                  <Ban className="h-3.5 w-3.5" /> Cancel
                </button>
              )
            )}
            {canDelete && (
              <button onClick={() => setShowDeleteModal(true)}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 backdrop-blur text-white hover:bg-red-600 transition-all">
                <Trash2 className="h-4 w-4" />
              </button>
            )}
            {canEdit && (
              <Link to={`/events/${event.id}/edit`}
                className="flex h-8 w-8 items-center justify-center rounded-xl bg-black/40 backdrop-blur text-white hover:bg-violet-600 transition-all">
                <Edit className="h-4 w-4" />
              </Link>
            )}
          </div>
        </div>

        {/* Title + badges below hero */}
        <div className="px-1 pt-4 pb-1">
          <div className="flex flex-wrap gap-2 mb-2">
            <StatusBadge status={event.status} />
            {event.category && (
              <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium text-white"
                style={{ backgroundColor: `${accentColor}90` }}>
                {event.category}
              </span>
            )}
          </div>
          <h1 className="text-xl md:text-2xl font-extrabold text-foreground leading-tight line-clamp-2">
            {event.title}
          </h1>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-4">

          {/* Description */}
          {event.description && (
            <div className="glass-card">
              <p className="text-sm text-foreground leading-relaxed">{event.description}</p>
            </div>
          )}

          {/* Meta details */}
          <div className="glass-card space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-500/15">
                  <Calendar className="h-4 w-4 text-violet-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Starts</p>
                  <p className="text-sm font-medium text-foreground">{fmt(event.startDate)}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-pink-500/15">
                  <Clock className="h-4 w-4 text-pink-400" />
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Ends</p>
                  <p className="text-sm font-medium text-foreground">{fmt(event.endDate)}</p>
                </div>
              </div>
              {event.location && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/15">
                    <MapPin className="h-4 w-4 text-cyan-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="text-sm font-medium text-foreground">{event.location}</p>
                  </div>
                </div>
              )}
              {event.assignedTo?.length > 0 && (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/15">
                    <Users className="h-4 w-4 text-amber-400" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Assigned</p>
                    <p className="text-sm font-medium text-foreground">{event.assignedTo.length} member{event.assignedTo.length !== 1 ? "s" : ""}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Enrollment + join */}
          <div className="glass-card space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-violet-400" />
                <span className="text-sm font-medium text-foreground">
                  {event.enrollmentType === "open" ? "Open Enrollment" :
                    event.enrollmentType === "both" ? "Assigned + Open" : "Assigned Only"}
                </span>
              </div>
              {event.capacity && event.capacity > 0 && (
                <span className="text-xs text-muted-foreground">
                  {event.attendees?.length ?? 0} / {event.capacity} spots
                </span>
              )}
            </div>
            {user && (role === "volunteer" || role === "staff") && (
              <div className="pt-2 border-t border-white/08">
                {isAttending ? (
                  <div className="flex items-center gap-2 text-sm text-emerald-400">
                    <CheckCircle className="h-4 w-4" /> You're attending
                  </div>
                ) : userJoinRequest ? (
                  <div className="flex items-center gap-2 text-sm">
                    {userJoinRequest.status === "pending" ? (
                      <><Clock className="h-4 w-4 text-amber-400" /><span className="text-amber-400">Request pending review</span></>
                    ) : userJoinRequest.status === "approved" ? (
                      <><CheckCircle className="h-4 w-4 text-emerald-400" /><span className="text-emerald-400">Approved</span></>
                    ) : (
                      <><XCircle className="h-4 w-4 text-red-400" /><span className="text-red-400">Request denied</span></>
                    )}
                  </div>
                ) : canJoin ? (
                  <button onClick={handleJoinEvent} disabled={requesting}
                    className="flex items-center gap-2 rounded-xl gradient-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 hover:opacity-90 disabled:opacity-60 transition-all">
                    <UserPlus className="h-4 w-4" />
                    {requesting ? "Joining…" : "Join Event"}
                  </button>
                ) : event.enrollmentType === "assigned" ? (
                  <p className="text-sm text-muted-foreground">Invitation only</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Attendees */}
          {event.attendees && event.attendees.length > 0 && (
            <div className="glass-card">
              <h3 className="text-sm font-semibold text-foreground mb-3">Attendees ({event.attendees.length})</h3>
              <div className="flex flex-wrap gap-2">
                {event.attendees.map((a) => (
                  <div key={a.uid} className="flex items-center gap-2 rounded-xl bg-white/05 px-3 py-1.5">
                    {a.photoURL ? (
                      <img src={a.photoURL} alt="" className="h-5 w-5 rounded-full object-cover" />
                    ) : (
                      <div className="h-5 w-5 rounded-full bg-violet-500/20 flex items-center justify-center">
                        <span className="text-[10px] text-violet-400">{a.displayName?.[0] || "?"}</span>
                      </div>
                    )}
                    <span className="text-xs text-foreground">{a.displayName}</span>
                    {a.joinType === "assigned" && <span className="text-[10px] text-muted-foreground">(assigned)</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {event.tags?.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {event.tags.map((tag) => (
                <span key={tag} className="flex items-center gap-1 rounded-full bg-white/05 border border-white/10 px-3 py-1 text-xs text-muted-foreground">
                  <Tag className="h-3 w-3" />#{tag}
                </span>
              ))}
            </div>
          )}

          {/* Google Calendar */}
          <div className="glass-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-foreground">Google Calendar</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {event.googleCalendarEventId ? "Already synced ✅" : "Export this event to your calendar"}
                </p>
              </div>
              <button onClick={handleExportCalendar} disabled={exporting}
                className="flex items-center gap-2 rounded-xl glass border border-white/10 px-3 py-2 text-xs font-medium text-foreground hover:border-violet-500/40 transition-all disabled:opacity-60">
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                Export
              </button>
            </div>
            {exportMsg && <p className="mt-2 text-xs text-violet-400">{exportMsg}</p>}
          </div>

          {/* Photos */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-foreground">Photos ({event.photos?.length ?? 0})</h2>
            {event.photos?.length > 0 && (
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 mb-4">
                {event.photos.map((photo, i) => {
                  const canDeletePhoto = role === "admin" || photo.uploadedBy === user?.uid;
                  return (
                    <div key={`${photo.url}-${photo.timestamp}`}
                      className="relative group aspect-square overflow-hidden rounded-xl bg-muted">
                      <button type="button" onClick={() => setLightboxPhoto(photo)} className="block w-full h-full">
                        <img src={photo.url} alt={`Photo ${i + 1}`}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105" loading="lazy" />
                      </button>
                      {photo.uploadedByName && (
                        <p className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/70 to-transparent text-white text-[10px] truncate">
                          {photo.uploadedByName}
                        </p>
                      )}
                      <div className="absolute top-2 right-2 flex gap-1 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <button type="button"
                          onClick={(e) => { e.stopPropagation(); downloadPhoto(photo.url, `${event.title}-photo-${i + 1}.jpg`); }}
                          className="p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/80 transition-colors" title="Download">
                          <Download className="h-3.5 w-3.5" />
                        </button>
                        {canDeletePhoto && (
                          <button type="button"
                            onClick={(e) => { e.stopPropagation(); if (confirm("Delete this photo?")) handleDeletePhoto(photo); }}
                            disabled={deletingPhotoUrl === photo.url}
                            className="p-1.5 rounded-lg bg-red-600 text-white hover:bg-red-500 transition-colors disabled:opacity-50" title="Delete">
                            {deletingPhotoUrl === photo.url ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {canUpload && <PhotoUploader eventId={event.id} onUploadComplete={handlePhotoUploaded} />}
            {!canUpload && (event.photos?.length ?? 0) === 0 && (
              <div className="glass-card p-8 text-center">
                <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-xs text-muted-foreground">No photos yet.</p>
              </div>
            )}
          </div>
        </div>
        </div>

        {/* Activity sidebar */}
        <div className="lg:sticky lg:top-24">
          <div className="glass-card !rounded-2xl !p-4">
            <h3 className="text-sm font-bold text-foreground mb-3">Activity</h3>
            <ActivityFeed eventId={id} maxItems={12} compact />
          </div>
        </div>

        </div>
      </div>

      {/* Lightbox */}
      <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
        <DialogContent className="max-w-4xl p-0 overflow-hidden glass-card">
          {lightboxPhoto && (
            <>
              <img src={lightboxPhoto.url} alt="" className="w-full max-h-[80vh] object-contain" />
              <div className="p-4 border-t border-white/08 flex items-center justify-between gap-4">
                <p className="text-sm text-muted-foreground">
                  {lightboxPhoto.uploadedByName} · {toIST(lightboxPhoto.timestamp).toLocaleDateString("en-IN", { timeZone: "Asia/Kolkata" })}
                </p>
                <div className="flex items-center gap-2">
                  <button onClick={() => downloadPhoto(lightboxPhoto.url, `${event.title}-photo.jpg`)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition-colors">
                    <Download className="h-3.5 w-3.5" /> Download
                  </button>
                  {(role === "admin" || lightboxPhoto.uploadedBy === user?.uid) && (
                    <button onClick={() => { handleDeletePhoto(lightboxPhoto); setLightboxPhoto(null); }}
                      disabled={deletingPhotoUrl === lightboxPhoto.url}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-medium transition-colors disabled:opacity-50">
                      <Trash2 className="h-3.5 w-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Modal */}
      <Dialog open={showDeleteModal} onOpenChange={setShowDeleteModal}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="h-5 w-5" /> Delete Event
            </DialogTitle>
            <DialogDescription className="pt-2">
              Delete "{event?.title}"? This cannot be undone and will remove all photos.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowDeleteModal(false)}
              className="flex-1 rounded-xl glass border border-white/10 py-2 text-sm font-medium text-foreground hover:border-white/20 transition-all">
              Cancel
            </button>
            <button onClick={handleDeleteEvent} disabled={deletingEvent}
              className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-all">
              {deletingEvent ? "Deleting…" : "Delete"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Modal */}
      <Dialog open={showCancelModal} onOpenChange={setShowCancelModal}>
        <DialogContent className="glass-card">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-400">
              <Ban className="h-5 w-5" /> Cancel Event
            </DialogTitle>
            <DialogDescription className="pt-2">
              Cancel "{event?.title}"? Cancelled events won't auto-update based on dates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <button onClick={() => setShowCancelModal(false)}
              className="flex-1 rounded-xl glass border border-white/10 py-2 text-sm font-medium text-foreground">
              Keep Event
            </button>
            <button onClick={handleCancelEvent} disabled={cancelling}
              className="flex-1 rounded-xl bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-60 transition-all">
              {cancelling ? "Cancelling…" : "Cancel Event"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

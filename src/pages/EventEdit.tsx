import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { doc, getDoc, updateDoc, serverTimestamp, collection, getDocs, addDoc, query, orderBy, onSnapshot } from "firebase/firestore";
import { Loader2, Calendar, MapPin, Tag, Search, X, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FirestoreEvent, FirestoreUser, EnrollmentType, Attendee } from "@/types";
import Layout from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const ENROLLMENT_OPTIONS: { value: EnrollmentType; label: string }[] = [
  { value: "assigned", label: "Assigned Only" },
  { value: "open", label: "Open Enrollment" },
  { value: "both", label: "Both" },
];

const inputClass =
  "w-full rounded-xl border border-white/10 bg-white/05 px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

function toDatetimeLocal(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function EventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, role } = useAuth();
  const [event, setEvent] = useState<FirestoreEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [category, setCategory] = useState("");
  const [tags, setTags] = useState("");
  const [enrollmentType, setEnrollmentType] = useState<EnrollmentType>("assigned");
  const [capacity, setCapacity] = useState(0);
  const [assignedTo, setAssignedTo] = useState<string[]>([]);
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [userSearch, setUserSearch] = useState("");
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [categoryOptions, setCategoryOptions] = useState<{ name: string; color: string }[]>([]);

  const isAdminStaff = role === "admin" || role === "staff";

  useEffect(() => {
    if (!isAdminStaff) return;
    getDocs(collection(db, "users"))
      .then((snap) => setUsers(snap.docs.map((d) => ({ uid: d.id, ...d.data() } as FirestoreUser))))
      .catch(() => {});
  }, [isAdminStaff]);

  // Live event categories from Firestore
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "eventCategories"), orderBy("createdAt", "asc")),
      (snap) => setCategoryOptions(snap.docs.map((d) => ({ name: d.data().name as string, color: d.data().color as string }))),
      () => {}
    );
    return unsub;
  }, []);

  useEffect(() => {
    if (!id) return;
    getDoc(doc(db, "events", id)).then((snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as FirestoreEvent;
        setEvent(data);
        setTitle(data.title);
        setDescription(data.description ?? "");
        setLocation(data.location ?? "");
        setStartDate(toDatetimeLocal(data.startDate));
        setEndDate(toDatetimeLocal(data.endDate));
        setCategory(data.category ?? "");
        setTags(data.tags?.join(", ") ?? "");
        setEnrollmentType(data.enrollmentType ?? "assigned");
        setCapacity(data.capacity ?? 0);
        setAssignedTo(data.assignedTo ?? []);
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [id]);

  const filteredUsers = users.filter((u) =>
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );
  const assignedUsers = users.filter((u) => assignedTo.includes(u.uid));

  function toggleUser(uid: string) {
    setAssignedTo((prev) => prev.includes(uid) ? prev.filter((x) => x !== uid) : [...prev, uid]);
    setUserSearch("");
    setShowUserDropdown(false);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!id || !title.trim()) { setError("Title is required."); return; }
    setError(null);
    setSubmitting(true);
    try {
      const attendees: Attendee[] = assignedTo.map((uid) => {
        const u = users.find((x) => x.uid === uid);
        const existing = event?.attendees?.find((a) => a.uid === uid);
        return {
          uid, displayName: u?.displayName || "Unknown",
          joinedAt: existing?.joinedAt || Date.now(),
          joinType: existing?.joinType || "assigned" as const,
        };
      });
      await updateDoc(doc(db, "events", id), {
        title: title.trim(), description: description.trim(), location: location.trim(),
        startDate: new Date(startDate).getTime(), endDate: new Date(endDate).getTime(),
        category, tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        enrollmentType, capacity, assignedTo, attendees, updatedAt: serverTimestamp(),
      });
      // Notify newly assigned users
      const newAssigned = assignedTo.filter((uid) => !(event?.assignedTo || []).includes(uid));
      for (const uid of newAssigned) {
        await addDoc(collection(db, "notifications"), {
          userId: uid, title: "Event Assignment Updated",
          body: `You have been assigned to "${title}"`,
          eventId: id, read: false, createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      toast.success("Event updated!");
      navigate(`/events/${id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Update failed";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return (
    <Layout title="Edit Event" showBack>
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </Layout>
  );

  return (
    <Layout title="Edit Event" showBack>
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">Edit Event</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Update the details below</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="glass-card space-y-4">
            <Field label="Event Title *">
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                required className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                rows={3} className={cn(inputClass, "resize-none")} />
            </Field>
          </div>

          <div className="glass-card space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start Date *">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="datetime-local" value={startDate}
                    onChange={(e) => setStartDate(e.target.value)} className={cn(inputClass, "pl-9")} />
                </div>
              </Field>
              <Field label="End Date *">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="datetime-local" value={endDate}
                    onChange={(e) => setEndDate(e.target.value)} className={cn(inputClass, "pl-9")} />
                </div>
              </Field>
            </div>
            <Field label="Location">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)}
                  className={cn(inputClass, "pl-9")} />
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select value={category} onChange={(e) => setCategory(e.target.value)} className={inputClass}>
                  <option value="">Select category</option>
                  {categoryOptions.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Tags (comma-separated)">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input type="text" value={tags} onChange={(e) => setTags(e.target.value)}
                    className={cn(inputClass, "pl-9")} />
                </div>
              </Field>
            </div>
          </div>

          {isAdminStaff && (
            <div className="glass-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Enrollment Settings</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Enrollment Type">
                  <select value={enrollmentType} onChange={(e) => setEnrollmentType(e.target.value as EnrollmentType)} className={inputClass}>
                    {ENROLLMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Max Attendees (0 = unlimited)">
                  <input type="number" min="0" value={capacity}
                    onChange={(e) => setCapacity(parseInt(e.target.value) || 0)} className={inputClass} />
                </Field>
              </div>
              <Field label="Assign To">
                <div className="relative">
                  {assignedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {assignedUsers.map((u) => (
                        <span key={u.uid} className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 text-violet-300 px-2.5 py-1 text-xs">
                          {u.displayName}
                          <button type="button" onClick={() => toggleUser(u.uid)}><X className="h-3 w-3" /></button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Search users…" value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                      className={cn(inputClass, "pl-9")} />
                  </div>
                  {showUserDropdown && filteredUsers.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 glass-card !p-0 !rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl border border-white/10">
                      {filteredUsers.slice(0, 10).map((u) => (
                        <button key={u.uid} type="button" onClick={() => toggleUser(u.uid)}
                          className={cn("w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/05 text-left",
                            assignedTo.includes(u.uid) && "bg-violet-500/10")}>
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-violet-500/20 flex items-center justify-center">
                              <span className="text-xs text-violet-300">{u.displayName?.[0] || "?"}</span>
                            </div>
                          )}
                          <span className="flex-1 text-sm text-foreground">{u.displayName}</span>
                          <span className="text-xs text-muted-foreground">{u.role}</span>
                          {assignedTo.includes(u.uid) && <Check className="h-4 w-4 text-violet-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </Field>
            </div>
          )}

          {error && (
            <div role="alert" className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
              {error}
            </div>
          )}

          <div className="flex gap-3">
            <button type="button" onClick={() => navigate(-1)}
              className="flex-1 rounded-xl glass border border-white/10 py-3 text-sm font-medium text-foreground hover:border-white/20 transition-all">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}

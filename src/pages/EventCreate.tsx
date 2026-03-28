import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { collection, addDoc, serverTimestamp, getDocs, query, orderBy, onSnapshot } from "firebase/firestore";
import { Loader2, Calendar, MapPin, Tag, Search, X, Check } from "lucide-react";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { FirestoreUser, EnrollmentType, Attendee } from "@/types";
import Layout from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { writeActivityLog } from "@/lib/activityLog";

const ENROLLMENT_OPTIONS: { value: EnrollmentType; label: string }[] = [
  { value: "assigned", label: "Assigned Only" },
  { value: "open", label: "Open Enrollment" },
  { value: "both", label: "Both" },
];

interface FormState {
  title: string; description: string; location: string;
  startDate: string; endDate: string; category: string; tags: string;
  enrollmentType: EnrollmentType; capacity: number; assignedTo: string[];
}

const inputClass =
  "w-full rounded-xl border border-border bg-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500/40 transition-all";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-medium text-foreground">{label}</label>
      {children}
    </div>
  );
}

export default function EventCreate() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState<FormState>({
    title: "", description: "", location: "", startDate: "", endDate: "",
    category: "", tags: "", enrollmentType: "assigned", capacity: 0, assignedTo: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const filteredUsers = users.filter((u) =>
    u.displayName?.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email?.toLowerCase().includes(userSearch.toLowerCase())
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: name === "capacity" ? parseInt(value) || 0 : value }));
  }

  function toggleUser(uid: string) {
    setForm((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.includes(uid)
        ? prev.assignedTo.filter((id) => id !== uid)
        : [...prev.assignedTo, uid],
    }));
    setUserSearch("");
    setShowUserDropdown(false);
  }

  const assignedUsers = users.filter((u) => form.assignedTo.includes(u.uid));

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.startDate || !form.endDate) {
      setError("Title, start date, and end date are required.");
      return;
    }
    if (!user) return;
    setError(null);
    setSubmitting(true);
    try {
      const attendees: Attendee[] = form.assignedTo.map((uid) => {
        const u = users.find((x) => x.uid === uid);
        return { uid, displayName: u?.displayName || "Unknown", joinedAt: Date.now(), joinType: "assigned" as const };
      });
      const docRef = await addDoc(collection(db, "events"), {
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        startDate: new Date(form.startDate).getTime(),
        endDate: new Date(form.endDate).getTime(),
        category: form.category,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        createdBy: user.uid,
        assignedTo: form.assignedTo,
        photos: [],
        enrollmentType: form.enrollmentType,
        capacity: form.capacity,
        attendees,
        joinRequests: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      toast.success("Event created!");
      await writeActivityLog("event_created", user.uid, user.displayName || "User", "event", docRef.id, form.title.trim(), {});
      navigate(`/events/${docRef.id}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to create event";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Layout title="Create Event" showBack>
      <div className="p-4 md:p-6 max-w-xl mx-auto animate-fade-in">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">New Event</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Fill in the details below to create an event</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div className="glass-card space-y-4">
            <Field label="Event Title *">
              <input name="title" type="text" required placeholder="e.g. Literacy Workshop"
                value={form.title} onChange={handleChange} className={inputClass} />
            </Field>
            <Field label="Description">
              <textarea name="description" placeholder="What is this event about?"
                value={form.description} onChange={handleChange} rows={3}
                className={cn(inputClass, "resize-none")} />
            </Field>
          </div>

          <div className="glass-card space-y-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Start Date & Time *">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input name="startDate" type="datetime-local" required value={form.startDate}
                    onChange={handleChange} className={cn(inputClass, "pl-9")} />
                </div>
              </Field>
              <Field label="End Date & Time *">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input name="endDate" type="datetime-local" required value={form.endDate}
                    onChange={handleChange} className={cn(inputClass, "pl-9")} />
                </div>
              </Field>
            </div>
            <Field label="Location">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <input name="location" type="text" placeholder="e.g. Community Hall, Nagpur"
                  value={form.location} onChange={handleChange} className={cn(inputClass, "pl-9")} />
              </div>
            </Field>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select name="category" value={form.category} onChange={handleChange} className={inputClass}>
                  <option value="">Select category</option>
                  {categoryOptions.map((c) => <option key={c.name} value={c.name}>{c.name}</option>)}
                </select>
              </Field>
              <Field label="Tags (comma-separated)">
                <div className="relative">
                  <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <input name="tags" type="text" placeholder="e.g. youth, literacy"
                    value={form.tags} onChange={handleChange} className={cn(inputClass, "pl-9")} />
                </div>
              </Field>
            </div>
          </div>

          {isAdminStaff && (
            <div className="glass-card space-y-4">
              <h3 className="text-sm font-semibold text-foreground">Enrollment Settings</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Enrollment Type">
                  <select name="enrollmentType" value={form.enrollmentType} onChange={handleChange} className={inputClass}>
                    {ENROLLMENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field label="Max Attendees (0 = unlimited)">
                  <input name="capacity" type="number" min="0" value={form.capacity}
                    onChange={handleChange} className={inputClass} />
                </Field>
              </div>

              <Field label="Assign To">
                <div className="relative">
                  {assignedUsers.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {assignedUsers.map((u) => (
                        <span key={u.uid} className="inline-flex items-center gap-1 rounded-full bg-violet-500/20 text-violet-300 px-2.5 py-1 text-xs font-medium">
                          {u.displayName}
                          <button type="button" onClick={() => toggleUser(u.uid)} className="hover:text-white ml-0.5">
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <input type="text" placeholder="Search users to assign…"
                      value={userSearch}
                      onChange={(e) => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                      onFocus={() => setShowUserDropdown(true)}
                      className={cn(inputClass, "pl-9")} />
                  </div>
                  {showUserDropdown && filteredUsers.length > 0 && (
                    <div className="absolute z-20 w-full mt-1 glass-card !p-0 !rounded-xl overflow-hidden max-h-48 overflow-y-auto shadow-2xl border border-white/10">
                      {filteredUsers.slice(0, 10).map((u) => (
                        <button key={u.uid} type="button" onClick={() => toggleUser(u.uid)}
                          className={cn(
                            "w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/05 text-left transition-colors",
                            form.assignedTo.includes(u.uid) && "bg-violet-500/10"
                          )}>
                          {u.photoURL ? (
                            <img src={u.photoURL} alt="" className="h-7 w-7 rounded-full object-cover" />
                          ) : (
                            <div className="h-7 w-7 rounded-full bg-violet-500/20 flex items-center justify-center">
                              <span className="text-xs text-violet-300">{u.displayName?.[0] || "?"}</span>
                            </div>
                          )}
                          <span className="flex-1 text-sm text-foreground">{u.displayName}</span>
                          <span className="text-xs text-muted-foreground">{u.role}</span>
                          {form.assignedTo.includes(u.uid) && <Check className="h-4 w-4 text-violet-400" />}
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

          <button type="submit" disabled={submitting}
            className="flex w-full items-center justify-center gap-2 rounded-xl gradient-primary py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/25 hover:opacity-90 active:scale-[0.98] transition-all disabled:opacity-60">
            {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {submitting ? "Creating…" : "Create Event"}
          </button>
        </form>
      </div>
    </Layout>
  );
}

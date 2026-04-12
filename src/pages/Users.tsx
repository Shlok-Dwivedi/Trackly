import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  collection, getDocs, query, orderBy,
  doc, setDoc, deleteDoc, updateDoc, onSnapshot,
  writeBatch, arrayRemove,
} from "firebase/firestore";
import {
  Loader2, UserCheck, AlertCircle, Shield, ExternalLink,
  Plus, Trash2, Users as UsersIcon, Building2, ChevronDown, ChevronUp, X, Tag, UserMinus,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { FirestoreUser, UserRole, Committee } from "@/types";
import Layout from "@/components/layout/Layout";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

const ROLES: UserRole[] = ["admin", "staff", "volunteer", "viewer"];
const FLASK_BASE = import.meta.env.VITE_FLASK_API_URL || "";

const roleColors: Record<UserRole, string> = {
  admin: "bg-red-500/15 text-red-400 border border-red-500/20",
  staff: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
  volunteer: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
  viewer: "bg-white/08 text-muted-foreground border border-white/10",
};

interface Department {
  id: string;
  name: string;
  memberUids: string[];
  createdAt: number;
}

interface EventCategory {
  id: string;
  name: string;
  color: string;
  createdAt: number;
}

export default function Users() {
  const [users, setUsers] = useState<FirestoreUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [assigning, setAssigning] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Record<string, string>>({});

  // Department state
  const [departments, setDepartments] = useState<Department[]>([]);
  const [deptLoading, setDeptLoading] = useState(true);
  const [newDeptName, setNewDeptName] = useState("");
  const [creatingDept, setCreatingDept] = useState(false);
  const [expandedDept, setExpandedDept] = useState<string | null>(null);
  const [addingMember, setAddingMember] = useState<string | null>(null); // deptId

  // Event category state
  const [categories, setCategories] = useState<EventCategory[]>([]);
  const [catLoading, setCatLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatColor, setNewCatColor] = useState("#8b5cf6");

  // Committee state
  const [committees, setCommittees] = useState<{ id: string; name: string; description?: string; color: string; leadUid?: string; memberUids: string[]; createdAt: number }[]>([]);
  const [committeeLoading, setCommitteeLoading] = useState(true);
  const [expandedCommittee, setExpandedCommittee] = useState<string | null>(null);
  const [editingCommittee, setEditingCommittee] = useState<string | null>(null);
  const [newCommittee, setNewCommittee] = useState({ name: "", description: "", color: "#8b5cf6", leadUid: "" });
  const [creatingCommittee, setCreatingCommittee] = useState(false);
  const [addingCommitteeMember, setAddingCommitteeMember] = useState<string | null>(null);
  const [creatingCat, setCreatingCat] = useState(false);

  // Ping backend on mount so Render wakes up before admin tries role changes
  useEffect(() => {
    if (FLASK_BASE) fetch(`${FLASK_BASE}/health`).catch(() => {});
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const snap = await Promise.race([
          getDocs(query(collection(db, "users"), orderBy("createdAt", "desc"))),
          new Promise<never>((_, r) => setTimeout(() => r(new Error("timeout")), 4000)),
        ]);
        setUsers(snap.docs.map((d) => d.data() as FirestoreUser));
      } catch {
        setUsers(demoUsers);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "departments"), orderBy("createdAt", "asc")),
      (snap) => {
        setDepartments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Department)));
        setDeptLoading(false);
      },
      () => setDeptLoading(false)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "eventCategories"), orderBy("createdAt", "asc")),
      (snap) => {
        setCategories(snap.docs.map((d) => ({ id: d.id, ...d.data() } as EventCategory)));
        setCatLoading(false);
      },
      () => setCatLoading(false)
    );
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "committees"), orderBy("createdAt", "asc")),
      (snap) => {
        setCommittees(snap.docs.map((d) => ({ id: d.id, ...d.data() } as any)));
        setCommitteeLoading(false);
      },
      () => setCommitteeLoading(false)
    );
    return unsub;
  }, []);

  // ── Committee CRUD ────────────────────────────────────────────────────────
  async function createCommittee() {
    const name = newCommittee.name.trim();
    if (!name) return;
    if (committees.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A committee with that name already exists.");
      return;
    }
    setCreatingCommittee(true);
    try {
      const ref = doc(collection(db, "committees"));
      await setDoc(ref, {
        name,
        description: newCommittee.description.trim() || null,
        color: newCommittee.color,
        leadUid: newCommittee.leadUid || null,
        memberUids: [],
        createdAt: Date.now(),
      });
      setNewCommittee({ name: "", description: "", color: "#8b5cf6", leadUid: "" });
      toast.success(`Committee "${name}" created.`);
    } catch { toast.error("Failed to create committee."); }
    finally { setCreatingCommittee(false); }
  }

  async function deleteCommittee(c: Committee) {
    if (!window.confirm(`Delete committee "${c.name}"?`)) return;
    try {
      await deleteDoc(doc(db, "committees", c.id));
      toast.success(`Committee "${c.name}" deleted.`);
    } catch { toast.error("Failed to delete committee."); }
  }

  async function updateCommittee(c: Committee, updates: Partial<Committee>) {
    try {
      await updateDoc(doc(db, "committees", c.id), updates);
      toast.success("Committee updated.");
      setEditingCommittee(null);
    } catch { toast.error("Failed to update committee."); }
  }

  async function addCommitteeMember(c: Committee, uid: string) {
    if (c.memberUids.includes(uid)) return;
    try {
      await updateDoc(doc(db, "committees", c.id), { memberUids: [...c.memberUids, uid] });
      toast.success("Member added.");
      setAddingCommitteeMember(null);
    } catch { toast.error("Failed to add member."); }
  }

  async function removeCommitteeMember(c: Committee, uid: string) {
    try {
      await updateDoc(doc(db, "committees", c.id), { memberUids: c.memberUids.filter((id) => id !== uid) });
      toast.success("Member removed.");
    } catch { toast.error("Failed to remove member."); }
  }

  async function createCategory() {
    const name = newCatName.trim();
    if (!name) return;
    if (categories.some((c) => c.name.toLowerCase() === name.toLowerCase())) {
      toast.error("Category already exists"); return;
    }
    setCreatingCat(true);
    try {
      const ref = doc(collection(db, "eventCategories"));
      await setDoc(ref, { name, color: newCatColor, createdAt: Date.now() });
      setNewCatName("");
      setNewCatColor("#8b5cf6");
      toast.success(`Category "${name}" created`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create category");
    } finally {
      setCreatingCat(false);
    }
  }

  async function deleteCategory(cat: EventCategory) {
    if (!window.confirm(`Delete category "${cat.name}"? Events using it will keep the old value.`)) return;
    try {
      await deleteDoc(doc(db, "eventCategories", cat.id));
      toast.success(`Category "${cat.name}" deleted`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  }

  async function updateCategoryColor(cat: EventCategory, color: string) {
    try {
      await updateDoc(doc(db, "eventCategories", cat.id), { color });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update color");
    }
  }

  async function assignRole(uid: string, role: UserRole) {
    setAssigning(uid);
    setFeedback((prev) => ({ ...prev, [uid]: "" }));
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in.");
      // Force refresh to avoid stale token errors
      const idToken = await currentUser.getIdToken(true);

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);

      let res: Response;
      try {
        res = await fetch(`${FLASK_BASE}/api/auth/set-role`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
          body: JSON.stringify({ uid, role }),
          signal: controller.signal,
        });
      } catch (fetchErr) {
        if (fetchErr instanceof Error && fetchErr.name === "AbortError") {
          throw new Error("Request timed out — backend may be waking up, try again in 30s.");
        }
        throw new Error("Could not reach backend. Check your connection.");
      } finally {
        clearTimeout(timeout);
      }

      const json = await res.json();
      if (res.ok) {
        setUsers((prev) => prev.map((u) => (u.uid === uid ? { ...u, role } : u)));
        setFeedback((prev) => ({ ...prev, [uid]: "Role updated. User may need to refresh." }));
      } else {
        throw new Error(json.error ?? json.message ?? "Failed.");
      }
    } catch (err) {
      setFeedback((prev) => ({ ...prev, [uid]: err instanceof Error ? err.message : "Error." }));
    } finally {
      setAssigning(null);
    }
  }

  async function createDepartment() {
    const name = newDeptName.trim();
    if (!name) return;
    if (departments.some((d) => d.name.toLowerCase() === name.toLowerCase())) {
      toast.error("A department with that name already exists.");
      return;
    }
    setCreatingDept(true);
    try {
      const ref = doc(collection(db, "departments"));
      await setDoc(ref, { name, memberUids: [], createdAt: Date.now() });
      setNewDeptName("");
      toast.success(`Department "${name}" created.`);
    } catch {
      toast.error("Failed to create department.");
    } finally {
      setCreatingDept(false);
    }
  }

  async function deleteDepartment(dept: Department) {
    if (!window.confirm(`Delete department "${dept.name}"? This cannot be undone.`)) return;
    try {
      await deleteDoc(doc(db, "departments", dept.id));
      toast.success(`Department "${dept.name}" deleted.`);
    } catch {
      toast.error("Failed to delete department.");
    }
  }

  async function addMember(dept: Department, uid: string) {
    if (dept.memberUids.includes(uid)) return;
    try {
      await updateDoc(doc(db, "departments", dept.id), {
        memberUids: [...dept.memberUids, uid],
      });
      toast.success("Member added.");
    } catch {
      toast.error("Failed to add member.");
    }
  }

  async function removeMember(dept: Department, uid: string) {
    try {
      await updateDoc(doc(db, "departments", dept.id), {
        memberUids: dept.memberUids.filter((id) => id !== uid),
      });
      toast.success("Member removed.");
    } catch {
      toast.error("Failed to remove member.");
    }
  }

  async function kickUser(u: FirestoreUser) {
    if (!window.confirm(`Kick ${u.displayName || u.email}? This will remove them from all events and departments. Their uploaded photos will remain. They can sign up again.`)) return;
    try {
      const batch = writeBatch(db);

      // 1. Delete user doc from Firestore
      batch.delete(doc(db, "users", u.uid));

      // 2. Remove from all departments
      departments.forEach((dept) => {
        if (dept.memberUids.includes(u.uid)) {
          batch.update(doc(db, "departments", dept.id), {
            memberUids: arrayRemove(u.uid),
          });
        }
      });

      await batch.commit();

      // 3. Remove from all events (assignedTo + attendees) — batch separately
      const eventsSnap = await getDocs(collection(db, "events"));
      const eventBatch = writeBatch(db);
      let eventChanges = 0;
      eventsSnap.docs.forEach((eventDoc) => {
        const data = eventDoc.data();
        const assignedTo: string[] = data.assignedTo || [];
        const attendees: { uid: string }[] = data.attendees || [];
        const inAssigned = assignedTo.includes(u.uid);
        const inAttendees = attendees.some((a) => a.uid === u.uid);
        if (inAssigned || inAttendees) {
          const updates: Record<string, unknown> = {};
          if (inAssigned) updates.assignedTo = arrayRemove(u.uid);
          if (inAttendees) updates.attendees = attendees.filter((a) => a.uid !== u.uid);
          eventBatch.update(eventDoc.ref, updates);
          eventChanges++;
        }
      });
      if (eventChanges > 0) await eventBatch.commit();

      // 4. Delete Firebase Auth account via backend
      if (FLASK_BASE && auth.currentUser) {
        const idToken = await auth.currentUser.getIdToken(true);
        await fetch(`${FLASK_BASE}/api/auth/delete-user`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${idToken}`,
          },
          body: JSON.stringify({ uid: u.uid }),
        }).catch(() => {});
      }

      setUsers((prev) => prev.filter((x) => x.uid !== u.uid));
      toast.success(`${u.displayName || u.email} has been kicked.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to kick user.");
    }
  }

  if (loading) return (
    <Layout title="Users">
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </Layout>
  );

  return (
    <Layout title="Users">
      <div className="p-4 md:p-6 space-y-6 animate-fade-in">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-violet-400" /> User Management
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">Manage roles, permissions, and departments</p>
        </div>

        {/* Users table */}
        <div className="glass-card !p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-white/06">
            <UsersIcon className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-foreground">All Users</span>
            <span className="ml-auto text-xs text-muted-foreground">{users.length} users</span>
          </div>

          {/* Desktop header */}
          <div className="hidden md:grid grid-cols-[1fr_200px_180px_100px_80px] gap-3 px-5 py-3 border-b border-white/06 text-xs font-semibold text-muted-foreground uppercase tracking-wide bg-white/02">
            <span>User</span>
            <span>Email</span>
            <span>Assign Role</span>
            <span>Current</span>
            <span>Kick</span>
          </div>

          <ul className="divide-y divide-white/05">
            {users.map((u) => (
              <li key={u.uid} className="p-4 hover:bg-white/02 transition-colors">
                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  <div className="flex items-center gap-3">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-violet-500/20" />
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-sm font-bold text-violet-300">
                        {(u.displayName || u.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.displayName || "Unnamed"}</p>
                      <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    </div>
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium capitalize", u.role ? roleColors[u.role] : "bg-white/08 text-muted-foreground")}>
                      {u.role ?? "—"}
                    </span>
                  </div>
                  <RoleSelector uid={u.uid} currentRole={u.role} assigning={assigning} onAssign={assignRole} />
                  {feedback[u.uid] && <FeedbackMsg msg={feedback[u.uid]} />}
                  <button
                    onClick={() => kickUser(u)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20 w-fit"
                  >
                    <UserMinus className="h-3.5 w-3.5" /> Kick
                  </button>
                </div>

                {/* Desktop */}
                <div className="hidden md:grid grid-cols-[1fr_200px_180px_100px_80px] gap-3 items-center">
                  <div className="flex items-center gap-3">
                    {u.photoURL ? (
                      <img src={u.photoURL} alt="" className="h-8 w-8 rounded-full object-cover ring-2 ring-violet-500/20" />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-xs font-bold text-violet-300">
                        {(u.displayName || u.email || "?")[0].toUpperCase()}
                      </div>
                    )}
                    <p className="text-sm font-medium text-foreground truncate">{u.displayName || "Unnamed"}</p>
                    <Link to={`/profile/${u.uid}`}
                      className="p-1 rounded-lg hover:bg-white/08 text-muted-foreground hover:text-foreground transition-colors"
                      aria-label={`View ${u.displayName || "user"} profile`}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                  <div className="flex flex-col gap-1">
                    <RoleSelector uid={u.uid} currentRole={u.role} assigning={assigning} onAssign={assignRole} />
                    {feedback[u.uid] && <FeedbackMsg msg={feedback[u.uid]} />}
                  </div>
                  <span className={cn("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium capitalize text-center", u.role ? roleColors[u.role] : "bg-white/08 text-muted-foreground")}>
                    {u.role ?? "—"}
                  </span>
                  <button
                    onClick={() => kickUser(u)}
                    className="flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-red-500/10 text-red-400 text-xs font-medium hover:bg-red-500/20 transition-colors border border-red-500/20"
                    title="Kick user"
                  >
                    <UserMinus className="h-3.5 w-3.5" />
                  </button>
                </div>
              </li>
            ))}
            {users.length === 0 && (
              <li className="p-12 text-center text-sm text-muted-foreground">No users found.</li>
            )}
          </ul>
        </div>

        {/* Department Management */}
        <div className="glass-card !p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/06">
            <Building2 className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-foreground">Departments</span>
            <span className="ml-auto text-xs text-muted-foreground">{departments.length} departments</span>
          </div>

          {/* Create new department */}
          <div className="flex gap-2 p-4 border-b border-white/06">
            <Input
              value={newDeptName}
              onChange={(e) => setNewDeptName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createDepartment()}
              placeholder="New department name…"
              className="rounded-xl border border-white/10 bg-white/05 text-sm"
            />
            <Button
              onClick={createDepartment}
              disabled={creatingDept || !newDeptName.trim()}
              className="shrink-0 gap-1.5"
            >
              {creatingDept ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>

          {/* Department list */}
          {deptLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : departments.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No departments yet. Create one above.</p>
          ) : (
            <ul className="divide-y divide-white/05">
              {departments.map((dept) => {
                const members = users.filter((u) => dept.memberUids.includes(u.uid));
                const nonMembers = users.filter(
                  (u) => !dept.memberUids.includes(u.uid) && (u.role === "staff" || u.role === "volunteer")
                );
                const isExpanded = expandedDept === dept.id;
                const isAddingHere = addingMember === dept.id;

                return (
                  <li key={dept.id} className="p-4 space-y-3">
                    {/* Dept header row */}
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setExpandedDept(isExpanded ? null : dept.id)}
                        className="flex-1 flex items-center gap-2 text-left"
                      >
                        <span className="text-sm font-semibold text-foreground">{dept.name}</span>
                        <span className="text-xs text-muted-foreground">
                          {members.length} member{members.length !== 1 ? "s" : ""}
                        </span>
                        {isExpanded
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                      </button>
                      <button
                        onClick={() => deleteDepartment(dept)}
                        className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        aria-label={`Delete ${dept.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Expanded: members + add */}
                    {isExpanded && (
                      <div className="space-y-2 pl-1">
                        {/* Current members */}
                        {members.length > 0 ? (
                          <div className="space-y-1.5">
                            {members.map((u) => (
                              <div key={u.uid} className="flex items-center gap-2.5 py-1 px-2 rounded-lg bg-white/03">
                                {u.photoURL ? (
                                  <img src={u.photoURL} alt="" className="h-6 w-6 rounded-full object-cover" />
                                ) : (
                                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">
                                    {(u.displayName || u.email || "?")[0].toUpperCase()}
                                  </div>
                                )}
                                <span className="flex-1 text-sm text-foreground truncate">{u.displayName || u.email}</span>
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", u.role ? roleColors[u.role] : "bg-white/08 text-muted-foreground")}>
                                  {u.role ?? "—"}
                                </span>
                                <button
                                  onClick={() => removeMember(dept, u.uid)}
                                  className="p-1 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                                  aria-label="Remove from department"
                                >
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground pl-2">No members yet.</p>
                        )}

                        {/* Add member */}
                        {isAddingHere ? (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs text-muted-foreground font-medium">Add staff / volunteer:</p>
                            {nonMembers.length === 0 ? (
                              <p className="text-xs text-muted-foreground">All eligible users are already in this department.</p>
                            ) : (
                              nonMembers.map((u) => (
                                <button
                                  key={u.uid}
                                  onClick={() => { addMember(dept, u.uid); setAddingMember(null); }}
                                  className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/06 transition-colors text-left"
                                >
                                  {u.photoURL ? (
                                    <img src={u.photoURL} alt="" className="h-6 w-6 rounded-full object-cover" />
                                  ) : (
                                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-violet-500/20 text-[10px] font-bold text-violet-300">
                                      {(u.displayName || u.email || "?")[0].toUpperCase()}
                                    </div>
                                  )}
                                  <span className="flex-1 text-sm text-foreground truncate">{u.displayName || u.email}</span>
                                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", u.role ? roleColors[u.role] : "bg-white/08 text-muted-foreground")}>
                                    {u.role ?? "—"}
                                  </span>
                                </button>
                              ))
                            )}
                            <button
                              onClick={() => setAddingMember(null)}
                              className="text-xs text-muted-foreground hover:text-foreground mt-1"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setAddingMember(dept.id)}
                            className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors pt-1"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            Add member
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Committee Management ── */}
        <div className="glass-card !p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/06">
            <UsersIcon className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-semibold text-foreground">Committees</span>
            <span className="ml-auto text-xs text-muted-foreground">{committees.length} committees</span>
          </div>

          {/* Create new committee */}
          <div className="p-4 border-b border-white/06 space-y-2">
            <div className="flex gap-2">
              <Input value={newCommittee.name} onChange={(e) => setNewCommittee((p) => ({ ...p, name: e.target.value }))}
                onKeyDown={(e) => e.key === "Enter" && createCommittee()}
                placeholder="Committee name…" className="rounded-xl border border-white/10 bg-white/05 text-sm" />
              <input type="color" value={newCommittee.color}
                onChange={(e) => setNewCommittee((p) => ({ ...p, color: e.target.value }))}
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/05 cursor-pointer p-0.5 shrink-0" />
              <Button onClick={createCommittee} disabled={creatingCommittee || !newCommittee.name.trim()} className="shrink-0 gap-1.5">
                {creatingCommittee ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />} Add
              </Button>
            </div>
            <Input value={newCommittee.description} onChange={(e) => setNewCommittee((p) => ({ ...p, description: e.target.value }))}
              placeholder="Description (optional)…" className="rounded-xl border border-white/10 bg-white/05 text-sm" />
            <select value={newCommittee.leadUid} onChange={(e) => setNewCommittee((p) => ({ ...p, leadUid: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-white/05 px-3 py-2 text-sm text-foreground focus:outline-none">
              <option value="">Select lead (optional)</option>
              {users.filter((u) => u.role === "staff" || u.role === "admin").map((u) => (
                <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
              ))}
            </select>
          </div>

          {/* Committee list */}
          {committeeLoading ? (
            <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : committees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No committees yet.</p>
          ) : (
            <ul className="divide-y divide-white/05">
              {committees.map((c) => {
                const members = users.filter((u) => c.memberUids.includes(u.uid));
                const lead = users.find((u) => u.uid === c.leadUid);
                const isExpanded = expandedCommittee === c.id;
                const isEditing = editingCommittee === c.id;
                const isAddingHere = addingCommitteeMember === c.id;
                const nonMembers = users.filter((u) => !c.memberUids.includes(u.uid) && (u.role === "staff" || u.role === "volunteer" || u.role === "admin"));
                return (
                  <li key={c.id} className="p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                      <button onClick={() => setExpandedCommittee(isExpanded ? null : c.id)}
                        className="flex-1 flex items-center gap-2 text-left">
                        <span className="text-sm font-semibold text-foreground">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{members.length} member{members.length !== 1 ? "s" : ""}</span>
                        {lead && <span className="text-xs text-muted-foreground">· Lead: {lead.displayName}</span>}
                        {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground ml-auto" /> : <ChevronDown className="h-4 w-4 text-muted-foreground ml-auto" />}
                      </button>
                      <button onClick={() => setEditingCommittee(isEditing ? null : c.id)}
                        className="p-1.5 rounded-lg text-muted-foreground hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                        <Shield className="h-4 w-4" />
                      </button>
                      <button onClick={() => deleteCommittee(c as Committee)}
                        className="p-1.5 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {c.description && !isExpanded && (
                      <p className="text-xs text-muted-foreground pl-5">{c.description}</p>
                    )}

                    {/* Edit form */}
                    {isEditing && (
                      <div className="space-y-2 pl-1 pt-1">
                        <Input defaultValue={c.name} id={`edit-name-${c.id}`}
                          className="rounded-xl border border-white/10 bg-white/05 text-sm" placeholder="Name" />
                        <Input defaultValue={c.description || ""} id={`edit-desc-${c.id}`}
                          className="rounded-xl border border-white/10 bg-white/05 text-sm" placeholder="Description" />
                        <select defaultValue={c.leadUid || ""} id={`edit-lead-${c.id}`}
                          className="w-full rounded-xl border border-white/10 bg-white/05 px-3 py-2 text-sm text-foreground focus:outline-none">
                          <option value="">No lead</option>
                          {users.filter((u) => u.role === "staff" || u.role === "admin").map((u) => (
                            <option key={u.uid} value={u.uid}>{u.displayName || u.email}</option>
                          ))}
                        </select>
                        <div className="flex gap-2">
                          <input type="color" defaultValue={c.color} id={`edit-color-${c.id}`}
                            className="h-9 w-9 rounded-lg border border-white/10 cursor-pointer p-0.5 bg-transparent" />
                          <Button size="sm" onClick={() => {
                            const name = (document.getElementById(`edit-name-${c.id}`) as HTMLInputElement)?.value.trim();
                            const description = (document.getElementById(`edit-desc-${c.id}`) as HTMLInputElement)?.value.trim();
                            const leadUid = (document.getElementById(`edit-lead-${c.id}`) as HTMLSelectElement)?.value;
                            const color = (document.getElementById(`edit-color-${c.id}`) as HTMLInputElement)?.value;
                            if (name) updateCommittee(c as Committee, { name, description, leadUid: leadUid || undefined, color });
                          }}>Save</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditingCommittee(null)}>Cancel</Button>
                        </div>
                      </div>
                    )}

                    {/* Expanded members */}
                    {isExpanded && (
                      <div className="space-y-2 pl-1">
                        {c.description && <p className="text-xs text-muted-foreground">{c.description}</p>}
                        {members.length > 0 ? (
                          <div className="space-y-1.5">
                            {members.map((u) => (
                              <div key={u.uid} className="flex items-center gap-2.5 py-1 px-2 rounded-lg bg-white/03">
                                {u.photoURL ? <img src={u.photoURL} alt="" className="h-6 w-6 rounded-full object-cover" />
                                  : <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">{(u.displayName || u.email || "?")[0].toUpperCase()}</div>}
                                <span className="flex-1 text-sm text-foreground truncate">{u.displayName || u.email}</span>
                                {u.uid === c.leadUid && <span className="text-[10px] text-emerald-400 font-medium">Lead</span>}
                                <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", u.role ? roleColors[u.role] : "bg-white/08 text-muted-foreground")}>{u.role ?? "—"}</span>
                                <button onClick={() => removeCommitteeMember(c as Committee, u.uid)}
                                  className="p-1 rounded-lg text-red-400/50 hover:text-red-400 hover:bg-red-500/10 transition-colors">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : <p className="text-xs text-muted-foreground pl-2">No members yet.</p>}

                        {isAddingHere ? (
                          <div className="space-y-1.5 pt-1">
                            <p className="text-xs text-muted-foreground font-medium">Add member:</p>
                            {nonMembers.length === 0 ? <p className="text-xs text-muted-foreground">All eligible users are already in this committee.</p>
                              : nonMembers.map((u) => (
                                <button key={u.uid} onClick={() => addCommitteeMember(c as Committee, u.uid)}
                                  className="w-full flex items-center gap-2.5 py-1.5 px-2 rounded-lg hover:bg-white/06 transition-colors text-left">
                                  {u.photoURL ? <img src={u.photoURL} alt="" className="h-6 w-6 rounded-full object-cover" />
                                    : <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-[10px] font-bold text-emerald-300">{(u.displayName || u.email || "?")[0].toUpperCase()}</div>}
                                  <span className="flex-1 text-sm text-foreground truncate">{u.displayName || u.email}</span>
                                  <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", u.role ? roleColors[u.role] : "bg-white/08 text-muted-foreground")}>{u.role ?? "—"}</span>
                                </button>
                              ))}
                            <button onClick={() => setAddingCommitteeMember(null)} className="text-xs text-muted-foreground hover:text-foreground mt-1">Cancel</button>
                          </div>
                        ) : (
                          <button onClick={() => setAddingCommitteeMember(c.id)}
                            className="flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 transition-colors pt-1">
                            <Plus className="h-3.5 w-3.5" /> Add member
                          </button>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* ── Event Category Management ── */}
        <div className="glass-card !p-0 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-white/06">
            <Tag className="h-4 w-4 text-violet-400" />
            <span className="text-sm font-semibold text-foreground">Event Categories</span>
            <span className="ml-auto text-xs text-muted-foreground">{categories.length} categories</span>
          </div>

          {/* Create new category */}
          <div className="flex gap-2 p-4 border-b border-white/06">
            <Input
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && createCategory()}
              placeholder="New category name…"
              className="rounded-xl border border-white/10 bg-white/05 text-sm"
            />
            <div className="relative shrink-0">
              <input
                type="color"
                value={newCatColor}
                onChange={(e) => setNewCatColor(e.target.value)}
                title="Pick color"
                className="h-10 w-10 rounded-xl border border-white/10 bg-white/05 cursor-pointer p-0.5"
              />
            </div>
            <Button
              onClick={createCategory}
              disabled={creatingCat || !newCatName.trim()}
              className="shrink-0 gap-1.5"
            >
              {creatingCat ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Add
            </Button>
          </div>

          {/* Category list */}
          {catLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : categories.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-10">No categories yet. Create one above.</p>
          ) : (
            <ul className="divide-y divide-white/05">
              {categories.map((cat) => (
                <li key={cat.id} className="flex items-center gap-3 px-5 py-3">
                  {/* Color swatch — click to edit */}
                  <input
                    type="color"
                    value={cat.color || "#8b5cf6"}
                    onChange={(e) => updateCategoryColor(cat, e.target.value)}
                    title="Change color"
                    className="h-7 w-7 shrink-0 rounded-lg border border-white/10 cursor-pointer p-0.5 bg-transparent"
                  />
                  <span
                    className="flex-1 text-sm font-medium rounded-full px-3 py-0.5 w-fit"
                    style={{ backgroundColor: `${cat.color || "#8b5cf6"}22`, color: cat.color || "#8b5cf6", border: `1px solid ${cat.color || "#8b5cf6"}44` }}
                  >
                    {cat.name}
                  </span>
                  <button
                    onClick={() => deleteCategory(cat)}
                    className="ml-auto p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    aria-label="Delete category"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Layout>
  );
}

function RoleSelector({ uid, currentRole, assigning, onAssign }:
  { uid: string; currentRole?: UserRole; assigning: string | null; onAssign: (uid: string, role: UserRole) => void }) {
  const [selected, setSelected] = useState<UserRole>(currentRole ?? "viewer");
  const isLoading = assigning === uid;
  return (
    <div className="flex gap-2">
      <select value={selected} onChange={(e) => setSelected(e.target.value as UserRole)} disabled={isLoading}
        className="flex-1 rounded-xl border border-white/10 bg-white/05 px-2.5 py-1.5 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-violet-500/40 disabled:opacity-60 transition-all">
        {ROLES.map((r) => <option key={r} value={r} className="capitalize">{r}</option>)}
      </select>
      <button onClick={() => onAssign(uid, selected)} disabled={isLoading || selected === currentRole}
        className="flex items-center gap-1 rounded-xl bg-violet-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-violet-500 disabled:opacity-50 transition-all">
        {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <UserCheck className="h-3 w-3" />}
        {!isLoading && "Assign"}
      </button>
    </div>
  );
}

function FeedbackMsg({ msg }: { msg: string }) {
  const isError = msg.toLowerCase().includes("fail") || msg.toLowerCase().includes("error");
  return (
    <div className={cn("flex items-center gap-1 text-xs", isError ? "text-red-400" : "text-emerald-400")}>
      {isError && <AlertCircle className="h-3 w-3" />}
      {msg}
    </div>
  );
}

const demoUsers: FirestoreUser[] = [
  { uid: "uid1", displayName: "Priya Sharma", email: "priya@ngo.org", role: "admin", createdAt: Date.now() - 60*86400000 },
  { uid: "uid2", displayName: "Rohan Mehta", email: "rohan@ngo.org", role: "staff", createdAt: Date.now() - 30*86400000 },
  { uid: "uid3", displayName: "Ananya Patel", email: "ananya@ngo.org", role: "volunteer", createdAt: Date.now() - 15*86400000 },
  { uid: "uid4", displayName: "Siddharth Joshi", email: "sid@ngo.org", role: "viewer", createdAt: Date.now() - 5*86400000 },
];

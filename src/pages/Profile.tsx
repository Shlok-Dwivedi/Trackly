import { useEffect, useState, useCallback } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  serverTimestamp,
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
} from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import {
  User,
  Mail,
  Phone,
  Building2,
  Save,
  Loader2,
  Calendar,
  ImageIcon,
  Trash2,
  Bell,
  Lock,
  Camera,
  Edit,
  ArrowLeft,
  LogOut,
} from "lucide-react";
import { db, auth } from "@/lib/firebase";
import { supabase, uploadAvatar, deleteStorageFile } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthContext";
import { writeActivityLog } from "@/lib/activityLog";
import Layout from "@/components/layout/Layout";
import StatusBadge from "@/components/StatusBadge";
import { FirestoreUser, FirestoreEvent, EventPhoto, NotificationPrefs, UserRole, Attendee } from "@/types";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const BIO_MAX = 300;
const DEFAULT_PREFS: NotificationPrefs = {
  email: true,
  push: true,
  onAssignment: true,
  onStatusChange: true,
  reminder24hr: true,
  reminder6hr: true,
  reminder3hr: true,
};

const ROLES: UserRole[] = ["admin", "staff", "volunteer", "viewer"];

interface MyPhotoItem {
  url: string;
  storagePath?: string;
  eventId: string;
  eventTitle: string;
  timestamp: number;
}

// Helper function to convert Firestore timestamp to milliseconds
function toMillis(value: unknown): number {
  if (!value) return 0;
  if (typeof value === "number") return value;
  if (typeof value === "object" && "toMillis" in value && typeof value.toMillis === "function") {
    return value.toMillis();
  }
  return 0;
}

// Helper to convert date to ISO string for input
function toInputDate(ms: number): string {
  if (!ms) return "";
  const d = new Date(ms);
  return d.toISOString().split("T")[0];
}

export default function Profile() {
  const { user: authUser, role: currentUserRole, logout } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const [userDoc, setUserDoc] = useState<FirestoreUser | null>(null);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("");
  const [bio, setBio] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);
  const [myEvents, setMyEvents] = useState<FirestoreEvent[]>([]);
  const [myPhotos, setMyPhotos] = useState<MyPhotoItem[]>([]);
  const [stats, setStats] = useState({
    assigned: 0,
    completed: 0,
    photosUploaded: 0,
    memberSince: 0,
  });
  const [lightboxPhoto, setLightboxPhoto] = useState<MyPhotoItem | null>(null);
  const [deletingPhoto, setDeletingPhoto] = useState<string | null>(null);
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  
  // Role change dialog for admin
  const [roleChangeOpen, setRoleChangeOpen] = useState(false);
  const [selectedRole, setSelectedRole] = useState<UserRole | "">("");
  const [changingRole, setChangingRole] = useState(false);
  
  // Member since editing (admin only)
  const [memberSinceEdit, setMemberSinceEdit] = useState<string>("");
  const [savingMemberSince, setSavingMemberSince] = useState(false);
  const [memberSinceEditing, setMemberSinceEditing] = useState(false);

  // Departments fetched from Firestore
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);

  // Determine if viewing own profile or another user's profile
  const viewUid = params.uid || authUser?.uid;
  const isViewingOwnProfile = !params.uid || params.uid === authUser?.uid;
  const uid = viewUid || authUser?.uid;
  
  // Admin can edit other users' profiles
  const canEdit = isViewingOwnProfile || currentUserRole === "admin";
  const canChangeRole = !isViewingOwnProfile && currentUserRole === "admin";
  const canEditMemberSince = currentUserRole === "admin" && !isViewingOwnProfile;
  
  const isEmailProvider = authUser?.providerData?.some(
    (p) => p.providerId === "password"
  );

  // Fetch departments for dropdown
  useEffect(() => {
    const unsub = onSnapshot(
      query(collection(db, "departments"), orderBy("createdAt", "asc")),
      (snap) => {
        setDepartmentOptions(snap.docs.map((d) => d.data().name as string));
      },
      () => {} // silently fail, fallback to empty
    );
    return unsub;
  }, []);

  // Live user doc - for own profile or admin/staff viewing others
  useEffect(() => {
    if (!uid) {
      setLoadingUser(false);
      return;
    }
    
    const unsub = onSnapshot(doc(db, "users", uid), (snap) => {
      const data = snap.exists() ? (snap.data() as FirestoreUser) : null;
      setUserDoc(data ? { uid: snap.id, ...data } : null);
      if (data) {
        // Only populate edit fields if viewing own profile
        if (isViewingOwnProfile) {
          setDisplayName(data.displayName ?? "");
          setPhone(data.phone ?? "");
          setDepartment(data.department ?? "");
          setBio(data.bio ?? "");
          setPrefs({ ...DEFAULT_PREFS, ...data.notificationPrefs });
        }
        const memberSinceMs = toMillis(data.createdAt);
        setStats((s) => ({ ...s, memberSince: memberSinceMs }));
        setMemberSinceEdit(toInputDate(memberSinceMs));
      } else {
        if (isViewingOwnProfile) {
          setDisplayName(authUser?.displayName ?? "");
          setPhone("");
          setDepartment("");
          setBio("");
        }
      }
      setLoadingUser(false);
    });
    return () => unsub();
  }, [uid, authUser, isViewingOwnProfile]);

  // My events: assignedTo contains uid OR user is in attendees array
  useEffect(() => {
    if (!uid) return;
    
    // Query 1: Events where user is assigned
    const q1 = query(
      collection(db, "events"),
      where("assignedTo", "array-contains", uid),
      limit(100)
    );
    
    // We'll fetch all events and filter for attendees since Firestore
    // doesn't support array-contains on sub-collection fields efficiently
    const unsub1 = onSnapshot(q1, (snap) => {
      const assignedEvents = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEvent));
      
      // Also fetch all events to check attendees
      const allEventsQuery = query(collection(db, "events"), limit(200));
      getDocs(allEventsQuery).then((allSnap) => {
        const allEvents = allSnap.docs.map((d) => ({ id: d.id, ...d.data() } as FirestoreEvent));
        
        // Filter events where user is in attendees
        const attendedEvents = allEvents.filter((ev) => 
          ev.attendees?.some((a: Attendee) => a.uid === uid)
        );
        
        // Combine unique events (avoid duplicates)
        const assignedIds = new Set(assignedEvents.map(e => e.id));
        const uniqueAttended = attendedEvents.filter(e => !assignedIds.has(e.id));
        const allUserEvents = [...assignedEvents, ...uniqueAttended];
        
        setMyEvents(allUserEvents);
        const assigned = allUserEvents.length;
        const completed = allUserEvents.filter((e) => e.status === "Completed").length;
        setStats((s) => ({ ...s, assigned, completed }));
      });
    });
    
    return () => unsub1();
  }, [uid]);

  // My photos: fetch events and filter photos by uploadedBy
  useEffect(() => {
    if (!uid) return;
    let mounted = true;
    (async () => {
      const snap = await getDocs(
        query(collection(db, "events"), limit(200))
      );
      if (!mounted) return;
      const items: MyPhotoItem[] = [];
      let count = 0;
      snap.docs.forEach((d) => {
        const ev = { id: d.id, ...d.data() } as FirestoreEvent;
        const photos = ev.photos ?? [];
        photos.forEach((p: EventPhoto) => {
          if (p.uploadedBy === uid) {
            count++;
            items.push({
              url: p.url,
              storagePath: p.storagePath,
              eventId: ev.id,
              eventTitle: ev.title,
              timestamp: p.timestamp,
            });
          }
        });
      });
      setMyPhotos(items);
      setStats((s) => ({ ...s, photosUploaded: count }));
    })();
    return () => { mounted = false; };
  }, [uid]);

  const handleSaveProfile = useCallback(async () => {
    if (!uid || !authUser) return;
    setSaving(true);
    try {
      let photoURL = userDoc?.photoURL ?? authUser.photoURL ?? "";
      if (avatarFile && supabase) {
        photoURL = await uploadAvatar(avatarFile, uid);
        setAvatarFile(null);
        setAvatarPreview(null);
      }
      await updateDoc(doc(db, "users", uid), {
        displayName: displayName.trim() || userDoc?.displayName,
        phone: phone.trim() || null,
        department: department || null,
        bio: bio.length > BIO_MAX ? bio.slice(0, BIO_MAX) : bio.trim() || null,
        photoURL: photoURL || null,
        updatedAt: serverTimestamp(),
      });
      if (auth.currentUser) {
        await updateProfile(auth.currentUser, {
          displayName: displayName.trim() || undefined,
          photoURL: photoURL || undefined,
        });
      }
      await writeActivityLog(
        "profile_updated",
        uid,
        displayName.trim() || authUser.displayName || "User",
        "user",
        uid,
        displayName.trim() || authUser.displayName || "Profile",
        { newValue: { displayName, phone, department, bio: bio.slice(0, BIO_MAX) } }
      );
      setEditing(false);
      toast.success("Profile updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  }, [uid, authUser, userDoc, displayName, phone, department, bio, avatarFile]);

  const handleRoleChange = useCallback(async () => {
    if (!uid || !selectedRole || !authUser) return;
    setChangingRole(true);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("Not authenticated");
      const idToken = await currentUser.getIdToken();
      
      const flaskUrl = import.meta.env.VITE_FLASK_API_URL || "http://localhost:5000";
      const res = await fetch(`${flaskUrl}/api/auth/set-role`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${idToken}`,
        },
        body: JSON.stringify({ uid, role: selectedRole }),
      });
      
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Failed to change role");
      }
      
      await writeActivityLog(
        "role_changed",
        authUser.uid,
        authUser.displayName || "Admin",
        "user",
        uid,
        userDoc?.displayName || userDoc?.email || "User",
        { oldValue: userDoc?.role, newValue: selectedRole }
      );
      
      toast.success(`Role changed to ${selectedRole}`);
      setRoleChangeOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to change role");
    } finally {
      setChangingRole(false);
    }
  }, [uid, selectedRole, authUser, userDoc]);

  const handleSaveMemberSince = useCallback(async () => {
    if (!uid || !canEditMemberSince) return;
    setSavingMemberSince(true);
    try {
      const newDate = new Date(memberSinceEdit).getTime();
      await updateDoc(doc(db, "users", uid), {
        createdAt: newDate,
        updatedAt: serverTimestamp(),
      });
      setStats((s) => ({ ...s, memberSince: newDate }));
      setMemberSinceEditing(false);
      toast.success("Member since date updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update date");
    } finally {
      setSavingMemberSince(false);
    }
  }, [uid, memberSinceEdit, canEditMemberSince]);

  const handlePrefChange = useCallback(
    async (key: keyof NotificationPrefs, value: boolean) => {
      if (!uid) return;
      const next = { ...prefs, [key]: value };
      setPrefs(next);
      try {
        await updateDoc(doc(db, "users", uid), {
          notificationPrefs: next,
          updatedAt: serverTimestamp(),
        });
        toast.success("Preferences saved");
      } catch {
        toast.error("Failed to save preferences");
      }
    },
    [uid, prefs]
  );

  const handleDeleteMyPhoto = useCallback(
    async (item: MyPhotoItem) => {
      if (!uid || !authUser) return;
      setDeletingPhoto(item.url);
      try {
        if (item.storagePath) {
          await deleteStorageFile(item.storagePath);
        }
        const eventSnap = await getDoc(doc(db, "events", item.eventId));
        if (eventSnap.exists()) {
          const ev = eventSnap.data() as FirestoreEvent;
          const photos = (ev.photos ?? []).filter(
            (p) => !(p.url === item.url && p.uploadedBy === uid)
          );
          await updateDoc(doc(db, "events", item.eventId), {
            photos,
            updatedAt: serverTimestamp(),
          });
        }
        await writeActivityLog(
          "photo_deleted",
          uid,
          authUser.displayName || "User",
          "event",
          item.eventId,
          item.eventTitle,
          { note: "Photo removed from profile" }
        );
        setMyPhotos((prev) => prev.filter((p) => p.url !== item.url));
        setStats((s) => ({ ...s, photosUploaded: Math.max(0, s.photosUploaded - 1) }));
        toast.success("Photo deleted");
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed to delete photo");
      } finally {
        setDeletingPhoto(null);
      }
    },
    [uid, authUser]
  );

  const handleChangePassword = useCallback(async () => {
    if (!authUser || !newPassword.trim()) return;
    setChangingPassword(true);
    try {
      const { updatePassword } = await import("firebase/auth");
      await updatePassword(authUser, newPassword);
      setNewPassword("");
      setChangePasswordOpen(false);
      toast.success("Password updated");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update password");
    } finally {
      setChangingPassword(false);
    }
  }, [authUser, newPassword]);

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  const groupedEvents = {
    upcoming: myEvents.filter((e) => e.status === "Planned"),
    ongoing: myEvents.filter((e) => e.status === "Ongoing"),
    completed: myEvents.filter((e) => e.status === "Completed"),
  };

  const roleBadgeColor: Record<UserRole, string> = {
    admin: "bg-red-500/15 text-red-400 border border-red-500/20",
    staff: "bg-violet-500/15 text-violet-400 border border-violet-500/20",
    volunteer: "bg-amber-500/15 text-amber-400 border border-amber-500/20",
    viewer: "bg-white/08 text-muted-foreground border border-white/10",
  };

  // Loading state
  if (loadingUser) {
    return (
      <Layout title="Profile">
        <div className="flex items-center justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!uid) {
    return (
      <Layout title="Profile">
        <div className="p-6 text-center text-muted-foreground">Please log in.</div>
      </Layout>
    );
  }

  // Determine the page title
  const pageTitle = isViewingOwnProfile ? "Profile" : `Profile: ${userDoc?.displayName || userDoc?.email || 'User'}`;
  const userRole = isViewingOwnProfile ? currentUserRole : userDoc?.role;

  return (
    <Layout title={pageTitle}>
      <div className="p-4 md:p-6 space-y-6 animate-fade-in max-w-3xl mx-auto">
        {/* Back button for viewing other users */}
        {!isViewingOwnProfile && (
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate(-1)}
            className="gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
        )}

        {/* A) Profile Header */}
        <div className="glass-card !p-0 overflow-hidden">
          <div className="p-5 md:p-6">
            {canEdit && editing ? (
              /* ── EDIT MODE: single column form ── */
              <div className="flex flex-col sm:flex-row gap-5">
                <div className="flex flex-col items-center gap-2">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {avatarPreview ? (
                        <img src={avatarPreview} alt="Avatar" className="h-full w-full object-cover" />
                      ) : userDoc?.photoURL || authUser?.photoURL ? (
                        <img src={userDoc?.photoURL || authUser?.photoURL || ""} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-12 w-12 text-muted-foreground" />
                      )}
                    </div>
                    <label className="absolute bottom-0 right-0 flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground cursor-pointer">
                      <Camera className="h-4 w-4" />
                      <input type="file" accept="image/*" className="sr-only"
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) { setAvatarFile(f); setAvatarPreview(URL.createObjectURL(f)); }
                        }}
                      />
                    </label>
                  </div>
                </div>
                <div className="flex-1 space-y-3">
                  <div>
                    <Label htmlFor="displayName">Display name</Label>
                    <Input id="displayName" value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                      className="mt-1 rounded-xl border border-white/10 bg-white/05" placeholder="Your name" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)}
                        className="mt-1 rounded-xl border border-white/10 bg-white/05" placeholder="Optional" />
                    </div>
                    <div>
                      <Label htmlFor="department">Department</Label>
                      <Select value={department} onValueChange={(v) => setDepartment(v)}>
                        <SelectTrigger id="department" className="mt-1 rounded-xl border border-white/10 bg-white/05">
                          <SelectValue placeholder="Select department" />
                        </SelectTrigger>
                        <SelectContent>
                          {departmentOptions.length === 0 ? (
                            <SelectItem value="none" disabled>No departments created yet</SelectItem>
                          ) : (
                            departmentOptions.map((dept) => (
                              <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="bio">Bio ({bio.length}/{BIO_MAX})</Label>
                    <Textarea id="bio" value={bio} onChange={(e) => setBio(e.target.value.slice(0, BIO_MAX))}
                      className="mt-1 rounded-xl border border-white/10 bg-white/05" rows={3}
                      placeholder="Optional, max 300 characters" />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveProfile} disabled={saving} className="gap-2">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Save
                    </Button>
                    <Button variant="outline" onClick={() => {
                      setEditing(false); setAvatarFile(null); setAvatarPreview(null);
                      setDisplayName(userDoc?.displayName ?? ""); setPhone(userDoc?.phone ?? "");
                      setDepartment(userDoc?.department ?? ""); setBio(userDoc?.bio ?? "");
                    }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              /* ── VIEW MODE: two-column on desktop ── */
              <div className="flex flex-col md:flex-row gap-6">
                {/* LEFT: avatar + name + bio + button */}
                <div className="flex flex-col gap-3 md:w-[55%]">
                  <div className="flex items-center gap-4">
                    <div className="h-20 w-20 shrink-0 rounded-full overflow-hidden bg-muted flex items-center justify-center">
                      {userDoc?.photoURL || authUser?.photoURL ? (
                        <img src={userDoc?.photoURL || authUser?.photoURL || ""} alt="Profile" className="h-full w-full object-cover" />
                      ) : (
                        <User className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h1 className="text-xl font-bold text-foreground truncate">
                          {userDoc?.displayName || authUser?.displayName || "No name"}
                        </h1>
                        {userRole && (
                          <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize shrink-0",
                            roleBadgeColor[userRole as keyof typeof roleBadgeColor])}>
                            {userRole}
                          </span>
                        )}
                      </div>
                      {canChangeRole && (
                        <Button variant="outline" size="sm" className="mt-1"
                          onClick={() => { setSelectedRole(userDoc?.role || "viewer"); setRoleChangeOpen(true); }}>
                          Change Role
                        </Button>
                      )}
                    </div>
                  </div>
                  {userDoc?.bio && (
                    <p className="hidden md:block text-sm text-foreground leading-relaxed">{userDoc.bio}</p>
                  )}
                  <div className="flex gap-2 flex-wrap">
                    {canEdit && (
                      <Button variant="outline" size="sm" onClick={() => setEditing(true)} className="gap-2">
                        <Edit className="h-4 w-4" />
                        Edit profile
                      </Button>
                    )}
                    {!isViewingOwnProfile && authUser?.uid && authUser.uid !== uid && (
                      <Link to="/profile">
                        <Button variant="outline" size="sm" className="gap-2">
                          <User className="h-4 w-4" />
                          View my profile
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>

                {/* DIVIDER */}
                <div className="hidden md:block w-px bg-white/08 self-stretch" />

                {/* RIGHT: contact details */}
                <div className="flex flex-col justify-center gap-3 md:flex-1">
                  <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                    <Mail className="h-4 w-4 shrink-0 text-violet-400" />
                    <span className="truncate">{userDoc?.email || authUser?.email || "—"}</span>
                  </div>
                  {userDoc?.phone && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Phone className="h-4 w-4 shrink-0 text-violet-400" />
                      <span>{userDoc.phone}</span>
                    </div>
                  )}
                  {userDoc?.department && (
                    <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                      <Building2 className="h-4 w-4 shrink-0 text-violet-400" />
                      <span>{userDoc.department}</span>
                    </div>
                  )}
                  {/* Mobile: show bio inline below contact if no desktop */}
                  {userDoc?.bio && (
                    <p className="text-sm text-foreground leading-relaxed md:hidden">{userDoc.bio}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* B) Activity Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="glass-card flex flex-col gap-1">
            <Calendar className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.assigned}</p>
            <p className="text-xs text-muted-foreground">Events assigned</p>
          </div>
          <div className="glass-card flex flex-col gap-1">
            <Calendar className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.completed}</p>
            <p className="text-xs text-muted-foreground">Events completed</p>
          </div>
          <div className="glass-card flex flex-col gap-1">
            <ImageIcon className="h-5 w-5 text-primary" />
            <p className="text-2xl font-bold text-foreground">{stats.photosUploaded}</p>
            <p className="text-xs text-muted-foreground">Photos uploaded</p>
          </div>
          <div className="glass-card flex flex-col gap-1">
            <User className="h-5 w-5 text-primary" />
            {memberSinceEditing && canEditMemberSince ? (
              <div className="flex flex-col gap-1">
                <Input
                  type="date"
                  value={memberSinceEdit}
                  onChange={(e) => setMemberSinceEdit(e.target.value)}
                  className="h-8 text-lg"
                />
                <div className="flex gap-1">
                  <Button size="sm" onClick={handleSaveMemberSince} disabled={savingMemberSince}>
                    {savingMemberSince ? <Loader2 className="h-3 w-3" /> : "Save"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setMemberSinceEditing(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-2xl font-bold text-foreground">
                  {stats.memberSince
                    ? new Date(stats.memberSince).toLocaleDateString("en-US", { month: "short", year: "numeric" })
                    : "—"}
                </p>
                <div className="flex items-center gap-1">
                  <p className="text-xs text-muted-foreground">Member since</p>
                  {canEditMemberSince && (
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-5 px-1" 
                      onClick={() => setMemberSinceEditing(true)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* C) My Events */}
        <div>
          <h2 className="text-lg font-semibold text-foreground mb-3">
            {isViewingOwnProfile ? "My Events" : "Events"}
          </h2>
          <div className="space-y-4">
            {["upcoming", "ongoing", "completed"].map((key) => {
              const list = groupedEvents[key as keyof typeof groupedEvents];
              const title =
                key === "upcoming" ? "Upcoming" : key === "ongoing" ? "Ongoing" : "Completed";
              if (list.length === 0) return null;
              return (
                <div key={key}>
                  <p className="text-xs font-medium text-muted-foreground mb-2">{title}</p>
                  <ul className="space-y-2">
                    {list.map((ev) => (
                      <li key={ev.id}>
                        <button
                          type="button"
                          onClick={() => navigate(`/events/${ev.id}`)}
                          className="w-full flex w-full glass rounded-xl border border-white/08 p-3 text-left items-center justify-between gap-2 hover:bg-white/05 transition-colors"
                        >
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate">{ev.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(ev.startDate).toLocaleDateString()} · {ev.category}
                            </p>
                          </div>
                          <StatusBadge status={ev.status} />
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
          {myEvents.length === 0 && (
            <p className="text-sm text-muted-foreground">No events assigned.</p>
          )}
        </div>

        {/* D) My Photos - only show for own profile */}
        {isViewingOwnProfile && (
          <div>
            <h2 className="text-lg font-semibold text-foreground mb-3">My Photos</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {myPhotos.map((item) => (
                <div
                  key={`${item.eventId}-${item.timestamp}`}
                  className="relative group rounded-xl overflow-hidden border border-white/10 bg-white/05 aspect-square"
                >
                  <button
                    type="button"
                    onClick={() => setLightboxPhoto(item)}
                    className="block w-full h-full"
                  >
                    <img
                      src={item.url}
                      alt=""
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </button>
                  <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/60 text-white text-xs">
                    <p className="truncate font-medium">{item.eventTitle}</p>
                    <p>{new Date(item.timestamp).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (deletingPhoto === item.url) return;
                      if (typeof window !== "undefined" && window.confirm("Delete this photo?")) {
                        handleDeleteMyPhoto(item);
                      }
                    }}
                    disabled={deletingPhoto === item.url}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity disabled:opacity-50"
                    aria-label="Delete photo"
                  >
                    {deletingPhoto === item.url ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </button>
                </div>
              ))}
            </div>
            {myPhotos.length === 0 && (
              <p className="text-sm text-muted-foreground">No photos uploaded yet.</p>
            )}
          </div>
        )}

        {/* Lightbox */}
        <Dialog open={!!lightboxPhoto} onOpenChange={() => setLightboxPhoto(null)}>
          <DialogContent className="max-w-4xl p-0 overflow-hidden">
            {lightboxPhoto && (
              <>
                <img
                  src={lightboxPhoto.url}
                  alt=""
                  className="w-full max-h-[85vh] object-contain"
                />
                <DialogHeader className="p-4 border-t">
                  <DialogTitle className="text-base">
                    {lightboxPhoto.eventTitle} · {new Date(lightboxPhoto.timestamp).toLocaleString()}
                  </DialogTitle>
                </DialogHeader>
              </>
            )}
          </DialogContent>
        </Dialog>

        {/* E) Notification Preferences - only show for own profile */}
        {isViewingOwnProfile && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notification preferences
            </h2>
            <div className="space-y-4">
              {[
                { key: "email" as const, label: "Email notifications" },
                { key: "push" as const, label: "Push notifications" },
                { key: "onAssignment" as const, label: "When assigned to an event" },
                { key: "onStatusChange" as const, label: "When event status changes" },
                { key: "reminder24hr" as const, label: "Remind me 24 hours before event" },
                { key: "reminder6hr" as const, label: "Remind me 6 hours before event" },
                { key: "reminder3hr" as const, label: "Remind me 3 hours before event" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between">
                  <Label htmlFor={key} className="cursor-pointer flex-1">
                    {label}
                  </Label>
                  <Switch
                    id={key}
                    checked={prefs[key] ?? true}
                    onCheckedChange={(v) => handlePrefChange(key, v)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* F) Security - only show for own profile */}
        {isViewingOwnProfile && (
          <div className="glass-card">
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <Lock className="h-5 w-5" />
              Security
            </h2>
            {userDoc?.lastLoginAt && (
              <p className="text-sm text-muted-foreground mb-3">
                Last login: {new Date(userDoc.lastLoginAt).toLocaleString()}
              </p>
            )}
            {isEmailProvider && (
              <Button variant="outline" onClick={() => setChangePasswordOpen(true)}>
                Change password
              </Button>
            )}
            {!isEmailProvider && (
              <p className="text-sm text-muted-foreground">Signed in with Google. Password change not applicable.</p>
            )}
          </div>
        )}

        {/* G) Sign Out - only for own profile, mobile-friendly */}
        {isViewingOwnProfile && (
          <div className="glass-card">
            <Button
              variant="destructive"
              className="w-full flex items-center gap-2 justify-center"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </Button>
          </div>
        )}

        {/* Password Change Dialog - only for own profile */}
        {isViewingOwnProfile && (
          <Dialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Change password</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <Label htmlFor="newPassword">New password</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Min 6 characters"
                />
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setChangePasswordOpen(false)}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleChangePassword}
                    disabled={newPassword.length < 6 || changingPassword}
                  >
                    {changingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Role Change Dialog - for admin viewing other users */}
        <Dialog open={roleChangeOpen} onOpenChange={setRoleChangeOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Change User Role</DialogTitle>
              <DialogDescription>
                You are about to change the role for {userDoc?.displayName || userDoc?.email || 'this user'}.
                This will affect their access permissions.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <Label htmlFor="roleSelect">Select new role</Label>
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as UserRole)}>
                <SelectTrigger id="roleSelect">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((role) => (
                    <SelectItem key={role} value={role} className="capitalize">
                      {role}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRoleChangeOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRoleChange}
                disabled={!selectedRole || selectedRole === userDoc?.role || changingRole}
              >
                {changingRole ? <Loader2 className="h-4 w-4 animate-spin" /> : "Change Role"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}

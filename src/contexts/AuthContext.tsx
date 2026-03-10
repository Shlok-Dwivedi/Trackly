import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut,
  createUserWithEmailAndPassword,
  User,
} from "firebase/auth";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { auth, db, messaging } from "@/lib/firebase";
import { UserRole } from "@/types";

// ---------- Demo mode ----------
// When Firebase is not yet configured, a fake admin user is used so the app
// can be fully explored with demo data.
const DEMO_USER_KEY = "edungo_demo_user";

interface DemoUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  role: UserRole;
}

function getDemoUser(): DemoUser | null {
  try {
    const raw = sessionStorage.getItem(DEMO_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setDemoUser(u: DemoUser | null) {
  if (u) sessionStorage.setItem(DEMO_USER_KEY, JSON.stringify(u));
  else sessionStorage.removeItem(DEMO_USER_KEY);
}

// --------------------------------

interface AuthUser extends User {
  role?: UserRole;
}

interface AuthContextType {
  user: AuthUser | null;
  role: UserRole | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  signupWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  loginAsDemo: (role?: UserRole) => void;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Check if Firebase has real credentials (not placeholder strings)
const FIREBASE_CONFIGURED = true;

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore demo session immediately
  useEffect(() => {
    const demo = getDemoUser();
    if (demo) {
      setUser(demo as unknown as AuthUser);
      setRole(demo.role);
      setLoading(false);
      return;
    }

    if (!FIREBASE_CONFIGURED) {
      // Firebase not set up — skip listener to avoid auth errors
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const userRole = await fetchRole(firebaseUser);
        setUser({ ...firebaseUser, role: userRole ?? undefined });
        setRole(userRole);
        await ensureUserDoc(firebaseUser);
        saveFcmToken(firebaseUser.uid);
      } else {
        setUser(null);
        setRole(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function fetchRole(firebaseUser: User): Promise<UserRole | null> {
    try {
      const result = await firebaseUser.getIdTokenResult(true);
      return (result.claims.role as UserRole) || null;
    } catch {
      return null;
    }
  }

  async function saveFcmToken(uid: string) {
    try {
      if (!messaging) return;
      const { getToken } = await import("firebase/messaging");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") return;
      const token = await getToken(messaging, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY,
      });
      if (token) {
        await setDoc(doc(db, "users", uid), { fcmToken: token }, { merge: true });
      }
    } catch {
      // FCM not available in this environment
    }
  }

  async function ensureUserDoc(firebaseUser: User) {
    const ref = doc(db, "users", firebaseUser.uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) {
      await setDoc(ref, {
        uid: firebaseUser.uid,
        displayName: firebaseUser.displayName || "",
        email: firebaseUser.email || "",
        photoURL: firebaseUser.photoURL || "",
        createdAt: serverTimestamp(),
      });
    }
  }

  async function loginWithEmail(email: string, password: string) {
    if (!FIREBASE_CONFIGURED) {
      throw new Error("Firebase is not configured. Use the Demo login instead.");
    }
    const cred = await signInWithEmailAndPassword(auth, email, password);
    const userRole = await fetchRole(cred.user);
    setRole(userRole);
  }

async function loginWithGoogle() {
    if (!FIREBASE_CONFIGURED) {
      throw new Error("Firebase is not configured. Use the Demo login instead.");
    }
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    const userRole = await fetchRole(cred.user);
    setRole(userRole);
  }

  async function signupWithEmail(email: string, password: string, displayName: string) {
    if (!FIREBASE_CONFIGURED) {
      throw new Error("Firebase is not configured. Use the Demo login instead.");
    }
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await setDoc(doc(db, "users", cred.user.uid), {
      uid: cred.user.uid,
      displayName: displayName,
      email: email,
      photoURL: cred.user.photoURL || "",
      role: "viewer",
      createdAt: serverTimestamp(),
    });
    setRole("viewer");
  }

  function loginAsDemo(selectedRole: UserRole = "admin") {
    const demo: DemoUser = {
      uid: "demo-uid",
      displayName: "Demo Admin",
      email: "demo@edungo.org",
      photoURL: "",
      role: selectedRole,
    };
    setDemoUser(demo);
    setUser(demo as unknown as AuthUser);
    setRole(selectedRole);
  }

  async function logout() {
    const demo = getDemoUser();
    if (demo) {
      setDemoUser(null);
      setUser(null);
      setRole(null);
      return;
    }
    await signOut(auth);
  }

return (
    <AuthContext.Provider
      value={{ user, role, loading, loginWithEmail, loginWithGoogle, signupWithEmail, loginAsDemo, logout }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

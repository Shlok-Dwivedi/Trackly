import { useState } from "react";
import { Navigate } from "react-router-dom";
import { Mail, Lock, Loader2, Eye, EyeOff, User, LayoutDashboard, ArrowRight } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";




const inputCls = cn(
  "w-full rounded-2xl py-3 pl-11 pr-4 text-sm text-white outline-none transition-all",
  "placeholder:text-slate-600",
  "focus:ring-1 focus:ring-violet-500/60"
);

export default function Login() {
  const { user, loading, loginWithEmail, loginWithGoogle, signupWithEmail } = useAuth();
  const [email, setEmail]             = useState("");
  const [password, setPassword]       = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError]             = useState<string | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [isSignup, setIsSignup]       = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  if (!loading && user) return <Navigate to="/dashboard" replace />;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setError("Please enter a valid email address.");
      return;
    }
    if (isSignup && password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }

    setSubmitting(true);
    try {
      if (isSignup) await signupWithEmail(email, password, displayName);
      else await loginWithEmail(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Authentication failed.");
    } finally { setSubmitting(false); }
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    try { await loginWithGoogle(); }
    catch (err) { setError(err instanceof Error ? err.message : "Google sign-in failed."); }
    finally { setGoogleLoading(false); }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center" style={{ background: "#0a0a0f" }}>
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full items-center overflow-hidden" style={{ background: "#0a0a0f" }}>



      {/* Left — logo */}
      <div className="hidden md:flex flex-col items-center justify-center w-1/2 px-12 gap-6">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="relative flex h-52 w-52 items-center justify-center rounded-full shadow-2xl"
          style={{ background: "linear-gradient(135deg, #7C3AED 0%, #EC4899 100%)" }}>
          <div className="absolute inset-0 rounded-full blur-2xl opacity-40"
            style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }} />
          <LayoutDashboard className="relative z-10 h-24 w-24 text-white drop-shadow-xl" />
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.5 }} className="text-center">
          <h1 className="text-3xl font-extrabold"
            style={{ background: "linear-gradient(90deg, #a78bfa, #ec4899)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
            Trackly
          </h1>
          <p className="mt-2 text-sm text-slate-500 max-w-xs">Simple tools for better coordination.</p>
        </motion.div>
      </div>

      {/* Right — form card */}
      <div className="flex flex-1 items-center justify-center px-6 py-12 md:pr-20">
        <motion.div
          initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="w-full max-w-md rounded-3xl p-8 shadow-2xl"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", backdropFilter: "blur(24px)" }}>

          {/* Mobile logo */}
          <div className="mb-6 flex flex-col items-center gap-2 md:hidden">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "linear-gradient(135deg, #7C3AED, #EC4899)" }}>
              <LayoutDashboard className="h-7 w-7 text-white" />
            </div>
            <span className="text-lg font-bold text-white">Trackly</span>
          </div>

          <div className="mb-7 text-center">
            <h2 className="text-2xl font-extrabold text-white">
              {isSignup ? "Create Account" : "Hey there, good to see you again"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              {isSignup ? "Sign up to get started" : "Go ahead and sign in to get to your dashboard"}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            {isSignup && (
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
                <input type="text" placeholder="Full Name" autoComplete="name" required
                  value={displayName} onChange={(e) => setDisplayName(e.target.value)}
                  className={inputCls}
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
              </div>
            )}

            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input type="email" placeholder="Email Address" autoComplete="email" required
                value={email} onChange={(e) => setEmail(e.target.value)}
                className={inputCls}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
            </div>

            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-600" />
              <input type={showPassword ? "text" : "password"} placeholder="Password"
                autoComplete={isSignup ? "new-password" : "current-password"} required
                value={password} onChange={(e) => setPassword(e.target.value)}
                className={cn(inputCls, "pr-12")}
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }} />
              <button type="button" onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-600 hover:text-slate-400 transition-colors"
                aria-label={showPassword ? "Hide password" : "Show password"}>
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            {error && (
              <div className="rounded-xl px-4 py-2.5 text-sm text-red-400"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-sm font-bold text-white transition-all hover:opacity-90 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed mt-1"
              style={{ background: "linear-gradient(90deg, #6366f1 0%, #a855f7 50%, #ec4899 100%)" }}>
              {submitting
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <>{isSignup ? "Create Account" : "Sign In"} <ArrowRight className="h-4 w-4" /></>}
            </button>
          </form>

          <div className="my-5 flex items-center gap-3">
            <hr className="flex-1" style={{ borderColor: "rgba(255,255,255,0.07)" }} />
            <span className="text-xs text-slate-600">or continue with</span>
            <hr className="flex-1" style={{ borderColor: "rgba(255,255,255,0.07)" }} />
          </div>

          <button type="button" onClick={handleGoogle} disabled={googleLoading}
            className="flex w-full items-center justify-center gap-3 rounded-2xl py-3 text-sm font-medium text-slate-300 transition-all hover:bg-white/10 active:scale-[0.98] disabled:opacity-60"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {googleLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>

          <p className="mt-6 text-center text-xs text-slate-600">
            {isSignup ? "Already have an account? " : "Don't have an account? "}
            <button type="button"
              onClick={() => { setIsSignup(!isSignup); setError(null); }}
              className="font-semibold text-violet-400 hover:text-violet-300 transition-colors">
              {isSignup ? "Sign in" : "Sign up"}
            </button>
          </p>
        </motion.div>
      </div>
    </div>
  );
}

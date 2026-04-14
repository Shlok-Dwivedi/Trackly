import { NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Calendar,
  BarChart2,
  Users,
  LogOut,
  UserCircle,
  List,
  ChevronLeft,
  Moon,
  Sun,
  LayoutDashboard,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard", roles: ["admin", "staff", "volunteer", "viewer"] },
  { to: "/calendar", icon: Calendar, label: "Calendar", roles: ["admin", "staff", "volunteer", "viewer"] },
  { to: "/events", icon: List, label: "Events", roles: ["admin", "staff", "volunteer", "viewer"] },
  { to: "/profile", icon: UserCircle, label: "Profile", roles: ["admin", "staff", "volunteer", "viewer"] },
  { to: "/reports", icon: BarChart2, label: "Reports", roles: ["admin", "staff"] },
  { to: "/users", icon: Users, label: "Users", roles: ["admin"] },
];

export default function Sidebar() {
  const { user, role, logout } = useAuth();
  const navigate = useNavigate();

  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return true;
    return localStorage.getItem("trackly-sidebar-collapsed") === "true";
  });

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem("trackly-theme") === "dark";
  });

  useEffect(() => {
    function handleResize() {
      if (window.innerWidth < 1024) setCollapsed(true);
    }
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    // Only persist manual collapse preference on wide screens
    if (window.innerWidth >= 1024) {
      localStorage.setItem("trackly-sidebar-collapsed", String(collapsed));
    }
  }, [collapsed]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("trackly-theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("trackly-theme", "light");
    }
  }, [darkMode]);

  const visibleItems = navItems.filter(
    (item) => !role || item.roles.includes(role)
  );

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <motion.aside
      className="hidden md:flex flex-col h-screen sticky top-0 shrink-0 border-r"
      style={{ backgroundColor: "rgba(8,8,18,0.92)", borderColor: "rgba(255,255,255,0.06)" }}
      initial={false}
      animate={{ width: collapsed ? 72 : 260 }}
      transition={{ type: "spring", stiffness: 350, damping: 30, mass: 0.8 }}
      aria-label="Main navigation"
    >
      {/* Brand */}
      <div
        className="flex items-center justify-between px-4 h-16 shrink-0"
        style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <AnimatePresence mode="wait">
          {!collapsed && (
            <motion.div
              className="flex items-center gap-2.5 min-w-0"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700">
                <LayoutDashboard className="h-4 w-4 text-white" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">Trackly</p>
                <p className="text-[10px] capitalize" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {role ?? "loading…"}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {collapsed && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 mx-auto">
            <LayoutDashboard className="h-4 w-4 text-white" />
          </div>
        )}

        <motion.button
          onClick={() => setCollapsed(!collapsed)}
          className="ml-auto flex h-7 w-7 items-center justify-center rounded-lg transition-colors hover:bg-white/10"
          style={{ color: "rgba(255,255,255,0.5)" }}
          animate={{ rotate: collapsed ? 180 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className="h-4 w-4" />
        </motion.button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative tap-target",
                collapsed && "justify-center px-0",
                isActive
                  ? "text-white bg-white/10"
                  : "text-white/60 hover:text-white/90 hover:bg-white/8"
              )
            }
            aria-label={label}
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.div
                    className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-full bg-violet-400"
                    layoutId="activeNavEdge"
                    initial={false}
                    transition={{ type: "spring", stiffness: 500, damping: 35 }}
                  />
                )}
                <Icon className="h-5 w-5 shrink-0" />
                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: "auto" }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate"
                    >
                      {label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-3 py-3 space-y-1" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        {/* Notification + User info */}
        {collapsed ? (
          <div className="flex justify-center py-1">
            <NotificationBell />
          </div>
        ) : (
          <div className="flex items-center gap-2 px-3 py-2">
            <NotificationBell />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate" style={{ color: "rgba(255,255,255,0.7)" }}>
                {user?.displayName || user?.email || "User"}
              </p>
            </div>
          </div>
        )}

        {/* Dark mode toggle */}
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all tap-target",
            "text-white/60 hover:text-white/90 hover:bg-white/8",
            collapsed && "justify-center px-0"
          )}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
              >
                {darkMode ? "Light Mode" : "Dark Mode"}
              </motion.span>
            )}
          </AnimatePresence>
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all tap-target",
            "text-red-400/80 hover:text-red-400 hover:bg-red-500/10",
            collapsed && "justify-center px-0"
          )}
          aria-label="Log out"
        >
          <LogOut className="h-5 w-5 shrink-0" />
          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
              >
                Log out
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </motion.aside>
  );
}

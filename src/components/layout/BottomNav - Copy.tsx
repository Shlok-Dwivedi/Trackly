import { NavLink } from "react-router-dom";
import { LayoutDashboard, Calendar, UserCircle, List, BarChart2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/dashboard", icon: LayoutDashboard, label: "Home" },
  { to: "/calendar", icon: Calendar, label: "Calendar" },
  { to: "/events", icon: List, label: "Events" },
  { to: "/profile", icon: UserCircle, label: "Profile" },
  { to: "/reports", icon: BarChart2, label: "Stats", roles: ["admin", "staff"] },
];

export default function BottomNav() {
  const { role } = useAuth();

  const visibleItems = navItems.filter(
    (item) => !item.roles || (role && item.roles.includes(role))
  );

  return (
    <nav
      aria-label="Bottom navigation"
      className="flex items-center justify-around border-t px-2 py-1 glass"
      style={{ borderColor: "rgba(0,0,0,0.06)", height: "64px" }}
    >
      {visibleItems.map(({ to, icon: Icon, label }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 rounded-xl transition-all duration-200 min-w-[56px] tap-target",
              isActive ? "text-violet-600" : "text-muted-foreground"
            )
          }
          aria-label={label}
        >
          {({ isActive }) => (
            <>
              <div className="relative">
                <div
                  className={cn(
                    "p-1.5 rounded-lg transition-all duration-200",
                    isActive && "bg-violet-100 dark:bg-violet-900/30"
                  )}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-violet-600" />
                )}
              </div>
              <span
                className="text-[10px] font-medium"
                style={{ fontWeight: isActive ? 700 : 400 }}
              >
                {label}
              </span>
            </>
          )}
        </NavLink>
      ))}
    </nav>
  );
}

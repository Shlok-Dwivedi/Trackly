import { useNavigate } from "react-router-dom";
import { ArrowLeft, Zap } from "lucide-react";
import NotificationBell from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

interface NavbarProps {
  title?: string;
  showBack?: boolean;
  className?: string;
}

export default function Navbar({ title, showBack, className }: NavbarProps) {
  const navigate = useNavigate();

  return (
    <header
      className={cn(
        "sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border/50 glass px-4 md:hidden",
        className
      )}
    >
      {showBack ? (
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors focus-ring"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
      ) : (
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-purple-700 shrink-0">
          <Zap className="h-4 w-4 text-white" />
        </div>
      )}

      <h1 className="flex-1 text-sm font-semibold text-foreground truncate">
        {title ?? "Trackly"}
      </h1>

      <NotificationBell />
    </header>
  );
}

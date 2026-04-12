import { EventStatus } from "@/types";
import { STATUS_COLORS, getStatusColors } from "@/lib/theme";
import { cn } from "@/lib/utils";

// Normalize status string to handle case variations (e.g., "planned" -> "Planned")
const normalizeStatus = (s?: string) => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';

interface StatusBadgeProps {
  status: EventStatus;
  size?: "sm" | "md";
  className?: string;
}

export default function StatusBadge({
  status,
  size = "md",
  className,
}: StatusBadgeProps) {
  // Normalize status to handle case variations
  const normalizedStatus = normalizeStatus(status);
  
  // Get colors from theme
  const statusColors = getStatusColors(normalizedStatus);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full font-bold",
        size === "sm" ? "px-2 py-0.5 text-[11px]" : "px-2.5 py-1 text-xs",
        className
      )}
      style={{
        backgroundColor: statusColors.bg,
        color: statusColors.color,
      }}
    >
      <span 
        className="h-1.5 w-1.5 rounded-full" 
        style={{ backgroundColor: statusColors.color }}
      />
      {normalizedStatus}
    </span>
  );
}


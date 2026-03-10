import { cn } from "@/lib/utils";
import { COLORS } from "@/lib/theme";

interface AvatarProps {
  name: string;
  size?: number;
  color?: string;
  className?: string;
}

export default function Avatar({ 
  name, 
  size = 34, 
  color = COLORS.teal,
  className 
}: AvatarProps) {
  const fontSize = size * 0.38;
  
  return (
    <div
      className={cn(
        "rounded-full flex items-center justify-center font-extrabold shrink-0 border-2",
        className
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: `${color}20`,
        color: color,
        fontSize: fontSize,
        borderColor: `${color}40`,
      }}
    >
      {name?.[0]?.toUpperCase() || "?"}
    </div>
  );
}


import { CATEGORY_COLORS, getCategoryColor } from "@/lib/theme";
import { cn } from "@/lib/utils";

interface CategoryTagProps {
  category: string;
  className?: string;
}

export default function CategoryTag({ category, className }: CategoryTagProps) {
  const color = getCategoryColor(category);
  
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold",
        className
      )}
      style={{
        backgroundColor: `${color}22`,
        color: color,
      }}
    >
      {category}
    </span>
  );
}


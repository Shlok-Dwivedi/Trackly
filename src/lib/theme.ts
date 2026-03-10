// Theme design tokens - exact values from trackly-desktop.jsx reference

export const COLORS = {
  teal: "#0d9488",
  tealLight: "#ccfbf1",
  tealDark: "#0f766e",
  amber: "#f59e0b",
  amberLight: "#fef3c7",
  blue: "#3b82f6",
  blueLight: "#dbeafe",
  green: "#22c55e",
  greenLight: "#dcfce7",
  red: "#ef4444",
  redLight: "#fee2e2",
  grey: "#9ca3af",
  greyLight: "#f3f4f6",
  purple: "#8b5cf6",
  orange: "#f97316",
  pink: "#ec4899",
  bg: "#f8fafc",
  card: "#ffffff",
  border: "#e2e8f0",
  text: "#0f172a",
  textMuted: "#64748b",
  sidebar: "#0f172a",
  sidebarText: "#94a3b8",
  sidebarActive: "#1e293b",
};

export const CATEGORY_COLORS: Record<string, string> = {
  Workshop: "#8b5cf6",
  Training: "#3b82f6",
  Outreach: "#f97316",
  Meeting: "#0d9488",
  "Community Event": "#ec4899",
  Sports: "#16a34a",
  Seminar: "#6366f1",
  Other: "#9ca3af",
};

export const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
  Planned:   { color: "#3b82f6", bg: "#dbeafe" },
  Ongoing:   { color: "#f59e0b", bg: "#fef3c7" },
  Completed: { color: "#22c55e", bg: "#dcfce7" },
  Cancelled: { color: "#ef4444", bg: "#fee2e2" },
};

export const ROLE_COLORS: Record<string, { color: string; bg: string }> = {
  admin:    { color: "#0d9488", bg: "#ccfbf1" },
  staff:    { color: "#3b82f6", bg: "#dbeafe" },
  volunteer:{ color: "#f59e0b", bg: "#fef3c7" },
  viewer:   { color: "#9ca3af", bg: "#f3f4f6" },
};

// Helper to get category color
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

// Helper to get status colors
export function getStatusColors(status: string) {
  return STATUS_COLORS[status] || STATUS_COLORS.Planned;
}

// Helper to get role colors
export function getRoleColors(role: string) {
  return ROLE_COLORS[role] || ROLE_COLORS.viewer;
}


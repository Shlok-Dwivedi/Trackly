// Category colors - consistent across the app
export const CATEGORY_COLORS: Record<string, string> = {
  Workshop: "#8b5cf6",        // purple
  Training: "#3b82f6",         // blue
  "Community Outreach": "#f97316", // orange
  Meeting: "#14b8a6",          // teal
  "Community Event": "#ec4899", // pink
  Sports: "#22c55e",           // green
  Seminar: "#8b5cf6",          // purple (same as Workshop)
  Fundraiser: "#f97316",       // orange (same as Outreach)
  Other: "#9ca3af",            // grey
};

// Event status colors
export const STATUS_COLORS: Record<string, string> = {
  Planned: "#3b82f6",
  Ongoing: "#f59e0b",
  Completed: "#22c55e",
  Cancelled: "#9ca3af",
};

// Department options for profile
export const DEPARTMENT_OPTIONS = [
  'Field Team',
  'Admin Office',
  'Education',
  'Outreach',
  'Finance',
  'Communications',
  'Volunteer Coordination',
  'Other'
];

// Get category color
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.Other;
}

// Get status color
export function getStatusColor(status: string): string {
  return STATUS_COLORS[status] || STATUS_COLORS.Planned;
}

// ============================================
// Unit Turns Module — Constants & Labels
// ============================================

// ----- Batch Status -----

export const BATCH_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  OPEN: { label: "Open", color: "bg-green-100 text-green-700" },
  CLOSED: { label: "Closed", color: "bg-gray-100 text-gray-600" },
};

// ----- Unit Status -----

export const UNIT_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  NOT_STARTED: { label: "Not Started", color: "bg-gray-100 text-gray-600" },
  IN_PROGRESS: { label: "In Progress", color: "bg-yellow-100 text-yellow-700" },
  COMPLETE: { label: "Complete", color: "bg-green-100 text-green-700" },
};

// ----- Item Status -----

export const ITEM_STATUS_OPTIONS = ["good", "repair", "replace"] as const;

export const ITEM_STATUS_LABELS: Record<string, { label: string; color: string; activeBg: string }> = {
  good: {
    label: "Good",
    color: "text-green-700",
    activeBg: "bg-green-100 border-green-400",
  },
  repair: {
    label: "Repair",
    color: "text-yellow-700",
    activeBg: "bg-yellow-100 border-yellow-400",
  },
  replace: {
    label: "Replace",
    color: "text-red-700",
    activeBg: "bg-red-100 border-red-400",
  },
};

// ----- Paint Scope -----

export const PAINT_SCOPE_OPTIONS = ["touch_up", "full"] as const;

export const PAINT_SCOPE_LABELS: Record<string, { label: string; color: string; activeBg: string }> = {
  touch_up: {
    label: "Touch Up",
    color: "text-orange-700",
    activeBg: "bg-orange-100 border-orange-400",
  },
  full: {
    label: "Full Paint",
    color: "text-red-700",
    activeBg: "bg-red-100 border-red-400",
  },
};

// ----- Cleaning Item Status (simplified: Done / N/A) -----

export const CLEANING_STATUS_OPTIONS = ["good"] as const; // "good" = done

export const CLEANING_STATUS_LABELS: Record<string, { label: string; color: string; activeBg: string }> = {
  good: {
    label: "Done",
    color: "text-green-700",
    activeBg: "bg-green-100 border-green-400",
  },
};

// ----- Category Colors (for section headers) -----

export const CATEGORY_COLORS: Record<string, { header: string; border: string }> = {
  "kitchen":                { header: "bg-gradient-to-r from-amber-800 to-amber-600", border: "border-amber-200" },
  "bathroom":               { header: "bg-gradient-to-r from-teal-800 to-teal-600", border: "border-teal-200" },
  "electrical-fixtures":    { header: "bg-gradient-to-r from-yellow-800 to-yellow-600", border: "border-yellow-200" },
  "doors-hardware-windows": { header: "bg-gradient-to-r from-stone-800 to-stone-600", border: "border-stone-200" },
  "flooring-finish":        { header: "bg-gradient-to-r from-orange-800 to-orange-600", border: "border-orange-200" },
  "mechanical-safety":      { header: "bg-gradient-to-r from-red-900 to-red-700", border: "border-red-200" },
  "laundry":                { header: "bg-gradient-to-r from-indigo-800 to-indigo-600", border: "border-indigo-200" },
  "paint":                  { header: "bg-gradient-to-r from-purple-800 to-purple-600", border: "border-purple-200" },
  "cleaning":               { header: "bg-gradient-to-r from-emerald-800 to-emerald-600", border: "border-emerald-200" },
};

export const DEFAULT_CATEGORY_COLOR = { header: "bg-gradient-to-r from-gray-700 to-gray-500", border: "border-gray-200" };

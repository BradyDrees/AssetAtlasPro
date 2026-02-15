// ============================================
// Asset Atlas Pro — Unit Mode Constants
// ============================================

// ----- BD/BA Options -----
export const BD_BA_OPTIONS = [
  "0/1",
  "1/1",
  "1/1.5",
  "2/1",
  "2/1.5",
  "2/2",
  "2/2.5",
  "3/1",
  "3/1.5",
  "3/2",
  "3/2.5",
  "3/3",
] as const;

// ----- Appliance Options -----
export const APPLIANCE_OPTIONS = ["Black", "White", "Stainless Steel"] as const;

// ----- Tenant Grades -----
export const TENANT_GRADES = {
  A: { label: "Looks like Model", color: "bg-green-500 text-white", border: "border-green-500" },
  B: { label: "Easy Renewal", color: "bg-lime-500 text-white", border: "border-lime-500" },
  C: { label: "Renew but questionable", color: "bg-yellow-500 text-white", border: "border-yellow-500" },
  D: { label: "Non-renew but livable", color: "bg-orange-500 text-white", border: "border-orange-500" },
  E: { label: "Needs serious correction", color: "bg-red-500 text-white", border: "border-red-500" },
  F: { label: "Emergency Removal", color: "bg-red-700 text-white", border: "border-red-700" },
} as const;

// ----- Unit Grades (with turn costs) -----
export const UNIT_GRADES = {
  A:  { label: "$750 or less", desc: "Only small items", color: "bg-green-500 text-white", border: "border-green-500" },
  B:  { label: "$1,500 or less", desc: "Paint + small items", color: "bg-lime-500 text-white", border: "border-lime-500" },
  C:  { label: "$3,000 or less", desc: "Appliance + paint + small things", color: "bg-yellow-500 text-white", border: "border-yellow-500" },
  D:  { label: "$5,500 or less", desc: "Cabinets, appliance + paint + small things", color: "bg-orange-500 text-white", border: "border-orange-500" },
  E:  { label: "$7,500 or less", desc: "Flooring, appliance, paint, small things", color: "bg-red-500 text-white", border: "border-red-500" },
  F:  { label: "$7,500+", desc: "Full renovation required", color: "bg-red-700 text-white", border: "border-red-700" },
  NK: { label: "No Key", desc: "Could not access unit", color: "bg-gray-500 text-white", border: "border-gray-500" },
} as const;

// ----- Item Grades (Countertop, Flooring) -----
export const ITEM_GRADES = {
  A: { label: "Excellent", color: "bg-green-500 text-white", border: "border-green-500" },
  B: { label: "Good", color: "bg-lime-500 text-white", border: "border-lime-500" },
  C: { label: "Average", color: "bg-yellow-500 text-white", border: "border-yellow-500" },
  D: { label: "Below Average", color: "bg-orange-500 text-white", border: "border-orange-500" },
  E: { label: "Poor", color: "bg-red-500 text-white", border: "border-red-500" },
  F: { label: "Replace", color: "bg-red-700 text-white", border: "border-red-700" },
} as const;

// ----- Cabinet Options -----
export const CABINET_OPTIONS = {
  Keep: { label: "Keep as-is", color: "bg-green-500 text-white" },
  Refurbish: { label: "Needs refurbishing", color: "bg-yellow-500 text-white" },
  Replace: { label: "Full replacement", color: "bg-red-500 text-white" },
} as const;

// ----- Yes/No Options (Mold, W/D Connect) -----
export const YES_NO_OPTIONS = {
  Yes: { color: "bg-red-500 text-white" },
  No: { color: "bg-green-500 text-white" },
} as const;

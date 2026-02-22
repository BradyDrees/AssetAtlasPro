// ============================================
// Asset Atlas Pro — Deal Analysis Type Definitions
// ============================================

import type { ProjectStatus } from "./types";

/**
 * A single unit type row in the unit mix table.
 */
export interface UnitMixRow {
  type: string;       // e.g. "1BD/1BA", "2BD/1BA Reno"
  sf: number;         // square footage
  count: number;      // number of units
  currentRent: number;
  marketRent: number;
}

/**
 * A single line item in the rehab budget.
 */
export interface RehabLineItem {
  name: string;
  budget: number;
  unitCost: number;
  qty: number;
}

/**
 * A due diligence checklist item on the Scorecard tab.
 */
export interface DDChecklistItem {
  name: string;
  status: "not_started" | "in_progress" | "complete" | "na";
  date: string;
  notes: string;
}

/**
 * All financial inputs & state for a deal analysis.
 * Stored as JSONB in the `deal_analyses.data` column.
 */
export interface DealData {
  // ─── Property Information ───
  propType: string;
  propClass: string;
  yearBuilt: number;
  units: number;
  rentableSF: number;
  occupancy: number;

  // ─── Deal Pricing ───
  askingPrice: number;
  offerPrice: number;
  emd: number;

  // ─── Primary Financing ───
  ltv: number;
  intRate: number;
  amort: number;
  loanTerm: number;
  ioPeriod: number;

  // ─── Bridge Loan (optional) ───
  bridgeLoan: boolean;
  bridgeAmt: number;
  bridgeRate: number;
  bridgeTerm: number;
  bridgePoints: number;

  // ─── Closing & Acquisition Costs ───
  titleFees: number;
  legalFees: number;
  appraisal: number;
  inspectionFees: number;
  survey: number;
  loanPoints: number;
  acqFee: number;
  otherClosing: number;

  // ─── Growth Assumptions ───
  rentGrowth: number;
  otherIncGrowth: number;
  expGrowth: number;
  taxGrowthYr2: number;
  taxGrowthYr3: number;
  insGrowth: number;
  exitCap: number;
  sellCosts: number;
  holdYears: number;

  // ─── Income (Year 1) ───
  gpr: number;
  lossToLease: number;
  vacancyLoss: number;
  concessions: number;
  badDebt: number;
  rubs: number;
  otherIncome: number;

  // ─── Expenses (Year 1) ───
  reTax: number;
  insurance: number;
  mgmtFee: number;
  payroll: number;
  repairsMaint: number;
  contractSvc: number;
  turnover: number;
  utilitiesOwner: number;
  waterSewer: number;
  landscaping: number;
  pestControl: number;
  advertising: number;
  ga: number;
  legal: number;
  security: number;
  otherExp: number;

  // ─── Rehab & Reserves ───
  rehabBudget: number;
  reservesPerUnit: number;

  // ─── Pro Forma Adjustable Rates ───
  vacRates: [number, number, number, number, number];
  ltlRates: [number, number, number, number, number];
  concRates: [number, number, number, number, number];

  // ─── Refi Scenario ───
  refiLTV: number;
  refiYear: number;

  // ─── Flip Analysis ───
  flipARV: number;
  flipPurchase: number;
  flipRepairs: number;
  flipMonths: number;
  flipLoan: number;
  flipRate: number;
  flipCarrying: number;
  flipCommission: number;
  flipBuyClose: number;
  flipSellClose: number;
  flipOtherFees: number;
  flipPoints: number;

  // ─── Unit Mix ───
  unitMix: UnitMixRow[];

  // ─── Rehab Budget Detail ───
  rehabInterior: RehabLineItem[];
  rehabExterior: RehabLineItem[];
  rehabMechanical: RehabLineItem[];
  rehabGeneral: RehabLineItem[];

  // ─── DD Checklist ───
  ddChecklist: DDChecklistItem[];
}

/**
 * The deal_analyses database row.
 */
export interface DealAnalysis {
  id: string;
  owner_id: string;
  name: string;
  property_name: string;
  address: string;
  status: ProjectStatus;
  data: DealData;
  created_at: string;
  updated_at: string;
}

export type CreateDealAnalysis = Pick<
  DealAnalysis,
  "name" | "property_name" | "address"
>;

export type UpdateDealAnalysis = Partial<
  Pick<DealAnalysis, "name" | "property_name" | "address" | "status" | "data">
>;

// ─── Default values for a new deal ───

export const DEFAULT_UNIT_MIX: UnitMixRow[] = [
  { type: "1BD/1BA", sf: 0, count: 0, currentRent: 0, marketRent: 0 },
  { type: "2BD/1BA", sf: 0, count: 0, currentRent: 0, marketRent: 0 },
  { type: "2BD/2BA", sf: 0, count: 0, currentRent: 0, marketRent: 0 },
  { type: "3BD/2BA", sf: 0, count: 0, currentRent: 0, marketRent: 0 },
];

export const DEFAULT_REHAB_INTERIOR: RehabLineItem[] = [
  { name: "Flooring – LVP", budget: 0, unitCost: 0, qty: 0 },
  { name: "Flooring – Carpet", budget: 0, unitCost: 0, qty: 0 },
  { name: "Paint – Interior", budget: 0, unitCost: 0, qty: 0 },
  { name: "Cabinets – Kitchen", budget: 0, unitCost: 0, qty: 0 },
  { name: "Cabinets – Bathroom", budget: 0, unitCost: 0, qty: 0 },
  { name: "Countertops", budget: 0, unitCost: 0, qty: 0 },
  { name: "Appliances – Refrigerator", budget: 0, unitCost: 0, qty: 0 },
  { name: "Appliances – Stove/Range", budget: 0, unitCost: 0, qty: 0 },
  { name: "Appliances – Dishwasher", budget: 0, unitCost: 0, qty: 0 },
  { name: "Appliances – Microwave", budget: 0, unitCost: 0, qty: 0 },
  { name: "Lighting / Fixtures", budget: 0, unitCost: 0, qty: 0 },
  { name: "Plumbing Fixtures", budget: 0, unitCost: 0, qty: 0 },
  { name: "Hardware (Knobs, Pulls)", budget: 0, unitCost: 0, qty: 0 },
  { name: "Tub / Shower", budget: 0, unitCost: 0, qty: 0 },
  { name: "Windows / Blinds", budget: 0, unitCost: 0, qty: 0 },
];

export const DEFAULT_REHAB_EXTERIOR: RehabLineItem[] = [
  { name: "Roofing", budget: 0, unitCost: 0, qty: 0 },
  { name: "Siding / Exterior Paint", budget: 0, unitCost: 0, qty: 0 },
  { name: "Parking Lot / Striping", budget: 0, unitCost: 0, qty: 0 },
  { name: "Concrete / Flatwork", budget: 0, unitCost: 0, qty: 0 },
  { name: "Fencing / Gates", budget: 0, unitCost: 0, qty: 0 },
  { name: "Landscaping", budget: 0, unitCost: 0, qty: 0 },
  { name: "Exterior Lighting", budget: 0, unitCost: 0, qty: 0 },
  { name: "Signage", budget: 0, unitCost: 0, qty: 0 },
  { name: "Pool / Amenities", budget: 0, unitCost: 0, qty: 0 },
  { name: "Dumpster Enclosure", budget: 0, unitCost: 0, qty: 0 },
  { name: "Mailboxes", budget: 0, unitCost: 0, qty: 0 },
  { name: "Entry / Common Paint", budget: 0, unitCost: 0, qty: 0 },
];

export const DEFAULT_REHAB_MECHANICAL: RehabLineItem[] = [
  { name: "HVAC Units", budget: 0, unitCost: 0, qty: 0 },
  { name: "Water Heaters", budget: 0, unitCost: 0, qty: 0 },
  { name: "Plumbing (Main Lines)", budget: 0, unitCost: 0, qty: 0 },
  { name: "Electrical Panels / Wiring", budget: 0, unitCost: 0, qty: 0 },
  { name: "Fire Safety / Sprinklers", budget: 0, unitCost: 0, qty: 0 },
  { name: "Washer/Dryer Hookups", budget: 0, unitCost: 0, qty: 0 },
];

export const DEFAULT_REHAB_GENERAL: RehabLineItem[] = [
  { name: "Demo / Haul-off", budget: 0, unitCost: 0, qty: 0 },
  { name: "Dumpster Rental", budget: 0, unitCost: 0, qty: 0 },
  { name: "GC Labor / Oversight", budget: 0, unitCost: 0, qty: 0 },
  { name: "Permits & Fees", budget: 0, unitCost: 0, qty: 0 },
  { name: "Testing (Mold, Asbestos)", budget: 0, unitCost: 0, qty: 0 },
  { name: "Contingency (10%)", budget: 0, unitCost: 0, qty: 0 },
  { name: "Other", budget: 0, unitCost: 0, qty: 0 },
];

export const DEFAULT_DD_CHECKLIST: DDChecklistItem[] = [
  { name: "Offering Memorandum (OM)", status: "not_started", date: "", notes: "" },
  { name: "Rent Roll (Current)", status: "not_started", date: "", notes: "" },
  { name: "T-12 (Trailing 12 Month P&L)", status: "not_started", date: "", notes: "" },
  { name: "T-3 (Trailing 3 Month P&L)", status: "not_started", date: "", notes: "" },
  { name: "Tax Returns (2 Years)", status: "not_started", date: "", notes: "" },
  { name: "Utility Bills (12 Months)", status: "not_started", date: "", notes: "" },
  { name: "Insurance Loss Runs", status: "not_started", date: "", notes: "" },
  { name: "Property Tax Bill", status: "not_started", date: "", notes: "" },
  { name: "Existing Loan Documents", status: "not_started", date: "", notes: "" },
  { name: "Survey / Plat Map", status: "not_started", date: "", notes: "" },
  { name: "Title Commitment", status: "not_started", date: "", notes: "" },
  { name: "Environmental (Phase I)", status: "not_started", date: "", notes: "" },
  { name: "Property Condition Assessment", status: "not_started", date: "", notes: "" },
  { name: "Appraisal", status: "not_started", date: "", notes: "" },
  { name: "Zoning Verification", status: "not_started", date: "", notes: "" },
  { name: "Certificate of Occupancy", status: "not_started", date: "", notes: "" },
  { name: "Lease Audit (Sample)", status: "not_started", date: "", notes: "" },
  { name: "Service Contracts Review", status: "not_started", date: "", notes: "" },
  { name: "Capital Expenditure History", status: "not_started", date: "", notes: "" },
  { name: "Market Comp Analysis", status: "not_started", date: "", notes: "" },
  { name: "Unit Interior Walk (Sample)", status: "not_started", date: "", notes: "" },
  { name: "Exterior Walk / Site Visit", status: "not_started", date: "", notes: "" },
  { name: "Municipal Lien Search", status: "not_started", date: "", notes: "" },
  { name: "Estoppel Certificates", status: "not_started", date: "", notes: "" },
];

export const DEFAULT_DEAL_DATA: DealData = {
  propType: "Multifamily",
  propClass: "B",
  yearBuilt: 0,
  units: 0,
  rentableSF: 0,
  occupancy: 0.95,

  askingPrice: 0,
  offerPrice: 0,
  emd: 0,

  ltv: 0.75,
  intRate: 0.065,
  amort: 30,
  loanTerm: 10,
  ioPeriod: 3,

  bridgeLoan: false,
  bridgeAmt: 0,
  bridgeRate: 0.10,
  bridgeTerm: 3,
  bridgePoints: 0.02,

  titleFees: 0,
  legalFees: 0,
  appraisal: 0,
  inspectionFees: 0,
  survey: 0,
  loanPoints: 0.01,
  acqFee: 0.015,
  otherClosing: 0,

  rentGrowth: 0.03,
  otherIncGrowth: 0.02,
  expGrowth: 0.02,
  taxGrowthYr2: 0.50,
  taxGrowthYr3: 0.03,
  insGrowth: 0.03,
  exitCap: 0.055,
  sellCosts: 0.02,
  holdYears: 5,

  gpr: 0,
  lossToLease: 0,
  vacancyLoss: 0,
  concessions: 0,
  badDebt: 0,
  rubs: 0,
  otherIncome: 0,

  reTax: 0,
  insurance: 0,
  mgmtFee: 0,
  payroll: 0,
  repairsMaint: 0,
  contractSvc: 0,
  turnover: 0,
  utilitiesOwner: 0,
  waterSewer: 0,
  landscaping: 0,
  pestControl: 0,
  advertising: 0,
  ga: 0,
  legal: 0,
  security: 0,
  otherExp: 0,

  rehabBudget: 0,
  reservesPerUnit: 250,

  vacRates: [0.08, 0.06, 0.05, 0.05, 0.05],
  ltlRates: [0.08, 0.05, 0.03, 0.02, 0.02],
  concRates: [0.03, 0.03, 0.02, 0.02, 0.02],

  refiLTV: 0.75,
  refiYear: 3,

  flipARV: 0,
  flipPurchase: 0,
  flipRepairs: 0,
  flipMonths: 6,
  flipLoan: 0,
  flipRate: 0.10,
  flipCarrying: 0,
  flipCommission: 0.03,
  flipBuyClose: 0,
  flipSellClose: 0,
  flipOtherFees: 0,
  flipPoints: 0,

  unitMix: DEFAULT_UNIT_MIX,
  rehabInterior: DEFAULT_REHAB_INTERIOR,
  rehabExterior: DEFAULT_REHAB_EXTERIOR,
  rehabMechanical: DEFAULT_REHAB_MECHANICAL,
  rehabGeneral: DEFAULT_REHAB_GENERAL,
  ddChecklist: DEFAULT_DD_CHECKLIST,
};

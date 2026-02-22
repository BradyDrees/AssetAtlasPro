// ============================================
// Asset Atlas Pro — Deal Analysis Calculations
// Pure functions, no side effects. All logic from
// the Excel analyzer + JSX prototype.
// ============================================

import type { DealData, UnitMixRow, RehabLineItem } from "./deal-analysis-types";

// ─── Financial Helpers ───

/** Present value of annuity payment */
export function PMT(rate: number, nper: number, pv: number): number {
  if (rate === 0) return pv / nper;
  const x = Math.pow(1 + rate, nper);
  return (pv * rate * x) / (x - 1);
}

/** Future value */
export function FV(rate: number, nper: number, pmt: number, pv: number): number {
  if (rate === 0) return -(pv + pmt * nper);
  const x = Math.pow(1 + rate, nper);
  return -(pv * x + (pmt * (x - 1)) / rate);
}

/** Format number for display */
export function fmt(n: number | null | undefined, style: "currency" | "pct" | "x" | "num" = "currency"): string {
  if (n === null || n === undefined || isNaN(n)) return "—";
  if (style === "currency")
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
  if (style === "pct") return (n * 100).toFixed(1) + "%";
  if (style === "x") return n.toFixed(2) + "x";
  if (style === "num") return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(n);
  return String(n);
}

// ─── Pro Forma Year Data ───

export interface ProFormaYear {
  year: number;
  gpr: number;
  totalLoss: number;
  netRental: number;
  rubs: number;
  other: number;
  egi: number;
  tax: number;
  ins: number;
  otherExp: number;
  totalExp: number;
  reserves: number;
  noi: number;
  ds: number;
  cf: number;
  dcr: number;
  coc: number;
  expRatio: number;
}

// ─── Scorecard Check ───

export interface ScorecardCheck {
  key: string;
  pass: boolean;
  value: string;
  target: string;
}

// ─── Full Calculation Result ───

export interface DealCalcResult {
  // Financing
  loanAmt: number;
  downPmt: number;
  monthlyPI: number;
  monthlyIO: number;
  annualDSio: number;
  annualDSamort: number;
  loanOrigCost: number;
  acqFeeDollar: number;
  totalClosing: number;
  reserves: number;
  totalCapital: number;
  totalAcqCost: number;

  // Income
  netRental: number;
  egi: number;
  totalExp: number;
  noi: number;
  expRatio: number;

  // KPIs
  capRateAsk: number;
  capRateOffer: number;
  grm: number;
  twoPctRule: number;
  dcr: number;
  cashFlow: number;
  coc: number;
  pricePerUnit: number;
  pricePerUnitOffer: number;
  pricePerSF: number;
  noiPerUnit: number;
  expPerUnit: number;

  // Pro Forma
  years: ProFormaYear[];

  // Exit
  yr5NOI: number;
  grossSalePrice: number;
  sellingCosts: number;
  netSaleProceeds: number;
  loanBalExit: number;
  netEquity: number;
  totalCF: number;
  totalProfit: number;
  equityMultiple: number;
  avgAnnualReturn: number;
  avgCOC: number;

  // Refi
  refiYearNOI: number;
  refiAppraisedVal: number;
  refiLoanAmt: number;
  cashOut: number;
  pctCapReturned: number;

  // Flip
  flipInterest: number;
  flipTotalCarry: number;
  flipCommDollar: number;
  flipTotalExp: number;
  flipAllIn: number;
  flipCashInvested: number;
  flipProfit: number;
  flipROI: number;
  flipROICash: number;
  flipAnnROI: number;
  flipARVRule: number;

  // Unit Mix
  unitMixTotalUnits: number;
  unitMixTotalSF: number;
  unitMixAvgSF: number;
  unitMixMonthlyIncome: number;
  unitMixAnnualIncome: number;
  unitMixMarketMonthly: number;
  unitMixMarketAnnual: number;
  unitMixTotalUpside: number;

  // Rehab
  rehabInteriorTotal: number;
  rehabExteriorTotal: number;
  rehabMechanicalTotal: number;
  rehabGeneralTotal: number;
  rehabGrandTotal: number;

  // Scorecard
  quickChecks: ScorecardCheck[];
  fullChecks: ScorecardCheck[];
  passCount: number;
  fullPassCount: number;
}

// ─── Main Calculation ───

export function calculateDeal(d: DealData): DealCalcResult {
  // ── Financing ──
  const loanAmt = d.offerPrice * d.ltv;
  const downPmt = d.offerPrice - loanAmt;
  const monthlyPI = loanAmt > 0 && d.intRate > 0 && d.amort > 0 ? PMT(d.intRate / 12, d.amort * 12, loanAmt) : 0;
  const monthlyIO = loanAmt > 0 ? (loanAmt * d.intRate) / 12 : 0;
  const annualDSio = monthlyIO * 12;
  const annualDSamort = monthlyPI * 12;
  const loanOrigCost = loanAmt * d.loanPoints;
  const acqFeeDollar = d.offerPrice * d.acqFee;
  const totalClosing = d.titleFees + d.legalFees + d.appraisal + d.inspectionFees + d.survey + loanOrigCost + acqFeeDollar + d.otherClosing;
  const reserves = d.units * d.reservesPerUnit;
  const totalCapital = downPmt + totalClosing + d.rehabBudget + reserves;
  const totalAcqCost = d.offerPrice + totalClosing + d.rehabBudget;

  // ── Income ──
  const netRental = d.gpr - d.lossToLease - d.vacancyLoss - d.concessions - d.badDebt;
  const egi = netRental + d.rubs + d.otherIncome;
  const totalExp = d.reTax + d.insurance + d.mgmtFee + d.payroll + d.repairsMaint + d.contractSvc + d.turnover + d.utilitiesOwner + d.waterSewer + d.landscaping + d.pestControl + d.advertising + d.ga + d.legal + d.security + d.otherExp;
  const noi = egi - totalExp - reserves;
  const expRatio = egi > 0 ? totalExp / egi : 0;

  // ── KPIs ──
  const capRateAsk = d.askingPrice > 0 ? noi / d.askingPrice : 0;
  const capRateOffer = d.offerPrice > 0 ? noi / d.offerPrice : 0;
  const grm = d.gpr > 0 ? d.askingPrice / d.gpr : 0;
  const twoPctRule = d.askingPrice > 0 ? (d.gpr / 12) / d.askingPrice : 0;
  const dcr = annualDSio > 0 ? noi / annualDSio : 0;
  const cashFlow = noi - annualDSio;
  const coc = totalCapital > 0 ? cashFlow / totalCapital : 0;
  const pricePerUnit = d.units > 0 ? d.askingPrice / d.units : 0;
  const pricePerUnitOffer = d.units > 0 ? d.offerPrice / d.units : 0;
  const pricePerSF = d.rentableSF > 0 ? d.askingPrice / d.rentableSF : 0;
  const noiPerUnit = d.units > 0 ? noi / d.units : 0;
  const expPerUnit = d.units > 0 ? totalExp / d.units : 0;

  // ── 5-Year Pro Forma ──
  const years: ProFormaYear[] = [];
  for (let y = 0; y < 5; y++) {
    const gprY = d.gpr * Math.pow(1 + d.rentGrowth, y);
    const totalLoss = d.vacRates[y] + d.ltlRates[y] + d.concRates[y];
    const netRentalY = gprY * (1 - totalLoss);
    const rubsY = d.rubs * Math.pow(1 + d.otherIncGrowth, y);
    const otherY = d.otherIncome * Math.pow(1 + d.otherIncGrowth, y);
    const egiY = netRentalY + rubsY + otherY;

    const taxY = d.reTax * (y === 0 ? 1 : y === 1 ? (1 + d.taxGrowthYr2) : Math.pow(1 + d.taxGrowthYr3, y - 1) * (1 + d.taxGrowthYr2));
    const insY = d.insurance * Math.pow(1 + d.insGrowth, y);
    const otherExpY = (d.mgmtFee + d.payroll + d.repairsMaint + d.contractSvc + d.turnover + d.utilitiesOwner + d.waterSewer + d.landscaping + d.pestControl + d.advertising + d.ga + d.legal + d.security + d.otherExp) * Math.pow(1 + d.expGrowth, y);
    const totalExpY = taxY + insY + otherExpY;
    const reservesY = reserves;
    const noiY = egiY - totalExpY - reservesY;
    const dsY = (y + 1) <= d.ioPeriod ? annualDSio : annualDSamort;
    const cfY = noiY - dsY;
    const dcrY = dsY > 0 ? noiY / dsY : 0;
    const cocY = totalCapital > 0 ? cfY / totalCapital : 0;
    const expRatioY = egiY > 0 ? totalExpY / egiY : 0;

    years.push({
      year: y + 1,
      gpr: gprY,
      totalLoss,
      netRental: netRentalY,
      rubs: rubsY,
      other: otherY,
      egi: egiY,
      tax: taxY,
      ins: insY,
      otherExp: otherExpY,
      totalExp: totalExpY,
      reserves: reservesY,
      noi: noiY,
      ds: dsY,
      cf: cfY,
      dcr: dcrY,
      coc: cocY,
      expRatio: expRatioY,
    });
  }

  // ── Exit ──
  const yr5NOI = years.length >= 5 ? years[4].noi : 0;
  const grossSalePrice = d.exitCap > 0 ? yr5NOI / d.exitCap : 0;
  const sellingCostsDollar = grossSalePrice * d.sellCosts;
  const netSaleProceeds = grossSalePrice - sellingCostsDollar;
  const loanBalExit = loanAmt > 0 ? Math.abs(FV(d.intRate / 12, d.holdYears * 12, monthlyPI, -loanAmt)) : 0;
  const netEquity = netSaleProceeds - loanBalExit;
  const totalCF = years.reduce((s, y) => s + y.cf, 0);
  const totalProfit = totalCF + netEquity;
  const equityMultiple = totalCapital > 0 ? (totalCF + netEquity + totalCapital) / totalCapital : 0;
  const avgAnnualReturn = d.holdYears > 0 ? (equityMultiple - 1) / d.holdYears : 0;
  const avgCOC = totalCapital > 0 && d.holdYears > 0 ? totalCF / (totalCapital * d.holdYears) : 0;

  // ── Refi ──
  const refiYearNOI = years.length >= d.refiYear ? years[d.refiYear - 1].noi : 0;
  const refiAppraisedVal = d.exitCap > 0 ? refiYearNOI / d.exitCap : 0;
  const refiLoanAmt = refiAppraisedVal * d.refiLTV;
  const cashOut = refiLoanAmt - loanBalExit;
  const pctCapReturned = totalCapital > 0 ? cashOut / totalCapital : 0;

  // ── Flip ──
  const flipInterest = d.flipLoan * d.flipRate * d.flipMonths / 12;
  const flipTotalCarry = d.flipCarrying * d.flipMonths;
  const flipCommDollar = d.flipARV * d.flipCommission;
  const flipTotalExp = d.flipRepairs + flipTotalCarry + flipCommDollar + d.flipBuyClose + d.flipSellClose + d.flipOtherFees + flipInterest + d.flipPoints;
  const flipAllIn = d.flipPurchase + flipTotalExp;
  const flipCashInvested = d.flipPurchase - d.flipLoan + flipTotalExp;
  const flipProfit = d.flipARV - flipAllIn;
  const flipROI = flipAllIn > 0 ? flipProfit / flipAllIn : 0;
  const flipROICash = flipCashInvested > 0 ? flipProfit / flipCashInvested : 0;
  const flipAnnROI = d.flipMonths > 0 ? flipROICash * (12 / d.flipMonths) : 0;
  const flipARVRule = d.flipARV > 0 ? (d.flipPurchase + d.flipRepairs) / d.flipARV : 0;

  // ── Unit Mix ──
  const unitMixTotalUnits = d.unitMix.reduce((s, r) => s + r.count, 0);
  const unitMixTotalSF = d.unitMix.reduce((s, r) => s + r.sf * r.count, 0);
  const unitMixAvgSF = unitMixTotalUnits > 0 ? unitMixTotalSF / unitMixTotalUnits : 0;
  const unitMixMonthlyIncome = d.unitMix.reduce((s, r) => s + r.currentRent * r.count, 0);
  const unitMixAnnualIncome = unitMixMonthlyIncome * 12;
  const unitMixMarketMonthly = d.unitMix.reduce((s, r) => s + r.marketRent * r.count, 0);
  const unitMixMarketAnnual = unitMixMarketMonthly * 12;
  const unitMixTotalUpside = unitMixMarketAnnual - unitMixAnnualIncome;

  // ── Rehab ──
  const rehabLineTotal = (items: RehabLineItem[]) => items.reduce((s, i) => s + (i.budget || i.unitCost * i.qty), 0);
  const rehabInteriorTotal = rehabLineTotal(d.rehabInterior);
  const rehabExteriorTotal = rehabLineTotal(d.rehabExterior);
  const rehabMechanicalTotal = rehabLineTotal(d.rehabMechanical);
  const rehabGeneralTotal = rehabLineTotal(d.rehabGeneral);
  const rehabGrandTotal = rehabInteriorTotal + rehabExteriorTotal + rehabMechanicalTotal + rehabGeneralTotal;

  // ── Scorecard (Quick — 5 checks shown in sidebar) ──
  const quickChecks: ScorecardCheck[] = [
    { key: "dcr", pass: dcr >= 1.25, value: fmt(dcr, "x"), target: "1.25x" },
    { key: "capRate", pass: capRateOffer >= 0.05, value: fmt(capRateOffer, "pct"), target: "5.0%" },
    { key: "coc", pass: coc >= 0.07, value: fmt(coc, "pct"), target: "7.0%" },
    { key: "expRatio", pass: expRatio <= 0.55, value: fmt(expRatio, "pct"), target: "55.0%" },
    { key: "equityMultiple", pass: equityMultiple >= 2.0, value: fmt(equityMultiple, "x"), target: "2.00x" },
  ];

  // ── Scorecard (Full — 8 checks on scorecard tab) ──
  const fullChecks: ScorecardCheck[] = [
    ...quickChecks,
    { key: "avgAnnualReturn", pass: avgAnnualReturn >= 0.15, value: fmt(avgAnnualReturn, "pct"), target: "15.0%" },
    { key: "refiCapital", pass: pctCapReturned >= 0.60, value: fmt(pctCapReturned, "pct"), target: "60.0%" },
    { key: "reserves", pass: d.reservesPerUnit >= 250, value: fmt(d.reservesPerUnit, "currency"), target: "$250" },
  ];

  const passCount = quickChecks.filter((c) => c.pass).length;
  const fullPassCount = fullChecks.filter((c) => c.pass).length;

  return {
    loanAmt, downPmt, monthlyPI, monthlyIO, annualDSio, annualDSamort,
    loanOrigCost, acqFeeDollar, totalClosing, reserves, totalCapital, totalAcqCost,
    netRental, egi, totalExp, noi, expRatio,
    capRateAsk, capRateOffer, grm, twoPctRule, dcr, cashFlow, coc,
    pricePerUnit, pricePerUnitOffer, pricePerSF, noiPerUnit, expPerUnit,
    years, yr5NOI, grossSalePrice, sellingCosts: sellingCostsDollar, netSaleProceeds,
    loanBalExit, netEquity, totalCF, totalProfit, equityMultiple, avgAnnualReturn, avgCOC,
    refiYearNOI, refiAppraisedVal, refiLoanAmt, cashOut, pctCapReturned,
    flipInterest, flipTotalCarry, flipCommDollar, flipTotalExp, flipAllIn,
    flipCashInvested, flipProfit, flipROI, flipROICash, flipAnnROI, flipARVRule,
    unitMixTotalUnits, unitMixTotalSF, unitMixAvgSF, unitMixMonthlyIncome,
    unitMixAnnualIncome, unitMixMarketMonthly, unitMixMarketAnnual, unitMixTotalUpside,
    rehabInteriorTotal, rehabExteriorTotal, rehabMechanicalTotal, rehabGeneralTotal, rehabGrandTotal,
    quickChecks, fullChecks, passCount, fullPassCount,
  };
}

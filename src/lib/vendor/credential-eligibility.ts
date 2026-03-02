/**
 * Pure function to check vendor credential eligibility.
 * Used by PM vendor drawer and credential review components.
 */

interface CredentialInput {
  type: string;
  status: string;
  expiration_date: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  warnings: string[];
}

const CRITICAL_TYPES = ["insurance_gl", "insurance_wc", "w9"];
const EXPIRY_WARNING_DAYS = 30;

/**
 * Check vendor credential eligibility.
 * Rules:
 * - Must have active GL insurance
 * - Must have active WC insurance
 * - Must have W9 on file (active)
 * - No expired critical documents
 * - Warn if any credential expires within 30 days
 */
export function checkVendorEligibility(
  credentials: CredentialInput[]
): EligibilityResult {
  const reasons: string[] = [];
  const warnings: string[] = [];

  // Check for critical types
  const hasActiveGL = credentials.some(
    (c) => c.type === "insurance_gl" && c.status === "active"
  );
  const hasActiveWC = credentials.some(
    (c) => c.type === "insurance_wc" && c.status === "active"
  );
  const hasActiveW9 = credentials.some(
    (c) => c.type === "w9" && c.status === "active"
  );

  if (!hasActiveGL) reasons.push("Missing active General Liability insurance");
  if (!hasActiveWC)
    reasons.push("Missing active Workers' Compensation insurance");
  if (!hasActiveW9) reasons.push("Missing W9 tax form");

  // Check for expired critical docs
  const expiredCritical = credentials.filter(
    (c) => CRITICAL_TYPES.includes(c.type) && c.status === "expired"
  );
  for (const cred of expiredCritical) {
    reasons.push(`Expired ${cred.type.replace(/_/g, " ")}`);
  }

  // Check for any expired docs (non-critical)
  const expiredOther = credentials.filter(
    (c) => !CRITICAL_TYPES.includes(c.type) && c.status === "expired"
  );
  if (expiredOther.length > 0) {
    warnings.push(
      `${expiredOther.length} non-critical credential(s) expired`
    );
  }

  // Check for upcoming expirations
  const now = new Date();
  for (const cred of credentials) {
    if (
      cred.status === "active" &&
      cred.expiration_date
    ) {
      const exp = new Date(cred.expiration_date);
      const daysLeft = Math.ceil(
        (exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
      );
      if (daysLeft > 0 && daysLeft <= EXPIRY_WARNING_DAYS) {
        warnings.push(
          `${cred.type.replace(/_/g, " ")} expires in ${daysLeft} day(s)`
        );
      }
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
    warnings,
  };
}

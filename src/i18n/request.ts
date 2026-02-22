import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  // During static generation (e.g. /_not-found), cookies() throws.
  // Fall back to "en" when no request context is available.
  let locale: "en" | "es" = "en";
  try {
    const cookieStore = await cookies();
    locale = cookieStore.get("locale")?.value === "es" ? "es" : "en";
  } catch {
    // Static generation — no request context
  }

  // Existing monolithic messages (PM side)
  const base = (await import(`../messages/${locale}.json`)).default;

  // Vendor namespace files — each file is FLAT within its namespace.
  // Nesting under the "vendor" key is done at merge time (Correction 5).
  const vendorNav = (await import(`../messages/${locale}/vendor-nav.json`)).default;
  const vendorOnboarding = (await import(`../messages/${locale}/vendor-onboarding.json`)).default;
  const vendorDashboard = (await import(`../messages/${locale}/vendor-dashboard.json`)).default;
  const vendorJobs = (await import(`../messages/${locale}/vendor-jobs.json`)).default;
  const vendorEstimates = (await import(`../messages/${locale}/vendor-estimates.json`)).default;
  const vendorInvoices = (await import(`../messages/${locale}/vendor-invoices.json`)).default;
  const vendorProfile = (await import(`../messages/${locale}/vendor-profile.json`)).default;
  const vendorClients = (await import(`../messages/${locale}/vendor-clients.json`)).default;
  const vendorSchedule = (await import(`../messages/${locale}/vendor-schedule.json`)).default;

  const messages = {
    ...base,
    vendor: {
      nav: vendorNav,
      onboarding: vendorOnboarding,
      dashboard: vendorDashboard,
      jobs: vendorJobs,
      estimates: vendorEstimates,
      invoices: vendorInvoices,
      profile: vendorProfile,
      clients: vendorClients,
      schedule: vendorSchedule,
    },
  };

  // Usage in components:
  // useTranslations('vendor.jobs')  → t('title') resolves to vendor.jobs.title
  // useTranslations('vendor.nav')   → t('home') resolves to vendor.nav.home

  return { locale, messages };
});

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
  const vendorReports = (await import(`../messages/${locale}/vendor-reports.json`)).default;
  const vendorExpenses = (await import(`../messages/${locale}/vendor-expenses.json`)).default;
  const vendorMessages = (await import(`../messages/${locale}/vendor-messages.json`)).default;
  const vendorWorkers = (await import(`../messages/${locale}/vendor-workers.json`)).default;
  const vendorAgreements = (await import(`../messages/${locale}/vendor-agreements.json`)).default;
  const vendorIntegrations = (await import(`../messages/${locale}/vendor-integrations.json`)).default;
  const vendorRecurring = (await import(`../messages/${locale}/vendor-recurring.json`)).default;
  const vendorBooking = (await import(`../messages/${locale}/vendor-booking.json`)).default;
  const vendorDirectory = (await import(`../messages/${locale}/vendor-directory.json`)).default;

  // Shared messaging module (used across Pro, Vendor, Home, Operate)
  const messaging = (await import(`../messages/${locale}/messaging.json`)).default;

  // Home (homeowner) namespace files
  const homeNav = (await import(`../messages/${locale}/home-nav.json`)).default;
  const homeOnboarding = (await import(`../messages/${locale}/home-onboarding.json`)).default;
  const homeDashboard = (await import(`../messages/${locale}/home-dashboard.json`)).default;
  const homeProperty = (await import(`../messages/${locale}/home-property.json`)).default;
  const homeWorkOrders = (await import(`../messages/${locale}/home-work-orders.json`)).default;
  const homeVendors = (await import(`../messages/${locale}/home-vendors.json`)).default;
  const homeMessages = (await import(`../messages/${locale}/home-messages.json`)).default;
  const homeDisputes = (await import(`../messages/${locale}/home-disputes.json`)).default;
  const homeProjects = (await import(`../messages/${locale}/home-projects.json`)).default;
  const homeSettings = (await import(`../messages/${locale}/home-settings.json`)).default;
  const homeSubscription = (await import(`../messages/${locale}/home-subscription.json`)).default;
  const homeMatching = (await import(`../messages/${locale}/home-matching.json`)).default;

  const messages = {
    ...base,
    messaging,
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
      reports: vendorReports,
      expenses: vendorExpenses,
      messages: vendorMessages,
      workers: vendorWorkers,
      agreements: vendorAgreements,
      integrations: vendorIntegrations,
      recurring: vendorRecurring,
      booking: vendorBooking,
      directory: vendorDirectory,
    },
    home: {
      nav: homeNav,
      onboarding: homeOnboarding,
      dashboard: homeDashboard,
      property: homeProperty,
      workOrders: homeWorkOrders,
      vendors: homeVendors,
      messages: homeMessages,
      disputes: homeDisputes,
      projects: homeProjects,
      settings: homeSettings,
      subscription: homeSubscription,
      matching: homeMatching,
    },
  };

  // Usage in components:
  // useTranslations('vendor.jobs')     → t('title') resolves to vendor.jobs.title
  // useTranslations('vendor.nav')      → t('home') resolves to vendor.nav.home
  // useTranslations('home.nav')        → t('dashboard') resolves to home.nav.dashboard
  // useTranslations('home.onboarding') → t('title') resolves to home.onboarding.title

  return { locale, messages };
});

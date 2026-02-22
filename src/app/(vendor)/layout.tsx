import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, getUserRoles } from "@/lib/vendor/role-helpers";
import { VendorSidebar } from "@/components/vendor/vendor-sidebar";
import { VendorBottomNav } from "@/components/vendor/vendor-bottom-nav";
import { VendorShell } from "@/components/vendor/vendor-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role enforcement (Correction 7) — checks vendor_users membership table
  // Redirects to /login if not authenticated, /vendor/onboarding if no vendor membership
  await requireVendorRole();

  // Get user for sidebar display
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user also has PM role (for role switcher)
  const roles = await getUserRoles();
  const hasPmRole = roles.some((r) => r.role === "pm" && r.is_active);

  // Theme + locale from cookies (zero-flash init)
  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value;
  const initialTheme = raw === "light" ? "light" : "dark";
  const initialLocale =
    cookieStore.get("locale")?.value === "es" ? "es" : "en";
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={initialLocale} messages={messages}>
      <LocaleProvider initialLocale={initialLocale as "en" | "es"}>
        <ThemeProvider initialTheme={initialTheme}>
          <VendorShell>
            <VendorSidebar user={user!} hasPmRole={hasPmRole} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-14 md:p-6 md:pt-6 pb-20 md:pb-6">
              {children}
            </main>
            <VendorBottomNav />
          </VendorShell>
        </ThemeProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  );
}

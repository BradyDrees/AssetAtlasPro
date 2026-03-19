import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { requireVendorRole, getUserRoles } from "@/lib/vendor/role-helpers";
import { PM_ROLES } from "@/lib/vendor/types";
import { ProSidebar } from "@/components/pro-sidebar";
import { ProBottomNav } from "@/components/pro-bottom-nav";
import { VendorShell } from "@/components/vendor/vendor-shell";
import { VendorRoleProvider } from "@/components/vendor/vendor-role-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";

export const dynamic = "force-dynamic";

export default async function ProLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Server-side role enforcement — checks vendor_users membership table
  // Redirects to /login if not authenticated, /pro/onboarding if no vendor membership
  const vendorAuth = await requireVendorRole();

  // Get user for sidebar display
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if user also has PM or owner role (for tier switcher)
  const roles = await getUserRoles();
  const hasPmRole = roles.some((r) => PM_ROLES.includes(r.role) && r.is_active);
  const hasOwnerRole = roles.some((r) => r.role === "owner" && r.is_active);

  // Theme + locale from cookies (zero-flash init)
  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value;
  const initialTheme = raw === "light" ? "light" : "dark";
  const initialLocale = (await getLocale()) as "en" | "es";
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={initialLocale} messages={messages}>
      <LocaleProvider initialLocale={initialLocale as "en" | "es"}>
        <ThemeProvider initialTheme={initialTheme}>
          <VendorRoleProvider role={vendorAuth.role}>
            <VendorShell>
              <ProSidebar user={user!} hasPmRole={hasPmRole} hasOwnerRole={hasOwnerRole} vendorRole={vendorAuth.role} />
              <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-14 md:p-6 md:pt-6 pb-20 md:pb-6">
                {children}
              </main>
              <ProBottomNav />
            </VendorShell>
          </VendorRoleProvider>
        </ThemeProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  );
}

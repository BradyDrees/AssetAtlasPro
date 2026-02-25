import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { OperateSidebar } from "@/components/operate-sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { DashboardShell } from "@/components/dashboard-shell";
import { getUserRoles } from "@/lib/vendor/role-helpers";

export const dynamic = "force-dynamic";

export default async function OperateLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  // Check available tiers for tier switcher
  const roles = await getUserRoles();
  const hasVendorRole = roles.some((r) => r.role === "vendor" && r.is_active);
  const hasOwnerRole = roles.some((r) => r.role === "owner" && r.is_active);

  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value;
  const initialTheme = raw === "light" ? "light" : "dark";
  const initialLocale = (await getLocale()) as "en" | "es";
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={initialLocale} messages={messages}>
      <LocaleProvider initialLocale={initialLocale as "en" | "es"}>
        <ThemeProvider initialTheme={initialTheme}>
          <DashboardShell>
            <OperateSidebar user={user} hasVendorRole={hasVendorRole} hasOwnerRole={hasOwnerRole} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-14 md:p-6 md:pt-6">
              {children}
            </main>
          </DashboardShell>
        </ThemeProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  );
}

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { HomeSidebar } from "@/components/home-sidebar";
import { HomeBottomNav } from "@/components/home-bottom-nav";
import { HomeShell } from "@/components/home-shell";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";
import { getUserRoles } from "@/lib/vendor/role-helpers";

export const dynamic = "force-dynamic";

export default async function HomeLayout({
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

  // Check if user has owner role
  const roles = await getUserRoles();
  const hasOwnerRole = roles.some((r) => r.role === "owner" && r.is_active);

  if (!hasOwnerRole) {
    redirect("/home/onboarding");
  }

  // Check for other roles (for tier switcher)
  const hasVendorRole = roles.some((r) => r.role === "vendor" && r.is_active);
  const hasPmRole = roles.some((r) => r.role === "pm" && r.is_active);

  // Theme + locale from cookies
  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value;
  const initialTheme = raw === "light" ? "light" : "dark";
  const initialLocale = (await getLocale()) as "en" | "es";
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={initialLocale} messages={messages}>
      <LocaleProvider initialLocale={initialLocale as "en" | "es"}>
        <ThemeProvider initialTheme={initialTheme}>
          <HomeShell>
            <HomeSidebar user={user} hasVendorRole={hasVendorRole} hasPmRole={hasPmRole} />
            <main className="flex-1 overflow-y-auto overflow-x-hidden p-4 pt-14 md:p-6 md:pt-6 pb-20 md:pb-6">
              {children}
            </main>
            <HomeBottomNav />
          </HomeShell>
        </ThemeProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  );
}

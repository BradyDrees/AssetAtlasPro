import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { createClient } from "@/lib/supabase/server";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/locale-provider";

/**
 * Lightweight layout for vendor onboarding.
 * NO requireVendorRole() — the user doesn't have a vendor_users record yet.
 * Only checks that the user is authenticated.
 */
export default async function VendorOnboardingLayout({
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

  // If user already has vendor membership, skip onboarding → go to dashboard
  const { data: vendorUser } = await supabase
    .from("vendor_users")
    .select("id")
    .eq("user_id", user.id)
    .eq("is_active", true)
    .single();

  if (vendorUser) {
    redirect("/vendor");
  }

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
          <div className={initialTheme === "dark" ? "dark" : ""}>
            <div className="min-h-dvh bg-surface-tertiary text-content-secondary">
              {children}
            </div>
          </div>
        </ThemeProvider>
      </LocaleProvider>
    </NextIntlClientProvider>
  );
}

import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/sidebar";
import { ThemeProvider } from "@/components/theme-provider";
import { DashboardShell } from "@/components/dashboard-shell";

export default async function DashboardLayout({
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

  const cookieStore = await cookies();
  const raw = cookieStore.get("theme")?.value;
  const initialTheme = raw === "light" ? "light" : "dark";

  return (
    <ThemeProvider initialTheme={initialTheme}>
      <DashboardShell>
        <Sidebar user={user} />
        <main className="flex-1 overflow-y-auto p-4 pt-14 md:p-6 md:pt-6">
          {children}
        </main>
      </DashboardShell>
    </ThemeProvider>
  );
}

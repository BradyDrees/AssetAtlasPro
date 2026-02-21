import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { FeatureCards } from "@/components/feature-cards";

export default async function LandingPage() {
  // If already logged in, go straight to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  const t = await getTranslations();
  const cookieStore = await cookies();
  const locale = cookieStore.get("locale")?.value === "es" ? "es" : "en";
  const messages = await getMessages();

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-brand-950 relative">
      {/* Background decorative shapes — fixed so they don't affect scroll */}
      <div className="fixed top-0 left-0 w-[500px] h-[500px] bg-brand-600/8 rounded-full -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-gold-500/5 rounded-full translate-x-1/3 translate-y-1/3 pointer-events-none" />
      <div className="fixed top-1/3 right-1/4 w-48 h-48 bg-brand-400/5 rounded-full pointer-events-none" />
      <div className="fixed bottom-1/3 left-[8%] w-32 h-32 bg-gold-400/5 rounded-full pointer-events-none" />
      <div className="fixed top-[15%] right-[10%] w-64 h-64 bg-brand-500/6 rounded-full pointer-events-none" />
      <div className="fixed top-[60%] left-[5%] w-56 h-56 bg-brand-400/4 rounded-full pointer-events-none" />
      <div className="fixed top-[80%] right-[15%] w-40 h-40 bg-gold-500/6 rounded-full pointer-events-none" />
      <div className="fixed top-[10%] left-[40%] w-24 h-24 bg-gold-400/4 rounded-full pointer-events-none" />
      <div className="fixed top-[45%] right-[5%] w-36 h-36 bg-brand-600/5 rounded-full pointer-events-none" />
      <div className="fixed bottom-[15%] left-[30%] w-20 h-20 bg-brand-300/5 rounded-full pointer-events-none" />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo-dark.png"
            alt="Asset Atlas Pro"
            width={220}
            height={100}
            className="h-16 w-auto logo-fade"
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            {t("auth.signIn")}
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors shadow-lg shadow-brand-900/40"
          >
            {t("auth.getStarted")}
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-10 md:pt-20 pb-20 max-w-5xl mx-auto">
        <div className="text-center">
          {/* Centered logo */}
          <div className="flex justify-center mb-2">
            <Image
              src="/logo-dark.png"
              alt="Asset Atlas Pro"
              width={1200}
              height={530}
              className="h-80 md:h-[28rem] w-auto logo-fade"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 mb-6">
            <span className="w-2.5 h-2.5 bg-gold-400 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gold-300">{t("landing.builtForTheField")}</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            {t("landing.heroTitle")}{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              {t("landing.heroTitleAccent")}
            </span>
          </h2>

          <p className="mt-6 text-lg md:text-xl text-charcoal-300 max-w-2xl mx-auto leading-relaxed">
            {t("landing.heroSubtitle")}
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors shadow-xl shadow-brand-900/50"
            >
              {t("auth.startFree")}
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white border border-white/15 hover:border-white/30 hover:bg-white/5 rounded-xl transition-colors"
            >
              {t("auth.signIn")}
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 px-6 md:px-12 pb-24 max-w-5xl mx-auto">
        <NextIntlClientProvider locale={locale} messages={messages}>
          <FeatureCards />
        </NextIntlClientProvider>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-6 md:px-12 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-r from-brand-900/50 to-brand-800/50 border border-brand-700/30 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
              {t("landing.readyToStreamline")}
            </h3>
            <p className="text-charcoal-300 mb-8">
              {t("landing.getStartedInUnderAMinute")}
            </p>
            <Link
              href="/signup"
              className="inline-block px-8 py-3.5 text-base font-semibold bg-gold-500 hover:bg-gold-400 text-charcoal-950 rounded-xl transition-colors shadow-lg"
            >
              {t("landing.createYourAccount")}
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 md:px-12 py-8">
        <div className="max-w-5xl mx-auto flex flex-col items-center gap-4">
          <Image src="/logo-dark.png" alt="Asset Atlas Pro" width={800} height={350} className="h-40 md:h-52 w-auto logo-fade" />
          <span className="text-sm text-charcoal-400">&copy; 2026</span>
        </div>
      </footer>
    </div>
  );
}

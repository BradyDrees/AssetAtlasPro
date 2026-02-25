import Image from "next/image";
import Link from "next/link";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";

export const dynamic = "force-dynamic";

export default async function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = (await getLocale()) as "en" | "es";
  const messages = await getMessages();
  const t = await getTranslations();

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-100">
      {/* Nav */}
      <header className="px-5 md:px-10 py-4 flex items-center justify-between border-b border-slate-800/50">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo-dark.png"
            alt="Asset Atlas Pro"
            width={220}
            height={100}
            className="h-10 w-auto"
            priority
          />
        </Link>
        <Link
          href="/"
          className="text-sm text-slate-400 hover:text-white transition-colors"
        >
          ← {t("common.back")}
        </Link>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-5 md:px-10 py-12 md:py-16">
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </main>

      {/* Footer */}
      <footer className="px-5 md:px-10 py-8 text-center border-t border-slate-800">
        <span className="text-xs text-slate-500">
          © 2026 Asset Atlas Pro
        </span>
      </footer>
    </div>
  );
}

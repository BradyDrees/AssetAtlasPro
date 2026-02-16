import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function LandingPage() {
  // If already logged in, go straight to dashboard
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-charcoal-950 via-charcoal-900 to-brand-950 relative overflow-hidden">
      {/* Background decorative shapes */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-brand-600/8 rounded-full -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[400px] h-[400px] bg-gold-500/5 rounded-full translate-x-1/3 translate-y-1/3" />
      <div className="absolute top-1/3 right-1/4 w-48 h-48 bg-brand-400/5 rounded-full" />
      <div className="absolute bottom-1/3 left-1/5 w-32 h-32 bg-gold-400/5 rounded-full" />

      {/* Nav */}
      <header className="relative z-10 flex items-center justify-between px-6 py-5 md:px-12">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo-dark.png"
            alt="Asset Atlas Pro"
            width={180}
            height={80}
            className="h-12 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="px-4 py-2 text-sm font-medium text-white/80 hover:text-white transition-colors"
          >
            Sign In
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2.5 text-sm font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-lg transition-colors shadow-lg shadow-brand-900/40"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10 px-6 md:px-12 pt-10 md:pt-20 pb-20 max-w-5xl mx-auto">
        <div className="text-center">
          {/* Centered logo */}
          <div className="flex justify-center mb-8">
            <Image
              src="/logo-dark.png"
              alt="Asset Atlas Pro"
              width={500}
              height={220}
              className="h-40 md:h-56 w-auto"
              priority
            />
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gold-500/10 border border-gold-500/20 rounded-full mb-6">
            <span className="w-2 h-2 bg-gold-400 rounded-full animate-pulse" />
            <span className="text-xs font-medium text-gold-300">Built for the field</span>
          </div>

          <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight tracking-tight">
            Property Inspections,{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-brand-300">
              Simplified
            </span>
          </h2>

          <p className="mt-6 text-lg md:text-xl text-charcoal-300 max-w-2xl mx-auto leading-relaxed">
            Due diligence, property inspections, and unit turns &mdash; all in one
            mobile-first platform designed for multifamily real estate professionals.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold bg-brand-600 hover:bg-brand-500 text-white rounded-xl transition-colors shadow-xl shadow-brand-900/50"
            >
              Start Free
            </Link>
            <Link
              href="/login"
              className="w-full sm:w-auto px-8 py-3.5 text-base font-semibold text-white border border-white/15 hover:border-white/30 hover:bg-white/5 rounded-xl transition-colors"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Feature cards */}
      <section className="relative z-10 px-6 md:px-12 pb-24 max-w-5xl mx-auto">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Due Diligence */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 bg-brand-600/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Due Diligence</h3>
            <p className="text-sm text-charcoal-300 leading-relaxed">
              Capture photos, rate conditions, and document every section of a
              property with structured inspection templates.
            </p>
          </div>

          {/* Inspections */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 bg-gold-500/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-gold-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Inspections</h3>
            <p className="text-sm text-charcoal-300 leading-relaxed">
              Grade units, identify findings, assess risk &mdash; with photo
              documentation and severity tracking built in.
            </p>
          </div>

          {/* Unit Turns */}
          <div className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all">
            <div className="w-12 h-12 bg-brand-400/20 rounded-xl flex items-center justify-center mb-4">
              <svg className="w-6 h-6 text-brand-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Unit Turns</h3>
            <p className="text-sm text-charcoal-300 leading-relaxed">
              Track make-ready checklists, paint scopes, and condition assessments
              with exportable reports in PDF and Excel.
            </p>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="relative z-10 px-6 md:px-12 pb-20">
        <div className="max-w-2xl mx-auto text-center">
          <div className="bg-gradient-to-r from-brand-900/50 to-brand-800/50 border border-brand-700/30 rounded-2xl p-8 md:p-12 backdrop-blur-sm">
            <h3 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to streamline your inspections?
            </h3>
            <p className="text-charcoal-300 mb-8">
              Get started in under a minute. No credit card required.
            </p>
            <Link
              href="/signup"
              className="inline-block px-8 py-3.5 text-base font-semibold bg-gold-500 hover:bg-gold-400 text-charcoal-950 rounded-xl transition-colors shadow-lg"
            >
              Create Your Account
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 px-6 md:px-12 py-8">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Image src="/logo-dark.png" alt="Asset Atlas Pro" width={120} height={50} className="h-8 w-auto" />
            <span className="text-xs text-charcoal-400">&copy; {new Date().getFullYear()}</span>
          </div>
          <p className="text-xs text-charcoal-500">
            Built for multifamily real estate professionals.
          </p>
        </div>
      </footer>
    </div>
  );
}

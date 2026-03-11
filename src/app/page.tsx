import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { ExpandableSection } from "@/components/expandable-section";
import { StickyMobileCta } from "@/components/landing/sticky-cta";

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/acquire/dashboard");
  }

  const t = await getTranslations();

  // Tier color definitions
  const acquire = "#3b82f6";
  const operate = "#22c55e";
  const pro = "#f59e0b";
  const home = "#f43f5e";
  const accent = "#22c55e";

  return (
    <div className="min-h-screen bg-[#06090f] text-slate-100 overflow-x-hidden">
      {/* ═══ NAV ═══ */}
      <nav className="fixed top-0 left-0 right-0 z-50 px-5 md:px-10 py-3 flex items-center justify-between bg-[#06090f]/85 backdrop-blur-xl border-b border-slate-800/50">
        <Link href="/" className="flex-shrink-0">
          <Image
            src="/logo-dark.png"
            alt="Asset Atlas Pro"
            width={220}
            height={100}
            className="h-12 md:h-14 w-auto"
            priority
          />
        </Link>
        <div className="flex items-center gap-4 md:gap-7">
          <a
            href="#products"
            className="hidden sm:inline text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            {t("landing.exploreProducts")}
          </a>
          <a
            href="#pricing"
            className="hidden sm:inline text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            {t("landing.pricing")}
          </a>
          <a
            href="#how"
            className="hidden sm:inline text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            {t("landing.howItConnects")}
          </a>
          <Link
            href="/login"
            className="text-[13px] font-medium text-slate-400 hover:text-white transition-colors"
          >
            {t("auth.signIn")}
          </Link>
          <Link
            href="/signup"
            className="bg-gradient-to-r from-green-600 to-green-500 text-black font-semibold text-[13px] px-5 py-2 rounded-lg hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/30 transition-all"
          >
            {t("auth.getStarted")}
          </Link>
        </div>
      </nav>

      {/* ═══ HERO ═══ */}
      <section className="pt-36 md:pt-44 pb-10 md:pb-14 px-5 md:px-10 text-center relative">
        <div className="absolute top-[-200px] left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-[radial-gradient(circle,rgba(34,197,94,0.08)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10 max-w-[900px] mx-auto">
          <span className="inline-block text-xs font-semibold text-green-400 bg-green-500/10 border border-green-500/20 px-3.5 py-1.5 rounded-full mb-6 tracking-wide">
            {t("landing.heroBadge")}
          </span>
          <h1 className="text-[clamp(40px,6vw,72px)] font-black leading-[1.05] tracking-[-2px] mb-5">
            {t("landing.heroTitle")}
            <br />
            <span className="bg-gradient-to-r from-green-500 to-green-300 bg-clip-text text-transparent">
              {t("landing.heroTitleAccent")}
            </span>
          </h1>
          <p className="text-lg text-slate-400 max-w-[640px] mx-auto mb-9 leading-relaxed font-light">
            {t("landing.heroSubtitle")}
          </p>
          <div className="flex gap-3.5 justify-center flex-wrap">
            <a
              href="#products"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[10px] font-semibold text-[15px] bg-gradient-to-r from-green-600 to-green-500 text-black hover:-translate-y-0.5 hover:shadow-lg hover:shadow-green-500/25 transition-all"
            >
              {t("landing.exploreProducts")} ↓
            </a>
            <a
              href="#products"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[10px] font-semibold text-[15px] border border-green-500/30 text-green-400 hover:bg-green-500/10 transition-all"
            >
              {t("landing.seeItInAction")} ▶
            </a>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-7 py-3.5 rounded-[10px] font-semibold text-[15px] border border-slate-600 text-white hover:border-green-500 hover:text-green-400 transition-all"
            >
              {t("auth.signIn")}
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ SOCIAL PROOF ═══ */}
      <section className="px-5 md:px-10 pb-16">
        <div className="max-w-[900px] mx-auto text-center">
          <p className="text-slate-500 text-sm mb-6 font-light">
            {t("landing.socialProofLine")}
          </p>
          <div className="flex justify-center gap-8 md:gap-16 flex-wrap">
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-green-400">
                50+
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t("landing.statMarkets")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-green-400">
                10K+
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t("landing.statWorkOrders")}
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl md:text-3xl font-extrabold text-green-400">
                5K+
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {t("landing.statInspections")}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ WHO IS THIS FOR ═══ */}
      <section className="px-5 md:px-10 pb-20">
        <div className="text-center mb-10">
          <h2 className="text-[clamp(24px,3.5vw,36px)] font-extrabold tracking-[-1px] mb-2.5">
            {t("landing.whoIsThisFor")}
          </h2>
          <p className="text-slate-400 text-base max-w-[600px] mx-auto font-light">
            {t("landing.whoIsThisForSubtitle")}
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-[1000px] mx-auto">
          <a
            href="#products"
            className="bg-[#0d1320] border border-slate-800 rounded-xl p-5 text-center hover:border-blue-500/40 hover:-translate-y-1 transition-all"
          >
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ background: `${acquire}1a` }}
            >
              🔍
            </div>
            <div
              className="text-sm font-bold mb-1"
              style={{ color: acquire }}
            >
              {t("landing.roleInvestors")}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              {t("landing.roleInvestorsDesc")}
            </div>
          </a>
          <a
            href="#products"
            className="bg-[#0d1320] border border-slate-800 rounded-xl p-5 text-center hover:border-green-500/40 hover:-translate-y-1 transition-all"
          >
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ background: `${operate}1a` }}
            >
              🏢
            </div>
            <div
              className="text-sm font-bold mb-1"
              style={{ color: operate }}
            >
              {t("landing.roleManagers")}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              {t("landing.roleManagersDesc")}
            </div>
          </a>
          <a
            href="#products"
            className="bg-[#0d1320] border border-slate-800 rounded-xl p-5 text-center hover:border-amber-500/40 hover:-translate-y-1 transition-all"
          >
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ background: `${pro}1a` }}
            >
              🔧
            </div>
            <div className="text-sm font-bold mb-1" style={{ color: pro }}>
              {t("landing.roleContractors")}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              {t("landing.roleContractorsDesc")}
            </div>
          </a>
          <a
            href="#products"
            className="bg-[#0d1320] border border-slate-800 rounded-xl p-5 text-center hover:border-rose-500/40 hover:-translate-y-1 transition-all"
          >
            <div
              className="w-12 h-12 rounded-xl mx-auto mb-3 flex items-center justify-center text-2xl"
              style={{ background: `${home}1a` }}
            >
              🏠
            </div>
            <div className="text-sm font-bold mb-1" style={{ color: home }}>
              {t("landing.roleHomeowners")}
            </div>
            <div className="text-[11px] text-slate-500 leading-snug">
              {t("landing.roleHomeownersDesc")}
            </div>
          </a>
        </div>
      </section>

      {/* ═══ PRODUCT CARDS — 2x2 GRID ═══ */}
      <section className="px-5 md:px-10 py-20" id="products">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1px] mb-2.5">
            {t("landing.fourProducts")}
          </h2>
          <p className="text-slate-400 text-base max-w-[600px] mx-auto font-light">
            {t("landing.fourProductsSubtitle")}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 max-w-[1200px] mx-auto">
          {/* ── ACQUIRE ── */}
          <div
            className="bg-[#0d1320] border border-slate-800 rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-slate-700 transition-all"
            style={{ borderTop: `3px solid ${acquire}` }}
          >
            <div className="px-6 pt-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[32px] mb-3">🔍</div>
                  <div
                    className="text-2xl font-extrabold tracking-[-0.5px]"
                    style={{ color: acquire }}
                  >
                    {t("tiers.acquire")}
                  </div>
                </div>
                <div
                  className="text-sm font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: `${acquire}1a`, color: acquire }}
                >
                  {t("landing.acquire.price")}
                </div>
              </div>
              <div className="text-[13px] font-medium mt-1 opacity-70">
                {t("tiers.acquireTagline")}
              </div>
              <p className="text-slate-400 text-[13px] mt-2.5 leading-relaxed font-light">
                {t("landing.acquire.desc")}
              </p>
              <div className="text-slate-500 text-[11px] mt-3 font-medium uppercase tracking-wide">
                {t("landing.acquire.audience")}
              </div>
            </div>

            <AppMockup color={acquire} />

            <div className="px-6 pb-6">
              <FeatureGroup title={t("landing.acquire.ddWalks")} />
              <Feature color={acquire} text={t("landing.acquire.feat1")} />
              <Feature color={acquire} text={t("landing.acquire.feat2")} />
              <Feature color={acquire} text={t("landing.acquire.feat3")} />
              <Feature color={acquire} text={t("landing.acquire.feat4")} />

              <FeatureGroup title={t("landing.acquire.dealAnalyzer")} />
              <Feature color={acquire} text={t("landing.acquire.feat5")} />
              <Feature color={acquire} text={t("landing.acquire.feat6")} />
              <Feature color={acquire} text={t("landing.acquire.feat7")} />

              <FeatureGroup title={t("landing.acquire.ecosystem")} />
              <Feature
                color={accent}
                text={t("landing.acquire.feat8")}
                shared={t("landing.shared")}
              />
              <Feature
                color={accent}
                text={t("landing.acquire.feat9")}
                shared={t("landing.shared")}
              />
              <Feature
                color={accent}
                text={t("landing.acquire.feat10")}
                shared={t("landing.shared")}
              />

              <Link
                href="/signup?tier=acquire"
                className="block text-center py-3.5 text-sm font-bold rounded-[10px] mt-5 transition-all hover:-translate-y-0.5 text-black"
                style={{
                  background: `linear-gradient(135deg, #2563eb, ${acquire}, #60a5fa)`,
                }}
              >
                {t("landing.acquire.cta")} →
              </Link>
            </div>
          </div>

          {/* ── OPERATE ── */}
          <div
            className="bg-[#0d1320] border border-slate-800 rounded-2xl overflow-hidden hover:-translate-y-1 transition-all relative"
            style={{ borderTop: `3px solid ${operate}`, borderColor: operate }}
          >
            <span
              className="absolute top-3.5 right-3.5 text-[10px] font-bold tracking-wide px-2.5 py-1 rounded-[5px]"
              style={{
                background: "rgba(16,185,129,0.15)",
                color: operate,
              }}
            >
              {t("landing.mostPopular")}
            </span>

            <div className="px-6 pt-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[32px] mb-3">🏢</div>
                  <div
                    className="text-2xl font-extrabold tracking-[-0.5px]"
                    style={{ color: operate }}
                  >
                    {t("tiers.operate")}
                  </div>
                </div>
                <div
                  className="text-sm font-bold px-3 py-1.5 rounded-lg mt-8"
                  style={{ background: `${operate}1a`, color: operate }}
                >
                  {t("landing.operate.price")}
                </div>
              </div>
              <div className="text-[13px] font-medium mt-1 opacity-70">
                {t("tiers.operateTagline")}
              </div>
              <p className="text-slate-400 text-[13px] mt-2.5 leading-relaxed font-light">
                {t("landing.operate.desc")}
              </p>
              <div className="text-slate-500 text-[11px] mt-3 font-medium uppercase tracking-wide">
                {t("landing.operate.audience")}
              </div>
            </div>

            <AppMockup color={operate} />

            <div className="px-6 pb-6">
              <FeatureGroup title={t("landing.operate.inspections")} />
              <Feature color={operate} text={t("landing.operate.feat1")} />
              <Feature color={operate} text={t("landing.operate.feat2")} />
              <Feature color={operate} text={t("landing.operate.feat3")} />
              <Feature color={operate} text={t("landing.operate.feat4")} />

              <FeatureGroup title={t("landing.operate.unitTurns")} />
              <Feature color={operate} text={t("landing.operate.feat5")} />
              <Feature color={operate} text={t("landing.operate.feat6")} />
              <Feature color={operate} text={t("landing.operate.feat7")} />

              <FeatureGroup title={t("landing.operate.vendorDispatch")} />
              <Feature
                color={operate}
                text={t("landing.operate.feat8")}
                shared={t("landing.shared")}
              />
              <Feature
                color={operate}
                text={t("landing.operate.feat9")}
                shared={t("landing.shared")}
              />
              <Feature
                color={operate}
                text={t("landing.operate.feat10")}
                shared={t("landing.shared")}
              />
              <Feature color={operate} text={t("landing.operate.feat11")} />

              <Link
                href="/signup?tier=operate"
                className="block text-center py-3.5 text-sm font-bold rounded-[10px] mt-5 transition-all hover:-translate-y-0.5 text-black"
                style={{
                  background: `linear-gradient(135deg, #059669, ${operate}, #34d399)`,
                }}
              >
                {t("landing.operate.cta")} →
              </Link>
            </div>
          </div>

          {/* ── PRO ── */}
          <div
            className="bg-[#0d1320] border border-slate-800 rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-slate-700 transition-all"
            style={{ borderTop: `3px solid ${pro}` }}
          >
            <div className="px-6 pt-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[32px] mb-3">🔧</div>
                  <div
                    className="text-2xl font-extrabold tracking-[-0.5px]"
                    style={{ color: pro }}
                  >
                    {t("tiers.pro")}
                  </div>
                </div>
                <div
                  className="text-sm font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: `${pro}1a`, color: pro }}
                >
                  {t("landing.pro.price")}
                </div>
              </div>
              <div className="text-[13px] font-medium mt-1 opacity-70">
                {t("tiers.proTagline")}
              </div>
              <p className="text-slate-400 text-[13px] mt-2.5 leading-relaxed font-light">
                {t("landing.pro.desc")}
              </p>
              <div className="text-slate-500 text-[11px] mt-3 font-medium uppercase tracking-wide">
                {t("landing.pro.audience")}
              </div>
            </div>

            <AppMockup color={pro} />

            <div className="px-6 pb-6">
              <FeatureGroup title={t("landing.pro.jobs")} />
              <Feature
                color={pro}
                text={t("landing.pro.feat1")}
                shared={t("landing.shared")}
              />
              <Feature color={pro} text={t("landing.pro.feat2")} />
              <Feature color={pro} text={t("landing.pro.feat3")} />

              <FeatureGroup title={t("landing.pro.estimating")} />
              <Feature
                color={pro}
                text={t("landing.pro.feat4")}
                shared={t("landing.shared")}
              />
              <Feature
                color={pro}
                text={t("landing.pro.feat5")}
                shared={t("landing.shared")}
              />
              <Feature color={pro} text={t("landing.pro.feat6")} />

              <FeatureGroup title={t("landing.pro.pcaLite")} />
              <Feature color={pro} text={t("landing.pro.feat7")} />
              <Feature color={pro} text={t("landing.pro.feat8")} />
              <Feature color={pro} text={t("landing.pro.feat9")} />
              <Feature
                color={pro}
                text={t("landing.pro.feat10")}
                shared={t("landing.shared")}
              />

              <FeatureGroup title={t("landing.pro.business")} />
              <Feature color={pro} text={t("landing.pro.feat11")} />
              <Feature color={pro} text={t("landing.pro.feat12")} />
              <Feature color={pro} text={t("landing.pro.feat13")} />
              <Feature
                color={pro}
                text={t("landing.pro.feat14")}
                shared={t("landing.shared")}
              />

              <Link
                href="/signup?tier=pro"
                className="block text-center py-3.5 text-sm font-bold rounded-[10px] mt-5 transition-all hover:-translate-y-0.5 text-black"
                style={{
                  background: `linear-gradient(135deg, #d97706, ${pro}, #fbbf24)`,
                }}
              >
                {t("landing.pro.cta")} →
              </Link>
            </div>
          </div>

          {/* ── ATLAS HOME ── */}
          <div
            className="bg-[#0d1320] border border-slate-800 rounded-2xl overflow-hidden hover:-translate-y-1 hover:border-slate-700 transition-all"
            style={{ borderTop: `3px solid ${home}` }}
            id="pricing"
          >
            <div className="px-6 pt-7 pb-5">
              <div className="flex items-start justify-between">
                <div>
                  <div className="text-[32px] mb-3">🏠</div>
                  <div
                    className="text-2xl font-extrabold tracking-[-0.5px]"
                    style={{ color: home }}
                  >
                    {t("landing.home.title")}
                  </div>
                </div>
                <div
                  className="text-sm font-bold px-3 py-1.5 rounded-lg"
                  style={{ background: `${home}1a`, color: home }}
                >
                  {t("landing.home.startingAt")}
                </div>
              </div>
              <div className="text-[13px] font-medium mt-1 opacity-70">
                {t("landing.home.tagline")}
              </div>
              <p className="text-slate-400 text-[13px] mt-2.5 leading-relaxed font-light">
                {t("landing.home.desc")}
              </p>
              <div className="text-slate-500 text-[11px] mt-3 font-medium uppercase tracking-wide">
                {t("landing.home.audience")}
              </div>
            </div>

            <AppMockup color={home} />

            <div className="px-6 pb-6">
              <FeatureGroup title={t("landing.home.subscriptionPool")} />
              <Feature color={home} text={t("landing.home.feat1")} />
              <Feature color={home} text={t("landing.home.feat2")} />
              <Feature color={home} text={t("landing.home.feat3")} />

              <FeatureGroup title={t("landing.home.workOrders")} />
              <Feature color={home} text={t("landing.home.feat5")} />
              <Feature color={home} text={t("landing.home.feat6")} />
              <Feature color={home} text={t("landing.home.feat7")} />
              <Feature color={home} text={t("landing.home.feat8")} />

              <FeatureGroup title={t("landing.home.vendorMarketplace")} />
              <Feature color={home} text={t("landing.home.feat9")} />
              <Feature color={home} text={t("landing.home.feat10")} />
              <Feature
                color={accent}
                text={t("landing.home.feat11")}
                shared={t("landing.shared")}
              />

              <FeatureGroup
                title={t("landing.home.inspectionsProtection")}
              />
              <Feature color={home} text={t("landing.home.feat12")} />
              <Feature color={home} text={t("landing.home.feat13")} />
              <Feature color={home} text={t("landing.home.feat14")} />
              <Feature color={home} text={t("landing.home.feat15")} />

              {/* ── Pricing Tiers ── */}
              <div className="mt-5 pt-4 border-t border-slate-800/50 space-y-3">
                {/* Essential */}
                <div className="bg-[#06090f] border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-200">
                      {t("landing.home.essential")}
                    </span>
                    <span
                      className="text-lg font-extrabold"
                      style={{ color: home }}
                    >
                      {t("landing.home.essentialPrice")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.essentialFeat1")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.essentialFeat2")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.essentialFeat3")}
                    </div>
                  </div>
                </div>

                {/* Standard — Best Value */}
                <div
                  className="border rounded-xl p-4 relative"
                  style={{
                    background: "rgba(244,63,94,0.06)",
                    borderColor: "rgba(244,63,94,0.3)",
                  }}
                >
                  <span
                    className="absolute -top-2.5 right-3 text-[10px] font-bold tracking-wide px-2.5 py-0.5 rounded-[5px]"
                    style={{
                      background: "rgba(244,63,94,0.15)",
                      color: home,
                    }}
                  >
                    {t("landing.home.standardBadge")}
                  </span>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-white">
                      {t("landing.home.standard")}
                    </span>
                    <span
                      className="text-lg font-extrabold"
                      style={{ color: home }}
                    >
                      {t("landing.home.standardPrice")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.standardFeat1")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.standardFeat2")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.standardFeat3")}
                    </div>
                  </div>
                </div>

                {/* Premium */}
                <div className="bg-[#06090f] border border-slate-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-200">
                      {t("landing.home.premium")}
                    </span>
                    <span
                      className="text-lg font-extrabold"
                      style={{ color: home }}
                    >
                      {t("landing.home.premiumPrice")}
                    </span>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.premiumFeat1")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.premiumFeat2")}
                    </div>
                    <div className="text-[11px] text-slate-400">
                      • {t("landing.home.premiumFeat3")}
                    </div>
                  </div>
                </div>
              </div>

              <Link
                href="/signup?tier=home"
                className="block text-center py-3.5 text-sm font-bold rounded-[10px] mt-5 transition-all hover:-translate-y-0.5 text-white"
                style={{
                  background: `linear-gradient(135deg, #e11d48, ${home}, #fb7185)`,
                }}
              >
                {t("landing.home.cta")} →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ═══ HOW IT CONNECTS ═══ */}
      <section className="px-5 md:px-10 py-20 bg-[#0d1320]" id="how">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1px] mb-2.5">
            {t("landing.howItConnects")}
          </h2>
          <p className="text-slate-400 text-base max-w-[600px] mx-auto font-light">
            {t("landing.howItConnectsSubtitle")}
          </p>
        </div>

        {/* Flow diagram */}
        <div className="max-w-[1000px] mx-auto flex items-center justify-center gap-0 flex-wrap py-5">
          <FlowNode
            icon="🔍"
            name={t("tiers.acquire")}
            desc={t("landing.acquireFlow")}
            color={acquire}
          />
          <span className="text-2xl text-green-500 px-1 shrink-0">→</span>
          <FlowNode
            icon="🏢"
            name={t("tiers.operate")}
            desc={t("landing.operateFlow")}
            color={operate}
          />
          <span className="text-2xl text-green-500 px-1 shrink-0">→</span>
          <FlowNode
            icon="🔧"
            name={t("tiers.pro")}
            desc={t("landing.proFlow")}
            color={pro}
          />
          <span className="text-2xl text-green-500 px-1 shrink-0">→</span>
          <FlowNode
            icon="🏠"
            name={t("tiers.home")}
            desc={t("landing.homeFlow")}
            color={home}
          />
        </div>

        {/* Connection detail cards */}
        <div className="max-w-[800px] mx-auto mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <ConnectionCard
            title={t("landing.acquireToOperate")}
            desc={t("landing.acquireToOperateDesc")}
            benefit={t("landing.acquireToOperateBenefit")}
            color={acquire}
          />
          <ConnectionCard
            title={t("landing.operateToPro")}
            desc={t("landing.operateToProDesc")}
            benefit={t("landing.operateToProBenefit")}
            color={operate}
          />
          <ConnectionCard
            title={t("landing.proToOperate")}
            desc={t("landing.proToOperateDesc")}
            benefit={t("landing.proToOperateBenefit")}
            color={pro}
          />
          <ConnectionCard
            title={t("landing.homeToPro")}
            desc={t("landing.homeToProDesc")}
            benefit={t("landing.homeToProBenefit")}
            color={home}
          />
        </div>
      </section>

      {/* ═══ WHAT'S LIVE & WHAT'S COMING ═══ */}
      <section className="px-5 md:px-10 py-20" id="expand">
        <div className="text-center mb-12">
          <h2 className="text-[clamp(28px,4vw,42px)] font-extrabold tracking-[-1px] mb-2.5">
            {t("landing.whatsLive")}
          </h2>
          <p className="text-slate-400 text-base max-w-[600px] mx-auto font-light">
            {t("landing.whatsLiveSubtitle")}
          </p>
        </div>

        <div className="max-w-[1200px] mx-auto">
          <ExpandableSection
            title={t("landing.acquireRoadmap")}
            color={acquire}
            icon="🔍"
            statusLabel={t("landing.statusLive")}
            statusColor="#22c55e"
          >
            <p>
              <strong>{t("landing.liveNow")}:</strong>{" "}
              {t("landing.acquireLive").replace(
                /^Activo ahora: |^Live now: /,
                ""
              )}
            </p>
            <p>
              <strong>{t("landing.comingNext")}:</strong>{" "}
              {t("landing.acquireComing").replace(
                /^Proximo: |^Coming next: /,
                ""
              )}
            </p>
            <p>
              <strong>{t("landing.future")}:</strong>{" "}
              {t("landing.acquireFuture").replace(/^Futuro: |^Future: /, "")}
            </p>
          </ExpandableSection>

          <ExpandableSection
            title={t("landing.operateRoadmap")}
            color={operate}
            icon="🏢"
            statusLabel={t("landing.statusLive")}
            statusColor="#22c55e"
          >
            <p>
              <strong>{t("landing.liveNow")}:</strong>{" "}
              {t("landing.operateLive").replace(
                /^Activo ahora: |^Live now: /,
                ""
              )}
            </p>
            <p>
              <strong>{t("landing.comingNext")}:</strong>{" "}
              {t("landing.operateComing").replace(
                /^Proximo: |^Coming next: /,
                ""
              )}
            </p>
            <p>
              <strong>{t("landing.future")}:</strong>{" "}
              {t("landing.operateFuture").replace(/^Futuro: |^Future: /, "")}
            </p>
          </ExpandableSection>

          <ExpandableSection
            title={t("landing.proRoadmap")}
            color={pro}
            icon="🔧"
            statusLabel={t("landing.statusLive")}
            statusColor="#22c55e"
          >
            <p>
              <strong>{t("landing.liveNow")}:</strong>{" "}
              {t("landing.proLive").replace(
                /^Activo ahora: |^Live now: /,
                ""
              )}
            </p>
            <p>
              <strong>{t("landing.comingNext")}:</strong>{" "}
              {t("landing.proComing").replace(
                /^Proximo: |^Coming next: /,
                ""
              )}
            </p>
            <p>
              <strong>{t("landing.future")}:</strong>{" "}
              {t("landing.proFuture").replace(/^Futuro: |^Future: /, "")}
            </p>
          </ExpandableSection>

          <ExpandableSection
            title={t("landing.homeRoadmap")}
            color={home}
            icon="🏠"
            statusLabel={t("landing.statusPlanned")}
            statusColor="#94a3b8"
          >
            <p>
              <strong>{t("landing.planned")}:</strong>{" "}
              {t("landing.homePlanned").replace(
                /^Planificado: |^Planned: /,
                ""
              )}
            </p>
          </ExpandableSection>

          <ExpandableSection
            title={t("landing.sharedRoadmap")}
            color={accent}
            icon="⚡"
            statusLabel={t("landing.statusLive")}
            statusColor="#22c55e"
          >
            <p>{t("landing.sharedDesc")}</p>
          </ExpandableSection>
        </div>
      </section>

      {/* ═══ FINAL CTA ═══ */}
      <section className="text-center px-5 md:px-10 py-24 relative">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[radial-gradient(circle,rgba(34,197,94,0.06)_0%,transparent_70%)] pointer-events-none" />
        <div className="relative z-10">
          <h2 className="text-[clamp(28px,4vw,40px)] font-extrabold tracking-[-1px] mb-3">
            {t("landing.pickYourRole")}
          </h2>
          <p className="text-slate-400 text-base mb-8 font-light">
            {t("landing.pickYourRoleSubtitle")}
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 max-w-[800px] mx-auto">
            <Link
              href="/signup?tier=acquire"
              className="flex flex-col items-center gap-1 px-4 py-4 rounded-[10px] font-semibold text-sm text-black hover:-translate-y-0.5 transition-all"
              style={{
                background: `linear-gradient(135deg, #2563eb, ${acquire}, #60a5fa)`,
              }}
            >
              <span>{t("tiers.acquire")}</span>
              <span className="text-[11px] font-normal opacity-80">
                {t("landing.acquire.price")}
              </span>
            </Link>
            <Link
              href="/signup?tier=operate"
              className="flex flex-col items-center gap-1 px-4 py-4 rounded-[10px] font-semibold text-sm text-black hover:-translate-y-0.5 transition-all"
              style={{
                background: `linear-gradient(135deg, #059669, ${operate}, #34d399)`,
              }}
            >
              <span>{t("tiers.operate")}</span>
              <span className="text-[11px] font-normal opacity-80">
                {t("landing.operate.price")}
              </span>
            </Link>
            <Link
              href="/signup?tier=pro"
              className="flex flex-col items-center gap-1 px-4 py-4 rounded-[10px] font-semibold text-sm text-black hover:-translate-y-0.5 transition-all"
              style={{
                background: `linear-gradient(135deg, #d97706, ${pro}, #fbbf24)`,
              }}
            >
              <span>{t("tiers.pro")}</span>
              <span className="text-[11px] font-normal opacity-80">
                {t("landing.pro.price")}
              </span>
            </Link>
            <Link
              href="/signup?tier=home"
              className="flex flex-col items-center gap-1 px-4 py-4 rounded-[10px] font-semibold text-sm border hover:-translate-y-0.5 transition-all"
              style={{ borderColor: home, color: home }}
            >
              <span>{t("landing.home.title")}</span>
              <span className="text-[11px] font-normal opacity-80">
                {t("landing.home.startingAt")}
              </span>
            </Link>
          </div>
        </div>
      </section>

      {/* ═══ FOOTER ═══ */}
      <footer className="px-5 md:px-10 py-12 border-t border-slate-800">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <Image
                src="/logo-dark.png"
                alt="Asset Atlas Pro"
                width={220}
                height={100}
                className="h-12 w-auto mb-3"
              />
              <p className="text-xs text-slate-500 italic">
                {t("landing.footerTagline")}
              </p>
            </div>

            {/* Products */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
                {t("landing.footerProducts")}
              </div>
              <div className="space-y-2">
                <Link
                  href="/signup?tier=acquire"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("tiers.acquire")}
                </Link>
                <Link
                  href="/signup?tier=operate"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("tiers.operate")}
                </Link>
                <Link
                  href="/signup?tier=pro"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("tiers.pro")}
                </Link>
                <Link
                  href="/signup?tier=home"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("landing.home.title")}
                </Link>
              </div>
            </div>

            {/* Company */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
                {t("landing.footerCompany")}
              </div>
              <div className="space-y-2">
                <Link
                  href="/terms"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("landing.termsOfService")}
                </Link>
                <Link
                  href="/privacy"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("landing.privacyPolicy")}
                </Link>
              </div>
            </div>

            {/* Contact */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wide mb-3">
                {t("landing.footerContact")}
              </div>
              <div className="space-y-2">
                <a
                  href="mailto:support@assetatlaspro.com"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("landing.footerEmail")}
                </a>
                <a
                  href="https://linkedin.com/company/assetatlaspro"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {t("landing.footerLinkedIn")}
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-6 text-center text-xs text-slate-500">
            © 2026 Asset Atlas Pro
          </div>
        </div>
      </footer>

      {/* Sticky mobile CTA */}
      <StickyMobileCta />
    </div>
  );
}

/* ─── Helper Components ─── */

function FeatureGroup({ title }: { title: string }) {
  return (
    <div className="text-[10px] font-bold uppercase tracking-[0.8px] text-slate-500 pt-2.5 pb-1.5 mt-4 first:mt-0 first:border-t-0 first:pt-0 border-t border-slate-800/40">
      {title}
    </div>
  );
}

function Feature({
  color,
  text,
  shared,
}: {
  color: string;
  text: string;
  shared?: string;
}) {
  return (
    <div className="flex items-start gap-2 py-1 text-xs text-slate-400 leading-snug">
      <span
        className="w-1.5 h-1.5 rounded-full mt-[5px] shrink-0"
        style={{ background: color }}
      />
      <span className="flex-1">
        {text}
        {shared && (
          <span className="text-[8px] font-bold text-green-500 bg-green-500/10 px-1 py-px rounded-sm ml-1 align-middle">
            {shared}
          </span>
        )}
      </span>
    </div>
  );
}

function FlowNode({
  icon,
  name,
  desc,
  color,
}: {
  icon: string;
  name: string;
  desc: string;
  color: string;
}) {
  return (
    <div className="text-center px-5 py-5 flex-1 min-w-[160px]">
      <div className="text-[28px] mb-2">{icon}</div>
      <div className="text-[15px] font-bold" style={{ color }}>
        {name}
      </div>
      <div className="text-[11px] text-slate-500 mt-1">{desc}</div>
    </div>
  );
}

function ConnectionCard({
  title,
  desc,
  benefit,
  color,
}: {
  title: string;
  desc: string;
  benefit: string;
  color: string;
}) {
  return (
    <div className="bg-[#111827] border border-slate-800 rounded-[10px] p-4.5">
      <div className="font-bold text-sm mb-1.5" style={{ color }}>
        {title}
      </div>
      <div className="text-xs text-slate-400 leading-relaxed mb-2">
        {desc}
      </div>
      <div
        className="text-[11px] text-slate-300 leading-relaxed bg-slate-800/30 rounded-md p-2 border-l-2"
        style={{ borderColor: color }}
      >
        {benefit}
      </div>
    </div>
  );
}

function AppMockup({ color }: { color: string }) {
  return (
    <div className="mx-6 mb-4 rounded-lg overflow-hidden border border-slate-700/50 bg-[#0a0f1a]">
      {/* Browser chrome */}
      <div className="h-5 bg-slate-800/80 flex items-center gap-1 px-2.5">
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        <div className="w-1.5 h-1.5 rounded-full bg-slate-600" />
        <div className="flex-1 h-2 bg-slate-700/50 rounded-full mx-4" />
      </div>
      {/* App content skeleton */}
      <div className="p-2.5 flex gap-2">
        {/* Sidebar skeleton */}
        <div className="w-1/5 space-y-1.5 pt-1 hidden sm:block">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-1.5 rounded-full"
              style={{
                background: i === 1 ? `${color}60` : "#1e293b80",
              }}
            />
          ))}
        </div>
        {/* Main content skeleton */}
        <div className="flex-1 space-y-1.5">
          <div className="h-3 rounded" style={{ background: `${color}20` }} />
          <div className="grid grid-cols-3 gap-1">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-8 rounded"
                style={{
                  background: `${color}08`,
                  border: `1px solid ${color}20`,
                }}
              />
            ))}
          </div>
          <div className="h-6 rounded bg-slate-800/30" />
        </div>
      </div>
    </div>
  );
}

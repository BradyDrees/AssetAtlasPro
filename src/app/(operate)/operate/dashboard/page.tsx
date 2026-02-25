import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";

export default async function OperateDashboardPage() {
  const supabase = await createClient();
  const t = await getTranslations();

  const [inspResult, utResult] = await Promise.all([
    supabase.from("inspection_projects").select("id", { count: "exact", head: true }),
    supabase.from("unit_turn_batches").select("id", { count: "exact", head: true }),
  ]);

  const inspCount = inspResult.count ?? 0;
  const utCount = utResult.count ?? 0;

  const modules = [
    {
      title: t("nav.inspections"),
      description: t("dashboard.inspDescription"),
      href: "/operate/inspections",
      count: inspCount,
      countLabel: t("dashboard.projects"),
      gradient: "from-green-900 to-green-700",
      iconColor: "text-green-400",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
        />
      ),
    },
    {
      title: t("nav.unitTurns"),
      description: t("dashboard.utDescription"),
      href: "/operate/unit-turns",
      count: utCount,
      countLabel: t("dashboard.batches"),
      gradient: "from-green-800 to-charcoal-900",
      iconColor: "text-green-300",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      ),
    },
    {
      title: t("nav.workOrders"),
      description: t("dashboard.woDescription"),
      href: "/operate/work-orders",
      count: null,
      countLabel: "",
      gradient: "from-charcoal-900 to-green-900",
      iconColor: "text-green-400",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M11.42 15.17l-5.384 3.324a.75.75 0 01-1.15-.79l1.27-6.077-4.6-4.065a.75.75 0 01.416-1.28l6.24-.665L11.013.309a.75.75 0 01.064-.064M11.42 15.17l2.496-2.496M21.75 6.75a4.5 4.5 0 01-4.5 4.5m4.5-4.5a4.5 4.5 0 00-4.5-4.5m4.5 4.5h-4.5m0 0V2.25"
        />
      ),
    },
    {
      title: t("nav.vendors"),
      description: t("dashboard.vendorsDescription"),
      href: "/operate/vendors",
      count: null,
      countLabel: "",
      gradient: "from-green-900 to-charcoal-900",
      iconColor: "text-green-300",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z"
        />
      ),
    },
    {
      title: t("nav.estimates"),
      description: t("dashboard.estimatesDescription"),
      href: "/operate/estimates",
      count: null,
      countLabel: "",
      gradient: "from-charcoal-900 to-green-800",
      iconColor: "text-green-400",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V13.5zm0 2.25h.008v.008H8.25v-.008zm0 2.25h.008v.008H8.25V18zm2.498-6.75h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V13.5zm0 2.25h.007v.008h-.007v-.008zm0 2.25h.007v.008h-.007V18zm2.504-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zm0 2.25h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V18zm2.498-6.75h.008v.008h-.008v-.008zm0 2.25h.008v.008h-.008V13.5zM8.25 6h7.5v2.25h-7.5V6zM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 002.25 2.25h10.5a2.25 2.25 0 002.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0012 2.25z"
        />
      ),
    },
    {
      title: t("nav.invoices"),
      description: t("dashboard.invoicesDescription"),
      href: "/operate/invoices",
      count: null,
      countLabel: "",
      gradient: "from-green-800 to-charcoal-900",
      iconColor: "text-green-300",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
        />
      ),
    },
  ];

  return (
    <div>
      <div className="mb-8 bg-gradient-to-r from-green-900 via-charcoal-950 to-green-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-6 md:px-6 rounded-b-xl flex flex-col items-center justify-center overflow-visible">
        <Image
          src="/logo-dark.png"
          alt="Asset Atlas"
          width={1200}
          height={530}
          className="h-36 md:h-48 w-auto logo-fade -my-6"
        />
        <p className="text-green-300 text-sm font-semibold mt-2">
          {t("tiers.operateTagline")}
        </p>
        <p className="text-charcoal-300 text-sm mt-1 text-center">
          {t("dashboard.selectModule")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.title}
            href={m.href}
            className="group block bg-surface-primary rounded-xl border border-edge-primary shadow-sm hover:shadow-md hover:border-green-300 transition-all overflow-hidden"
          >
            <div className={`bg-gradient-to-r ${m.gradient} px-5 py-4 flex items-center gap-3`}>
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg className={`w-5 h-5 ${m.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {m.icon}
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white group-hover:text-green-200 transition-colors">
                {m.title}
              </h2>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-content-quaternary mb-3 line-clamp-2">{m.description}</p>
              {m.count !== null && (
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-content-primary">{m.count}</span>
                  <span className="text-xs text-content-muted uppercase tracking-wide">{m.countLabel}</span>
                </div>
              )}
            </div>

            <div className="px-5 py-3 border-t border-edge-tertiary bg-surface-secondary/50">
              <span className="text-sm font-medium text-green-500 group-hover:text-green-400 transition-colors inline-flex items-center gap-1">
                {t("dashboard.openModule", { title: m.title })} <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

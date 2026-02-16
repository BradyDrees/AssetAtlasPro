import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const supabase = await createClient();

  // Fetch counts for each module
  const [ddResult, inspResult, utResult] = await Promise.all([
    supabase.from("dd_projects").select("id", { count: "exact", head: true }),
    supabase
      .from("inspection_projects")
      .select("id", { count: "exact", head: true }),
    supabase
      .from("unit_turn_batches")
      .select("id", { count: "exact", head: true }),
  ]);

  const ddCount = ddResult.count ?? 0;
  const inspCount = inspResult.count ?? 0;
  const utCount = utResult.count ?? 0;

  const modules = [
    {
      title: "Due Diligence",
      description: "Full-property acquisition inspections",
      href: "/projects",
      count: ddCount,
      countLabel: "Projects",
      gradient: "from-charcoal-900 to-brand-800",
      iconColor: "text-brand-400",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
        />
      ),
    },
    {
      title: "Inspections",
      description: "Property quality and condition tracking",
      href: "/inspections",
      count: inspCount,
      countLabel: "Projects",
      gradient: "from-brand-900 to-brand-700",
      iconColor: "text-gold-400",
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
      title: "Unit Turns",
      description: "Make-ready workflows and turn packages",
      href: "/unit-turns",
      count: utCount,
      countLabel: "Batches",
      gradient: "from-brand-800 to-charcoal-900",
      iconColor: "text-brand-300",
      icon: (
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      ),
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8 bg-gradient-to-r from-brand-900 via-charcoal-950 to-brand-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-6 md:px-6 rounded-b-xl flex flex-col items-center justify-center overflow-visible">
        <Image
          src="/logo-dark.png"
          alt="Asset Atlas Pro"
          width={1200}
          height={530}
          className="h-36 md:h-48 w-auto logo-fade -my-6"
        />
        <p className="text-charcoal-300 text-sm mt-2 text-center">
          Select a module to get started.
        </p>
      </div>

      {/* Module cards */}
      <div className="grid gap-4 md:grid-cols-3">
        {modules.map((m) => (
          <Link
            key={m.title}
            href={m.href}
            className="group block bg-surface-primary rounded-xl border border-edge-primary shadow-sm hover:shadow-md hover:border-brand-200 transition-all overflow-hidden"
          >
            {/* Card header gradient */}
            <div
              className={`bg-gradient-to-r ${m.gradient} px-5 py-4 flex items-center gap-3`}
            >
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className={`w-5 h-5 ${m.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {m.icon}
                </svg>
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white group-hover:text-gold-200 transition-colors">
                  {m.title}
                </h2>
              </div>
            </div>

            {/* Card body */}
            <div className="px-5 py-4">
              <p className="text-sm text-content-quaternary mb-3">{m.description}</p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-content-primary">
                  {m.count}
                </span>
                <span className="text-xs text-content-muted uppercase tracking-wide">
                  {m.countLabel}
                </span>
              </div>
            </div>

            {/* Card footer */}
            <div className="px-5 py-3 border-t border-edge-tertiary bg-surface-secondary/50">
              <span className="text-sm font-medium text-brand-600 group-hover:text-brand-500 transition-colors inline-flex items-center gap-1">
                Open {m.title}{" "}
                <span aria-hidden="true" className="group-hover:translate-x-0.5 transition-transform">&rarr;</span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

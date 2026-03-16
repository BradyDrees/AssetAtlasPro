import { getPmVendors } from "@/app/actions/pm-vendors";
import { getVendorClients } from "@/app/actions/vendor-clients";
import { PmVendorsList } from "@/components/vendor/pm-vendors-list";
import { ClientCard } from "@/components/vendor/client-card";
import { VendorClientsHeader } from "@/components/vendor/vendor-clients-header";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { getTranslations } from "next-intl/server";

export default async function ProClientsPage() {
  const t = await getTranslations("vendor.clients");

  // Try PM view first (for PM-role users managing their vendors)
  let vendors: Awaited<ReturnType<typeof getPmVendors>>["data"] = [];
  let hasPmAccess = true;
  try {
    const result = await getPmVendors();
    vendors = result.data;
  } catch {
    hasPmAccess = false;
  }

  // If user is a vendor (no PM access), show their PM client connections instead
  if (!hasPmAccess) {
    let clients: Awaited<ReturnType<typeof getVendorClients>>["data"] = [];
    try {
      const result = await getVendorClients();
      clients = result.data;
    } catch {
      clients = [];
    }

    return (
      <div className="max-w-4xl mx-auto space-y-5">
        <VendorClientsHeader />
        {clients.length === 0 ? (
          <EmptyState
            icon="users"
            title={t("noClients")}
            subtitle={t("waitForInvite")}
          />
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {clients.map((client) => (
              <ClientCard key={client.id} client={client} />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader title={t("pmVendors.title")} />
      <PmVendorsList initial={vendors} />
    </div>
  );
}

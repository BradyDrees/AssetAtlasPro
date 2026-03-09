import { getVendorClients } from "@/app/actions/vendor-clients";
import { getDirectClients } from "@/app/actions/vendor-clients-direct";
import { VendorClientsTabbed } from "@/components/vendor/vendor-clients-tabbed";

export default async function VendorClientsPage() {
  const [pmResult, directResult] = await Promise.all([
    getVendorClients(),
    getDirectClients(),
  ]);

  return (
    <VendorClientsTabbed
      pmClients={pmResult.data}
      directClients={directResult.data}
    />
  );
}

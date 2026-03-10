import { getVendorClients } from "@/app/actions/vendor-clients";
import { getDirectClients, getDirectClientsWithPipeline } from "@/app/actions/vendor-clients-direct";
import { VendorClientsTabbed } from "@/components/vendor/vendor-clients-tabbed";

export default async function VendorClientsPage() {
  const [pmResult, directResult, pipelineResult] = await Promise.all([
    getVendorClients(),
    getDirectClients(),
    getDirectClientsWithPipeline(),
  ]);

  return (
    <VendorClientsTabbed
      pmClients={pmResult.data}
      directClients={directResult.data}
      pipelineClients={pipelineResult.data}
    />
  );
}

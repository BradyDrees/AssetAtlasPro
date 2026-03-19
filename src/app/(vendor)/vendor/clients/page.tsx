import { getVendorClients } from "@/app/actions/vendor-clients";
import { getDirectClients, getDirectClientsWithPipeline } from "@/app/actions/vendor-clients-direct";
import { getPendingConnectionRequests } from "@/app/actions/vendor-connection-responses";
import { VendorClientsTabbed } from "@/components/vendor/vendor-clients-tabbed";

export default async function VendorClientsPage() {
  const [pmResult, directResult, pipelineResult, pendingResult] = await Promise.all([
    getVendorClients(),
    getDirectClients(),
    getDirectClientsWithPipeline(),
    getPendingConnectionRequests(),
  ]);

  return (
    <VendorClientsTabbed
      pmClients={pmResult.data}
      directClients={directResult.data}
      pipelineClients={pipelineResult.data}
      pendingRequests={pendingResult.data}
    />
  );
}

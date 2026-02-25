import { createClient } from "@/lib/supabase/server";
import { getThreadMessages, markThreadRead } from "@/app/actions/home-messages";
import { ChatThreadContent } from "./chat-thread-content";

export default async function ChatThreadPage({ params }: { params: Promise<{ woId: string }> }) {
  const { woId } = await params;
  const supabase = await createClient();

  // Get work order info
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: wo } = await supabase
    .from("vendor_work_orders")
    .select("id, description, trade, vendor_org_id, status")
    .eq("id", woId)
    .eq("homeowner_id", user!.id)
    .single();

  if (!wo) {
    return (
      <div className="max-w-3xl mx-auto p-8 text-center">
        <p className="text-sm text-content-quaternary">Work order not found.</p>
      </div>
    );
  }

  // Get vendor name
  let vendorName = "Unknown Vendor";
  if (wo.vendor_org_id) {
    const { data: vendor } = await supabase
      .from("vendor_organizations")
      .select("name")
      .eq("id", wo.vendor_org_id)
      .single();
    if (vendor) vendorName = vendor.name;
  }

  // Get messages
  const messages = await getThreadMessages(woId);

  // Mark thread as read
  await markThreadRead(woId);

  return (
    <ChatThreadContent
      workOrderId={woId}
      workOrder={{
        description: wo.description,
        trade: wo.trade,
        status: wo.status,
      }}
      vendorName={vendorName}
      initialMessages={messages}
      currentUserId={user!.id}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { SubscriptionContent } from "./subscription-content";

export default async function SubscriptionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  // Get user's properties
  const { data: properties } = await supabase
    .from("homeowner_properties")
    .select("id, name, address")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  // Get subscriptions
  const { data: subscriptions } = await supabase
    .from("subscriptions")
    .select("*")
    .eq("user_id", user.id);

  // Get pools
  const { data: pools } = await supabase
    .from("maintenance_pools")
    .select("*")
    .eq("user_id", user.id);

  // Get recent pool transactions for each pool
  const poolIds = (pools ?? []).map((p: { id: string }) => p.id);
  let transactions: Array<{
    id: string;
    pool_id: string;
    type: string;
    amount: number;
    description: string | null;
    created_at: string;
  }> = [];

  if (poolIds.length > 0) {
    const { data: txData } = await supabase
      .from("pool_transactions")
      .select("*")
      .in("pool_id", poolIds)
      .order("created_at", { ascending: false })
      .limit(50);
    transactions = txData ?? [];
  }

  return (
    <SubscriptionContent
      properties={properties ?? []}
      subscriptions={subscriptions ?? []}
      pools={pools ?? []}
      transactions={transactions}
    />
  );
}

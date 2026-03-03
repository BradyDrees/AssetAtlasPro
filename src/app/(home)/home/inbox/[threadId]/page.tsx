"use client";

import { use } from "react";
import { InboxPage } from "@/components/messaging/inbox-page";

export default function HomeInboxThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  return <InboxPage product="home" initialThreadId={threadId} />;
}

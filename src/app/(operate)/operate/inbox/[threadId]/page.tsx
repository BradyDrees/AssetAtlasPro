"use client";

import { use } from "react";
import { InboxPage } from "@/components/messaging/inbox-page";

export default function OperateInboxThreadPage({
  params,
}: {
  params: Promise<{ threadId: string }>;
}) {
  const { threadId } = use(params);
  return <InboxPage product="operate" initialThreadId={threadId} />;
}

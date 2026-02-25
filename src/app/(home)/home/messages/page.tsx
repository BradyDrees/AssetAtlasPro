import { getHomeThreads } from "@/app/actions/home-messages";
import { MessagesListContent } from "./messages-list-content";

export default async function MessagesPage() {
  const threads = await getHomeThreads();

  return <MessagesListContent threads={threads} />;
}

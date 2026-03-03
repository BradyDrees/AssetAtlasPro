"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  CallLog,
  CallStatus,
  CallDirection,
  InboxThread,
  Message,
  MessageThread,
  ParticipantRole,
  ThreadMessage,
  ThreadType,
  UserContact,
} from "@/lib/messaging/types";

// ============================================
// Helpers
// ============================================

function assertAuthed(userId: string | undefined | null): asserts userId is string {
  if (!userId) throw new Error("Unauthorized");
}

function previewFromBody(body: string | null): string | null {
  if (!body) return null;
  const trimmed = body.trim();
  if (!trimmed) return null;
  return trimmed.length > 120 ? `${trimmed.slice(0, 117)}...` : trimmed;
}

async function insertSystemMessage(threadId: string, body: string, senderId: string) {
  const supabase = await createClient();
  await supabase.from("messages").insert({
    thread_id: threadId,
    sender_id: senderId,
    message_type: "system",
    body,
    attachments: [],
    read_by: [senderId],
  });
}

// ============================================
// Thread Management
// ============================================

/** Create a DM thread between current user and a contact. Idempotent. */
export async function createDMThread(
  contactUserId: string
): Promise<{ thread_id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertAuthed(user?.id);
  const me = user.id;

  if (contactUserId === me) throw new Error("Cannot DM yourself");

  // Check for existing DM thread between exactly these 2 users
  const { data: myThreads } = await supabase
    .from("thread_participants")
    .select("thread_id")
    .eq("user_id", me);

  const myThreadIds = (myThreads ?? []).map((t) => t.thread_id);

  if (myThreadIds.length > 0) {
    // Find DM threads the contact is also in
    const { data: sharedThreads } = await supabase
      .from("thread_participants")
      .select("thread_id")
      .eq("user_id", contactUserId)
      .in("thread_id", myThreadIds);

    for (const st of sharedThreads ?? []) {
      // Verify it's a DM with exactly 2 participants
      const { data: thread } = await supabase
        .from("message_threads")
        .select("id, thread_type")
        .eq("id", st.thread_id)
        .eq("thread_type", "dm")
        .maybeSingle();

      if (thread) {
        const { count } = await supabase
          .from("thread_participants")
          .select("*", { count: "exact", head: true })
          .eq("thread_id", thread.id);

        if (count === 2) return { thread_id: thread.id };
      }
    }
  }

  // Create new DM thread
  const { data: newThread, error: tErr } = await supabase
    .from("message_threads")
    .insert({
      thread_type: "dm" as const,
      created_by: me,
      title: null,
      is_archived: false,
      is_muted: false,
    })
    .select("id")
    .single();

  if (tErr || !newThread) throw tErr || new Error("Failed to create thread");

  // Bootstrap: creator inserts self (uses bootstrap RLS policy)
  await supabase.from("thread_participants").insert({
    thread_id: newThread.id,
    user_id: me,
    role: "vendor" as ParticipantRole,
    added_by: me,
    is_muted: false,
    last_read_at: new Date().toISOString(),
  });

  // Add contact (now we're a participant, normal policy allows this)
  await supabase.from("thread_participants").insert({
    thread_id: newThread.id,
    user_id: contactUserId,
    role: "vendor" as ParticipantRole,
    added_by: me,
    is_muted: false,
    last_read_at: null,
  });

  await insertSystemMessage(newThread.id, "Conversation started", me);

  return { thread_id: newThread.id };
}

/**
 * Create a contextual thread (work_order, estimate, job).
 * Idempotent: returns existing thread if one already exists for this linked item.
 */
export async function createContextualThread(params: {
  thread_type: Exclude<ThreadType, "dm" | "group">;
  linked_item_id: string;
  participant_ids: string[];
  title?: string | null;
}): Promise<{ thread_id: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertAuthed(user?.id);
  const me = user.id;

  const { thread_type, linked_item_id, participant_ids } = params;

  // Determine FK column
  const fkCol =
    thread_type === "work_order"
      ? "work_order_id"
      : thread_type === "estimate"
        ? "estimate_id"
        : "job_id";

  // Check for existing thread (idempotent)
  const { data: existing } = await supabase
    .from("message_threads")
    .select("id")
    .eq("thread_type", thread_type)
    .eq(fkCol, linked_item_id)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return { thread_id: existing.id };

  // Create new thread
  const insertRow: Record<string, unknown> = {
    thread_type,
    created_by: me,
    title: params.title ?? null,
    is_archived: false,
    is_muted: false,
    [fkCol]: linked_item_id,
  };

  const { data: newThread, error: tErr } = await supabase
    .from("message_threads")
    .insert(insertRow)
    .select("id")
    .single();

  if (tErr || !newThread) throw tErr || new Error("Failed to create thread");

  // Bootstrap: creator inserts self
  await supabase.from("thread_participants").insert({
    thread_id: newThread.id,
    user_id: me,
    role: "pm" as ParticipantRole,
    added_by: me,
    is_muted: false,
    last_read_at: new Date().toISOString(),
  });

  // Add remaining participants (dedupe + skip self)
  const uniqueIds = Array.from(new Set(participant_ids)).filter(
    (id) => id && id !== me
  );

  for (const userId of uniqueIds) {
    const { error: pErr } = await supabase.from("thread_participants").insert({
      thread_id: newThread.id,
      user_id: userId,
      role: "vendor" as ParticipantRole,
      added_by: me,
      is_muted: false,
      last_read_at: null,
    });

    // Ignore duplicate key errors (idempotent)
    if (pErr && !String(pErr.message).toLowerCase().includes("duplicate")) {
      console.error("Failed to add participant:", pErr);
    }
  }

  await insertSystemMessage(
    newThread.id,
    `Conversation created for ${thread_type.replace("_", " ")}`,
    me
  );

  return { thread_id: newThread.id };
}

/** Add a participant to an existing thread. Any current participant can do this. */
export async function addParticipant(params: {
  thread_id: string;
  user_id: string;
  role: ParticipantRole;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  assertAuthed(user?.id);

  const { thread_id, user_id, role } = params;

  const { error } = await supabase.from("thread_participants").insert({
    thread_id,
    user_id,
    role,
    added_by: user.id,
    is_muted: false,
    last_read_at: null,
  });

  if (error) {
    if (String(error.message).toLowerCase().includes("duplicate")) {
      return {}; // Already a participant — idempotent
    }
    return { error: error.message };
  }

  await insertSystemMessage(thread_id, "User added to conversation", user.id);
  return {};
}

/** Get threads for inbox (paginated, sorted by last_message_at DESC). */
export async function getInboxThreads(params: {
  limit?: number;
  cursor?: string | null; // last_message_at ISO string for pagination
  filter?: "all" | "unread" | "archived";
}): Promise<{ data: InboxThread[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { data: [], error: "Not authenticated" };
  const me = user.id;

  const limit = params.limit ?? 20;
  const filter = params.filter ?? "all";

  // Get thread IDs the user participates in
  const { data: myParticipations, error: pErr } = await supabase
    .from("thread_participants")
    .select("thread_id, last_read_at")
    .eq("user_id", me);

  if (pErr) return { data: [], error: pErr.message };

  const threadIds = (myParticipations ?? []).map((p) => p.thread_id);
  if (threadIds.length === 0) return { data: [] };

  const readMap = new Map<string, string | null>();
  for (const p of myParticipations ?? []) {
    readMap.set(p.thread_id, p.last_read_at);
  }

  // Fetch threads
  let query = supabase
    .from("message_threads")
    .select("*")
    .in("id", threadIds)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit);

  if (filter === "archived") {
    query = query.eq("is_archived", true);
  } else {
    query = query.eq("is_archived", false);
  }

  if (params.cursor) {
    query = query.lt("last_message_at", params.cursor);
  }

  const { data: threads, error: tErr } = await query;
  if (tErr) return { data: [], error: tErr.message };

  if (!threads || threads.length === 0) return { data: [] };

  // Fetch participants for all threads
  const fetchedThreadIds = threads.map((t) => t.id);
  const { data: allParticipants } = await supabase
    .from("thread_participants")
    .select("thread_id, user_id, role")
    .in("thread_id", fetchedThreadIds);

  const partsByThread = new Map<string, Array<{ user_id: string; role: ParticipantRole }>>();
  for (const p of allParticipants ?? []) {
    const arr = partsByThread.get(p.thread_id) ?? [];
    arr.push({ user_id: p.user_id, role: p.role as ParticipantRole });
    partsByThread.set(p.thread_id, arr);
  }

  // Build inbox threads (flattened: MessageThread + participants + unread_count)
  const result: InboxThread[] = threads.map((t) => {
    const thread = t as MessageThread;
    const participants = (partsByThread.get(thread.id) ?? []).map((p) => ({
      ...p,
      display_name: null as string | null,
      avatar_url: null as string | null,
    }));
    const myLastRead = readMap.get(thread.id) ?? null;
    const hasUnread =
      thread.last_message_at &&
      (!myLastRead || new Date(thread.last_message_at) > new Date(myLastRead));

    return {
      ...thread,
      participants,
      unread_count: hasUnread ? 1 : 0,
    };
  });

  if (filter === "unread") {
    return { data: result.filter((r) => r.unread_count > 0) };
  }

  return { data: result };
}

/** Archive a thread (hides from inbox). */
export async function archiveThread(
  threadId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("message_threads")
    .update({ is_archived: true })
    .eq("id", threadId);

  if (error) return { error: error.message };
  return {};
}

/** Mute/unmute a thread (per-participant). */
export async function muteThread(
  threadId: string,
  muted: boolean
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("thread_participants")
    .update({ is_muted: muted })
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Messages
// ============================================

/** Send a text message to a thread. */
export async function sendMessage(params: {
  thread_id: string;
  body: string;
  attachments?: Array<{ url: string; type: string; name: string; size: number }>;
}): Promise<{ data?: Message; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const body = params.body?.trim();
  if (!body && (!params.attachments || params.attachments.length === 0)) {
    return { error: "Empty message" };
  }

  const { data: msg, error: mErr } = await supabase
    .from("messages")
    .insert({
      thread_id: params.thread_id,
      sender_id: user.id,
      message_type: params.attachments?.length ? "media" : "text",
      body: body || null,
      attachments: params.attachments ?? [],
      read_by: [user.id],
      is_deleted: false,
    })
    .select("*")
    .single();

  if (mErr) return { error: mErr.message };

  // Update thread metadata
  await supabase
    .from("message_threads")
    .update({
      last_message_preview: previewFromBody(msg.body),
      last_message_at: msg.created_at,
      last_message_by: user.id,
    })
    .eq("id", params.thread_id);

  return { data: msg as Message };
}

/** Get messages for a thread (paginated, newest first). */
export async function getThreadMessages(params: {
  thread_id: string;
  limit?: number;
  before?: string | null; // created_at ISO for pagination
}): Promise<{ data: ThreadMessage[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const limit = params.limit ?? 50;

  let query = supabase
    .from("messages")
    .select("*")
    .eq("thread_id", params.thread_id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.before) {
    query = query.lt("created_at", params.before);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  // Return as ThreadMessage with null sender metadata
  // (caller can enrich with participant data if needed)
  return {
    data: (data ?? []).map((m) => ({
      ...(m as Message),
      sender_name: null,
      sender_avatar_url: null,
      sender_role: null,
    })),
  };
}

/** Mark a thread as read (updates participant last_read_at). */
export async function markThreadRead(
  threadId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("thread_participants")
    .update({ last_read_at: new Date().toISOString() })
    .eq("thread_id", threadId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return {};
}

/** Edit a message (sender only, within 15 minutes). */
export async function editMessage(
  messageId: string,
  newBody: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: msg, error: mErr } = await supabase
    .from("messages")
    .select("sender_id, created_at")
    .eq("id", messageId)
    .single();

  if (mErr || !msg) return { error: mErr?.message || "Message not found" };
  if (msg.sender_id !== user.id) return { error: "Forbidden" };

  const createdAt = new Date(msg.created_at).getTime();
  const fifteenMin = 15 * 60 * 1000;
  if (Date.now() - createdAt > fifteenMin) return { error: "Edit window expired" };

  const body = newBody.trim();
  if (!body) return { error: "Empty body" };

  const { error } = await supabase
    .from("messages")
    .update({ body, edited_at: new Date().toISOString() })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return {};
}

/** Soft-delete a message (sender only). */
export async function deleteMessage(
  messageId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: msg, error: mErr } = await supabase
    .from("messages")
    .select("sender_id")
    .eq("id", messageId)
    .single();

  if (mErr || !msg) return { error: mErr?.message || "Message not found" };
  if (msg.sender_id !== user.id) return { error: "Forbidden" };

  const { error } = await supabase
    .from("messages")
    .update({ is_deleted: true, body: null })
    .eq("id", messageId);

  if (error) return { error: error.message };
  return {};
}

// ============================================
// Contacts
// ============================================

/** Get contact list for current user. */
export async function getContacts(): Promise<{
  data: UserContact[];
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const { data, error } = await supabase
    .from("user_contacts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_blocked", false)
    .order("updated_at", { ascending: false });

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as UserContact[] };
}

/** Search contacts by name or phone. */
export async function searchContacts(
  query: string
): Promise<{ data: UserContact[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const q = query.trim();
  if (!q) return { data: [] };

  const { data, error } = await supabase
    .from("user_contacts")
    .select("*")
    .eq("user_id", user.id)
    .eq("is_blocked", false)
    .or(`contact_name.ilike.%${q}%,contact_phone.ilike.%${q}%`)
    .limit(25);

  if (error) return { data: [], error: error.message };
  return { data: (data ?? []) as UserContact[] };
}

/** Block a contact. */
export async function blockContact(
  contactId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("user_contacts")
    .update({ is_blocked: true })
    .eq("user_id", user.id)
    .eq("contact_id", contactId);

  if (error) return { error: error.message };
  return {};
}

/**
 * Auto-populate contacts from work order parties.
 * Stub: resolve actual party user IDs from your WO schema when wiring.
 */
export async function syncContactsFromWorkOrder(
  workOrderId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // TODO: Resolve party user IDs from existing tables:
  // - PM user (from vendor_work_orders.pm_user_id)
  // - Vendor org users (from vendor_users where vendor_org_id matches)
  // - Homeowner user (if applicable)
  //
  // For each pair of users, insert bidirectional user_contacts rows
  // with relationship_source = 'work_order' and source_ref_id = workOrderId.
  //
  // Stub for Phase 1 — will be wired when auto-creation triggers are added.
  console.log(
    `[messaging] syncContactsFromWorkOrder stub called for WO: ${workOrderId}`
  );

  return {};
}

// ============================================
// Call Logs
// ============================================

/** Log a call (called after Twilio call ends). */
export async function logCall(params: {
  caller_id: string;
  callee_id: string;
  twilio_call_sid?: string | null;
  direction: CallDirection;
  status: CallStatus;
  duration_seconds?: number | null;
  started_at?: string | null;
  ended_at?: string | null;
  work_order_id?: string | null;
  thread_id?: string | null;
  voicemail_url?: string | null;
  voicemail_transcription?: string | null;
}): Promise<{ call_id?: string; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: call, error } = await supabase
    .from("call_logs")
    .insert({
      caller_id: params.caller_id,
      callee_id: params.callee_id,
      twilio_call_sid: params.twilio_call_sid ?? null,
      direction: params.direction,
      status: params.status,
      duration_seconds: params.duration_seconds ?? null,
      started_at: params.started_at ?? new Date().toISOString(),
      ended_at: params.ended_at ?? null,
      work_order_id: params.work_order_id ?? null,
      thread_id: params.thread_id ?? null,
      voicemail_url: params.voicemail_url ?? null,
      voicemail_transcription: params.voicemail_transcription ?? null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Insert a call_log message into the thread if provided
  if (params.thread_id) {
    await supabase.from("messages").insert({
      thread_id: params.thread_id,
      sender_id: params.caller_id,
      message_type: "call_log",
      body: null,
      attachments: [],
      read_by: [params.caller_id],
      call_duration_seconds: params.duration_seconds ?? null,
      call_notes: null,
      voicemail_transcription: params.voicemail_transcription ?? null,
    });

    await supabase
      .from("message_threads")
      .update({
        last_message_preview: "📞 Call",
        last_message_at: new Date().toISOString(),
        last_message_by: params.caller_id,
      })
      .eq("id", params.thread_id);
  }

  return { call_id: call.id };
}

/** Add post-call notes (either party, within 24 hours). */
export async function addCallNotes(params: {
  call_id: string;
  notes: string;
}): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const notes = params.notes.trim();
  if (!notes) return { error: "Empty notes" };

  const { error } = await supabase
    .from("call_logs")
    .update({
      notes,
      notes_added_by: user.id,
      notes_added_at: new Date().toISOString(),
    })
    .eq("id", params.call_id);

  if (error) return { error: error.message };
  return {};
}

/** Get call history (paginated). */
export async function getCallHistory(params: {
  limit?: number;
  cursor?: string | null; // started_at ISO for pagination
  work_order_id?: string | null;
  contact_id?: string | null;
}): Promise<{ data: CallLog[]; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { data: [], error: "Not authenticated" };

  const limit = params.limit ?? 20;

  let query = supabase
    .from("call_logs")
    .select("*")
    .order("started_at", { ascending: false })
    .limit(limit);

  if (params.work_order_id) {
    query = query.eq("work_order_id", params.work_order_id);
  }

  if (params.contact_id) {
    query = query.or(
      `caller_id.eq.${params.contact_id},callee_id.eq.${params.contact_id}`
    );
  }

  if (params.cursor) {
    query = query.lt("started_at", params.cursor);
  }

  const { data, error } = await query;
  if (error) return { data: [], error: error.message };

  // RLS already restricts to caller/callee = me
  return { data: (data ?? []) as CallLog[] };
}

// ============================================
// Unread Count (for nav badge)
// ============================================

/** Get total unread thread count for nav badge. */
export async function getUnreadInboxCount(): Promise<{
  count: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { count: 0, error: "Not authenticated" };

  // Get all non-muted participations
  const { data: participations, error: pErr } = await supabase
    .from("thread_participants")
    .select("thread_id, last_read_at, is_muted")
    .eq("user_id", user.id)
    .eq("is_muted", false);

  if (pErr) return { count: 0, error: pErr.message };
  if (!participations || participations.length === 0) return { count: 0 };

  const threadIds = participations.map((p) => p.thread_id);

  // Get threads that are not archived
  const { data: threads, error: tErr } = await supabase
    .from("message_threads")
    .select("id, last_message_at")
    .in("id", threadIds)
    .eq("is_archived", false);

  if (tErr) return { count: 0, error: tErr.message };

  const readMap = new Map<string, string | null>();
  for (const p of participations) {
    readMap.set(p.thread_id, p.last_read_at);
  }

  let unreadCount = 0;
  for (const t of threads ?? []) {
    const lastRead = readMap.get(t.id) ?? null;
    if (
      t.last_message_at &&
      (!lastRead || new Date(t.last_message_at) > new Date(lastRead))
    ) {
      unreadCount++;
    }
  }

  return { count: unreadCount };
}

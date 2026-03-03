// src/lib/messaging/types.ts

export type ThreadType = "work_order" | "estimate" | "job" | "dm" | "group";
export type MessageType = "text" | "media" | "system" | "call_log" | "voicemail";
export type ParticipantRole = "owner" | "pm" | "vendor" | "maintenance" | "homeowner";
export type ContactRelationshipSource = "work_order" | "organization" | "manual";

export type CallDirection = "inbound" | "outbound";
export type CallStatus =
  | "initiated"
  | "ringing"
  | "in_progress"
  | "completed"
  | "busy"
  | "no_answer"
  | "failed"
  | "canceled"
  | "voicemail";

export type MessageThread = {
  id: string;
  thread_type: ThreadType;

  work_order_id: string | null;
  estimate_id: string | null;
  job_id: string | null;

  title: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;

  last_message_preview: string | null;
  last_message_at: string | null;
  last_message_by: string | null;

  is_archived: boolean;
  is_muted: boolean;
};

export type ThreadParticipant = {
  id: string;
  thread_id: string;
  user_id: string;
  role: ParticipantRole;
  joined_at: string;
  added_by: string | null;
  is_muted: boolean;
  last_read_at: string | null;
};

export type MessageAttachment = {
  type: "image" | "file" | "video" | "audio";
  url: string;
  name?: string;
  size_bytes?: number;
  mime_type?: string;
  width?: number;
  height?: number;
};

export type Message = {
  id: string;
  thread_id: string;
  sender_id: string;

  message_type: MessageType;
  body: string | null;
  attachments: MessageAttachment[];
  read_by: string[]; // user_ids

  call_duration_seconds: number | null;
  call_notes: string | null;
  voicemail_transcription: string | null;

  created_at: string;
  edited_at: string | null;
  is_deleted: boolean;
};

export type UserContact = {
  id: string;
  user_id: string;
  contact_id: string;

  relationship_source: ContactRelationshipSource;
  source_ref_id: string | null;

  contact_name: string | null;
  contact_role: string | null;
  contact_phone: string | null;
  contact_avatar_url: string | null;

  is_blocked: boolean;
  is_muted: boolean;

  created_at: string;
  updated_at: string;
};

export type CallLog = {
  id: string;
  caller_id: string;
  callee_id: string;

  twilio_call_sid: string | null;
  direction: CallDirection;
  status: CallStatus;

  duration_seconds: number | null;
  started_at: string;
  ended_at: string | null;

  notes: string | null;
  notes_added_by: string | null;
  notes_added_at: string | null;

  work_order_id: string | null;
  thread_id: string | null;

  voicemail_url: string | null;
  voicemail_transcription: string | null;
};

export type PushSubscriptionRecord = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth_key: string;
  created_at: string;
};

/** Flattened thread for inbox display */
export type InboxThread = MessageThread & {
  participants: Array<{
    user_id: string;
    role: ParticipantRole;
    display_name?: string | null;
    avatar_url?: string | null;
  }>;
  unread_count: number;
};

/** Message with sender info for display */
export type ThreadMessage = Message & {
  sender_name?: string | null;
  sender_avatar_url?: string | null;
  sender_role?: ParticipantRole | null;
};

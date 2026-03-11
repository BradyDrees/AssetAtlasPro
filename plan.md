# Twilio Phone Masking — Implementation Plan

## What It Does
Vendors get a real business phone number (via Twilio) so techs can call/text tenants without exposing personal numbers. Each vendor org gets one number by default, can buy more. All SMS/call activity is logged and visible in a Messages hub.

---

## Phase 1: Database Migration (`009_twilio_phone_masking.sql`)

### New Tables

**`vendor_phone_numbers`** — Twilio numbers owned by the org
- `id`, `vendor_org_id`, `twilio_number` (E.164), `twilio_sid`, `friendly_name`, `is_default` (bool), `status` (active/released), `created_at`
- RLS: scoped to `vendor_org_id`

**`vendor_messages`** — SMS/call log
- `id`, `vendor_org_id`, `work_order_id` (nullable), `phone_number_id` (FK), `sender_user_id` (nullable — null for inbound), `direction` (inbound/outbound), `message_type` (sms/call), `from_number`, `to_number`, `body` (nullable for calls), `status` (sent/delivered/failed/received), `twilio_sid`, `duration_seconds` (for calls), `created_at`
- RLS: scoped to `vendor_org_id`

---

## Phase 2: Twilio Client + Server Actions

### `src/lib/vendor/twilio-client.ts`
- Initialize Twilio client from env vars (`TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`)
- Helper: `sendSMS(from, to, body)` → returns Twilio SID + status
- Helper: `purchaseNumber(areaCode?)` → buys a number, returns SID + number
- Helper: `releaseNumber(twilioSid)` → releases the number

### `src/app/actions/vendor-messages.ts`
- `purchasePhoneNumber(areaCode?)` — buys Twilio number, inserts into `vendor_phone_numbers`, org-scoped
- `getOrgPhoneNumbers()` — list org's Twilio numbers
- `releasePhoneNumber(phoneNumberId)` — look up from DB (never trust client), release via Twilio, mark released
- `sendSMS(workOrderId, body)` — look up org's default number + WO's tenant_phone, send via Twilio, log to `vendor_messages`
- `getMessages(workOrderId?)` — org-scoped message history, optionally filtered by WO
- `getMessageThread(workOrderId)` — messages for a specific job, ordered by created_at

### `src/app/api/twilio/sms/route.ts` (webhook)
- Receives inbound SMS from Twilio
- Matches `to_number` → `vendor_phone_numbers` → `vendor_org_id`
- Matches `from_number` → `vendor_work_orders.tenant_phone` → `work_order_id`
- Inserts into `vendor_messages` as inbound
- Returns TwiML `<Response/>` (no auto-reply)

### `src/app/api/twilio/voice/route.ts` (webhook)
- Receives inbound calls to the Twilio number
- Looks up vendor org's forwarding rules (could forward to office number or voicemail)
- Returns TwiML for call forwarding or voicemail
- Logs call to `vendor_messages`

---

## Phase 3: UI Components

### `src/components/vendor/message-thread.tsx`
- Chat-style SMS thread for a specific work order
- Shows inbound (left, gray) and outbound (right, brand) bubbles
- Text input at bottom with send button
- Auto-scrolls to latest message
- Shows tenant name + masked number at top

### `src/components/vendor/phone-number-manager.tsx`
- Shows org's Twilio numbers (in profile/settings)
- "Buy New Number" button with optional area code input
- Default number badge, ability to set default
- Release number (with confirmation)

### `src/app/(vendor)/vendor/messages/page.tsx`
- Messages inbox — list of recent conversations grouped by work order
- Each row: tenant name, property, last message preview, timestamp, unread badge
- Click → opens thread for that WO

### Job detail integration
- On `/vendor/jobs/[id]` page: add "Message Tenant" button when `tenant_phone` exists
- Opens inline message thread or links to `/vendor/messages?wo={id}`

---

## Phase 4: Sidebar + i18n

### Vendor sidebar
- Add "Messages" nav item with chat bubble icon after "Schedule"
- Route: `/vendor/messages`

### i18n keys (EN + ES)
- `vendor-messages.json` — ~30 keys for thread UI, phone manager, inbox

---

## Phase 5: Env Vars + Documentation

### `.env.local` additions (user configures later)
```
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WEBHOOK_URL=https://www.assetatlaspro.com/api/twilio
```

### Graceful degradation
- If `TWILIO_ACCOUNT_SID` is not set, all Twilio features show "Not configured" state
- Phone number purchase disabled, message send returns friendly error
- No crashes — feature just doesn't activate until credentials are added

---

## Build Order
1. Migration `009_twilio_phone_masking.sql`
2. `twilio-client.ts` + `vendor-messages.ts` server actions
3. API webhook routes (SMS + voice)
4. Phone number manager component (in profile/settings)
5. Message thread + inbox page
6. Job detail integration (Message Tenant button)
7. Sidebar nav + i18n
8. TypeScript check + push

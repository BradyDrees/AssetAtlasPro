/**
 * Domain Event Logger
 *
 * Centralized event system for audit trail, analytics, and cross-module coordination.
 * Every write path should emit a domain event through this module.
 *
 * Uses service-role client for writes (bypasses RLS).
 */
import { createServiceClient } from "@/lib/supabase/server";

// ============================================
// Types
// ============================================

/** Actor who triggered the event */
export type ActorType = "user" | "system" | "cron" | "webhook";

/** Module that originated the event */
export type OriginModule =
  | "operate"
  | "home"
  | "acquire"
  | "vendor"
  | "public"
  | "system";

/**
 * Minimum payload contract.
 * Every event payload MUST include `origin_module` and applicable context fields.
 */
export interface EventPayload {
  /** Always required */
  origin_module: OriginModule;
  /** Always when vendor-scoped */
  vendor_org_id?: string;
  /** Always when property-scoped */
  property_id?: string;
  /** Always when WO-scoped */
  work_order_id?: string;
  /** Required for status changes */
  previous_status?: string;
  /** Required for status changes */
  new_status?: string;
  /** When record is derived from another */
  source_type?: string;
  /** When record is derived from another */
  source_id?: string;
  /** Additional context (flexible) */
  [key: string]: unknown;
}

/** Actor info for the event */
export interface EventActor {
  id?: string;
  type: ActorType;
}

/** Known event types (extensible, but documented) */
export type EventType =
  | "work_order.created"
  | "work_order.status_changed"
  | "work_order.assigned"
  | "estimate.sent"
  | "estimate.approved"
  | "estimate.signed"
  | "estimate.declined"
  | "invoice.submitted"
  | "invoice.approved"
  | "invoice.paid"
  | "invoice.disputed"
  | "property.onboarded"
  | "maintenance.alert_created"
  | "bid.invited"
  | "bid.accepted"
  | "bid.declined"
  | "checklist.completed"
  | "dispatch.created"
  | "payment.pool_deducted"
  | "payment.stripe_session_created"
  | "payment.completed"
  | string; // Allow extension

/** Row shape for domain_events table */
export interface DomainEvent {
  id: string;
  event_type: string;
  entity_type: string;
  entity_id: string;
  actor_id: string | null;
  actor_type: string | null;
  origin_module: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

// ============================================
// Emit Event
// ============================================

/**
 * Emit a domain event.
 *
 * Non-blocking by default — callers should fire-and-forget for side effects.
 * For critical audit events, await the result.
 *
 * @param eventType - Dot-notation event type (e.g., 'work_order.status_changed')
 * @param entityType - Type of entity (e.g., 'work_order', 'estimate', 'property')
 * @param entityId - UUID of the entity
 * @param payload - Event payload (must include origin_module)
 * @param actor - Who triggered the event
 */
export async function emitEvent(
  eventType: EventType,
  entityType: string,
  entityId: string,
  payload: EventPayload,
  actor?: EventActor
): Promise<{ id: string } | null> {
  try {
    const supabase = createServiceClient();

    const { data, error } = await supabase
      .from("domain_events")
      .insert({
        event_type: eventType,
        entity_type: entityType,
        entity_id: entityId,
        actor_id: actor?.id ?? null,
        actor_type: actor?.type ?? null,
        origin_module: payload.origin_module ?? null,
        payload,
      })
      .select("id")
      .single();

    if (error) {
      console.error("[domain-events] Failed to emit event:", error.message, {
        eventType,
        entityType,
        entityId,
      });
      return null;
    }

    return data;
  } catch (err) {
    console.error(
      "[domain-events] Unexpected error:",
      err instanceof Error ? err.message : err
    );
    return null;
  }
}

// ============================================
// Query Helpers
// ============================================

/**
 * Get recent events for an entity.
 * Used by timeline/activity views.
 */
export async function getEntityEvents(
  entityType: string,
  entityId: string,
  limit = 20
): Promise<DomainEvent[]> {
  const supabase = createServiceClient();

  const { data, error } = await supabase
    .from("domain_events")
    .select("*")
    .eq("entity_type", entityType)
    .eq("entity_id", entityId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[domain-events] Failed to query events:", error.message);
    return [];
  }

  return (data ?? []) as DomainEvent[];
}

/**
 * Get events by type for a specific work order.
 */
export async function getWorkOrderEvents(
  workOrderId: string,
  limit = 20
): Promise<DomainEvent[]> {
  return getEntityEvents("work_order", workOrderId, limit);
}

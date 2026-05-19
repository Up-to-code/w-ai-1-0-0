import type { JsonObject, WhatsAppDeliveryStatus, WhatsAppInboundMessageType } from "../types.js";
import { isRecord, readArray, readRecord, readString, toJsonValue } from "../utils/guards.js";
import { parseTemplateStatusUpdate } from "../templates/service.js";
import type { TemplateStatusUpdate } from "../templates/types.js";
import type { InboundMessage, MessageStatusUpdate, WebhookChange, WebhookContact, WebhookMetadata } from "./types.js";

/** Extracts all changes across all webhook entries while preserving entry IDs. */
export function extractWebhookChanges(body: unknown): readonly WebhookChange[] {
  if (!isRecord(body)) return [];
  const entries = readArray(body, "entry");
  const changes: WebhookChange[] = [];
  for (const entry of entries) {
    if (!isRecord(entry)) continue;
    const entryId = readString(entry, "id");
    for (const change of readArray(entry, "changes")) {
      if (!isRecord(change)) continue;
      changes.push({
        field: readString(change, "field"),
        value: change.value,
        entryId,
      });
    }
  }
  return changes;
}

/** Normalizes business phone metadata from a webhook change value. */
export function parseWebhookMetadata(value: unknown, entryId?: string): WebhookMetadata {
  if (!isRecord(value)) return { businessAccountId: entryId };
  const metadata = readRecord(value, "metadata");
  return {
    phoneNumberId: metadata ? readString(metadata, "phone_number_id") : undefined,
    displayPhoneNumber: metadata ? readString(metadata, "display_phone_number") : undefined,
    businessAccountId: entryId,
  };
}

/** Extracts the first contact profile from a webhook value. */
export function parseWebhookContact(value: unknown): WebhookContact | undefined {
  if (!isRecord(value)) return undefined;
  const first = readArray(value, "contacts")[0];
  if (!isRecord(first)) return undefined;
  const waId = readString(first, "wa_id");
  if (!waId) return undefined;
  const profile = readRecord(first, "profile");
  return {
    waId,
    name: profile ? readString(profile, "name") : undefined,
  };
}

/** Parses every inbound message in a webhook value. */
export function parseInboundMessages(value: unknown): readonly InboundMessage[] {
  if (!isRecord(value)) return [];
  return readArray(value, "messages").map((message) => parseInboundMessage(message)).filter((message): message is InboundMessage => message !== null);
}

/** Parses every status update in a webhook value. */
export function parseStatusUpdates(value: unknown): readonly MessageStatusUpdate[] {
  if (!isRecord(value)) return [];
  return readArray(value, "statuses").map((status) => parseStatusUpdate(status)).filter((status): status is MessageStatusUpdate => status !== null);
}

/** Parses a template status update from a change field/value pair. */
export function parseTemplateStatusChange(field: string | undefined, value: unknown): TemplateStatusUpdate | null {
  if (field !== "message_template_status_update") return null;
  return parseTemplateStatusUpdate(value);
}

function parseInboundMessage(value: unknown): InboundMessage | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id");
  const from = readString(value, "from");
  if (!id || !from) return null;
  const type = normalizeInboundType(readString(value, "type"));
  const textRecord = readRecord(value, "text");
  const mediaRecord = readRecord(value, type);
  const raw = toJsonValue(value);
  if (!isRecord(raw)) return null;
  return {
    id,
    from,
    timestamp: parseTimestamp(readString(value, "timestamp")),
    type,
    text: textRecord ? readString(textRecord, "body") : undefined,
    mediaId: mediaRecord ? readString(mediaRecord, "id") : undefined,
    caption: mediaRecord ? readString(mediaRecord, "caption") : undefined,
    raw: raw as JsonObject,
  };
}

function parseStatusUpdate(value: unknown): MessageStatusUpdate | null {
  if (!isRecord(value)) return null;
  const id = readString(value, "id");
  if (!id) return null;
  const raw = toJsonValue(value);
  if (!isRecord(raw)) return null;
  return {
    id,
    recipientId: readString(value, "recipient_id"),
    status: normalizeDeliveryStatus(readString(value, "status")),
    timestamp: readString(value, "timestamp") ? parseTimestamp(readString(value, "timestamp")) : undefined,
    errors: readArray(value, "errors").map((error) => toJsonValue(error)).filter((error): error is JsonObject => isRecord(error)),
    raw: raw as JsonObject,
  };
}

/** Normalizes inbound message type names. */
export function normalizeInboundType(value: string | undefined): WhatsAppInboundMessageType {
  const type = value?.trim().toLowerCase();
  if (
    type === "text" ||
    type === "image" ||
    type === "video" ||
    type === "audio" ||
    type === "document" ||
    type === "voice" ||
    type === "sticker" ||
    type === "button" ||
    type === "interactive" ||
    type === "contacts" ||
    type === "location" ||
    type === "order" ||
    type === "system"
  ) {
    return type;
  }
  return "unknown";
}

/** Normalizes Meta delivery status strings. */
export function normalizeDeliveryStatus(value: string | undefined): WhatsAppDeliveryStatus {
  const status = value?.trim().toLowerCase();
  if (status === "sent" || status === "delivered" || status === "read" || status === "failed" || status === "deleted" || status === "warning") {
    return status;
  }
  return "unknown";
}

function parseTimestamp(value: string | undefined): number {
  const seconds = Number.parseInt(value ?? "", 10);
  return Number.isFinite(seconds) ? seconds * 1000 : Date.now();
}

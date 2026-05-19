import type { JsonObject, JsonValue, WhatsAppOutboundMessageType } from "../types.js";
import type { InteractiveMessage, MediaReference, ReplyContext, TemplateMessage } from "./types.js";

/** Base Cloud API message payload shared by every outbound message type. */
export interface BaseMessagePayload {
  readonly messaging_product: "whatsapp";
  readonly to: string;
  readonly type?: WhatsAppOutboundMessageType;
  readonly context?: { readonly message_id: string };
  readonly [key: string]: unknown;
}

/** Builds the root object for send-message payloads. */
export function buildBaseMessage(to: string, type: WhatsAppOutboundMessageType, reply?: ReplyContext): BaseMessagePayload {
  return {
    messaging_product: "whatsapp",
    to,
    type,
    context: reply ? { message_id: reply.messageId } : undefined,
  };
}

/** Builds a WhatsApp text message payload. */
export function buildTextMessage(to: string, body: string, reply?: ReplyContext, previewUrl = false): BaseMessagePayload {
  return {
    ...buildBaseMessage(to, "text", reply),
    text: { body, preview_url: previewUrl },
  };
}

/** Builds a WhatsApp media message payload for image, video, audio, or document. */
export function buildMediaMessage(
  to: string,
  type: "image" | "video" | "audio" | "document",
  media: MediaReference,
  reply?: ReplyContext,
): BaseMessagePayload {
  const content: Record<string, JsonValue> = {};
  if (media.id) content.id = media.id;
  if (media.link) content.link = media.link;
  if (media.caption && type !== "audio") content.caption = media.caption;
  if (media.filename && type === "document") content.filename = media.filename;
  return {
    ...buildBaseMessage(to, type, reply),
    [type]: content as JsonObject,
  };
}

/** Builds a WhatsApp template message payload. */
export function buildTemplateMessage(to: string, template: TemplateMessage, reply?: ReplyContext): BaseMessagePayload {
  return {
    ...buildBaseMessage(to, "template", reply),
    template: {
      name: template.name,
      language: {
        policy: template.language.policy ?? "deterministic",
        code: template.language.code,
      },
      ...(template.components ? { components: template.components } : {}),
    },
  };
}

/** Builds a WhatsApp reaction payload. */
export function buildReactionMessage(to: string, messageId: string, emoji: string): BaseMessagePayload {
  return {
    ...buildBaseMessage(to, "reaction"),
    reaction: { message_id: messageId, emoji },
  };
}

/** Builds a WhatsApp interactive message payload. */
export function buildInteractiveMessage(to: string, interactive: InteractiveMessage, reply?: ReplyContext): BaseMessagePayload {
  return {
    ...buildBaseMessage(to, "interactive", reply),
    interactive,
  };
}

/** Builds the Cloud API payload used to mark an inbound message as read. */
export function buildMarkReadPayload(messageId: string): JsonObject {
  return {
    messaging_product: "whatsapp",
    status: "read",
    message_id: messageId,
  };
}

import type { ActionsService } from "../actions/service.js";
import type { JsonObject, WhatsAppDeliveryStatus, WhatsAppInboundMessageType } from "../types.js";
import type { TemplateStatusUpdate } from "../templates/types.js";

/** One raw `entry.changes[]` item from a Meta webhook body. */
export interface WebhookChange {
  readonly field?: string;
  readonly value: unknown;
  readonly entryId?: string;
}

/** Business number metadata included in WhatsApp webhook values. */
export interface WebhookMetadata {
  readonly phoneNumberId?: string;
  readonly displayPhoneNumber?: string;
  readonly businessAccountId?: string;
}

/** Contact profile normalized from an inbound WhatsApp webhook. */
export interface WebhookContact {
  readonly waId: string;
  readonly name?: string;
}

/** Inbound WhatsApp message normalized from webhook payloads. */
export interface InboundMessage {
  readonly id: string;
  readonly from: string;
  readonly timestamp: number;
  readonly type: WhatsAppInboundMessageType;
  readonly text?: string;
  readonly mediaId?: string;
  readonly caption?: string;
  readonly raw: JsonObject;
}

/** Delivery/read/failure status normalized from status webhook payloads. */
export interface MessageStatusUpdate {
  readonly id: string;
  readonly recipientId?: string;
  readonly status: WhatsAppDeliveryStatus;
  readonly timestamp?: number;
  readonly errors?: readonly JsonObject[];
  readonly raw: JsonObject;
}

/** Context passed to `onMessage` handlers. */
export interface MessageWebhookContext {
  readonly message: InboundMessage;
  readonly contact?: WebhookContact;
  readonly metadata: WebhookMetadata;
  readonly actions: ActionsService;
  readonly raw: JsonObject;
}

/** Context passed to `onStatus` handlers. */
export interface StatusWebhookContext {
  readonly status: MessageStatusUpdate;
  readonly metadata: WebhookMetadata;
  readonly raw: JsonObject;
}

/** Context passed to `onTemplateStatus` handlers. */
export interface TemplateStatusWebhookContext {
  readonly template: TemplateStatusUpdate;
  readonly metadata: WebhookMetadata;
  readonly raw: JsonObject;
}

/** User callbacks invoked by the framework-agnostic webhook handler. */
export interface WebhookHandlers {
  /** Called for each inbound message. */
  onMessage?(context: MessageWebhookContext): Promise<void> | void;
  /** Called for each message status update. */
  onStatus?(context: StatusWebhookContext): Promise<void> | void;
  /** Called for each template status update. */
  onTemplateStatus?(context: TemplateStatusWebhookContext): Promise<void> | void;
  /** Called for a valid change that the package does not specifically handle. */
  onUnknown?(change: WebhookChange): Promise<void> | void;
}

/** Options that control webhook verification and default actions. */
export interface WebhookHandlerOptions {
  /** Automatically mark inbound messages as read after onMessage succeeds. */
  readonly autoMarkRead?: boolean;
}

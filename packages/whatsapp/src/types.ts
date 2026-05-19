/** JSON-compatible primitive value. */
export type JsonPrimitive = string | number | boolean | null;

/** JSON-compatible object value used for untrusted Meta payloads. */
export type JsonObject = { readonly [key: string]: JsonValue };

/** JSON-compatible value used at public boundaries. */
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

/** Fetch-compatible function accepted by the client for custom runtimes and tests. */
export type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

/** Small logger contract for library diagnostics without binding to a logging package. */
export interface WhatsAppLogger {
  /** Logs low-volume operational information. */
  info(message: string, context?: JsonValue): void;
  /** Logs warnings that do not necessarily fail the operation. */
  warn(message: string, context?: JsonValue): void;
  /** Logs failed operations or invalid input. */
  error(message: string, context?: JsonValue): void;
  /** Logs verbose debug details when the host application enables them. */
  debug?(message: string, context?: JsonValue): void;
}

/** Configuration for authenticating against Meta's WhatsApp Cloud API. */
export interface WhatsAppConfig {
  /** Meta user or system-user access token with WhatsApp permissions. */
  accessToken: string;
  /** Meta phone number ID used for sending messages and media uploads. */
  phoneNumberId: string;
  /** WhatsApp Business Account ID used for template management. */
  wabaId?: string;
  /** Meta app ID used for resumable template media uploads. */
  appId?: string;
  /** Meta app secret used for appsecret_proof and webhook signature verification. */
  appSecret?: string;
  /** Verify token expected by Meta during webhook setup. */
  verifyToken?: string;
  /** Graph API version. Defaults to the latest verified value at package creation time. */
  apiVersion?: string;
  /** Optional logger implementation. */
  logger?: WhatsAppLogger;
  /** Optional fetch implementation for tests, workers, or older runtimes. */
  fetch?: FetchLike;
  /** Disables appsecret_proof query signing when an app secret is configured. */
  disableAppSecretProof?: boolean;
}

/** Normalized Meta message status values emitted by webhooks. */
export type WhatsAppDeliveryStatus =
  | "sent"
  | "delivered"
  | "read"
  | "failed"
  | "deleted"
  | "warning"
  | "unknown";

/** Supported outbound message types for WhatsApp Cloud API sends. */
export type WhatsAppOutboundMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "template"
  | "interactive"
  | "reaction";

/** Supported inbound message type names commonly emitted by WhatsApp webhooks. */
export type WhatsAppInboundMessageType =
  | "text"
  | "image"
  | "video"
  | "audio"
  | "document"
  | "voice"
  | "sticker"
  | "button"
  | "interactive"
  | "contacts"
  | "location"
  | "order"
  | "system"
  | "unknown";

/** Template status values normalized from Meta template records and webhooks. */
export type WhatsAppTemplateStatus =
  | "APPROVED"
  | "REJECTED"
  | "PENDING"
  | "PAUSED"
  | "DISABLED"
  | "IN_APPEAL"
  | "UNKNOWN";

/** Error categories used by WhatsAppApiError and retry decisions. */
export type WhatsAppErrorCategory =
  | "AUTH_ERROR"
  | "RATE_LIMIT"
  | "INVALID_TEMPLATE"
  | "TEMPLATE_FORMAT"
  | "INVALID_PHONE"
  | "MEDIA_ERROR"
  | "NETWORK_ERROR"
  | "OTHER";

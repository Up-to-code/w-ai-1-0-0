import type { JsonValue, WhatsAppErrorCategory } from "./types.js";
import { isRecord, readRecord, readString, toJsonValue } from "./utils/guards.js";

/** Structured error thrown for unsuccessful Meta Graph API responses. */
export class WhatsAppApiError extends Error {
  /** HTTP response status returned by Meta or the network layer. */
  readonly status: number;
  /** Meta error code when present. */
  readonly code?: number;
  /** Meta error subcode when present. */
  readonly subcode?: number;
  /** Normalized operational category for retries and UX messages. */
  readonly category: WhatsAppErrorCategory;
  /** Whether the operation is safe to retry automatically. */
  readonly retryable: boolean;
  /** Original Meta error response body converted to safe JSON. */
  readonly details?: JsonValue;

  constructor(params: {
    message: string;
    status: number;
    code?: number;
    subcode?: number;
    category: WhatsAppErrorCategory;
    retryable: boolean;
    details?: JsonValue;
  }) {
    super(params.message);
    this.name = "WhatsAppApiError";
    this.status = params.status;
    this.code = params.code;
    this.subcode = params.subcode;
    this.category = params.category;
    this.retryable = params.retryable;
    this.details = params.details;
  }
}

/** Classifies Meta and transport failures into stable library categories. */
export function categorizeWhatsAppError(code: number | undefined, message: string, status = 0): {
  category: WhatsAppErrorCategory;
  retryable: boolean;
  suggestedAction: string;
} {
  const lower = message.toLowerCase();
  if (code === 190 || status === 401 || status === 403 || lower.includes("permission") || lower.includes("oauth")) {
    return {
      category: "AUTH_ERROR",
      retryable: false,
      suggestedAction: "Reconnect or replace the WhatsApp access token and confirm required permissions.",
    };
  }
  if (code === 80005 || code === 130429 || code === 368 || status === 429 || lower.includes("rate limit") || lower.includes("throttl")) {
    return {
      category: "RATE_LIMIT",
      retryable: true,
      suggestedAction: "Retry later with exponential backoff and a lower send rate.",
    };
  }
  if (code === 132001 || code === 132014 || code === 132015 || lower.includes("template does not exist")) {
    return {
      category: "INVALID_TEMPLATE",
      retryable: false,
      suggestedAction: "Sync templates and use an approved template name and language.",
    };
  }
  if (code === 132000 || code === 132012 || lower.includes("parameter") || lower.includes("format")) {
    return {
      category: "TEMPLATE_FORMAT",
      retryable: false,
      suggestedAction: "Ensure template parameters match the approved template components.",
    };
  }
  if (code === 131000 || code === 131001 || code === 131030 || lower.includes("recipient")) {
    return {
      category: "INVALID_PHONE",
      retryable: false,
      suggestedAction: "Verify the recipient phone number and WhatsApp opt-in status.",
    };
  }
  if (code === 131053 || lower.includes("media")) {
    return {
      category: "MEDIA_ERROR",
      retryable: false,
      suggestedAction: "Check media type, size, URL expiry, and upload method.",
    };
  }
  if (status >= 500 || code === 500 || code === 502 || code === 503) {
    return {
      category: "NETWORK_ERROR",
      retryable: true,
      suggestedAction: "Retry with backoff because Meta returned a temporary server error.",
    };
  }
  return {
    category: "OTHER",
    retryable: false,
    suggestedAction: "Inspect the Meta error details and request payload.",
  };
}

/** Converts a failed Graph API response body into WhatsAppApiError. */
export function errorFromMetaResponse(status: number, body: unknown): WhatsAppApiError {
  const root = isRecord(body) ? body : {};
  const metaError = readRecord(root, "error");
  const message = metaError ? readString(metaError, "message") ?? "WhatsApp API request failed" : "WhatsApp API request failed";
  const codeValue = metaError?.code;
  const subcodeValue = metaError?.error_subcode;
  const code = typeof codeValue === "number" ? codeValue : undefined;
  const subcode = typeof subcodeValue === "number" ? subcodeValue : undefined;
  const classification = categorizeWhatsAppError(code, message, status);
  return new WhatsAppApiError({
    message,
    status,
    code,
    subcode,
    category: classification.category,
    retryable: classification.retryable,
    details: toJsonValue(body),
  });
}

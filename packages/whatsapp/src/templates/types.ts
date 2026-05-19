import type { JsonObject, WhatsAppTemplateStatus } from "../types.js";

/** Template component definition accepted by Meta's template management API. */
export interface TemplateComponent {
  readonly type: string;
  readonly format?: string;
  readonly text?: string;
  readonly example?: JsonObject;
  readonly buttons?: readonly JsonObject[];
  readonly cards?: readonly JsonObject[];
}

/** Request for creating a WhatsApp message template. */
export interface CreateTemplateRequest {
  readonly name: string;
  readonly language: string;
  readonly category: "AUTHENTICATION" | "MARKETING" | "UTILITY" | string;
  readonly components: readonly TemplateComponent[];
  readonly allowCategoryChange?: boolean;
}

/** Request for updating an existing WhatsApp message template. */
export interface UpdateTemplateRequest {
  readonly category?: string;
  readonly components?: readonly TemplateComponent[];
}

/** Normalized template record returned by this package. */
export interface WhatsAppTemplateRecord {
  readonly id?: string;
  readonly name: string;
  readonly language: string;
  readonly category: string;
  readonly status: WhatsAppTemplateStatus;
  readonly components: readonly TemplateComponent[];
  readonly bodyText?: string;
}

/** Template status update parsed from webhook payloads. */
export interface TemplateStatusUpdate {
  readonly name: string;
  readonly language?: string;
  readonly event: WhatsAppTemplateStatus;
  readonly reason?: string;
  readonly raw: JsonObject;
}

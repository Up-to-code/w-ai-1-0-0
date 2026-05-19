import type { JsonObject, JsonValue } from "../types.js";

/** Common send response returned by WhatsApp Cloud API. */
export interface SendMessageResponse {
  readonly messaging_product?: string;
  readonly contacts?: readonly { readonly input?: string; readonly wa_id?: string }[];
  readonly messages?: readonly { readonly id: string; readonly message_status?: string }[];
}

/** Request context used to reply to an existing WhatsApp message. */
export interface ReplyContext {
  /** Meta message ID to reply to. */
  messageId: string;
}

/** Template language descriptor for message sends. */
export interface TemplateLanguage {
  /** Language code such as `en_US`, `ar`, or `es_MX`. */
  code: string;
  /** Meta language policy. Defaults to deterministic when omitted by callers. */
  policy?: "deterministic";
}

/** Template parameter value accepted by template component builders. */
export type TemplateParameter =
  | { readonly type: "text"; readonly text: string }
  | { readonly type: "currency"; readonly currency: JsonObject }
  | { readonly type: "date_time"; readonly date_time: JsonObject }
  | { readonly type: "image"; readonly image: { readonly id?: string; readonly link?: string } }
  | { readonly type: "video"; readonly video: { readonly id?: string; readonly link?: string } }
  | { readonly type: "document"; readonly document: { readonly id?: string; readonly link?: string; readonly filename?: string } }
  | { readonly type: string; readonly [key: string]: JsonValue };

/** Component object for a template message send. */
export interface TemplateMessageComponent {
  readonly type: "header" | "body" | "button" | "carousel" | string;
  readonly sub_type?: string;
  readonly index?: string;
  readonly parameters?: readonly TemplateParameter[];
  readonly cards?: readonly JsonObject[];
}

/** Template send payload content. */
export interface TemplateMessage {
  readonly name: string;
  readonly language: TemplateLanguage;
  readonly components?: readonly TemplateMessageComponent[];
}

/** Media reference for image, video, audio, and document sends. */
export interface MediaReference {
  readonly id?: string;
  readonly link?: string;
  readonly caption?: string;
  readonly filename?: string;
}

/** Interactive message content for advanced WhatsApp interactions. */
export interface InteractiveMessage {
  readonly type: string;
  readonly [key: string]: JsonValue;
}

import type { GraphClient } from "../client/graph-client.js";
import type { JsonObject, WhatsAppTemplateStatus } from "../types.js";
import { isRecord, normalizeLanguageCode, readArray, readString, toJsonValue } from "../utils/guards.js";
import type { CreateTemplateRequest, TemplateComponent, TemplateStatusUpdate, UpdateTemplateRequest, WhatsAppTemplateRecord } from "./types.js";

/** Template APIs for create, list, normalize, update, delete, and webhook status parsing. */
export class TemplatesService {
  constructor(private readonly graph: GraphClient) {}

  /** Creates a message template in the configured WhatsApp Business Account. */
  async createTemplate(request: CreateTemplateRequest): Promise<JsonObject> {
    const wabaId = this.requireWabaId();
    return this.graph.json<JsonObject>(`/${wabaId}/message_templates`, "POST", {
      name: request.name,
      language: request.language,
      category: request.category,
      allow_category_change: request.allowCategoryChange ?? true,
      components: request.components,
    });
  }

  /** Lists templates from Meta and normalizes their shape. */
  async listTemplates(options: { readonly limit?: number; readonly name?: string } = {}): Promise<readonly WhatsAppTemplateRecord[]> {
    const wabaId = this.requireWabaId();
    const data = await this.graph.request<{ readonly data?: readonly unknown[] }>(
      `/${wabaId}/message_templates`,
      { method: "GET" },
      { limit: options.limit ?? 100, name: options.name },
    );
    return (data.data ?? []).map((row) => normalizeTemplateRecord(row)).filter((row): row is WhatsAppTemplateRecord => row !== null);
  }

  /** Fetches the first template matching a given template name. */
  async getTemplateByName(name: string): Promise<WhatsAppTemplateRecord | null> {
    const rows = await this.listTemplates({ name });
    return rows[0] ?? null;
  }

  /** Updates an existing template by Meta template ID. */
  async updateTemplate(templateId: string, request: UpdateTemplateRequest): Promise<JsonObject> {
    return this.graph.json<JsonObject>(`/${templateId}`, "PATCH", {
      ...(request.category ? { category: request.category } : {}),
      ...(request.components ? { components: request.components } : {}),
    });
  }

  /** Deletes templates by name from the configured WhatsApp Business Account. */
  async deleteTemplate(name: string): Promise<JsonObject> {
    const wabaId = this.requireWabaId();
    return this.graph.json<JsonObject>(`/${wabaId}/message_templates`, "DELETE", undefined, { name });
  }

  /** Parses a Meta template status webhook change into a stable object. */
  parseStatusUpdate(value: unknown): TemplateStatusUpdate | null {
    return parseTemplateStatusUpdate(value);
  }

  private requireWabaId(): string {
    if (!this.graph.config.wabaId) {
      throw new Error("wabaId is required for template management.");
    }
    return this.graph.config.wabaId;
  }
}

/** Normalizes one raw template record returned by Meta. */
export function normalizeTemplateRecord(value: unknown): WhatsAppTemplateRecord | null {
  if (!isRecord(value)) return null;
  const name = readString(value, "name")?.trim();
  const language = readTemplateLanguage(value.language);
  if (!name || !language) return null;
  const components = readArray(value, "components").map((component) => normalizeTemplateComponent(component)).filter((component): component is TemplateComponent => component !== null);
  const category = readString(value, "category") ?? "MARKETING";
  return {
    id: readString(value, "id"),
    name,
    language,
    category,
    status: normalizeTemplateStatus(readString(value, "status")),
    components,
    bodyText: extractBodyText(components),
  };
}

/** Normalizes Meta template status strings and webhook event names. */
export function normalizeTemplateStatus(value: string | undefined): WhatsAppTemplateStatus {
  const status = (value ?? "").trim().toUpperCase();
  if (status === "APPROVED") return "APPROVED";
  if (status === "REJECTED") return "REJECTED";
  if (status === "PAUSED") return "PAUSED";
  if (status === "DISABLED") return "DISABLED";
  if (status === "IN_APPEAL") return "IN_APPEAL";
  if (status === "PENDING" || status === "PENDING_DELETION" || status === "FLAGGED") return "PENDING";
  return "UNKNOWN";
}

/** Parses template status webhook values emitted by Meta. */
export function parseTemplateStatusUpdate(value: unknown): TemplateStatusUpdate | null {
  if (!isRecord(value)) return null;
  const name = readString(value, "message_template_name") ?? readString(value, "name");
  const event = readString(value, "event") ?? readString(value, "status");
  if (!name || !event) return null;
  const json = toJsonValue(value);
  if (!isRecord(json)) return null;
  return {
    name,
    language: readString(value, "message_template_language") ?? readString(value, "language"),
    event: normalizeTemplateStatus(event),
    reason: readString(value, "reason"),
    raw: json as JsonObject,
  };
}

function normalizeTemplateComponent(value: unknown): TemplateComponent | null {
  if (!isRecord(value)) return null;
  const type = readString(value, "type");
  if (!type) return null;
  return {
    type,
    format: readString(value, "format"),
    text: readString(value, "text"),
    example: isRecord(value.example) ? toJsonValue(value.example) as JsonObject : undefined,
    buttons: readArray(value, "buttons").map((entry) => toJsonValue(entry)).filter((entry): entry is JsonObject => isRecord(entry)),
    cards: readArray(value, "cards").map((entry) => toJsonValue(entry)).filter((entry): entry is JsonObject => isRecord(entry)),
  };
}

function readTemplateLanguage(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (isRecord(value)) return readString(value, "code")?.trim() || null;
  return null;
}

function extractBodyText(components: readonly TemplateComponent[]): string | undefined {
  const body = components.find((component) => normalizeLanguageCode(component.type) === "body");
  return body?.text?.trim() || undefined;
}

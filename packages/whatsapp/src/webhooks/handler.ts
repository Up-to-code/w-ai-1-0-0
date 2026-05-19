import type { WhatsAppConfig } from "../types.js";
import { ActionsService } from "../actions/service.js";
import type { WhatsAppClient } from "../client/whatsapp-client.js";
import { verifyMetaSignature } from "../utils/crypto.js";
import { isRecord, toJsonValue } from "../utils/guards.js";
import {
  extractWebhookChanges,
  parseInboundMessages,
  parseStatusUpdates,
  parseTemplateStatusChange,
  parseWebhookContact,
  parseWebhookMetadata,
} from "./parser.js";
import type { WebhookHandlers, WebhookHandlerOptions } from "./types.js";

/** Framework-agnostic WhatsApp webhook handler for GET verification and POST events. */
export class WebhookService {
  constructor(private readonly client: WhatsAppClient) {}

  /** Creates a Request-to-Response handler suitable for Next.js route handlers, workers, and native fetch servers. */
  createHandler(handlers: WebhookHandlers, options: WebhookHandlerOptions = {}): (request: Request) => Promise<Response> {
    return async (request: Request): Promise<Response> => {
      if (request.method === "GET") return this.handleVerify(request);
      if (request.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      return this.handlePost(request, handlers, options);
    };
  }

  private async handleVerify(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");
    if (mode === "subscribe" && challenge && token && token === this.client.config.verifyToken) {
      return new Response(challenge, { status: 200 });
    }
    return new Response("Forbidden", { status: 403 });
  }

  private async handlePost(request: Request, handlers: WebhookHandlers, options: WebhookHandlerOptions): Promise<Response> {
    const rawBody = await request.text();
    const appSecret = this.client.config.appSecret;
    const signature = request.headers.get("x-hub-signature-256");
    if (appSecret && signature && !(await verifyMetaSignature(rawBody, signature, appSecret))) {
      return new Response("Unauthorized", { status: 401 });
    }
    let payload: unknown;
    try {
      payload = rawBody ? JSON.parse(rawBody) as unknown : {};
    } catch {
      return new Response("Bad Request: Invalid JSON", { status: 400 });
    }
    const changes = extractWebhookChanges(payload);
    for (const change of changes) {
      const metadata = parseWebhookMetadata(change.value, change.entryId);
      const template = parseTemplateStatusChange(change.field, change.value);
      if (template) {
        await handlers.onTemplateStatus?.({ template, metadata, raw: template.raw });
        continue;
      }
      const valueJson = toJsonValue(change.value);
      const raw = isRecord(valueJson) ? valueJson : {};
      const contact = parseWebhookContact(change.value);
      const statuses = parseStatusUpdates(change.value);
      for (const status of statuses) {
        await handlers.onStatus?.({ status, metadata, raw });
      }
      const messages = parseInboundMessages(change.value);
      for (const message of messages) {
        const actions = new ActionsService(this.client.messages).forInbound(message.from, message.id);
        await handlers.onMessage?.({ message, contact, metadata, actions, raw });
        if (options.autoMarkRead) {
          await actions.markRead();
        }
      }
      if (messages.length === 0 && statuses.length === 0) {
        await handlers.onUnknown?.(change);
      }
    }
    return new Response("OK", { status: 200 });
  }
}

import { ActionsService } from "../actions/service.js";
import { CampaignsService } from "../campaigns/service.js";
import type { ResolvedWhatsAppConfig } from "./graph-client.js";
import { GraphClient } from "./graph-client.js";
import { MediaService } from "../media/service.js";
import { MessagesService } from "../messages/service.js";
import { TemplatesService } from "../templates/service.js";
import type { WhatsAppConfig } from "../types.js";
import { WebhookService } from "../webhooks/handler.js";
import type { WebhookHandlers, WebhookHandlerOptions } from "../webhooks/types.js";

/** Main entry point for WhatsApp Cloud API messages, media, templates, webhooks, actions, and campaigns. */
export class WhatsAppClient {
  /** Low-level authenticated Graph API client. */
  readonly graph: GraphClient;
  /** Normalized immutable client configuration. */
  readonly config: ResolvedWhatsAppConfig;
  /** Message sending and mark-read service. */
  readonly messages: MessagesService;
  /** Media upload/download service. */
  readonly media: MediaService;
  /** Template management service. */
  readonly templates: TemplatesService;
  /** Webhook verification and dispatch service. */
  readonly webhooks: WebhookService;
  /** High-level action helpers. */
  readonly actions: ActionsService;
  /** Campaign planning and execution helpers. */
  readonly campaigns: CampaignsService;

  constructor(config: WhatsAppConfig) {
    this.graph = new GraphClient(config);
    this.config = this.graph.config;
    this.messages = new MessagesService(this.graph);
    this.media = new MediaService(this.graph);
    this.templates = new TemplatesService(this.graph);
    this.webhooks = new WebhookService(this);
    this.actions = new ActionsService(this.messages);
    this.campaigns = new CampaignsService(this.messages);
  }
}

/** Creates a configured WhatsApp client. */
export function createWhatsAppClient(config: WhatsAppConfig): WhatsAppClient {
  return new WhatsAppClient(config);
}

/** Creates a standalone WhatsApp webhook handler without manually constructing a client. */
export function createWebhookHandler(config: WhatsAppConfig, handlers: WebhookHandlers, options?: WebhookHandlerOptions): (request: Request) => Promise<Response> {
  return new WhatsAppClient(config).webhooks.createHandler(handlers, options);
}

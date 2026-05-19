import type { GraphClient } from "../client/graph-client.js";
import type { JsonObject } from "../types.js";
import { normalizePhoneNumber } from "../utils/guards.js";
import {
  buildInteractiveMessage,
  buildMarkReadPayload,
  buildMediaMessage,
  buildReactionMessage,
  buildTemplateMessage,
  buildTextMessage,
  type BaseMessagePayload,
} from "./builders.js";
import type { InteractiveMessage, MediaReference, ReplyContext, SendMessageResponse, TemplateMessage } from "./types.js";

/** Sends typed WhatsApp messages through the Cloud API `/messages` endpoint. */
export class MessagesService {
  constructor(private readonly graph: GraphClient) {}

  /** Sends a pre-built message payload to the configured phone number. */
  async send(payload: BaseMessagePayload): Promise<SendMessageResponse> {
    return this.graph.json<SendMessageResponse>(`/${this.graph.config.phoneNumberId}/messages`, "POST", payload);
  }

  /** Sends a text message, optionally as a reply to an inbound message. */
  async sendText(to: string, body: string, options: { readonly reply?: ReplyContext; readonly previewUrl?: boolean } = {}): Promise<SendMessageResponse> {
    return this.send(buildTextMessage(normalizePhoneNumber(to), body, options.reply, options.previewUrl ?? false));
  }

  /** Sends an image message by media ID or public URL. */
  async sendImage(to: string, image: MediaReference, options: { readonly reply?: ReplyContext } = {}): Promise<SendMessageResponse> {
    return this.send(buildMediaMessage(normalizePhoneNumber(to), "image", image, options.reply));
  }

  /** Sends a video message by media ID or public URL. */
  async sendVideo(to: string, video: MediaReference, options: { readonly reply?: ReplyContext } = {}): Promise<SendMessageResponse> {
    return this.send(buildMediaMessage(normalizePhoneNumber(to), "video", video, options.reply));
  }

  /** Sends an audio message by media ID or public URL. */
  async sendAudio(to: string, audio: MediaReference, options: { readonly reply?: ReplyContext } = {}): Promise<SendMessageResponse> {
    return this.send(buildMediaMessage(normalizePhoneNumber(to), "audio", audio, options.reply));
  }

  /** Sends a document message by media ID or public URL. */
  async sendDocument(to: string, document: MediaReference, options: { readonly reply?: ReplyContext } = {}): Promise<SendMessageResponse> {
    return this.send(buildMediaMessage(normalizePhoneNumber(to), "document", document, options.reply));
  }

  /** Sends an approved WhatsApp template message. */
  async sendTemplate(to: string, template: TemplateMessage, options: { readonly reply?: ReplyContext } = {}): Promise<SendMessageResponse> {
    return this.send(buildTemplateMessage(normalizePhoneNumber(to), template, options.reply));
  }

  /** Sends a reaction emoji to an existing WhatsApp message. */
  async react(to: string, messageId: string, emoji: string): Promise<SendMessageResponse> {
    return this.send(buildReactionMessage(normalizePhoneNumber(to), messageId, emoji));
  }

  /** Sends an interactive WhatsApp message payload. */
  async sendInteractive(to: string, interactive: InteractiveMessage, options: { readonly reply?: ReplyContext } = {}): Promise<SendMessageResponse> {
    return this.send(buildInteractiveMessage(normalizePhoneNumber(to), interactive, options.reply));
  }

  /** Marks an inbound WhatsApp message as read. */
  async markRead(messageId: string): Promise<JsonObject> {
    return this.graph.json<JsonObject>(`/${this.graph.config.phoneNumberId}/messages`, "POST", buildMarkReadPayload(messageId));
  }
}

import type { MediaReference, ReplyContext, SendMessageResponse, TemplateMessage } from "../messages/types.js";
import type { MessagesService } from "../messages/service.js";

/** High-level helper actions intended for webhook handlers and app workflows. */
export class ActionsService {
  constructor(
    private readonly messages: MessagesService,
    private readonly recipient?: string,
    private readonly inboundMessageId?: string,
  ) {}

  /** Creates an action helper bound to an inbound webhook message. */
  forInbound(recipient: string, inboundMessageId: string): ActionsService {
    return new ActionsService(this.messages, recipient, inboundMessageId);
  }

  /** Replies with text to the bound inbound message, or sends text when no inbound context exists. */
  async reply(text: string, recipient = this.requireRecipient()): Promise<SendMessageResponse> {
    return this.messages.sendText(recipient, text, { reply: this.replyContext() });
  }

  /** Replies with an image by media ID or public link. */
  async replyWithImage(image: MediaReference, recipient = this.requireRecipient()): Promise<SendMessageResponse> {
    return this.messages.sendImage(recipient, image, { reply: this.replyContext() });
  }

  /** Replies with a document/file by media ID or public link. */
  async replyWithFile(document: MediaReference, recipient = this.requireRecipient()): Promise<SendMessageResponse> {
    return this.messages.sendDocument(recipient, document, { reply: this.replyContext() });
  }

  /** Sends an approved template message to the selected recipient. */
  async sendTemplate(template: TemplateMessage, recipient = this.requireRecipient()): Promise<SendMessageResponse> {
    return this.messages.sendTemplate(recipient, template);
  }

  /** Marks the bound inbound message as read. */
  async markRead(messageId = this.requireInboundMessageId()): Promise<unknown> {
    return this.messages.markRead(messageId);
  }

  /** Reacts to the bound inbound message with an emoji. */
  async react(emoji: string, recipient = this.requireRecipient(), messageId = this.requireInboundMessageId()): Promise<SendMessageResponse> {
    return this.messages.react(recipient, messageId, emoji);
  }

  private replyContext(): ReplyContext | undefined {
    return this.inboundMessageId ? { messageId: this.inboundMessageId } : undefined;
  }

  private requireRecipient(): string {
    if (!this.recipient) throw new Error("A recipient is required for this action.");
    return this.recipient;
  }

  private requireInboundMessageId(): string {
    if (!this.inboundMessageId) throw new Error("An inbound message id is required for this action.");
    return this.inboundMessageId;
  }
}

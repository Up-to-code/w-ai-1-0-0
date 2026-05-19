import type { SendMessageResponse, TemplateMessage } from "../messages/types.js";

/** Recipient data needed by the campaign planner. */
export interface CampaignRecipient {
  readonly id: string;
  readonly phone: string;
  readonly lastContactedAt?: number;
  readonly metadata?: Record<string, unknown>;
}

/** Campaign rate and suppression rules. */
export interface CampaignRules {
  readonly messagesPerSecond?: number;
  readonly delayBetweenMessagesMs?: number;
  readonly maxRetries?: number;
  readonly skipRecentlyContacted?: boolean;
  readonly recentContactWindowMs?: number;
  readonly testBypassRecipientIds?: readonly string[];
}

/** Input for creating a campaign execution plan. */
export interface CreateCampaignPlanInput {
  readonly id?: string;
  readonly template: TemplateMessage;
  readonly recipients: readonly CampaignRecipient[];
  readonly scheduledAt?: number;
  readonly recurrence?: string;
  readonly rules?: CampaignRules;
  readonly now?: number;
}

/** One send decision in a campaign plan. */
export interface CampaignPlanItem {
  readonly recipient: CampaignRecipient;
  readonly status: "pending" | "skipped";
  readonly skipReason?: "recently_contacted";
  readonly scheduledAt: number;
}

/** Campaign execution plan created without side effects. */
export interface CampaignPlan {
  readonly id: string;
  readonly template: TemplateMessage;
  readonly items: readonly CampaignPlanItem[];
  readonly rules: Required<CampaignRules>;
  readonly scheduledAt: number;
  readonly recurrence?: string;
}

/** Result logged after one recipient is processed. */
export interface CampaignSendResult {
  readonly recipientId: string;
  readonly status: "sent" | "failed" | "skipped";
  readonly metaMessageId?: string;
  readonly error?: string;
  readonly skipReason?: string;
}

/** Adapters used by campaign execution so hosts can bring their own database or queue. */
export interface CampaignRunAdapters {
  /** Sends the template to one recipient. */
  sendTemplate(recipient: CampaignRecipient, template: TemplateMessage): Promise<SendMessageResponse>;
  /** Persists a campaign result in the host application. */
  logResult?(result: CampaignSendResult): Promise<void> | void;
  /** Marks a recipient as contacted after a successful send. */
  markContacted?(recipient: CampaignRecipient, timestamp: number): Promise<void> | void;
  /** Waits between sends; defaults to setTimeout. */
  wait?(milliseconds: number): Promise<void>;
}

/** Summary returned by campaign execution. */
export interface CampaignRunSummary {
  readonly sent: number;
  readonly failed: number;
  readonly skipped: number;
  readonly results: readonly CampaignSendResult[];
}

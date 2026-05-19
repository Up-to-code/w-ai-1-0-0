import { WhatsAppApiError } from "../errors.js";
import type { MessagesService } from "../messages/service.js";
import type {
  CampaignPlan,
  CampaignRunAdapters,
  CampaignRunSummary,
  CampaignRules,
  CampaignSendResult,
  CreateCampaignPlanInput,
} from "./types.js";

const DEFAULT_RULES: Required<CampaignRules> = {
  messagesPerSecond: 10,
  delayBetweenMessagesMs: 100,
  maxRetries: 3,
  skipRecentlyContacted: true,
  recentContactWindowMs: 24 * 60 * 60 * 1000,
  testBypassRecipientIds: [],
};

/** Campaign planning and execution helpers with bring-your-own persistence. */
export class CampaignsService {
  constructor(private readonly messages: MessagesService) {}

  /** Creates a side-effect-free plan with recent-contact suppression decisions. */
  createPlan(input: CreateCampaignPlanInput): CampaignPlan {
    const now = input.now ?? Date.now();
    const rules = { ...DEFAULT_RULES, ...(input.rules ?? {}) };
    const scheduledAt = input.scheduledAt ?? now;
    const bypass = new Set(rules.testBypassRecipientIds);
    const items = input.recipients.map((recipient) => {
      const recentlyContacted =
        rules.skipRecentlyContacted &&
        !bypass.has(recipient.id) &&
        recipient.lastContactedAt !== undefined &&
        now - recipient.lastContactedAt < rules.recentContactWindowMs;
      return {
        recipient,
        status: recentlyContacted ? "skipped" as const : "pending" as const,
        skipReason: recentlyContacted ? "recently_contacted" as const : undefined,
        scheduledAt,
      };
    });
    return {
      id: input.id ?? `campaign_${now}`,
      template: input.template,
      items,
      rules,
      scheduledAt,
      recurrence: input.recurrence,
    };
  }

  /** Runs a campaign plan immediately through host-provided adapters. */
  async run(plan: CampaignPlan, adapters?: Partial<CampaignRunAdapters>): Promise<CampaignRunSummary> {
    const results: CampaignSendResult[] = [];
    const wait = adapters?.wait ?? defaultWait;
    const delay = plan.rules.delayBetweenMessagesMs || Math.ceil(1000 / Math.max(plan.rules.messagesPerSecond, 1));
    for (const item of plan.items) {
      if (item.status === "skipped") {
        const skipped = {
          recipientId: item.recipient.id,
          status: "skipped" as const,
          skipReason: item.skipReason,
        };
        results.push(skipped);
        await adapters?.logResult?.(skipped);
        continue;
      }
      const result = await this.sendWithRetries(item.recipient, plan.template, plan.rules.maxRetries, adapters);
      results.push(result);
      await adapters?.logResult?.(result);
      if (result.status === "sent") {
        await adapters?.markContacted?.(item.recipient, Date.now());
      }
      if (delay > 0) {
        await wait(delay);
      }
    }
    return summarize(results);
  }

  private async sendWithRetries(
    recipient: CampaignPlan["items"][number]["recipient"],
    template: CampaignPlan["template"],
    maxRetries: number,
    adapters?: Partial<CampaignRunAdapters>,
  ): Promise<CampaignSendResult> {
    let attempt = 0;
    let lastError = "";
    while (attempt < Math.max(maxRetries, 1)) {
      attempt += 1;
      try {
        const send = adapters?.sendTemplate ?? ((target, selectedTemplate) => this.messages.sendTemplate(target.phone, selectedTemplate));
        const response = await send(recipient, template);
        return {
          recipientId: recipient.id,
          status: "sent",
          metaMessageId: response.messages?.[0]?.id,
        };
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        if (!(error instanceof WhatsAppApiError) || !error.retryable || attempt >= maxRetries) {
          break;
        }
        await (adapters?.wait ?? defaultWait)(Math.min(30_000, 500 * 2 ** (attempt - 1)));
      }
    }
    return {
      recipientId: recipient.id,
      status: "failed",
      error: lastError || "Failed to send campaign message.",
    };
  }
}

function summarize(results: readonly CampaignSendResult[]): CampaignRunSummary {
  return {
    sent: results.filter((result) => result.status === "sent").length,
    failed: results.filter((result) => result.status === "failed").length,
    skipped: results.filter((result) => result.status === "skipped").length,
    results,
  };
}

function defaultWait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, milliseconds);
  });
}

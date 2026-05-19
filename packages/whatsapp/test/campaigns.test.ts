import { describe, expect, it, vi } from "vitest";
import { CampaignsService, WhatsAppClient } from "../src/index.js";
import type { FetchLike } from "../src/index.js";

const template = {
  name: "hello_world",
  language: { code: "en_US" },
};

describe("campaigns", () => {
  it("skips recently contacted recipients unless bypassed", () => {
    const client = new WhatsAppClient({ accessToken: "token", phoneNumberId: "123", fetch: vi.fn<FetchLike>() });
    const now = 1_700_000_000_000;
    const plan = client.campaigns.createPlan({
      template,
      now,
      recipients: [
        { id: "recent", phone: "1", lastContactedAt: now - 60_000 },
        { id: "old", phone: "2", lastContactedAt: now - 48 * 60 * 60 * 1000 },
        { id: "bypass", phone: "3", lastContactedAt: now - 60_000 },
      ],
      rules: { testBypassRecipientIds: ["bypass"] },
    });
    expect(plan.items.map((item) => [item.recipient.id, item.status, item.skipReason])).toEqual([
      ["recent", "skipped", "recently_contacted"],
      ["old", "pending", undefined],
      ["bypass", "pending", undefined],
    ]);
  });

  it("runs campaign with adapters and logs summary", async () => {
    const service = new CampaignsService(new WhatsAppClient({ accessToken: "token", phoneNumberId: "123", fetch: vi.fn<FetchLike>() }).messages);
    const plan = service.createPlan({
      template,
      now: 1,
      recipients: [{ id: "1", phone: "201234567890" }],
      rules: { delayBetweenMessagesMs: 0 },
    });
    const logResult = vi.fn();
    const markContacted = vi.fn();
    const summary = await service.run(plan, {
      wait: vi.fn(),
      logResult,
      markContacted,
      sendTemplate: vi.fn(async () => ({ messages: [{ id: "wamid.1" }] })),
    });
    expect(summary).toMatchObject({ sent: 1, failed: 0, skipped: 0 });
    expect(logResult).toHaveBeenCalledWith(expect.objectContaining({ status: "sent", metaMessageId: "wamid.1" }));
    expect(markContacted).toHaveBeenCalled();
  });
});

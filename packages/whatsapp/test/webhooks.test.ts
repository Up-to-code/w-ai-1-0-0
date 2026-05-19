import { describe, expect, it, vi } from "vitest";
import {
  createWebhookHandler,
  extractWebhookChanges,
  parseInboundMessages,
  parseStatusUpdates,
  parseTemplateStatusChange,
  verifyMetaSignature,
} from "../src/index.js";
import { hmacSha256Hex } from "../src/utils/crypto.js";
import type { FetchLike } from "../src/index.js";

const baseConfig = {
  accessToken: "token",
  phoneNumberId: "123",
  verifyToken: "verify",
  fetch: vi.fn<FetchLike>(async () => new Response(JSON.stringify({ messages: [{ id: "wamid.out" }] }), { status: 200 })),
};

describe("webhook parsing", () => {
  it("extracts multi-entry and status-only changes", () => {
    const changes = extractWebhookChanges({
      entry: [
        { id: "waba-1", changes: [{ field: "messages", value: { messages: [{ id: "a" }] } }] },
        { id: "waba-2", changes: [{ field: "messages", value: { statuses: [{ id: "b", status: "read" }] } }] },
      ],
    });
    expect(changes).toHaveLength(2);
    expect(changes[1]?.entryId).toBe("waba-2");
  });

  it("returns empty arrays for malformed payloads", () => {
    expect(extractWebhookChanges({ entry: null })).toEqual([]);
    expect(parseInboundMessages(undefined)).toEqual([]);
    expect(parseStatusUpdates({ statuses: "bad" })).toEqual([]);
  });

  it("parses inbound media and status updates", () => {
    const value = {
      messages: [
        {
          id: "wamid.1",
          from: "201234567890",
          timestamp: "1710000000",
          type: "image",
          image: { id: "media-1", caption: "hello" },
        },
      ],
      statuses: [{ id: "wamid.2", recipient_id: "201234567890", status: "delivered", timestamp: "1710000001" }],
    };
    expect(parseInboundMessages(value)[0]).toMatchObject({ id: "wamid.1", type: "image", mediaId: "media-1", caption: "hello" });
    expect(parseStatusUpdates(value)[0]).toMatchObject({ id: "wamid.2", status: "delivered" });
  });

  it("parses template status update changes", () => {
    expect(parseTemplateStatusChange("message_template_status_update", {
      message_template_name: "hello",
      event: "APPROVED",
      reason: "ok",
    })).toMatchObject({ name: "hello", event: "APPROVED" });
  });
});

describe("webhook handler", () => {
  it("verifies GET challenge", async () => {
    const handler = createWebhookHandler(baseConfig, {});
    const response = await handler(new Request("https://example.com/webhook?hub.mode=subscribe&hub.verify_token=verify&hub.challenge=abc"));
    expect(response.status).toBe(200);
    expect(await response.text()).toBe("abc");
  });

  it("dispatches inbound messages and status callbacks", async () => {
    const onMessage = vi.fn();
    const onStatus = vi.fn();
    const handler = createWebhookHandler(baseConfig, { onMessage, onStatus });
    const response = await handler(new Request("https://example.com/webhook", {
      method: "POST",
      body: JSON.stringify({
        entry: [{
          id: "waba",
          changes: [{
            field: "messages",
            value: {
              metadata: { phone_number_id: "123" },
              contacts: [{ wa_id: "201234567890", profile: { name: "Ahmed" } }],
              messages: [{ id: "wamid.in", from: "201234567890", timestamp: "1710000000", type: "text", text: { body: "hi" } }],
              statuses: [{ id: "wamid.out", status: "read" }],
            },
          }],
        }],
      }),
    }));
    expect(response.status).toBe(200);
    expect(onMessage).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.objectContaining({ text: "hi" }),
      contact: expect.objectContaining({ name: "Ahmed" }),
    }));
    expect(onStatus).toHaveBeenCalledWith(expect.objectContaining({
      status: expect.objectContaining({ status: "read" }),
    }));
  });

  it("rejects invalid signatures", async () => {
    const handler = createWebhookHandler({ ...baseConfig, appSecret: "secret" }, {});
    const response = await handler(new Request("https://example.com/webhook", {
      method: "POST",
      headers: { "x-hub-signature-256": "sha256=bad" },
      body: "{}",
    }));
    expect(response.status).toBe(401);
  });

  it("verifies valid signatures", async () => {
    const signature = `sha256=${await hmacSha256Hex("secret", "{}")}`;
    await expect(verifyMetaSignature("{}", signature, "secret")).resolves.toBe(true);
  });
});

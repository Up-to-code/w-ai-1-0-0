import { describe, expect, it, vi } from "vitest";
import { WhatsAppApiError, WhatsAppClient, categorizeWhatsAppError } from "../src/index.js";
import type { FetchLike } from "../src/index.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

describe("client services", () => {
  it("sends text through the messages endpoint", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({ messages: [{ id: "wamid.1" }] }));
    const client = new WhatsAppClient({ accessToken: "token", phoneNumberId: "123", fetch });
    const result = await client.messages.sendText("+20 123 456 7890", "hello");
    expect(result.messages?.[0]?.id).toBe("wamid.1");
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.method).toBe("POST");
    expect(JSON.parse(String(request?.body))).toMatchObject({ to: "+201234567890", type: "text" });
  });

  it("uploads media with multipart form data", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({ id: "media-1" }));
    const client = new WhatsAppClient({ accessToken: "token", phoneNumberId: "123", fetch });
    const result = await client.media.uploadMedia(new Blob(["x"], { type: "image/jpeg" }), "image/jpeg", "x.jpg");
    expect(result.id).toBe("media-1");
    expect(fetch.mock.calls[0]?.[1]?.body).toBeInstanceOf(FormData);
  });

  it("creates, lists, updates, and deletes templates", async () => {
    const fetch = vi.fn<FetchLike>(async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input);
      if (init?.method === "GET" && url.includes("message_templates")) {
        return jsonResponse({ data: [{ id: "tpl-1", name: "hello", language: "en_US", status: "APPROVED", category: "UTILITY", components: [{ type: "BODY", text: "Hello" }] }] });
      }
      return jsonResponse({ success: true, id: "tpl-1" });
    });
    const client = new WhatsAppClient({ accessToken: "token", phoneNumberId: "123", wabaId: "waba", fetch });
    await expect(client.templates.createTemplate({ name: "hello", language: "en_US", category: "UTILITY", components: [{ type: "BODY", text: "Hello" }] })).resolves.toMatchObject({ id: "tpl-1" });
    await expect(client.templates.listTemplates()).resolves.toEqual([expect.objectContaining({ name: "hello", status: "APPROVED", bodyText: "Hello" })]);
    await expect(client.templates.updateTemplate("tpl-1", { category: "UTILITY" })).resolves.toMatchObject({ success: true });
    await expect(client.templates.deleteTemplate("hello")).resolves.toMatchObject({ success: true });
  });

  it("throws structured API errors", async () => {
    const fetch = vi.fn<FetchLike>(async () => jsonResponse({ error: { message: "Invalid OAuth access token", code: 190 } }, 401));
    const client = new WhatsAppClient({ accessToken: "token", phoneNumberId: "123", fetch });
    await expect(client.messages.sendText("201234567890", "hello")).rejects.toBeInstanceOf(WhatsAppApiError);
  });
});

describe("error categorization", () => {
  it("classifies common failures", () => {
    expect(categorizeWhatsAppError(190, "Invalid OAuth", 401)).toMatchObject({ category: "AUTH_ERROR", retryable: false });
    expect(categorizeWhatsAppError(130429, "Rate limit", 429)).toMatchObject({ category: "RATE_LIMIT", retryable: true });
    expect(categorizeWhatsAppError(132001, "Template does not exist", 400)).toMatchObject({ category: "INVALID_TEMPLATE" });
    expect(categorizeWhatsAppError(131053, "Media failed", 400)).toMatchObject({ category: "MEDIA_ERROR" });
  });
});

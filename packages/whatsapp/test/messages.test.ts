import { describe, expect, it } from "vitest";
import {
  buildMarkReadPayload,
  buildMediaMessage,
  buildReactionMessage,
  buildTemplateMessage,
  buildTextMessage,
} from "../src/index.js";

describe("message builders", () => {
  it("builds text with reply context", () => {
    expect(buildTextMessage("201234567890", "hello", { messageId: "wamid.1" })).toEqual({
      messaging_product: "whatsapp",
      to: "201234567890",
      type: "text",
      context: { message_id: "wamid.1" },
      text: { body: "hello", preview_url: false },
    });
  });

  it("builds image payload with caption", () => {
    expect(buildMediaMessage("201234567890", "image", { id: "media-1", caption: "caption" })).toMatchObject({
      type: "image",
      image: { id: "media-1", caption: "caption" },
    });
  });

  it("omits audio captions because WhatsApp audio does not support captions", () => {
    expect(buildMediaMessage("201234567890", "audio", { id: "media-1", caption: "ignored" })).toMatchObject({
      audio: { id: "media-1" },
    });
  });

  it("builds template payload with deterministic default policy", () => {
    expect(buildTemplateMessage("201234567890", { name: "hello_world", language: { code: "en_US" } })).toMatchObject({
      type: "template",
      template: { name: "hello_world", language: { policy: "deterministic", code: "en_US" } },
    });
  });

  it("builds reaction and mark-read payloads", () => {
    expect(buildReactionMessage("201234567890", "wamid.1", "👍")).toMatchObject({
      type: "reaction",
      reaction: { message_id: "wamid.1", emoji: "👍" },
    });
    expect(buildMarkReadPayload("wamid.1")).toEqual({
      messaging_product: "whatsapp",
      status: "read",
      message_id: "wamid.1",
    });
  });
});

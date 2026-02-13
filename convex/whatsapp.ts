import { action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import { categorizeWhatsAppError, validateAndCleanPhoneNumber, createErrorReport } from "./errorUtils";
import { extractWebhookChanges, resolvePhoneNumberCandidate } from "./webhookUtils";

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

export type WhatsAppConfig = { accessToken: string; phoneId: string; wabaId?: string };

async function withAppSecretProof(ctx: any, url: string, accessToken: string): Promise<string> {
  const appSecret = process.env.WHATSAPP_APP_SECRET;
  if (!appSecret?.trim()) return url;
  const appsecret_proof = await ctx.runAction(internal.nodeUtils.createAppSecretProof, {
    accessToken,
    appSecret,
  });
  const parsed = new URL(url);
  parsed.searchParams.set("appsecret_proof", appsecret_proof);
  return parsed.toString();
}

async function getWhatsAppConfig(ctx: any, phoneNumberId: string | undefined): Promise<WhatsAppConfig> {
  if (phoneNumberId) {
    const config = await ctx.runQuery(internal.whatsappNumbers.getByBusinessNumberId, { businessNumberId: phoneNumberId });
    if (config) {
      const accessToken = config.accessToken ?? process.env.WHATSAPP_ACCESS_TOKEN;
      const phoneId = config.businessNumberId;
      if (accessToken && phoneId) return { accessToken, phoneId, wabaId: config.businessAccountId };
    }
  }
  // Default: first number with token from DB, then env
  const first = await ctx.runQuery(internal.whatsappNumbers.getFirstWithToken, {});
  if (first?.accessToken?.trim()) {
    return {
      accessToken: first.accessToken,
      phoneId: first.businessNumberId,
      wabaId: first.businessAccountId,
    };
  }
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;
  const wabaId = process.env.WHATSAPP_WABA_ID;
  if (!accessToken || !phoneId) {
    const webhook = await ctx.runQuery(internal.webhookSettings.getForConfig, {});
    const fallbackToken = webhook?.accessToken ?? undefined;
    const fallbackPhoneId = webhook?.defaultPhoneNumberId ?? process.env.WHATSAPP_PHONE_ID;
    const fallbackWabaId = process.env.WHATSAPP_WABA_ID;
    if (fallbackToken && fallbackPhoneId) {
      return { accessToken: fallbackToken, phoneId: fallbackPhoneId, wabaId: fallbackWabaId };
    }
    throw new Error(
      "Missing WhatsApp config. Set an access token on a number in Integrations (ربط المتجر), or set webhook Access Token and WHATSAPP_PHONE_ID, or set WHATSAPP_ACCESS_TOKEN and WHATSAPP_PHONE_ID in the environment."
    );
  }
  return { accessToken, phoneId, wabaId };
}

async function resolveInboundPhoneNumberId(ctx: any, candidate?: string): Promise<{ phoneNumberId?: string; usedFallback: boolean }> {
  const webhook = await ctx.runQuery(internal.webhookSettings.getForConfig, {});
  const firstWithToken = await ctx.runQuery(internal.whatsappNumbers.getFirstWithToken, {});
  return resolvePhoneNumberCandidate(candidate, webhook?.defaultPhoneNumberId, firstWithToken?.businessNumberId);
}

// --- Actions (External API Calls) ---

export const sendMessage = action({
  args: {
    to: v.string(),
    type: v.string(), // text, image, template, etc.
    content: v.any(), // Structure depends on type
    messageId: v.optional(v.id("messages")), // internal DB ID
    phoneNumberId: v.optional(v.string()), // Meta phone_number_id; when set, use that number's config
  },
  handler: async (ctx, args) => {
    const { accessToken, phoneId } = await getWhatsAppConfig(ctx, args.phoneNumberId);

    // Validate and clean phone number
    let recipient: string;
    try {
      recipient = validateAndCleanPhoneNumber(args.to);
    } catch (err) {
      const error = err as Error;
      console.error("[WhatsApp] Phone number validation failed:", error.message);
      throw error;
    }

    console.log(`[WhatsApp] Preparing to send to cleaned recipient: ${recipient} (original was ${args.to})`);

    const payload: any = {
      messaging_product: "whatsapp",
      to: recipient,
      type: args.type,
      [args.type]: args.content,
    };

    console.log(`[WhatsApp] Sending payload to ${recipient} via ${WHATSAPP_API_URL}/${phoneId}/messages`);
    console.log(`[WhatsApp] Payload:`, JSON.stringify(payload, null, 2));

    try {
      const sendUrl = await withAppSecretProof(ctx, `${WHATSAPP_API_URL}/${phoneId}/messages`, accessToken);
      const response = await fetch(sendUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      console.log(`[WhatsApp] Meta API Response Status: ${response.status} ${response.statusText}`);
      const data = await response.json();

      if (!response.ok) {
        const errorCode = data.error?.code || response.status;
        const errorMessage = data.error?.message || "Unknown error";
        const errorCategory = categorizeWhatsAppError(errorCode, errorMessage);

        console.error(
          `[WhatsApp] API Error (${errorCategory.category}):`,
          JSON.stringify(data),
          `Retryable: ${errorCategory.retryable}`
        );

        // Create structured error report
        const errorReport = createErrorReport(
          new Error(errorMessage) as Error & { code?: number; retryable?: boolean },
          { contact: args.to, phone: recipient }
        );
        errorReport.code = errorCode;
        console.error("[WhatsApp] Error Report:", JSON.stringify(errorReport, null, 2));

        // Create and throw a typed error
        // Ensure properties are enumerable so they survive serialization across action boundaries
        const error = new Error(errorMessage) as Error & {
          code?: number;
          category?: string;
          retryable?: boolean;
        };

        // Set properties and make them enumerable
        Object.defineProperty(error, 'code', {
          value: errorCode,
          enumerable: true,
          writable: true,
          configurable: true
        });
        Object.defineProperty(error, 'category', {
          value: errorCategory.category,
          enumerable: true,
          writable: true,
          configurable: true
        });
        Object.defineProperty(error, 'retryable', {
          value: errorCategory.retryable,
          enumerable: true,
          writable: true,
          configurable: true
        });

        throw error;
      }

      console.log("[WhatsApp] Send Success:", JSON.stringify(data));

      // Link Meta ID to Internal Message
      if (args.messageId && data.messages?.[0]?.id) {
        const wamid = data.messages[0].id;
        await ctx.runMutation((internal as any).chat.updateMessageMetaId, {
          messageId: args.messageId,
          metaMessageId: wamid,
        });
        console.log(`[WhatsApp] Linked local msg ${args.messageId} to wamid ${wamid}`);
      }

      return data;
    } catch (error) {
      // Log structured error info
      const err = error as Error & { code?: number; category?: string; retryable?: boolean };
      console.error("[WhatsApp] Exception during send:", {
        message: err.message,
        code: err.code,
        category: err.category,
        retryable: err.retryable,
        stack: err.stack,
      });
      throw error;
    }
  },
});

export const createTemplate = action({
  args: {
    name: v.string(),
    language: v.string(),
    category: v.string(),
    components: v.any(), // Array of components
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await getWhatsAppConfig(ctx, args.phoneNumberId);
    const { accessToken, wabaId } = config;
    if (!wabaId) {
      throw new Error(
        "Missing WABA ID. Set a number with access token in Integrations, or set WHATSAPP_WABA_ID in the environment."
      );
    }

    const payload = {
      name: args.name,
      category: args.category,
      allow_category_change: true,
      language: args.language,
      components: args.components,
    };

    console.log("Creating Template Payload:", JSON.stringify(payload, null, 2));

    const createTemplateUrl = await withAppSecretProof(ctx, `${WHATSAPP_API_URL}/${wabaId}/message_templates`, accessToken);
    const response = await fetch(createTemplateUrl, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Template Creation Error:", data);
      throw new Error(`WhatsApp API Error: ${data.error?.message || "Unknown error"}`);
    }

    // Upsert into local DB
    await ctx.runMutation((internal as any).templates.upsert, {
      phoneNumberId: args.phoneNumberId,
      name: args.name,
      language: args.language,
      category: args.category,
      status: "PENDING", // Initial status from Meta is usually PENDING or APPROVED depending on cat
      components: args.components,
      metaTemplateId: data.id,
    });

    return data;
  },
});

export const fetchTemplates = action({
  args: {
    phoneNumberId: v.optional(v.string()), // When set, use this number's token and WABA from DB; else first number with token or env
  },
  handler: async (ctx, args) => {
    const config = await getWhatsAppConfig(ctx, args.phoneNumberId);
    const { accessToken, wabaId } = config;
    if (!wabaId) {
      throw new Error(
        "Missing WhatsApp config: set a number with access token in Integrations, or set WHATSAPP_ACCESS_TOKEN and WHATSAPP_WABA_ID in the environment."
      );
    }

    const fetchTemplatesUrl = await withAppSecretProof(
      ctx,
      `${WHATSAPP_API_URL}/${wabaId}/message_templates?limit=100`,
      accessToken
    );
    const response = await fetch(fetchTemplatesUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Fetch Templates Error:", data);
      const err = data.error;
      const code = err?.code;
      const subcode = err?.error_subcode;
      if (code === 100 || subcode === 33) {
        throw new Error(
          "Cannot load templates: the WhatsApp Business Account ID may be wrong or the access token does not have permission. In Integrations, ensure the number's Business Account ID is the WABA ID (from Meta Business Suite), not the Phone Number ID. Also check your Meta app has the whatsapp_business_management permission."
        );
      }
      throw new Error(`WhatsApp API Error: ${err?.message || "Unknown error"}`);
    }

    return data.data || [];
  },
});

export const markAsRead = action({
  args: {
    messageId: v.string(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessToken, phoneId } = await getWhatsAppConfig(ctx, args.phoneNumberId);

    try {
      const markReadUrl = await withAppSecretProof(ctx, `https://graph.facebook.com/v21.0/${phoneId}/messages`, accessToken);
      await fetch(markReadUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          status: "read",
          message_id: args.messageId,
        }),
      });
    } catch (error) {
      console.error("Failed to mark message as read:", error);
    }
  },
});

export const getTemplate = action({
  args: {
    name: v.string(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await getWhatsAppConfig(ctx, args.phoneNumberId);
    const { accessToken, wabaId } = config;
    if (!wabaId) {
      throw new Error(
        "Missing WABA ID. Set a number with access token in Integrations, or set WHATSAPP_WABA_ID in the environment."
      );
    }

    const getTemplateUrl = await withAppSecretProof(
      ctx,
      `${WHATSAPP_API_URL}/${wabaId}/message_templates?name=${args.name}`,
      accessToken
    );
    const response = await fetch(getTemplateUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Get Template Error:", data);
      throw new Error(`WhatsApp API Error: ${data.error?.message || "Unknown error"}`);
    }

    return data.data?.[0] || null;
  },
});

export const deleteTemplate = action({
  args: {
    name: v.string(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const config = await getWhatsAppConfig(ctx, args.phoneNumberId);
    const { accessToken, wabaId } = config;
    if (!wabaId) {
      throw new Error(
        "Missing WABA ID. Set a number with access token in Integrations, or set WHATSAPP_WABA_ID in the environment."
      );
    }

    const deleteTemplateUrl = await withAppSecretProof(
      ctx,
      `${WHATSAPP_API_URL}/${wabaId}/message_templates?name=${args.name}`,
      accessToken
    );
    const response = await fetch(deleteTemplateUrl, {
      method: "DELETE",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Delete Template Error:", data);
      throw new Error(`WhatsApp API Error: ${data.error?.message || "Unknown error"}`);
    }

    return data;
  },
});


export const uploadMedia = action({
  args: {
    storageId: v.string(),
    type: v.string(), // image/jpeg, etc.
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessToken, phoneId } = await getWhatsAppConfig(ctx, args.phoneNumberId);

    // 1. Get File URL from Convex
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found");

    // 2. Fetch the file content
    const fileRes = await fetch(fileUrl);
    const blob = await fileRes.blob();

    // 3. Prepare Form Data
    const formData = new FormData();
    formData.append("file", blob);
    formData.append("type", args.type);
    formData.append("messaging_product", "whatsapp");

    // 4. Upload to Meta
    const uploadUrl = await withAppSecretProof(ctx, `${WHATSAPP_API_URL}/${phoneId}/media`, accessToken);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Media Upload Error:", data);

      // Handle specific error codes
      const errorCode = data.error?.code;
      const errorMessage = data.error?.message || "Upload failed";

      if (errorCode === 190) {
        // Authentication Error (OAuthException)
        const error = new Error(
          "WhatsApp API Authentication Error: Invalid or expired access token. Update the access token on the number in Integrations (ربط المتجر), or set WHATSAPP_ACCESS_TOKEN in the environment."
        ) as Error & { code?: number; category?: string };
        error.code = 190;
        error.category = "AUTH_ERROR";
        console.error("[WhatsApp] Authentication failed - check access token (Integrations or env)");
        throw error;
      } else if (errorCode === 131047) {
        // Media type not supported
        const error = new Error(`Media type not supported: ${args.type}`) as Error & { code?: number; category?: string };
        error.code = 131047;
        error.category = "MEDIA_TYPE_ERROR";
        throw error;
      } else if (errorCode === 131026) {
        // File too large
        const error = new Error("File size exceeds WhatsApp limits (16MB for images, 16MB for videos)") as Error & { code?: number; category?: string };
        error.code = 131026;
        error.category = "FILE_SIZE_ERROR";
        throw error;
      }

      // Generic error with code
      const error = new Error(errorMessage) as Error & { code?: number; category?: string };
      if (errorCode) {
        error.code = errorCode;
        error.category = "UPLOAD_ERROR";
      }
      throw error;
    }

    return data.id; // Meta Media ID
  }
});

/**
 * Upload media from an external URL and get a WhatsApp Media ID.
 * This is used for sending carousel templates where we need fresh media IDs.
 * The returned media ID is valid for 30 days and can be used in send requests.
 */
export const uploadMediaFromUrl = action({
  args: {
    url: v.string(),      // External URL to the image/video
    type: v.string(),     // "image" or "video"
    mimeType: v.optional(v.string()), // Optional: specific mime type like "image/jpeg"
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessToken, phoneId } = await getWhatsAppConfig(ctx, args.phoneNumberId);

    console.log(`[uploadMediaFromUrl] Fetching media from: ${args.url.substring(0, 80)}...`);

    // 1. Fetch the file from external URL
    const fileRes = await fetch(args.url);
    if (!fileRes.ok) {
      console.error(`[uploadMediaFromUrl] Failed to fetch: ${fileRes.status} ${fileRes.statusText}`);
      throw new Error(`Failed to fetch media from URL: ${fileRes.status} ${fileRes.statusText}`);
    }

    const blob = await fileRes.blob();
    const contentType = args.mimeType ||
      fileRes.headers.get("content-type") ||
      (args.type === "video" ? "video/mp4" : "image/jpeg");

    console.log(`[uploadMediaFromUrl] Uploading ${contentType}, size: ${blob.size} bytes`);

    // 2. Prepare Form Data for WhatsApp Media API
    const formData = new FormData();
    formData.append("file", blob, `media.${args.type === "video" ? "mp4" : "jpg"}`);
    formData.append("type", contentType);
    formData.append("messaging_product", "whatsapp");

    // 3. Upload to WhatsApp Media API
    const uploadUrl = await withAppSecretProof(ctx, `${WHATSAPP_API_URL}/${phoneId}/media`, accessToken);
    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("[uploadMediaFromUrl] Upload Error:", data);
      throw new Error(data.error?.message || "Failed to upload media to WhatsApp");
    }

    console.log(`[uploadMediaFromUrl] Success! Media ID: ${data.id}`);
    return data.id; // WhatsApp Media ID to use in send requests
  }
});

export const uploadTemplateMedia = action({
  args: {
    storageId: v.string(),
    type: v.string(), // image/jpeg, video/mp4, etc.
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const config = await getWhatsAppConfig(ctx, args.phoneNumberId);
    const settings = (await ctx.runQuery(api.webhookSettings.get, {})) as { appId?: string | null };
    const appId: string | undefined = settings.appId ?? process.env.WHATSAPP_APP_ID ?? undefined;
    const accessToken = config.accessToken;

    if (!appId) {
      throw new Error(
        "Missing Meta App ID. Set it in Integrations (ربط المتجر) under webhook settings, or set WHATSAPP_APP_ID in the environment."
      );
    }

    // 1. Get File URL and Content
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found");

    const fileRes = await fetch(fileUrl);
    const blob = await fileRes.blob();
    const fileLength = blob.size;

    console.log(`[UploadTemplateMedia] Starting upload for ${args.type}, size: ${fileLength}`);

    // 2. Start Upload Session
    const sessionUrl = `https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${fileLength}&file_type=${args.type}`;

    const proofSessionUrl = await withAppSecretProof(ctx, sessionUrl, accessToken);
    const sessionRes = await fetch(proofSessionUrl, {
      method: "POST",
      headers: {
        "Authorization": `OAuth ${accessToken}` // Note: OAuth prefix sometimes required for this specific endpoint, or Bearer
      }
    });

    const sessionData = await sessionRes.json();

    if (!sessionRes.ok) {
      console.error("Failed to create upload session:", sessionData);
      throw new Error(sessionData.error?.message || "Failed to create upload session");
    }

    const uploadId = sessionData.id;
    console.log(`[UploadTemplateMedia] Session created: ${uploadId}`);

    // 3. Upload File Content
    const uploadUrl = `https://graph.facebook.com/v21.0/${uploadId}`;

    const proofUploadUrl = await withAppSecretProof(ctx, uploadUrl, accessToken);
    const uploadRes = await fetch(proofUploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `OAuth ${accessToken}`,
        "file_offset": "0"
      },
      body: blob
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("Failed to upload file content:", uploadData);
      throw new Error(uploadData.error?.message || "Failed to upload file content");
    }

    console.log(`[UploadTemplateMedia] Upload complete, handle: ${uploadData.h}`);

    // Return the handle
    return uploadData.h;
  }
});

export const uploadExternalTemplateMedia = action({
  args: {
    url: v.string(),
    type: v.string(), // image/jpeg, video/mp4, etc.
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<string> => {
    const config = await getWhatsAppConfig(ctx, args.phoneNumberId);
    const settings = (await ctx.runQuery(api.webhookSettings.get, {})) as { appId?: string | null };
    const appId: string | undefined = settings.appId ?? process.env.WHATSAPP_APP_ID ?? undefined;
    const accessToken = config.accessToken;

    if (!appId) {
      throw new Error(
        "Missing Meta App ID. Set it in Integrations (ربط المتجر) under webhook settings, or set WHATSAPP_APP_ID in the environment."
      );
    }

    // 1. Fetch File Content from External URL
    console.log(`[UploadExternal] Fetching from ${args.url}`);
    const fileRes = await fetch(args.url);
    if (!fileRes.ok) throw new Error(`Failed to fetch external media: ${fileRes.statusText}`);

    const blob = await fileRes.blob();
    const fileLength = blob.size;
    const fileType = args.type || fileRes.headers.get("content-type") || "image/jpeg";

    console.log(`[UploadExternal] Starting upload for ${fileType}, size: ${fileLength}`);

    // 2. Start Upload Session
    const sessionUrl = `https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${fileLength}&file_type=${fileType}`;

    const proofSessionUrl = await withAppSecretProof(ctx, sessionUrl, accessToken);
    const sessionRes = await fetch(proofSessionUrl, {
      method: "POST",
      headers: {
        "Authorization": `OAuth ${accessToken}`
      }
    });

    const sessionData = await sessionRes.json();

    if (!sessionRes.ok) {
      console.error("Failed to create upload session:", sessionData);
      throw new Error(sessionData.error?.message || "Failed to create upload session");
    }

    const uploadId = sessionData.id;

    // 3. Upload File Content
    const uploadUrl = `https://graph.facebook.com/v21.0/${uploadId}`;

    const proofUploadUrl = await withAppSecretProof(ctx, uploadUrl, accessToken);
    const uploadRes = await fetch(proofUploadUrl, {
      method: "POST",
      headers: {
        "Authorization": `OAuth ${accessToken}`,
        "file_offset": "0"
      },
      body: blob
    });

    const uploadData = await uploadRes.json();

    if (!uploadRes.ok) {
      console.error("Failed to upload file content:", uploadData);
      throw new Error(uploadData.error?.message || "Failed to upload file content");
    }

    console.log(`[UploadExternal] Upload complete, handle: ${uploadData.h}`);

    return uploadData.h;
  }
});

export const getMediaUrl = action({
  args: {
    mediaId: v.string(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { accessToken } = await getWhatsAppConfig(ctx, args.phoneNumberId);

    const mediaUrl = await withAppSecretProof(ctx, `${WHATSAPP_API_URL}/${args.mediaId}`, accessToken);
    const response = await fetch(mediaUrl, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error("Failed to get media URL");

    return data.url; // The temporary download URL
  }
});

export const hydrateIncomingMedia = internalAction({
  args: {
    messageId: v.id("messages"),
    mediaId: v.string(),
    phoneNumberId: v.optional(v.string()),
    attempt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const attempt = args.attempt ?? 1;
    try {
      const { accessToken } = await getWhatsAppConfig(ctx, args.phoneNumberId);
      console.log(`[WhatsApp] hydrateIncomingMedia start mediaId=${args.mediaId} phoneNumberId=${args.phoneNumberId ?? "none"} attempt=${attempt}`);
      const downloadUrl = await ctx.runAction(api.whatsapp.getMediaUrl, {
        mediaId: args.mediaId,
        phoneNumberId: args.phoneNumberId,
      });
      const response = await fetch(downloadUrl, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        throw new Error(`Failed to download media: ${response.status}`);
      }
      const blob = await response.blob();
      const storageId = await ctx.storage.store(blob);
      await ctx.runMutation((internal as any).messages.updateMessageStorageId, {
        messageId: args.messageId,
        storageId,
      });
      console.log(`[WhatsApp] hydrateIncomingMedia success mediaId=${args.mediaId} attempt=${attempt}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[WhatsApp] hydrateIncomingMedia failed mediaId=${args.mediaId} attempt=${attempt}:`, errorMessage);
      if (attempt < 3) {
        const delayMs = attempt * 2000;
        await ctx.scheduler.runAfter(delayMs, internal.whatsapp.hydrateIncomingMedia, {
          messageId: args.messageId,
          mediaId: args.mediaId,
          phoneNumberId: args.phoneNumberId,
          attempt: attempt + 1,
        });
        return;
      }
      await ctx.runMutation((internal as any).messages.updateMediaHydrationFailure, {
        messageId: args.messageId,
        error: errorMessage,
      });
      await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
        body: { mediaId: args.mediaId, messageId: args.messageId, phoneNumberId: args.phoneNumberId },
        processingStatus: "failed",
        eventType: "media_hydration",
        resolvedPhoneNumberId: args.phoneNumberId,
        fallbackUsed: false,
        note: errorMessage,
      });
    }
  },
});

// --- Webhook Verification ---

export const verifyWebhook = internalAction({
  args: {
    mode: v.optional(v.string()),
    verify_token: v.optional(v.string()),
    challenge: v.optional(v.string()),
    expected_verify_token: v.optional(v.string()), // from DB (webhook settings form); fallback to env in http handler
  },
  handler: async (ctx, args) => {
    const verifyToken = args.expected_verify_token ?? process.env.WHATSAPP_VERIFY_TOKEN;
    console.log("[VerifyWebhook] Expected token from:", args.expected_verify_token != null ? "DB" : "env");
    console.log("[VerifyWebhook] Received:", { mode: args.mode, token: args.verify_token });

    if (args.mode === "subscribe" && verifyToken && args.verify_token === verifyToken) {
      console.log("Webhook Verified!");
      return { success: true, challenge: args.challenge };
    } else {
      console.error("Webhook Verification Failed");
      return { success: false };
    }
  }
});

// --- Webhook Processing ---

// --- Async Webhook Processing ---

export const dispatchWebhook = internalMutation({
  args: { body: v.any() },
  handler: async (ctx, args) => {
    // Fire and forget via scheduler
    await ctx.scheduler.runAfter(0, internal.whatsapp.processWebhookAction, {
      body: args.body,
      attempt: 1
    });
  }
});

export const processWebhookAction = internalAction({
  args: {
    body: v.any(),
    attempt: v.optional(v.number())
  },
  handler: async (ctx, args) => {
    const changes = extractWebhookChanges(args.body);
    console.log(`[Webhook Action] Processing payload changes=${changes.length}`);
    if (changes.length === 0) {
      console.warn("[Webhook Action] No entries found in payload");
      await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
        body: args.body,
        processingStatus: "ignored_no_messages",
        eventType: "empty_payload",
        note: "No entry/changes found",
      });
      return;
    }

    for (const change of changes) {
        const value = change.value;
        const field = change.field;
        if (!value) {
          console.warn(`[Webhook Action] Skipping change with empty value. field=${field ?? "unknown"}`);
          await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
            body: change,
            processingStatus: "failed",
            eventType: field ?? "unknown",
            note: "Change has no value",
          });
          continue;
        }

        const resolvedNumber = await resolveInboundPhoneNumberId(ctx, value?.metadata?.phone_number_id);
        const resolvedPhoneNumberId = resolvedNumber.phoneNumberId;
        const businessPhoneId = resolvedPhoneNumberId ?? "unknown";
        const messages = Array.isArray(value.messages) ? value.messages : [];
        const statuses = Array.isArray(value.statuses) ? value.statuses : [];
        const hasMessages = messages.length > 0;
        const hasStatuses = statuses.length > 0;
        const metadataPhoneNumberId =
          typeof value?.metadata?.phone_number_id === "string" ? value.metadata.phone_number_id : undefined;
        const metadataDisplayPhoneNumber =
          typeof value?.metadata?.display_phone_number === "string" ? value.metadata.display_phone_number : undefined;
        console.log(
          `[Webhook Action] field="${field}" businessId="${businessPhoneId}" fallback=${resolvedNumber.usedFallback} hasMessages=${hasMessages} messagesCount=${messages.length} hasStatuses=${hasStatuses} statusesCount=${statuses.length} metadataPhoneNumberId=${metadataPhoneNumberId ?? "none"}`
        );
        await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
          body: change,
          processingStatus: "received",
          eventType: field ?? "unknown",
          resolvedPhoneNumberId: resolvedPhoneNumberId,
          fallbackUsed: resolvedNumber.usedFallback,
          hasMessages,
          messagesCount: messages.length,
          hasStatuses,
          statusesCount: statuses.length,
          metadataPhoneNumberId,
          metadataDisplayPhoneNumber,
        });

        if (hasMessages) {
          console.log(`[Webhook Action] Processing ${messages.length} messages`);
          for (const message of messages) {
            let content = message.text?.body || "";
            let mediaId = undefined;

            if (["image", "video", "audio", "document", "voice"].includes(message.type)) {
              const mediaData = message[message.type];
              mediaId = mediaData?.id;
              content = mediaData?.caption || "";
            }

            const contactPhone = message.from || value.contacts?.[0]?.wa_id || "unknown_contact";
            const contactName = value.contacts?.[0]?.profile?.name || contactPhone;
            const messageTimestamp = Number.parseInt(message.timestamp, 10);
            let messageId;
            try {
              messageId = await ctx.runMutation(internal.messages.saveMessage, {
                contactId: contactPhone,
                contactName,
                contactPhone,
                phoneNumberId: resolvedPhoneNumberId,
                direction: "inbound",
                type: message.type,
                content,
                metaMessageId: message.id,
                timestamp: Number.isFinite(messageTimestamp) ? messageTimestamp * 1000 : Date.now(),
                status: "delivered",
                mediaId,
              });
              await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
                body: message,
                processingStatus: "saved",
                eventType: "message",
                resolvedPhoneNumberId: resolvedPhoneNumberId,
                fallbackUsed: resolvedNumber.usedFallback,
                hasMessages: true,
                messagesCount: 1,
                hasStatuses,
                statusesCount: statuses.length,
                metadataPhoneNumberId,
                metadataDisplayPhoneNumber,
                note: `Saved message ${message.id}`,
              });
            } catch (saveError) {
              const errText = saveError instanceof Error ? saveError.message : String(saveError);
              await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
                body: message,
                processingStatus: "failed",
                eventType: "message",
                resolvedPhoneNumberId: resolvedPhoneNumberId,
                fallbackUsed: resolvedNumber.usedFallback,
                hasMessages: true,
                messagesCount: 1,
                hasStatuses,
                statusesCount: statuses.length,
                metadataPhoneNumberId,
                metadataDisplayPhoneNumber,
                note: errText,
              });
              throw saveError;
            }

            if (mediaId) {
              await ctx.scheduler.runAfter(0, internal.whatsapp.hydrateIncomingMedia, {
                messageId,
                mediaId,
                phoneNumberId: resolvedPhoneNumberId,
                attempt: 1,
              });
            }

            const chat = await ctx.runQuery(internal.chat.getChatByPhone, {
              phone: contactPhone,
              phoneNumberId: resolvedPhoneNumberId,
            });
            if (chat?.aiMode) {
              const aiConfig = await ctx.runQuery(internal.ai_config.getInternalConfig, {
                phoneNumberId: resolvedPhoneNumberId,
              });
              if (aiConfig?.isActive) {
                await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
                  body: { chatId: chat._id, contactPhone, userMessage: content },
                  processingStatus: "received",
                  eventType: "agent_dispatch",
                  resolvedPhoneNumberId,
                  fallbackUsed: false,
                  note: "Agent scheduled for reply",
                });
                await ctx.scheduler.runAfter(0, internal.agent.generateResponse, {
                  chatId: chat._id,
                  contactPhone,
                  userMessage: content,
                });
              } else {
                await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
                  body: { chatId: chat._id, contactPhone, userMessage: content },
                  processingStatus: "received",
                  eventType: "agent_dispatch_skipped",
                  resolvedPhoneNumberId,
                  fallbackUsed: false,
                  note: "chat.aiMode=true but per-number agent disabled",
                });
              }
            }
          }
        } else {
          console.log(
            `[Webhook Action] Status-only or non-message payload for field=${field ?? "unknown"} messagesCount=${messages.length} statusesCount=${statuses.length}`
          );
          await ctx.runMutation(internal.webhookEvents.logWhatsappProcessing, {
            body: change,
            processingStatus: "ignored_no_messages",
            eventType: field ?? "unknown",
            resolvedPhoneNumberId: resolvedPhoneNumberId,
            fallbackUsed: resolvedNumber.usedFallback,
            hasMessages,
            messagesCount: messages.length,
            hasStatuses,
            statusesCount: statuses.length,
            metadataPhoneNumberId,
            metadataDisplayPhoneNumber,
            note: "Change has no value.messages (status-only or metadata-only event)",
          });
        }

        if (hasStatuses) {
          console.log(`[Webhook Action] Processing ${statuses.length} status updates`);
          for (const status of statuses) {
            const msgSuccess = await ctx.runMutation(internal.messages.updateMessageStatus, {
              metaMessageId: status.id,
              status: status.status,
            });
            const campaignSuccess = await ctx.runMutation(internal.campaigns.updateMessageStatus, {
              metaMessageId: status.id,
              status: status.status,
            });

            if (!msgSuccess && !campaignSuccess) {
              const attempt = args.attempt || 1;
              if (attempt < 3) {
                console.log(`[Webhook] Message ${status.id} not found. scheduling retry #${attempt + 1}`);
                await ctx.scheduler.runAfter(2000, internal.whatsapp.processWebhookAction, {
                  body: args.body,
                  attempt: attempt + 1,
                });
                return;
              }
              console.warn(`[Webhook] Message ${status.id} not found after 3 attempts`);
            }
          }
        }

        if (field === "message_template_status_update") {
          const templateUpdate = value;
          if (templateUpdate?.message_template_name && templateUpdate?.event) {
            await ctx.runMutation((internal as any).templates.updateStatus, {
              name: templateUpdate.message_template_name,
              status: templateUpdate.event.toUpperCase(),
              phoneNumberId: resolvedPhoneNumberId,
            });
          }
        }
    }
  }
});
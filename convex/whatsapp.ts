import { action, internalAction, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { internal, api } from "./_generated/api";
import {
  categorizeWhatsAppError,
  validateAndCleanPhoneNumber,
  WhatsAppAPIError,
  createErrorReport,
} from "./errorUtils";

const WHATSAPP_API_URL = "https://graph.facebook.com/v21.0";

// --- Actions (External API Calls) ---

export const sendMessage = action({
  args: {
    to: v.string(),
    type: v.string(), // text, image, template, etc.
    content: v.any(), // Structure depends on type
    messageId: v.optional(v.id("messages")), // internal DB ID
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!accessToken || !phoneId) {
      console.error("[WhatsApp] Missing Environment Variables");
      throw new Error("Missing WhatsApp Environment Variables");
    }

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
      const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/messages`, {
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_WABA_ID;

    if (!accessToken || !wabaId) {
      throw new Error("Missing WhatsApp Environment Variables");
    }

    const payload = {
      name: args.name,
      category: args.category,
      allow_category_change: true,
      language: args.language,
      components: args.components,
    };

    console.log("Creating Template Payload:", JSON.stringify(payload, null, 2));

    const response = await fetch(`${WHATSAPP_API_URL}/${wabaId}/message_templates`, {
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
  args: {},
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_WABA_ID;

    if (!accessToken || !wabaId) {
      throw new Error("Missing WhatsApp Environment Variables");
    }

    const response = await fetch(`${WHATSAPP_API_URL}/${wabaId}/message_templates?limit=100`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${accessToken}`,
      },
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("WhatsApp Fetch Templates Error:", data);
      throw new Error(`WhatsApp API Error: ${data.error?.message || "Unknown error"}`);
    }

    return data.data || [];
  },
});

export const markAsRead = action({
  args: { messageId: v.string() },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!accessToken || !phoneId) {
      console.error("Missing WhatsApp credentials");
      return;
    }

    try {
      await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_WABA_ID;

    if (!accessToken || !wabaId) {
      throw new Error("Missing WhatsApp Environment Variables");
    }

    const response = await fetch(`${WHATSAPP_API_URL}/${wabaId}/message_templates?name=${args.name}`, {
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const wabaId = process.env.WHATSAPP_WABA_ID;

    if (!accessToken || !wabaId) {
      throw new Error("Missing WhatsApp Environment Variables");
    }

    const response = await fetch(`${WHATSAPP_API_URL}/${wabaId}/message_templates?name=${args.name}`, {
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!accessToken || !phoneId) throw new Error("Missing Env Vars");

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
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/media`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${accessToken}` },
      body: formData
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Media Upload Error:", data);
      throw new Error(data.error?.message || "Upload failed");
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_ID;

    if (!accessToken || !phoneId) {
      throw new Error("Missing WhatsApp Env Vars (ACCESS_TOKEN or PHONE_ID)");
    }

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
    const response = await fetch(`${WHATSAPP_API_URL}/${phoneId}/media`, {
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const appId = process.env.WHATSAPP_APP_ID;

    if (!accessToken || !appId) throw new Error("Missing WhatsApp Env Vars (APP_ID or ACCESS_TOKEN)");

    // 1. Get File URL and Content
    const fileUrl = await ctx.storage.getUrl(args.storageId);
    if (!fileUrl) throw new Error("File not found");

    const fileRes = await fetch(fileUrl);
    const blob = await fileRes.blob();
    const fileLength = blob.size;

    console.log(`[UploadTemplateMedia] Starting upload for ${args.type}, size: ${fileLength}`);

    // 2. Start Upload Session
    const sessionUrl = `https://graph.facebook.com/v21.0/${appId}/uploads?file_length=${fileLength}&file_type=${args.type}`;

    const sessionRes = await fetch(sessionUrl, {
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

    const uploadRes = await fetch(uploadUrl, {
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
  },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    const appId = process.env.WHATSAPP_APP_ID;

    if (!accessToken || !appId) throw new Error("Missing WhatsApp Env Vars");

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

    const sessionRes = await fetch(sessionUrl, {
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

    const uploadRes = await fetch(uploadUrl, {
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
  args: { mediaId: v.string() },
  handler: async (ctx, args) => {
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
    if (!accessToken) throw new Error("Missing Access Token");

    const response = await fetch(`${WHATSAPP_API_URL}/${args.mediaId}`, {
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    const data = await response.json();
    if (!response.ok) throw new Error("Failed to get media URL");

    return data.url; // The temporary download URL
  }
});

export const hydrateIncomingMedia = internalAction({
  args: { messageId: v.id("messages"), mediaId: v.string() },
  handler: async (ctx, args) => {
    try {
      const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
      if (!accessToken) {
        throw new Error("Missing WHATSAPP_ACCESS_TOKEN");
      }
      const downloadUrl = await ctx.runAction(api.whatsapp.getMediaUrl, { mediaId: args.mediaId });
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
    } catch (error) {
      console.error("[WhatsApp] hydrateIncomingMedia failed:", error);
    }
  },
});

// --- Webhook Verification ---

export const verifyWebhook = internalAction({
  args: {
    mode: v.optional(v.string()),
    verify_token: v.optional(v.string()),
    challenge: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;
    console.log("[VerifyWebhook] Env Token:", verifyToken);
    console.log("[VerifyWebhook] Received:", { mode: args.mode, token: args.verify_token });

    if (args.mode === "subscribe" && args.verify_token === verifyToken) {
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
    const change = args.body.entry?.[0]?.changes?.[0];
    const value = change?.value;
    const field = change?.field;

    console.log(`[Webhook Action] Processing field: ${field}`);

    if (!value) {
      console.warn("[Webhook Action] No value found in change object:", JSON.stringify(change));
      return;
    }

    // Handle Messages
    if (value.messages) {
      console.log(`[Webhook Action] Processing ${value.messages.length} messages`);
      for (const message of value.messages) {
        let content = message.text?.body || "";
        let mediaId = undefined;

        if (["image", "video", "audio", "document", "voice"].includes(message.type)) {
          const mediaData = message[message.type];
          mediaId = mediaData.id;
          content = mediaData.caption || "";
          console.log(`[Webhook Action] Found media: ${message.type}, ID: ${mediaId}`);
        } else {
          console.log(`[Webhook Action] Message type: ${message.type}, Content: "${content.substring(0, 50)}..."`);
        }

        const contactPhone = message.from;
        const contactName = value.contacts?.[0]?.profile?.name || contactPhone;
        const businessPhoneId = value.metadata?.phone_number_id || "unknown";

        const messageId = await ctx.runMutation(internal.messages.saveMessage, {
          contactId: businessPhoneId,
          contactName,
          contactPhone,
          direction: "inbound",
          type: message.type,
          content,
          metaMessageId: message.id,
          timestamp: parseInt(message.timestamp) * 1000,
          status: "delivered",
          mediaId,
        });

        if (mediaId) {
          await ctx.scheduler.runAfter(0, internal.whatsapp.hydrateIncomingMedia, {
            messageId,
            mediaId,
          });
        }

        // --- AI Agent Hook ---
        // Check if chat is in AI Mode
        const chat = await ctx.runQuery(internal.chat.getChatByPhone, { phone: contactPhone });
        if (chat && chat.aiMode) {
          await ctx.scheduler.runAfter(0, internal.agent.generateResponse, {
            chatId: chat._id,
            contactPhone: contactPhone,
            userMessage: content,
          });
        }
      }
    }

    // Handle Status Updates (Sent, Delivered, Read)
    if (value.statuses) {
      console.log(`[Webhook Action] Processing ${value.statuses.length} status updates`);
      for (const status of value.statuses) {
        console.log(`[Webhook Action] Status update for ${status.id}: ${status.status}`);

        // 1. Try updating standard chat messages
        const msgSuccess = await ctx.runMutation(internal.messages.updateMessageStatus, {
          metaMessageId: status.id,
          status: status.status,
        });

        // 2. Try updating campaign logs (if it was a campaign message)
        const campaignSuccess = await ctx.runMutation(internal.campaigns.updateMessageStatus, {
          metaMessageId: status.id,
          status: status.status,
        });

        if (!msgSuccess && !campaignSuccess) {
          const attempt = args.attempt || 1;
          if (attempt < 3) {
            console.log(`[Webhook] Message ${status.id} not found in messages or campaigns, scheduling retry #${attempt + 1}`);
            // Retry in 2 seconds
            await ctx.scheduler.runAfter(2000, internal.whatsapp.processWebhookAction, {
              body: args.body,
              attempt: attempt + 1
            });
            // Stop processing this batch to avoid duplicate scheduling if there are multiple statuses
            return;
          } else {
            console.warn(`[Webhook] Message ${status.id} not found after 3 attempts. Giving up.`);
          }
        } else {
          if (campaignSuccess) {
            console.log(`[Webhook] Updated campaign log for ${status.id}`);
          }
          if (msgSuccess) {
            console.log(`[Webhook] Updated chat message for ${status.id}`);
          }
        }
      }
    }

    // Handle Template Status Updates
    if (field === "message_template_status_update") {
      // ... (Same as before)
      const templateUpdate = value;
      if (templateUpdate?.message_template_name && templateUpdate?.event) {
        await ctx.runMutation((internal as any).templates.updateStatus, {
          name: templateUpdate.message_template_name,
          status: templateUpdate.event.toUpperCase(),
        });
      }
    }
  }
});
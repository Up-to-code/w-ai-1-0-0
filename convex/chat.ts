import { query, mutation, internalMutation, internalAction, internalQuery } from "./_generated/server";
import { internal, api } from "./_generated/api";
import { v } from "convex/values";
import { PushNotifications } from "@convex-dev/expo-push-notifications"; // Import PushNotifications
import { components } from "./_generated/api";

const pushNotifications = new PushNotifications<any>(components.pushNotifications);
import { paginationOptsValidator } from "convex/server";

export const getChatByPhone = internalQuery({
  args: { phone: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("chats")
      .filter((q: any) => q.eq(q.field("contactPhone"), args.phone))
      .first();
  },
});

export const getOrCreateChat = mutation({
  args: { contactPhone: v.string(), contactName: v.string() },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("chats")
      .filter((q: any) => q.eq(q.field("contactPhone"), args.contactPhone))
      .first();

    if (existing) return existing;

    const chatId = await ctx.db.insert("chats", {
      contactId: args.contactPhone, // WhatsApp ID usually phone
      contactName: args.contactName,
      contactPhone: args.contactPhone,
      lastMessageTime: Date.now(),
      unreadCount: 0,
      status: "active",
      aiMode: true,
    });

    return await ctx.db.get(chatId);
  },
});

export const toggleAiMode = mutation({
  args: { chatId: v.id("chats"), enabled: v.boolean() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.chatId, { aiMode: args.enabled });
  },
});

export const getLatestGlobalMessage = query({
  handler: async (ctx) => {
    // Get the absolute latest message inserted into the DB
    const message = await ctx.db.query("messages").order("desc").first();

    if (!message) return null;

    // Only interested if it's inbound (someone sent it to us)
    if (message.direction !== "inbound") return null;

    // Fetch sender details
    const chat = await ctx.db.get(message.chatId);
    if (!chat) return null;

    return {
      messageId: message._id,
      chatId: chat._id,
      contactName: chat.contactName,
      contactPhone: chat.contactPhone,
      content: message.content, // Text or Caption
      type: message.type,
      timestamp: message._creationTime, // Use insertion time for notification sync
    };
  }
});

// Public Query for UI
export const listChats = query({
  handler: async (ctx) => {
    return await ctx.db.query("chats").withIndex("by_last_message").order("desc").collect();
  },
});

export const getChat = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.chatId);
  },
});

export const getMessages = query({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("asc")
      .collect();

    return Promise.all(
      messages.map(async (msg) => {
        let mediaUrl = undefined;
        if (msg.storageId) {
          mediaUrl = await ctx.storage.getUrl(msg.storageId);
        }
        return { ...msg, mediaUrl };
      })
    );
  },
});

export const getMessagesPage = query({
  args: { chatId: v.id("chats"), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const paginationResult = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .order("desc")
      .paginate(args.paginationOpts);

    const page = await Promise.all(
      paginationResult.page.map(async (msg) => {
        let mediaUrl = undefined;
        if (msg.storageId) {
          mediaUrl = await ctx.storage.getUrl(msg.storageId);
        }
        return { ...msg, mediaUrl };
      })
    );

    return { ...paginationResult, page };
  },
});

// Send Message Flow
export const sendMessage = mutation({
  args: {
    chatId: v.id("chats"),
    content: v.string(),
    type: v.string(),
    mediaId: v.optional(v.string()),
    storageId: v.optional(v.string()),
    template: v.optional(v.object({
      name: v.string(),
      language: v.string(),
      components: v.optional(v.any()),
    })),
  },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) throw new Error("Chat not found");

    const now = Date.now();
    const storedContent = args.type === "template" ? (args.template?.name ?? args.content) : args.content;

    const messageId = await ctx.db.insert("messages", {
      chatId: args.chatId,
      direction: "outbound",
      type: args.type as any,
      content: storedContent,
      mediaId: args.mediaId,
      storageId: args.storageId,
      status: "sent",
      timestamp: now,
    });

    const payloadContent =
      args.type === "text"
        ? { body: args.content }
        : args.type === "template"
          ? {
            name: args.template?.name,
            language: { code: args.template?.language },
            components: args.template?.components ?? [],
          }
          : { id: args.mediaId, caption: args.content };

    // Send via WhatsApp API Action
    console.log(`[Chat] Scheduling WhatsApp send for msg ${messageId} to ${chat.contactPhone}`);
    const patchChatPromise = ctx.db.patch(args.chatId, {
      lastMessageTime: now,
      status: "active",
    });

    const schedulePromise = ctx.scheduler.runAfter(0, api.whatsapp.sendMessage, {
      to: chat.contactPhone,
      type: args.type,
      content: payloadContent,
      messageId: messageId
    }).catch(async (e) => {
      console.error(`[Chat] Failed to schedule WhatsApp send: ${e}`);
      await ctx.db.patch(messageId, { status: "failed" });
    });

    await Promise.all([patchChatPromise, schedulePromise]);
  },
});

// Internal Mutation called by Webhook
export const saveIncomingMessage = internalMutation({
  args: {
    contactId: v.string(),
    contactName: v.string(),
    messageType: v.string(),
    content: v.string(),
    mediaId: v.optional(v.string()),
    storageId: v.optional(v.string()),
    timestamp: v.number(),
    metaMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    // 1. Sync Contact
    let contact = await ctx.db
      .query("contacts")
      .withIndex("by_phone", (q) => q.eq("phone", args.contactId))
      .first();

    if (!contact) {
      // Create new contact if doesn't exist
      await ctx.db.insert("contacts", {
        name: args.contactName,
        phone: args.contactId,
        isSubscribed: true,
        createdAt: Date.now(),
      });
    }

    // 2. Find or Create Chat
    const chat = await ctx.db
      .query("chats")
      .filter((q: any) => q.eq(q.field("contactId"), args.contactId))
      .first();

    let chatId;
    if (!chat) {
      chatId = await ctx.db.insert("chats", {
        contactId: args.contactId,
        contactName: args.contactName,
        contactPhone: args.contactId,
        lastMessageTime: args.timestamp,
        unreadCount: 1,
        status: "active",
        aiMode: true, // Default to enabled
      });
    } else {
      chatId = chat._id;
      await ctx.db.patch(chatId, {
        lastMessageTime: args.timestamp,
        unreadCount: chat.unreadCount + 1,
      });
    }

    if (args.mediaId && !args.storageId) {
      // Schedule media hydration
      // We can't use runAfter inside a mutation if we don't have the ID yet, 
      // but we do insert it below. 
      // We'll handle scheduling AFTER insertion.
    }

    // 4. Insert Message
    const messageId = await ctx.db.insert("messages", {
      chatId,
      direction: "inbound",
      type: args.messageType as any,
      content: args.content,
      mediaId: args.mediaId,
      storageId: args.storageId,
      status: "delivered",
      timestamp: args.timestamp,
      metaMessageId: args.metaMessageId,
    });

    // If we scheduled hydration, we need to pass the real message ID if possible, 
    // but runAfter arguments are serialized. 
    // Let's create a separate action for hydration that takes the messageId.
    if (args.mediaId && !args.storageId) {
      await ctx.scheduler.runAfter(0, internal.chat.hydrateMedia, {
        messageId,
        mediaId: args.mediaId
      });
    }

    // 5. Send Push Notification to Admins
    // We notify all users with role 'admin' about the new message
    try {
      const admins = await ctx.db.query("users")
        .filter((q: any) => q.eq(q.field("role"), "admin"))
        .collect();

      if (admins.length > 0) {
        const notifTitle = args.contactName || args.contactId;
        const notifBody = args.messageType === "text" ? args.content : `Sent a ${args.messageType}`;

        for (const admin of admins) {
          if (admin.tokenIdentifier) {
            await pushNotifications.sendPushNotification(ctx, {
              userId: admin.tokenIdentifier,
              notification: {
                title: notifTitle,
                body: notifBody,
                data: { chatId: chatId },
              },
            });
          }
        }
      }
    } catch (e) {
      console.error("Failed to send push notifications:", e);
    }
  },
});

export const hydrateMedia = internalAction({
  args: { messageId: v.id("messages"), mediaId: v.string() },
  handler: async (ctx, args) => {
    try {
      // 1. Get Download URL from Meta
      const url = await ctx.runAction(api.whatsapp.getMediaUrl, { mediaId: args.mediaId });

      // 2. Download File
      const response = await fetch(url);
      const blob = await response.blob();

      // 3. Upload to Convex Storage
      const storageId = await ctx.storage.store(blob);

      // 4. Update Message with Storage ID
      await ctx.runMutation(internal.chat.updateMessageStorageId, {
        messageId: args.messageId,
        storageId: storageId
      });
    } catch (e) {
      console.error("Failed to hydrate media:", e);
    }
  }
});

export const updateMessageStorageId = internalMutation({
  args: { messageId: v.id("messages"), storageId: v.string() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, { storageId: args.storageId });
  }
});

export const markAsRead = mutation({
  args: { chatId: v.id("chats") },
  handler: async (ctx, args) => {
    const chat = await ctx.db.get(args.chatId);
    if (!chat) return;

    // Reset unread count
    await ctx.db.patch(args.chatId, { unreadCount: 0 });

    // Mark messages as read
    const unreadMessages = await ctx.db
      .query("messages")
      .withIndex("by_chat", (q) => q.eq("chatId", args.chatId))
      .filter(q => q.and(
        q.eq(q.field("direction"), "inbound"),
        q.neq(q.field("status"), "read")
      ))
      .collect();

    for (const msg of unreadMessages) {
      await ctx.db.patch(msg._id, { status: "read" });
    }

    // Sync to WhatsApp (Mark as read in Meta)
    if (unreadMessages.length > 0) {
      const topMsg = unreadMessages[unreadMessages.length - 1];
      if (topMsg.metaMessageId) {
        await ctx.scheduler.runAfter(0, api.whatsapp.markAsRead, {
          messageId: topMsg.metaMessageId
        });
      }
    }
  }
});

export const updateMessageStatus = internalMutation({
  args: {
    metaMessageId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const message = await ctx.db
      .query("messages")
      .filter((q: any) => q.eq(q.field("metaMessageId"), args.metaMessageId))
      .first();

    if (!message) {
      return false; // Message not found
    }

    await ctx.db.patch(message._id, {
      status: args.status as any,
    });

    return true; // Success
  },
});

export const updateMessageMetaId = internalMutation({
  args: {
    messageId: v.id("messages"),
    metaMessageId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.messageId, {
      metaMessageId: args.metaMessageId,
    });
  },
});

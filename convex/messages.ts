import { internalMutation, mutation } from "./_generated/server";
import { v } from "convex/values";

export const saveMessage = mutation({
    args: {
        contactId: v.string(),
        contactName: v.string(),
        contactPhone: v.string(),
        direction: v.union(v.literal("inbound"), v.literal("outbound")),
        type: v.string(),
        content: v.string(),
        metaMessageId: v.string(),
        timestamp: v.number(),
        status: v.string(),
        mediaId: v.optional(v.string()),
        storageId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 0. Idempotency: avoid double-inserting the same Meta message
        try {
            const existing = await ctx.db
                .query("messages")
                .withIndex("by_meta_message_id", (q) => q.eq("metaMessageId", args.metaMessageId))
                .first();
            if (existing) {
                return existing._id;
            }
        } catch (e) {
            // If index isn't available yet (during dev), continue and insert
        }

        // 0. Auto-Capture Logic (Middleware) (Robust Version)
        let contactId = args.contactId;

        try {
            const existingContact = await ctx.db
                .query("contacts")
                .filter(q => q.eq(q.field("phone"), args.contactPhone))
                .first();

            if (!existingContact && args.direction === "inbound") {
                console.log(`[Messages] Creating new contact for ${args.contactPhone}`);
                const newContactId = await ctx.db.insert("contacts", {
                    name: args.contactName || "Unknown",
                    phone: args.contactPhone,
                    isSubscribed: true,
                    tags: ["inbound"],
                    createdAt: Date.now(),
                });
                // In a real app we might update contactId to match the DB ID, but here contactId is External
            } else if (existingContact) {
                console.log(`[Messages] Existing contact found: ${existingContact._id}`);
                // Match name if it was unknown?
                if (existingContact.name === "Unknown" && args.contactName && args.contactName !== args.contactPhone) {
                    await ctx.db.patch(existingContact._id, { name: args.contactName });
                }
            }
        } catch (e) {
            console.error("[Messages] Contact Sync Error:", e);
            // Continue saving message even if contact sync fails
        }

        // 1. Find or Create Chat
        let finalChatId;
        try {
            // ... logic same as before, simplified for diff
            let chat = await ctx.db
                .query("chats")
                .filter(q => q.eq(q.field("contactPhone"), args.contactPhone))
                .first();

            if (chat) {
                finalChatId = chat._id;
                await ctx.db.patch(chat._id, {
                    lastMessageTime: args.timestamp,
                    unreadCount: args.direction === "inbound" ? (chat.unreadCount || 0) + 1 : chat.unreadCount
                });
            } else {
                console.log(`[Messages] Creating new chat for ${args.contactPhone}`);
                finalChatId = await ctx.db.insert("chats", {
                    contactId: args.contactId,
                    contactName: args.contactName,
                    contactPhone: args.contactPhone,
                    lastMessageTime: args.timestamp,
                    unreadCount: 1,
                    status: "active"
                });
            }
        } catch (e) {
            console.error("[Messages] Chat Creation Error:", e);
            throw e; // Fail message save if chat fails
        }

        // 2. Insert Message
        const msgId = await ctx.db.insert("messages", {
            chatId: finalChatId,
            direction: args.direction as "inbound" | "outbound",
            type: args.type as any,
            content: args.content,
            status: args.status as any,
            timestamp: args.timestamp,
            metaMessageId: args.metaMessageId,
            mediaId: args.mediaId,
            storageId: args.storageId,
        });
        console.log(`[Messages] Message saved: ${msgId} (${args.direction})`);
        return msgId;
    }
});

export const updateMessageStatus = mutation({
    args: {
        metaMessageId: v.string(),
        status: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await ctx.db
            .query("messages")
            .filter(q => q.eq(q.field("metaMessageId"), args.metaMessageId))
            .first();

        if (message) {
            await ctx.db.patch(message._id, {
                status: args.status as any
            });
            return true; // Found and updated
        }
        return false; // Not found
    }
});

export const updateMessageMetaId = mutation({
    args: {
        messageId: v.id("messages"),
        metaMessageId: v.string(),
    },
    handler: async (ctx, args) => {
        const message = await ctx.db.get(args.messageId);
        if (message) {
            await ctx.db.patch(args.messageId, {
                metaMessageId: args.metaMessageId,
                status: "sent" // Confirm it's sent
            });
            console.log(`[Messages] Updated message ${args.messageId} with Meta ID: ${args.metaMessageId}`);
        } else {
            console.error(`[Messages] Failed to update Meta ID. Message ${args.messageId} not found.`);
        }
    }
});

export const updateMessageStorageId = internalMutation({
    args: {
        messageId: v.id("messages"),
        storageId: v.string(),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.messageId, { storageId: args.storageId });
    }
});

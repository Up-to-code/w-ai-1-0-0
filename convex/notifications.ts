import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { PushNotifications } from "@convex-dev/expo-push-notifications";
import { components } from "./_generated/api";

const pushNotifications = new PushNotifications<any>(components.pushNotifications);

export const list = query({
    args: { limit: v.optional(v.number()) },
    handler: async (ctx, args) => {
        const limit = args.limit || 20;
        return await ctx.db
            .query("notifications")
            .withIndex("by_created_at")
            .order("desc")
            .take(limit);
    },
});

export const unreadCount = query({
    handler: async (ctx) => {
        const notifications = await ctx.db
            .query("notifications")
            .withIndex("by_read", (q) => q.eq("read", false))
            .collect();
        return notifications.length;
    },
});

export const markAsRead = mutation({
    args: { id: v.id("notifications") },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.id, { read: true });
    },
});

export const markAllAsRead = mutation({
    handler: async (ctx) => {
        const unread = await ctx.db
            .query("notifications")
            .withIndex("by_read", (q) => q.eq("read", false))
            .collect();

        for (const n of unread) {
            await ctx.db.patch(n._id, { read: true });
        }
    },
});

export const create = internalMutation({
    args: {
        type: v.union(v.literal("info"), v.literal("warning"), v.literal("error"), v.literal("success")),
        title: v.string(),
        message: v.string(),
        link: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        await ctx.db.insert("notifications", {
            type: args.type,
            title: args.title,
            message: args.message,
            link: args.link,
            read: false,
            createdAt: Date.now(),
        });
    },
});

export const recordPushNotificationToken = mutation({
    args: { token: v.string(), userId: v.optional(v.id("users")) },
    handler: async (ctx, args) => {
        let userId = args.userId;

        if (!userId) {
            const identity = await ctx.auth.getUserIdentity();
            if (identity) {
                // Try to find user by tokenIdentifier if strictly using standard auth, 
                // or just assume the identity.subject IS the identifier if mapped.
                // For compatibility with the custom auth flow which returns a userId,
                // we expect the client to pass userId.
                // If we have an identity but no userId arg, we can try to look it up 
                // if we had a mapping. 
                // For now, allow relying on args.userId.
                // userId = identity.subject; // Type mismatch risk
            }
        }

        if (!userId) {
            console.warn("recordPushNotificationToken called without userId or authenticated identity. Skipping association.");
            // We could throw, but maybe we want to allow anonymous push? 
            // The lib requires userId.
            throw new Error("User ID required for push notifications");
        }

        await pushNotifications.recordToken(ctx, {
            userId: userId,
            pushToken: args.token,
        });
    },
});

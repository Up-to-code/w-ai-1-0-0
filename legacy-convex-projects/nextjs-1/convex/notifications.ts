import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Get notifications for user
export const list = query({
    args: { userId: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('notifications')
            .withIndex('by_user', (q) => q.eq('userId', args.userId))
            .order('desc')
            .take(50);
    },
});

// Get unread count
export const getUnreadCount = query({
    args: { userId: v.id('users') },
    handler: async (ctx, args) => {
        const unread = await ctx.db
            .query('notifications')
            .withIndex('by_user_unread', (q) =>
                q.eq('userId', args.userId).eq('read', false)
            )
            .collect();

        return unread.length;
    },
});

// Mark as read
export const markRead = mutation({
    args: { notificationId: v.id('notifications') },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.notificationId, {
            read: true,
        });
        return { success: true };
    },
});

// Mark all as read
export const markAllRead = mutation({
    args: { userId: v.id('users') },
    handler: async (ctx, args) => {
        const notifications = await ctx.db
            .query('notifications')
            .withIndex('by_user_unread', (q) =>
                q.eq('userId', args.userId).eq('read', false)
            )
            .collect();

        await Promise.all(
            notifications.map((n) => ctx.db.patch(n._id, { read: true }))
        );
        return { success: true };
    },
});

// Send notification (internal use)
export const send = mutation({
    args: {
        userId: v.id('users'),
        type: v.string(),
        title: v.string(),
        message: v.string(),
        data: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert('notifications', {
            userId: args.userId,
            type: args.type,
            title: args.title,
            message: args.message,
            read: false,
            data: args.data,
            createdAt: Date.now(),
        });
        return id;
    },
});

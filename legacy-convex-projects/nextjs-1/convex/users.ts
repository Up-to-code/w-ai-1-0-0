import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// Sync WorkOS User to Convex
export const syncUser = mutation({
    args: {
        workosUserId: v.string(),
        email: v.string(),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // 1. Check by WorkOS ID
        const existingByWorkOS = await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workosUserId', args.workosUserId))
            .first();

        if (existingByWorkOS) {
            // Update metadata
            await ctx.db.patch(existingByWorkOS._id, {
                email: args.email, // Ensure email is current
                name: args.name || existingByWorkOS.name,
                avatar: args.avatar || existingByWorkOS.avatar,
                updatedAt: Date.now(),
            });
            return existingByWorkOS._id;
        }

        // 2. Check by Email (Migration case)
        const existingByEmail = await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', args.email))
            .first();

        if (existingByEmail) {
            // Link WorkOS ID to existing user
            console.log("Linking WorkOS ID to existing user:", args.email);
            await ctx.db.patch(existingByEmail._id, {
                workosUserId: args.workosUserId,
                name: args.name || existingByEmail.name,
                avatar: args.avatar || existingByEmail.avatar,
                updatedAt: Date.now(),
            });
            return existingByEmail._id;
        }

        // 3. Create new user
        const newId = await ctx.db.insert('users', {
            workosUserId: args.workosUserId,
            email: args.email,
            name: args.name || args.email.split('@')[0],
            avatar: args.avatar,
            userType: 'partner', // Default to partner for dashboard access
            status: 'active',
            settings: {
                language: 'ar',
                timezone: 'UTC',
                emailNotifications: true,
            },
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return newId;
    },
});

// Get current user by email
export const getUserByEmail = query({
    args: { email: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('users')
            .withIndex('by_email', (q) => q.eq('email', args.email))
            .unique();
    },
});

// Get user by ID
export const getUserById = query({
    args: { userId: v.id('users') },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.userId);
    },
});

// Update user profile
export const updateProfile = mutation({
    args: {
        userId: v.id('users'),
        name: v.optional(v.string()),
        avatar: v.optional(v.string()),
        phone: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { userId, ...updates } = args;

        await ctx.db.patch(userId, {
            ...updates,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Update user settings
export const updateSettings = mutation({
    args: {
        userId: v.id('users'),
        settings: v.object({
            language: v.union(v.literal('ar'), v.literal('en')),
            timezone: v.optional(v.string()),
            emailNotifications: v.boolean(),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.userId, {
            settings: args.settings,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

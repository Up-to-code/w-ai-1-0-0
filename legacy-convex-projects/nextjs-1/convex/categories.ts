import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// List categories for an organization
export const list = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('categories')
            .withIndex('by_org', (q) => q.eq('orgId', args.orgId))
            .order('desc')
            .collect();
    },
});

// Create a new category
export const create = mutation({
    args: {
        orgId: v.string(),
        name: v.string(),
        nameEn: v.optional(v.string()), // Optional English name
        description: v.optional(v.string()),
        image: v.optional(v.string()),
        order: v.number(),
    },
    handler: async (ctx, args) => {
        const categoryId = await ctx.db.insert('categories', {
            ...args,
            status: 'active',
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return categoryId;
    },
});

// Update a category
export const update = mutation({
    args: {
        id: v.id('categories'),
        orgId: v.string(), // For security check
        name: v.optional(v.string()),
        nameEn: v.optional(v.string()),
        description: v.optional(v.string()),
        image: v.optional(v.string()),
        order: v.optional(v.number()),
        status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
    },
    handler: async (ctx, args) => {
        const { id, orgId, ...updates } = args;

        const existing = await ctx.db.get(id);

        if (!existing || existing.orgId !== orgId) {
            throw new Error("Category not found or access denied");
        }

        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Delete a category
export const remove = mutation({
    args: {
        id: v.id('categories'),
        orgId: v.string(), // For security check
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);

        if (!existing || existing.orgId !== args.orgId) {
            throw new Error("Category not found or access denied");
        }

        // Check for products in this category for this org
        const productsStart = await ctx.db
            .query('products')
            .withIndex('by_org_category', (q) => q.eq('orgId', args.orgId).eq('categoryId', args.id))
            .first();

        if (productsStart) {
            throw new Error("لا يمكن حذف قسم يحتوي على منتجات");
        }

        await ctx.db.delete(args.id);

        return { success: true };
    },
});

import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

export const generateUploadUrl = mutation({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.storage.generateUploadUrl();
    },
});

// List products for an organization
export const list = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        const results = await ctx.db
            .query('products')
            .withIndex('by_org', (q) => q.eq('orgId', args.orgId))
            .order('desc')
            .collect();
        return results;
    },
});

// Get single product
export const get = query({
    args: { id: v.id('products'), orgId: v.string() },
    handler: async (ctx, args) => {
        const product = await ctx.db.get(args.id);
        if (!product || product.orgId !== args.orgId) {
            return null;
        }
        return product;
    },
});

// Create a new product
export const create = mutation({
    args: {
        orgId: v.string(),
        name: v.string(),
        nameEn: v.optional(v.string()),
        description: v.string(),
        categoryId: v.id('categories'),
        price: v.number(),
        originalPrice: v.optional(v.number()),
        stock: v.number(),
        sku: v.optional(v.string()),
        images: v.array(v.string()),
        variantOptions: v.optional(v.array(v.object({
            type: v.string(),
            values: v.array(v.string())
        }))),
        variants: v.optional(v.array(v.object({
            id: v.string(),
            options: v.array(v.object({ name: v.string(), value: v.string() })),
            price: v.number(),
            stock: v.number(),
            sku: v.optional(v.string())
        }))),
    },
    handler: async (ctx, args) => {
        const productId = await ctx.db.insert('products', {
            ...args,
            status: 'active',
            // Default metrics
            viewCount: 0,
            orderCount: 0,
            createdAt: Date.now(),
            updatedAt: Date.now(),
        });
        return productId;
    },
});

// Update a product
export const update = mutation({
    args: {
        id: v.id('products'),
        orgId: v.string(), // For security check

        name: v.optional(v.string()),
        nameEn: v.optional(v.string()),
        description: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        price: v.optional(v.number()),
        originalPrice: v.optional(v.number()),
        stock: v.optional(v.number()),
        sku: v.optional(v.string()),
        images: v.optional(v.array(v.string())),
        status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
        variantOptions: v.optional(v.array(v.object({
            type: v.string(),
            values: v.array(v.string())
        }))),
        variants: v.optional(v.array(v.object({
            id: v.string(),
            options: v.array(v.object({ name: v.string(), value: v.string() })),
            price: v.number(),
            stock: v.number(),
            sku: v.optional(v.string())
        }))),
    },
    handler: async (ctx, args) => {
        const { id, orgId, ...updates } = args;

        const existing = await ctx.db.get(id);

        if (!existing || existing.orgId !== orgId) {
            throw new Error("Product not found or access denied");
        }

        await ctx.db.patch(id, {
            ...updates,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Delete a product
export const remove = mutation({
    args: {
        id: v.id('products'),
        orgId: v.string(), // For security check
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db.get(args.id);

        if (!existing || existing.orgId !== args.orgId) {
            throw new Error("Product not found or access denied");
        }

        await ctx.db.delete(args.id);

        return { success: true };
    },
});

import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";

export const list = query({
    args: {
        search: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        limit: v.optional(v.number())
    },
    handler: async (ctx, args) => {
        let q = ctx.db.query("contacts");

        // Note: Simple filtering for now. For scale, we'd use search capabilities or more indexes.
        if (args.limit) {
            return await q.take(args.limit);
        }
        return await q.collect();
    },
});

export const create = mutation({
    args: {
        name: v.string(),
        phone: v.string(),
        email: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        customFields: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const id = await ctx.db.insert("contacts", {
            name: args.name,
            phone: args.phone,
            email: args.email,
            tags: args.tags || [],
            customFields: args.customFields || {},
            isSubscribed: true,
            createdAt: Date.now(),
        });

        // Trigger Workflows for new contact
        await ctx.scheduler.runAfter(0, internal.workflows.checkContactWorkflows, {
            contactId: id,
            contactPhone: args.phone,
            isNew: true
        });

        // Trigger Workflows for added tags
        if (args.tags && args.tags.length > 0) {
            for (const tag of args.tags) {
                await ctx.scheduler.runAfter(0, internal.workflows.checkTagWorkflows, {
                    contactId: id,
                    contactPhone: args.phone,
                    addedTag: tag
                });
            }
        }

        return id;
    },
});

export const update = mutation({
    args: {
        id: v.id("contacts"),
        name: v.optional(v.string()),
        email: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const contact = await ctx.db.get(args.id);
        if (!contact) throw new Error("Contact not found");

        // Calculate added tags
        if (args.tags) {
            const oldTags = contact.tags || [];
            const addedTags = args.tags.filter(t => !oldTags.includes(t));
            
            for (const tag of addedTags) {
                await ctx.scheduler.runAfter(0, internal.workflows.checkTagWorkflows, {
                    contactId: args.id,
                    contactPhone: contact.phone,
                    addedTag: tag
                });
            }
        }

        await ctx.db.patch(args.id, {
            name: args.name,
            email: args.email,
            tags: args.tags,
        });
    },
});

export const bulkCreate = mutation({
    args: {
        contacts: v.array(v.object({
            name: v.string(),
            phone: v.string(),
            email: v.optional(v.string()),
            tags: v.optional(v.array(v.string())),
        }))
    },
    handler: async (ctx, args) => {
        const promises = args.contacts.map(c =>
            ctx.db.insert("contacts", {
                name: c.name,
                phone: c.phone,
                email: c.email,
                tags: c.tags || [],
                isSubscribed: true,
                createdAt: Date.now(),
            })
        );
        await Promise.all(promises);
        return args.contacts.length;
    },
});

export const getById = query({
    args: { id: v.id("contacts") },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.id);
    },
});

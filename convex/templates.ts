import { query, mutation, action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

export const list = query({
  handler: async (ctx) => {
    return await ctx.db.query("templates").collect();
  },
});

export const getByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("templates")
      .filter(q => q.eq(q.field("name"), args.name))
      .first();
  },
});

export const upsert = mutation({
  args: {
    name: v.string(),
    language: v.string(),
    category: v.string(),
    status: v.string(),
    components: v.any(),
    metaTemplateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("templates")
      .filter(q => q.eq(q.field("name"), args.name))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        status: args.status as any,
        components: args.components,
        lastSyncedAt: Date.now(),
      });
      return existing._id;
    } else {
      return await ctx.db.insert("templates", {
        name: args.name,
        language: args.language,
        category: args.category,
        status: args.status as any,
        components: args.components,
        metaTemplateId: args.metaTemplateId,
        lastSyncedAt: Date.now(),
      });
    }
  },
});

export const updateStatus = mutation({
  args: {
    name: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("templates")
      .filter(q => q.eq(q.field("name"), args.name))
      .first();

    if (template) {
      await ctx.db.patch(template._id, {
        status: args.status as any,
        lastSyncedAt: Date.now(),
      });
    }
  },
});

export const remove = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const template = await ctx.db
      .query("templates")
      .filter(q => q.eq(q.field("name"), args.name))
      .first();

    if (template) {
      await ctx.db.delete(template._id);
    }
  },
});

export const syncFromMeta = action({
  args: {},
  handler: async (ctx, args): Promise<number> => {
    // 1. Fetch templates from Meta API
    const metaTemplates: any[] = await ctx.runAction((api as any).whatsapp.fetchTemplates, {});

    // 2. Upsert each template into local DB
    for (const t of metaTemplates) {
      await ctx.runMutation((api as any).templates.upsert, {
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        components: t.components || [],
        metaTemplateId: t.id,
      });
    }

    return metaTemplates.length;
  },
});

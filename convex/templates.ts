import { query, mutation, action, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

export const list = query({
  args: { phoneNumberId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.phoneNumberId) {
      return await ctx.db
        .query("templates")
        .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId!))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("templates").order("desc").collect();
  },
});

export const getByName = query({
  args: { name: v.string(), phoneNumberId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.phoneNumberId) {
      return await ctx.db
        .query("templates")
        .withIndex("by_phone_number_id_name", (q) =>
          q.eq("phoneNumberId", args.phoneNumberId!).eq("name", args.name)
        )
        .first();
    }
    return await ctx.db
      .query("templates")
      .filter((q: any) => q.eq(q.field("name"), args.name))
      .first();
  },
});

export const getById = query({
  args: { id: v.id("templates") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

export const getTemplateByName = internalQuery({
  args: { name: v.string(), phoneNumberId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.phoneNumberId) {
      return await ctx.db
        .query("templates")
        .withIndex("by_phone_number_id_name", (q) =>
          q.eq("phoneNumberId", args.phoneNumberId!).eq("name", args.name)
        )
        .first();
    }
    return await ctx.db
      .query("templates")
      .filter((q: any) => q.eq(q.field("name"), args.name))
      .first();
  },
});

export const upsert = internalMutation({
  args: {
    phoneNumberId: v.optional(v.string()),
    name: v.string(),
    language: v.string(),
    category: v.string(),
    status: v.string(),
    components: v.any(),
    metaTemplateId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = args.phoneNumberId
      ? await ctx.db
          .query("templates")
          .withIndex("by_phone_number_id_name", (q) =>
            q.eq("phoneNumberId", args.phoneNumberId!).eq("name", args.name)
          )
          .first()
      : await ctx.db
          .query("templates")
          .filter((q: any) => q.eq(q.field("name"), args.name))
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
        phoneNumberId: args.phoneNumberId,
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
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const template = args.phoneNumberId
      ? await ctx.db
          .query("templates")
          .withIndex("by_phone_number_id_name", (q) =>
            q.eq("phoneNumberId", args.phoneNumberId!).eq("name", args.name)
          )
          .first()
      : await ctx.db
          .query("templates")
          .filter((q: any) => q.eq(q.field("name"), args.name))
          .first();

    if (template) {
      await ctx.db.patch(template._id, {
        status: args.status as any,
        lastSyncedAt: Date.now(),
      });
    }
  },
});

export const deleteInternal = internalMutation({
  args: { name: v.string(), phoneNumberId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const template = args.phoneNumberId
      ? await ctx.db
          .query("templates")
          .withIndex("by_phone_number_id_name", (q) =>
            q.eq("phoneNumberId", args.phoneNumberId!).eq("name", args.name)
          )
          .first()
      : await ctx.db
          .query("templates")
          .filter((q: any) => q.eq(q.field("name"), args.name))
          .first();

    if (template) {
      await ctx.db.delete(template._id);
    }
  },
});

export const deleteTemplate = action({
  args: {
    name: v.string(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<void> => {
    // 1. Delete from Meta
    try {
      await ctx.runAction(api.whatsapp.deleteTemplate, {
        name: args.name,
        phoneNumberId: args.phoneNumberId,
      });
    } catch (e: any) {
      const errorMessage = e.message || String(e);
      console.error("Failed to delete from Meta:", errorMessage);

      // If it's a permission error, we MUST fail and tell the user
      if (errorMessage.includes("permission") || errorMessage.includes("OAuthException") || errorMessage.includes("(#100)")) {
        throw new Error("Meta Permission Error: Check WhatsApp Manager permissions. " + errorMessage);
      }

      // If it's "does not exist" or other non-critical errors, we might want to proceed.
      // But since we can't be sure if it's "not found" vs "other error", 
      // and we want strict sync, it's better to throw unless we are sure.
      // For now, we will throw for everything to ensure the user sees the issue.
      // The only exception is if we KNEW it was "not found".

      // Attempting to detect "Not Found" - this is a guess at the error string, 
      // if we can't confirm, we throw.
      if (!errorMessage.toLowerCase().includes("not found") && !errorMessage.toLowerCase().includes("does not exist")) {
        throw e;
      }

      console.log("Template might already be deleted from Meta, proceeding to sync local DB.");
    }

    // 2. Delete locally
    await ctx.runMutation(internal.templates.deleteInternal, {
      name: args.name,
      phoneNumberId: args.phoneNumberId,
    });
  },
});

export const createTemplate = action({
  args: {
    name: v.string(),
    language: v.string(),
    category: v.string(),
    components: v.any(),
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<any> => {
    // 1. Create in Meta
    const res = await ctx.runAction(api.whatsapp.createTemplate, {
      name: args.name,
      language: args.language,
      category: args.category,
      components: args.components,
      phoneNumberId: args.phoneNumberId,
    });

    // 2. Upsert in DB (handled by whatsapp.createTemplate calling internal.templates.upsert, 
    // but we can ensure it here if needed. 
    // Actually whatsapp.createTemplate already calls upsert. 
    // So we just return the result.)
    return res;
  }
});

export const syncFromMeta = action({
  args: {
    phoneNumberId: v.optional(v.string()), // When set, use this number's token and WABA from DB for Meta API
  },
  handler: async (ctx, args): Promise<number> => {
    // 1. Fetch templates from Meta API (use DB token when phoneNumberId provided)
    const metaTemplates: any[] = await ctx.runAction(api.whatsapp.fetchTemplates, {
      phoneNumberId: args.phoneNumberId ?? undefined,
    });
    const metaTemplateNames = metaTemplates.map((t: any) => t.name);

    // 2. Upsert each template into local DB
    for (const t of metaTemplates) {
      await ctx.runMutation(internal.templates.upsert, {
        phoneNumberId: args.phoneNumberId,
        name: t.name,
        language: t.language,
        category: t.category,
        status: t.status,
        components: t.components || [],
        metaTemplateId: t.id,
      });
    }

    // 3. Remove local templates that are not in Meta
    await ctx.runMutation(internal.templates.pruneLocal, {
      metaTemplateNames,
      phoneNumberId: args.phoneNumberId,
    });

    return metaTemplates.length;
  },
});

export const pruneLocal = internalMutation({
  args: { metaTemplateNames: v.array(v.string()), phoneNumberId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const localTemplates = args.phoneNumberId
      ? await ctx.db
          .query("templates")
          .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId!))
          .collect()
      : await ctx.db.query("templates").collect();

    for (const local of localTemplates) {
      if (!args.metaTemplateNames.includes(local.name)) {
        await ctx.db.delete(local._id);
      }
    }
  },
});
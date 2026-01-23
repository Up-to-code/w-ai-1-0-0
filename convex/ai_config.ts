import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("ai_configs").first();
    return config || {
      systemPrompt: "You are a helpful sales assistant for a store. You can search for products and help customers find what they need. Answer concisely.",
      model: "arcee-ai/trinity-mini:free",
      isActive: true,
    };
  },
});

export const updateConfig = mutation({
  args: {
    systemPrompt: v.string(),
    model: v.string(),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("ai_configs").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        systemPrompt: args.systemPrompt,
        model: args.model,
        isActive: args.isActive,
        updatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("ai_configs", {
        systemPrompt: args.systemPrompt,
        model: args.model,
        isActive: args.isActive,
        updatedAt: Date.now(),
      });
    }
  },
});

export const getInternalConfig = query({
    handler: async (ctx) => {
        return await ctx.db.query("ai_configs").first();
    }
});

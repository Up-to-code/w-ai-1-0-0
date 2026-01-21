import { internalMutation, query } from "./_generated/server";
import { v } from "convex/values";

export const logWhatsappWebhook = internalMutation({
  args: { body: v.any() },
  handler: async (ctx, args) => {
    await ctx.db.insert("webhook_events", {
      source: "whatsapp",
      body: args.body,
      createdAt: Date.now(),
    });
  },
});

export const latestWhatsappWebhook = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("webhook_events")
      .withIndex("by_source_createdAt", (q) => q.eq("source", "whatsapp"))
      .order("desc")
      .first();
  },
});


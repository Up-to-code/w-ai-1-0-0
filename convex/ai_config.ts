import { query, mutation, internalMutation } from "./_generated/server";
import { v } from "convex/values";

export const getConfig = query({
  handler: async (ctx) => {
    const config = await ctx.db.query("ai_configs").first();
    return config || {
      systemPrompt: `You are a sales assistant for a store. Recommend products from the store (Salla/catalog), suggest related or complementary items when relevant, and help the customer choose. Answer concisely and in a helpful, professional tone.
When the customer asks to speak to a human, has a complaint, or has a complex request (e.g. refund, custom order), output exactly: <TOOL:transfer_to_human> and reply briefly that you are transferring the conversation to a team member. Examples: they say "أريد التحدث مع شخص" or "speak to agent" or "talk to human" or express a complaint or refund request — use the transfer tool.
Keep replies concise and suitable for WhatsApp: short paragraphs, avoid long markdown or code blocks.`,
      model: "arcee-ai/trinity-mini:free",
      temperature: undefined,
      isActive: true,
    };
  },
});

export const updateConfig = mutation({
  args: {
    systemPrompt: v.string(),
    model: v.string(),
    temperature: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("ai_configs").first();
    const updates = {
      systemPrompt: args.systemPrompt,
      model: args.model,
      isActive: args.isActive,
      updatedAt: Date.now(),
      ...(args.temperature !== undefined && { temperature: args.temperature }),
    };
    if (existing) {
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("ai_configs", {
        systemPrompt: args.systemPrompt,
        model: args.model,
        isActive: args.isActive,
        updatedAt: Date.now(),
        ...(args.temperature !== undefined && { temperature: args.temperature }),
      });
    }
  },
});

export const getInternalConfig = query({
    handler: async (ctx) => {
        return await ctx.db.query("ai_configs").first();
    }
});

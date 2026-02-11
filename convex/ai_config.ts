import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const DEFAULT_SYSTEM_PROMPT = `You are a sales assistant for a store. Recommend products from the store (Salla/catalog), suggest related or complementary items when relevant, and help the customer choose. Answer concisely and in a helpful, professional tone.
When the customer asks to speak to a human, has a complaint, or has a complex request (e.g. refund, custom order), output exactly: <TOOL:transfer_to_human> and reply briefly that you are transferring the conversation to a team member. Examples: they say "أريد التحدث مع شخص" or "speak to agent" or "talk to human" or express a complaint or refund request — use the transfer tool.
Keep replies concise and suitable for WhatsApp: short paragraphs, avoid long markdown or code blocks.`;

const DEFAULT_CONFIG = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  model: "arcee-ai/trinity-mini:free",
  temperature: undefined as number | undefined,
  isActive: true,
};

/**
 * Get AI config for a specific phone number.
 * Falls back to global config (phoneNumberId = undefined) if no per-number config exists.
 */
export const getConfig = query({
  args: {
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // If phoneNumberId provided, try to find per-number config first
    if (args.phoneNumberId) {
      const perNumberConfig = await ctx.db
        .query("ai_configs")
        .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId))
        .first();
      if (perNumberConfig) {
        return perNumberConfig;
      }
    }
    
    // Fallback to global config (phoneNumberId = undefined)
    const globalConfig = await ctx.db
      .query("ai_configs")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", undefined))
      .first();
    
    return globalConfig || DEFAULT_CONFIG;
  },
});

/**
 * Update or create AI config for a specific phone number.
 * If phoneNumberId is undefined, updates/creates the global config.
 */
export const updateConfig = mutation({
  args: {
    phoneNumberId: v.optional(v.string()),
    systemPrompt: v.string(),
    model: v.string(),
    temperature: v.optional(v.number()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Find existing config for this phoneNumberId (or global if undefined)
    const existing = await ctx.db
      .query("ai_configs")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId))
      .first();
    
    const updates = {
      phoneNumberId: args.phoneNumberId,
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
        phoneNumberId: args.phoneNumberId,
        systemPrompt: args.systemPrompt,
        model: args.model,
        isActive: args.isActive,
        updatedAt: Date.now(),
        ...(args.temperature !== undefined && { temperature: args.temperature }),
      });
    }
  },
});

/**
 * Internal query for agent: get config by phoneNumberId with fallback to global.
 */
export const getInternalConfig = internalQuery({
  args: {
    phoneNumberId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Try per-number config first
    if (args.phoneNumberId) {
      const perNumberConfig = await ctx.db
        .query("ai_configs")
        .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", args.phoneNumberId))
        .first();
      if (perNumberConfig) {
        return perNumberConfig;
      }
    }
    
    // Fallback to global config
    const globalConfig = await ctx.db
      .query("ai_configs")
      .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", undefined))
      .first();
    
    return globalConfig || DEFAULT_CONFIG;
  },
});

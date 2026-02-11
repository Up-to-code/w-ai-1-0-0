import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

const SEED_PLACEHOLDER = "from_env";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("whatsapp_numbers").collect();
  },
});

export const add = mutation({
  args: {
    businessAccountId: v.string(),
    businessNumberId: v.string(),
    phone: v.string(),
    name: v.string(),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsapp_numbers")
      .withIndex("by_business_number_id", (q) =>
        q.eq("businessNumberId", args.businessNumberId)
      )
      .first();
    if (existing) {
      throw new Error("A number with this Business Number ID already exists.");
    }
    return await ctx.db.insert("whatsapp_numbers", {
      businessAccountId: args.businessAccountId,
      businessNumberId: args.businessNumberId,
      phone: args.phone,
      name: args.name,
      accessToken: args.accessToken,
      createdAt: Date.now(),
    });
  },
});

export const getByBusinessNumberId = internalQuery({
  args: { businessNumberId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_numbers")
      .withIndex("by_business_number_id", (q) =>
        q.eq("businessNumberId", args.businessNumberId)
      )
      .first();
  },
});

/** First number that has an access token (for default config when no phoneNumberId is provided). */
export const getFirstWithToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("whatsapp_numbers").collect();
    return all.find((n) => n.accessToken?.trim()) ?? null;
  },
});

export const update = mutation({
  args: {
    id: v.id("whatsapp_numbers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    if (updates.name !== undefined) filtered.name = updates.name;
    if (updates.phone !== undefined) filtered.phone = updates.phone;
    if (updates.accessToken !== undefined) filtered.accessToken = updates.accessToken;
    if (Object.keys(filtered).length === 0) return id;
    await ctx.db.patch(id, filtered);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("whatsapp_numbers") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
    return args.id;
  },
});

/** One-time seed: if no numbers exist, insert one from env (WHATSAPP_PHONE_ID, WHATSAPP_WABA_ID). Run from Convex dashboard if needed. */
export const seedFromEnv = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("whatsapp_numbers").first();
    if (existing) return { seeded: false, message: "Numbers already exist." };
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const wabaId = process.env.WHATSAPP_WABA_ID ?? SEED_PLACEHOLDER;
    if (!phoneId) {
      throw new Error("WHATSAPP_PHONE_ID not set. Add at least one number via the Integrations page.");
    }
    await ctx.db.insert("whatsapp_numbers", {
      businessAccountId: wabaId,
      businessNumberId: phoneId,
      phone: phoneId,
      name: "رقم واتساب الرئيسي",
      createdAt: Date.now(),
    });
    return { seeded: true, message: "Seeded one number from env." };
  },
});

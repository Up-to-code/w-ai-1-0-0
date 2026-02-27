import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { throwAppError } from "./errors";
import { getProviderId } from "./utils";

export const addOptionMedia = mutation({
  args: {
    productId: v.id("sellerProducts"),
    optionKey: v.string(),
    optionValue: v.string(),
    url: v.string(),
    storageId: v.optional(v.string()),
    type: v.union(v.literal("image"), v.literal("video")),
    name: v.optional(v.string()),
    size: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");
    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");
    const existingCount = await ctx.db
      .query("productMedia")
      .withIndex("by_product", q => q.eq("productId", args.productId))
      .filter(q => q.and(
        q.eq(q.field("optionKey"), args.optionKey),
        q.eq(q.field("optionValue"), args.optionValue),
        q.eq(q.field("type"), "image")
      ))
      .collect();
    if (args.type === "image" && existingCount.length >= 2) {
      throwAppError("VALIDATION_FAILED", "Max 2 images per option value");
    }
    const id = await ctx.db.insert("productMedia", {
      providerId,
      productId: args.productId,
      optionKey: args.optionKey,
      optionValue: args.optionValue,
      url: args.url,
      storageId: args.storageId,
      type: args.type,
      name: args.name,
      size: args.size,
      width: args.width,
      height: args.height,
      duration: args.duration,
      createdAt: Date.now(),
    });
    return { success: true, mediaId: id };
  },
});

export const listOptionMedia = query({
  args: {
    productId: v.id("sellerProducts"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    const items = await ctx.db
      .query("productMedia")
      .withIndex("by_product", q => q.eq("productId", args.productId))
      .collect();
    const byKeyValue: Record<string, Record<string, any[]>> = {};
    for (const m of items) {
      if (!m.optionKey || !m.optionValue) continue;
      byKeyValue[m.optionKey] = byKeyValue[m.optionKey] || {};
      byKeyValue[m.optionKey][m.optionValue] = byKeyValue[m.optionKey][m.optionValue] || [];
      byKeyValue[m.optionKey][m.optionValue].push(m);
    }
    return byKeyValue;
  },
});

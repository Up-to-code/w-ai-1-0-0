import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { throwAppError } from "./errors";
import { getProviderId } from "./utils";

export const verifyUploadedFile = mutation({
  args: {
    url: v.string(),
    hash: v.string(),
    type: v.string(),
    storageId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");
    const apiKey = process.env.VIRUSTOTAL_API_KEY || "";
    let verified = false;
    if (apiKey) {
      try {
        const resp = await fetch(`https://www.virustotal.com/api/v3/files/${args.hash}`, {
          headers: { "x-apikey": apiKey },
        });
        if (resp.ok) {
          const json = await resp.json();
          const stats = json?.data?.attributes?.last_analysis_stats;
          verified = !!stats && (stats.malicious === 0) && (stats.suspicious === 0);
        }
      } catch (_) {
        verified = false;
      }
    }
    if (args.storageId) {
      const media = await ctx.db
        .query("productMedia")
        .withIndex("by_provider", q => q.eq("providerId", providerId))
        .filter(q => q.eq(q.field("storageId"), args.storageId))
        .first();
      if (media) {
        await ctx.db.patch(media._id, { isVerified: verified });
      }
    }
    await ctx.db.insert("auditLogs", {
      actorUserId: providerId,
      action: "VERIFY_UPLOAD",
      entityType: "productMedia",
      entityId: args.storageId || args.url,
      before: undefined,
      after: { verified },
      createdAt: Date.now(),
    });
    return { verified };
  },
});

export const cleanupOrphanMedia = mutation({
  args: {
    olderThanDays: v.number(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");
    const cutoff = Date.now() - args.olderThanDays * 24 * 60 * 60 * 1000;
    const items = await ctx.db
      .query("productMedia")
      .withIndex("by_provider", q => q.eq("providerId", providerId))
      .filter(q => q.or(
        q.eq(q.field("productId"), undefined),
        q.lt(q.field("createdAt"), cutoff)
      ))
      .collect();
    let deleted = 0;
    for (const m of items) {
      if (m.storageId) {
        await ctx.storage.delete(m.storageId);
      }
      await ctx.db.delete(m._id);
      deleted++;
    }
    return { deleted };
  },
});

export const deleteMockData = mutation({
  args: {},
  handler: async (ctx) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");
    const cats = await ctx.db
      .query("sellerCategories")
      .withIndex("by_provider", q => q.eq("providerId", providerId))
      .collect();
    for (const c of cats) {
      if (c.image && c.image.includes("images.unsplash.com")) {
        await ctx.db.patch(c._id, { image: undefined });
      }
    }
    const media = await ctx.db
      .query("productMedia")
      .withIndex("by_provider", q => q.eq("providerId", providerId))
      .collect();
    for (const m of media) {
      if (m.url.includes("images.unsplash.com")) {
        if (m.storageId) await ctx.storage.delete(m.storageId);
        await ctx.db.delete(m._id);
      }
    }
    return { success: true };
  },
});

export const getStorageUsage = query({
  args: {},
  handler: async (ctx) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");
    const media = await ctx.db
      .query("productMedia")
      .withIndex("by_provider", q => q.eq("providerId", providerId))
      .collect();
    const total = media.reduce((sum, m) => sum + (m.size || 0), 0);
    const images = media.filter(m => m.type === "image");
    const videos = media.filter(m => m.type === "video");
    return {
      totalBytes: total,
      imagesCount: images.length,
      videosCount: videos.length,
    };
  },
});

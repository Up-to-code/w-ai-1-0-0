import { query, mutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

/** Internal: get only accessToken for getWhatsAppConfig fallback. */
export const getForConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("webhook_settings").first();
    return row?.accessToken?.trim() ? { accessToken: row.accessToken } : null;
  },
});

/** Get webhook settings (singleton: first row). Verify token, access token, app ID from DB instead of env. */
export const get = query({
  args: {},
  handler: async (ctx) => {
    const row = await ctx.db.query("webhook_settings").first();
    return row
      ? {
          verifyToken: row.verifyToken ?? null,
          accessToken: row.accessToken ?? null,
          appId: row.appId ?? null,
          updatedAt: row.updatedAt,
        }
      : { verifyToken: null, accessToken: null, appId: null, updatedAt: 0 };
  },
});

/** Set webhook settings (verify token, access token, optional Meta App ID). Creates or updates singleton row. */
export const set = mutation({
  args: {
    verifyToken: v.optional(v.string()),
    accessToken: v.optional(v.string()),
    appId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const existing = await ctx.db.query("webhook_settings").first();
    const patch: Record<string, unknown> = { updatedAt: now };
    if (args.verifyToken !== undefined) patch.verifyToken = args.verifyToken?.trim() || undefined;
    if (args.accessToken !== undefined) patch.accessToken = args.accessToken?.trim() || undefined;
    if (args.appId !== undefined) patch.appId = args.appId?.trim() || undefined;
    if (existing) {
      await ctx.db.patch(existing._id, patch);
      return existing._id;
    }
    return await ctx.db.insert("webhook_settings", {
      verifyToken: args.verifyToken?.trim() || undefined,
      accessToken: args.accessToken?.trim() || undefined,
      appId: args.appId?.trim() || undefined,
      updatedAt: now,
    });
  },
});

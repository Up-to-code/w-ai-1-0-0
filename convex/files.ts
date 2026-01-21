import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

export const saveFile = mutation({
  args: {
    storageId: v.string(),
    name: v.string(),
    mimeType: v.string(),
    size: v.number(),
    category: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    // Get URL
    const url = await ctx.storage.getUrl(args.storageId);
    if (!url) throw new Error("Could not get URL for storage ID");

    // Get Current User (Mock for now, or implement auth)
    // const user = await ctx.auth.getUserIdentity();
    // if (!user) throw new Error("Unauthorized");
    const user = (await ctx.db.query("users").first()) ?? (await ctx.db.insert("users", { name: "System", role: "admin" }) && await ctx.db.query("users").first());

    const fileId = await ctx.db.insert("files", {
      storageId: args.storageId,
      url,
      name: args.name,
      mimeType: args.mimeType,
      size: args.size,
      category: args.category || "general",
      uploadedBy: user!._id,
      createdAt: Date.now()
    });

    return { fileId, url };
  },
});

export const list = query({
  args: {
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (args.category) {
      return await ctx.db
        .query("files")
        .withIndex("by_category", (q) => q.eq("category", args.category))
        .order("desc")
        .collect();
    }
    return await ctx.db.query("files").order("desc").collect();
  }
});

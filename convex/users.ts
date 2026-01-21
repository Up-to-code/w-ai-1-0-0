import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Update user profile
export const updateProfile = mutation({
  args: { 
    userId: v.id("users"),
    name: v.optional(v.string()),
    email: v.optional(v.string())
  },
  handler: async (ctx, args) => {
    const { userId, ...updates } = args;
    await ctx.db.patch(userId, updates);
    return true;
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.userId);
  },
});

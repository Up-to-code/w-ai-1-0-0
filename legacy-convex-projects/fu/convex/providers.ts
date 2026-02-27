/**
 * Providers Convex Functions
 * Queries and mutations for provider configuration
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get provider configuration by userId
 */
export const getProviderConfig = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Get user profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile || profile.isDeleted) {
      return null;
    }

    if (profile.role !== "vendor" && profile.role !== "admin") {
      return null;
    }

    // Map role to provider type and entity type
    // We now enforce "furniture_seller" for all providers
    const providerType = "furniture_seller";
    
    const entityType = "organization";

    return {
      id: profile._id,
      providerType,
      entityType,
      name: profile.businessName || profile.name || "مستخدم",
      businessName: profile.businessName,
      userId: args.userId,
    };
  },
});

/**
 * Check if user has selected a provider type
 */
export const hasProviderType = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile || profile.isDeleted) {
      return false;
    }

    return profile.role === "vendor" || profile.role === "admin";
  },
});

/**
 * Update provider configuration
 */
export const updateProviderConfig = mutation({
  args: {
    userId: v.string(),
    providerType: v.literal("furniture_seller"),
    entityType: v.union(v.literal("individual"), v.literal("organization")),
  },
  handler: async (ctx, args) => {
    // Get user profile
    let profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    const now = Date.now();

    // Create profile if it doesn't exist
    if (!profile) {
      const profileId = await ctx.db.insert("userProfiles", {
        userId: args.userId,
        role: "vendor", // Default to vendor
        name: null,
        phone: null,
        createdAt: now,
        updatedAt: now,
      });
      profile = await ctx.db.get(profileId);
      if (!profile) {
        throw new Error("Failed to create user profile");
      }
    }

    if (profile.isDeleted) {
      throw new Error("User profile is deleted");
    }

    // Always map to "vendor" role for furniture sellers
    const role = "vendor";

    // Update user profile with new role
    await ctx.db.patch(profile._id, {
      role,
      updatedAt: now,
    });

    return { success: true, role };
  },
});

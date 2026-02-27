import { query, mutation, action, internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { throwAppError } from "./errors";
import { getUserProfileByUserId, requireAuthUserId } from "./authz";
import { logAuditEvent } from "./audit";

/**
 * Get count of orders for a user
 */
export const getOrdersCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();
    return orders.length;
  },
});

/**
 * Get count of service bookings for a user
 * Note: Using orders table with a type filter if bookings are stored there
 * If you have a separate bookings table, update this query accordingly
 */
export const getBookingsCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // For now, returning 0 as bookings table doesn't exist in schema
    // If bookings are stored in orders table with a type field, filter by that
    // Example: .filter((q) => q.and(q.eq(q.field("userId"), args.userId), q.eq(q.field("type"), "booking")))
    const orders = await ctx.db
      .query("orders")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    // If bookings are a subset of orders, you can filter by status or type
    // For now, returning orders count as placeholder
    return orders.length;
  },
});

/**
 * Get count of addresses for a user
 */
export const getAddressesCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const addresses = await ctx.db
      .query("addresses")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    return addresses.length;
  },
});

/**
 * Get all addresses for a user
 * Only returns addresses if user account is not deleted
 */
export const getAddresses = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if user account is deleted
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    if (profile?.isDeleted) {
      return [];
    }

    const addresses = await ctx.db
      .query("addresses")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    return addresses;
  },
});

/**
 * Get count of favorites for a user
 */
export const getFavoritesCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    return favorites.length;
  },
});

/**
 * Get count of messages/chats for a user
 * Note: If messages table exists with userId field, use that
 * Otherwise, return 0 as placeholder
 */
export const getMessagesCount = query({
  args: {
    userId: v.string(),
  },
  handler: async (_ctx, _args) => {
    // If you have a messages table with userId field:
    // const messages = await ctx.db
    //   .query("messages")
    //   .filter((q) => q.eq(q.field("userId"), args.userId))
    //   .collect();
    // return messages.length;
    
    // For now, return 0 as placeholder
    // Update this when messages table structure is defined
    return 0;
  },
});

/**
 * Get user profile by userId
 * Returns null if account is deleted
 */
export const getUserProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    // If profile doesn't exist or is deleted, return default with "customer" role
    if (!profile || profile.isDeleted) {
      return {
        userId: args.userId,
        role: "customer",
        name: null,
        phone: null,
        language: null,
      };
    }
    
    return profile;
  },
});

export const getSellerProfile = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
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

    return profile;
  },
});

export const ensureSellerInitialized = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const userId = user?._id;
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      return existingProfile;
    }

    const now = Date.now();
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role: "vendor",
      name: args.name ?? null,
      phone: null,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(profileId);
  },
});

/**
 * Update user profile information
 * Auto-creates profile if it doesn't exist with default "customer" role
 */
export const ensureUserInitialized = mutation({
  args: {
    name: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const userId = user?._id;
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    if (existingProfile) {
      return existingProfile;
    }

    const now = Date.now();
    // Default to "vendor" role for Seller App users
    const profileId = await ctx.db.insert("userProfiles", {
      userId,
      role: "vendor",
      name: args.name ?? null,
      phone: null,
      createdAt: now,
      updatedAt: now,
    });

    return await ctx.db.get(profileId);
  },
});

export const updateUserProfile = mutation({
  args: {
    userId: v.string(),
    name: v.optional(v.string()),
    businessName: v.optional(v.string()),
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    role: v.optional(v.string()),
    language: v.optional(v.string()),
    expectedUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const actorUserId = await requireAuthUserId(ctx);
    const actorProfile = await getUserProfileByUserId(ctx, actorUserId);
    const isAdmin = actorProfile?.role === "admin" && !actorProfile?.isDeleted;

    if (!isAdmin && actorUserId !== args.userId) {
      throwAppError("FORBIDDEN", "Forbidden");
    }

    if (args.role !== undefined && !isAdmin) {
      throwAppError("FORBIDDEN", "Forbidden");
    }

    if (args.name !== undefined) {
      const name = args.name?.trim() ?? "";
      if (name && (name.length < 2 || name.length > 50)) {
        throwAppError("VALIDATION_FAILED", "Invalid name");
      }
    }
    if (args.businessName !== undefined) {
      const businessName = args.businessName?.trim() ?? "";
      if (businessName && (businessName.length < 2 || businessName.length > 100)) {
        throwAppError("VALIDATION_FAILED", "Invalid business name");
      }
    }
    if (args.phone !== undefined) {
      const phone = args.phone?.trim() ?? "";
      if (phone && (phone.length < 8 || phone.length > 20)) {
        throwAppError("VALIDATION_FAILED", "Invalid phone");
      }
    }
    if (args.language !== undefined) {
      const language = args.language?.trim() ?? "";
      if (language && language.length > 10) {
        throwAppError("VALIDATION_FAILED", "Invalid language");
      }
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();
    
    const now = Date.now();
    
    if (existingProfile) {
      if (existingProfile.isDeleted) {
        throwAppError("NOT_FOUND", "Profile not found");
      }

      if (args.expectedUpdatedAt !== undefined && existingProfile.updatedAt !== args.expectedUpdatedAt) {
        throwAppError("CONFLICT", "Data has been modified by another user");
      }

      const before = {
        name: existingProfile.name,
        businessName: existingProfile.businessName,
        phone: existingProfile.phone,
        role: existingProfile.role,
        language: existingProfile.language,
        updatedAt: existingProfile.updatedAt,
      };

      await ctx.db.patch(existingProfile._id, {
        ...(args.name !== undefined && { name: (args.name?.trim() || null) as any }),
        ...(args.businessName !== undefined && { businessName: args.businessName?.trim() || undefined }),
        ...(args.phone !== undefined && { phone: (args.phone?.trim() || null) as any }),
        ...(args.role !== undefined && { role: args.role }),
        ...(args.language !== undefined && { language: args.language?.trim() || undefined }),
        updatedAt: now,
      });

      const after = {
        ...before,
        ...(args.name !== undefined ? { name: args.name?.trim() || null } : {}),
        ...(args.businessName !== undefined ? { businessName: args.businessName?.trim() || undefined } : {}),
        ...(args.phone !== undefined ? { phone: args.phone?.trim() || null } : {}),
        ...(args.role !== undefined ? { role: args.role } : {}),
        ...(args.language !== undefined ? { language: args.language?.trim() || undefined } : {}),
        updatedAt: now,
      };

      await logAuditEvent(ctx, {
        actorUserId,
        action: "update",
        entityType: "userProfiles",
        entityId: existingProfile._id,
        before,
        after,
      });
      return { success: true, profileId: existingProfile._id };
    } else {
      const role = isAdmin ? (args.role || "vendor") : "vendor";
      const profileId = await ctx.db.insert("userProfiles", {
        userId: args.userId,
        role,
        name: args.name?.trim() || null,
        businessName: args.businessName?.trim() || undefined,
        phone: args.phone?.trim() || null,
        language: args.language?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
      });

      await logAuditEvent(ctx, {
        actorUserId,
        action: "create",
        entityType: "userProfiles",
        entityId: profileId,
        after: { userId: args.userId, role },
      });
      return { success: true, profileId };
    }
  },
});

export const upgradeToVendor = mutation({
  args: {
    businessName: v.string(),
    phone: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const userId = user?._id;
    if (!userId) {
      throw new Error("Unauthenticated");
    }

    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .first();

    const now = Date.now();

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        role: "vendor",
        businessName: args.businessName,
        phone: args.phone,
        language: args.language,
        updatedAt: now,
      });
      return { success: true, profileId: existingProfile._id, role: "vendor" };
    } else {
      const profileId = await ctx.db.insert("userProfiles", {
        userId,
        role: "vendor",
        name: null,
        businessName: args.businessName,
        phone: args.phone,
        language: args.language,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, profileId, role: "vendor" };
    }
  },
});

/**
 * Get single address by ID
 */
export const getAddress = query({
  args: {
    addressId: v.id("addresses"),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.addressId);
    
    if (!address) {
      throw new Error("Address not found");
    }

    return address;
  },
});

/**
 * Create a new address
 * If isDefault is true, unset other addresses as default
 */
export const createAddress = mutation({
  args: {
    userId: v.string(),
    label: v.string(),
    street: v.string(),
    city: v.string(),
    country: v.string(),
    district: v.optional(v.string()),
    details: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    // If setting as default, unset other addresses
    if (args.isDefault) {
      const otherAddresses = await ctx.db
        .query("addresses")
        .filter((q) => q.eq(q.field("userId"), args.userId))
        .collect();
      
      for (const addr of otherAddresses) {
        await ctx.db.patch(addr._id, { isDefault: false });
      }
    }

    const addressId = await ctx.db.insert("addresses", {
      userId: args.userId,
      label: args.label,
      street: args.street,
      city: args.city,
      country: args.country,
      district: args.district,
      details: args.details,
      isDefault: args.isDefault || false,
    });

    return { success: true, addressId };
  },
});

/**
 * Update an existing address
 * If isDefault is true, unset other addresses as default
 */
export const updateAddress = mutation({
  args: {
    addressId: v.id("addresses"),
    label: v.optional(v.string()),
    street: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    district: v.optional(v.string()),
    details: v.optional(v.string()),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.addressId);
    
    if (!address) {
      throw new Error("Address not found");
    }

    // If setting as default, unset other addresses for the same user
    if (args.isDefault) {
      const otherAddresses = await ctx.db
        .query("addresses")
        .filter((q) => 
          q.and(
            q.eq(q.field("userId"), address.userId),
            q.neq(q.field("_id"), args.addressId)
          )
        )
        .collect();
      
      for (const addr of otherAddresses) {
        await ctx.db.patch(addr._id, { isDefault: false });
      }
    }

    // Update address fields
    const updates: any = {};
    if (args.label !== undefined) updates.label = args.label;
    if (args.street !== undefined) updates.street = args.street;
    if (args.city !== undefined) updates.city = args.city;
    if (args.country !== undefined) updates.country = args.country;
    if (args.district !== undefined) updates.district = args.district;
    if (args.details !== undefined) updates.details = args.details;
    if (args.isDefault !== undefined) updates.isDefault = args.isDefault;

    await ctx.db.patch(args.addressId, updates);

    return { success: true };
  },
});

/**
 * Delete an address by Convex _id
 */
export const deleteAddress = mutation({
  args: {
    addressId: v.id("addresses"),
  },
  handler: async (ctx, args) => {
    const address = await ctx.db.get(args.addressId);
    
    if (!address) {
      throw new Error("Address not found");
    }

    await ctx.db.delete(args.addressId);
    return { success: true };
  },
});

/**
 * Generate upload URL for profile image
 */
export const generateUploadUrl = action({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Update profile image - stores new imageStorageId and removes old one
 */
export const updateProfileImage = mutation({
  args: {
    userId: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const existingProfile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    const now = Date.now();

    // Delete old image from storage if it exists
    if (existingProfile?.imageStorageId) {
      try {
        await ctx.storage.delete(existingProfile.imageStorageId);
      } catch (error) {
        // Ignore errors if old image doesn't exist
        console.log("Error deleting old image:", error);
      }
    }

    if (existingProfile) {
      await ctx.db.patch(existingProfile._id, {
        imageStorageId: args.storageId,
        updatedAt: now,
      });
      return { success: true, profileId: existingProfile._id };
    } else {
      // Create new profile with default "customer" role
      const profileId = await ctx.db.insert("userProfiles", {
        userId: args.userId,
        role: "vendor",
        name: null,
        phone: null,
        imageStorageId: args.storageId,
        createdAt: now,
        updatedAt: now,
      });
      return { success: true, profileId };
    }
  },
});

/**
 * Get profile image URL from storage
 */
export const getProfileImageUrl = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile?.imageStorageId) {
      return null;
    }

    return await ctx.storage.getUrl(profile.imageStorageId);
  },
});

/**
 * Get all favorites for a user
 */
export const getFavorites = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorites = await ctx.db
      .query("favorites")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    
    return favorites;
  },
});

/**
 * Add a product to favorites
 * Checks for duplicates before adding
 */
export const addFavorite = mutation({
  args: {
    userId: v.string(),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if already exists
    const existing = await ctx.db
      .query("favorites")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("productId"), args.productId)
        )
      )
      .first();

    if (existing) {
      return { success: true, alreadyExists: true };
    }

    await ctx.db.insert("favorites", {
      userId: args.userId,
      productId: args.productId,
    });

    return { success: true, alreadyExists: false };
  },
});

/**
 * Remove a product from favorites
 */
export const removeFavorite = mutation({
  args: {
    userId: v.string(),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const favorite = await ctx.db
      .query("favorites")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("productId"), args.productId)
        )
      )
      .first();

    if (!favorite) {
      throw new Error("Favorite not found");
    }

    await ctx.db.delete(favorite._id);
    return { success: true };
  },
});

/**
 * Toggle favorite status
 * Adds if not exists, removes if exists
 */
export const toggleFavorite = mutation({
  args: {
    userId: v.string(),
    productId: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("favorites")
      .filter((q) => 
        q.and(
          q.eq(q.field("userId"), args.userId),
          q.eq(q.field("productId"), args.productId)
        )
      )
      .first();

    if (existing) {
      // Remove if exists
      await ctx.db.delete(existing._id);
      return { isFavorite: false };
    } else {
      // Add if doesn't exist
      await ctx.db.insert("favorites", {
        userId: args.userId,
        productId: args.productId,
      });
      return { isFavorite: true };
    }
  },
});

/**
 * Soft delete user account
 * Marks account for deletion but doesn't delete immediately
 */
export const softDeleteAccount = mutation({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!profile) {
      throw new Error("User profile not found");
    }

    const now = Date.now();
    await ctx.db.patch(profile._id, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
    });

    await logAuditEvent(ctx, {
      actorUserId: args.userId,
      action: "delete",
      entityType: "userProfiles",
      entityId: profile._id,
    });

    return { success: true };
  },
});

/**
 * Validate if user can create an order
 * Checks for required fields: phone and address
 * Note: Phone might be stored in SQLite (phone1/phone2), so we check the phone field in Convex
 * which should be synced from SQLite. For complete validation, frontend should also check SQLite.
 */
export const validateOrderCreation = query({
  args: {
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!profile || profile.isDeleted) {
      return {
        canCreate: false,
        missingFields: ["phone", "address"],
      };
    }

    const missingFields: string[] = [];
    
    // Check for phone number (phone field in Convex - synced from SQLite)
    if (!profile.phone || profile.phone.trim() === '') {
      missingFields.push("phone");
    }

    // Check for at least one address
    const addresses = await ctx.db
      .query("addresses")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    if (addresses.length === 0) {
      missingFields.push("address");
    }

    return {
      canCreate: missingFields.length === 0,
      missingFields,
    };
  },
});

/**
 * Internal mutation to hard delete expired accounts
 * Called by cron job to permanently delete accounts marked for deletion > 15 days ago
 */
export const hardDeleteExpiredAccounts = internalMutation({
  args: {},
  handler: async (ctx) => {
    const fifteenDaysAgo = Date.now() - (15 * 24 * 60 * 60 * 1000);
    
    // Find all accounts marked for deletion more than 15 days ago
    const expiredAccounts = await ctx.db
      .query("userProfiles")
      .filter((q) => 
        q.and(
          q.eq(q.field("isDeleted"), true),
          q.lt(q.field("deletedAt"), fifteenDaysAgo)
        )
      )
      .collect();

    for (const account of expiredAccounts) {
      const userId = account.userId;

      // Delete all addresses
      const addresses = await ctx.db
        .query("addresses")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
      for (const address of addresses) {
        await ctx.db.delete(address._id);
      }

      // Delete all favorites
      const favorites = await ctx.db
        .query("favorites")
        .filter((q) => q.eq(q.field("userId"), userId))
        .collect();
      for (const favorite of favorites) {
        await ctx.db.delete(favorite._id);
      }

      // Delete profile image from storage if exists
      if (account.imageStorageId) {
        try {
          await ctx.storage.delete(account.imageStorageId);
        } catch (error) {
          console.log("Error deleting profile image:", error);
        }
      }

      // Delete user profile (hard delete)
      await ctx.db.delete(account._id);
    }

    return { deletedCount: expiredAccounts.length };
  },
});

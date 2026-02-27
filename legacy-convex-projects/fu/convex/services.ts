/**
 * Services Convex Functions
 * Queries and mutations for service management
 */

import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Get all services for a provider
 */
export const getServices = query({
  args: {
    providerId: v.string(),
    categoryId: v.optional(v.id("serviceCategories")),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    let servicesQuery = ctx.db
      .query("services")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId));

    const services = await servicesQuery.collect();

    // Apply filters
    let filtered = services;

    if (args.categoryId !== undefined) {
      filtered = filtered.filter((s) => s.categoryId === args.categoryId);
    }

    if (args.isActive !== undefined) {
      filtered = filtered.filter((s) => s.isActive === args.isActive);
    }

    return filtered;
  },
});

/**
 * Get single service by ID
 */
export const getService = query({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }

    return service;
  },
});

/**
 * Get all service categories
 */
export const getServiceCategories = query({
  args: {},
  handler: async (ctx) => {
    const categories = await ctx.db
      .query("serviceCategories")
      .collect();
    
    // Sort by order
    return categories.sort((a, b) => a.order - b.order);
  },
});

/**
 * Get reviews for a service
 */
export const getServiceReviews = query({
  args: {
    serviceId: v.id("services"),
  },
  handler: async (ctx, args) => {
    const reviews = await ctx.db
      .query("serviceReviews")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .collect();
    
    // Sort by creation date (newest first)
    return reviews.sort((a, b) => b.createdAt - a.createdAt);
  },
});

/**
 * Create a new service
 */
export const createService = mutation({
  args: {
    providerId: v.string(),
    name: v.string(),
    nameEn: v.string(),
    description: v.string(),
    categoryId: v.id("serviceCategories"),
    price: v.number(),
    priceType: v.union(v.literal("fixed"), v.literal("hourly"), v.literal("range")),
    priceRange: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    images: v.array(v.string()),
    location: v.string(),
    locationType: v.union(v.literal("home"), v.literal("provider_location"), v.literal("remote")),
    duration: v.optional(v.number()),
    experienceYears: v.optional(v.number()),
    languages: v.array(v.string()),
    responseTime: v.optional(v.string()),
    isActive: v.boolean(),
    verified: v.boolean(),
  },
  handler: async (ctx, args) => {
    // Validate provider exists
    const profile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.providerId))
      .first();

    if (!profile || profile.isDeleted) {
      throw new Error("Provider not found or deleted");
    }

    // Validate category exists
    const category = await ctx.db.get(args.categoryId);
    if (!category) {
      throw new Error("Service category not found");
    }

    // Validate price range if priceType is "range"
    if (args.priceType === "range" && !args.priceRange) {
      throw new Error("Price range is required when price type is 'range'");
    }

    const now = Date.now();

    const serviceId = await ctx.db.insert("services", {
      providerId: args.providerId,
      name: args.name,
      nameEn: args.nameEn,
      description: args.description,
      categoryId: args.categoryId,
      price: args.price,
      priceType: args.priceType,
      priceRange: args.priceRange,
      images: args.images,
      location: args.location,
      locationType: args.locationType,
      duration: args.duration,
      experienceYears: args.experienceYears,
      languages: args.languages,
      responseTime: args.responseTime,
      isActive: args.isActive,
      verified: args.verified,
      rating: undefined,
      reviewsCount: undefined,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, serviceId };
  },
});

/**
 * Update an existing service
 */
export const updateService = mutation({
  args: {
    serviceId: v.id("services"),
    providerId: v.string(), // For authorization check
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    categoryId: v.optional(v.id("serviceCategories")),
    price: v.optional(v.number()),
    priceType: v.optional(v.union(v.literal("fixed"), v.literal("hourly"), v.literal("range"))),
    priceRange: v.optional(v.object({
      min: v.number(),
      max: v.number(),
    })),
    images: v.optional(v.array(v.string())),
    location: v.optional(v.string()),
    locationType: v.optional(v.union(v.literal("home"), v.literal("provider_location"), v.literal("remote"))),
    duration: v.optional(v.number()),
    experienceYears: v.optional(v.number()),
    languages: v.optional(v.array(v.string())),
    responseTime: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }

    // Check authorization
    if (service.providerId !== args.providerId) {
      throw new Error("Unauthorized: You can only update your own services");
    }

    // Validate category if provided
    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category) {
        throw new Error("Service category not found");
      }
    }

    // Build update object
    const updates: any = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.nameEn !== undefined) updates.nameEn = args.nameEn;
    if (args.description !== undefined) updates.description = args.description;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.price !== undefined) updates.price = args.price;
    if (args.priceType !== undefined) updates.priceType = args.priceType;
    if (args.priceRange !== undefined) updates.priceRange = args.priceRange;
    if (args.images !== undefined) updates.images = args.images;
    if (args.location !== undefined) updates.location = args.location;
    if (args.locationType !== undefined) updates.locationType = args.locationType;
    if (args.duration !== undefined) updates.duration = args.duration;
    if (args.experienceYears !== undefined) updates.experienceYears = args.experienceYears;
    if (args.languages !== undefined) updates.languages = args.languages;
    if (args.responseTime !== undefined) updates.responseTime = args.responseTime;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    
    updates.updatedAt = Date.now();

    await ctx.db.patch(args.serviceId, updates);

    return { success: true };
  },
});

/**
 * Delete a service (soft delete by setting isActive to false)
 */
export const deleteService = mutation({
  args: {
    serviceId: v.id("services"),
    providerId: v.string(), // For authorization check
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }

    // Check authorization
    if (service.providerId !== args.providerId) {
      throw new Error("Unauthorized: You can only delete your own services");
    }

    // Soft delete by setting isActive to false
    await ctx.db.patch(args.serviceId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});

/**
 * Toggle service active status
 */
export const toggleServiceActive = mutation({
  args: {
    serviceId: v.id("services"),
    providerId: v.string(), // For authorization check
  },
  handler: async (ctx, args) => {
    const service = await ctx.db.get(args.serviceId);
    
    if (!service) {
      throw new Error("Service not found");
    }

    // Check authorization
    if (service.providerId !== args.providerId) {
      throw new Error("Unauthorized: You can only toggle your own services");
    }

    await ctx.db.patch(args.serviceId, {
      isActive: !service.isActive,
      updatedAt: Date.now(),
    });

    return { success: true, isActive: !service.isActive };
  },
});

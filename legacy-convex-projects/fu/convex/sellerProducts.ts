import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { throwAppError } from "./errors";
import { computeCombinationKey, getProviderId, normalizeStringRecord } from "./utils";

export const listSellerProducts = query({
  args: {
    providerId: v.string(),
    categoryId: v.optional(v.id("sellerCategories")),
    status: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 200);
    const q = ctx.db
      .query("sellerProducts")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .order("desc");

    const page = await q.paginate({ cursor: args.cursor ?? null, numItems: limit });
    let items = args.includeDeleted ? page.page : page.page.filter((p) => !p.isDeleted);

    if (args.categoryId) items = items.filter((p) => p.categoryId === args.categoryId);
    if (args.status) items = items.filter((p) => p.status === args.status);

    return { ...page, page: items };
  },
});

export const getSellerProduct = query({
  args: {
    productId: v.id("sellerProducts"),
  },
  handler: async (ctx, args) => {
    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    
    // Fetch variants
    const variants = await ctx.db
      .query("sellerProductVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return { ...product, variants };
  },
});

export const createSellerProduct = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.number(),
    comparePrice: v.optional(v.number()),
    stock: v.number(),
    status: v.string(),
    categoryId: v.optional(v.id("sellerCategories")),
    style: v.optional(v.string()),
    sku: v.optional(v.string()),
    image: v.string(),
    images: v.array(v.string()),
    video: v.optional(v.string()),
    videos: v.optional(v.array(v.string())),
    variants: v.optional(v.array(v.object({
      combination: v.any(),
      price: v.number(),
      stock: v.number(),
      sku: v.optional(v.string()),
      image: v.optional(v.string()),
      images: v.optional(v.array(v.string())),
      isActive: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    if (!args.name.trim()) throwAppError("VALIDATION_FAILED", "Product name is required");
    if (args.price < 0) throwAppError("VALIDATION_FAILED", "Invalid price");
    if (args.comparePrice !== undefined && args.comparePrice < 0) throwAppError("VALIDATION_FAILED", "Invalid compare price");
    if (args.stock < 0) throwAppError("VALIDATION_FAILED", "Invalid stock");
    if (!args.image) throwAppError("VALIDATION_FAILED", "Product image is required");
    if ((args.images ?? []).length > 5) throwAppError("VALIDATION_FAILED", "Max 5 images allowed");
    if ((args.videos ?? []).length > 1) throwAppError("VALIDATION_FAILED", "Max 1 video allowed");

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.isDeleted) throwAppError("NOT_FOUND", "Category not found");
      if (category.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");
    }

    const now = Date.now();
    const productId = await ctx.db.insert("sellerProducts", {
      providerId,
      name: args.name.trim(),
      nameEn: args.nameEn?.trim(),
      description: args.description?.trim(),
      price: args.price,
      comparePrice: args.comparePrice,
      stock: args.stock,
      status: args.status,
      categoryId: args.categoryId,
      style: args.style,
      sku: args.sku,
      image: args.image,
      images: args.images,
      video: args.video,
      videos: args.videos,
      sales: 0,
      views: 0,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    // Create variants if provided
    if (args.variants && args.variants.length > 0) {
      await Promise.all(args.variants.map(variant => 
        ctx.db.insert("sellerProductVariants", {
          productId,
          providerId,
          combination: normalizeStringRecord(variant.combination),
          combinationKey: computeCombinationKey(normalizeStringRecord(variant.combination)),
          price: variant.price,
          stock: variant.stock,
          sku: variant.sku,
          image: variant.image,
          images: variant.images,
          isActive: variant.isActive ?? true,
          createdAt: now,
          updatedAt: now,
        })
      ));
    }

    return { success: true, productId };
  },
});

export const updateSellerProduct = mutation({
  args: {
    productId: v.id("sellerProducts"),
    expectedUpdatedAt: v.optional(v.number()),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    price: v.optional(v.number()),
    comparePrice: v.optional(v.number()),
    stock: v.optional(v.number()),
    status: v.optional(v.string()),
    categoryId: v.optional(v.id("sellerCategories")),
    style: v.optional(v.string()),
    sku: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    video: v.optional(v.string()),
    videos: v.optional(v.array(v.string())),
    variants: v.optional(v.array(v.object({
      combination: v.any(),
      price: v.number(),
      stock: v.number(),
      sku: v.optional(v.string()),
      image: v.optional(v.string()),
      images: v.optional(v.array(v.string())),
      isActive: v.boolean(),
    }))),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    if (args.expectedUpdatedAt !== undefined && product.updatedAt !== args.expectedUpdatedAt) {
      throwAppError("CONFLICT", "CONFLICT");
    }

    if (args.price !== undefined && args.price < 0) throwAppError("VALIDATION_FAILED", "Invalid price");
    if (args.comparePrice !== undefined && args.comparePrice < 0) throwAppError("VALIDATION_FAILED", "Invalid compare price");
    if (args.stock !== undefined && args.stock < 0) throwAppError("VALIDATION_FAILED", "Invalid stock");
    if (args.images !== undefined && args.images.length > 5) throwAppError("VALIDATION_FAILED", "Max 5 images allowed");
    if (args.videos !== undefined && args.videos.length > 1) throwAppError("VALIDATION_FAILED", "Max 1 video allowed");

    if (args.categoryId) {
      const category = await ctx.db.get(args.categoryId);
      if (!category || category.isDeleted) throwAppError("NOT_FOUND", "Category not found");
      if (category.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.nameEn !== undefined) updates.nameEn = args.nameEn?.trim();
    if (args.description !== undefined) updates.description = args.description?.trim();
    if (args.price !== undefined) updates.price = args.price;
    if (args.comparePrice !== undefined) updates.comparePrice = args.comparePrice;
    if (args.stock !== undefined) updates.stock = args.stock;
    if (args.status !== undefined) updates.status = args.status;
    if (args.categoryId !== undefined) updates.categoryId = args.categoryId;
    if (args.style !== undefined) updates.style = args.style;
    if (args.sku !== undefined) updates.sku = args.sku;
    if (args.image !== undefined) updates.image = args.image;
    if (args.images !== undefined) updates.images = args.images;
    if (args.video !== undefined) updates.video = args.video;
    if (args.videos !== undefined) updates.videos = args.videos;

    await ctx.db.patch(args.productId, updates);

    // Update variants if provided
    if (args.variants) {
      const now = Date.now();
      const existingVariants = await ctx.db
        .query("sellerProductVariants")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect();

      const existingByKey = new Map(existingVariants.map((v) => [v.combinationKey, v]));
      const incomingKeys = new Set<string>();

      for (const variant of args.variants) {
        const combination = normalizeStringRecord(variant.combination);
        const combinationKey = computeCombinationKey(combination);
        if (!combinationKey) continue;
        incomingKeys.add(combinationKey);

        const existing = existingByKey.get(combinationKey);
        if (existing) {
          await ctx.db.patch(existing._id, {
            combination,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku,
            image: variant.image,
            images: variant.images,
            isActive: variant.isActive ?? true,
            updatedAt: now,
          });
        } else {
          await ctx.db.insert("sellerProductVariants", {
            productId: args.productId,
            providerId,
            combination,
            combinationKey,
            price: variant.price,
            stock: variant.stock,
            sku: variant.sku,
            image: variant.image,
            images: variant.images,
            isActive: variant.isActive ?? true,
            createdAt: now,
            updatedAt: now,
          });
        }
      }

      for (const existing of existingVariants) {
        if (!incomingKeys.has(existing.combinationKey) && existing.isActive) {
          await ctx.db.patch(existing._id, { isActive: false, updatedAt: now });
        }
      }
    }

    return { success: true };
  },
});

export const deleteSellerProduct = mutation({
  args: {
    productId: v.id("sellerProducts"),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    await ctx.db.patch(args.productId, { isDeleted: true, updatedAt: Date.now() });
    return { success: true };
  },
});

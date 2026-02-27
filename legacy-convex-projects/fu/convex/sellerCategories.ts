import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { throwAppError } from "./errors";

export const listSellerCategories = query({
  args: {
    providerId: v.string(),
    includeDeleted: v.optional(v.boolean()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 50, 1), 200);
    const q = ctx.db
      .query("sellerCategories")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .order("desc");

    const page = await q.paginate({ cursor: args.cursor ?? null, numItems: limit });
    const items = args.includeDeleted
      ? page.page
      : page.page.filter((c) => !c.isDeleted);

    return { ...page, page: items };
  },
});

export const createSellerCategory = mutation({
  args: {
    name: v.string(),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    image: v.optional(v.string()),
    icon: v.optional(v.string()),
    style: v.optional(v.string()),
    parentId: v.optional(v.id("sellerCategories")),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?.userId;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    if (!args.name.trim() || args.name.trim().length < 2) {
      throwAppError("VALIDATION_FAILED", "Category name is required");
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.isDeleted) throwAppError("NOT_FOUND", "Parent category not found");
      if (parent.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");
    }

    const now = Date.now();
    const categoryId = await ctx.db.insert("sellerCategories", {
      providerId,
      name: args.name.trim(),
      nameEn: args.nameEn?.trim(),
      description: args.description?.trim(),
      imageUrl: args.imageUrl,
      image: args.image,
      icon: args.icon,
      style: args.style,
      products: 0,
      parentId: args.parentId,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, categoryId };
  },
});

export const seedDefaultSellerCategories = mutation({
  args: {},
  handler: async () => {
    // Deprecated: Use importGlobalCategory or createSellerCategory instead
    return { seeded: false, categoryIds: [] as string[] };
  },
});

export const importGlobalCategory = mutation({
  args: {
    globalCategoryId: v.id("globalCategories"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?.userId;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const globalCategory = await ctx.db.get(args.globalCategoryId);
    if (!globalCategory) throwAppError("NOT_FOUND", "Global category not found");

    // Check if already imported
    const existing = await ctx.db
        .query("sellerCategories")
        .withIndex("by_provider", (q) => q.eq("providerId", providerId))
        .filter((q) => q.eq(q.field("globalCategoryId"), args.globalCategoryId))
        .filter((q) => q.eq(q.field("isDeleted"), false))
        .first();

    if (existing) return { success: false, message: "Category already imported", categoryId: existing._id };

    const now = Date.now();
    const categoryId = await ctx.db.insert("sellerCategories", {
      providerId,
      name: globalCategory.name,
      nameEn: globalCategory.nameEn,
      description: globalCategory.description,
      image: globalCategory.image,
      icon: globalCategory.icon,
      style: globalCategory.style,
      products: 0,
      globalCategoryId: args.globalCategoryId,
      isSystem: true,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, categoryId };
  },
});

export const updateSellerCategory = mutation({
  args: {
    categoryId: v.id("sellerCategories"),
    name: v.optional(v.string()),
    nameEn: v.optional(v.string()),
    description: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    image: v.optional(v.string()),
    icon: v.optional(v.string()),
    style: v.optional(v.string()),
    products: v.optional(v.number()),
    parentId: v.optional(v.id("sellerCategories")),
    expectedUpdatedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?.userId;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throwAppError("NOT_FOUND", "Category not found");
    if (category.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    if (args.expectedUpdatedAt !== undefined && category.updatedAt !== args.expectedUpdatedAt) {
      throwAppError("CONFLICT", "CONFLICT");
    }

    if (args.parentId) {
      const parent = await ctx.db.get(args.parentId);
      if (!parent || parent.isDeleted) throwAppError("NOT_FOUND", "Parent category not found");
      if (parent.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.nameEn !== undefined) updates.nameEn = args.nameEn?.trim();
    if (args.description !== undefined) updates.description = args.description?.trim();
    if (args.imageUrl !== undefined) updates.imageUrl = args.imageUrl;
    if (args.image !== undefined) updates.image = args.image;
    if (args.icon !== undefined) updates.icon = args.icon;
    if (args.style !== undefined) updates.style = args.style;
    if (args.products !== undefined) updates.products = args.products;
    if (args.parentId !== undefined) updates.parentId = args.parentId;

    await ctx.db.patch(args.categoryId, updates);
    return { success: true };
  },
});

export const deleteSellerCategory = mutation({
  args: {
    categoryId: v.id("sellerCategories"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?.userId;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throwAppError("NOT_FOUND", "Category not found");
    if (category.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    await ctx.db.patch(args.categoryId, { isDeleted: true, updatedAt: Date.now() });
    return { success: true };
  },
});

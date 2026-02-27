import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { getProviderId } from "./utils";
import { throwAppError } from "./errors";

// Helper to log actions
async function logAudit(ctx: any, actorUserId: string | undefined, action: string, entityType: string, entityId: string, details?: { before?: any; after?: any }) {
  await ctx.db.insert("auditLogs", {
    actorUserId: actorUserId || "unknown",
    action,
    entityType,
    entityId,
    before: details?.before,
    after: details?.after,
    createdAt: Date.now(),
  });
}

// Media Logic

export const addProductMedia = mutation({
  args: {
    productId: v.id("sellerProducts"),
    url: v.string(),
    storageId: v.optional(v.string()),
    type: v.union(v.literal("image"), v.literal("video")),
    name: v.optional(v.string()),
    size: v.optional(v.number()),
    width: v.optional(v.number()),
    height: v.optional(v.number()),
    duration: v.optional(v.number()),
    isMain: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    // If setting as main, unset others
    if (args.isMain) {
        const existingMain = await ctx.db
            .query("productMedia")
            .withIndex("by_product", (q) => q.eq("productId", args.productId))
            .filter((q) => q.eq(q.field("isMain"), true))
            .collect();
        
        for (const media of existingMain) {
            await ctx.db.patch(media._id, { isMain: false });
        }
    }

    const mediaId = await ctx.db.insert("productMedia", {
        providerId,
        productId: args.productId,
        url: args.url,
        storageId: args.storageId,
        type: args.type,
        name: args.name,
        size: args.size,
        width: args.width,
        height: args.height,
        duration: args.duration,
        isMain: args.isMain,
        createdAt: Date.now(),
    });

    await logAudit(ctx, (user as any)?.userId ?? (user as any)?.id ?? (user as any)?._id, "ADD_MEDIA", "productMedia", mediaId, { after: args });

    return { success: true, mediaId };
  },
});

export const removeProductMedia = mutation({
    args: {
        mediaId: v.id("productMedia"),
    },
    handler: async (ctx, args) => {
        const user = await authComponent.getAuthUser(ctx);
        const providerId = await getProviderId(ctx);
        if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

        const media = await ctx.db.get(args.mediaId);
        if (!media) throwAppError("NOT_FOUND", "Media not found");
        if (media.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

        // Delete from storage if ID exists
        if (media.storageId) {
            await ctx.storage.delete(media.storageId);
        }

        await ctx.db.delete(args.mediaId);
        await logAudit(ctx, (user as any)?.userId ?? (user as any)?.id ?? (user as any)?._id, "DELETE_MEDIA", "productMedia", args.mediaId, { before: media });

        return { success: true };
    }
});

// Cascading Deletion Logic for Products

export const deleteSellerProductCascading = mutation({
  args: {
    productId: v.id("sellerProducts"),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    // 1. Fetch all associated media
    const allMedia = await ctx.db
        .query("productMedia")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect();

    // 2. Delete media files from storage and DB
    for (const media of allMedia) {
        if (media.storageId) {
            await ctx.storage.delete(media.storageId);
        }
        await ctx.db.delete(media._id);
    }

    // 3. Delete (or soft-delete) the product
    await ctx.db.patch(args.productId, { isDeleted: true, updatedAt: Date.now() });

    // 4. Update Category count (decrement)
    if (product.categoryId) {
        const category = await ctx.db.get(product.categoryId);
        if (category && (category.products || 0) > 0) {
            await ctx.db.patch(product.categoryId, { products: (category.products || 1) - 1 });
        }
    }

    await logAudit(ctx, (user as any)?.userId ?? (user as any)?.id ?? (user as any)?._id, "DELETE_PRODUCT_CASCADE", "sellerProducts", args.productId, { before: product });

    return { success: true, deletedMediaCount: allMedia.length };
  },
});

// Advanced Category Deletion with Cascade Option

export const deleteSellerCategoryCascading = mutation({
  args: {
    categoryId: v.id("sellerCategories"),
    deleteProducts: v.boolean(), // Checkbox value
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const category = await ctx.db.get(args.categoryId);
    if (!category || category.isDeleted) throwAppError("NOT_FOUND", "Category not found");
    if (category.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");
    // Removed strict system check as 'importGlobalCategory' creates copies with isSystem=true but owned by provider
    // if (category.isSystem) throwAppError("FORBIDDEN", "Cannot delete system categories");

    let deletedProductCount = 0;

    // Cascade delete products if requested
    if (args.deleteProducts) {
        const products = await ctx.db
            .query("sellerProducts")
            .withIndex("by_provider_and_deleted", (q) => q.eq("providerId", providerId).eq("isDeleted", false))
            .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
            .collect();

        for (const product of products) {
            // Reuse logic: fetch media -> delete storage -> delete media records -> delete product
            const allMedia = await ctx.db
                .query("productMedia")
                .withIndex("by_product", (q) => q.eq("productId", product._id))
                .collect();
            
            for (const media of allMedia) {
                if (media.storageId) await ctx.storage.delete(media.storageId);
                await ctx.db.delete(media._id);
            }

            await ctx.db.patch(product._id, { isDeleted: true, updatedAt: Date.now() });
            deletedProductCount++;
        }
    } else {
        // If not deleting products, unlink them from this category?
        // Or leave them (they will have null/invalid categoryId references).
        // Best practice: Unlink them to avoid orphans pointing to deleted category.
        const products = await ctx.db
            .query("sellerProducts")
            .withIndex("by_provider_and_deleted", (q) => q.eq("providerId", providerId).eq("isDeleted", false))
            .filter((q) => q.eq(q.field("categoryId"), args.categoryId))
            .collect();
        
        for (const product of products) {
            await ctx.db.patch(product._id, { categoryId: undefined });
        }
    }

    // Delete category image from storage if exists
    if (category.imageUrl && category.imageUrl.includes(process.env.CONVEX_SITE_URL || "convex.cloud")) {
         // Logic to find storage ID from URL would go here if we stored it separately.
         // Since we don't strictly store storageId for categories in schema yet, skipping storage delete 
         // unless we migrate category schema to hold storageId.
    }

    await ctx.db.patch(args.categoryId, { isDeleted: true, updatedAt: Date.now() });
    
    await logAudit(ctx, (user as any)?.userId ?? (user as any)?.id ?? (user as any)?._id, "DELETE_CATEGORY_CASCADE", "sellerCategories", args.categoryId, { 
        before: category, 
        after: { deletedProductCount } 
    });

    return { success: true, deletedProductCount };
  },
});

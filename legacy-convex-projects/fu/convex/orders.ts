// File: convex/orders.ts
// Purpose: Order-related Convex functions

import { mutation } from "./_generated/server";
import { v } from "convex/values";

/**
 * Create a new order
 * Validates that user has phone and address before creating
 */
export const createOrder = mutation({
  args: {
    userId: v.string(),
    items: v.array(v.object({
      productId: v.string(),
      quantity: v.number(),
      price: v.number(),
    })),
    total: v.number(),
    shippingAddress: v.optional(v.object({
      street: v.string(),
      city: v.string(),
      country: v.string(),
    })),
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate user has phone and address
    const profile = await ctx.db
      .query("userProfiles")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!profile || profile.isDeleted) {
      throw new Error("حساب المستخدم غير موجود أو محذوف");
    }

    // Check for phone number
    if (!profile.phone || profile.phone.trim() === '') {
      throw new Error("يرجى إضافة رقم الجوال في الملف الشخصي قبل إنشاء الطلب");
    }

    // Check for at least one address
    const addresses = await ctx.db
      .query("addresses")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();

    if (addresses.length === 0) {
      throw new Error("يرجى إضافة عنوان على الأقل قبل إنشاء الطلب");
    }

    // Create order
    const orderId = await ctx.db.insert("orders", {
      userId: args.userId,
      status: args.status || "pending",
      total: args.total,
      items: args.items,
      shippingAddress: args.shippingAddress,
      createdAt: Date.now(),
    });

    return { success: true, orderId };
  },
});

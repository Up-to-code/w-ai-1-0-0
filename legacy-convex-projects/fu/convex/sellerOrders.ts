import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { authComponent } from "./auth";
import { throwAppError } from "./errors";

export const listSellerOrders = query({
  args: {
    providerId: v.string(),
    status: v.optional(v.string()),
    cursor: v.optional(v.string()),
    limit: v.optional(v.number()),
    includeDeleted: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = Math.min(Math.max(args.limit ?? 30, 1), 200);
    const q = ctx.db
      .query("sellerOrders")
      .withIndex("by_provider", (q) => q.eq("providerId", args.providerId))
      .order("desc");

    const page = await q.paginate({ cursor: args.cursor ?? null, numItems: limit });
    let items = args.includeDeleted ? page.page : page.page.filter((o) => !o.isDeleted);
    if (args.status) items = items.filter((o) => o.status === args.status);
    return { ...page, page: items };
  },
});

export const getSellerOrderByNumber = query({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const order = await ctx.db
      .query("sellerOrders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order || order.isDeleted) throwAppError("NOT_FOUND", "Order not found");
    return order;
  },
});

export const createSellerOrder = mutation({
  args: {
    orderNumber: v.string(),
    customerName: v.string(),
    email: v.string(),
    phone: v.string(),
    items: v.array(v.object({
      productId: v.string(),
      productName: v.string(),
      productImage: v.string(),
      quantity: v.number(),
      unitPrice: v.number(),
      totalPrice: v.number(),
    })),
    total: v.number(),
    subtotal: v.number(),
    shipping: v.number(),
    status: v.string(),
    date: v.string(),
    address: v.object({
      street: v.string(),
      city: v.string(),
      district: v.string(),
      postalCode: v.string(),
    }),
    paymentMethod: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?._id;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    if (!args.orderNumber.trim()) throwAppError("VALIDATION_FAILED", "Order number is required");
    if (args.total < 0 || args.subtotal < 0 || args.shipping < 0) throwAppError("VALIDATION_FAILED", "Invalid totals");
    if (args.items.length === 0) throwAppError("VALIDATION_FAILED", "Order items are required");

    const existing = await ctx.db
      .query("sellerOrders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();
    if (existing && !existing.isDeleted) throwAppError("CONFLICT", "CONFLICT");

    const now = Date.now();
    const orderId = await ctx.db.insert("sellerOrders", {
      providerId,
      orderNumber: args.orderNumber.trim(),
      customerName: args.customerName.trim(),
      email: args.email.trim(),
      phone: args.phone.trim(),
      items: args.items,
      total: args.total,
      subtotal: args.subtotal,
      shipping: args.shipping,
      status: args.status,
      date: args.date,
      address: args.address,
      paymentMethod: args.paymentMethod,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, orderId };
  },
});

export const updateSellerOrder = mutation({
  args: {
    orderNumber: v.string(),
    expectedUpdatedAt: v.optional(v.number()),
    status: v.optional(v.string()),
    shippingCompany: v.optional(v.string()),
    trackingNumber: v.optional(v.string()),
    shippingNotes: v.optional(v.string()),
    cancellationReason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?._id;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const order = await ctx.db
      .query("sellerOrders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order || order.isDeleted) throwAppError("NOT_FOUND", "Order not found");
    if (order.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    if (args.expectedUpdatedAt !== undefined && order.updatedAt !== args.expectedUpdatedAt) {
      throwAppError("CONFLICT", "CONFLICT");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.status !== undefined) updates.status = args.status;
    if (args.shippingCompany !== undefined) updates.shippingCompany = args.shippingCompany;
    if (args.trackingNumber !== undefined) updates.trackingNumber = args.trackingNumber;
    if (args.shippingNotes !== undefined) updates.shippingNotes = args.shippingNotes;
    if (args.cancellationReason !== undefined) updates.cancellationReason = args.cancellationReason;

    await ctx.db.patch(order._id, updates);
    return { success: true };
  },
});

export const deleteSellerOrder = mutation({
  args: {
    orderNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await authComponent.getAuthUser(ctx);
    const providerId = user?._id;
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const order = await ctx.db
      .query("sellerOrders")
      .withIndex("by_orderNumber", (q) => q.eq("orderNumber", args.orderNumber))
      .first();

    if (!order || order.isDeleted) throwAppError("NOT_FOUND", "Order not found");
    if (order.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    await ctx.db.patch(order._id, { isDeleted: true, updatedAt: Date.now() });
    return { success: true };
  },
});

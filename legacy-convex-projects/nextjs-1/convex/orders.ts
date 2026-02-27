import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all orders for an organization
export const list = query({
    args: { orgId: v.string() },
    handler: async (ctx, args) => {
        // Auth omitted for MVP
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) throw new Error("Unauthenticated");

        const orders = await ctx.db
            .query("orders")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
            .order("desc")
            .collect();

        // Fetch customer and product details for each order
        const ordersWithDetails = await Promise.all(
            orders.map(async (order) => {
                let customerName = "Unknown Customer";
                if (order.customerId) {
                    const customer = await ctx.db.get(order.customerId);
                    if (customer) {
                        customerName = customer.name;
                    }
                }

                // Enrich items with current product images
                const enrichedItems = await Promise.all(
                    (order.items || []).map(async (item: any) => {
                        const product = await ctx.db.get(item.productId) as any;
                        return {
                            ...item,
                            productImage: product?.images?.[0] || null,
                        };
                    })
                );

                return {
                    ...order,
                    customerName,
                    items: enrichedItems, // Override items with enriched ones
                };
            })
        );

        return ordersWithDetails;
    },
});

// Create a new order
export const create = mutation({
    args: {
        orgId: v.string(),
        customerId: v.id("customers"),
        items: v.array(v.object({
            productId: v.id("products"),
            productName: v.string(),
            quantity: v.number(),
            unitPrice: v.number(),
            totalPrice: v.number(),
        })),
        subtotal: v.number(),
        total: v.number(),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("cancelled")
        ),
    },
    handler: async (ctx, args) => {
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) throw new Error("Unauthenticated");

        // Verify organization access (simplified)

        // Generate random order number
        const orderNumber = Math.random().toString(36).substring(2, 10).toUpperCase();

        const orderId = await ctx.db.insert("orders", {
            orgId: args.orgId,
            orderNumber: orderNumber,
            customerId: args.customerId,
            items: args.items,
            subtotal: args.subtotal,
            total: args.total,
            status: args.status,
            createdAt: Date.now(),
        });

        return orderId;
    },
});

// Update order
export const update = mutation({
    args: {
        id: v.id("orders"),
        orgId: v.string(),
        // Allow flexible updates - explicitly list allowed fields for safety or use loose validation for MVP
        scheduledDate: v.optional(v.number()), // Date as number timestamp
        status: v.optional(v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("cancelled")
        )),
        // Add other fields as needed
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.id);
        if (!order || order.orgId !== args.orgId) {
            throw new Error("Order not found or access denied");
        }

        const updates: any = {};
        if (args.status) updates.status = args.status;
        if (args.scheduledDate) updates.scheduledDate = args.scheduledDate;

        await ctx.db.patch(args.id, updates);
    },
});

// Update order status (kept for backward compatibility if needed, or replace)
export const updateStatus = mutation({
    args: {
        id: v.id("orders"),
        orgId: v.string(),
        status: v.union(
            v.literal("pending"),
            v.literal("processing"),
            v.literal("completed"),
            v.literal("cancelled")
        ),
    },
    handler: async (ctx, args) => {
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) throw new Error("Unauthenticated");

        const order = await ctx.db.get(args.id);
        if (!order || order.orgId !== args.orgId) {
            throw new Error("Order not found or access denied");
        }

        await ctx.db.patch(args.id, {
            status: args.status,
        });
    },
});

// Delete an order
export const remove = mutation({
    args: {
        id: v.id("orders"),
        orgId: v.string(),
    },
    handler: async (ctx, args) => {
        // const identity = await ctx.auth.getUserIdentity();
        // if (!identity) throw new Error("Unauthenticated");

        const order = await ctx.db.get(args.id);
        if (!order || order.orgId !== args.orgId) {
            throw new Error("Order not found or access denied");
        }

        await ctx.db.delete(args.id);
    },
});

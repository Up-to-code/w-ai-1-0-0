import { mutation } from './_generated/server';
import { v } from 'convex/values';

// ============================================
// WEBHOOK: Process Order Creation
// ============================================

export const processOrderWebhook = mutation({
    args: {
        event: v.string(),
        timestamp: v.number(),
        customer: v.object({
            name: v.string(),
            email: v.string(),
            phone: v.string(),
            address: v.optional(v.string()),
            city: v.optional(v.string()),
        }),
        items: v.array(
            v.object({
                productId: v.id('products'),
                orgId: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        if (args.event !== 'order.created') {
            throw new Error('Unsupported event type');
        }

        // Step 1: Find or create customer
        const existingCustomer = await ctx.db
            .query('customers')
            .withIndex('by_email', (q) => q.eq('email', args.customer.email))
            .first();

        let customerId;
        if (existingCustomer) {
            customerId = existingCustomer._id;
            // Update customer info
            await ctx.db.patch(existingCustomer._id, {
                ...args.customer,
                updatedAt: Date.now(),
            });
        } else {
            customerId = await ctx.db.insert('customers', {
                ...args.customer,
                createdAt: Date.now(),
            });
        }

        // Step 2: Group items by organization
        const itemsByOrg: Record<string, typeof args.items> = {};
        for (const item of args.items) {
            if (!itemsByOrg[item.orgId]) {
                itemsByOrg[item.orgId] = [];
            }
            itemsByOrg[item.orgId].push(item);
        }

        // Step 3: Create separate orders for each organization
        const createdOrders = [];
        for (const [orgId, orgItems] of Object.entries(itemsByOrg)) {
            // Get product details and prepare order items
            const orderItems = await Promise.all(
                orgItems.map(async (item) => {
                    const product = await ctx.db.get(item.productId);
                    return {
                        productId: item.productId,
                        productName: product?.name || 'Unknown Product',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        totalPrice: item.quantity * item.unitPrice,
                    };
                })
            );

            // Calculate totals
            const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
            const total = subtotal;

            // Generate order number
            const orderNumber = `ORD-${Date.now().toString().slice(-8)}-${orgId.slice(-4)}`;

            // Create the order
            const orderId = await ctx.db.insert('orders', {
                orgId,
                orderNumber,
                customerId,
                items: orderItems,
                subtotal,
                total,
                status: 'pending',
                createdAt: Date.now(),
            });

            createdOrders.push({
                orgId,
                orderId,
                orderNumber,
            });
        }

        return {
            success: true,
            customerId,
            orders: createdOrders,
        };
    },
});

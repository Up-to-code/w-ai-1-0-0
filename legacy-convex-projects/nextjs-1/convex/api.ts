import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

// ============================================
// PAGINATION HELPER
// ============================================
type PaginationArgs = {
    page?: number;
    limit?: number;
};

function getPaginationParams(args: PaginationArgs) {
    const page = args.page && args.page > 0 ? args.page : 1;
    const limit = args.limit && args.limit > 0 && args.limit <= 100 ? args.limit : 20;
    const offset = (page - 1) * limit;
    return { page, limit, offset };
}

// ============================================
// PRODUCTS API
// ============================================

export const listProducts = query({
    args: {
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        search: v.optional(v.string()),
        orgId: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
    },
    handler: async (ctx, args) => {
        const { page, limit, offset } = getPaginationParams(args);

        // Default to active status if not specified
        const status = args.status || 'active';

        // Build query
        let baseQuery = ctx.db.query('products');

        // Apply filters
        if (args.orgId) {
            const query = baseQuery.withIndex('by_org_status', (q) =>
                q.eq('orgId', args.orgId!).eq('status', status)
            );
            const allProducts = await query.collect();

            // Apply search filter
            let filteredProducts = allProducts;
            if (args.search) {
                const searchLower = args.search.toLowerCase();
                filteredProducts = allProducts.filter(
                    (p) =>
                        p.name.toLowerCase().includes(searchLower) ||
                        (p.nameEn && p.nameEn.toLowerCase().includes(searchLower)) ||
                        p.description.toLowerCase().includes(searchLower) ||
                        (p.sku && p.sku.toLowerCase().includes(searchLower))
                );
            }

            // Apply category filter
            if (args.categoryId) {
                filteredProducts = filteredProducts.filter((p) => p.categoryId === args.categoryId);
            }

            // Pagination
            const total = filteredProducts.length;
            const data = filteredProducts.slice(offset, offset + limit);

            return {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        } else {
            // Filter by status in memory if no orgId
            const allProducts = await baseQuery.collect();
            const filteredProducts = allProducts.filter((p) => p.status === status);

            // Apply search and other filters
            let results = filteredProducts;
            if (args.search) {
                const searchLower = args.search.toLowerCase();
                results = results.filter(
                    (p) =>
                        p.name.toLowerCase().includes(searchLower) ||
                        (p.nameEn && p.nameEn.toLowerCase().includes(searchLower)) ||
                        p.description.toLowerCase().includes(searchLower) ||
                        (p.sku && p.sku.toLowerCase().includes(searchLower))
                );
            }

            if (args.categoryId) {
                results = results.filter((p) => p.categoryId === args.categoryId);
            }

            // Pagination
            const total = results.length;
            const data = results.slice(offset, offset + limit);

            return {
                data,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            };
        }
    },
});

// ============================================
// CATEGORIES API
// ============================================

export const listCategories = query({
    args: {
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        search: v.optional(v.string()),
        orgId: v.optional(v.string()),
        status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
    },
    handler: async (ctx, args) => {
        const { page, limit, offset } = getPaginationParams(args);

        // Default to active status if not specified
        const status = args.status || 'active';

        // Build query
        let baseQuery = ctx.db.query('categories');

        const allCategories = args.orgId
            ? await baseQuery.withIndex('by_org_status', (q) =>
                q.eq('orgId', args.orgId!).eq('status', status)
            ).collect()
            : await baseQuery.collect();

        // Filter by status if no index was used
        let filteredCategories = args.orgId
            ? allCategories
            : allCategories.filter((c) => c.status === status);

        // Apply search filter
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            filteredCategories = filteredCategories.filter(
                (c) =>
                    c.name.toLowerCase().includes(searchLower) ||
                    (c.nameEn && c.nameEn.toLowerCase().includes(searchLower)) ||
                    (c.description && c.description.toLowerCase().includes(searchLower))
            );
        }

        // Pagination
        const total = filteredCategories.length;
        const data = filteredCategories.slice(offset, offset + limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
});

// ============================================
// ORGANIZATIONS API
// ============================================

export const listOrganizations = query({
    args: {
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        search: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { page, limit, offset } = getPaginationParams(args);

        const allOrgs = await ctx.db.query('organizations').collect();

        // Apply search filter
        let filteredOrgs = allOrgs;
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            filteredOrgs = allOrgs.filter(
                (o) =>
                    o.name.toLowerCase().includes(searchLower) ||
                    (o.slug && o.slug.toLowerCase().includes(searchLower)) ||
                    (o.email && o.email.toLowerCase().includes(searchLower))
            );
        }

        // Pagination
        const total = filteredOrgs.length;
        const data = filteredOrgs.slice(offset, offset + limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
});

export const getOrganization = query({
    args: { id: v.id('organizations') },
    handler: async (ctx, args) => {
        const org = await ctx.db.get(args.id);
        return org;
    },
});

export const getOrganizationProducts = query({
    args: {
        id: v.id('organizations'),
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        search: v.optional(v.string()),
        categoryId: v.optional(v.id('categories')),
        status: v.optional(v.union(v.literal('active'), v.literal('inactive'))),
    },
    handler: async (ctx, args) => {
        // Get the organization first
        const org = await ctx.db.get(args.id);
        if (!org) {
            throw new Error('Organization not found');
        }

        // Get products for this organization
        const { page, limit, offset } = getPaginationParams(args);
        const status = args.status || 'active';

        const query = ctx.db.query('products')
            .withIndex('by_org_status', (q) =>
                q.eq('orgId', org.workosOrgId).eq('status', status)
            );

        const allProducts = await query.collect();

        // Apply search filter
        let filteredProducts = allProducts;
        if (args.search) {
            const searchLower = args.search.toLowerCase();
            filteredProducts = allProducts.filter(
                (p) =>
                    p.name.toLowerCase().includes(searchLower) ||
                    (p.nameEn && p.nameEn.toLowerCase().includes(searchLower)) ||
                    p.description.toLowerCase().includes(searchLower) ||
                    (p.sku && p.sku.toLowerCase().includes(searchLower))
            );
        }

        // Apply category filter
        if (args.categoryId) {
            filteredProducts = filteredProducts.filter((p) => p.categoryId === args.categoryId);
        }

        // Pagination
        const total = filteredProducts.length;
        const data = filteredProducts.slice(offset, offset + limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
});

// ============================================
// CUSTOMERS API
// ============================================

export const findOrCreateCustomer = mutation({
    args: {
        customerId: v.optional(v.id('customers')),
        email: v.optional(v.string()),
        name: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        city: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // If customerId provided, try to find it
        if (args.customerId) {
            const existing = await ctx.db.get(args.customerId);
            if (existing) {
                return {
                    customer: existing,
                    created: false,
                };
            }
        }

        // If email provided, try to find by email
        if (args.email) {
            const existing = await ctx.db
                .query('customers')
                .withIndex('by_email', (q) => q.eq('email', args.email!))
                .first();

            if (existing) {
                // Update customer info if provided
                if (args.name || args.phone || args.address || args.city) {
                    await ctx.db.patch(existing._id, {
                        ...(args.name && { name: args.name }),
                        ...(args.phone && { phone: args.phone }),
                        ...(args.address && { address: args.address }),
                        ...(args.city && { city: args.city }),
                        updatedAt: Date.now(),
                    });
                    const updated = await ctx.db.get(existing._id);
                    return {
                        customer: updated!,
                        created: false,
                    };
                }

                return {
                    customer: existing,
                    created: false,
                };
            }
        }

        // Create new customer
        if (!args.email || !args.name || !args.phone) {
            throw new Error('email, name, and phone are required to create a customer');
        }

        const customerId = await ctx.db.insert('customers', {
            email: args.email,
            name: args.name,
            phone: args.phone,
            address: args.address,
            city: args.city,
            createdAt: Date.now(),
        });

        const customer = await ctx.db.get(customerId);

        return {
            customer: customer!,
            created: true,
        };
    },
});

export const getCustomerWithOrders = query({
    args: {
        customerId: v.id('customers'),
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        const { page, limit, offset } = getPaginationParams(args);

        // Get customer
        const customer = await ctx.db.get(args.customerId);
        if (!customer) {
            throw new Error('Customer not found');
        }

        // Get orders
        const allOrders = await ctx.db
            .query('orders')
            .filter((q) => q.eq(q.field('customerId'), args.customerId))
            .collect();

        // Sort by createdAt descending
        allOrders.sort((a, b) => b.createdAt - a.createdAt);

        // Pagination
        const total = allOrders.length; const orders = allOrders.slice(offset, offset + limit);

        return {
            customer,
            orders: {
                data: orders,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.ceil(total / limit),
                },
            },
        };
    },
});

// ============================================
// ORDERS API
// ============================================

export const listOrders = query({
    args: {
        customerId: v.id('customers'),
        page: v.optional(v.number()),
        limit: v.optional(v.number()),
        status: v.optional(
            v.union(
                v.literal('pending'),
                v.literal('processing'),
                v.literal('completed'),
                v.literal('cancelled')
            )
        ),
    },
    handler: async (ctx, args) => {
        const { page, limit, offset } = getPaginationParams(args);

        // Get all orders for the customer
        const allOrders = await ctx.db
            .query('orders')
            .filter((q) => q.eq(q.field('customerId'), args.customerId))
            .collect();

        // Filter by status if provided
        let filteredOrders = allOrders;
        if (args.status) {
            filteredOrders = allOrders.filter((o) => o.status === args.status);
        }

        // Sort by createdAt descending
        filteredOrders.sort((a, b) => b.createdAt - a.createdAt);

        // Pagination
        const total = filteredOrders.length;
        const data = filteredOrders.slice(offset, offset + limit);

        return {
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        };
    },
});

export const getOrder = query({
    args: {
        id: v.id('orders'),
        customerId: v.id('customers'), // For security
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.id);
        if (!order) {
            throw new Error('Order not found');
        }
        if (order.customerId !== args.customerId) {
            throw new Error('Access denied');
        }
        return order;
    },
});

export const createOrder = mutation({
    args: {
        customerId: v.id('customers'),
        orgId: v.string(),
        items: v.array(
            v.object({
                productId: v.id('products'),
                productName: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
                totalPrice: v.number(),
            })
        ),
    },
    handler: async (ctx, args) => {
        // Calculate totals
        const subtotal = args.items.reduce((sum, item) => sum + item.totalPrice, 0);
        const total = subtotal;

        // Generate order number
        const orderNumber = `ORD-${Date.now().toString().slice(-8)}`;

        // Create the order
        const orderId = await ctx.db.insert('orders', {
            orgId: args.orgId,
            orderNumber,
            customerId: args.customerId,
            items: args.items,
            subtotal,
            total,
            status: 'pending',
            createdAt: Date.now(),
        });

        return {
            orderId,
            orderNumber,
        };
    },
});

export const updateOrderStatus = mutation({
    args: {
        id: v.id('orders'),
        customerId: v.id('customers'), // For security
        status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('cancelled')
        ),
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.id);
        if (!order) {
            throw new Error('Order not found');
        }
        if (order.customerId !== args.customerId) {
            throw new Error('Access denied');
        }

        await ctx.db.patch(args.id, {
            status: args.status,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

export const cancelOrder = mutation({
    args: {
        id: v.id('orders'),
        customerId: v.id('customers'), // For security
    },
    handler: async (ctx, args) => {
        const order = await ctx.db.get(args.id);
        if (!order) {
            throw new Error('Order not found');
        }
        if (order.customerId !== args.customerId) {
            throw new Error('Access denied');
        }
        if (order.status === 'completed') {
            throw new Error('Cannot cancel completed order');
        }

        await ctx.db.patch(args.id, {
            status: 'cancelled',
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

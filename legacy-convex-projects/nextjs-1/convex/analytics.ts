import { v } from "convex/values";
import { query } from "./_generated/server";

export const getDashboardStats = query({
    args: {
        orgId: v.string(),
        startDate: v.optional(v.number()),
        endDate: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        // 1. Fetch Orders
        let ordersQuery = ctx.db
            .query("orders")
            .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

        // Note: Convex doesn't support complex filtering on non-indexed fields efficiently in query structure
        // We will fetch and filter in memory for now as dataset is likely small for this user scale.
        // For production scale, we should index 'createdAt'.
        const allOrders = await ordersQuery.collect();

        // Filter by date
        const filteredOrders = allOrders.filter(o => {
            if (args.startDate && o.createdAt < args.startDate) return false;
            if (args.endDate && o.createdAt > args.endDate) return false;
            return true;
        });

        // 2. Calculate Stats & Trends
        const currentOrders = filteredOrders;

        // Calculate previous period
        let previousOrders: typeof allOrders = [];
        if (args.startDate && args.endDate) {
            const duration = args.endDate - args.startDate;
            const prevEndDate = args.startDate;
            const prevStartDate = args.startDate - duration;

            previousOrders = allOrders.filter(o =>
                o.createdAt >= prevStartDate && o.createdAt < prevEndDate
            );
        }

        const calculateStats = (orders: typeof allOrders) => {
            const activeOrders = orders.filter(o => o.status !== 'cancelled');
            return {
                revenue: activeOrders.reduce((acc, curr) => acc + curr.total, 0),
                count: orders.length,
                customers: new Set(orders.map(o => o.customerId)).size
            };
        };

        const currentStats = calculateStats(currentOrders);
        const prevStats = calculateStats(previousOrders);

        const calculateTrend = (current: number, previous: number) => {
            if (previous === 0) return current > 0 ? 100 : 0;
            return Math.round(((current - previous) / previous) * 100);
        };

        const trends = {
            revenue: calculateTrend(currentStats.revenue, prevStats.revenue),
            orders: calculateTrend(currentStats.count, prevStats.count),
            customers: calculateTrend(currentStats.customers, prevStats.customers),
            products: 0
        };

        const totalRevenue = currentStats.revenue;
        const totalOrders = currentStats.count;

        // 3. Active Products Count
        const activeProducts = await ctx.db
            .query("products")
            .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId).eq("status", "active"))
            .collect();

        const activeProductsCount = activeProducts.length;

        // 4. New Customers (Unique customers in this period)
        const uniqueCustomers = currentStats.customers;

        // 5. Chart Data (Revenue per day)
        // Group by ISO date YYYY-MM-DD
        const ordersByDate = currentOrders.reduce((acc, order) => {
            const date = new Date(order.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            if (!acc[date]) {
                acc[date] = { date, revenue: 0, orders: 0 };
            }
            if (order.status !== 'cancelled') {
                acc[date].revenue += order.total;
            }
            acc[date].orders += 1;
            return acc;
        }, {} as Record<string, { date: string, revenue: number, orders: number }>);

        const chartData = Object.values(ordersByDate).sort((a, b) => 0); // Frontend can sort if needed or use timestamp keys

        // 6. Sales by Category & Top Products
        // We need product info for this. We'll fetch all products to map info.
        // Optimization: In real app, cache this or use aggregation tables.
        const productStats = new Map<string, { name: string, sales: number, revenue: number, categoryId: string }>();

        for (const order of currentOrders) {
            if (order.status !== 'cancelled') {
                for (const item of order.items) {
                    const existing = productStats.get(item.productId) || { name: item.productName, sales: 0, revenue: 0, categoryId: "" };
                    existing.sales += item.quantity;
                    existing.revenue += item.totalPrice;
                    productStats.set(item.productId, existing);
                }
            }
        }

        const topProducts = Array.from(productStats.values())
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 5);

        // 6. Sales by Category
        // To get category info, we need to fetch products which contain categoryId
        const productIds = Array.from(productStats.keys());
        const products = await Promise.all(
            productIds.map(id => ctx.db.get(id as any))
        );

        // Create a map of productId -> product (with categoryId)
        const productMap = new Map();
        products.forEach(p => {
            if (p) productMap.set(p._id, p as any);
        });

        // We also need category names
        const categoryIds = new Set<string>();
        products.forEach(p => {
            const product = p as any;
            if (product && product.categoryId) categoryIds.add(product.categoryId);
        });

        const categories = await Promise.all(
            Array.from(categoryIds).map(id => ctx.db.get(id as any))
        );
        const categoryMap = new Map();
        categories.forEach(c => {
            if (c) categoryMap.set(c._id, (c as any).name);
        });

        const categoryStats = new Map<string, number>();

        // Aggregate revenue by category name
        for (const [productId, stats] of productStats.entries()) {
            const product = productMap.get(productId);
            if (product && product.categoryId) {
                const categoryName = categoryMap.get(product.categoryId) || "غير مصنف";
                const currentVal = categoryStats.get(categoryName) || 0;
                categoryStats.set(categoryName, currentVal + stats.revenue);
            } else {
                const currentVal = categoryStats.get("غير مصنف") || 0;
                categoryStats.set("غير مصنف", currentVal + stats.revenue);
            }
        }

        const salesByCategory = Array.from(categoryStats.entries()).map(([name, value], index) => ({
            name,
            value,
            color: `hsl(${220 + (index * 40)}, 60%, 50%)` // Dynamic color generation
        })).sort((a, b) => b.value - a.value);

        return {
            stats: {
                revenue: totalRevenue,
                orders: totalOrders,
                products: activeProductsCount,
                customers: uniqueCustomers,
            },
            trends,
            chartData: chartData.length > 0 ? chartData : [],
            recentOrders: filteredOrders.slice(0, 5),
            topProducts,
            salesByCategory // Return the calculated sales data
        };
    },
});

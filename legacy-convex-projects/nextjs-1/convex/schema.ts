import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
    // ============================================
    // USERS / PARTNERS TABLE
    // ============================================
    // ============================================
    // USERS TABLE (Identity & Auth)
    // ============================================
    users: defineTable({
        workosUserId: v.optional(v.string()), // Linked WorkOS User ID
        name: v.string(),
        email: v.string(),
        phone: v.optional(v.string()),
        avatar: v.optional(v.string()),

        // Partner vs Customer
        userType: v.union(v.literal('partner'), v.literal('customer')),

        // User Settings
        settings: v.optional(v.object({
            language: v.union(v.literal('ar'), v.literal('en')),
            timezone: v.optional(v.string()),
            emailNotifications: v.boolean(),
        })),

        status: v.union(v.literal('active'), v.literal('inactive')),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_email', ['email'])
        .index('by_workos_id', ['workosUserId'])
        .index('by_status', ['status']),

    // ============================================
    // ORGANIZATIONS TABLE (Business Profile)
    // ============================================
    organizations: defineTable({
        workosOrgId: v.string(), // External ID from WorkOS (org_...)
        name: v.string(),
        slug: v.optional(v.string()),

        // Contact Info
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        description: v.optional(v.string()),
        logo: v.optional(v.string()),

        // Business Legal Data (Moved from Users)
        businessName: v.optional(v.string()),
        commercialRegistration: v.optional(v.string()),
        taxId: v.optional(v.string()),

        // Bank Account Information (Moved from Users)
        bankAccount: v.optional(
            v.object({
                accountNumber: v.string(),
                bankName: v.string(),
                iban: v.string(),
            })
        ),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_workos_id', ['workosOrgId']),

    // ============================================
    // CATEGORIES TABLE (Scoped to Org)
    // ============================================
    categories: defineTable({
        orgId: v.string(), // Organization Ownership

        name: v.string(), // Arabic name
        nameEn: v.optional(v.string()), // English name
        description: v.optional(v.string()),
        image: v.optional(v.string()),

        order: v.number(), // Display order
        status: v.union(v.literal('active'), v.literal('inactive')),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_org', ['orgId'])
        .index('by_org_status', ['orgId', 'status']),

    // ============================================
    // PRODUCTS TABLE (Scoped to Org)
    // ============================================
    products: defineTable({
        orgId: v.string(), // Organization Ownership

        name: v.string(), // Arabic name
        nameEn: v.optional(v.string()), // English name
        description: v.string(),

        categoryId: v.id('categories'),

        price: v.number(),
        originalPrice: v.optional(v.number()), // For discounts
        stock: v.number(),
        sku: v.optional(v.string()), // Stock Keeping Unit

        images: v.array(v.string()), // Array of image URLs

        // Product Options (e.g. Size, Color)
        variantOptions: v.optional(v.array(v.object({
            type: v.string(), // e.g. "Size"
            values: v.array(v.string()) // e.g. ["S", "M", "L"]
        }))),

        // Specific Variants (Combinations)
        variants: v.optional(v.array(v.object({
            id: v.string(), // Unique ID for the variant
            options: v.array(v.object({ name: v.string(), value: v.string() })), // e.g. [{name: "Size", value: "S"}]
            price: v.number(),
            stock: v.number(),
            sku: v.optional(v.string())
        }))),

        status: v.union(v.literal('active'), v.literal('inactive')),

        // Metrics
        viewCount: v.optional(v.number()),
        orderCount: v.optional(v.number()),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_org', ['orgId'])
        .index('by_org_category', ['orgId', 'categoryId'])
        .index('by_org_status', ['orgId', 'status']),

    // ============================================
    // CUSTOMERS TABLE (Consumer Profile)
    // ============================================
    customers: defineTable({
        userId: v.optional(v.id('users')), // Link to Auth User (Optional for guest checkout)

        name: v.string(),
        email: v.string(),
        phone: v.string(),

        // Addresses (Simplified)
        address: v.optional(v.string()),
        city: v.optional(v.string()),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_email', ['email'])
        .index('by_user', ['userId']),

    // ============================================
    // ORDERS TABLE (Scoped to Org)
    // ============================================
    orders: defineTable({
        orgId: v.string(), // Organization Ownership (The seller)

        orderNumber: v.string(),
        customerId: v.id('customers'),

        // Order Items
        items: v.array(
            v.object({
                productId: v.id('products'),
                productName: v.string(),
                quantity: v.number(),
                unitPrice: v.number(),
                totalPrice: v.number(),
            })
        ),

        // Pricing
        subtotal: v.number(),
        total: v.number(),

        // Status
        status: v.union(
            v.literal('pending'),
            v.literal('processing'),
            v.literal('completed'),
            v.literal('cancelled')
        ),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_org', ['orgId'])
        .index('by_org_status', ['orgId', 'status']),

    // ============================================
    // ORGANIZATION MEMBERSHIPS TABLE (User-Org relationships with roles)
    // ============================================
    organizationMemberships: defineTable({
        userId: v.id('users'),
        organizationId: v.id('organizations'),
        workosOrgId: v.string(), // WorkOS organization ID
        workosMembershipId: v.optional(v.string()), // WorkOS membership ID

        // Role in organization
        role: v.union(
            v.literal('owner'),   // Organization creator/owner
            v.literal('admin'),    // Administrator
            v.literal('member')    // Regular member
        ),

        // Permissions (Granular access control)
        permissions: v.optional(v.object({
            viewOrders: v.boolean(),
            manageOrders: v.boolean(),
            manageProducts: v.boolean(),
            manageSettings: v.boolean(),
        })),

        // Status
        status: v.union(v.literal('active'), v.literal('inactive')),

        createdAt: v.number(),
        updatedAt: v.optional(v.number()),
    })
        .index('by_user', ['userId'])
        .index('by_organization', ['organizationId'])
        .index('by_user_and_org', ['userId', 'organizationId'])
        .index('by_role', ['role']),

    // ============================================
    // NOTIFICATIONS TABLE
    // ============================================
    notifications: defineTable({
        userId: v.id('users'),
        type: v.string(), // e.g. 'order', 'system', 'stock'
        title: v.string(),
        message: v.string(),
        read: v.boolean(),
        data: v.optional(v.any()), // Related object IDs or metadata
        createdAt: v.number(),
    })
        .index('by_user', ['userId'])
        .index('by_user_unread', ['userId', 'read']),
});

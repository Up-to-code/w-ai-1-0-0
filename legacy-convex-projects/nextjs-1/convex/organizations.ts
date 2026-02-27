import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Sync WorkOS organization to Convex
export const sync = mutation({
    args: {
        workosOrgId: v.string(),
        name: v.string(),
        slug: v.optional(v.string()),
        // Extended fields optional during sync
        email: v.optional(v.string()),
        phone: v.optional(v.string()),
        address: v.optional(v.string()),
        description: v.optional(v.string()),
        logo: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const existing = await ctx.db
            .query('organizations')
            .withIndex('by_workos_id', (q) => q.eq('workosOrgId', args.workosOrgId))
            .first();

        if (existing) {
            // Update
            await ctx.db.patch(existing._id, {
                name: args.name,
                slug: args.slug,
                updatedAt: Date.now(),
                // Merge extended fields if provided
                ...(args.email && { email: args.email }),
                ...(args.phone && { phone: args.phone }),
                ...(args.address && { address: args.address }),
                ...(args.description && { description: args.description }),
                ...(args.logo && { logo: args.logo }),
            });
            return existing._id;
        } else {
            // Create
            const newId = await ctx.db.insert('organizations', {
                workosOrgId: args.workosOrgId,
                name: args.name,
                slug: args.slug,
                email: args.email,
                phone: args.phone,
                address: args.address,
                description: args.description,
                logo: args.logo,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return newId;
        }
    },
});

// Get organization by WorkOS ID using implicit WorkOS ID from context or passed arg?
// For public or component use, we pass ID.
export const get = query({
    args: { workosOrgId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.db
            .query('organizations')
            .withIndex('by_workos_id', (q) => q.eq('workosOrgId', args.workosOrgId))
            .first();
    },
});

// Compare organization data between WorkOS and Convex
// Returns differences if any
export const compareWithWorkOS = query({
    args: {
        workosOrgId: v.string(),
        workosData: v.object({
            name: v.string(),
            email: v.optional(v.string()),
            phone: v.optional(v.string()),
            address: v.optional(v.string()),
            description: v.optional(v.string()),
        }),
    },
    handler: async (ctx, args) => {
        const convexOrg = await ctx.db
            .query('organizations')
            .withIndex('by_workos_id', (q) => q.eq('workosOrgId', args.workosOrgId))
            .first();

        if (!convexOrg) {
            return {
                needsSync: true,
                differences: {
                    exists: false,
                    message: 'Organization not found in Convex, needs sync',
                },
            };
        }

        // Compare fields
        const differences: Record<string, { workos: any; convex: any }> = {};

        if (convexOrg.name !== args.workosData.name) {
            differences.name = { workos: args.workosData.name, convex: convexOrg.name };
        }

        if (convexOrg.email !== args.workosData.email) {
            differences.email = { workos: args.workosData.email, convex: convexOrg.email };
        }

        if (convexOrg.phone !== args.workosData.phone) {
            differences.phone = { workos: args.workosData.phone, convex: convexOrg.phone };
        }

        if (convexOrg.address !== args.workosData.address) {
            differences.address = { workos: args.workosData.address, convex: convexOrg.address };
        }

        if (convexOrg.description !== args.workosData.description) {
            differences.description = { workos: args.workosData.description, convex: convexOrg.description };
        }

        return {
            needsSync: Object.keys(differences).length > 0,
            differences,
            convexOrg,
        };
    },
});

// Update Organization Business Details (Legal Info)
export const updateBusinessDetails = mutation({
    args: {
        orgId: v.id('organizations'),
        businessName: v.optional(v.string()),
        commercialRegistration: v.optional(v.string()),
        taxId: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        const { orgId, ...updates } = args;

        await ctx.db.patch(orgId, {
            ...updates,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Update Organization Bank Account
export const updateBankAccount = mutation({
    args: {
        orgId: v.id('organizations'),
        bankAccount: v.object({
            accountNumber: v.string(),
            bankName: v.string(),
            iban: v.string(),
        }),
    },
    handler: async (ctx, args) => {
        await ctx.db.patch(args.orgId, {
            bankAccount: args.bankAccount,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// ============================================
// MEMBERSHIP MANAGEMENT
// ============================================

// Sync Membership (invoked after WorkOS add/invite)
export const syncMembership = mutation({
    args: {
        workosOrgId: v.string(),
        workosUserId: v.string(), // The user's WorkOS ID
        role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
        permissions: v.optional(v.object({
            viewOrders: v.boolean(),
            manageOrders: v.boolean(),
            manageProducts: v.boolean(),
            manageSettings: v.boolean(),
        })),
        status: v.union(v.literal('active'), v.literal('inactive')),
    },
    handler: async (ctx, args) => {
        // 1. Get Organization
        const org = await ctx.db
            .query('organizations')
            .withIndex('by_workos_id', (q) => q.eq('workosOrgId', args.workosOrgId))
            .first();

        if (!org) {
            throw new Error('Organization not found');
        }

        // 2. Get User
        const user = await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workosUserId', args.workosUserId))
            .first();

        if (!user) {
            // User might not be synced yet.
            // We can't link membership without a user record in Convex.
            // Return failure or throw
            throw new Error('User not found in Convex. Ensure user is synced first.');
        }

        // 3. Check existing membership
        const existing = await ctx.db
            .query('organizationMemberships')
            .withIndex('by_user_and_org', (q) => q.eq('userId', user._id).eq('organizationId', org._id))
            .first();

        if (existing) {
            await ctx.db.patch(existing._id, {
                role: args.role,
                permissions: args.permissions,
                status: args.status,
                updatedAt: Date.now(),
            });
            return existing._id;
        } else {
            const newId = await ctx.db.insert('organizationMemberships', {
                userId: user._id,
                organizationId: org._id,
                workosOrgId: args.workosOrgId,
                role: args.role,
                permissions: args.permissions,
                status: args.status,
                createdAt: Date.now(),
                updatedAt: Date.now(),
            });
            return newId;
        }
    },
});

// Get Members of an Organization
export const getMembers = query({
    args: { workosOrgId: v.string() },
    handler: async (ctx, args) => {
        const org = await ctx.db
            .query('organizations')
            .withIndex('by_workos_id', (q) => q.eq('workosOrgId', args.workosOrgId))
            .first();

        if (!org) return [];

        const memberships = await ctx.db
            .query('organizationMemberships')
            .withIndex('by_organization', (q) => q.eq('organizationId', org._id))
            .collect();

        // Join with User data
        const members = await Promise.all(memberships.map(async (m) => {
            const user = await ctx.db.get(m.userId);
            return {
                ...m,
                user: user ? {
                    name: user.name,
                    email: user.email,
                    avatar: user.avatar,
                } : null
            };
        }));

        return members;
    },
});

// Update Member Role & Permissions
export const updateMemberRole = mutation({
    args: {
        membershipId: v.id('organizationMemberships'),
        role: v.union(v.literal('owner'), v.literal('admin'), v.literal('member')),
        permissions: v.optional(v.object({
            viewOrders: v.boolean(),
            manageOrders: v.boolean(),
            manageProducts: v.boolean(),
            manageSettings: v.boolean(),
        })),
    },
    handler: async (ctx, args) => {
        const membership = await ctx.db.get(args.membershipId);
        if (!membership) {
            throw new Error('Membership not found');
        }

        await ctx.db.patch(args.membershipId, {
            role: args.role,
            permissions: args.permissions,
            updatedAt: Date.now(),
        });

        return { success: true };
    },
});

// Get Current User's Membership
export const getMyMembership = query({
    args: {
        workosOrgId: v.string(),
        workosUserId: v.string()
    },
    handler: async (ctx, args) => {
        // console.log(`🔍 getMyMembership: Searching for workosOrgId=${args.workosOrgId}, workosUserId=${args.workosUserId}`);
        const org = await ctx.db
            .query('organizations')
            .withIndex('by_workos_id', (q) => q.eq('workosOrgId', args.workosOrgId))
            .first();

        if (!org) {
            return null;
        }

        const user = await ctx.db
            .query('users')
            .withIndex('by_workos_id', (q) => q.eq('workosUserId', args.workosUserId))
            .first();

        if (!user) {
            return null;
        }

        const membership = await ctx.db
            .query('organizationMemberships')
            .withIndex('by_user_and_org', (q) => q.eq('userId', user._id).eq('organizationId', org._id))
            .first();

        if (!membership) {
            // Membership not found
        }

        return membership;
    },
});

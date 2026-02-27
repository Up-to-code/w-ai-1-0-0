import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { throwAppError } from "./errors";
import { requireAdmin } from "./authz";
import { logAuditEvent } from "./audit";

function toSlug(input: string) {
  return input
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export const listOrganizations = query({
  args: {
    search: v.optional(v.string()),
    includeDeleted: v.optional(v.boolean()),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    void userId;

    const includeDeleted = args.includeDeleted === true;

    if (args.search && args.search.trim()) {
      const term = args.search.trim();
      const page = includeDeleted
        ? await ctx.db
            .query("organizations")
            .withSearchIndex("search_name", (q: any) => q.search("name", term))
            .paginate(args.paginationOpts)
        : await ctx.db
            .query("organizations")
            .withSearchIndex("search_name", (q: any) => q.search("name", term).eq("isDeleted", false))
            .paginate(args.paginationOpts);

      const items = includeDeleted ? page.page : page.page.filter((o: any) => !o.isDeleted);
      return { ...page, page: items };
    }

    const q = ctx.db
      .query("organizations")
      .withIndex("by_createdAt", (q: any) => q)
      .order("desc");
    const page = await q.paginate(args.paginationOpts);
    const items = includeDeleted ? page.page : page.page.filter((o: any) => !o.isDeleted);
    return { ...page, page: items };
  },
});

export const getOrganization = query({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);
    void userId;

    const org = await ctx.db.get(args.organizationId);
    if (!org || org.isDeleted) throwAppError("NOT_FOUND", "Organization not found");
    return org;
  },
});

export const createOrganization = mutation({
  args: {
    name: v.string(),
    slug: v.optional(v.string()),
    commercialRegistration: v.optional(v.string()),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const name = args.name.trim();
    if (name.length < 2) throwAppError("VALIDATION_FAILED", "Organization name is required");

    const slug = (args.slug?.trim() || toSlug(name)).trim();
    if (!slug) throwAppError("VALIDATION_FAILED", "Slug is required");

    const existing = await ctx.db
      .query("organizations")
      .withIndex("by_slug", (q: any) => q.eq("slug", slug))
      .first();
    if (existing && !existing.isDeleted) throwAppError("CONFLICT", "Slug already exists");

    const now = Date.now();
    const organizationId = await ctx.db.insert("organizations", {
      name,
      nameLower: name.toLowerCase(),
      slug,
      commercialRegistration: args.commercialRegistration?.trim(),
      description: args.description?.trim(),
      website: args.website?.trim(),
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    // Create owner membership
    const memberId = await ctx.db.insert("organizationMembers", {
      organizationId,
      userId,
      role: "owner",
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
    });

    // Optionally set organizationId on userProfile if not set
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q: any) => q.eq("userId", userId))
      .first();
    
    if (userProfile && !userProfile.organizationId) {
      await ctx.db.patch(userProfile._id, { organizationId });
    }

    await logAuditEvent(ctx, {
      actorUserId: userId,
      action: "create",
      entityType: "organizations",
      entityId: organizationId,
      after: { name, slug, ownerMemberId: memberId },
    });

    return await ctx.db.get(organizationId);
  },
});

export const updateOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
    expectedUpdatedAt: v.optional(v.number()),
    name: v.optional(v.string()),
    slug: v.optional(v.string()),
    commercialRegistration: v.optional(v.string()),
    description: v.optional(v.string()),
    website: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org || org.isDeleted) {
      throwAppError("NOT_FOUND", "Organization not found");
      return; // Should be unreachable but helps TS
    }

    if (args.expectedUpdatedAt !== undefined && org.updatedAt !== args.expectedUpdatedAt) {
      throwAppError("CONFLICT", "Organization has been updated by another user");
    }

    const before = {
      name: org.name,
      slug: org.slug,
      commercialRegistration: org.commercialRegistration,
      description: org.description,
      website: org.website,
      updatedAt: org.updatedAt,
    };

    const updates: any = { updatedAt: Date.now(), updatedByUserId: userId };

    if (args.name !== undefined) {
      const name = args.name.trim();
      if (name.length < 2) throwAppError("VALIDATION_FAILED", "Organization name is required");
      updates.name = name;
      updates.nameLower = name.toLowerCase();
    }

    if (args.slug !== undefined) {
      const slug = args.slug.trim();
      if (!slug) throwAppError("VALIDATION_FAILED", "Slug is required");
      const existing = await ctx.db
        .query("organizations")
        .withIndex("by_slug", (q: any) => q.eq("slug", slug))
        .first();
      if (existing && existing._id !== org._id && !existing.isDeleted) {
        throwAppError("CONFLICT", "Slug already exists");
      }
      updates.slug = slug;
    }

    if (args.commercialRegistration !== undefined) {
      updates.commercialRegistration = args.commercialRegistration?.trim() || undefined;
    }
    if (args.description !== undefined) {
      updates.description = args.description?.trim() || undefined;
    }
    if (args.website !== undefined) {
      updates.website = args.website?.trim() || undefined;
    }

    await ctx.db.patch(args.organizationId, updates);

    const after = { ...before, ...updates };
    await logAuditEvent(ctx, {
      actorUserId: userId,
      action: "update",
      entityType: "organizations",
      entityId: args.organizationId,
      before,
      after,
    });

    return await ctx.db.get(args.organizationId);
  },
});

export const deleteOrganization = mutation({
  args: {
    organizationId: v.id("organizations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAdmin(ctx);

    const org = await ctx.db.get(args.organizationId);
    if (!org || org.isDeleted) {
      throwAppError("NOT_FOUND", "Organization not found");
      return;
    }

    const before = { name: org.name, slug: org.slug, isDeleted: org.isDeleted };
    const now = Date.now();
    await ctx.db.patch(args.organizationId, {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      updatedByUserId: userId,
    });

    // Cascade: soft-delete all members
    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .filter((q: any) => q.eq(q.field("isDeleted"), false))
      .collect();

    for (const member of members) {
      await ctx.db.patch(member._id, {
        isDeleted: true,
        deletedAt: now,
        updatedByUserId: userId,
      });
      // Unlink user profile if this was their primary org
      if (member.userId) {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q: any) => q.eq("userId", member.userId!))
          .first();
        if (userProfile && userProfile.organizationId === args.organizationId) {
          await ctx.db.patch(userProfile._id, { organizationId: undefined });
        }
      }
    }

    await logAuditEvent(ctx, {
      actorUserId: userId,
      action: "delete",
      entityType: "organizations",
      entityId: args.organizationId,
      before,
      after: { ...before, isDeleted: true, deletedAt: now, cascadedMembers: members.length },
    });

    return { success: true };
  },
});

import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireOrgRole } from "./authz";
import { throwAppError } from "./errors";
import type { Doc } from "./_generated/dataModel";

/**
 * List members of an organization with pagination.
 *
 * Requires the caller to be a member of the organization (owner/admin/member),
 * or a platform admin.
 */
export const listOrganizationMembers = query({
  args: {
    organizationId: v.id("organizations"),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireOrgRole(ctx, args.organizationId, ["owner", "admin", "member"]);

    const members = await ctx.db
      .query("organizationMembers")
      .withIndex("by_organization", (q: any) => q.eq("organizationId", args.organizationId))
      .filter((q: any) => q.eq(q.field("isDeleted"), false))
      .paginate(args.paginationOpts);

    return members;
  },
});

/**
 * Invite a new member to an organization by email.
 *
 * Only organization owners/admins can invite members. The invited member is stored
 * as an `organizationMembers` record with `inviteEmail` until it is claimed.
 */
export const createOrganizationMember = mutation({
  args: {
    organizationId: v.id("organizations"),
    email: v.string(),
    role: v.string(),
    customPermissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireOrgRole(ctx, args.organizationId, ["owner", "admin"]);

    const now = Date.now();
    const memberId = await ctx.db.insert("organizationMembers", {
      organizationId: args.organizationId,
      inviteEmail: args.email,
      role: args.role,
      customPermissions: args.customPermissions,
      isDeleted: false,
      createdAt: now,
      updatedAt: now,
      createdByUserId: userId,
      updatedByUserId: userId,
    });
    return memberId;
  },
});

/**
 * Update an organization member's role and/or custom permissions.
 *
 * Authorization rules:
 * - Only organization owners/admins can update members.
 * - Only owners can modify owners or set role="owner".
 * - Admins cannot promote anyone to owner.
 * - A caller cannot promote themselves to owner unless they are already an owner.
 */
export const updateOrganizationMember = mutation({
  args: {
    memberId: v.id("organizationMembers"),
    role: v.optional(v.union(v.literal("owner"), v.literal("admin"), v.literal("member"))),
    customPermissions: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.isDeleted) throwAppError("NOT_FOUND", "Member not found");

    const { userId: requesterUserId, member: requesterMember } = await requireOrgRole(ctx, member.organizationId, [
      "owner",
      "admin",
    ]);
    const requesterRole = requesterMember.role as "owner" | "admin";

    if (member.role === "owner" && requesterRole !== "owner") {
      throwAppError("FORBIDDEN", "Only owners can modify owners");
    }

    if (args.role === "owner" && requesterRole !== "owner") {
      throwAppError("FORBIDDEN", "Only owners can assign the owner role");
    }

    if (member.userId && member.userId === requesterUserId && args.role === "owner" && requesterRole !== "owner") {
      throwAppError("FORBIDDEN", "You cannot promote yourself to owner");
    }

    const updates: Partial<Doc<"organizationMembers">> = {
      updatedAt: Date.now(),
      updatedByUserId: requesterUserId,
    };
    if (args.role !== undefined) {
      updates.role = args.role;
    }
    if (args.customPermissions !== undefined) {
      updates.customPermissions = args.customPermissions;
    }

    await ctx.db.patch(args.memberId, updates);
    return { success: true };
  },
});

/**
 * Soft-delete an organization member.
 *
 * Authorization rules:
 * - Only organization owners/admins can delete members.
 * - Admins cannot delete owners.
 * - The last remaining owner cannot be deleted (including self-removal).
 */
export const deleteOrganizationMember = mutation({
  args: {
    memberId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.isDeleted) throwAppError("NOT_FOUND", "Member not found");

    const { userId: requesterUserId, member: requesterMember } = await requireOrgRole(ctx, member.organizationId, [
      "owner",
      "admin",
    ]);
    const requesterRole = requesterMember.role as "owner" | "admin";

    if (member.role === "owner" && requesterRole !== "owner") {
      throwAppError("FORBIDDEN", "Admins cannot delete owners");
    }

    if (member.role === "owner") {
      const owners = await ctx.db
        .query("organizationMembers")
        .withIndex("by_organization", (q: any) => q.eq("organizationId", member.organizationId))
        .filter((q: any) => q.eq(q.field("role"), "owner"))
        .filter((q: any) => q.neq(q.field("isDeleted"), true))
        .collect();
      if (owners.length <= 1) {
        throwAppError("CONFLICT", "Cannot delete the last owner of the organization");
      }
    }

    const now = Date.now();
    const updates: Partial<Doc<"organizationMembers">> = {
      isDeleted: true,
      deletedAt: now,
      updatedAt: now,
      updatedByUserId: requesterUserId,
    };

    await ctx.db.patch(args.memberId, updates);

    return { success: true };
  },
});

/**
 * Fetch a single organization member record by ID.
 *
 * Returns null if the record does not exist or is deleted.
 */
export const getOrganizationMember = query({
  args: {
    memberId: v.id("organizationMembers"),
  },
  handler: async (ctx, args) => {
    const member = await ctx.db.get(args.memberId);
    if (!member || member.isDeleted) return null;
    
    return member;
  },
});

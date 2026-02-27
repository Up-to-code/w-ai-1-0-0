import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

// Mock auth component to bypass Better Auth component dependency
vi.mock("./auth", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./auth")>();
  return {
    ...actual,
    authComponent: {
      getAuthUser: async (ctx: any) => {
        const identity = await ctx.auth.getUserIdentity();
        if (!identity) return null;
        return { _id: identity.subject };
      },
    },
  };
});

const modules = (import.meta as any).glob("./**/*.{ts,tsx,js,jsx}");

describe("Organizations CRUD", () => {
  it("should create, update, and delete organization with cascade", async () => {
    const t = convexTest(schema, modules);

    // Create user
    const userId = "user123";
    const tUser = t.withIdentity({ subject: userId });

    // Make user admin
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: userId,
        role: "admin",
        name: "Admin User",
        phone: "123456",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });
    
    // Create org
    const org = await tUser.mutation(api.organizations.createOrganization, {
      name: "Test Org",
      slug: "test-org",
      commercialRegistration: "123",
      description: "Test description",
      website: "https://example.com",
    });

    if (!org) throw new Error("Org creation failed");

    expect(org).toBeDefined();
    expect(org.name).toBe("Test Org");
    
    // Check membership created
    const members = await tUser.query(api.organizationMembers.listOrganizationMembers, {
      organizationId: org._id,
      paginationOpts: { numItems: 10, cursor: null }
    });

    expect(members.page).toHaveLength(1);
    expect(members.page[0].role).toBe("owner");
    expect(members.page[0].userId).toBe(userId);

    // Update org
    const updatedOrg = await tUser.mutation(api.organizations.updateOrganization, {
      organizationId: org._id,
      name: "Updated Org",
      expectedUpdatedAt: org.updatedAt,
    });

    if (!updatedOrg) throw new Error("Org update failed");

    expect(updatedOrg.name).toBe("Updated Org");

    // Add another member
    const memberId = await tUser.mutation(api.organizationMembers.createOrganizationMember, {
      organizationId: org._id,
      email: "invite@example.com",
      role: "member",
    });

    // Verify member added
    const member = await tUser.query(api.organizationMembers.getOrganizationMember, {
      memberId,
    });
    expect(member).not.toBeNull();
    expect(member!.inviteEmail).toBe("invite@example.com");

    // Delete org (soft delete)
    // Now delete
    await tUser.mutation(api.organizations.deleteOrganization, {
      organizationId: org._id,
    });

    // Check org deleted
    await expect(t.query(api.organizations.getOrganization, {
      organizationId: org._id,
    })).rejects.toThrow(); // Should throw because isDeleted check

    // Check cascade to members
    const deletedMember = await t.run(async (ctx) => {
      return await ctx.db.get(memberId);
    });
    expect(deletedMember).not.toBeNull();
    expect(deletedMember!.isDeleted).toBe(true);
  });
});

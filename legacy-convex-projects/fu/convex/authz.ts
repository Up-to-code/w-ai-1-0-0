import { authComponent } from "./auth";
import { throwAppError } from "./errors";

export async function requireAuthUserId(ctx: any): Promise<string> {
  const user = await authComponent.getAuthUser(ctx);
  const userId = user?._id;
  if (!userId) throwAppError("AUTH_REQUIRED", "Unauthenticated");
  return userId;
}

export async function getUserProfileByUserId(ctx: any, userId: string) {
  return await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q: any) => q.eq("userId", userId))
    .first();
}

export async function requireAdmin(ctx: any): Promise<{ userId: string; role: string }> {
  const userId = await requireAuthUserId(ctx);
  const profile = await getUserProfileByUserId(ctx, userId);
  if (!profile || profile.isDeleted) throwAppError("FORBIDDEN", "Forbidden");
  if (profile.role !== "admin") throwAppError("FORBIDDEN", "Forbidden");
  return { userId, role: profile.role };
}

export async function requireOrgRole(
  ctx: any,
  organizationId: string,
  allowedRoles: string[]
): Promise<{ userId: string; member: any }> {
  const userId = await requireAuthUserId(ctx);

  // Admins can do anything
  const profile = await getUserProfileByUserId(ctx, userId);
  if (profile && !profile.isDeleted && profile.role === "admin") {
    return { userId, member: { role: "admin", userId, organizationId } };
  }

  const member = await ctx.db
    .query("organizationMembers")
    .withIndex("by_org_user", (q: any) =>
      q.eq("organizationId", organizationId).eq("userId", userId)
    )
    .first();

  if (!member || member.isDeleted) throwAppError("FORBIDDEN", "Not a member of this organization");
  if (!allowedRoles.includes(member.role)) throwAppError("FORBIDDEN", "Insufficient permissions");

  return { userId, member };
}

import { authComponent } from "./auth";
import type { GenericCtx } from "@convex-dev/better-auth";
import type { DataModel } from "./_generated/dataModel";

export async function getProviderId(ctx: GenericCtx<DataModel>) {
  const user = await authComponent.getAuthUser(ctx);
  const providerId = (user as any)?.userId ?? (user as any)?.id ?? (user as any)?._id;
  if (!providerId || typeof providerId !== "string") {
    return null;
  }
  return providerId as string;
}

export function computeCombinationKey(selection: unknown): string {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) return "";
  return Object.entries(selection as Record<string, unknown>)
    .filter((e): e is [string, string] => typeof e[0] === "string" && typeof e[1] === "string")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}:${v}`)
    .join("|");
}

export function normalizeStringRecord(selection: unknown): Record<string, string> {
  if (!selection || typeof selection !== "object" || Array.isArray(selection)) return {};
  const out: Record<string, string> = {};
  for (const [k, v] of Object.entries(selection as Record<string, unknown>)) {
    if (typeof k === "string" && typeof v === "string" && k.length > 0) out[k] = v;
  }
  return out;
}

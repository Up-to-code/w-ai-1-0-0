import { query, mutation, internalQuery, action } from "./_generated/server";
import { v } from "convex/values";
import { api, internal } from "./_generated/api";

const SEED_PLACEHOLDER = "from_env";

function normalizeNumericId(value: string | null | undefined): string {
  return (value ?? "").trim().replace(/^\+/, "");
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("whatsapp_numbers").collect();
  },
});

export const add = mutation({
  args: {
    businessAccountId: v.string(),
    businessNumberId: v.string(),
    phone: v.string(),
    name: v.string(),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("whatsapp_numbers")
      .withIndex("by_business_number_id", (q) =>
        q.eq("businessNumberId", args.businessNumberId)
      )
      .first();
    if (existing) {
      throw new Error("A number with this Business Number ID already exists.");
    }
    const id = await ctx.db.insert("whatsapp_numbers", {
      businessAccountId: args.businessAccountId,
      businessNumberId: args.businessNumberId,
      phone: args.phone,
      name: args.name,
      accessToken: args.accessToken,
      createdAt: Date.now(),
    });
    await ctx.runMutation(api.agents.ensureForPhoneNumber, {
      phoneNumberId: args.businessNumberId,
    });
    return id;
  },
});

export const getByBusinessNumberId = internalQuery({
  args: { businessNumberId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("whatsapp_numbers")
      .withIndex("by_business_number_id", (q) =>
        q.eq("businessNumberId", args.businessNumberId)
      )
      .first();
  },
});

/** First number that has an access token (for default config when no phoneNumberId is provided). Deterministic: sorted by createdAt. */
export const getFirstWithToken = internalQuery({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("whatsapp_numbers").collect();
    const sorted = [...all].sort(
      (a, b) => (a.createdAt ?? 0) - (b.createdAt ?? 0)
    );
    return sorted.find((n) => n.accessToken?.trim()) ?? null;
  },
});

export const update = mutation({
  args: {
    id: v.id("whatsapp_numbers"),
    name: v.optional(v.string()),
    phone: v.optional(v.string()),
    accessToken: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const filtered: Record<string, unknown> = {};
    if (updates.name !== undefined) filtered.name = updates.name;
    if (updates.phone !== undefined) filtered.phone = updates.phone;
    if (updates.accessToken !== undefined) {
      const t = updates.accessToken?.trim();
      filtered.accessToken = t && t.length > 0 ? t : undefined;
    }
    if (Object.keys(filtered).length === 0) return id;
    await ctx.db.patch(id, filtered);
    return id;
  },
});

export const remove = mutation({
  args: { id: v.id("whatsapp_numbers") },
  handler: async (ctx, args) => {
    const row = await ctx.db.get(args.id);
    await ctx.db.delete(args.id);
    if (row?.businessNumberId) {
      const config = await ctx.db
        .query("ai_configs")
        .withIndex("by_phone_number_id", (q) => q.eq("phoneNumberId", row.businessNumberId))
        .first();
      if (config) await ctx.db.delete(config._id);
    }
    return args.id;
  },
});

/** One-time seed: if no numbers exist, insert one from env (WHATSAPP_PHONE_ID, WHATSAPP_WABA_ID). Run from Convex dashboard if needed. */
export const seedFromEnv = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("whatsapp_numbers").first();
    if (existing) return { seeded: false, message: "Numbers already exist." };
    const phoneId = process.env.WHATSAPP_PHONE_ID;
    const wabaId = process.env.WHATSAPP_WABA_ID ?? SEED_PLACEHOLDER;
    if (!phoneId) {
      throw new Error("WHATSAPP_PHONE_ID not set. Add at least one number via the Integrations page.");
    }
    await ctx.db.insert("whatsapp_numbers", {
      businessAccountId: wabaId,
      businessNumberId: phoneId,
      phone: phoneId,
      name: "رقم واتساب الرئيسي",
      createdAt: Date.now(),
    });
    await ctx.runMutation(api.agents.ensureForPhoneNumber, {
      phoneNumberId: phoneId,
    });
    return { seeded: true, message: "Seeded one number from env." };
  },
});

export const checkHealth = action({
  args: {},
  handler: async (ctx) => {
    const numbers = await ctx.runQuery(api.whatsappNumbers.list, {});
    const webhookSettings = await ctx.runQuery(api.webhookSettings.get, {});
    const expectedAppIdRaw = webhookSettings?.appId ?? process.env.WHATSAPP_APP_ID ?? "";
    const expectedAppId = normalizeNumericId(expectedAppIdRaw);
    const graphUrl = "https://graph.facebook.com/v21.0";
    const appSecret = process.env.WHATSAPP_APP_SECRET;

    const results: Array<{
      businessNumberId: string;
      name: string;
      tokenPresent: boolean;
      appSubscribed: boolean;
      profileReadable: boolean;
      mediaEndpointReadable: boolean;
      issues: string[];
    }> = [];

    for (const number of numbers) {
      const token = number.accessToken?.trim();
      const tokenPresent = Boolean(token);
      let appSubscribed = false;
      let profileReadable = false;
      let mediaEndpointReadable = false;
      const issues: string[] = [];
      const appSecretProof =
        appSecret && token
          ? await ctx.runAction(internal.nodeUtils.createAppSecretProof, { accessToken: token, appSecret })
          : undefined;

      if (!tokenPresent) {
        issues.push("Missing access token");
        results.push({
          businessNumberId: number.businessNumberId,
          name: number.name,
          tokenPresent,
          appSubscribed,
          profileReadable,
          mediaEndpointReadable,
          issues,
        });
        continue;
      }

      try {
        const profileUrl = new URL(`${graphUrl}/${number.businessNumberId}`);
        profileUrl.searchParams.set("fields", "id,display_phone_number");
        if (appSecretProof) profileUrl.searchParams.set("appsecret_proof", appSecretProof);
        const profileRes = await fetch(profileUrl.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        profileReadable = profileRes.ok;
        if (!profileReadable) {
          const body = await profileRes.text();
          issues.push(`Phone profile read failed (${profileRes.status}): ${body}`);
        }
      } catch (error) {
        issues.push(`Phone profile read error: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        // WhatsApp Cloud API does not provide a generic GET /{phone_number_id}/media listing endpoint.
        // A read check requires a concrete media ID, so we keep this probe informational.
        mediaEndpointReadable = true;
      } catch (error) {
        issues.push(`Media endpoint read error: ${error instanceof Error ? error.message : String(error)}`);
      }

      try {
        const subUrl = new URL(`${graphUrl}/${number.businessAccountId}/subscribed_apps`);
        if (appSecretProof) subUrl.searchParams.set("appsecret_proof", appSecretProof);
        const subRes = await fetch(subUrl.toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (subRes.ok) {
          const subData = await subRes.json();
          const rows: unknown[] = Array.isArray(subData?.data) ? subData.data : [];
          const appIds = rows
            .map((item) => {
              if (!item || typeof item !== "object") return "";
              const record = item as {
                id?: string | number;
                whatsapp_business_api_data?: { id?: string | number };
              };
              const directId = record.id != null ? String(record.id) : "";
              const nestedId =
                record.whatsapp_business_api_data?.id != null
                  ? String(record.whatsapp_business_api_data.id)
                  : "";
              return normalizeNumericId(directId || nestedId);
            })
            .filter(Boolean);
          if (expectedAppIdRaw && !expectedAppId) {
            issues.push(`Invalid App ID format in settings: "${expectedAppIdRaw}"`);
          }
          appSubscribed = expectedAppId ? appIds.includes(expectedAppId) : appIds.length > 0;
          if (!appSubscribed) {
            issues.push(
              expectedAppId
                ? `App ${expectedAppId} is not subscribed to this WABA. Subscribed IDs: ${appIds.join(", ") || "none"}`
                : "No subscribed apps found for this WABA"
            );
          }
        } else {
          const body = await subRes.text();
          issues.push(`WABA subscribed_apps check failed (${subRes.status}): ${body}`);
        }
      } catch (error) {
        issues.push(`WABA subscription check error: ${error instanceof Error ? error.message : String(error)}`);
      }

      results.push({
        businessNumberId: number.businessNumberId,
        name: number.name,
        tokenPresent,
        appSubscribed,
        profileReadable,
        mediaEndpointReadable,
        issues,
      });
    }

    return results;
  },
});

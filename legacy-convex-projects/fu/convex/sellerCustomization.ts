import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { throwAppError } from "./errors";
import { computeCombinationKey, getProviderId, normalizeStringRecord } from "./utils";

function resolvePrice(params: {
  basePrice: number;
  selection: Record<string, string>;
  rules: Array<{
    ruleType: "valueAdjustment" | "valueMultiplier" | "pairOverride" | "comboOverride";
    appliesTo: any;
    amount?: number;
    multiplier?: number;
    priority: number;
  }>;
}) {
  const breakdown: Array<{ type: string; label: string; amount?: number; multiplier?: number }> = [];
  let price = params.basePrice;

  const activeRules = [...params.rules].sort((a, b) => a.priority - b.priority);

  for (const r of activeRules) {
    if (r.ruleType === "valueMultiplier") {
      const { groupKey, valueKey } = (r.appliesTo ?? {}) as any;
      if (typeof groupKey === "string" && typeof valueKey === "string" && params.selection[groupKey] === valueKey) {
        const m = r.multiplier ?? 1;
        price = price * m;
        breakdown.push({ type: r.ruleType, label: `${groupKey}:${valueKey}`, multiplier: m });
      }
    }
    if (r.ruleType === "valueAdjustment") {
      const { groupKey, valueKey } = (r.appliesTo ?? {}) as any;
      if (typeof groupKey === "string" && typeof valueKey === "string" && params.selection[groupKey] === valueKey) {
        const a = r.amount ?? 0;
        price = price + a;
        breakdown.push({ type: r.ruleType, label: `${groupKey}:${valueKey}`, amount: a });
      }
    }
  }

  const overrides = activeRules.filter((r) => r.ruleType === "pairOverride" || r.ruleType === "comboOverride");
  let bestOverride: { priority: number; amount: number; label: string; type: string } | null = null;

  const selectionKey = computeCombinationKey(params.selection);

  for (const r of overrides) {
    if (r.ruleType === "comboOverride") {
      const { combinationKey } = (r.appliesTo ?? {}) as any;
      if (typeof combinationKey === "string" && combinationKey === selectionKey && typeof r.amount === "number") {
        if (!bestOverride || r.priority >= bestOverride.priority) {
          bestOverride = { priority: r.priority, amount: r.amount, label: combinationKey, type: r.ruleType };
        }
      }
    }
    if (r.ruleType === "pairOverride") {
      const { pairs, fixedPrice } = (r.appliesTo ?? {}) as any;
      const amount = typeof r.amount === "number" ? r.amount : typeof fixedPrice === "number" ? fixedPrice : undefined;
      if (!Array.isArray(pairs) || typeof amount !== "number") continue;

      const matches = pairs.every((p: any) => {
        const g = p?.groupKey;
        const vKey = p?.valueKey;
        return typeof g === "string" && typeof vKey === "string" && params.selection[g] === vKey;
      });

      if (matches) {
        const label = pairs.map((p: any) => `${p.groupKey}:${p.valueKey}`).join("|");
        if (!bestOverride || r.priority >= bestOverride.priority) {
          bestOverride = { priority: r.priority, amount, label, type: r.ruleType };
        }
      }
    }
  }

  if (bestOverride) {
    price = bestOverride.amount;
    breakdown.push({ type: bestOverride.type, label: bestOverride.label, amount: bestOverride.amount });
  }

  return { price: Math.round(price * 100) / 100, breakdown, combinationKey: selectionKey };
}

export const getProductCustomization = query({
  args: {
    productId: v.id("sellerProducts"),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const optionGroups = await ctx.db
      .query("sellerProductOptionGroups")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const optionValues = await ctx.db
      .query("sellerProductOptionValues")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const priceRules = await ctx.db
      .query("sellerProductPriceRules")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const variants = await ctx.db
      .query("sellerProductVariants")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    return {
      product,
      optionGroups: optionGroups.sort((a, b) => a.position - b.position),
      optionValues: optionValues.sort((a, b) => a.position - b.position),
      priceRules: priceRules.sort((a, b) => a.priority - b.priority),
      variants: variants.filter((v) => v.isActive),
    };
  },
});

export const resolveSellerVariant = query({
  args: {
    productId: v.id("sellerProducts"),
    selectedOptions: v.any(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const selection = normalizeStringRecord(args.selectedOptions);

    const optionGroups = await ctx.db
      .query("sellerProductOptionGroups")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();
    const groupKeys = new Set(optionGroups.filter((g) => g.isActive).map((g) => g.key));
    for (const key of Object.keys(selection)) {
      if (!groupKeys.has(key)) throwAppError("VALIDATION_FAILED", "Invalid option selection");
    }

    const optionValues = await ctx.db
      .query("sellerProductOptionValues")
      .withIndex("by_product", (q) => q.eq("productId", args.productId))
      .collect();

    const allowed = new Map<string, Set<string>>();
    for (const g of optionGroups) {
      if (!g.isActive) continue;
      allowed.set(g.key, new Set());
    }
    for (const vRow of optionValues) {
      if (!vRow.isActive) continue;
      const group = optionGroups.find((g) => g._id === vRow.groupId);
      if (!group || !group.isActive) continue;
      allowed.get(group.key)?.add(vRow.valueKey);
    }
    for (const [k, vKey] of Object.entries(selection)) {
      if (!allowed.get(k)?.has(vKey)) throwAppError("VALIDATION_FAILED", "Invalid option selection");
    }

    const { price, breakdown, combinationKey } = resolvePrice({
      basePrice: product.price,
      selection,
      rules: (
        await ctx.db
          .query("sellerProductPriceRules")
          .withIndex("by_product", (q) => q.eq("productId", args.productId))
          .collect()
      )
        .filter((r) => r.isActive)
        .map((r) => ({
          ruleType: r.ruleType,
          appliesTo: r.appliesTo,
          amount: r.amount ?? undefined,
          multiplier: r.multiplier ?? undefined,
          priority: r.priority,
        })),
    });

    const variant = await ctx.db
      .query("sellerProductVariants")
      .withIndex("by_product_and_combinationKey", (q) =>
        q.eq("productId", args.productId).eq("combinationKey", combinationKey)
      )
      .first();

    const images = variant?.images?.length
      ? variant.images
      : variant?.image
        ? [variant.image]
        : product.images.length
          ? product.images
          : [product.image];

    const result = {
      variantId: variant?._id,
      selection,
      combinationKey,
      price: variant?.price ?? price,
      computedPrice: price,
      priceBreakdown: breakdown,
      stock: variant?.stock ?? product.stock,
      sku: variant?.sku ?? product.sku,
      images,
      isActive: variant?.isActive ?? true,
    };

    return result;
  },
});

function buildCustomizationVersion(params: {
  productUpdatedAt: number;
  optionGroups: Array<{ updatedAt: number }>;
  optionValues: Array<{ updatedAt: number }>;
  priceRules: Array<{ updatedAt: number }>;
  variants: Array<{ updatedAt: number }>;
}) {
  const maxOf = (arr: Array<{ updatedAt: number }>) =>
    arr.reduce((m, x) => (x.updatedAt > m ? x.updatedAt : m), 0);
  return [
    params.productUpdatedAt,
    maxOf(params.optionGroups),
    maxOf(params.optionValues),
    maxOf(params.priceRules),
    maxOf(params.variants),
  ].join(":");
}

export const resolveSellerVariantCached = query({
  args: {
    productId: v.id("sellerProducts"),
    selectedOptions: v.any(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const selection = normalizeStringRecord(args.selectedOptions);
    const combinationKey = computeCombinationKey(selection);

    const [optionGroups, optionValues, priceRules, variants] = await Promise.all([
      ctx.db
        .query("sellerProductOptionGroups")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
      ctx.db
        .query("sellerProductOptionValues")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
      ctx.db
        .query("sellerProductPriceRules")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
      ctx.db
        .query("sellerProductVariants")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
    ]);

    const version = buildCustomizationVersion({
      productUpdatedAt: product.updatedAt,
      optionGroups,
      optionValues,
      priceRules,
      variants,
    });

    if (combinationKey) {
      const cached = await ctx.db
        .query("sellerCustomizationCache")
        .withIndex("by_product_and_combinationKey", (q) =>
          q.eq("productId", args.productId).eq("combinationKey", combinationKey)
        )
        .first();
      if (cached && cached.version === version) {
        return { ...(cached.result as any), cacheHit: true, version };
      }
    }

    const groupKeys = new Set(optionGroups.filter((g) => g.isActive).map((g) => g.key));
    for (const key of Object.keys(selection)) {
      if (!groupKeys.has(key)) throwAppError("VALIDATION_FAILED", "Invalid option selection");
    }

    const allowed = new Map<string, Set<string>>();
    for (const g of optionGroups) {
      if (!g.isActive) continue;
      allowed.set(g.key, new Set());
    }
    for (const vRow of optionValues) {
      if (!vRow.isActive) continue;
      const group = optionGroups.find((g) => g._id === vRow.groupId);
      if (!group || !group.isActive) continue;
      allowed.get(group.key)?.add(vRow.valueKey);
    }
    for (const [k, vKey] of Object.entries(selection)) {
      if (!allowed.get(k)?.has(vKey)) throwAppError("VALIDATION_FAILED", "Invalid option selection");
    }

    const computed = resolvePrice({
      basePrice: product.price,
      selection,
      rules: priceRules
        .filter((r) => r.isActive)
        .map((r) => ({
          ruleType: r.ruleType,
          appliesTo: r.appliesTo,
          amount: r.amount ?? undefined,
          multiplier: r.multiplier ?? undefined,
          priority: r.priority,
        })),
    });

    const variant =
      computed.combinationKey.length > 0
        ? variants.find((v) => v.combinationKey === computed.combinationKey)
        : null;

    const images = variant?.images?.length
      ? variant.images
      : variant?.image
        ? [variant.image]
        : product.images.length
          ? product.images
          : [product.image];

    return {
      variantId: variant?._id,
      selection,
      combinationKey: computed.combinationKey,
      price: variant?.price ?? computed.price,
      computedPrice: computed.price,
      priceBreakdown: computed.breakdown,
      stock: variant?.stock ?? product.stock,
      sku: variant?.sku ?? product.sku,
      images,
      isActive: variant?.isActive ?? true,
      cacheHit: false,
      version,
    };
  },
});

export const warmSellerVariantCache = mutation({
  args: {
    productId: v.id("sellerProducts"),
    selectedOptions: v.any(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const selection = normalizeStringRecord(args.selectedOptions);
    const combinationKey = computeCombinationKey(selection);
    if (!combinationKey) throwAppError("VALIDATION_FAILED", "Invalid option selection");

    const [optionGroups, optionValues, priceRules, variants] = await Promise.all([
      ctx.db
        .query("sellerProductOptionGroups")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
      ctx.db
        .query("sellerProductOptionValues")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
      ctx.db
        .query("sellerProductPriceRules")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
      ctx.db
        .query("sellerProductVariants")
        .withIndex("by_product", (q) => q.eq("productId", args.productId))
        .collect(),
    ]);

    const version = buildCustomizationVersion({
      productUpdatedAt: product.updatedAt,
      optionGroups,
      optionValues,
      priceRules,
      variants,
    });

    const computed = resolvePrice({
      basePrice: product.price,
      selection,
      rules: priceRules
        .filter((r) => r.isActive)
        .map((r) => ({
          ruleType: r.ruleType,
          appliesTo: r.appliesTo,
          amount: r.amount ?? undefined,
          multiplier: r.multiplier ?? undefined,
          priority: r.priority,
        })),
    });

    const variant = variants.find((v) => v.combinationKey === computed.combinationKey);
    const images = variant?.images?.length
      ? variant.images
      : variant?.image
        ? [variant.image]
        : product.images.length
          ? product.images
          : [product.image];

    const result = {
      variantId: variant?._id,
      selection,
      combinationKey: computed.combinationKey,
      price: variant?.price ?? computed.price,
      computedPrice: computed.price,
      priceBreakdown: computed.breakdown,
      stock: variant?.stock ?? product.stock,
      sku: variant?.sku ?? product.sku,
      images,
      isActive: variant?.isActive ?? true,
    };

    const existing = await ctx.db
      .query("sellerCustomizationCache")
      .withIndex("by_product_and_combinationKey", (q) =>
        q.eq("productId", args.productId).eq("combinationKey", computed.combinationKey)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, { version, result, updatedAt: now });
      return { success: true, cacheId: existing._id };
    }
    const cacheId = await ctx.db.insert("sellerCustomizationCache", {
      productId: args.productId,
      providerId,
      combinationKey: computed.combinationKey,
      version,
      result,
      createdAt: now,
      updatedAt: now,
    });
    return { success: true, cacheId };
  },
});

export const trackCustomizationResolve = mutation({
  args: {
    productId: v.id("sellerProducts"),
    combinationKey: v.string(),
    durationMs: v.number(),
    cacheHit: v.boolean(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    await ctx.db.insert("sellerCustomizationResolveEvents", {
      providerId,
      productId: args.productId,
      combinationKey: args.combinationKey,
      durationMs: args.durationMs,
      cacheHit: args.cacheHit,
      createdAt: Date.now(),
    });

    return { success: true };
  },
});

export const createOptionGroup = mutation({
  args: {
    productId: v.id("sellerProducts"),
    key: v.string(),
    name: v.string(),
    type: v.union(v.literal("size"), v.literal("color"), v.literal("material"), v.literal("custom")),
    position: v.number(),
    isRequired: v.boolean(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const existing = await ctx.db
      .query("sellerProductOptionGroups")
      .withIndex("by_product_and_key", (q) => q.eq("productId", args.productId).eq("key", args.key))
      .first();
    if (existing) throwAppError("VALIDATION_FAILED", "Duplicate option key");

    const now = Date.now();
    const groupId = await ctx.db.insert("sellerProductOptionGroups", {
      productId: args.productId,
      providerId,
      key: args.key.trim(),
      name: args.name.trim(),
      type: args.type,
      position: args.position,
      isRequired: args.isRequired,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, groupId };
  },
});

export const updateOptionGroup = mutation({
  args: {
    groupId: v.id("sellerProductOptionGroups"),
    name: v.optional(v.string()),
    position: v.optional(v.number()),
    isRequired: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group) throwAppError("NOT_FOUND", "Option group not found");
    if (group.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name.trim();
    if (args.position !== undefined) updates.position = args.position;
    if (args.isRequired !== undefined) updates.isRequired = args.isRequired;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.groupId, updates);
    return { success: true };
  },
});

export const createOptionValue = mutation({
  args: {
    groupId: v.id("sellerProductOptionGroups"),
    valueKey: v.string(),
    label: v.string(),
    position: v.number(),
    hex: v.optional(v.string()),
    rgb: v.optional(v.string()),
    dimensions: v.optional(v.object({
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      depth: v.optional(v.number()),
      unit: v.optional(v.string()),
    })),
    textureName: v.optional(v.string()),
    meta: v.optional(v.any()),
    primaryImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const group = await ctx.db.get(args.groupId);
    if (!group) throwAppError("NOT_FOUND", "Option group not found");
    if (group.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const existing = await ctx.db
      .query("sellerProductOptionValues")
      .withIndex("by_product_group_valueKey", (q) =>
        q.eq("productId", group.productId).eq("groupId", group._id).eq("valueKey", args.valueKey)
      )
      .first();
    if (existing) throwAppError("VALIDATION_FAILED", "Duplicate option value");

    const now = Date.now();
    const valueId = await ctx.db.insert("sellerProductOptionValues", {
      productId: group.productId,
      providerId,
      groupId: group._id,
      valueKey: args.valueKey.trim(),
      label: args.label.trim(),
      position: args.position,
      isActive: true,
      hex: args.hex,
      rgb: args.rgb,
      dimensions: args.dimensions,
      textureName: args.textureName,
      meta: args.meta,
      primaryImageUrl: args.primaryImageUrl,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, valueId };
  },
});

export const updateOptionValue = mutation({
  args: {
    valueId: v.id("sellerProductOptionValues"),
    label: v.optional(v.string()),
    position: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
    hex: v.optional(v.string()),
    rgb: v.optional(v.string()),
    dimensions: v.optional(v.object({
      width: v.optional(v.number()),
      height: v.optional(v.number()),
      depth: v.optional(v.number()),
      unit: v.optional(v.string()),
    })),
    textureName: v.optional(v.string()),
    meta: v.optional(v.any()),
    primaryImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const value = await ctx.db.get(args.valueId);
    if (!value) throwAppError("NOT_FOUND", "Option value not found");
    if (value.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const updates: any = { updatedAt: Date.now() };
    if (args.label !== undefined) updates.label = args.label.trim();
    if (args.position !== undefined) updates.position = args.position;
    if (args.isActive !== undefined) updates.isActive = args.isActive;
    if (args.hex !== undefined) updates.hex = args.hex;
    if (args.rgb !== undefined) updates.rgb = args.rgb;
    if (args.dimensions !== undefined) updates.dimensions = args.dimensions;
    if (args.textureName !== undefined) updates.textureName = args.textureName;
    if (args.meta !== undefined) updates.meta = args.meta;
    if (args.primaryImageUrl !== undefined) updates.primaryImageUrl = args.primaryImageUrl;

    await ctx.db.patch(args.valueId, updates);
    return { success: true };
  },
});

export const createPriceRule = mutation({
  args: {
    productId: v.id("sellerProducts"),
    ruleType: v.union(
      v.literal("valueAdjustment"),
      v.literal("valueMultiplier"),
      v.literal("pairOverride"),
      v.literal("comboOverride")
    ),
    appliesTo: v.any(),
    amount: v.optional(v.number()),
    multiplier: v.optional(v.number()),
    currency: v.optional(v.string()),
    priority: v.number(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const now = Date.now();
    const ruleId = await ctx.db.insert("sellerProductPriceRules", {
      productId: args.productId,
      providerId,
      ruleType: args.ruleType,
      appliesTo: args.appliesTo,
      amount: args.amount,
      multiplier: args.multiplier,
      currency: args.currency,
      priority: args.priority,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, ruleId };
  },
});

export const updatePriceRule = mutation({
  args: {
    ruleId: v.id("sellerProductPriceRules"),
    appliesTo: v.optional(v.any()),
    amount: v.optional(v.number()),
    multiplier: v.optional(v.number()),
    currency: v.optional(v.string()),
    priority: v.optional(v.number()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const rule = await ctx.db.get(args.ruleId);
    if (!rule) throwAppError("NOT_FOUND", "Rule not found");
    if (rule.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const updates: any = { updatedAt: Date.now() };
    if (args.appliesTo !== undefined) updates.appliesTo = args.appliesTo;
    if (args.amount !== undefined) updates.amount = args.amount;
    if (args.multiplier !== undefined) updates.multiplier = args.multiplier;
    if (args.currency !== undefined) updates.currency = args.currency;
    if (args.priority !== undefined) updates.priority = args.priority;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.ruleId, updates);
    return { success: true };
  },
});

export const createCustomizationTemplate = mutation({
  args: {
    name: v.string(),
    appliesTo: v.optional(v.any()),
    definition: v.any(),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const now = Date.now();
    const templateId = await ctx.db.insert("sellerCustomizationTemplates", {
      providerId,
      name: args.name.trim(),
      appliesTo: args.appliesTo,
      definition: args.definition,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, templateId };
  },
});

export const listCustomizationTemplates = query({
  args: {},
  handler: async (ctx) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const items = await ctx.db
      .query("sellerCustomizationTemplates")
      .withIndex("by_provider", (q) => q.eq("providerId", providerId))
      .order("desc")
      .collect();

    return items;
  },
});

export const getCustomizationTemplate = query({
  args: {
    templateId: v.id("sellerCustomizationTemplates"),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const template = await ctx.db.get(args.templateId);
    if (!template) throwAppError("NOT_FOUND", "Template not found");
    if (template.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    return template;
  },
});

export const applyCustomizationTemplateToProduct = mutation({
  args: {
    productId: v.id("sellerProducts"),
    templateId: v.id("sellerCustomizationTemplates"),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const template = await ctx.db.get(args.templateId);
    if (!template) throwAppError("NOT_FOUND", "Template not found");
    if (template.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const def = template.definition as any;
    const groups = Array.isArray(def?.groups) ? def.groups : [];
    const rules = Array.isArray(def?.priceRules) ? def.priceRules : [];

    const now = Date.now();

    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      const key = typeof g?.key === "string" ? g.key : null;
      const name = typeof g?.name === "string" ? g.name : null;
      const type = g?.type;
      const isRequired = !!g?.isRequired;
      if (!key || !name) continue;
      if (!["size", "color", "material", "custom"].includes(type)) continue;

      const existing = await ctx.db
        .query("sellerProductOptionGroups")
        .withIndex("by_product_and_key", (q) => q.eq("productId", args.productId).eq("key", key))
        .first();

      const groupId = existing
        ? existing._id
        : await ctx.db.insert("sellerProductOptionGroups", {
            productId: args.productId,
            providerId,
            key,
            name,
            type,
            position: typeof g?.position === "number" ? g.position : i,
            isRequired,
            isActive: true,
            createdAt: now,
            updatedAt: now,
          });

      const values = Array.isArray(g?.values) ? g.values : [];
      for (let j = 0; j < values.length; j++) {
        const vRow = values[j];
        const valueKey = typeof vRow?.valueKey === "string" ? vRow.valueKey : null;
        const label = typeof vRow?.label === "string" ? vRow.label : null;
        if (!valueKey || !label) continue;

        const existingValue = await ctx.db
          .query("sellerProductOptionValues")
          .withIndex("by_product_group_valueKey", (q) =>
            q.eq("productId", args.productId).eq("groupId", groupId).eq("valueKey", valueKey)
          )
          .first();
        if (existingValue) continue;

        await ctx.db.insert("sellerProductOptionValues", {
          productId: args.productId,
          providerId,
          groupId,
          valueKey,
          label,
          position: typeof vRow?.position === "number" ? vRow.position : j,
          isActive: true,
          hex: typeof vRow?.hex === "string" ? vRow.hex : undefined,
          rgb: typeof vRow?.rgb === "string" ? vRow.rgb : undefined,
          dimensions: vRow?.dimensions,
          textureName: typeof vRow?.textureName === "string" ? vRow.textureName : undefined,
          meta: vRow?.meta,
          primaryImageUrl: typeof vRow?.primaryImageUrl === "string" ? vRow.primaryImageUrl : undefined,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (let i = 0; i < rules.length; i++) {
      const r = rules[i];
      const ruleType = r?.ruleType;
      if (!["valueAdjustment", "valueMultiplier", "pairOverride", "comboOverride"].includes(ruleType)) continue;
      await ctx.db.insert("sellerProductPriceRules", {
        productId: args.productId,
        providerId,
        ruleType,
        appliesTo: r?.appliesTo ?? {},
        amount: typeof r?.amount === "number" ? r.amount : undefined,
        multiplier: typeof r?.multiplier === "number" ? r.multiplier : undefined,
        currency: typeof r?.currency === "string" ? r.currency : undefined,
        priority: typeof r?.priority === "number" ? r.priority : i,
        isActive: r?.isActive === false ? false : true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});

export const upsertSellerProductVariant = mutation({
  args: {
    productId: v.id("sellerProducts"),
    combination: v.any(),
    price: v.number(),
    stock: v.number(),
    sku: v.optional(v.string()),
    image: v.optional(v.string()),
    images: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    parentVariantId: v.optional(v.id("sellerProductVariants")),
    isDefault: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const providerId = await getProviderId(ctx);
    if (!providerId) throwAppError("AUTH_REQUIRED", "Unauthenticated");

    const product = await ctx.db.get(args.productId);
    if (!product || product.isDeleted) throwAppError("NOT_FOUND", "Product not found");
    if (product.providerId !== providerId) throwAppError("FORBIDDEN", "Unauthorized");

    const combination = normalizeStringRecord(args.combination);
    const combinationKey = computeCombinationKey(combination);
    if (!combinationKey) throwAppError("VALIDATION_FAILED", "Invalid combination");

    const existing = await ctx.db
      .query("sellerProductVariants")
      .withIndex("by_product_and_combinationKey", (q) =>
        q.eq("productId", args.productId).eq("combinationKey", combinationKey)
      )
      .first();

    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        combination,
        price: args.price,
        stock: args.stock,
        sku: args.sku,
        image: args.image,
        images: args.images,
        isActive: args.isActive,
        parentVariantId: args.parentVariantId,
        isDefault: args.isDefault,
        updatedAt: now,
      });
      return { success: true, variantId: existing._id };
    }

    const variantId = await ctx.db.insert("sellerProductVariants", {
      productId: args.productId,
      providerId,
      combination,
      combinationKey,
      parentVariantId: args.parentVariantId,
      isDefault: args.isDefault,
      price: args.price,
      stock: args.stock,
      sku: args.sku,
      image: args.image,
      images: args.images,
      isActive: args.isActive,
      createdAt: now,
      updatedAt: now,
    });

    return { success: true, variantId };
  },
});

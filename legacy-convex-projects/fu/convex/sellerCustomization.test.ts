import { convexTest } from "convex-test";
import { describe, it, expect, vi } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

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

describe("Seller Customization", () => {
  it("resolves price rules and overrides, then applies variant override", async () => {
    const t = convexTest(schema, modules);
    const providerId = "provider_1";
    const tUser = t.withIdentity({ subject: providerId });

    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("sellerProducts", {
        providerId,
        name: "Chair",
        nameEn: undefined,
        description: "Base chair",
        price: 100,
        comparePrice: undefined,
        stock: 10,
        status: "active",
        categoryId: undefined,
        style: undefined,
        sku: "BASE",
        image: "https://example.com/base.jpg",
        images: ["https://example.com/base.jpg"],
        video: undefined,
        videos: undefined,
        sales: 0,
        views: 0,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const sizeGroup = await tUser.mutation(api.sellerCustomization.createOptionGroup, {
      productId,
      key: "size",
      name: "Size",
      type: "size",
      position: 0,
      isRequired: true,
    });
    const colorGroup = await tUser.mutation(api.sellerCustomization.createOptionGroup, {
      productId,
      key: "color",
      name: "Color",
      type: "color",
      position: 1,
      isRequired: true,
    });

    await tUser.mutation(api.sellerCustomization.createOptionValue, {
      groupId: sizeGroup.groupId,
      valueKey: "L",
      label: "Large",
      position: 0,
    });
    await tUser.mutation(api.sellerCustomization.createOptionValue, {
      groupId: colorGroup.groupId,
      valueKey: "red",
      label: "Red",
      position: 0,
      hex: "#ff0000",
    });

    await tUser.mutation(api.sellerCustomization.createPriceRule, {
      productId,
      ruleType: "valueAdjustment",
      appliesTo: { groupKey: "size", valueKey: "L" },
      amount: 10,
      priority: 1,
    });
    await tUser.mutation(api.sellerCustomization.createPriceRule, {
      productId,
      ruleType: "valueAdjustment",
      appliesTo: { groupKey: "color", valueKey: "red" },
      amount: 5,
      priority: 2,
    });
    await tUser.mutation(api.sellerCustomization.createPriceRule, {
      productId,
      ruleType: "pairOverride",
      appliesTo: { pairs: [{ groupKey: "size", valueKey: "L" }, { groupKey: "color", valueKey: "red" }] },
      amount: 200,
      priority: 10,
    });

    const resolvedBefore = await tUser.query(api.sellerCustomization.resolveSellerVariant, {
      productId,
      selectedOptions: { size: "L", color: "red" },
    });

    expect(resolvedBefore.computedPrice).toBe(200);
    expect(resolvedBefore.price).toBe(200);
    expect(resolvedBefore.stock).toBe(10);

    await tUser.mutation(api.sellerCustomization.upsertSellerProductVariant, {
      productId,
      combination: { size: "L", color: "red" },
      price: 250,
      stock: 3,
      sku: "L-RED",
      image: "https://example.com/l-red.jpg",
      images: ["https://example.com/l-red.jpg"],
      isActive: true,
    });

    const resolvedAfter = await tUser.query(api.sellerCustomization.resolveSellerVariant, {
      productId,
      selectedOptions: { size: "L", color: "red" },
    });

    expect(resolvedAfter.computedPrice).toBe(200);
    expect(resolvedAfter.price).toBe(250);
    expect(resolvedAfter.stock).toBe(3);
    expect(resolvedAfter.sku).toBe("L-RED");
    expect(resolvedAfter.images[0]).toBe("https://example.com/l-red.jpg");
  });

  it("upserts variants by combinationKey without duplicating", async () => {
    const t = convexTest(schema, modules);
    const providerId = "provider_2";
    const tUser = t.withIdentity({ subject: providerId });

    const productId = await t.run(async (ctx) => {
      return await ctx.db.insert("sellerProducts", {
        providerId,
        name: "Sofa",
        nameEn: undefined,
        description: undefined,
        price: 500,
        comparePrice: undefined,
        stock: 5,
        status: "active",
        categoryId: undefined,
        style: undefined,
        sku: undefined,
        image: "https://example.com/sofa.jpg",
        images: ["https://example.com/sofa.jpg"],
        video: undefined,
        videos: undefined,
        sales: 0,
        views: 0,
        isDeleted: false,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
    });

    const first = await tUser.mutation(api.sellerCustomization.upsertSellerProductVariant, {
      productId,
      combination: { material: "linen" },
      price: 520,
      stock: 2,
      isActive: true,
    });

    const second = await tUser.mutation(api.sellerCustomization.upsertSellerProductVariant, {
      productId,
      combination: { material: "linen" },
      price: 530,
      stock: 1,
      isActive: true,
    });

    expect(first.variantId).toBe(second.variantId);

    const variants = await tUser.query(api.sellerCustomization.getProductCustomization, { productId });
    const linen = variants.variants.filter((v: any) => v.combinationKey.includes("material:linen"));
    expect(linen).toHaveLength(1);
    expect(linen[0].price).toBe(530);
    expect(linen[0].stock).toBe(1);
  });
});


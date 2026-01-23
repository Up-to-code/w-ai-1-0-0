import { v } from "convex/values";
import { action, mutation, query, internalAction, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// Salla API endpoints
const SALLA_TOKEN_URL = "https://accounts.salla.sa/oauth2/token";
const SALLA_API_BASE = "https://api.salla.dev/admin/v2";

// Get connection status
export const getConnection = query({
    args: {},
    handler: async (ctx) => {
        // For now, get the first integration (single-tenant)
        const integration = await ctx.db.query("sallaIntegrations").first();

        if (!integration) {
            return null;
        }

        return {
            merchantId: integration.merchantId,
            storeName: integration.storeName,
            storeUrl: integration.storeUrl,
            connectedAt: integration.connectedAt,
            isExpired: integration.expiresAt < Date.now(),
        };
    },
});

// Save tokens after OAuth callback
export const saveTokens = mutation({
    args: {
        merchantId: v.string(),
        accessToken: v.string(),
        refreshToken: v.string(),
        expiresIn: v.number(), // seconds
        storeName: v.optional(v.string()),
        storeUrl: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if integration already exists
        const existing = await ctx.db
            .query("sallaIntegrations")
            .withIndex("by_merchant", (q) => q.eq("merchantId", args.merchantId))
            .first();

        const expiresAt = Date.now() + args.expiresIn * 1000;

        if (existing) {
            await ctx.db.patch(existing._id, {
                accessToken: args.accessToken,
                refreshToken: args.refreshToken,
                expiresAt,
                storeName: args.storeName,
                storeUrl: args.storeUrl,
            });
            return existing._id;
        }

        return await ctx.db.insert("sallaIntegrations", {
            merchantId: args.merchantId,
            accessToken: args.accessToken,
            refreshToken: args.refreshToken,
            expiresAt,
            storeName: args.storeName,
            storeUrl: args.storeUrl,
            connectedAt: Date.now(),
        });
    },
});

// Disconnect Salla
export const disconnect = mutation({
    args: {},
    handler: async (ctx) => {
        const integration = await ctx.db.query("sallaIntegrations").first();
        if (integration) {
            await ctx.db.delete(integration._id);
        }
    },
});

// Exchange authorization code for tokens (internal - called from http.ts)
export const exchangeCode = internalAction({
    args: {
        code: v.string(),
    },
    handler: async (ctx, args) => {
        const clientId = process.env.SALLA_CLIENT_ID;
        const clientSecret = process.env.SALLA_CLIENT_SECRET;
        const redirectUri = process.env.SALLA_REDIRECT_URI;

        if (!clientId || !clientSecret || !redirectUri) {
            throw new Error("Missing Salla OAuth configuration");
        }

        // Exchange code for tokens
        const tokenResponse = await fetch(SALLA_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "authorization_code",
                client_id: clientId,
                client_secret: clientSecret,
                code: args.code,
                redirect_uri: redirectUri,
            }),
        });

        if (!tokenResponse.ok) {
            const error = await tokenResponse.text();
            throw new Error(`Failed to exchange code: ${error}`);
        }

        const tokens = await tokenResponse.json();

        // Get merchant info
        const merchantResponse = await fetch(`${SALLA_API_BASE}/store/info`, {
            headers: {
                Authorization: `Bearer ${tokens.access_token}`,
            },
        });

        let merchantInfo = { id: "unknown", name: undefined, domain: undefined };
        if (merchantResponse.ok) {
            const data = await merchantResponse.json();
            merchantInfo = {
                id: data.data?.id?.toString() || "unknown",
                name: data.data?.name,
                domain: data.data?.domain,
            };
        }

        // Save tokens to database
        await ctx.runMutation("salla:saveTokens" as any, {
            merchantId: merchantInfo.id,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in || 1209600, // Default 14 days
            storeName: merchantInfo.name,
            storeUrl: merchantInfo.domain,
        });

        return { success: true, storeName: merchantInfo.name };
    },
});

// Refresh access token
export const refreshToken = action({
    args: {},
    handler: async (ctx) => {
        const integration = await ctx.runQuery("salla:getConnection" as any, {});

        if (!integration) {
            throw new Error("No Salla integration found");
        }

        const clientId = process.env.SALLA_CLIENT_ID;
        const clientSecret = process.env.SALLA_CLIENT_SECRET;

        if (!clientId || !clientSecret) {
            throw new Error("Missing Salla OAuth configuration");
        }

        // Get current refresh token from DB
        const dbIntegration = await ctx.runQuery("salla:getConnection" as any, {});

        const tokenResponse = await fetch(SALLA_TOKEN_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                client_id: clientId,
                client_secret: clientSecret,
                refresh_token: dbIntegration.refreshToken,
            }),
        });

        if (!tokenResponse.ok) {
            throw new Error("Failed to refresh token");
        }

        const tokens = await tokenResponse.json();

        // Update tokens in database
        await ctx.runMutation("salla:saveTokens" as any, {
            merchantId: integration.merchantId,
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in || 1209600,
        });

        return { success: true };
    },
});

// Fetch products from Salla API (not stored in Convex)
export const fetchProducts = action({
    args: {
        page: v.optional(v.number()),
        perPage: v.optional(v.number()),
        keyword: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Get access token from DB
        const integration = await ctx.runQuery("salla:getConnectionWithToken" as any, {});

        if (!integration) {
            return { connected: false, products: [] };
        }

        const page = args.page || 1;
        const perPage = args.perPage || 20;
        
        let url = `${SALLA_API_BASE}/products?page=${page}&per_page=${perPage}`;
        if (args.keyword) {
            url += `&keyword=${encodeURIComponent(args.keyword)}`;
        }

        const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                // Token expired, try to refresh
                await ctx.runAction("salla:refreshToken" as any, {});
                return ctx.runAction("salla:fetchProducts" as any, { page, perPage });
            }
            throw new Error("Failed to fetch products");
        }

        const data = await response.json();

        return {
            connected: true,
            products: data.data?.map((p: any) => ({
                id: p.id,
                name: p.name,
                sku: p.sku || `SALLA-${p.id}`,
                price: p.price?.amount || 0,
                originalPrice: p.sale_price?.amount || p.price?.amount || 0,
                currency: p.price?.currency || "SAR",
                stock: p.quantity || 0,
                image: p.main_image || null,
                inStock: p.quantity > 0,
                description: p.description || "",
                url: p.urls?.customer || "",
                status: p.status || "active",
                options: p.options || [],
                images: p.images || [],
            })) || [],
            pagination: {
                currentPage: data.pagination?.current_page || 1,
                totalPages: data.pagination?.total_pages || 1,
                totalItems: data.pagination?.total || 0,
            },
        };
    },
});

// Fetch single product from Salla
export const getProduct = action({
    args: {
        id: v.string(),
    },
    handler: async (ctx, args) => {
        const integration = await ctx.runQuery("salla:getConnectionWithToken" as any, {});

        if (!integration) {
            throw new Error("Not connected to Salla");
        }

        const response = await fetch(
            `${SALLA_API_BASE}/products/${args.id}`,
            {
                headers: {
                    Authorization: `Bearer ${integration.accessToken}`,
                },
            }
        );

        if (!response.ok) {
            if (response.status === 401) {
                await ctx.runAction("salla:refreshToken" as any, {});
                return ctx.runAction("salla:getProduct" as any, { id: args.id });
            }
            throw new Error("Failed to fetch product");
        }

        const data = await response.json();
        const p = data.data;

        return {
            id: p.id,
            name: p.name,
            sku: p.sku || `SALLA-${p.id}`,
            price: p.price?.amount || 0,
            originalPrice: p.sale_price?.amount || p.price?.amount || 0,
            currency: p.price?.currency || "SAR",
            stock: p.quantity || 0,
            image: p.main_image || null,
            images: p.images || [],
            inStock: p.quantity > 0,
            description: p.description || "",
            url: p.urls?.customer || "",
            status: p.status || "active",
            options: p.options || [],
        };
    },
});

// Internal query to get token (for actions)
export const getConnectionWithToken = query({
    args: {},
    handler: async (ctx) => {
        const integration = await ctx.db.query("sallaIntegrations").first();
        return integration;
    },
});

import { createClient, type GenericCtx } from "@convex-dev/better-auth";
import { convex } from "@convex-dev/better-auth/plugins";
import { betterAuth } from "better-auth/minimal";
import { expo } from '@better-auth/expo'
import { components } from "./_generated/api";
import { DataModel } from "./_generated/dataModel";
import { query } from "./_generated/server";
import authConfig from "./auth.config";

// The component client has methods needed for integrating Convex with Better Auth,
// as well as helper methods for general use.
export const authComponent = createClient<DataModel>(components.betterAuth);

export const createAuth = (ctx: GenericCtx<DataModel>) => {
    const siteUrl = process.env.SITE_URL || process.env.CONVEX_SITE_URL || "";
    
    return betterAuth({
        baseURL: siteUrl,
        database: authComponent.adapter(ctx),
        // Configure simple, non-verified email/password to get started
        emailAndPassword: {
            enabled: true,
            requireEmailVerification: false,
        },
        plugins: [
            // The Convex plugin is required for Convex compatibility
            convex({ authConfig }),
            // Expo plugin for mobile app support (optional, can be removed if not needed)
            expo(),
        ],
        // Trusted origins for mobile apps (optional)
        trustedOrigins: [
            // Production app scheme
            "fuapp://",
            "fuapp://*",
            // Development mode - Expo's exp:// scheme with wildcards
            "exp://",
            "exp://**",
            "exp://192.168.*.*:*/**",
        ],
        // Social providers
        // Only configure Google if credentials are provided
        socialProviders: (() => {
            const clientId = process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "";
            const clientSecret = process.env.GOOGLE_CLIENT_SECRET || process.env.AUTH_GOOGLE_SECRET || "";
            
            if (!clientId || !clientSecret) {
                console.warn("Google OAuth credentials not set. Google sign-in will not work.");
                return {};
            }
            
            return {
                google: {
                    clientId,
                    clientSecret,
                },
            };
        })(),
    })
}
// Example function for getting the current user
// Feel free to edit, omit, etc.
export const getCurrentUser = query({
    args: {},
    handler: async (ctx) => {
        return authComponent.getAuthUser(ctx);
    },
});

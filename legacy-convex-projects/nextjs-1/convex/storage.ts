import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

// Generate upload URL
export const generateUploadUrl = mutation(async (ctx) => {
    return await ctx.storage.generateUploadUrl();
});

// Get file URL from storage ID
export const getUrl = query({
    args: { storageId: v.string() },
    handler: async (ctx, args) => {
        return await ctx.storage.getUrl(args.storageId);
    },
});

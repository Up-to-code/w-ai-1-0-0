import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
    handler: async (ctx) => {
        return await ctx.db.query("workflows").order("desc").collect();
    }
});

export const create = mutation({
    args: {
        name: v.string(),
        trigger: v.string(),
        triggerConfig: v.any(),
        action: v.string(),
        actionConfig: v.any(),
    },
    handler: async (ctx, args) => {
        return await ctx.db.insert("workflows", {
            name: args.name,
            trigger: args.trigger,
            triggerConfig: args.triggerConfig,
            action: args.action,
            actionConfig: args.actionConfig,
            enabled: true,
            stats: { runs: 0 },
            createdAt: Date.now(),
        });
    }
});

export const toggle = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, args) => {
        const workflow = await ctx.db.get(args.id);
        if (workflow) {
            await ctx.db.patch(args.id, { enabled: !workflow.enabled });
        }
    }
});

export const remove = mutation({
    args: { id: v.id("workflows") },
    handler: async (ctx, args) => {
        await ctx.db.delete(args.id);
    }
});

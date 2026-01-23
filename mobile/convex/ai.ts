import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const saveKnowledge = mutation({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    // In real app, call action to generate embeddings
    await ctx.db.insert("knowledge_base", {
      title: args.title,
      content: args.content,
      embedding: [], // Placeholder
      sourceType: "text",
      createdAt: Date.now(),
    });
  },
});

export const listKnowledge = query({
  handler: async (ctx) => {
    return await ctx.db.query("knowledge_base").order("desc").collect();
  },
});

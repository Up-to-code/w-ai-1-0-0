import { mutation, query, action, internalAction, internalMutation, internalQuery } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { internal } from "./_generated/api";

const EMBEDDING_MODEL = "openai/text-embedding-3-small";
const EMBEDDING_DIMENSIONS = 1536;

/** Generate embedding for text via OpenRouter. Used by saveKnowledge and searchKnowledge. */
export const embedText = internalAction({
  args: { text: v.string() },
  handler: async (ctx, args): Promise<number[]> => {
    const apiKey = process.env.OPENROUTER_KEY;
    if (!apiKey) throw new Error("Missing OPENROUTER_KEY for embeddings");
    const text = args.text.trim().slice(0, 8000);
    if (!text) return new Array(EMBEDDING_DIMENSIONS).fill(0);

    const res = await fetch("https://openrouter.ai/api/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: EMBEDDING_MODEL,
        input: text,
      }),
    });
    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Embedding API error: ${err}`);
    }
    const data = (await res.json()) as { data?: { embedding?: number[] }[] };
    const embedding = data.data?.[0]?.embedding;
    if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
      throw new Error("Invalid embedding response");
    }
    return embedding;
  },
});

/** Insert a knowledge entry with precomputed embedding. Called from saveKnowledge action. */
export const insertKnowledge = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    embedding: v.array(v.float64()),
    sourceType: v.union(v.literal("text"), v.literal("pdf")),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("knowledge_base", {
      title: args.title,
      content: args.content,
      embedding: args.embedding,
      sourceType: args.sourceType,
      createdAt: args.createdAt,
    });
  },
});

/** Save knowledge: generate embedding then insert. Public action for dashboard/API. */
export const saveKnowledge = action({
  args: { title: v.string(), content: v.string() },
  handler: async (ctx, args) => {
    const textToEmbed = `${args.title}\n${args.content}`.trim().slice(0, 8000);
    const embedding = await ctx.runAction(internal.ai.embedText, { text: textToEmbed });
    await ctx.runMutation(internal.ai.insertKnowledge, {
      title: args.title,
      content: args.content,
      embedding,
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

/** Load knowledge docs by IDs. Used by searchKnowledge action after vector search. */
export const getKnowledgeByIds = internalQuery({
  args: { ids: v.array(v.id("knowledge_base")) },
  handler: async (ctx, args) => {
    const out: { _id: typeof args.ids[0]; title: string; content: string }[] = [];
    for (const id of args.ids) {
      const doc = await ctx.db.get(id);
      if (doc) out.push({ _id: doc._id, title: doc.title, content: doc.content });
    }
    return out;
  },
});

type KnowledgeSnippet = { title: string; content: string };

/** Vector search over knowledge base. Returns top-k snippets for RAG. Called by agent. */
export const searchKnowledge = internalAction({
  args: { query: v.string(), limit: v.optional(v.number()) },
  handler: async (ctx, args): Promise<KnowledgeSnippet[]> => {
    const topK = Math.min(args.limit ?? 5, 10);
    const q = args.query.trim().slice(0, 1000);
    if (!q) return [];

    const embedding: number[] = await ctx.runAction(internal.ai.embedText, { text: q });
    const results: { _id: Id<"knowledge_base">; _score: number }[] = await ctx.vectorSearch("knowledge_base", "by_embedding", {
      vector: embedding,
      limit: topK,
    });
    if (results.length === 0) return [];

    const docs: { _id: Id<"knowledge_base">; title: string; content: string }[] = await ctx.runQuery(internal.ai.getKnowledgeByIds, {
      ids: results.map((r) => r._id),
    });
    return docs.map((d) => ({ title: d.title, content: d.content }));
  },
});

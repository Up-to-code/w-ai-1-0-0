# Agent Search: Products & Documentation

The agent uses two kinds of search: **product search** (for catalog and pricing) and **documentation search** (knowledge base RAG).

## Product search

Used when the user intent is product-related (price, availability, category, product number).

1. **Salla API**: First, the agent calls Salla live search (see [convex/salla.ts](../convex/salla.ts)) with the user query. If the store is connected and returns results, those are used.
2. **Fallback**: If Salla returns nothing or is not connected, the agent uses the local products table via `api.products.list` with a search term (Convex search index `search_products` on `name`, filter by `inStock` if needed).
3. **Retries**: For Salla, the agent may retry with a shortened query (e.g. first two words) if the full query returns no results.
4. **Intent-specific ordering**: Results can be sorted by price (price inquiry), stock status (availability), or exact SKU match (product number).

Product search is implemented inside [convex/agent.ts](../convex/agent.ts) (search intent detection + Salla + `api.products.list`). There is no separate “search_products” tool call; the agent runs search internally and then injects product context into the LLM prompt and may emit a `send_product` tool.

## Documentation search (RAG)

Used on **every** agent run to add context from the knowledge base.

1. **Query**: The current user message is used as the search query.
2. **Vector search**: [convex/ai.ts](../convex/ai.ts) action `searchKnowledge` embeds the query with OpenRouter, runs Convex vector search on `knowledge_base.by_embedding`, and returns top-k snippets (title + content).
3. **Injection**: Snippets are appended to the system message as “RELEVANT DOCUMENTATION” so the LLM can answer from your docs (FAQ, policies, etc.).

See [AGENT_KNOWLEDGE.md](./AGENT_KNOWLEDGE.md) for schema, ingest, and API.

## Optional: unified search

The plan mentioned an optional “unified search” that runs both product and doc search and merges results. Currently the agent does product search only when intent is product-related, and doc search always. A future step could be a single helper that returns `{ products, docs }` and the prompt builder uses both.

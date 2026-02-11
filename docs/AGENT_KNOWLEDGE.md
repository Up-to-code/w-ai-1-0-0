# Knowledge Base & RAG

The agent can use a **knowledge base** to answer from your own documentation (FAQ, policies, product info). Content is stored in Convex, embedded with OpenRouter, and retrieved by vector search (RAG) before each reply.

## Schema

Table: `knowledge_base` in [convex/schema.ts](../convex/schema.ts).

- `title`, `content`: Text to index and retrieve.
- `embedding`: Vector (1536 dimensions) for similarity search.
- `sourceType`: `"text"` or `"pdf"`.
- `createdAt`: Timestamp.

Vector index: `by_embedding` on `embedding` with `dimensions: 1536`.

## Pipeline

1. **Ingest**: Call the `saveKnowledge` **action** (not mutation) with `title` and `content`. The action:
   - Calls OpenRouter embeddings API (`openai/text-embedding-3-small`) to get a 1536-dim vector for the combined title + content.
   - Inserts a row with that embedding via internal mutation `insertKnowledge`.
2. **Search**: When the agent runs (`generateResponse`), it calls the internal action `searchKnowledge` with the user message and a limit (default 5). That action:
   - Embeds the query with the same OpenRouter embedding model.
   - Runs Convex vector search on `knowledge_base` (`by_embedding`).
   - Loads the matching documents and returns `{ title, content }[]`.
3. **Use**: The returned snippets are formatted as “RELEVANT DOCUMENTATION” and appended to the system message so the LLM can cite them in its answer.

## Convex API

- **Save (action)**: `api.ai.saveKnowledge({ title, content })` — use `useAction(api.ai.saveKnowledge)` from the client.
- **List (query)**: `api.ai.listKnowledge` — returns all entries (for admin UI).
- **Search**: Internal only; used inside `agent.generateResponse` via `internal.ai.searchKnowledge`.

## Adding content

- From code: call `saveKnowledge` with title and content (e.g. from an admin form or script).
- Embeddings are generated automatically; do not insert into `knowledge_base` with empty or custom vectors — always use the action so dimensions and model stay correct.

## Limits

- Embedding model: `openai/text-embedding-3-small` (1536 dimensions). Text is truncated to 8000 chars before embedding.
- Search returns up to 10 snippets per query; the agent uses 5 by default.
- Convex vector index limits apply (see [Convex vector search](https://docs.convex.dev/search/vector-search)).

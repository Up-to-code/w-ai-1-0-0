# AI Agent Overview

The W-AI agent is a WhatsApp-backed sales assistant that answers customer messages using an LLM (via OpenRouter), product search (Salla API + local DB), and an optional knowledge base (RAG). The default system prompt is sales-oriented: recommend products from the store (Salla/catalog), suggest related items, and hand off to a human when the customer asks (e.g. "speak to agent") or for complaints and complex requests. Handoff is done via the `transfer_to_human` tool, which turns off AI for that chat and sends a short message to the customer; humans then reply from the dashboard.

## Flow

1. **Input**: Incoming user message for a chat (scoped by `phoneNumberId`).
2. **Config**: System prompt, model, and active flag are read from `ai_configs` (see [convex/ai_config.ts](../convex/ai_config.ts)).
3. **Context**: Recent chat history + optional conversation summary + **RAG**: relevant snippets from the knowledge base (vector search) are injected into the system message.
4. **Intent**: The agent detects intent (e.g. price inquiry, availability, product search) and may run product search (Salla first, then local products).
5. **LLM**: OpenRouter chat completion with the prepared messages; the model may output tool tags (e.g. `<TOOL:send_product>`, `<TOOL:send_text>`).
6. **Tools**: Response is parsed for tool tags; `send_product` triggers `messengerProduct`; `transfer_to_human` turns off AI for the chat and sends a handoff message; others go to `executeTool` (text, image, link, audio). Messages are sent via Convex mutations that ultimately call the WhatsApp API.
7. **Summary**: After replying, conversation summary can be updated for future context.

## Where things live

| What | Where |
|------|--------|
| Agent logic & tool parsing | [convex/agent.ts](../convex/agent.ts) |
| AI config (system prompt, model, isActive) | [convex/ai_config.ts](../convex/ai_config.ts) |
| Knowledge base & RAG | [convex/ai.ts](../convex/ai.ts) |
| Test UI (send message, see response) | [src/app/(dashboard)/ai-settings/page.tsx](../src/app/(dashboard)/ai-settings/page.tsx) |

## Testing

- Use the **AI Settings** dashboard page to change the system prompt and model, and to send a test message. The test runs `agent.testResponse` (no chat/product search, just one LLM call).
- Real flows are triggered when a customer sends a message in a chat with AI mode on; the webhook calls into `agent.generateResponse`.
- **Intent unit tests**: The agent’s intent logic is covered by ~100 unit tests in `convex/agent.search.test.ts`. See [AGENT_TESTING.md](AGENT_TESTING.md) for how to run them and interpret results.

## Environment

- `OPENROUTER_KEY`: Required for chat and (for RAG) embeddings.
- Model can be overridden with `OPENROUTER_MODEL`; otherwise it comes from `ai_configs`.

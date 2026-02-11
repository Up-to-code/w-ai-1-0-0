# Agent Tools

The agent sends WhatsApp messages by emitting **tool tags** in the LLM response. The backend parses these tags and runs the corresponding handlers.

## Tool registry

In [convex/agent.ts](../convex/agent.ts), `TOOL_REGISTRY` lists the tools. When adding a new tool:

1. Add an entry to `TOOL_REGISTRY` (name, handler, payload shape).
2. If the handler is `executeTool`, add a new branch in `executeTool` and a new pattern in the generic tool regex list used when parsing the LLM output.
3. If the handler is custom (e.g. `messengerProduct`), add parsing for the new tag (e.g. `<TOOL:send_product>`) and call the appropriate internal action.

## Registered tools

| Tag | Handler | Payload | Description |
|-----|---------|---------|-------------|
| `<TOOL:send_product>` | `messengerProduct` | `name`, `price`, `imageUrl?`, `productUrl?`, `description?` | Sends a product card (text + optional image). |
| `<TOOL:send_text>` | `executeTool` | `text` or raw string | Sends a text message. |
| `<TOOL:send_image>` | `executeTool` | `imageUrl`, `caption?` | Sends an image with optional caption. |
| `<TOOL:send_link>` | `executeTool` | `url` | Sends a link message. |
| `<TOOL:send_audio>` | `executeTool` | `audioUrl` or `link` | Sends an audio message. |
| `<TOOL:transfer_to_human>` | (internal) | none | Hands off the conversation: sets `aiMode: false` for the chat and sends a short message to the customer (e.g. "تم تحويل المحادثة إلى أحد الموظفين. سنرد عليك قريباً."). Use when the customer asks for a human, has a complaint, or has a complex request (refund, custom order). |

## Parsing

- **transfer_to_human**: Parsed first. When present, the agent calls `internal.chat.transferToHuman` and sends the handoff message; no other AI text is sent to the user.
- **send_product**: Regex extracts a JSON block after `<TOOL:send_product>`; if valid and contains `name` and `price`, `internal.agent.messengerProduct` is called; otherwise the cleaned text is sent as a normal message.
- **Generic tools**: Regexes for `send_text`, `send_image`, `send_link`, `send_audio` extract payload (JSON or raw text for send_text); then `internal.agent.executeTool` is called with `tool` and `payload`.

## Execution

- `messengerProduct`: Sends text (name, price, description, link) then image if `imageUrl` is set, via `executeTool` and `messages.sendAndSave`.
- `executeTool`: Dispatches to the correct branch (text / image / link / audio) and calls `internal.messages.sendAndSave` with the right type and content.

## Extension pattern

To add a new tool (e.g. `send_document`):

1. Add to `TOOL_REGISTRY`: `{ name: "send_document", handler: "executeTool", payload: { documentUrl: "string", caption?: "string" } }`.
2. In the agent, add a regex to the `genericTools` array: `{ type: "document", pattern: /<TOOL:send_document>\s*(?:```json\s*)?({[\s\S]*?})(?:\s*```)?/i }`.
3. In the parsing loop, map `type` to the same string passed to `executeTool`.
4. In `executeTool`, add `args.tool === "document"` and handle `payload.documentUrl` (and optional caption) by calling `sendAndSave` with the appropriate type if your schema supports it.

All tools are executed in the same agent run; webhook and conversation handling are unchanged.

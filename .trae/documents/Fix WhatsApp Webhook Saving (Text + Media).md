## Root Cause (Why Nothing Is Saving)
- The webhook worker is calling the wrong mutation signature, so Convex rejects the call and the message never gets inserted.
  - In [whatsapp.ts](file:///Users/ahmedmansour/Documents/GitHub/w-ai/convex/whatsapp.ts#L355-L384) `processWebhookAction` calls `internal.chat.saveIncomingMessage` with fields like `contactPhone`, `direction`, `type`, `status`.
  - But [chat.ts](file:///Users/ahmedmansour/Documents/GitHub/w-ai/convex/chat.ts#L81-L91) defines `saveIncomingMessage` args as `{ contactId, contactName, messageType, content, timestamp, metaMessageId, ... }`.
  - This mismatch means inbound messages (text/image/etc.) are **not persisted**.

## Key Design Clarification (Convex)
- `httpAction` (webhook endpoint) should parse + ACK fast, then schedule async work.
- `internalAction` should do external fetches (Meta API, media downloads) and call mutations.
- `internalMutation` / `mutation` should do DB writes (create contact/chat/message).

## Fix Plan
### 1) Make inbound webhook writes correct and idempotent
- Update `processWebhookAction` in [whatsapp.ts](file:///Users/ahmedmansour/Documents/GitHub/w-ai/convex/whatsapp.ts) to call **one canonical DB writer**:
  - Prefer using existing [messages.saveMessage](file:///Users/ahmedmansour/Documents/GitHub/w-ai/convex/messages.ts) because it already:
    - Creates the contact if missing
    - Creates the chat if missing
    - Inserts the message
- Correct mapping:
  - `contactId = value.metadata.phone_number_id` (business phone id)
  - `contactPhone = message.from` (customer phone)
  - `contactName = value.contacts?.[0]?.profile?.name ?? message.from`
  - `type = message.type`
  - `content = text.body OR caption OR ''`
  - `metaMessageId = message.id`
  - `timestamp = Number(message.timestamp) * 1000`

### 2) Save inbound media (image/video/audio/document) to storage asynchronously
- After the message is inserted, if `mediaId` exists:
  - Schedule an `internalAction` to:
    - Call `api.whatsapp.getMediaUrl(mediaId)`
    - Download the blob
    - `ctx.storage.store(blob)`
    - Patch the message row with `storageId`
- This guarantees:
  - Message shows immediately (DB insert first)
  - Media appears a moment later (storage hydration)

### 3) Fix status updates path
- Keep the webhook status handler but route it to the same canonical service:
  - Either use `internal.messages.updateMessageStatus` or keep `internal.chat.updateMessageStatus`—but only one should be the source of truth.
- Add/ensure an index on `messages.metaMessageId` to reliably locate messages for status updates.

### 4) Validate outbound saving
- Outbound messages are inserted by [chat.sendMessage](file:///Users/ahmedmansour/Documents/GitHub/w-ai/convex/chat.ts#L40-L78) before calling Meta.
- After inbound fixes, if outbound still “doesn’t show”, we’ll verify:
  - The UI uses the correct chatId and queries (`getMessages`)
  - The message insert succeeded (Convex logs)

### 5) Verification steps
- Send a text from a real WhatsApp number → confirm:
  - Contact created if missing
  - Chat created if missing
  - Message appears in UI immediately
- Send an image → confirm:
  - Message row saved immediately with `mediaId`
  - `storageId` appears shortly after and UI renders `mediaUrl`
- Confirm status updates (sent/delivered/read) update the message rows.

If you confirm this plan, I’ll implement it by refactoring the webhook worker to use the correct DB writer and adding the media hydration action + idempotent indexing.
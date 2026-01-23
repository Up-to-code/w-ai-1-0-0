I will implement the Sales AI Agent with deep integration into the platform, following this comprehensive plan:

### 1. Backend Infrastructure (Convex)
*   **Dependencies**: Install `@convex-dev/ai`.
*   **Environment**: Configure `OPENROUTER_KEY` and set default model to `arcee-ai/trinity-mini:free`.
*   **Schema**: 
    *   Add `aiMode: boolean` to `chats` table.
    *   Create `ai_configs` table for system prompts and model settings.
*   **`convex/ai_config.ts`**: Functions to get/set the system prompt and active model.
*   **`convex/agent.ts`**:
    *   Define the AI Agent using the Convex Agent component.
    *   **Tools**:
        *   `searchProducts`: Search the products table for matches.
        *   `sendWhatsApp`: Send the response back to the customer on WhatsApp.
    *   **Logic**: Fetch recent message history for context before calling the LLM.
*   **`convex/whatsapp.ts`**:
    *   Hook into the webhook processing logic.
    *   When an inbound message arrives, if `aiMode` is enabled for that chat, trigger the agent to respond automatically.

### 2. Frontend Interface (Next.js)
*   **AI Settings Page (`/ai-settings`)**:
    *   A clean interface to edit the **System Prompt** (the AI's instructions).
    *   Ability to test the agent with a mock input.
*   **Chat Page (`/chat/[id]`)**:
    *   Add an **AI Toggle** in the header to enable/disable automatic AI responses for that specific customer.
    *   Visual indicators when the AI is processing or active.

### 3. Execution Sequence
1.  **Environment Setup**: Fix `.env.local` and install `@convex-dev/ai`.
2.  **Database Layer**: Implement the schema changes and `ai_config.ts`.
3.  **The Agent**: Build the core logic in `agent.ts` including tools for products and WhatsApp.
4.  **Automation Loop**: Connect the WhatsApp webhook to the agent trigger.
5.  **User Interface**: Build the settings page and update the chat UI with the AI toggle.

I will upgrade the Agent to use a structured **"Product Tool"** for sending rich product cards. This ensures products are always sent as a professional WhatsApp Image Message with a formatted caption (Title, Price, Description, Link).

**Plan:**

1. **Create** **`sendProduct`** **Internal Tool:**

   * Create a new internal action `internal.agent.sendProduct` in `convex/agent.ts`.

   * This action will accept structured product data (`name`, `price`, `imageUrl`, `productUrl`, `description`).

   * It will automatically format the **WhatsApp Caption** with bolding and emojis (e.g., `*Title*`, `💰 Price`, `🔗 Link`) and send it as a single **Image Message** using the `mediaUrl` feature we just fixed.

2. **Update Agent Logic & System Prompt:**

   * Modify the System Prompt to explicitly define a `send_product` tool.

   * Instruct the AI: "When you find a product, do NOT just describe it. Use the `send_product` tool by outputting this JSON format: `<TOOL:send_product>{ "name": "...", "price": "...", ... }</TOOL>`".

   * Update the `agent.ts` handler to detect this specific tag, parse the JSON, and execute the `sendProduct` action.

**Outcome:**

* The Agent will "think" it has a tool.

* When it finds a product, it will trigger the tool.

* The user receives a high-quality Image Message with all details and a clickable link in one perfect bubble.


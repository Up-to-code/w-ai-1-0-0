# Convex Backend Setup for chatcb-UI

This project uses **Convex** as the backend-as-a-service for real-time database, authentication, and server functions.

## 1. Project Structure

The `convex/` directory contains all backend logic:

*   **`schema.ts`**: Defines the database schema (NoSQL).
*   **`auth.ts`**: Authentication functions (Login/Register).
*   **`chat.ts`**: Core chat logic (List chats, Send/Receive messages).
*   **`whatsapp.ts`**: Meta Business API integration handling.
*   **`http.ts`**: Webhook handler for Meta events.
*   **`files.ts`**: File storage management.
*   **`templates.ts`**: WhatsApp template management.
*   **`ai.ts`**: Knowledge base and AI settings.
*   **`integrations.ts`**: External integrations (e.g., SOLO).

## 2. Initialization

To connect this codebase to a live Convex backend:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Initialize Convex**:
    ```bash
    npx convex dev
    ```
    *   This command will prompt you to log in to Convex.
    *   It will create a new project in your Convex dashboard.
    *   It will generate the necessary type definitions in `convex/_generated/`.

3.  **Environment Variables**:
    Create a `.env.local` file in the root directory with the following keys (you can get the Convex URL from the dashboard):

    ```env
    NEXT_PUBLIC_CONVEX_URL="https://your-deployment-name.convex.cloud"
    
    # Meta (WhatsApp) Configuration
    META_ACCESS_TOKEN="your-meta-access-token"
    META_PHONE_ID="your-phone-number-id"
    META_VERIFY_TOKEN="your-custom-verify-token"
    ```

## 3. Database Schema

The database is defined in `convex/schema.ts` and includes:

*   **`users`**: Application users (Agents, Admins).
*   **`chats`**: Conversation metadata.
*   **`messages`**: Individual messages (Text, Image, Audio, Video).
*   **`files`**: Metadata for stored files.
*   **`templates`**: WhatsApp message templates.
*   **`products`**: Synced e-commerce products.
*   **`knowledge_base`**: Data for AI training.

## 4. API & Testing

You can test the backend functions using the **Convex Dashboard** or the sample file provided:

*   **Sample CRUD**: `convex/sample.ts` provides basic Task management examples.
*   **Chat Flow**: Use `api.chat.listChats` and `api.chat.sendMessage`.

## 5. Extending the Backend

To add new features:
1.  Create a new file in `convex/` (e.g., `analytics.ts`).
2.  Export `query` or `mutation` functions.
3.  Run `npx convex dev` to auto-generate types.
4.  Import `api` from `../convex/_generated/api` in your React components.

For detailed documentation, visit [docs.convex.dev](https://docs.convex.dev).

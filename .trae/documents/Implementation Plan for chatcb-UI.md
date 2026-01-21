# Master Implementation Plan: chatcb-UI

This is the comprehensive, unified plan for building **chatcb-UI**, integrating **Next.js 16**, **Convex ("CamVax")**, **shadcn/ui**, and advanced **WhatsApp/AI** capabilities.

## 1. Technology Stack & Core Infrastructure

| Component | Technology | Role |
| :--- | :--- | :--- |
| **Frontend** | **Next.js 16** (App Router) | Framework, SSR, Server Actions. |
| **Language** | **TypeScript** | Type safety, Interfaces. |
| **UI System** | **shadcn/ui** ("ChatCNUI") | Component library, Themes. |
| **Styling** | **Tailwind CSS** | Utility-first styling. |
| **Backend/DB** | **Convex** ("CamVax") | Real-time Database, Auth, Storage, Scheduling. |
| **Webhooks** | **Convex HTTP Actions** | Handling Meta/SOLO incoming events. |
| **AI** | **OpenRouter** | LLM Access (GPT/Claude). |
| **Messaging** | **Meta Business API** | WhatsApp connectivity (via custom handler). |

## 2. Architectural Design (SOLID & Modular)

We will follow a **Feature-Sliced / Modular Architecture** to ensure scalability and separation of concerns.

### Directory Structure
```
src/
├── app/                            # Routes (Next.js App Router)
│   ├── (auth)/                     # Authentication Module
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/                # Protected Application Core
│   │   ├── layout.tsx              # Main Shell (Sidebar, Header)
│   │   ├── chat/                   # [Feature] Chat "Session Web"
│   │   │   ├── page.tsx
│   │   │   ├── _components/        # Feature-specific components
│   │   │   └── _hooks/             # Feature-specific hooks
│   │   ├── campaigns/              # [Feature] Broadcasts & Templates
│   │   ├── storage/                # [Feature] File Library
│   │   ├── ai-settings/            # [Feature] Knowledge Base/Training
│   │   ├── integrations/           # [Feature] SOLO/E-commerce
│   │   └── settings/               # [Feature] User/Org Settings
├── components/
│   ├── ui/                         # shadcn/ui primitives (Button, Input)
│   └── shared/                     # Global components (ThemeToggle, Loader)
├── convex/                         # Backend Logic ("CamVax")
│   ├── http.ts                     # Webhook Entry (Meta/External)
│   ├── schema.ts                   # Database Definition
│   ├── auth.ts                     # RBAC & Session Logic
│   ├── whatsapp.ts                 # Meta API Actions (Media, Templates)
│   └── ...                         # Feature-specific API files
├── lib/
│   ├── meta-handler/               # Custom Library for Meta API
│   └── utils.ts                    # Helper functions
```

## 3. Data Architecture (Convex Schema)

*   **`users`**: Auth info, Roles (Admin, Agent), Preferences.
*   **`chats`**: Conversations, `contact_id`, `last_message_time`, `session_status` (Active/Expired).
*   **`messages`**: Content, `type` (text, image, audio, video), `storage_id` (for media), `status` (sent, delivered, read).
*   **`files`**: `storage_id`, `url`, `mime_type`, `category`.
*   **`templates`**: Name, Body, Status (Approved/Rejected), Meta ID.
*   **`products`**: Synced from SOLO/E-commerce.
*   **`knowledge_base`**: Embeddings for AI training.

## 4. Feature Implementation Roadmap

### Phase 1: Core Foundation & Auth
1.  **Setup**: Initialize Next.js 16 + Convex + shadcn/ui.
2.  **Auth**: Implement Login/Register with Email/Password.
3.  **RBAC**: Middleware to enforce Role-based access.

### Phase 2: WhatsApp Engine & Media Handling
1.  **Meta Library (`lib/meta-handler`)**:
    *   Build strict types and methods for `sendMessage`, `uploadMedia`, `downloadMedia`.
2.  **Webhook (`convex/http.ts`)**:
    *   **Verify**: Handle Hub Challenge.
    *   **Receive**: Process incoming messages.
    *   **Media**: Detect Image/Audio/Video -> Download from Meta -> Upload to Convex Storage -> Save Record.
3.  **Chat UI ("Session Web")**:
    *   **List**: Real-time sorted conversations.
    *   **Window**: Render bubbles based on type (Image preview, Audio player, Video player).
    *   **Session**: Visual indicator of 24h window.

### Phase 3: Templates & Campaigns
1.  **Template Manager**:
    *   **Create**: Form to build templates (Variables, Buttons).
    *   **Sync**: API call to submit to Meta.
    *   **Verify**: Webhook listener for Status Updates (Approved/Rejected).
2.  **Campaigns**:
    *   **Segments**: Filter users by tags/history.
    *   **Broadcast**: Schedule bulk messages.

### Phase 4: File System & Storage
1.  **Storage Page**:
    *   **Gallery**: Grid view of all uploaded assets.
    *   **Upload**: Drag & Drop interface.
2.  **Integration**: "Pick from Storage" modal in Chat and Campaign builders.

### Phase 5: AI & Knowledge Base
1.  **Knowledge Editor**:
    *   UI to upload text/PDFs.
    *   Backend to parse and generate embeddings ("EI Training").
2.  **Auto-Response**:
    *   Hook into incoming messages -> Query Knowledge Base -> Generate Reply (OpenRouter) -> Send.
3.  **Transcription**: Auto-transcribe incoming audio notes.

### Phase 6: E-commerce (SOLO)
1.  **Integration Page**:
    *   Connect "SOLO" via API Key.
    *   **Product Sync**: Fetch catalog and store in `products`.
2.  **Shopping**:
    *   Send Product Cards in Chat.
    *   Track Shopping Session state.

## 5. Quality & Standards
*   **Performance**: Use `Next.js` Image Optimization, Lazy Loading for Dashboards.
*   **Testing**: Unit tests for `meta-handler`, E2E for Chat Flow.
*   **Documentation**: Inline docs for all Components and API Actions.

**Confirmation**: This plan covers the full scope (Next.js 16, Convex, Media, Templates, AI, SOLO).

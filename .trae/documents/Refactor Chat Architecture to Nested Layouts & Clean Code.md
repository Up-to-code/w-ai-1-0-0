I will refactor the chat module to use Next.js Nested Layouts, ensuring a persistent sidebar, URL-driven state, and cleaner code structure.

### **Architecture Plan**

1.  **Refactor `ChatSidebar` (URL-Driven State)**
    *   Modify `src/app/(dashboard)/chat/_components/ChatSidebar.tsx` to use `Link` or `router.push` for navigation instead of a callback.
    *   Use `useParams()` to determine the active selection for styling.
    *   Remove `onSelectChat` prop.

2.  **Create Chat Layout (`src/app/(dashboard)/chat/layout.tsx`)**
    *   This will render the persistent `ChatSidebar` on the right (RTL).
    *   It will render `{children}` on the left, which will swap between the "Empty State" and the "Chat Window".

3.  **Update Index Page (`src/app/(dashboard)/chat/page.tsx`)**
    *   Strip out the sidebar and chat window logic.
    *   Render only the "Select a conversation" placeholder (Empty State).

4.  **Create Conversation Page (`src/app/(dashboard)/chat/[chatId]/page.tsx`)**
    *   Create this new directory and file.
    *   Extract the `ChatWindow` implementation here.
    *   Pass `chatId` from the route params to the `ChatWindow` component.

5.  **Clean Code & Refactoring (`ChatWindow`)**
    *   Extract the large input area from `ChatWindow.tsx` into a new `ChatInput.tsx` component to reduce file size and complexity.
    *   Ensure strict typing and remove any unused imports.

### **Directory Structure Target**

```text
src/app/(dashboard)/chat/
├── layout.tsx              <-- New: Persistent Sidebar
├── page.tsx                <-- Updated: Empty State only
├── [chatId]/
│   └── page.tsx            <-- New: Chat Window Page
└── _components/
    ├── ChatSidebar.tsx     <-- Updated: Uses Link/Router
    ├── ChatWindow.tsx      <-- Cleaned up
    ├── ChatInput.tsx       <-- New: Extracted Input Logic
    └── ... (other components)
```

### **Verification**
*   Verify navigation between chats updates the URL (`/chat/123`).
*   Verify the sidebar remains stable (no re-fetching/flickering) while switching chats.
*   Verify the "Empty State" shows at `/chat`.
*   Verify real-time functionality (sending/receiving) persists in the new structure.

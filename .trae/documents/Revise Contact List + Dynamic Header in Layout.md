## Goals
- Make the contact list always show all chats/contacts reliably and update in real time.
- Move the conversation header out of `ChatWindow` and into the dashboard’s top header area.
- Ensure selecting a contact immediately updates UI state (active/inactive), header content, and backend read-state.
- Add robust error handling for backend failures.

## Current Findings (What’s Broken / Missing)
- The global header lives in [layout.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/layout.tsx) and is currently static (search + bell).
- The chat-specific header is embedded inside [ChatWindow.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/ChatWindow.tsx), so it cannot be controlled by the layout.
- Chat selection state is local to [chat/page.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/page.tsx) and currently calls `markAsRead` twice (in `useEffect` and in the click handler).
- Backend gap: `listChats` sorts by `chats.lastMessageTime`, but `sendMessage` does not update `lastMessageTime`, so outbound activity may not reorder/update the contact list as expected.

## Implementation Plan

## 1) Layout-Level Dynamic Header (Main Layout Integration)
- Add a lightweight header-override mechanism to the dashboard layout:
  - Create a `DashboardHeaderContext` provider + hook.
  - Update [layout.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/layout.tsx) to render either:
    - the default header (search + bell), or
    - a per-page dynamic header when a page sets it.
- This keeps the header inside the main layout (per requirement) and allows instant updates.

## 2) Chat Conversation Header Component
- Create a `ConversationHeader` component for chat that:
  - Shows avatar/name/phone/status for the currently selected chat.
  - Reacts instantly to selection changes.
  - Optionally shows a compact “no chat selected” state.
- Remove the embedded header markup from [ChatWindow.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/ChatWindow.tsx) so there is a single source of truth (the layout header).

## 3) Reliable Contact List Visibility + Real-Time Fetching
- Keep `useQuery(api.chat.listChats)` for real-time updates (Convex already streams changes).
- Harden the sidebar UX:
  - Loading skeleton when `chats` is undefined.
  - Empty state when there are no chats.
  - Preserve selection highlighting across updates.
  - Ensure virtualization uses stable `Row` + `itemData` (already started) to prevent remounts and lost focus.

## 4) Contact Selection State + Visual Feedback
- Centralize selection in one place (chat page state):
  - Single `onSelectChat` handler.
  - Strong active/inactive styling:
    - selected: stronger background + text color
    - unselected: normal + subtle hover
  - Add smooth transitions via Tailwind (transition-colors, etc.).
- Remove duplicated `markAsRead` calls in [chat/page.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/page.tsx).

## 5) Backend Integration + Error Handling
- Backend (Convex):
  - Update `sendMessage` mutation to patch the corresponding `chats` row:
    - `lastMessageTime = Date.now()`
    - optionally enforce `status: "active"`
  - This ensures contact list ordering reflects outbound messages immediately.
- Frontend:
  - When selecting a chat, call `markAsRead` once.
  - Add error handling (catch + lightweight UI feedback banner or inline message) if `markAsRead` fails.

## 6) Verification
- Type-check: `npx tsc --noEmit`.
- Manual flow:
  - Switch between chats: header changes immediately.
  - New inbound message: sidebar updates + unread badge updates.
  - Selecting a chat clears unread via backend mutation.
  - Sending outbound message updates contact ordering/time.
- Responsive behavior:
  - Desktop: sidebar + chat window.
  - Mobile: header remains readable; list remains usable.

## Files Expected to Change / Add
- Update: [layout.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/layout.tsx)
- Update: [ChatWindow.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/ChatWindow.tsx)
- Update: [page.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/page.tsx)
- Update: `convex/chat.ts` (sendMessage patches chat)
- Add: `src/components/DashboardHeaderContext.tsx`
- Add: `src/app/(dashboard)/chat/_components/ConversationHeader.tsx`

If you confirm, I will implement the changes end-to-end and verify real-time behavior + TypeScript builds.
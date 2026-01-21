## Goals
- Simplify and complete the chat UI (sidebar + conversation) so it’s clear, consistent, and accessible.
- Fix conversation scrolling/positioning in long threads.
- On opening any conversation (even very long), jump to the latest message automatically (no manual scrolling).
- Ensure the implementation follows React’s Rules of Hooks (hooks must be called unconditionally at the top level) and avoids hook order bugs. [Rules of Hooks – React](https://react.dev/link/rules-of-hooks)

## Key Research Takeaways
- `react-window` v2 is a major rewrite: it exports `List`/`Grid` (not `FixedSizeList`/`VariableSizeList`), automatically sizes without needing AutoSizer, supports dynamic row heights via `useDynamicRowHeight`, and encourages `rowComponent`/`rowProps` patterns. [react-window changelog](https://github.com/bvaughn/react-window/blob/master/CHANGELOG.md)
- Chat auto-scroll UX best practice: only auto-scroll to bottom when the user is already near the bottom; otherwise keep their reading position and provide a “jump to latest” affordance. (Common community pattern; implement with a bottom-distance threshold.)

## Architecture Understanding (Current Codebase)
- Backend is Convex.
  - `listChats` powers sidebar list.
  - `getMessages` currently loads all messages for a chat and enriches with `mediaUrl`.
  - `sendMessage` inserts outbound message and schedules WhatsApp send.
  - `markAsRead` resets unread counters.
- Frontend:
  - `ChatPage` owns selected chat state and triggers `markAsRead`.
  - `ChatSidebar` shows chat list with search.
  - `ChatWindow` renders messages + input actions.

## Remediation Plan (Deep + Step-by-Step)

## 1) UI Redesign (Simplicity + Accessibility)
### Sidebar (ChatSidebar)
- Convert each chat row into a clear 3-line layout:
  - Line 1: name + time (right)
  - Line 2: phone or last snippet/status
  - Line 3: unread badge + optional status chip (expired)
- Add keyboard navigation:
  - Arrow up/down changes selection
  - Enter opens chat
  - `aria-current` and focus-visible rings
- Avatar fallback:
  - deterministic random color based on contact id/phone
  - initials (first + last letter)
- Remove dead/non-functional buttons.

### Conversation (ChatWindow)
- Header:
  - Avatar + name + phone + lightweight status
  - Remove unused icon buttons
- Message area:
  - consistent padding, background, and spacing
  - optional date separators (later milestone)
- Composer:
  - keep only actions that actually work (attachments, image upload, templates, mic)
  - ensure all buttons have aria-labels and proper disabled states

## 2) Scrolling + Positioning (No Jank)
### Requirements
- Open chat → instantly shows last message.
- New inbound/outbound messages:
  - if user is at bottom: stick to bottom
  - if user scrolled up: do not jump; show a “jump to latest” button
- Variable height content (images/audio/docs) must not cause “row overlap” or incorrect positions.

### Implementation Approach (Using react-window v2)
- Use `useDynamicRowHeight` for message rows so heights are measured and cached, preventing layout jumps in long threads. [react-window changelog](https://github.com/bvaughn/react-window/blob/master/CHANGELOG.md)
- Track “shouldAutoScroll”:
  - observe the list container scroll position
  - define a threshold (e.g. 160px from bottom)
  - only auto-scroll if within threshold
- Implement “jump to latest”:
  - show a floating button when `shouldAutoScroll === false`
  - on click: `scrollToRow({ index: lastIndex, align: "end" })`
- Ensure hooks order correctness:
  - all hooks (including `useDynamicRowHeight`) must be called before any early returns. [Rules of Hooks – React](https://react.dev/link/rules-of-hooks)

## 3) Long Conversation Performance (Pagination)
### Why
- Loading all messages (`getMessages`) will become slow and heavy for large chats.

### Backend changes (Convex)
- Add a new paginated query, e.g. `getMessagesPage({ chatId, cursor, limit })`:
  - returns newest-first or oldest-first with cursor
  - returns `{ messages, nextCursor, hasMore }`
  - still enrich `mediaUrl` for items in the page
- Keep `getMessages` for backward compatibility (existing callers won’t break).

### Frontend changes
- In `ChatWindow`, maintain a local message array built from pages.
- Initial load fetches the latest page and immediately scrolls to the bottom.
- Infinite scroll upwards:
  - when the user reaches top (or near top), load older page and prepend.
  - preserve scroll position by capturing an anchor (first visible message) and restoring scroll after prepend.

## 4) TypeScript Hardening
- Define shared UI-facing types:
  - `ChatListItem` derived from `api.chat.listChats` output
  - `ChatMessage` derived from `api.chat.getMessages` output (includes `mediaUrl?`)
- Type `rowProps` properly for `react-window` row components (avoid `any`).
- Add strict typing for helper functions (avatar + initials).

## 5) Testing + Verification Strategy
- Automated:
  - `npx tsc --noEmit`
  - `next build`
  - Add lightweight unit tests for avatar/initials and scroll helper logic (optional: introduce a test runner if not present).
- Manual (QA checklist):
  - Open chat with 1000+ messages → lands at latest message.
  - Scroll up → stays in place when new messages arrive.
  - Tap “jump to latest” → lands at last message.
  - Send text/media/template/voice note flows still work.
  - Keyboard navigation + screen reader labels present.

## Milestones (No Dates)
- Milestone A: UI cleanup + accessibility pass (sidebar + header + composer)
- Milestone B: scrolling stability (auto-scroll threshold + jump-to-latest + dynamic row heights)
- Milestone C: long conversation pagination (backend + frontend + scroll position preservation)
- Milestone D: testing/verification (build/type gates + QA checklist)

## Deliverables
- Updated `ChatSidebar` and `ChatWindow` UI components with accessible interactions.
- Reliable conversation scroll behavior and “jump to latest”.
- Optional pagination for large conversations, keeping current APIs compatible.

Confirm this plan and I will start implementing it end-to-end.
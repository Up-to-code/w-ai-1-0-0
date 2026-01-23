## Goals

* Make all chat components look consistent and like WhatsApp.

* Align RTL correctly: "My" messages right, "His" left.

* Use theme tokens (no hard-coded hex), clean spacing/typography.

* Improve performance (lists, scrolling, async flows) and fix logic edges.

## Files In Scope

* [ChatSidebar.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/\(dashboard\)/chat/_components/ChatSidebar.tsx)

* [ConversationHeader.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/\(dashboard\)/chat/_components/ConversationHeader.tsx)

* [MessageList.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/\(dashboard\)/chat/_components/MessageList.tsx)

* [MessageBubble.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/\(dashboard\)/chat/_components/MessageBubble.tsx)

* [ChatInput.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/\(dashboard\)/chat/_components/ChatInput.tsx)

* Theme: [globals.css](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/globals.css)

## Visual Consistency (Theme & Spacing)

1. Replace remaining hard-coded colors in bubbles/backgrounds with CSS variables from globals.css (primary, secondary, card, muted, success, etc.).
2. Standardize paddings/margins:

   * Message bubble: p-3, gap-2 between bubbles.

   * Timestamps/meta: text-\[11px], mt-1.
3. Typography:

   * Names: 15–16px, semi-bold.

   * Message text: 14–15px.

   * Meta (time/unread): 11–12px.

## RTL Alignment & Bubble Shape

1. Message alignment:

   * Outbound → justify-end (right), inbound → justify-start (left).
2. Bubble tails:

   * Outbound: rounded-tl-none; inbound: rounded-tr-none.
3. Status ticks color follow theme (read = brand blue, delivered/sent = muted).

## Sidebar & Header Polish

1. Sidebar items:

   * Rounded cards (rounded-lg, mx-2), active bg-primary/10, hover muted/50.

   * Avatar right (RTL), time left.
2. ConversationHeader:

   * Use card/muted background; name 15px bold, phone 12px muted.

   * Remove non-functional icons.

## Message List Performance & UX

1. Background: subtle pattern with very low opacity; respect dark mode.
2. Long list performance:

   * Add content-visibility: auto to message wrappers to defer off-screen rendering (per workspace rule).

   * Keep infinite scroll; preserve scroll on load more (already present).
3. Scroll-to-bottom affordance: rounded pill button, subtle shadow.

## Input Bar UX (WhatsApp-like)

1. Larger rounded input (h-10, rounded-xl) using theme vars; placeholder muted.
2. Actions: emoji, attach, product as compact icons; send button becomes primary when ready.
3. Keep voice note toggle; ensure disabled states match theme.

## Logic & Data Flow

1. URL-driven state: keep layout with persistent sidebar and \[chatId] page for window.
2. Mark-as-read on conversation open (already present) and ensure error handled.
3. Sending:

   * Keep parallel patch + schedule (Promise.all) to avoid waterfalls.

   * Maintain lastMessageTime to update sidebar order.
4. Templates/media flows: ensure early exits (no-op when empty) and stable state updates.

## Accessibility & i18n

1. Ensure buttons have aria-labels; keep Arabic defaults (dir="rtl", Tajawal font).
2. Truncation/ellipsis with proper aria for counts/unread.

## Cleanup

1. Remove unused imports/components.
2. Centralize chat-specific tokens in a small constants file (optional) to avoid magic numbers.

## Verification

1. Run typecheck and dev server; navigate /chat and /chat/\[id].
2. Manual RTL QA: alignment, tails, dark mode, long messages, media.
3. Performance spot-check: scroll smoothness, load-more stability.

## Implementation Steps (Summary)

1. Bubble & alignment fixes in \[MessageBubble.tsx].
2. Sidebar item style & active state in \[ChatSidebar.tsx].
3. Header theme + typography in \[ConversationHeader.tsx].
4. MessageList background + content-visibility optimization in \[MessageList.tsx].
5. Input sizing/contrast in \[ChatInput.tsx].
6. Replace hex with theme vars across files.
7. Remove unused code; ensure consistent imports.
8. Verify, adjust edge cases, finalize.


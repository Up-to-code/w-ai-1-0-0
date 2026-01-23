## Goals
- Cleaner UI, fully RTL.
- "My" messages align right; "His" messages align left.
- Re-style components to match current green theme (light/dark), Arabic-first.

## Message Alignment
- In [MessageBubble.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/MessageBubble.tsx):
  - Use `justify-end` for outbound and `justify-start` for inbound.
  - Swap tail corners: outbound `rounded-tl-none`, inbound `rounded-tr-none`.
  - Ensure bubble colors use theme vars (not raw hex) when possible.

## Theme & Colors
- In [globals.css](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/globals.css):
  - Map bubble, input, background to CSS variables (primary, muted, card, dark equivalents).
  - Keep contrast AA (text vs background).

## Sidebar
- In [ChatSidebar.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/ChatSidebar.tsx):
  - Rounded list items `rounded-lg`, subtle active `bg-primary/10`.
  - Tighten text sizes: name 15–16px, meta 11–12px.
  - Keep RTL: avatar right, meta time left.

## Conversation Header
- In [ConversationHeader.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/ConversationHeader.tsx):
  - Use theme backgrounds (card/muted), border subtle.
  - Show name bold 15px, phone 12px.

## Message List
- In [MessageList.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/MessageList.tsx):
  - Clean background (card/muted), subtle pattern with lower opacity.
  - Improve scroll-to-bottom affordance (rounded pill, subtle shadow).
  - Maintain infinite scroll behavior.

## Chat Input
- In [ChatInput.tsx](file:///Users/ahmedmansour/Documents/GitHub/w-ai/src/app/(dashboard)/chat/_components/ChatInput.tsx):
  - Larger input (`h-10`, `rounded-xl`), better dark color (`#2a3942` or theme var).
  - Placeholder color `placeholder:text-muted-foreground/70`.
  - Keep emoji/file/product actions compact; send button becomes green when ready.

## Typography & Spacing
- Use consistent font sizes: 10–12 meta, 14–15 content, 15–16 names.
- Add small vertical gaps (`mt-1`) where needed for timestamp.

## Animations
- Use short `transition` durations (150–200ms) on hover/active.
- Keep message appear animation subtle (opacity + translateY).

## Remove/Trim
- Remove non-useful icons/buttons from header.
- Keep only necessary components; ensure no unused imports.

## Verification
- Run type-check and dev server.
- Manual RTL review: my messages right, contact left; Arabic text flows; dark mode ok.
- QA: long text wrapping, media rendering, scroll behavior.

If approved, I will implement these changes across the referenced files and verify in the running app.
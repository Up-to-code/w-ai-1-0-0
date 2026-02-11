# Agent testing

Unit tests for the agent’s **intent detection** (search vs non-search, price, availability, product number, handoff phrases, etc.). Tests run in isolation—no Convex or OpenRouter calls.

**Quick start:** `npm run test:search` to run all tests; `npm run test:search:report` for a pass/fail summary and list of failed cases. For a **real LLM test** (hits OpenRouter with current AI config): `npm run test:agent:llm`.

---

## Real LLM test

To run the agent against the **real** LLM (OpenRouter) using your current system prompt and model from AI config:

```bash
npm run test:agent:llm
```

This runs the Convex action `agent:runRealTest` with a default Arabic message (`مرحبا، ما المنتجات المتوفرة؟`). It uses the same prompt and model as in your dashboard AI config. You need:

- Convex dev or deployment with `OPENROUTER_KEY` set in Convex environment variables.
- `npx convex run` uses your default Convex project; ensure you’re in the right project directory.

**Custom message:**

```bash
npx convex run agent:runRealTest '{"message":"كم سعر الهاتف؟"}'
```

The action returns `{ message, model, response }` so you can confirm the model and the reply in the terminal.

---

## Test file and coverage

| Item | Details |
|------|--------|
| **File** | [convex/agent.search.test.ts](../convex/agent.search.test.ts) |
| **Scenarios** | ~100 tests for `detectSearchIntent` and handoff phrase expectations |

| Test group | What’s covered |
|------------|----------------|
| Product availability | “Do you have”, “Have you got”, “Got any”, with/without product number |
| Price inquiry | “How much”, “Price of”, “Cost of”, Arabic (بكم, كم سعر, قيمة, شقد) |
| Product number | SKU/code/ref patterns, `#` and “number” keyword, 4+ digit IDs |
| General search | “Search”, “Find”, “Show me”, “I need”, “Looking for”, “Want to see” |
| Arabic search | ابحث عن, وريني, جيب لي, عرض, عندك, فيها, توجد |
| Comparison & category | “Compare”, “vs”, “difference”, “kind of”, “category of” |
| Reference | “Like that”, “similar”, “another one”, “the other one” |
| Handoff / transfer | “Speak to agent”, “refund”, “استرداد”, “موظف حقيقي”, etc. (phrase list only; real handoff is LLM + prompt) |
| Edge cases | Empty string, very long message, only numbers/punctuation, mixed language, whitespace-only |

---

## How to run

| Goal | Command |
|------|--------|
| Run tests (watch mode) | `npm run test:search` |
| Run once (e.g. CI) | `npx vitest run convex/agent.search.test.ts` |
| Summary report (pass/fail + failed list) | `npm run test:search:report` |

The report script exits with **0** if all pass, **1** if any fail. Example output when all pass:

```
--- Agent intent test report ---
Total: 99  Passed: 99  Failed: 0
```

When there are failures, it prints each failed test’s full name and assertion error so you can fix intent logic or expectations.

---

## Interpreting results

- **All pass** — Intent behavior matches the test expectations.
- **Some fail** — Use the printed failed case names and errors to fix either:
  - Intent patterns in [convex/agent.ts](../convex/agent.ts), or
  - Test expectations in `agent.search.test.ts` if you intentionally changed behavior.

---

## Syncing with agent.ts

The test file keeps a **copy** of `detectSearchIntent` (and related patterns). When you change intent logic in `agent.ts`, update this copy in `agent.search.test.ts` so the suite still tests the real behavior. Alternatively, you can refactor by moving `detectSearchIntent` into a shared module (e.g. `convex/agentIntent.ts`) and importing it from both `agent.ts` and the test file.

For more on the agent flow and config, see [AGENT_OVERVIEW.md](AGENT_OVERVIEW.md).

# AGENTS for Baseline

## Instruction Baseline

- Scope remains the existing Baseline production architecture (Express + Vite + React + Firebase + Firebase Auth).
- Google/Apple internal quality standards should be applied by analogy to all governance and app-shell decisions.
- The current implementation is MLB-first. Do not expand product scope while hardening ESPN-first live sports behavior.

## Benchmarks

- UI -> Apple
- DX (Next.js/edge glue) -> Vercel
- MONEY -> Stripe
- DATA/ID -> Amazon+Google
- OPS -> SRE+Amazon
- SEC -> Microsoft+Google
- PERF -> Meta+Netflix

## Repo Facts

- App name in `package.json`: `react-example`
- Runtime: Express server started with `tsx server.ts`
- Frontend: Vite + React + TypeScript
- Main server file: `server.ts`
- Frontend app: `src/App.tsx`
- Odds frontend service: `src/services/oddsService.ts`

## Repo Scripts

- `npm run dev` starts the Express/Vite runtime through `tsx server.ts`
- `npm run start` starts the runtime through `npx tsx server.ts`
- `npm run build` runs `vite build`
- `npm run lint` runs `tsc --noEmit`
- `npm run check:governance` runs `tsx scripts/validate-governance.ts`
- `npm run check:app-shell` runs `tsx scripts/validate-app-shell.ts`

## Hard Governance Rules

- Competitor odds APIs are forbidden.
- The Odds API must not be used.
- ESPN/source pages are primary and authoritative for game facts.
- Missing odds returns partial state, not full failure.
- ESPN-first means refresh-and-answer, not block-by-default.
- Chat should continue answering valid ESPN-grounded requests even when odds are missing.
- Live sports data and market state must never be faked.

## Web-Is-Database Rule

- The web is the database for public sports facts.
- ESPN is the first source of truth for game identity, schedule, score, status, inning, venue, teams, and game URLs.
- Do not cache public sports data into credentialdb.

## Credentialdb Boundary

credentialdb may store only user-specific data:

- accounts
- auth state
- bet history
- preferences
- personal analytics
- generated user artifacts

credentialdb must not store:

- cached public sports data
- ingested odds/scores
- ESPN normalized schemas
- public web data copied for reuse as source truth

## ESPN-First Hard Gate

Before any game-level sports answer is produced, resolve and validate ESPN grounding first.

If ESPN grounding is unavailable or required fields are missing, return a structured failure state. Do not produce a normal game answer.

PASS is a betting-decision state only. PASS is not a data-unavailable state.

If ESPN conflicts with local board state, stale board state, user screenshot, cached chat history, or model memory, ESPN wins for game facts.

## Required ESPN Grounding Fields

Every validated ESPN grounding object must include:

- `event_id`
- `league`
- `date`
- `home_team`
- `away_team`
- `status`
- `fetched_at`
- `source_url`

## Synthetic Odds Ban

Synthetic odds are banned from production responses.

Do not show fake bookmaker titles or synthetic odds as real market data.

When a game is ESPN checked but real market odds are unavailable, return partial state with consumer copy:

`ESPN checked. Market odds unavailable.`

## App Shell Rules

- Geometry must stay stable across desktop/tablet/mobile with no horizontal overflow.
- Use `100dvh`-safe layouts where needed and preserve iOS safe-area padding for sticky/nav/input regions.
- Right rail must collapse below content on smaller screens; left navigation must not crush main content.
- Sticky chat input must never cover the last visible message.
- Modal surfaces must remain scrollable on small screens.
- Preserve visible keyboard focus styles and touch-friendly interaction targets.

## PWA + iOS Wrapper Rules

- Keep a valid `manifest.webmanifest`, install icons, Apple touch icon, and Apple web app meta tags in `index.html`.
- Keep icon assets in repo (`192x192`, `512x512`, maskable `512x512`, and Apple touch `180x180`); regenerate from local source assets only.
- Service worker may cache app-shell static assets only; do not stale-cache live sports, odds, chat, MCP, auth, or payment routes.
- External links must open intentionally with safe rel attributes.
- Preserve touch-friendly actions for login, pricing, chat, board, artifacts, and ledger.
- Stripe web checkout is not automatically App Store compliant; treat this as iOS wrapper-ready shell only and require App Store commerce review before claiming compliance.

## Validation Checklist

Before shipping a sports-answer or app-shell change:

1. ESPN grounding validates required fields.
2. Missing ESPN required fields return failure state.
3. Missing odds with valid ESPN grounding returns partial state, not fake markets.
4. Synthetic bookmaker keys are blocked.
5. PASS is never used as a data-unavailable state.
6. Consumer UI does not expose internal governance wording.
7. `npm run lint` passes.
8. `npm run check:governance` passes.
9. `npm run check:app-shell` passes.
10. `npm run build` passes (or documented as environment/tooling blocker).

## No Mock Production Logic

Do not add stubs, TODO production branches, synthetic sportsbook data, demo-only odds, fake bookmaker titles, or mock production logic.

If data is unavailable, return a structured failure or partial state and say exactly what is unavailable.

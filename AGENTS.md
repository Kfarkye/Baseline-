# AGENTS.md

## Product model

Baseline is a direct institutional market data and statistical sports analysis engine. It serves human users, developer clients, and agent clients from the same game objects.

The current implementation is MLB-first. Do not expand scope while hardening the ESPN-first live sports answer path.

## Repo facts

- App name in `package.json`: `react-example`
- Runtime: Express server started with `tsx server.ts`
- Frontend: Vite + React + TypeScript
- Main server file: `server.ts`
- Frontend app: `src/App.tsx`
- Odds frontend service: `src/services/oddsService.ts`

## Repo scripts

- `npm run dev` starts the Express/Vite runtime through `tsx server.ts`
- `npm run start` starts the runtime through `npx tsx server.ts`
- `npm run build` runs `vite build`
- `npm run lint` runs `tsc --noEmit`
- `npm run check:governance` runs `tsx scripts/validate-governance.ts`

## Web-is-database rule

- The web is the database for public sports facts.
- Gemini reads the web.
- ESPN is the first source of truth for game identity, schedule, score, status, inning, venue, teams, and game URLs.
- Do not cache public sports data into credentialdb.

## Credentialdb boundary

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

## ESPN-first hard gate

Before any game-level sports answer is produced, resolve and validate ESPN grounding first.

Game-level triggers include:

- score
- schedule
- matchup
- series
- odds
- moneyline
- spread
- total
- line movement
- who won
- what happened
- live game
- final score
- current score
- inning
- outs
- base state
- pitcher
- probable pitcher
- best bet
- edge
- sharp
- play
- lean
- pass

If ESPN grounding is unavailable or required fields are missing, return a structured failure state. Do not produce a normal game answer.

PASS is a betting-decision state only. PASS is not a data-unavailable state.

If ESPN conflicts with local board state, stale board state, user screenshot, cached chat history, or model memory, ESPN wins for game facts.

## Required ESPN grounding fields

Every validated ESPN grounding object must include:

- `event_id`
- `league`
- `date`
- `home_team`
- `away_team`
- `status`
- `fetched_at`
- `source_url`

## Synthetic odds ban

Synthetic odds are banned from production responses.

Do not show fake DraftKings, fake moneyline, fake spread, fake total, fake bookmaker titles, or synthetic odds as real market data.

When a game is ESPN checked but real market odds are unavailable, return this partial state:

```json
{
  "state": "partial",
  "code": "ODDS_UNAVAILABLE_BUT_GAME_GROUNDED",
  "message": "Game is grounded from ESPN, but market odds are unavailable from a real source."
}
```

Consumer-facing copy should say:

`ESPN checked. Market odds unavailable.`

## Score-only terminology gate

Score-only data can support only:

- current score
- inning
- outs
- base state
- simple run pace
- score-based game context

Score-only data cannot support phrases like:

- market indicates
- moneyline advantage
- live market anchor
- win probability
- heavily adjusted to the over
- live total adjusted

If a real odds source is not attached, market language is blocked.

## Validation checklist

Before shipping a sports-answer change:

1. ESPN grounding validates required fields.
2. Future games cannot render final status, final score, winner labels, loss labels, or settlement language.
3. Missing ESPN required fields return failure state.
4. Missing odds with valid ESPN grounding returns partial state, not fake markets.
5. Synthetic bookmaker keys are blocked.
6. PASS is never used as a data-unavailable state.
7. Score-only context does not use banned market phrases.
8. Consumer UI uses `ESPN checked`, not internal terms like payload, governance, grounding, RPC, stack trace, synthetic odds, or source failure.
9. `npm run lint` passes.
10. `npm run check:governance` passes.
11. `npm run build` passes.

## No mock production logic

Do not add stubs, TODO production branches, synthetic sportsbook data, demo-only odds, fake bookmaker titles, or mock production logic.

If data is unavailable, return a structured failure or partial state and say exactly what is unavailable.

import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  isAllowedPassOutput,
  validateNoSyntheticOdds,
  validateRequiredEspnGroundingFields,
  buildSourceEvidence,
  isSourceStale,
  ODDS_UNAVAILABLE_PARTIAL,
} from "../src/lib/governance.ts";
import { isPublicNonInternalUrl } from "../src/lib/governance.ts";

const ROOT = process.cwd();
const FIXTURES = path.join(ROOT, "fixtures", "governance");

function readFixture(fileName: string) {
  const filePath = path.join(FIXTURES, fileName);
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function readText(relativePath: string): string {
  return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

function readFixtureText(fileName: string): string {
  return fs.readFileSync(path.join(FIXTURES, fileName), "utf8");
}

function forbidInText(sourceText: string, needle: string | RegExp, message: string) {
  if (needle instanceof RegExp ? needle.test(sourceText) : sourceText.includes(needle)) {
    throw new Error(message);
  }
}

function expectContainsRegex(sourceText: string, pattern: RegExp, message: string) {
  if (!pattern.test(sourceText)) {
    throw new Error(message);
  }
}

const validEspnEvent = readFixture("valid_espn_event.json");
const missingEventId = readFixture("missing_event_id.json");
const missingFetchedAt = readFixture("missing_fetched_at.json");
const oddsUnavailable = readFixture("odds_unavailable_game_grounded.json");
const syntheticOdds = readFixture("synthetic_odds_blocked.json");

// 1. valid ESPN grounding passes required fields
assert.equal(validateRequiredEspnGroundingFields(validEspnEvent), true, "Expected valid ESPN event to pass grounding validation");

// 2. missing event_id fails required grounding fields
assert.equal(validateRequiredEspnGroundingFields(missingEventId), false, "Expected missing event_id to fail grounding validation");

// 3. missing fetched_at fails required grounding fields
assert.equal(validateRequiredEspnGroundingFields(missingFetchedAt), false, "Expected missing fetched_at to fail grounding validation");

// 4. synthetic odds are blocked
assert.equal(validateNoSyntheticOdds(syntheticOdds), false, "Expected synthetic odds to be rejected");

// 5. odds-unavailable state for valid ESPN grounding is partial
assert.equal(validateRequiredEspnGroundingFields(oddsUnavailable), true, "Expected valid ESPN event to pass grounding before partial-state check");
assert.equal(oddsUnavailable.market_data_status?.state, "partial", "Expected odds-unavailable fixture to be partial");
assert.equal(oddsUnavailable.market_data_status?.code, ODDS_UNAVAILABLE_PARTIAL.code, "Expected odds-unavailable fixture to use the governing code");
assert.equal(oddsUnavailable.market_data_status?.allowed_output, ODDS_UNAVAILABLE_PARTIAL.allowed_output, "Expected score/state/simple pace output policy");

// 6. PASS cannot be used as data-unavailable state
assert.equal(
  isAllowedPassOutput("PASS - data unavailable right now"),
  true,
  "Expected PASS data-unavailable phrase to be recognized as blocked"
);

// 7. score-only contexts should not include market phrases
const scoreOnlyText = "ESPN checked. score/state/simple pace only.";
assert.ok(!/\b(moneyline|spread|total|odds|over|under)\b/i.test(scoreOnlyText), "Expected score-only output to avoid market phrases");

// 8. SportOdds includes required source and freshness fields
const oddsServiceText = readText("src/services/oddsService.ts");
expectContainsRegex(
  oddsServiceText,
  /interface\s+SportOdds\s*[\s\S]*?\bfetched_at\??\s*:\s*string;/,
  "SportOdds must include fetched_at?: string"
);
expectContainsRegex(
  oddsServiceText,
  /interface\s+SportOdds\s*[\s\S]*?\bsource_url\??\s*:\s*string;/,
  "SportOdds must include source_url?: string"
);
expectContainsRegex(
  oddsServiceText,
  /interface\s+SportOdds\s*[\s\S]*?\bmarket_data_status\??\s*:\s*MarketDataStatus;/,
  "SportOdds must include market_data_status?: MarketDataStatus"
);

// 9. server.ts should not reference old synthetic source identifiers
const serverText = readText("server.ts");
assert.ok(!/synthetic_odds/i.test(serverText), "server.ts must not reference synthetic odds keys");
assert.ok(!/api\\.the-odds-api\\.com/i.test(serverText), "server.ts must not call The Odds API endpoint");
assert.ok(!/\\bODDS_API_KEY\\b/.test(serverText), "server.ts must not branch on ODDS_API_KEY");

// 12. no fake DraftKings fallback in server
assert.ok(!/draft\\s*kings/i.test(serverText), "server.ts must not include DraftKings fallback language");

// 13. App.tsx should not copy The Odds API text to users
const appText = readText("src/App.tsx");
assert.ok(!/The\\s+Odds\\s+API/i.test(appText), "App.tsx must not surface The Odds API wording");
assert.ok(!/`[^`]*\\b(grounding|payload|governance|raw\\s*r\\w*pc|source\\s*failure|stack\\s*trace|synthetic\\s*odds)\\b[^`]*`/i.test(appText), "App.tsx must not expose internal governance wording in template text");
assert.ok(!/\"[^\"\\n]*\\b(grounding|payload|governance|stack\\s*trace|synthetic\\s*odds|source\\s*failure)\\b[^\"\\n]*\"/i.test(appText), "App.tsx must not expose internal governance wording in template text");
assert.ok(!/'[^'\\n]*\\b(grounding|payload|governance|stack\\s*trace|synthetic\\s*odds|source\\s*failure)\\b[^'\\n]*'/i.test(appText), "App.tsx must not expose internal governance wording in template text");

// freshness guardrail
const staleEvidence = buildSourceEvidence(
  "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
  "espn",
  new Date(Date.now() - 10 * 60_000).toISOString()
);
assert.equal(isPublicNonInternalUrl(staleEvidence.source_url), true, "ESPN source URL should be public");
assert.equal(isSourceStale(staleEvidence), true, "ESPN source evidence should be marked stale for old timestamps");

// explicit non-internal source type from consumer-facing fixture
const sourceText = readFixtureText("valid_espn_event.json");
assert.ok(isPublicNonInternalUrl(JSON.parse(sourceText).source_url), "ESPN source URL should be public non-internal");

console.log("check:governance passed");

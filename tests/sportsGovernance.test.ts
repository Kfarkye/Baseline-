import test from "node:test";
import assert from "node:assert/strict";
import {
  CanonicalPublicUrlSchema,
  EspnGameGroundingSchema,
  buildFailureState,
  buildSourceEvidence,
  canAnswerWithoutOdds,
  detectScreenshotOnlyInput,
  isGameLevelSportsRequest,
  isDataUnavailablePassReason,
  isSourceStale,
  resolveGameFacts,
} from "../src/services/sportsGovernance";

test("valid ESPN payload passes schema", () => {
  const result = EspnGameGroundingSchema.safeParse({
    event_id: "401815214",
    league: "MLB",
    date: "2026-05-06T01:40:00Z",
    home_team: "Philadelphia Phillies",
    away_team: "Athletics",
    status: "final",
    fetched_at: new Date().toISOString(),
    source_url: "https://www.espn.com/mlb/game/_/gameId/401815214",
  });
  assert.equal(result.success, true);
});

test("canonical URL must be public and non-internal", () => {
  assert.equal(CanonicalPublicUrlSchema.safeParse("https://www.espn.com/mlb/").success, true);
  assert.equal(CanonicalPublicUrlSchema.safeParse("http://localhost:3000/internal").success, false);
  assert.equal(CanonicalPublicUrlSchema.safeParse("http://127.0.0.1:8080/").success, false);
  assert.equal(CanonicalPublicUrlSchema.safeParse("https://metadata.google.internal/").success, false);
});

test("missing event_id fails ESPN schema", () => {
  const result = EspnGameGroundingSchema.safeParse({
    league: "MLB",
    date: "2026-05-06T01:40:00Z",
    home_team: "Philadelphia Phillies",
    away_team: "Athletics",
    status: "final",
    fetched_at: new Date().toISOString(),
    source_url: "https://www.espn.com/mlb/game/_/gameId/401815214",
  });
  assert.equal(result.success, false);
});

test("missing fetched_at fails ESPN schema", () => {
  const result = EspnGameGroundingSchema.safeParse({
    event_id: "401815214",
    league: "MLB",
    date: "2026-05-06T01:40:00Z",
    home_team: "Philadelphia Phillies",
    away_team: "Athletics",
    status: "final",
    source_url: "https://www.espn.com/mlb/game/_/gameId/401815214",
  });
  assert.equal(result.success, false);
});

test("stale source is detected", () => {
  const staleTimestamp = new Date(Date.now() - 10 * 60_000).toISOString();
  const evidence = buildSourceEvidence(
    "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard",
    "espn",
    staleTimestamp
  );
  assert.equal(isSourceStale(evidence), true);
});

test("screenshot-only input is rejected when no grounding context", () => {
  assert.equal(detectScreenshotOnlyInput("Use this screenshot for the game pick", false), true);
});

test("team-vs-team request is recognized as game-level", () => {
  assert.equal(isGameLevelSportsRequest("Dodgers vs Padres tonight"), true);
});

test("local slate conflict resolves to ESPN facts", () => {
  const espn = {
    event_id: "401815214",
    league: "MLB",
    date: "2026-05-06T01:40:00Z",
    home_team: "Philadelphia Phillies",
    away_team: "Athletics",
    status: "final",
    fetched_at: new Date().toISOString(),
    source_url: "https://www.espn.com/mlb/game/_/gameId/401815214",
  };
  const localSlate = {
    event_id: "different-local-id",
    home_team: "Wrong Team",
    away_team: "Wrong Team",
  };

  const resolved = resolveGameFacts(espn, localSlate);
  assert.equal(resolved.event_id, "401815214");
  assert.equal(resolved.home_team, "Philadelphia Phillies");
});

test("PASS cannot be used as data-unavailable state", () => {
  assert.equal(isDataUnavailablePassReason("PASS - data unavailable right now"), true);
});

test("odds unavailable but valid game grounding still answers", () => {
  const grounding = {
    event_id: "401815214",
    league: "MLB",
    date: "2026-05-06T01:40:00Z",
    home_team: "Philadelphia Phillies",
    away_team: "Athletics",
    status: "final",
    fetched_at: new Date().toISOString(),
    source_url: "https://www.espn.com/mlb/game/_/gameId/401815214",
  };
  assert.equal(canAnswerWithoutOdds(grounding, false), true);
});

test("structured failure state is produced", () => {
  const failure = buildFailureState(
    "ESPN_GROUNDING_REQUIRED",
    "I could not map that request to an ESPN game.",
    []
  );
  assert.equal(failure.state, "failure");
  assert.equal(failure.code, "ESPN_GROUNDING_REQUIRED");
});

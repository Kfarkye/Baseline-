import { z } from "zod";

export const FRESHNESS_WINDOW_MS = 120_000;

const MLB_TEAM_KEYWORDS = [
  "diamondbacks",
  "braves",
  "orioles",
  "red sox",
  "cubs",
  "white sox",
  "reds",
  "guardians",
  "rockies",
  "tigers",
  "astros",
  "royals",
  "angels",
  "dodgers",
  "marlins",
  "brewers",
  "twins",
  "mets",
  "yankees",
  "athletics",
  "phillies",
  "pirates",
  "padres",
  "giants",
  "mariners",
  "cardinals",
  "rays",
  "rangers",
  "blue jays",
  "nationals",
];

const INTERNAL_HOST_SUFFIXES = [".internal", ".local"];

function isIPv4Host(hostname: string): boolean {
  return /^\d{1,3}(\.\d{1,3}){3}$/.test(hostname);
}

function isPrivateIPv4(hostname: string): boolean {
  const parts = hostname.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  return false;
}

function isIPv6Host(hostname: string): boolean {
  return hostname.includes(":");
}

function isPrivateIPv6(hostname: string): boolean {
  const normalized = hostname.toLowerCase();
  if (normalized === "::1" || normalized === "::") return true;
  if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // fc00::/7
  if (normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) {
    return true; // fe80::/10
  }
  return false;
}

export function isPublicNonInternalUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;

  const hostname = parsed.hostname.toLowerCase();
  if (!hostname || hostname === "localhost") return false;
  if (hostname === "metadata.google.internal") return false;
  if (INTERNAL_HOST_SUFFIXES.some((suffix) => hostname.endsWith(suffix))) return false;

  if (isIPv4Host(hostname) && isPrivateIPv4(hostname)) return false;
  if (isIPv6Host(hostname) && isPrivateIPv6(hostname)) return false;

  return true;
}

export const CanonicalPublicUrlSchema = z.string().url().refine(isPublicNonInternalUrl, {
  message: "canonical_url must be a public non-internal URL",
});

export const SourceTypeSchema = z.enum([
  "espn",
  "odds_api",
  "local_slate",
  "screenshot",
  "user_prompt",
]);

export const FreshnessStatusSchema = z.enum(["fresh", "stale", "unknown"]);

export const SourceEvidenceSchema = z.object({
  source_url: CanonicalPublicUrlSchema,
  source_type: SourceTypeSchema,
  fetched_at: z.string().datetime(),
  freshness_status: FreshnessStatusSchema,
});

export const EspnGameGroundingSchema = z.object({
  event_id: z.string().min(1),
  league: z.string().min(1),
  date: z.string().min(1),
  home_team: z.string().min(1),
  away_team: z.string().min(1),
  status: z.string().min(1),
  fetched_at: z.string().datetime(),
  source_url: CanonicalPublicUrlSchema,
});

export const PayloadContractSchema = z.object({
  canonical_url: CanonicalPublicUrlSchema,
  request_text: z.string().min(1),
  request_scope: z.enum(["game_level", "general"]),
  espn_grounding: EspnGameGroundingSchema.optional(),
  source_evidence: z.array(SourceEvidenceSchema).min(1),
  generated_at: z.string().datetime(),
});

export const FailureStateSchema = z.object({
  state: z.literal("failure"),
  code: z.enum([
    "ESPN_GROUNDING_REQUIRED",
    "ESPN_GROUNDING_INVALID",
    "ESPN_SOURCE_STALE",
    "SCREENSHOT_ONLY_INPUT_REJECTED",
    "PASS_MISUSED_FOR_DATA_UNAVAILABLE",
  ]),
  user_message: z.string().min(1),
  source_evidence: z.array(SourceEvidenceSchema),
  occurred_at: z.string().datetime(),
});

export const AuditEventSchema = z.object({
  event_id: z.string().min(1),
  action: z.string().min(1),
  outcome: z.enum(["allow", "deny", "error"]),
  created_at: z.string().datetime(),
  metadata: z.record(z.string(), z.string()).default({}),
});

export const SportsAnswerStateSchema = z.discriminatedUnion("state", [
  z.object({
    state: z.literal("ready"),
    answer_text: z.string().min(1),
    payload: PayloadContractSchema,
    source_evidence: z.array(SourceEvidenceSchema).min(1),
    audit: z.array(AuditEventSchema),
  }),
  z.object({
    state: z.literal("pass"),
    reason: z.string().min(1),
    payload: PayloadContractSchema,
    source_evidence: z.array(SourceEvidenceSchema).min(1),
    audit: z.array(AuditEventSchema),
  }),
  FailureStateSchema,
]);

export type EspnGameGrounding = z.infer<typeof EspnGameGroundingSchema>;
export type SourceEvidence = z.infer<typeof SourceEvidenceSchema>;
export type PayloadContract = z.infer<typeof PayloadContractSchema>;
export type SportsAnswerState = z.infer<typeof SportsAnswerStateSchema>;
export type FailureState = z.infer<typeof FailureStateSchema>;
export type AuditEvent = z.infer<typeof AuditEventSchema>;

export function computeFreshnessStatus(fetchedAtIso: string, now = Date.now()): z.infer<typeof FreshnessStatusSchema> {
  const parsed = Date.parse(fetchedAtIso);
  if (Number.isNaN(parsed)) return "unknown";
  return now - parsed <= FRESHNESS_WINDOW_MS ? "fresh" : "stale";
}

export function isGameLevelSportsRequest(message: string): boolean {
  const text = message.toLowerCase();
  const gamePatterns = [
    /\bvs\b/,
    /\bversus\b/,
    /@/,
    /\bmatchup\b/,
    /\bgame\b/,
    /\bmoneyline\b/,
    /\bodds\b/,
    /\btotal\b/,
    /\bspread\b/,
    /\brun\s*line\b/,
    /\bscore\b/,
    /\binnings?\b/,
  ];
  const keywordMatches = MLB_TEAM_KEYWORDS.filter((keyword) => text.includes(keyword)).length;
  return gamePatterns.some((pattern) => pattern.test(text)) || keywordMatches >= 2;
}

export function detectScreenshotOnlyInput(message: string, hasGroundingContext: boolean): boolean {
  const text = message.toLowerCase();
  const screenshotSignals = ["screenshot", "image", "screen grab", "attached image", "photo"];
  const hasScreenshotSignal = screenshotSignals.some((signal) => text.includes(signal));
  return hasScreenshotSignal && !hasGroundingContext;
}

export function isDataUnavailablePassReason(reason: string): boolean {
  const text = reason.toLowerCase();
  const disallowed = ["data unavailable", "missing data", "not available", "no data", "cannot fetch"];
  return disallowed.some((phrase) => text.includes(phrase));
}

export function buildFailureState(
  code: FailureState["code"],
  userMessage: string,
  sourceEvidence: SourceEvidence[] = []
): FailureState {
  return {
    state: "failure",
    code,
    user_message: userMessage,
    source_evidence: sourceEvidence,
    occurred_at: new Date().toISOString(),
  };
}

export function buildAuditEvent(
  action: string,
  outcome: AuditEvent["outcome"],
  metadata: Record<string, string> = {}
): AuditEvent {
  return {
    event_id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
    action,
    outcome,
    created_at: new Date().toISOString(),
    metadata,
  };
}

export function resolveGameFacts(
  espnGrounding: EspnGameGrounding,
  _localSlateGrounding?: Partial<EspnGameGrounding> | null
): EspnGameGrounding {
  // ESPN is authoritative for game facts.
  return espnGrounding;
}

export function isSourceStale(sourceEvidence: SourceEvidence): boolean {
  return sourceEvidence.freshness_status === "stale";
}

export function buildSourceEvidence(sourceUrl: string, sourceType: z.infer<typeof SourceTypeSchema>, fetchedAtIso: string): SourceEvidence {
  return {
    source_url: sourceUrl,
    source_type: sourceType,
    fetched_at: fetchedAtIso,
    freshness_status: computeFreshnessStatus(fetchedAtIso),
  };
}

export function buildCanonicalEspnGameUrl(eventId: string): string {
  return `https://www.espn.com/mlb/game/_/gameId/${eventId}`;
}

export function canAnswerWithoutOdds(gameGrounding: EspnGameGrounding | null, _oddsAvailable: boolean): boolean {
  if (!gameGrounding) return false;
  // Grounding is mandatory for game facts; odds are optional.
  return true;
}

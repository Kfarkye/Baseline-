import { z } from "zod";

export const ODDS_UNAVAILABLE_PARTIAL = {
  state: "partial" as const,
  code: "ODDS_UNAVAILABLE_BUT_GAME_GROUNDED",
  message: "ESPN checked. Market odds not found yet.",
  allowed_output: "score/state/simple pace only",
};

export const FRESHNESS_WINDOW_MS = 120_000;

export interface MarketDataStatus {
  state: "grounded" | "partial" | "failed";
  code?: string;
  message?: string;
  allowed_output?: string;
}

export interface SourceEvidence {
  source_url: string;
  source_type: "espn" | "local_slate" | "screenshot" | "user_prompt";
  fetched_at: string;
  freshness_status: "fresh" | "stale" | "unknown";
}

export interface EspnGameGrounding {
  event_id: string;
  league: string;
  date: string;
  home_team: string;
  away_team: string;
  status: "live" | "final" | "upcoming";
  fetched_at: string;
  source_url: string;
  inning?: number | string;
  inning_half?: string;
}

export interface PayloadContract {
  canonical_url: string;
  request_text: string;
  request_scope: "game_level" | "general";
  espn_grounding?: EspnGameGrounding;
  source_evidence: SourceEvidence[];
  generated_at: string;
}

export interface FailureState {
  state: "failure";
  code:
    | "ESPN_GROUNDING_REQUIRED"
    | "ESPN_GROUNDING_INVALID"
    | "ESPN_SOURCE_STALE"
    | "SCREENSHOT_ONLY_INPUT_BLOCKED"
    | "UNKNOWN_SPORTS_ROUTE"
    | "PASS_MISUSED_FOR_DATA_UNAVAILABLE"
    | "ESPN_SOURCE_FAILURE";
  message: string;
  occurred_at: string;
  source_evidence?: SourceEvidence[];
  allowed_output?: string;
}

export interface AuditEvent {
  event_id: string;
  action: string;
  outcome: "allow" | "deny" | "error";
  created_at: string;
  metadata?: Record<string, string>;
}

export interface SportsAnswerState {
  state: "ready" | "pass" | "failure";
  answer_text?: string;
  reason?: string;
  payload: PayloadContract;
  source_evidence: SourceEvidence[];
  audit: AuditEvent[];
}

const TEAM_NAMES = [
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

function isPrivateHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (!host || host === "localhost") return true;
  if (host === "metadata.google.internal") return true;
  if (host === "127.0.0.1" || host.startsWith("127.")) return true;
  if (host.endsWith(".local") || host.endsWith(".internal")) return true;
  return false;
}

function isIPv6Internal(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === "::1" || host === "::" || host.startsWith("fc") || host.startsWith("fd") || host.startsWith("fe8") || host.startsWith("fe9") || host.startsWith("fea") || host.startsWith("feb");
}

export function isPublicNonInternalUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return false;
    if (isPrivateHost(parsed.hostname)) return false;
    if (isIPv6Internal(parsed.hostname)) return false;
    return true;
  } catch {
    return false;
  }
}

export const SourceTypeSchema = z.enum(["espn", "local_slate", "screenshot", "user_prompt"]);
export const FreshnessStatusSchema = z.enum(["fresh", "stale", "unknown"]);
export const SourceEvidenceSchema = z.object({
  source_url: z.string().url().refine(isPublicNonInternalUrl),
  source_type: SourceTypeSchema,
  fetched_at: z.string(),
  freshness_status: FreshnessStatusSchema,
});

export const EspnGameGroundingSchema = z.object({
  event_id: z.string().min(1),
  league: z.string().min(1),
  date: z.string().min(1),
  home_team: z.string().min(1),
  away_team: z.string().min(1),
  status: z.enum(["live", "final", "upcoming"]),
  fetched_at: z.string(),
  source_url: z.string().url().refine(isPublicNonInternalUrl),
  inning: z.union([z.number(), z.string()]).optional(),
  inning_half: z.string().optional(),
});

export const MarketDataStatusSchema = z.object({
  state: z.union([z.literal("grounded"), z.literal("partial"), z.literal("failed")]),
  code: z.string().optional(),
  message: z.string().optional(),
  allowed_output: z.string().optional(),
});

export const PayloadContractSchema = z.object({
  canonical_url: z.string().url().refine(isPublicNonInternalUrl),
  request_text: z.string().min(1),
  request_scope: z.enum(["game_level", "general"]),
  espn_grounding: EspnGameGroundingSchema.optional(),
  source_evidence: z.array(SourceEvidenceSchema).min(1),
  generated_at: z.string(),
});

export const FailureStateSchema = z.object({
  state: z.literal("failure"),
  code: z.enum([
    "ESPN_GROUNDING_REQUIRED",
    "ESPN_GROUNDING_INVALID",
    "ESPN_SOURCE_STALE",
    "SCREENSHOT_ONLY_INPUT_BLOCKED",
    "UNKNOWN_SPORTS_ROUTE",
    "PASS_MISUSED_FOR_DATA_UNAVAILABLE",
    "ESPN_SOURCE_FAILURE",
  ]),
  message: z.string().min(1),
  occurred_at: z.string(),
  source_evidence: z.array(SourceEvidenceSchema).optional(),
  allowed_output: z.string().optional(),
});

export const AuditEventSchema = z.object({
  event_id: z.string().min(1),
  action: z.string().min(1),
  outcome: z.enum(["allow", "deny", "error"]),
  created_at: z.string(),
  metadata: z.record(z.string(), z.string()).optional(),
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

export function validateRequiredEspnGroundingFields(value: unknown): value is EspnGameGrounding {
  if (!isRecord(value)) return false;
  const checked = EspnGameGroundingSchema.safeParse(value);
  return checked.success;
}

export function validateNoSyntheticOdds(game: { bookmakers?: Array<{ key?: unknown; title?: unknown }> }): boolean {
  if (!game || !Array.isArray(game.bookmakers)) return true;
  return !game.bookmakers.some((bookmaker) => {
    const key = String((bookmaker as { key?: unknown }).key || (bookmaker as { title?: unknown }).title || "").toLowerCase();
    return key === "synthetic_odds" || key.includes("synthetic");
  });
}

export function isGameLevelSportsRequest(message: string): boolean {
  const lower = message.toLowerCase();
  const gameSignals = [
    /\bvs\b/,
    /\bversus\b/,
    /@/,
    /\bmatchup\b/,
    /\bgame\b/,
    /\bmoneyline\b/,
    /\bodds\b/,
    /\btotal\b/,
    /\bspread\b/,
    /\bscore\b/,
    /\binning\b/,
  ];
  const hasSignal = gameSignals.some((pattern) => pattern.test(lower));
  const hasTeamKeyword = TEAM_NAMES.some((team) => lower.includes(team));
  return hasSignal || hasTeamKeyword;
}

export function detectScreenshotOnlyInput(message: string, hasGroundingContext: boolean): boolean {
  const hasScreenshotSignal = /\bscreenshot\b|\bimage\b|\bphoto\b|\battach(ed|ment)\b/i.test(message);
  return hasScreenshotSignal && !hasGroundingContext;
}

export function isAllowedPassOutput(text: string): boolean {
  return text.toLowerCase().includes("pass") && text.toLowerCase().includes("data unavailable");
}

export function computeFreshnessStatus(
  fetchedAt: string,
  now = Date.now()
): "fresh" | "stale" | "unknown" {
  const parsed = Date.parse(fetchedAt);
  if (Number.isNaN(parsed)) return "unknown";
  return now - parsed <= FRESHNESS_WINDOW_MS ? "fresh" : "stale";
}

export function isSourceStale(evidence: SourceEvidence): boolean {
  return evidence.freshness_status === "stale";
}

export function isSourceFresh(evidence: SourceEvidence): boolean {
  return evidence.freshness_status === "fresh";
}

export function buildSourceEvidence(
  sourceUrl: string,
  sourceType: SourceEvidence["source_type"],
  fetchedAt: string,
  freshness?: SourceEvidence["freshness_status"]
): SourceEvidence {
  return {
    source_url: sourceUrl,
    source_type: sourceType,
    fetched_at: fetchedAt,
    freshness_status: freshness || computeFreshnessStatus(fetchedAt),
  };
}

export function buildFailureState(
  code: FailureState["code"],
  message: string,
  options: {
    source_evidence?: SourceEvidence[];
    allowed_output?: string;
  } = {}
): FailureState {
  return {
    state: "failure",
    code,
    message,
    occurred_at: new Date().toISOString(),
    source_evidence: options.source_evidence,
    allowed_output: options.allowed_output,
  };
}

export function buildSportsFailureResponse(
  code: FailureState["code"],
  message: string,
  sourceEvidence: SourceEvidence[] = [],
  allowedOutput?: string
): { error: string; failure_state: FailureState } {
  return {
    error: message,
    failure_state: buildFailureState(code, message, {
      source_evidence: sourceEvidence,
      allowed_output: allowedOutput,
    }),
  };
}

export function buildAuditEvent(
  action: string,
  outcome: AuditEvent["outcome"],
  metadata: Record<string, string> = {}
): AuditEvent {
  return {
    event_id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
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
  return espnGrounding;
};

export function canAnswerWithoutOdds(gameGrounding: EspnGameGrounding | null): boolean {
  return Boolean(gameGrounding);
}

export function marketStatusFromOdds(bookmakers: Array<unknown>): MarketDataStatus {
  if (!Array.isArray(bookmakers) || bookmakers.length === 0) {
    return ODDS_UNAVAILABLE_PARTIAL;
  }
  return { state: "grounded" };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

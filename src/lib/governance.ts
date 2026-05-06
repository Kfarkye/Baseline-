export type FailureCode =
  | 'ESPN_GROUNDING_UNAVAILABLE'
  | 'ESPN_REQUIRED_FIELDS_MISSING'
  | 'SOURCE_STALE'
  | 'SCREENSHOT_ONLY_INPUT_BLOCKED'
  | 'LOCAL_BOARD_CONFLICT_WITH_ESPN'
  | 'ODDS_UNAVAILABLE_BUT_GAME_GROUNDED'
  | 'SYNTHETIC_ODDS_BLOCKED'
  | 'TOOL_ERROR'
  | 'UNKNOWN_SPORTS_ROUTE';

export interface FailureState {
  ok: false;
  code: FailureCode;
  message: string;
  required_fields?: string[];
  missing_fields?: string[];
  allowed_output?: string;
}

export interface SourceEvidence {
  source: 'ESPN' | 'ODDS_API' | 'USER_SCREENSHOT' | 'LOCAL_BOARD' | 'UNKNOWN';
  source_url?: string;
  fetched_at?: string;
  observed_at?: string;
}

export type MarketDataStatus =
  | { state: 'grounded'; code?: undefined; message?: string }
  | { state: 'partial'; code: 'ODDS_UNAVAILABLE_BUT_GAME_GROUNDED'; message: string; allowed_output?: string }
  | { state: 'failed'; code: FailureCode; message: string; allowed_output?: string };

export interface EspnGameGrounding {
  event_id: string;
  league: string;
  date: string;
  home_team: string;
  away_team: string;
  status: string;
  fetched_at: string;
  source_url: string;
  venue?: string;
  situation?: string;
  inning?: number | string;
  inning_half?: string;
  home_score?: string;
  away_score?: string;
  base_state?: string;
  outs?: number | string;
  source_evidence?: SourceEvidence;
}

export interface SportsAnswerState {
  ok: boolean;
  grounding?: EspnGameGrounding;
  market_data_status?: MarketDataStatus;
  failure_state?: FailureState;
}

export const REQUIRED_ESPN_GROUNDING_FIELDS: Array<keyof EspnGameGrounding> = [
  'event_id',
  'league',
  'date',
  'home_team',
  'away_team',
  'status',
  'fetched_at',
  'source_url'
];

export const ODDS_UNAVAILABLE_PARTIAL: MarketDataStatus = {
  state: 'partial',
  code: 'ODDS_UNAVAILABLE_BUT_GAME_GROUNDED',
  message: 'Game is grounded from ESPN, but market odds are unavailable from a real source.',
  allowed_output: 'score/state/simple pace only'
};

export const SCORE_ONLY_ALLOWED_TERMS = [
  'current score',
  'inning',
  'outs',
  'base state',
  'simple run pace',
  'score-based game context'
] as const;

export const SCORE_ONLY_BANNED_MARKET_PHRASES = [
  'market indicates',
  'moneyline advantage',
  'live market anchor',
  'win probability',
  'heavily adjusted to the over',
  'live total adjusted'
] as const;

export const GAME_LEVEL_TRIGGER_TERMS = [
  'score',
  'schedule',
  'matchup',
  'series',
  'odds',
  'moneyline',
  'spread',
  'total',
  'line movement',
  'who won',
  'what happened',
  'live game',
  'final score',
  'current score',
  'inning',
  'outs',
  'base state',
  'pitcher',
  'probable pitcher',
  'best bet',
  'edge',
  'sharp',
  'play',
  'lean',
  'pass'
] as const;

export function buildFailureState(
  code: FailureCode,
  message: string,
  options: Omit<FailureState, 'ok' | 'code' | 'message'> = {}
): FailureState {
  return { ok: false, code, message, ...options };
}

export function getMissingEspnGroundingFields(grounding: Partial<EspnGameGrounding> | null | undefined): string[] {
  if (!grounding) return REQUIRED_ESPN_GROUNDING_FIELDS as string[];
  return REQUIRED_ESPN_GROUNDING_FIELDS.filter((field) => {
    const value = grounding[field];
    return value === undefined || value === null || String(value).trim() === '';
  }) as string[];
}

export function validateRequiredEspnGroundingFields(
  grounding: Partial<EspnGameGrounding> | null | undefined
): { ok: true } | { ok: false; failure_state: FailureState } {
  const missing = getMissingEspnGroundingFields(grounding);
  if (missing.length > 0) {
    return {
      ok: false,
      failure_state: buildFailureState(
        'ESPN_REQUIRED_FIELDS_MISSING',
        `ESPN grounding is missing required fields: ${missing.join(', ')}.`,
        {
          required_fields: REQUIRED_ESPN_GROUNDING_FIELDS as string[],
          missing_fields: missing
        }
      )
    };
  }
  return { ok: true };
}

export function containsSyntheticOdds(value: unknown): boolean {
  const seen = new WeakSet<object>();

  const walk = (node: unknown): boolean => {
    if (!node || typeof node !== 'object') return false;
    if (seen.has(node)) return false;
    seen.add(node);

    if (Array.isArray(node)) return node.some(walk);

    const record = node as Record<string, unknown>;
    const key = typeof record.key === 'string' ? record.key.toLowerCase() : '';
    const title = typeof record.title === 'string' ? record.title.toLowerCase() : '';

    if (key.includes('synthetic') || title.includes('synthetic')) return true;

    return Object.values(record).some(walk);
  };

  return walk(value);
}

export function validateNoSyntheticOdds(value: unknown): { ok: true } | { ok: false; failure_state: FailureState } {
  if (containsSyntheticOdds(value)) {
    return {
      ok: false,
      failure_state: buildFailureState(
        'SYNTHETIC_ODDS_BLOCKED',
        'Synthetic odds are blocked from production responses.',
        { allowed_output: 'Use ESPN checked game facts with partial market state only.' }
      )
    };
  }
  return { ok: true };
}

export function hasScoreOnlyBannedMarketPhrase(text: string): boolean {
  const normalized = text.toLowerCase();
  return SCORE_ONLY_BANNED_MARKET_PHRASES.some((phrase) => normalized.includes(phrase));
}

export function isGameLevelSportsRequest(message: string): boolean {
  const normalized = message.toLowerCase();
  return GAME_LEVEL_TRIGGER_TERMS.some((term) => normalized.includes(term));
}

export function isScreenshotOnlyInput(input: { hasImage?: boolean; message?: string; espnAvailable?: boolean }): boolean {
  return Boolean(input.hasImage && !input.espnAvailable);
}

export function assertPassIsNotDataUnavailable(value: string): boolean {
  const normalized = value.toLowerCase();
  if (!normalized.includes('pass')) return true;
  return !(
    normalized.includes('data unavailable') ||
    normalized.includes('source unavailable') ||
    normalized.includes('grounding unavailable') ||
    normalized.includes('espn unavailable') ||
    normalized.includes('odds unavailable')
  );
}

export function buildSportsFailureResponse(failure_state: FailureState): SportsAnswerState {
  return { ok: false, failure_state };
}

import { validateRequiredEspnGroundingFields } from "./governance";

const GAMESHEET_STATUS_FRESHNESS_MS = 120_000;

export interface EspnNormalizedBookmaker {
  key: string;
  title: string;
  markets: {
    key: string;
    outcomes: {
      name: string;
      price?: number | string;
      point?: number;
    }[];
  }[];
}

export interface NormalizedEspnScoreboardEvent {
  id: string;
  event_id: string;
  league: string;
  date: string;
  home_team: string;
  away_team: string;
  status: "upcoming" | "live" | "final";
  home_score?: string;
  away_score?: string;
  score?: string;
  venue?: string;
  inning?: number | string;
  inning_half?: string;
  source_url: string;
  fetched_at: string;
  bookmakers: EspnNormalizedBookmaker[];
  market_data_status?: {
    state: "grounded" | "partial" | "failed";
    code?: string;
    message?: string;
    allowed_output?: string;
  };
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

export interface MarketStatus {
  state: "grounded" | "partial" | "failed";
  code?: string;
  message?: string;
  allowed_output?: string;
}

export function buildEspnSourceUrl(eventId: string): string {
  return `https://www.espn.com/mlb/game/_/gameId/${encodeURIComponent(eventId)}`;
}

function normalizeName(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeStatus(stateValue: string): "upcoming" | "live" | "final" {
  const state = (stateValue || "").toLowerCase();
  if (state === "in") return "live";
  if (state === "post") return "final";
  return "upcoming";
}

function parsePrice(raw: unknown): number | string | undefined {
  if (typeof raw === "number") return raw;
  if (typeof raw !== "string") return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : trimmed;
}

function normalizeMarketDetails(raw: unknown): { point?: number; outcomes?: Array<{ name: string; price?: number | string }> } {
  if (!Array.isArray(raw)) return {};
  if (raw.length < 2) return {};
  const [home, away] = raw;
  return {
    outcomes: [
      { name: normalizeName(home?.team || home?.name), price: parsePrice(home?.price) },
      { name: normalizeName(away?.team || away?.name), price: parsePrice(away?.price) },
    ].filter((outcome) => outcome.name),
  };
}

function parseH2hFromCompetition(competition: any): EspnNormalizedBookmaker["markets"] {
  const outcomes = normalizeMarketDetails(competition?.odds?.[0]?.outcomes);
  if (outcomes.outcomes && outcomes.outcomes.length > 0) {
    return [{ key: "h2h", outcomes: outcomes.outcomes }];
  }

  const h2hEntry = competition?.odds?.find((entry: any) => entry?.market === "h2h");
  if (h2hEntry && Array.isArray(h2hEntry.outcomes)) {
    const normalized = h2hEntry.outcomes
      .map((outcome: any) => ({
        name: normalizeName(outcome?.name || outcome?.team),
        price: parsePrice(outcome?.price),
      }))
      .filter((outcome) => outcome.name);
    if (normalized.length) {
      return [{ key: "h2h", outcomes: normalized }];
    }
  }
  return [];
}

function parseSpreadMarket(entry: any): EspnNormalizedBookmaker["markets"][number] | null {
  if (!entry || !Array.isArray(entry.outcomes)) return null;
  const outcomes = entry.outcomes
    .map((outcome: any) => ({
      name: normalizeName(outcome?.name || ""),
      price: parsePrice(outcome?.price),
      point: typeof outcome?.point === "number" ? outcome.point : undefined,
    }))
    .filter((outcome) => outcome.name);
  if (!outcomes.length) return null;

  return {
    key: "spreads",
    outcomes,
  };
}

function parseTotalsMarket(entry: any): EspnNormalizedBookmaker["markets"][number] | null {
  if (!entry) return null;

  const markets = Array.isArray(entry.markets)
    ? entry.markets
    : [];
  const matched = markets.find((market: any) => market.key === "totals") || entry;
  if (!matched || !Array.isArray(matched.outcomes)) return null;

  const outcomes = matched.outcomes
    .map((outcome: any) => ({
      name: normalizeName(outcome?.name),
      price: parsePrice(outcome?.price),
      point: typeof outcome?.point === "number" ? outcome.point : parsePrice(outcome?.point) as number,
    }))
    .filter((outcome) => outcome.name);

  if (!outcomes.length) return null;
  return { key: "totals", outcomes };
}

export function parseOddsFromEspnCompetition(competition: any): EspnNormalizedBookmaker[] {
  if (!competition) return [];
  const oddsEntries = Array.isArray(competition.odds) ? competition.odds : [];
  const bookmakerEntries = oddsEntries.map((entry: any) => {
    const providerName = normalizeName(entry?.provider?.name) || normalizeName(entry?.title) || "ESPN";
    const providerKey = normalizeName(entry?.provider?.key) || normalizeName(entry?.key) || "espn";
    const providerId = providerName || providerKey;

    const markets = [
      ...parseH2hFromCompetition(competition),
      ...oddsEntries
        .map((candidate: any) => {
          const spread = parseSpreadMarket(candidate);
          if (spread) return spread;
          return parseTotalsMarket(candidate);
        })
        .filter((market): market is EspnNormalizedBookmaker["markets"][number] => Boolean(market)),
    ];

    const dedupedMarkets = markets.reduce<Array<{ key: string; outcomes: { name: string; price?: number | string; point?: number }[] }>>((acc, market) => {
      if (!market || acc.some((m) => m.key === market.key)) return acc;
      return [...acc, market];
    }, []);

    if (!dedupedMarkets.length) return null;

    return {
      key: providerKey || "espn",
      title: providerName || "ESPN",
      markets: dedupedMarkets.map((market) => ({
        ...market,
        outcomes: market.outcomes.filter((outcome) => outcome.name),
      })).filter((market) => market.outcomes.length > 0),
    };
  }).filter((bookmaker): bookmaker is EspnNormalizedBookmaker => Boolean(bookmaker) && bookmaker.markets.length > 0);

  return bookmakerEntries;
}

export function normalizeEspnScoreboardEvent(event: any, nowIso: string): NormalizedEspnScoreboardEvent {
  const competition = Array.isArray(event?.competitions) ? event.competitions[0] : {};
  const competitors = Array.isArray(competition?.competitors) ? competition.competitors : [];
  const home = competitors.find((team: any) => normalizeName(team?.homeAway).toLowerCase() === "home");
  const away = competitors.find((team: any) => normalizeName(team?.homeAway).toLowerCase() === "away");

  const eventId = normalizeName(event?.id);
  const status = normalizeStatus(event?.status?.type?.state || "");
  const leagueName = normalizeName(event?.league?.abbreviation) || normalizeName(event?.league?.name) || "MLB";
  const dateIso = normalizeName(event?.date) || nowIso;

  const inning = competition?.status?.period ?? event?.status?.period;
  const detail = normalizeName(event?.status?.type?.detail);
  const inningHalf = status === "live"
    ? /top/i.test(detail)
      ? "top"
      : /bot|bottom/i.test(detail)
        ? "bottom"
        : undefined
    : undefined;

  const homeTeamName = normalizeName(home?.team?.displayName);
  const awayTeamName = normalizeName(away?.team?.displayName);
  const homeScoreRaw = home?.score;
  const awayScoreRaw = away?.score;
  const homeScore = typeof homeScoreRaw === "string" || typeof homeScoreRaw === "number" ? String(homeScoreRaw) : "";
  const awayScore = typeof awayScoreRaw === "string" || typeof awayScoreRaw === "number" ? String(awayScoreRaw) : "";
  const hasScore = status === "live" || status === "final";
  const score = hasScore
    ? `${awayTeamName || "Away"} ${awayScore || "0"} - ${homeTeamName || "Home"} ${homeScore || "0"}`
    : undefined;

  const bookmakers = parseOddsFromEspnCompetition(competition);
  const grounding: EspnGameGrounding = {
    event_id: eventId,
    league: leagueName,
    date: dateIso,
    home_team: homeTeamName,
    away_team: awayTeamName,
    status,
    fetched_at: nowIso,
    source_url: buildEspnSourceUrl(eventId),
    inning,
    inning_half: inningHalf,
  };
  const groundingValid = validateRequiredEspnGroundingFields(grounding);

  return {
    id: eventId,
    event_id: eventId,
    league: leagueName,
    date: dateIso,
    home_team: homeTeamName,
    away_team: awayTeamName,
    status,
    home_score: hasScore ? homeScore : undefined,
    away_score: hasScore ? awayScore : undefined,
    score,
    venue: normalizeName(competition?.venue?.fullName),
    inning: status === "live" ? inning : undefined,
    inning_half: inningHalf,
    source_url: buildEspnSourceUrl(eventId),
    fetched_at: nowIso,
    bookmakers,
    market_data_status: bookmakers.length > 0
      ? { state: "grounded" }
      : {
          state: "partial",
          code: "ODDS_UNAVAILABLE_BUT_GAME_GROUNDED",
          message: "ESPN checked. Market odds not found yet.",
          allowed_output: "score/state/simple pace only",
        },
    ...(
      groundingValid
        ? {}
        : {
            market_data_status: {
              state: "failed",
              code: "ESPN_SOURCE_FAILURE",
              message: "ESPN grounding incomplete for this event.",
              allowed_output: "score/state/simple pace only",
            },
          }
    ),
  };
}

export function validateEspnGrounding(event: unknown): event is EspnGameGrounding {
  return validateRequiredEspnGroundingFields(event);
}

export function isGroundingFresh(grounding: { fetched_at?: string }, now = Date.now()): boolean {
  if (!grounding || typeof grounding.fetched_at !== "string") return false;
  const parsed = Date.parse(grounding.fetched_at);
  if (Number.isNaN(parsed)) return false;
  return now - parsed <= GAMESHEET_STATUS_FRESHNESS_MS;
}

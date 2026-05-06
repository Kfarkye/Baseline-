import {
  EspnGameGrounding,
  FailureState,
  buildFailureState,
  validateRequiredEspnGroundingFields
} from './governance';

export function buildEspnSourceUrl(event_id: string): string {
  return `https://www.espn.com/mlb/game/_/gameId/${event_id}`;
}

function getCompetitor(competition: any, homeAway: 'home' | 'away'): any {
  return competition?.competitors?.find((competitor: any) => competitor.homeAway === homeAway);
}

function normalizeStatus(event: any): string {
  const state = event?.status?.type?.state;
  if (state === 'in') return 'live';
  if (state === 'post') return 'final';
  if (state === 'pre') return 'upcoming';
  return event?.status?.type?.name || event?.status?.type?.detail || 'unknown';
}

function getInningHalf(detail: string | undefined): string | undefined {
  if (!detail) return undefined;
  if (detail.includes('Top')) return 'Top';
  if (detail.includes('Bot') || detail.includes('Bottom')) return 'Bottom';
  if (detail.includes('Mid')) return 'Middle';
  if (detail.includes('End')) return 'End';
  return undefined;
}

export function normalizeEspnScoreboardEvent(event: any, fetchedAt: string = new Date().toISOString()): EspnGameGrounding {
  const competition = event?.competitions?.[0];
  const home = getCompetitor(competition, 'home');
  const away = getCompetitor(competition, 'away');
  const status = normalizeStatus(event);
  const detail = event?.status?.type?.detail;
  const isScoredState = status === 'live' || status === 'final';
  const eventId = String(event?.id || '');

  return {
    event_id: eventId,
    league: 'MLB',
    date: event?.date || '',
    home_team: home?.team?.displayName || '',
    away_team: away?.team?.displayName || '',
    status,
    fetched_at: fetchedAt,
    source_url: eventId ? buildEspnSourceUrl(eventId) : '',
    venue: competition?.venue?.fullName,
    situation: status === 'live' ? detail : undefined,
    inning: status === 'live' ? event?.status?.period : undefined,
    inning_half: status === 'live' ? getInningHalf(detail) : undefined,
    home_score: isScoredState ? String(home?.score ?? '0') : undefined,
    away_score: isScoredState ? String(away?.score ?? '0') : undefined,
    source_evidence: {
      source: 'ESPN',
      source_url: eventId ? buildEspnSourceUrl(eventId) : '',
      fetched_at: fetchedAt
    }
  };
}

export function validateEspnGrounding(
  grounding: Partial<EspnGameGrounding> | null | undefined
): { ok: true } | { ok: false; failure_state: FailureState } {
  return validateRequiredEspnGroundingFields(grounding);
}

export function isGroundingFresh(fetched_at: string | undefined, thresholdMs: number): boolean {
  if (!fetched_at) return false;
  const fetched = new Date(fetched_at).getTime();
  if (!Number.isFinite(fetched)) return false;
  return Date.now() - fetched <= thresholdMs;
}

export function buildMissingEspnGroundingFailure(message = 'ESPN grounding is unavailable for this game-level sports request.'): FailureState {
  return buildFailureState('ESPN_GROUNDING_UNAVAILABLE', message, {
    allowed_output: 'No normal game answer may be produced until ESPN is checked.'
  });
}

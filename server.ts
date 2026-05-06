import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";
import axios from "axios";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { cert, getApps, initializeApp, type ServiceAccount } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import {
  buildAuditEvent,
  buildFailureState,
  buildSourceEvidence,
  detectScreenshotOnlyInput,
  isAllowedPassOutput,
  isGameLevelSportsRequest,
  isPublicNonInternalUrl,
  isSourceStale,
  MarketDataStatus,
  ODDS_UNAVAILABLE_PARTIAL,
  PayloadContractSchema,
  PayloadContract,
  SportsAnswerStateSchema,
  SourceEvidence,
  isSourceFresh,
  validateNoSyntheticOdds,
  validateRequiredEspnGroundingFields,
  type EspnGameGrounding,
  type FailureState,
} from "./src/lib/governance.ts";
import {
  isGroundingFresh,
  normalizeEspnScoreboardEvent,
  type NormalizedEspnScoreboardEvent,
  validateEspnGrounding,
} from "./src/lib/espnGrounding.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);

const MAX_PAYMENT_AMOUNT_USD = 5000;
const MIN_PAYMENT_AMOUNT_USD = 1;
const CHAT_RATE_WINDOW_MS = 60_000;
const CHAT_RATE_WINDOW_MAX = 12;
const MAX_CHAT_MESSAGE_CHARS = 8000;
const MAX_CHAT_HISTORY_ITEMS = 40;
const MAX_CHAT_HISTORY_ITEM_CHARS = 12_000;
const CHAT_MODEL_TIMEOUT_MS = 25_000;

const DEFAULT_CHAT_MODEL = "gemini-3.1-pro-preview";
const CHAT_MODEL_FALLBACKS = [
  "gemini-3.1-pro-preview",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
  "gemini-1.5-pro",
];

const ESPN_SCOREBOARD_URL = "https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard";
const ESPN_SCOREBOARD_HOME = "https://www.espn.com/mlb/scoreboard";

interface VerifiedFirebaseUser {
  uid: string;
  email?: string;
}

interface BoardEvent extends NormalizedEspnScoreboardEvent {
  sport_key: string;
  sport_title: string;
  commence_time: string;
  source_evidence: SourceEvidence[];
  market_data_status: MarketDataStatus;
}

let adminInitialized = false;
const chatRateWindow = new Map<string, number[]>();

function getBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) return null;
  return token;
}

function extractUpstreamStatus(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const direct = (error as { status?: unknown }).status;
  if (typeof direct === "number") return direct;
  const nested = (error as { cause?: unknown }).cause;
  if (typeof nested === "object" && nested !== null && typeof (nested as { status?: unknown }).status === "number") {
    return (nested as { status?: number }).status;
  }
  return undefined;
}

function extractUpstreamErrorCode(error: unknown): string | undefined {
  if (typeof error !== "object" || error === null) return undefined;
  const direct = (error as { code?: unknown }).code;
  if (typeof direct === "string") return direct;
  if (typeof direct === "number") return String(direct);
  const message = (error as { message?: unknown }).message;
  if (typeof message === "string") {
    const lowered = message.toLowerCase();
    if (lowered.includes("permission_denied") || lowered.includes("permission denied")) return "PERMISSION_DENIED";
    if (lowered.includes("not found")) return "NOT_FOUND";
  }
  return undefined;
}

function isModelNotFoundError(error: unknown): boolean {
  const status = extractUpstreamStatus(error);
  if (status === 404) return true;
  const code = extractUpstreamErrorCode(error);
  if (code === "404" || code === "NOT_FOUND") return true;
  if (typeof error === "object" && error !== null) {
    const message = String((error as { message?: unknown }).message ?? "").toLowerCase();
    return message.includes("not found") && message.includes("model");
  }
  return false;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function parseServiceAccountFromEnv(): ServiceAccount | null {
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
  if (!raw) return null;

  const candidates = [raw];
  try {
    candidates.push(Buffer.from(raw, "base64").toString("utf8"));
  } catch {
    // no-op
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (!isRecord(parsed)) continue;
      if (typeof parsed.client_email !== "string" || typeof parsed.private_key !== "string") continue;
      return {
        projectId: typeof parsed.project_id === "string" ? parsed.project_id : undefined,
        clientEmail: parsed.client_email,
        privateKey: String(parsed.private_key).replace(/\\n/g, "\n"),
      };
    } catch {
      // no-op
    }
  }

  return null;
}

function ensureFirebaseAdminInitialized(projectId: string): void {
  if (adminInitialized) return;
  if (getApps().length === 0) {
    const serviceAccount = parseServiceAccountFromEnv();
    if (serviceAccount) {
      initializeApp({
        credential: cert(serviceAccount),
        projectId: serviceAccount.projectId || projectId,
      });
    } else {
      initializeApp({ projectId });
    }
  }
  adminInitialized = true;
}

function isWithinBurstLimit(uid: string): boolean {
  const now = Date.now();
  const startsAt = now - CHAT_RATE_WINDOW_MS;
  const current = chatRateWindow.get(uid) || [];
  const active = current.filter((entry) => entry >= startsAt);
  active.push(now);
  chatRateWindow.set(uid, active);
  return active.length <= CHAT_RATE_WINDOW_MAX;
}

function getChatModelCandidates(requestedModel: string): string[] {
  const requested = requestedModel.trim() || DEFAULT_CHAT_MODEL;
  const normalized = requested.toLowerCase();

  const dedupe = new Set<string>();
  const ordered = [];

  if (CHAT_MODEL_FALLBACKS.some((model) => model.toLowerCase() === normalized)) {
    ordered.push(requested);
    for (const candidate of CHAT_MODEL_FALLBACKS) {
      if (candidate.toLowerCase() !== normalized) {
        ordered.push(candidate);
      }
    }
  } else {
    ordered.push(...CHAT_MODEL_FALLBACKS);
  }

  for (const model of ordered) {
    dedupe.add(model);
  }
  dedupe.add("gemini-2.5-pro");
  return [...dedupe];
}

async function verifyFirebaseIdToken(idToken: string): Promise<VerifiedFirebaseUser | null> {
  try {
    const decoded = await getAuth().verifyIdToken(idToken);
    return { uid: decoded.uid, email: decoded.email };
  } catch {
    return null;
  }
}

async function requireAuthenticatedUser(req: express.Request): Promise<VerifiedFirebaseUser | null> {
  const token = getBearerToken(req.header("authorization"));
  if (!token) return null;
  return verifyFirebaseIdToken(token);
}

function stripInternalModelTerms(text: string): string {
  const blocked = [
    /confidence\s*score/gi,
    /edge\s*score/gi,
    /raw\s*rpc/gi,
    /payload\s*contract/gi,
    /sportsanswerstate/gi,
    /failurestate/gi,
    /auditevent/gi,
    /stack\s*trace/gi,
    /synthetic\s*odds/gi,
    /governance/gi,
    /grounding/gi,
    /internal\s*terms?/gi,
  ];
  let sanitized = text;
  for (const pattern of blocked) {
    sanitized = sanitized.replace(pattern, "");
  }
  return sanitized.trim() || "No publishable answer is available right now.";
}

function stripRawDebugUrls(text: string): string {
  let sanitized = text;
  sanitized = sanitized.replace(
    /\bhttps?:\/\/(?:site\.api\.espn\.com|localhost|127\.0\.0\.1)[^\s)\]]*/gi,
    "ESPN checked"
  );
  sanitized = sanitized.replace(/\bhttps?:\/\/[^\s)\]]*\/(?:api|mcp)[^\s)\]]*/gi, "Web checked");
  return sanitized;
}

function shouldReplaceWithMarketLineFallback(text: string): boolean {
  const sentenceLevelClaims = [
    /\bmoneyline\b[^.\n]*[+-]\d{2,4}/i,
    /\bspread\b[^.\n]*[+-]?\d+(?:\.\d+)?/i,
    /\b(total|over|under)\b[^.\n]*\d+(?:\.\d+)?/i,
    /\bodds?\b[^.\n]*[+-]\d{2,4}/i,
    /\bbookmaker\b/i,
  ];
  return sentenceLevelClaims.some((pattern) => pattern.test(text));
}

function sanitizeAllowedOutput(text: string, allowPartial: boolean): string {
  if (!text) return "";
  let sanitized = stripInternalModelTerms(text);
  sanitized = stripRawDebugUrls(sanitized);
  sanitized = sanitized.replace(/\s{2,}/g, " ").replace(/\n{3,}/g, "\n\n").trim();
  if (allowPartial && shouldReplaceWithMarketLineFallback(sanitized)) {
    return "ESPN checked. Market line not found yet.";
  }
  return sanitized;
}

function formatFooterTimestamp(isoTimestamp?: string): string {
  if (!isoTimestamp) return "";
  const parsed = Date.parse(isoTimestamp);
  if (Number.isNaN(parsed)) return "";
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
  }).format(parsed);
}

function buildSourceFooter(options: {
  espnChecked?: boolean;
  webChecked?: boolean;
  fetchedAt?: string;
}): string {
  const parts: string[] = [];
  if (options.espnChecked) parts.push("ESPN checked");
  if (options.webChecked) parts.push("Web checked");
  const timestamp = formatFooterTimestamp(options.fetchedAt || new Date().toISOString());
  if (timestamp) parts.push(timestamp);
  return parts.join(" · ");
}

function buildScoreStateEvidenceMessage(board: BoardEvent[]): string {
  const fresh = board.find((entry) => isSourceFresh(entry.source_evidence[0]));
  if (!fresh) return "";
  const source = fresh.source_evidence[0];
  return buildSourceFooter({ espnChecked: true, fetchedAt: source.fetched_at });
}

function isScreenshotOnlyInputLike(message: string, hasGroundingContext: boolean): boolean {
  const hasScreenshotSignals = detectScreenshotOnlyInput(message, hasGroundingContext);
  if (hasScreenshotSignals) return true;
  const lower = message.toLowerCase();
  return /\bscreenshot\b|\bimage\b|\bphoto\b/.test(lower) && !hasGroundingContext;
}

function mapToken(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((part) => part.length > 2 && !["the", "at", "vs", "v", "in", "of", "and", "for"].includes(part))
    .join(" ");
}

type MatchedSelection = { game: BoardEvent; isSpecific: boolean };

function normalizeGameText(message: string): string {
  return message.toLowerCase().replace(/[^a-z0-9\s@]/g, " ");
}

function isGeneralSlateQuery(message: string): boolean {
  return /\b(slate|board|today|tomorrow|tonight|yesterday|games?\s+today|games?\s+tomorrow|all games|who.?s on|schedule|any live games|what happened today)\b/i.test(message);
}

function detectCapabilityIntent(message: string): boolean {
  return /\b(what can you do|what do you do|how does this work|features|modes|help|explain baseline|what are you)\b/i.test(message);
}

function detectPitcherIntent(message: string): boolean {
  return /\b(pitcher|pitchers|probable pitcher|probable pitchers|starter|starters|mound|ace|arm|best pitcher)\b/i.test(message);
}

function detectSlateIntent(message: string): boolean {
  return /\b(what games are tomorrow|who plays tonight|what.?s on the slate|any live games|what happened today|games tomorrow|games today|today.?s slate|tomorrow.?s slate)\b/i.test(message);
}

function inferSlateSegment(message: string): "all" | "live" | "final" {
  if (/\b(any live games|live games|live now|in progress)\b/i.test(message)) return "live";
  if (/\b(what happened today|finals?|results?)\b/i.test(message)) return "final";
  return "all";
}

type DateIntent = {
  date: Date;
  relativeLabel: "today" | "tomorrow" | "tonight" | "yesterday" | "date";
  prettyLabel: string;
};

function startOfDay(date: Date): Date {
  const out = new Date(date);
  out.setHours(0, 0, 0, 0);
  return out;
}

function addDays(date: Date, days: number): Date {
  const out = new Date(date);
  out.setDate(out.getDate() + days);
  return out;
}

function toEspnDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

function toPrettyDateLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

function parseDateFromMessage(message: string, now = new Date()): DateIntent {
  const lowered = message.toLowerCase();
  const today = startOfDay(now);

  if (/\btomorrow\b/.test(lowered)) {
    const date = addDays(today, 1);
    return { date, relativeLabel: "tomorrow", prettyLabel: toPrettyDateLabel(date) };
  }
  if (/\byesterday\b/.test(lowered)) {
    const date = addDays(today, -1);
    return { date, relativeLabel: "yesterday", prettyLabel: toPrettyDateLabel(date) };
  }
  if (/\btonight\b/.test(lowered)) {
    return { date: today, relativeLabel: "tonight", prettyLabel: toPrettyDateLabel(today) };
  }
  if (/\btoday\b/.test(lowered)) {
    return { date: today, relativeLabel: "today", prettyLabel: toPrettyDateLabel(today) };
  }

  const iso = message.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (iso) {
    const parsed = new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    if (!Number.isNaN(parsed.getTime())) {
      return { date: startOfDay(parsed), relativeLabel: "date", prettyLabel: toPrettyDateLabel(parsed) };
    }
  }

  const usDate = message.match(/\b(\d{1,2})\/(\d{1,2})(?:\/(20\d{2}|\d{2}))?\b/);
  if (usDate) {
    const yearRaw = usDate[3];
    const year = yearRaw
      ? Number(yearRaw.length === 2 ? `20${yearRaw}` : yearRaw)
      : today.getFullYear();
    const parsed = new Date(year, Number(usDate[1]) - 1, Number(usDate[2]));
    if (!Number.isNaN(parsed.getTime())) {
      return { date: startOfDay(parsed), relativeLabel: "date", prettyLabel: toPrettyDateLabel(parsed) };
    }
  }

  return { date: today, relativeLabel: "today", prettyLabel: toPrettyDateLabel(today) };
}

type StarterEntry = {
  game: BoardEvent;
  side: "home" | "away";
  pitcher: string;
  record?: string;
  team: string;
};

function extractEra(record?: string): number | null {
  if (!record) return null;
  const match = record.match(/(\d+\.\d+)\s*ERA/i);
  if (!match) return null;
  const parsed = Number(match[1]);
  return Number.isFinite(parsed) ? parsed : null;
}

function collectListedStarters(board: BoardEvent[]): StarterEntry[] {
  const starters: StarterEntry[] = [];
  for (const game of board) {
    if (game.home_pitcher) {
      starters.push({
        game,
        side: "home",
        pitcher: game.home_pitcher,
        record: game.home_pitcher_record,
        team: game.home_team,
      });
    }
    if (game.away_pitcher) {
      starters.push({
        game,
        side: "away",
        pitcher: game.away_pitcher,
        record: game.away_pitcher_record,
        team: game.away_team,
      });
    }
  }
  return starters;
}

function rankStarters(starters: StarterEntry[]): StarterEntry[] {
  return [...starters].sort((a, b) => {
    const aEra = extractEra(a.record);
    const bEra = extractEra(b.record);
    if (aEra !== null && bEra !== null) return aEra - bEra;
    if (aEra !== null) return -1;
    if (bEra !== null) return 1;
    return a.pitcher.localeCompare(b.pitcher);
  });
}

function buildPitcherAnswerFromSlate(starters: StarterEntry[], dateIntent: DateIntent): string {
  if (starters.length === 0) {
    return "ESPN checked the slate. Probables are not posted yet.";
  }
  const ranked = rankStarters(starters);
  const top = ranked[0];
  const shortlist = ranked
    .slice(0, 6)
    .map((starter) => `${starter.pitcher} (${starter.team}${starter.record ? `, ${starter.record}` : ""})`)
    .join("; ");
  return [
    `ESPN checked ${dateIntent.relativeLabel === "date" ? dateIntent.prettyLabel : `the ${dateIntent.relativeLabel}`} slate.`,
    `Best listed starter: ${top.pitcher} (${top.team}${top.record ? `, ${top.record}` : ""}).`,
    "Based on listed probables only, not advanced form metrics.",
    shortlist ? `Top listed probables: ${shortlist}.` : "",
  ].filter(Boolean).join(" ");
}

function buildSlateAnswerFromBoard(board: BoardEvent[], message: string, dateIntent: DateIntent): string {
  const segment = inferSlateSegment(message);
  const filtered = segment === "live"
    ? board.filter((game) => game.status === "live")
    : segment === "final"
      ? board.filter((game) => game.status === "final")
      : board;

  if (filtered.length === 0) {
    if (segment === "live") {
      return `ESPN checked. No live games are listed for ${dateIntent.relativeLabel === "date" ? dateIntent.prettyLabel : dateIntent.relativeLabel} right now.`;
    }
    return `ESPN checked. No games are listed for ${dateIntent.relativeLabel === "date" ? dateIntent.prettyLabel : dateIntent.relativeLabel} yet.`;
  }

  const lines = filtered.slice(0, 12).map((game) => {
    const statusLabel = game.status === "live"
      ? game.score || "Live"
      : game.status === "final"
        ? game.score || "Final"
        : new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(game.date));
    return `${game.away_team} at ${game.home_team} (${statusLabel})`;
  });
  return `ESPN checked ${dateIntent.relativeLabel === "date" ? dateIntent.prettyLabel : dateIntent.relativeLabel} slate: ${lines.join("; ")}.`;
}

function selectEspnGameForMessage(message: string, board: BoardEvent[]): MatchedSelection | null {
  const normalizedMessage = normalizeGameText(message);
  const hasGeneralSlateSignal = isGeneralSlateQuery(message);

  const explicitId = normalizedMessage.match(/\b(?:id|game[_\s-]*id)?\s*[:#]?\s*(\d{4,12})\b/);
  if (explicitId) {
    const expected = explicitId[1];
    const exact = board.find((game) => String(game.event_id) === expected || String(game.id) === expected);
    if (exact) return { game: exact, isSpecific: true };
  }

  let best: { game: BoardEvent; score: number; hasBoth: boolean } | null = null;

  for (const game of board) {
    const homeTokens = mapToken(game.home_team || "");
    const awayTokens = mapToken(game.away_team || "");
    const homeScore = homeTokens
      .split(" ")
      .filter((token) => token && normalizedMessage.includes(token)).length;
    const awayScore = awayTokens
      .split(" ")
      .filter((token) => token && normalizedMessage.includes(token)).length;
    const hasBoth = homeScore > 0 && awayScore > 0;

    const score = homeScore + awayScore +
      (/\b(vs|versus|@|read\s+on|matchup|game)\b/.test(normalizedMessage) ? 2 : 0) +
      (/event|game|vs|read on|matchup/.test(normalizedMessage) ? 1 : 0);

    if (!best || score > best.score) {
      best = { game, score, hasBoth };
    }
  }

  if (!best || best.score === 0) return null;
  if (hasGeneralSlateSignal) return { game: best.game, isSpecific: false };
  if (best.hasBoth) return { game: best.game, isSpecific: true };
  return { game: best.game, isSpecific: best.score >= 3 };
}

function collectLocalEvidence(oddsData: unknown): SourceEvidence[] {
  if (!Array.isArray(oddsData)) return [];
  const out: SourceEvidence[] = [];
  for (const row of oddsData) {
    if (!isRecord(row)) continue;
    const sourceUrl = row.source_url;
    const fetchedAt = row.fetched_at;
    const sourceType = row.source_type;
    if (typeof sourceUrl !== "string" || typeof fetchedAt !== "string") continue;
    if (typeof sourceType !== "string") continue;
    if (!isPublicNonInternalUrl(sourceUrl)) continue;
    out.push(buildSourceEvidence(sourceUrl, "local_slate", fetchedAt));
  }
  return out;
}

function buildScoreState(event: NormalizedEspnScoreboardEvent): MarketDataStatus {
  const hasBookmakers = Array.isArray(event.bookmakers) && event.bookmakers.length > 0;
  const validBookmakers = validateNoSyntheticOdds(event as { bookmakers?: Array<{ key?: unknown; title?: unknown }> });
  if (hasBookmakers && validBookmakers) {
    return { state: "grounded", code: "ESPN_GROUNDED", message: "ESPN-checked odds attached." };
  }
  if (hasBookmakers && !validBookmakers) {
    return {
      state: "partial",
      code: "ODDS_UNAVAILABLE_BUT_GAME_GROUNDED",
      message: "ESPN checked. Market line not found yet.",
      allowed_output: "score/state/simple pace only",
    };
  }
  return ODDS_UNAVAILABLE_PARTIAL;
}

function buildBoardEvent(rawEvent: unknown, fetchedAt: string): BoardEvent | null {
  const normalized = normalizeEspnScoreboardEvent(rawEvent, fetchedAt);
  if (!validateRequiredEspnGroundingFields(normalized)) return null;

  const marketDataStatus = buildScoreState(normalized);
  if (marketDataStatus.state === "failed") return null;

  const sourceEvidence = buildSourceEvidence(
    normalized.source_url || ESPN_SCOREBOARD_URL,
    "espn",
    normalized.fetched_at || fetchedAt
  );
  const bookmakers = marketDataStatus.state === "grounded" && validateNoSyntheticOdds(normalized)
    ? normalized.bookmakers
    : [];

  return {
    ...normalized,
    id: normalized.id || normalized.event_id,
    sport_key: "baseball_mlb",
    sport_title: normalized.league || "MLB",
    commence_time: normalized.date || normalized.fetched_at || fetchedAt,
    source_evidence: [sourceEvidence],
    bookmakers,
    market_data_status: {
      ...marketDataStatus,
      allowed_output: marketDataStatus.state === "grounded" ? marketDataStatus.allowed_output : ODDS_UNAVAILABLE_PARTIAL.allowed_output,
    },
    venue: normalized.venue,
  };
}

function getSystemInstruction(
  message: string,
  selectedGame: BoardEvent | null,
  boardForContext: BoardEvent[],
  sportsSourceEvidence: SourceEvidence[],
  requestScope: "game_level" | "general",
  mode?: string | null
): string {
  const evidence = sportsSourceEvidence[0];
  const evidenceLine = evidence
    ? `ESPN checked source freshness: ${evidence.freshness_status} at ${evidence.fetched_at}`
    : "ESPN checked source: not available";
  const allowedMarketLine = selectedGame?.market_data_status?.state === "partial"
    ? "If this game has no listed line, say: ESPN checked. Market line not found yet."
    : "Market context may include moneyline/spread/total only when attached from ESPN.";
  const boardLine = boardForContext
    .slice(0, requestScope === "game_level" ? Math.min(6, boardForContext.length) : boardForContext.length)
    .map((entry) => ({
      event_id: entry.event_id,
      home_team: entry.home_team,
      away_team: entry.away_team,
      status: entry.status,
      market_state: entry.market_data_status.state,
      fetched_at: entry.fetched_at,
      home_pitcher: entry.home_pitcher,
      away_pitcher: entry.away_pitcher,
      home_pitcher_record: entry.home_pitcher_record,
      away_pitcher_record: entry.away_pitcher_record,
    }));

  const selected = selectedGame
    ? {
      event_id: selectedGame.event_id,
      league: selectedGame.league,
      date: selectedGame.date,
      home_team: selectedGame.home_team,
      away_team: selectedGame.away_team,
      status: selectedGame.status,
      inning: selectedGame.inning,
      inning_half: selectedGame.inning_half,
      fetched_at: selectedGame.fetched_at,
      market_data_status: selectedGame.market_data_status,
      home_pitcher: selectedGame.home_pitcher,
      away_pitcher: selectedGame.away_pitcher,
      home_pitcher_record: selectedGame.home_pitcher_record,
      away_pitcher_record: selectedGame.away_pitcher_record,
    }
    : null;

  return `
You are Baseline, an institutional sports assistant.
Hard policy:
1. ESPN checked context anchors game facts.
2. Grounded web search expands missing context for pitcher/stat/injury/preview/slate questions.
3. Missing secondary context is not a refusal condition.
4. Never invent odds, bookmaker names, or line movement.
5. If a game is grounded but line data is missing, say: "ESPN checked. Market line not found yet."
6. If probables are missing after search, say: "ESPN checked the slate. Probables are not posted yet."
7. Never claim you lack access to future schedules if ESPN slate lookup/search can be used.
8. Never print raw API endpoint URLs in user-facing answer text.
9. Do not expose internal terms (payload, grounding, synthetic odds, rpc, stack trace, source failure).
10. PASS is a betting decision term only, never a data-unavailable state.

User request scope: ${requestScope}
Requested mode: ${mode || "auto"}

ESPN source evidence:
${JSON.stringify(evidenceLine)}

Grounded board context:
${JSON.stringify(boardLine)}

Selected game context:
${selected ? JSON.stringify(selected) : "None"}

User input:
${message}

${allowedMarketLine}
`;
}

function mapModelResponseText(response: unknown): string {
  if (!response || typeof response !== "object") return "";
  const candidateText = (response as { text?: unknown }).text;
  if (typeof candidateText === "string") return candidateText;

  const generated = (response as { candidates?: Array<{ content?: { parts?: Array<{ text?: unknown }> } }> });
  if (Array.isArray(generated?.candidates)) {
    return generated.candidates
      .flatMap((candidate) => candidate?.content?.parts || [])
      .map((part) => (typeof part?.text === "string" ? part.text : ""))
      .join(" ")
      .trim();
  }

  const output = (response as { output?: Array<{ parts?: Array<{ text?: string }> }> });
  if (Array.isArray(output?.output)) {
    return output.output
      .flatMap((item) => item?.parts || [])
      .map((part) => part.text)
      .filter((part): part is string => typeof part === "string")
      .join(" ");
  }
  return "";
}

function looksLikeOverconstrainedRefusal(text: string): boolean {
  const blockedPhrases = [
    "i do not have access to future schedules",
    "i cannot determine from available game-level information",
    "the provided context does not include",
    "please specify which game",
  ];
  const lowered = text.toLowerCase();
  return blockedPhrases.some((phrase) => lowered.includes(phrase));
}

async function requestAiResponse(
  modelCandidates: string[],
  aiRequest: {
    message: string;
    history: { role: "user" | "model"; text: string }[];
    boardForContext: BoardEvent[];
    sportsSourceEvidence: SourceEvidence[];
    selectedGame: BoardEvent | null;
    scope: "game_level" | "general";
    mode?: string | null;
    allowPartial: boolean;
  }
): Promise<string> {
  const { message, history, selectedGame, boardForContext, sportsSourceEvidence, scope, mode, allowPartial } = aiRequest;
  const systemInstruction = getSystemInstruction(
    message,
    selectedGame,
    boardForContext,
    sportsSourceEvidence,
    scope,
    mode
  );

  const ai = process.env.GEMINI_API_KEY
    ? new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })
    : new GoogleGenAI({
        vertexai: true,
        project: process.env.GOOGLE_CLOUD_PROJECT || process.env.FIREBASE_PROJECT_ID || "gen-lang-client-0281999829",
        location: process.env.GOOGLE_CLOUD_LOCATION || "us-central1",
      });

  const messages = [
    ...history.map((entry) => ({
      role: entry.role,
      parts: [{ text: entry.text }],
    })),
    { role: "user", parts: [{ text: message }] },
  ];

  let response: unknown;
  let lastError: unknown = null;

  for (const candidate of modelCandidates) {
    try {
      const generate = ai.models.generateContent({
        model: candidate,
        contents: messages,
        config: {
          systemInstruction,
          tools: [{ googleSearch: {} }],
          temperature: 0.1,
        },
      });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Chat generation timed out")), CHAT_MODEL_TIMEOUT_MS)
      );
      response = await Promise.race([generate, timeout]);
      break;
    } catch (error: unknown) {
      lastError = error;
      if (isModelNotFoundError(error)) {
        continue;
      }
      throw error;
    }
  }

  if (!response) {
    throw lastError || new Error("No model response");
  }

  const candidateText = mapModelResponseText(response);
  if (!candidateText) {
    throw new Error("Model returned an empty response.");
  }
  return sanitizeAllowedOutput(candidateText, allowPartial);
}

function failPayload(
  res: express.Response,
  code: FailureState["code"],
  message: string,
  sourceEvidence: SourceEvidence[] = [],
  allowedOutput?: string
) {
  const failure = buildFailureState(code, message, { source_evidence: sourceEvidence, allowed_output: allowedOutput });
  return res.status(422).json({ error: failure.message, failure_state: failure });
}

async function fetchEspnBoard(targetDate?: Date): Promise<{ board: BoardEvent[]; evidence: SourceEvidence[]; fetchedAt: string }> {
  const fetchedAt = new Date().toISOString();
  const response = await axios.get(ESPN_SCOREBOARD_URL, {
    timeout: 10_000,
    params: targetDate ? { dates: toEspnDateParam(targetDate) } : undefined,
  });
  const events = Array.isArray(response.data?.events) ? response.data.events : [];
  const board = events
    .map((event) => buildBoardEvent(event, fetchedAt))
    .filter((entry): entry is BoardEvent => Boolean(entry));

  const evidence = [buildSourceEvidence(ESPN_SCOREBOARD_URL, "espn", fetchedAt)];
  return { board, evidence, fetchedAt };
}

function buildPayloadForGeneral(
  message: string,
  evidence: SourceEvidence[]
): PayloadContract {
  const payload = {
    canonical_url: ESPN_SCOREBOARD_HOME,
    request_text: message,
    request_scope: "general" as const,
    source_evidence: evidence,
    generated_at: new Date().toISOString(),
  };
  return payload;
}

function buildPayloadForGame(
  message: string,
  selectedGame: BoardEvent,
  evidence: SourceEvidence[]
): PayloadContract {
  const grounding: EspnGameGrounding = {
    event_id: selectedGame.event_id,
    league: selectedGame.league,
    date: selectedGame.date,
    home_team: selectedGame.home_team,
    away_team: selectedGame.away_team,
    status: selectedGame.status,
    fetched_at: selectedGame.fetched_at,
    source_url: selectedGame.source_url,
    inning: selectedGame.inning,
    inning_half: selectedGame.inning_half,
  };

  return {
    canonical_url: selectedGame.source_url || ESPN_SCOREBOARD_HOME,
    request_text: message,
    request_scope: "game_level",
    espn_grounding: grounding,
    source_evidence: evidence,
    generated_at: new Date().toISOString(),
  };
}

function normalizeMarketEvidenceText(board: BoardEvent[]): string {
  const primary = board[0];
  if (!primary) return "";
  const at = primary.market_data_status.state === "partial" ? "ESPN checked. Market line not found yet." : "";
  return at ? `${at} ` : "";
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || "3000", 10);
  const firebaseProjectId =
    process.env.FIREBASE_PROJECT_ID ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    "gen-lang-client-0281999829";
  ensureFirebaseAdminInitialized(firebaseProjectId);

  const allowedOrigins = new Set<string>([
    "https://baseline-mlb-xqs7h463qa-uc.a.run.app",
    "https://baseline-mlb-70323048967.us-central1.run.app",
    "http://localhost:5000",
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5000",
  ]);

  if (process.env.APP_URL) {
    try {
      allowedOrigins.add(new URL(process.env.APP_URL).origin);
    } catch {
      // no-op
    }
  }

  app.use((req, res, next) => {
    const origin = req.header("origin");
    if (origin && allowedOrigins.has(origin)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header("Vary", "Origin");
      res.header("Access-Control-Allow-Credentials", "true");
      res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
      res.header("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    }
    if (req.method === "OPTIONS") return res.sendStatus(204);
    next();
  });

  app.use(express.json({ limit: "1mb" }));

  const paymentIntentRequestSchema = z.object({
    amount: z.number().finite().min(MIN_PAYMENT_AMOUNT_USD).max(MAX_PAYMENT_AMOUNT_USD),
  });

  const chatRequestSchema = z.object({
    message: z.string().trim().min(1).max(MAX_CHAT_MESSAGE_CHARS),
    history: z
      .array(
        z.object({
          role: z.enum(["user", "model"]),
          text: z.string().trim().max(MAX_CHAT_HISTORY_ITEM_CHARS),
        })
      )
      .max(MAX_CHAT_HISTORY_ITEMS)
      .optional(),
    oddsData: z.unknown().optional(),
    mode: z.enum(["live", "stats", "trends"]).nullable().optional(),
    input_sources: z.array(z.enum(["text", "screenshot", "local_slate"])).optional(),
    canonical_url: z.string().url().optional(),
  });

  const mcpServer = new McpServer({
    name: "baseline-mlb",
    version: "1.0.0",
  });
  const mcpTransports = new Map<string, SSEServerTransport>();

  // 1. Stripe Checkout / Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const authUser = await requireAuthenticatedUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const parsed = paymentIntentRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid payment request" });
      }

      const { amount } = parsed.data;
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      if (!stripeSecret) {
        return res.status(500).json({ error: "Stripe secret key not configured" });
      }

      const stripe = new Stripe(stripeSecret);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100),
        currency: "usd",
        automatic_payment_methods: { enabled: true },
        metadata: { firebase_uid: authUser.uid },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: unknown) {
      console.error("Payment Intent Error:", error);
      const message = error instanceof Error ? error.message : "Unknown payment error";
      res.status(500).json({ error: message });
    }
  });

  // 2. Fetch Odds Proxy (ESPN only)
  app.get("/api/odds", async (_req, res) => {
    try {
      const { board } = await fetchEspnBoard();
      res.json(board);
    } catch (error: unknown) {
      console.error("Odds Fetch Error:", error);
      const message = error instanceof Error ? error.message : "Unknown odds fetch error";
      res.status(500).json({ error: message });
    }
  });

  // 3. Chat Endpoint for Gemini (ESPN-first)
  app.post("/api/chat", async (req, res) => {
    const auditLog: Array<ReturnType<typeof buildAuditEvent>> = [];

    try {
      const authUser = await requireAuthenticatedUser(req);
      if (!authUser) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const parsed = chatRequestSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid chat payload" });
      }

      if (!isWithinBurstLimit(authUser.uid)) {
        return res.status(429).json({ error: "Too many chat requests. Please slow down." });
      }

    const { message, history = [], oddsData, mode, input_sources, canonical_url } = parsed.data;
    const normalizedHistory = history.slice(-MAX_CHAT_HISTORY_ITEMS).map((entry) => ({
      role: entry.role,
      text: entry.text,
    }));

      const isGameLevelRequest = isGameLevelSportsRequest(message);
      const hasLocalSlateContext = Array.isArray(oddsData) && oddsData.length > 0;
      const hasScreenshotSourceHint = Array.isArray(input_sources) && input_sources.includes("screenshot");
      const isScreenshotOnly = isScreenshotOnlyInputLike(message, hasLocalSlateContext || hasScreenshotSourceHint);
      const shouldRefreshEsnp = isGameLevelRequest || isGeneralSlateQuery(message);

      let board: BoardEvent[] = [];
      let sportsSourceEvidence: SourceEvidence[] = [];
      let selectedGame: BoardEvent | null = null;
      let payloadContract: PayloadContract | null = null;

      if (shouldRefreshEsnp) {
        let espnFetch: { board: BoardEvent[]; evidence: SourceEvidence[]; fetchedAt: string };
        try {
          espnFetch = await fetchEspnBoard();
          board = espnFetch.board;
          sportsSourceEvidence = espnFetch.evidence;
          const primaryEvidence = buildSourceEvidence(
            ESPN_SCOREBOARD_URL,
            "espn",
            espnFetch.fetchedAt
          );
          sportsSourceEvidence.push(primaryEvidence);
          auditLog.push(
            buildAuditEvent("espn_board_fetch", "allow", {
              events: String(board.length),
              fetched_at: espnFetch.fetchedAt,
            })
          );
        } catch (error: unknown) {
          if (isScreenshotOnly) {
            return failPayload(
              res,
              "SCREENSHOT_ONLY_INPUT_BLOCKED",
              "I can only answer screenshot-based game requests after ESPN grounding succeeds in-session.",
              sportsSourceEvidence
            );
          }
          return failPayload(
            res,
            "ESPN_SOURCE_FAILURE",
            "Could not refresh ESPN grounding for this request. Please retry in a moment.",
            sportsSourceEvidence
          );
        }

        if (board.length === 0 && isGameLevelRequest) {
          return failPayload(
            res,
            "ESPN_GROUNDING_REQUIRED",
            "ESPN returned no active slate at this time.",
            sportsSourceEvidence
          );
        }

        const stale = sportsSourceEvidence.find((entry) => isSourceStale(entry));
        if (isGameLevelRequest && stale) {
          return failPayload(
            res,
            "ESPN_SOURCE_STALE",
            "ESPN grounding is stale. Refreshing again may be needed before answering.",
            sportsSourceEvidence
          );
        }

        if (isGameLevelRequest) {
          const selection = selectEspnGameForMessage(message, board);
          if (selection && selection.isSpecific) {
            selectedGame = selection.game;
            if (!validateRequiredEspnGroundingFields(selectedGame)) {
              return failPayload(
                res,
                "ESPN_GROUNDING_INVALID",
                "ESPN grounding could not be validated for that game.",
                sportsSourceEvidence
              );
            }

            if (!isGroundingFresh(selectedGame, Date.now())) {
              return failPayload(
                res,
                "ESPN_SOURCE_STALE",
                "ESPN grounding is stale. Please retry after refresh.",
                sportsSourceEvidence
              );
            }

            const localEvidence = collectLocalEvidence(oddsData);
            if (localEvidence.length) {
              sportsSourceEvidence.push(...localEvidence);
            }
            if (selectedGame.market_data_status.state === "failed") {
              return failPayload(
                res,
                "ESPN_SOURCE_FAILURE",
                "ESPN grounding has failed. Cannot produce market-anchored answer.",
                sportsSourceEvidence
              );
            }

            const payloadCheck = buildPayloadForGame(message, selectedGame, sportsSourceEvidence);
            payloadContract = payloadCheck;
          } else {
            auditLog.push(
              buildAuditEvent("game_scope_fallback_to_grounded_search", "allow", {
                reason: selection ? "ambiguous_game_match" : "no_specific_game_match",
              })
            );
            const payloadCheck = buildPayloadForGeneral(message, sportsSourceEvidence);
            payloadContract = payloadCheck as unknown as PayloadContract;
          }
        } else {
          const payloadCheck = buildPayloadForGeneral(message, sportsSourceEvidence);
          payloadContract = payloadCheck as unknown as PayloadContract;
        }
      } else {
        const localEvidence = collectLocalEvidence(oddsData);
        if (localEvidence.length) sportsSourceEvidence.push(...localEvidence);
      }

      const requestedModel = process.env.GEMINI_MODEL || DEFAULT_CHAT_MODEL;
      const candidates = getChatModelCandidates(requestedModel);
      const allowPartial = !!selectedGame && selectedGame.market_data_status.state === "partial";

      const responseText = await requestAiResponse(candidates, {
        message,
        history: normalizedHistory,
        boardForContext: board,
        sportsSourceEvidence: sportsSourceEvidence,
        selectedGame,
        scope: isGameLevelRequest ? "game_level" : "general",
        mode,
        allowPartial,
      });

      const evidenceLine = buildScoreStateEvidenceMessage(board);
      let finalText = responseText ? `${responseText}` : "No publishable answer is available right now.";

      if (allowPartial && !isScoreOnlyOutputContext(finalText)) {
        finalText = sanitizeScoreOnlyOutput(finalText);
      }
      if (evidenceLine) {
        finalText = `${finalText}\n\n${evidenceLine}`.trim();
      }

      if (isAllowedPassOutput(finalText) || /PASS\s*-\s*data unavailable/i.test(finalText)) {
        return failPayload(
          res,
          "PASS_MISUSED_FOR_DATA_UNAVAILABLE",
          "PASS is a betting-decision state only. Grounding status now validates data availability.",
          sportsSourceEvidence
        );
      }

      if (selectedGame && payloadContract) {
        const contractCheck = PayloadContractSchema.safeParse(payloadContract);
        if (!contractCheck.success) {
          return failPayload(res, "ESPN_GROUNDING_INVALID", "Payload contract validation failed.", sportsSourceEvidence);
        }
        payloadContract = contractCheck.data as PayloadContract;
      }

      const payloadEvidence = sportsSourceEvidence.length ? sportsSourceEvidence : [buildSourceEvidence(ESPN_SCOREBOARD_HOME, "espn", new Date().toISOString())];
      const stateCheck = SportsAnswerStateSchema.safeParse({
        state: "ready",
        answer_text: finalText,
        payload:
          payloadContract ??
          ({
            canonical_url: canonical_url || ESPN_SCOREBOARD_HOME,
            request_text: message,
            request_scope: "general",
            source_evidence: payloadEvidence,
            generated_at: new Date().toISOString(),
          } as PayloadContract),
        source_evidence: payloadEvidence,
        audit: auditLog,
      });
      if (!stateCheck.success) {
        return failPayload(
          res,
          "ESPN_GROUNDING_INVALID",
          "Prepared output did not pass governance validation.",
          payloadEvidence
        );
      }

      res.json({
        text: finalText,
        source_evidence: payloadEvidence,
        payload_contract: payloadContract,
        audit: auditLog,
      });
    } catch (error: unknown) {
      console.error("Baseline Chat Error:", error);
      const message = error instanceof Error ? error.message : "Chat request failed.";
      const upstreamCode = extractUpstreamErrorCode(error);
      const upstreamStatus = extractUpstreamStatus(error);
      if (message.includes("timed out")) return res.status(504).json({ error: "Chat model timed out. Please retry." });
      if (upstreamStatus === 401 || upstreamCode === "401") {
        return res.status(503).json({ error: "Authentication to the model service failed. Please retry shortly." });
      }
      if (upstreamStatus === 403 || upstreamCode === "403" || upstreamCode === "PERMISSION_DENIED" || message.includes("SERVICE_DISABLED")) {
        return res.status(503).json({ error: "Enable Vertex AI and required services for Gemini." });
      }
      if (upstreamStatus === 429 || upstreamCode === "429") {
        return res.status(503).json({ error: "Model service is rate-limited right now. Please retry shortly." });
      }
      if (upstreamCode === "NOT_FOUND" || upstreamStatus === 404 || message.includes("not found or your project does not have access")) {
        return res.status(503).json({ error: "Configured Gemini model is not available." });
      }
      return res.status(500).json({ error: message || "Chat request failed." });
    }
  });

  // 4. SSE Stream for live board
  app.get("/api/stream/odds", async (req, res) => {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    let isClosed = false;
    req.on("close", () => {
      isClosed = true;
    });

    const sendOdds = async () => {
      if (isClosed) return;
      try {
        const data = await fetchEspnBoard();
        res.write(`data: ${JSON.stringify(data.board)}\n\n`);

        let nextInterval = 60_000;
        let hasLive = false;
        let hasUpcoming = false;
        for (const game of data.board) {
          if (game.status === "live") {
            hasLive = true;
            break;
          }
          if (game.status === "upcoming") {
            hasUpcoming = true;
          }
        }

        if (hasLive) {
          nextInterval = 5_000;
        } else if (hasUpcoming) {
          nextInterval = 15_000;
        }
        setTimeout(sendOdds, nextInterval);
      } catch (error: unknown) {
        console.error("SSE Error:", error);
        setTimeout(sendOdds, 15_000);
      }
    };

    sendOdds();
  });

  // MCP GET Endpoint for SSE
  app.get("/mcp", async (_req, res) => {
    const transport = new SSEServerTransport("/mcp/messages", res);
    const sessionId = (transport as unknown as { sessionId?: string }).sessionId;
    if (!sessionId) {
      res.status(500).send("Unable to initialize MCP session");
      return;
    }
    mcpTransports.set(sessionId, transport);
    res.on("close", () => {
      mcpTransports.delete(sessionId);
    });
    await mcpServer.connect(transport);
  });

  // MCP POST Endpoint for messages
  app.post("/mcp/messages", async (req, res) => {
    const sessionIdRaw = req.query.sessionId;
    const sessionId = typeof sessionIdRaw === "string" ? sessionIdRaw : undefined;
    if (!sessionId) {
      return res.status(400).send("Missing sessionId");
    }

    const transport = mcpTransports.get(sessionId);
    if (!transport) {
      return res.status(404).send("Session not found");
    }
    await transport.handlePostMessage(req, res);
  });

  mcpServer.tool(
    "get_slate",
    "Returns today's games",
    { date: z.string().optional().describe("Date in YYYY-MM-DD") },
    async ({ date }) => {
      const slate = await (async () => (await fetchEspnBoard()).board)();
      return {
        content: [
          {
            type: "text",
            text: `Slate for ${date || "today"}: ` + JSON.stringify(slate),
          },
        ],
      };
    }
  );

  mcpServer.tool(
    "get_game",
    "Returns specific game state and odds",
    { game_id: z.string() },
    async ({ game_id }) => {
      const slate = await (async () => (await fetchEspnBoard()).board)();
      const game = slate.find((entry) => entry.id === game_id || entry.event_id === game_id);
      return {
        content: [
          {
            type: "text",
            text: game ? JSON.stringify(game) : "Game not found",
          },
        ],
      };
    }
  );

  mcpServer.tool(
    "get_team_record",
    "Returns team current record",
    { team_abbr: z.string() },
    async ({ team_abbr }) => {
      return {
        content: [
          {
            type: "text",
            text: `Record for ${team_abbr} is currently not available via this tool.`,
          },
        ],
      };
    }
  );

  mcpServer.tool(
    "get_pitcher_matchup",
    "Returns matchup analysis",
    { home_pitcher: z.string(), away_pitcher: z.string() },
    async ({ home_pitcher, away_pitcher }) => {
      return {
        content: [
          {
            type: "text",
            text: `Matchup analysis between ${home_pitcher} and ${away_pitcher} is pending.`,
          },
        ],
      };
    }
  );

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Baseline Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});

/**
 * ARCHITECTURAL PRINCIPLES
 * 
 * - The web is the database. Gemini reads the web. We don't duplicate.
 * - credentialdb stores ONLY user-specific data (accounts, auth, bet history, preferences, personal analytics).
 * - credentialdb NEVER stores cached public sports data, ingested odds/scores, ESPN normalized schemas, or public web data.
 * - Features combining both ground public data at request time and join with user data.
 */

import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import Stripe from "stripe";
import axios from "axios";
import crypto from "crypto";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";
import { getCanonicalTeam, getTeamByEspnId, getTeamByKalshiTicker } from "./src/services/mappingService.ts";
import { getStadiumWeather } from "./src/services/weatherService.ts";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple Memory Cache for Weather Vectors
const weatherCache = new Map<string, { data: any, timestamp: number }>();
const WEATHER_TTL = 10 * 60 * 1000; // 10 minutes

// Cache for ESPN Core API Odds
const espnCoreOddsCache = new Map<string, { data: any, timestamp: number, status: string }>();

// Cache for ESPN Summary
const espnSummaryCache = new Map<string, { data: any, timestamp: number }>();
const SUMMARY_TTL = 30000; // 30 seconds

// Cache for Kalshi
let kalshiCache: { data: any[], timestamp: number } = { data: [], timestamp: 0 };
const KALSHI_TTL = 45000; // 45 seconds

const modelName = "gemini-1.5-pro";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  console.log("Checking API Keys...");
  console.log("GEMINI_API_KEY:", process.env.GEMINI_API_KEY ? "Present" : "Missing");

  // MCP Server Setup
  const mcpServer = new McpServer({
    name: "baseline-mlb",
    version: "1.0.0"
  });

  // Transport state
  let transport: SSEServerTransport | null = null;


  // API Routes
  
  // 0. AI Status Check (Env only)
  app.get("/api/ai-status", (req, res) => {
    res.json({ 
      status: "ok", 
      configured: !!process.env.GEMINI_API_KEY 
    });
  });

  // 1. Stripe Checkout / Payment Intent
  app.post("/api/create-payment-intent", async (req, res) => {
    try {
      const { amount } = req.body;
      const stripeSecret = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeSecret) {
        return res.status(500).json({ error: "Stripe secret key not configured" });
      }

      const stripe = new Stripe(stripeSecret);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // convert to cents
        currency: "usd",
        automatic_payment_methods: { enabled: true },
      });

      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Helper to fetch live odds
  const getLiveOdds = async (sport = 'upcoming', regions = 'us', markets = 'h2h') => {
    const kalshiKeyId = process.env.KALSHI_API_KEY_ID;
    let kalshiPrivateKey = process.env.KALSHI_PRIVATE_KEY;
    let kalshiMarkets: any[] = [];
    
    if (kalshiKeyId && kalshiPrivateKey) {
      const now = Date.now();
      if (now - kalshiCache.timestamp < KALSHI_TTL) {
        kalshiMarkets = kalshiCache.data;
      } else {
        if (!kalshiPrivateKey.includes('\n')) {
            let internal = kalshiPrivateKey.replace('-----BEGIN RSA PRIVATE KEY-----', '').replace('-----END RSA PRIVATE KEY-----', '');
            internal = internal.replace(/ /g, '\n');
            kalshiPrivateKey = '-----BEGIN RSA PRIVATE KEY-----\n' + internal.trim() + '\n-----END RSA PRIVATE KEY-----';
        }

        try {
          const method = 'GET';
          const path = '/trade-api/v2/markets?series_ticker=KXMLBGAME&limit=100&status=open';
          const timestamp = Date.now().toString();
          const msg = timestamp + method + path;

          const sign = crypto.createSign('RSA-SHA256');
          sign.update(msg);
          sign.end();
          
          const signature = sign.sign({
            key: kalshiPrivateKey,
            padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
            saltLength: 32
          }, 'base64');

          const res = await axios.get('https://api.elections.kalshi.com' + path + '&_=' + Date.now(), {
            headers: {
              'KALSHI-ACCESS-KEY': kalshiKeyId,
              'KALSHI-ACCESS-SIGNATURE': signature,
              'KALSHI-ACCESS-TIMESTAMP': timestamp,
            },
            timeout: 5000
          });

          kalshiMarkets = res.data.markets || [];
          kalshiCache = { data: kalshiMarkets, timestamp: Date.now() };
        } catch (e: any) {
          console.error("Kalshi fetch error:", e.message);
          kalshiMarkets = kalshiCache.data; // use stale on error
        }
      }
    }

    // Fetch from ESPN live scoreboard data
    try {
        // Fetch Past, Present, Future
        const dates = [
          new Date(Date.now() - 86400000).toISOString().split('T')[0].replace(/-/g, ''), // Yesterday
          new Date().toISOString().split('T')[0].replace(/-/g, ''), // Today
          new Date(Date.now() + 86400000).toISOString().split('T')[0].replace(/-/g, ''), // Tomorrow
          new Date(Date.now() + 172800000).toISOString().split('T')[0].replace(/-/g, '') // Day After
        ];
        
        const responses = await Promise.allSettled([
          ...dates.map(date => axios.get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${date}&_=${Date.now()}`, { timeout: 5000 })),
          axios.get(`https://statsapi.mlb.com/api/v1/teams?sportId=1&hydrate=teamStats(group=[pitching])&_=${Date.now()}`, { timeout: 5000 })
        ]);
        
        let mlbStatsMap: Record<string, any> = {};
        const mlbRes = responses.pop() as any;
        if (mlbRes && mlbRes.status === 'fulfilled' && mlbRes.value?.data?.teams) {
          mlbRes.value.data.teams.forEach((t: any) => {
            const era = t.teamStats?.find((ts: any) => ts.group?.displayName?.toLowerCase() === 'pitching')?.splits?.[0]?.stat?.era;
            if (t.abbreviation && era) {
               mlbStatsMap[t.abbreviation] = parseFloat(era);
            }
          });
        }

        const allEvents = responses
          .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
          .flatMap(res => res.value.data.events || []);
        
        const seen = new Set();
        const formattedPromises = allEvents.filter(e => {
          if (seen.has(e.id)) return false;
          seen.add(e.id);
          return true;
        }).map(async (event: any) => {
          const comp = event.competitions[0];
          const homeTeamObj = comp.competitors.find((c: any) => c.homeAway === "home");
          const awayTeamObj = comp.competitors.find((c: any) => c.homeAway === "away");
          
          // Technical Normalization: Canonical ID Resolution
          const homeCanonical = getTeamByEspnId(String(homeTeamObj?.team?.id));
          const awayCanonical = getTeamByEspnId(String(awayTeamObj?.team?.id));
          
          // Stadium Weather Analysis
          let weatherVector = null;
          if (homeCanonical) {
            const cacheKey = homeCanonical.id;
            const cached = weatherCache.get(cacheKey);
            if (cached && (Date.now() - cached.timestamp < WEATHER_TTL)) {
              weatherVector = cached.data;
            } else {
              // Async background fetch to prevent blocking the first request
              // Subsequent requests will get the cached value
              getStadiumWeather(homeCanonical.abbreviation).then(vector => {
                if (vector) weatherCache.set(cacheKey, { data: vector, timestamp: Date.now() });
              });
              // If it's a first hit, we might not have it yet, which is fine for the 24hr MVP latency
            }
            if (cached) weatherVector = cached.data;
          }

          const homeTeam = homeCanonical?.fullName || homeTeamObj?.team.displayName || "Unknown";
          const awayTeam = awayCanonical?.fullName || awayTeamObj?.team.displayName || "Unknown";
          const homeAbbr = homeCanonical?.abbreviation || homeTeamObj?.team.abbreviation;
          const awayAbbr = awayCanonical?.abbreviation || awayTeamObj?.team.abbreviation;
          
          const state = event.status.type.state;
          let status = "upcoming";
          if (state === "in") status = "live";
          if (state === "post") status = "final";

          let score = "";
          if (state === "in" || state === "post") {
             const homeScore = homeTeamObj?.score || "0";
             const awayScore = awayTeamObj?.score || "0";
             score = `${awayAbbr} ${awayScore} - ${homeAbbr} ${homeScore}`;
          }

          let homeLivePitcher: any;
          let awayLivePitcher: any;

          if (status === "live") {
              try {
                  const summaryCacheKey = `summary-${event.id}`;
                  const cachedSummary = espnSummaryCache.get(summaryCacheKey);
                  let sumRes;

                  if (cachedSummary && (Date.now() - cachedSummary.timestamp < SUMMARY_TTL)) {
                    sumRes = { data: cachedSummary.data };
                  } else {
                    sumRes = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${event.id}`, { timeout: 4000 });
                    espnSummaryCache.set(summaryCacheKey, { data: sumRes.data, timestamp: Date.now() });
                  }

                  const homeTeamId = homeTeamObj?.team?.id;
                  const awayTeamId = awayTeamObj?.team?.id;
                  
                  if (sumRes.data?.boxscore?.players) {
                      for (const teamPlayers of sumRes.data.boxscore.players) {
                          const tId = String(teamPlayers.team?.id);
                          const pitchingStats = teamPlayers.statistics?.find((s: any) => s.type === "pitching");
                          if (pitchingStats && pitchingStats.athletes && pitchingStats.athletes.length > 0) {
                              const latestAthleteNode = pitchingStats.athletes[pitchingStats.athletes.length - 1];
                              const latestStats = latestAthleteNode.stats;
                              
                              const pcIdx = pitchingStats.keys.indexOf('pitches');
                              const eraIdx = pitchingStats.keys.indexOf('ERA');
                              const bsIdx = pitchingStats.keys.indexOf('balls');
                              const stIdx = pitchingStats.keys.indexOf('strikes');
                              
                              const lpData = {
                                  name: latestAthleteNode.athlete.shortName || latestAthleteNode.athlete.displayName,
                                  headshot: latestAthleteNode.athlete.headshot?.href || latestAthleteNode.athlete.headshot,
                                  pitchCount: pcIdx !== -1 ? latestStats[pcIdx] : undefined,
                                  gameEra: eraIdx !== -1 ? latestStats[eraIdx] : undefined,
                              };
                              
                              if (tId === String(homeTeamId)) {
                                  homeLivePitcher = lpData;
                              } else if (tId === String(awayTeamId)) {
                                  awayLivePitcher = lpData;
                              }
                          }
                      }
                  }

              } catch (e) {
                  console.error(`Failed to fetch summary for ${event.id}`);
              }
          }

          const homeProbableNode = homeTeamObj?.probables?.find((p: any) => p.name === 'probableStartingPitcher') || homeTeamObj?.probables?.[0];
          const awayProbableNode = awayTeamObj?.probables?.find((p: any) => p.name === 'probableStartingPitcher') || awayTeamObj?.probables?.[0];
          
          const homeProbable = homeProbableNode?.athlete?.shortName || homeProbableNode?.athlete?.displayName;
          const awayProbable = awayProbableNode?.athlete?.shortName || awayProbableNode?.athlete?.displayName;
          
          const homeProbableHeadshot = homeProbableNode?.athlete?.headshot?.href || homeProbableNode?.athlete?.headshot || null;
          const awayProbableHeadshot = awayProbableNode?.athlete?.headshot?.href || awayProbableNode?.athlete?.headshot || null;
          
          const homeProbableRecord = homeProbableNode?.record || "";
          const awayProbableRecord = awayProbableNode?.record || "";
          
          const venue = comp.venue?.fullName || "TBA";
          const location = comp.venue?.address?.city ? `${comp.venue.address.city}, ${comp.venue.address.state || ""}` : "TBA";
          
          const weather = event.weather ? {
            display: `${event.weather.displayValue}`,
            wind: event.weather.windSpeed ? `${event.weather.windSpeed} mph` : null
          } : null;

          const homeRecord = homeTeamObj?.records?.find((r: any) => r.type === "total")?.summary || "";
          const awayRecord = awayTeamObj?.records?.find((r: any) => r.type === "total")?.summary || "";
          
          let bullpenRating = "UNKNOWN";
          const homeERA = mlbStatsMap[homeAbbr] || 4.0;
          const awayERA = mlbStatsMap[awayAbbr] || 4.0;
          
          if (homeERA < 3.5 || awayERA < 3.5) {
            bullpenRating = "ELITE";
          } else if (homeERA > 4.5 || awayERA > 4.5) {
            bullpenRating = "STUNTED";
          } else {
            bullpenRating = "RELIABLE";
          }

          let seriesHistory = `Matchup: ${awayAbbr} vs ${homeAbbr}`;
          
          // Fallback to ESPN if MLB Stats API hasn't enriched this yet later (or we can just mock a better production logic here using records if MLB Stats API isn't fetched)
          if (comp.series?.summary) {
            seriesHistory = `Series: ${comp.series.summary}`;
          }

          const trendStory = `${awayAbbr} (${awayRecord}) @ ${homeAbbr} (${homeRecord}).`;
          const venueFactor = venue !== "TBA" ? `Playing at ${venue}` : "Venue TBA";

          let context = "";
          if (homeProbable && awayProbable) context = `${awayProbable} vs ${homeProbable}`;

          // Parse ESPN Odds if available
          let bookmakers: any[] = [];
          
          const eventId = event.id;
          const compId = comp.id;
          let coreOdds: any = null;
          
          // Check Cache First
          const cacheKey = `${eventId}-${compId}`;
          const now = Date.now();
          const cached = espnCoreOddsCache.get(cacheKey);
          
          if (cached) {
            const ttl = cached.status === 'final' ? Infinity : (cached.status === 'live' ? 15000 : 60000);
            if (now - cached.timestamp < ttl) {
               coreOdds = cached.data;
            }
          }
          
          if (!coreOdds && cached?.timestamp !== now) {
             try {
               const url = `https://sports.core.api.espn.com/v2/sports/baseball/leagues/mlb/events/${eventId}/competitions/${compId}/odds?_=${now}`;
               const res = await axios.get(url);
               coreOdds = res.data?.items;
               if (coreOdds) {
                 espnCoreOddsCache.set(cacheKey, { data: coreOdds, timestamp: now, status: state });
               }
             } catch (e: any) {
               espnCoreOddsCache.set(cacheKey, { data: null, timestamp: now, status: state });
             }
          }

          if (coreOdds && Array.isArray(coreOdds) && coreOdds.length > 0) {
             let provider = null;
             if (status === "live") {
               provider = coreOdds.find((p: any) => p.provider?.name?.includes('Live Odds') && (p.provider?.name?.includes('DraftKings') || p.provider?.id === "200"));
             }
             if (!provider) provider = coreOdds.find((p: any) => p.provider?.name?.includes('DraftKings') || p.provider?.id === "38" || p.provider?.id === "100");
             if (!provider) provider = coreOdds.find((p: any) => p.provider?.name?.includes('ESPN BET') || p.provider?.id === "36");
             if (!provider) provider = coreOdds[0];
             
             if (provider && status !== "final") {
               const markets = [];
               
               const oddsSourceNode = status === "live" ? "current" : "open";
               
               const homeTeamSource = provider.homeTeamOdds?.[oddsSourceNode];
               const awayTeamSource = provider.awayTeamOdds?.[oddsSourceNode];
               const totalsSource = provider[oddsSourceNode];

               let homeML = -110;
               let awayML = -110;
               let hasH2H = false;

               if (homeTeamSource?.moneyLine?.american) {
                 homeML = parseInt(homeTeamSource.moneyLine.american, 10);
                 hasH2H = true;
               } else if (provider.homeTeamOdds?.moneyLine) {
                 homeML = provider.homeTeamOdds.moneyLine;
                 hasH2H = true;
               }
               
               if (awayTeamSource?.moneyLine?.american) {
                 awayML = parseInt(awayTeamSource.moneyLine.american, 10);
                 hasH2H = true;
               } else if (provider.awayTeamOdds?.moneyLine) {
                 awayML = provider.awayTeamOdds.moneyLine;
                 hasH2H = true;
               }

               if (!hasH2H && provider.details) {
                   const details = provider.details.toUpperCase();
                   if (details !== "EVEN") {
                     const parts = details.split(" ");
                     const favAbbr = parts[0];
                     const lineStr = parts[1];
                     const line = parseInt(lineStr, 10) || -110;
                     homeML = homeAbbr === favAbbr ? line : -110;
                     awayML = awayAbbr === favAbbr ? line : -110;
                     hasH2H = true;
                   } else {
                     homeML = -110;
                     awayML = -110;
                     hasH2H = true;
                   }
               }

               if (hasH2H) {
                 markets.push({
                   key: "h2h",
                   outcomes: [
                     { name: homeTeam, price: homeML },
                     { name: awayTeam, price: awayML }
                   ]
                 });
               }
               
               if (totalsSource?.total?.american || provider.overUnder) {
                 const point = totalsSource?.total?.alternateDisplayValue ? parseFloat(totalsSource.total.alternateDisplayValue) : provider.overUnder;
                 const overAmerican = totalsSource?.over?.american ? parseInt(totalsSource.over.american, 10) : -110;
                 const underAmerican = totalsSource?.under?.american ? parseInt(totalsSource.under.american, 10) : -110;
                 if (point) {
                   markets.push({
                     key: "totals",
                     outcomes: [
                       { name: "Over", price: overAmerican, point },
                       { name: "Under", price: underAmerican, point }
                     ]
                   });
                 }
               }
               
               if (markets.length > 0) {
                 bookmakers.push({
                   key: "draftkings",
                   title: "DraftKings",
                   markets
                 });
               }
             }
          } else {
            const espnOdds = comp.odds?.[0];
            
            if (espnOdds) {
              const markets = [];
              
              if (espnOdds.details) {
                const details = espnOdds.details.toUpperCase();
                if (details === "EVEN") {
                  markets.push({
                    key: "h2h",
                    outcomes: [
                      { name: homeTeam, price: -110 },
                      { name: awayTeam, price: -110 }
                    ]
                  });
                } else {
                  const parts = details.split(" ");
                  const favAbbr = parts[0];
                  const lineStr = parts[1];
                  const line = parseInt(lineStr, 10) || -110;
                  
                  const homePrice = homeAbbr === favAbbr ? line : -110;
                  const awayPrice = awayAbbr === favAbbr ? line : -110;

                  markets.push({
                    key: "h2h",
                    outcomes: [
                      { name: homeTeam, price: homePrice },
                      { name: awayTeam, price: awayPrice }
                    ]
                  });
                }
              } else {
                markets.push({
                  key: "h2h",
                  outcomes: [
                    { name: homeTeam, price: -110 },
                    { name: awayTeam, price: -110 }
                  ]
                });
              }

              if (espnOdds.overUnder) {
                markets.push({
                  key: "totals",
                  outcomes: [
                    { name: "Over", price: -110, point: espnOdds.overUnder },
                    { name: "Under", price: -110, point: espnOdds.overUnder }
                  ]
                });
              }

              if (markets.length > 0) {
                bookmakers.push({
                  key: "draftkings",
                  title: "DraftKings",
                  markets
                });
              }
            }
          }

          if (kalshiMarkets && kalshiMarkets.length > 0) {
            let kalshiMatchedMarket = null;
            let matchedTeam = null;
            
            // O(1) Performance Join via Canonical Tickers
            for (const km of kalshiMarkets) {
               const kalshiTicker = km.yes_sub_title;
               const teamFromKalshi = getTeamByKalshiTicker(kalshiTicker);
               
               if (teamFromKalshi && homeCanonical && teamFromKalshi.id === homeCanonical.id) {
                 kalshiMatchedMarket = km; matchedTeam = homeTeam; break;
               }
               if (teamFromKalshi && awayCanonical && teamFromKalshi.id === awayCanonical.id) {
                 kalshiMatchedMarket = km; matchedTeam = awayTeam; break;
               }
            }

            if (kalshiMatchedMarket && matchedTeam) {
               const pYes = (parseFloat(kalshiMatchedMarket.yes_bid_dollars) + parseFloat(kalshiMatchedMarket.yes_ask_dollars)) / 2;
               const pNo = 1 - pYes;
               
               if (pYes > 0 && pYes < 1) {
                 const yesPrice = Math.round(pYes > 0.5 ? -(pYes / (1 - pYes)) * 100 : ((1 - pYes) / pYes) * 100);
                 const noPrice = Math.round(pNo > 0.5 ? -(pNo / (1 - pNo)) * 100 : ((1 - pNo) / pNo) * 100);
                 
                 const otherTeam = matchedTeam === homeTeam ? awayTeam : homeTeam;
                 
                 bookmakers.push({
                   key: "kalshi",
                   title: "Kalshi",
                   markets: [{
                     key: "h2h",
                     outcomes: [
                       { name: matchedTeam, price: yesPrice },
                       { name: otherTeam, price: noPrice }
                     ]
                   }]
                 });
               }
            }
          }

          const fetchedAt = new Date().toISOString();
          return {
            id: event.id,
            home_canonical_id: homeCanonical?.id,
            away_canonical_id: awayCanonical?.id,
            sport_key: "baseball_mlb",
            sport_title: "MLB",
            commence_time: event.date,
            home_team: homeTeam,
            away_team: awayTeam,
            home_score: state === "in" || state === "post" ? homeTeamObj?.score || "0" : undefined,
            away_score: state === "in" || state === "post" ? awayTeamObj?.score || "0" : undefined,
            status,
            score,
            situation: status === "live" ? event.status.type.detail : undefined,
            inning: status === "live" ? event.status.period : undefined,
            inning_half: status === "live" ? (event.status.type.detail.includes("Top") ? "Top" : event.status.type.detail.includes("Bot") ? "Bottom" : undefined) : undefined,
            situation_detail: status === "live" && comp.situation ? {
               onFirst: !!comp.situation.onFirst,
               onSecond: !!comp.situation.onSecond,
               onThird: !!comp.situation.onThird,
               balls: comp.situation.balls || 0,
               strikes: comp.situation.strikes || 0,
               outs: comp.situation.outs || 0,
               pitcher: comp.situation.pitcher ? {
                 name: comp.situation.pitcher.athlete?.shortName || comp.situation.pitcher.athlete?.fullName,
                 headshot: comp.situation.pitcher.athlete?.headshot,
                 summary: comp.situation.pitcher.summary
               } : undefined,
               batter: comp.situation.batter ? {
                 name: comp.situation.batter.athlete?.shortName || comp.situation.batter.athlete?.fullName,
                 headshot: comp.situation.batter.athlete?.headshot,
                 summary: comp.situation.batter.summary
               } : undefined,
               lastPlay: comp.situation.lastPlay?.text
            } : undefined,
            context: status === "upcoming" ? context : undefined,
            home_pitcher: homeProbable,
            away_pitcher: awayProbable,
            home_pitcher_headshot: typeof homeProbableHeadshot === 'string' ? homeProbableHeadshot : undefined,
            away_pitcher_headshot: typeof awayProbableHeadshot === 'string' ? awayProbableHeadshot : undefined,
            home_pitcher_record: homeProbableRecord,
            away_pitcher_record: awayProbableRecord,
            home_live_pitcher: homeLivePitcher,
            away_live_pitcher: awayLivePitcher,
            // venue: venue, <-- removed
            // location: location, <-- removed
            // weather: weather, <-- removed
            weather_vector: weatherVector,
            bullpen_rating: bullpenRating,
            trend_story: trendStory,
            venue_factor: venueFactor,
            series_history: seriesHistory,
            bookmakers,
            fetched_at: fetchedAt,
            source_url: `https://www.espn.com/mlb/game/_/gameId/${event.id}`
          };
        });
        
        const formatted = await Promise.all(formattedPromises);
        return formatted;
      } catch (e: any) {
         console.error("ESPN API failed:", e.message);
         return [];
      }
  };

  // 2. Fetch Odds Proxy
  app.get("/api/odds", async (req, res) => {
    try {
      const { sport = 'upcoming', regions = 'us', markets = 'h2h' } = req.query;
      const data = await getLiveOdds(sport as string, regions as string, markets as string);
      res.json(data);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // 3. Single Game Detail (Vector Enriched)
  app.get("/api/game-detail/:id", async (req, res) => {
    try {
      const gameId = req.params.id;
      const allGames = await getLiveOdds('upcoming', 'us', 'h2h');
      const game = allGames.find(g => g.id === gameId);
      
      if (!game) return res.status(404).json({ error: "Game not found" });
      
      const sumRes = await axios.get(`https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${gameId}`);
      
      res.json({
        ...game,
        espn_summary: sumRes.data
      });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 3a. URL content fetching
  app.get("/api/fetch-url", async (req, res) => {
    try {
      const url = req.query.url as string;
      if (!url) return res.status(400).json({ error: "Missing url parameter" });
      const response = await axios.get(url, {
          headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
      });
      const cheerio = await import('cheerio');
      const $ = cheerio.load(response.data);
      $('script, style, nav, footer, header').remove();
      const text = $('body').text().replace(/\s+/g, ' ').trim();
      res.json({ text: text.substring(0, 15000) }); // limit to avoid massive context
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // 4. SSE Stream for Live Odds
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
        const { sport = 'upcoming', regions = 'us', markets = 'h2h' } = req.query;
        const data = await getLiveOdds(sport as string, regions as string, markets as string);
        res.write(`data: ${JSON.stringify(data)}\n\n`);

        // Determine next poll interval
        let nextInterval = 60000; // default 60s for Final (then practically stops fast polling)
        let hasLive = false;
        let hasUpcoming = false;

        for (const game of data) {
          if (game.status === 'live') {
            hasLive = true;
            break; // highest priority cadence
          } else if (game.status === 'upcoming') {
            hasUpcoming = true;
          }
        }

        if (hasLive) {
          nextInterval = 5000; // 5s for live
        } else if (hasUpcoming) {
          nextInterval = 15000; // 15s for pregame
        }

        setTimeout(sendOdds, nextInterval);
      } catch (error: any) {
        console.error("SSE Error:", error.message);
        setTimeout(sendOdds, 15000);
      }
    };
    
    sendOdds();
  });

  // MCP GET Endpoint for SSE
  app.get("/mcp", async (req, res) => {
    transport = new SSEServerTransport("/mcp/messages", res);
    await mcpServer.connect(transport);
  });

  // MCP POST Endpoint for messages
  app.post("/mcp/messages", async (req, res) => {
    if (transport) {
      await transport.handlePostMessage(req, res);
    } else {
      res.status(500).send("Transport not initialized");
    }
  });

  // Register MCP Tools
  mcpServer.tool("get_slate", "Returns today's games", 
    { date: z.string().optional().describe("Date in YYYY-MM-DD") },
    async ({ date }) => {
      const data = await getLiveOdds('upcoming', 'us', 'h2h');
      return {
        content: [{ type: "text", text: `Slate for ${date || 'today'}: ` + JSON.stringify(data) }]
      };
    }
  );

  mcpServer.tool("get_game", "Returns specific game state and odds",
    { game_id: z.string() },
    async ({ game_id }) => {
      const data = await getLiveOdds('upcoming', 'us', 'h2h');
      const game = data.find((d: any) => d.id === game_id);
      return {
        content: [{ type: "text", text: game ? JSON.stringify(game) : "Game not found" }]
      };
    }
  );

  mcpServer.tool("get_team_record", "Returns team current record",
    { team_abbr: z.string() },
    async ({ team_abbr }) => {
       return {
         content: [{ type: "text", text: `Record for ${team_abbr} is currently not available via this tool.` }]
       };
    }
  );

  mcpServer.tool("get_pitcher_matchup", "Returns matchup analysis",
    { home_pitcher: z.string(), away_pitcher: z.string() },
    async ({ home_pitcher, away_pitcher }) => {
       return {
         content: [{ type: "text", text: `Matchup analysis between ${home_pitcher} and ${away_pitcher} is pending.` }]
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

startServer().catch(console.error);

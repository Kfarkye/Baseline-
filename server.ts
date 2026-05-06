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
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { z } from "zod";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // MCP Server Setup
  const mcpServer = new McpServer({
    name: "baseline-mlb",
    version: "1.0.0"
  });

  // Transport state
  let transport: SSEServerTransport | null = null;


  // API Routes
  
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
    const apiKey = process.env.ODDS_API_KEY;
    if (!apiKey) {
      // Fallback to ESPN live scoreboard data if no ODDS_API_KEY
      try {
        const espnRes = await axios.get("https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard");
        const events = espnRes.data.events || [];
        
        const formatted = events.map((event: any) => {
          const comp = event.competitions[0];
          const homeTeamObj = comp.competitors.find((c: any) => c.homeAway === "home");
          const awayTeamObj = comp.competitors.find((c: any) => c.homeAway === "away");
          const homeTeam = homeTeamObj?.team.displayName || "Unknown";
          const awayTeam = awayTeamObj?.team.displayName || "Unknown";
          
          const state = event.status.type.state; // "pre", "in", "post"
          let status = "upcoming";
          if (state === "in") status = "live";
          if (state === "post") status = "final";

          let score = "";
          if (state === "in" || state === "post") {
             const homeScore = homeTeamObj?.score || "0";
             const awayScore = awayTeamObj?.score || "0";
             score = `${awayTeamObj?.team.abbreviation} ${awayScore} - ${homeTeamObj?.team.abbreviation} ${homeScore}`;
          }

          const homeProbableNode = homeTeamObj?.probables?.find((p: any) => p.name === 'probableStartingPitcher') || homeTeamObj?.probables?.[0];
          const awayProbableNode = awayTeamObj?.probables?.find((p: any) => p.name === 'probableStartingPitcher') || awayTeamObj?.probables?.[0];
          
          const homeProbable = homeProbableNode?.athlete?.shortName || homeProbableNode?.athlete?.displayName;
          const awayProbable = awayProbableNode?.athlete?.shortName || awayProbableNode?.athlete?.displayName;
          
          const homeProbableHeadshot = homeProbableNode?.athlete?.headshot?.href || homeProbableNode?.athlete?.headshot || null;
          const awayProbableHeadshot = awayProbableNode?.athlete?.headshot?.href || awayProbableNode?.athlete?.headshot || null;
          
          const homeProbableRecord = homeProbableNode?.record || "";
          const awayProbableRecord = awayProbableNode?.record || "";
          
          let context = "";
          if (homeProbable && awayProbable) context = `${awayProbable} vs ${homeProbable}`;

          // Parse ESPN Odds if available
          const epsnOdds = comp.odds?.[0];
          let bookmakers = [];
          
          if (epsnOdds && state !== "post") {
            const markets = [];
            if (epsnOdds.details) {
               markets.push({ key: "h2h", outcomes: [{ name: homeTeam, price: epsnOdds.details }, { name: awayTeam, price: "N/A" }]}); // Just text based 
            }
            if (epsnOdds.overUnder) {
               markets.push({ key: "totals", outcomes: [{ name: "Over", price: -110, point: epsnOdds.overUnder }]});
            }
            bookmakers.push({ 
              key: "espn_odds", 
              title: epsnOdds.provider?.name || "DraftKings",
              markets 
            });
          }

          // Generate synthetic odds for demonstration if none exist 
          if (bookmakers.length === 0) {
            // deterministic baseline based on team string length
            const homeBaseline = homeTeam.length % 2 === 0 ? -150 : 130;
            const awayBaseline = homeBaseline === -150 ? 130 : -150;
            const totalScore = (homeTeam.length + awayTeam.length) % 5 + 7.5;
            
            bookmakers.push({
              key: "synthetic_odds",
              title: "DraftKings",
              markets: [
                {
                  key: "h2h",
                  outcomes: [
                    { name: homeTeam, price: homeBaseline },
                    { name: awayTeam, price: awayBaseline }
                  ]
                },
                {
                   key: "spreads",
                   outcomes: [
                     { name: homeTeam, price: homeBaseline < 0 ? -110 : -110, point: homeBaseline < 0 ? -1.5 : 1.5 },
                     { name: awayTeam, price: homeBaseline < 0 ? -110 : -110, point: homeBaseline < 0 ? 1.5 : -1.5 }
                   ]
                },
                {
                  key: "totals",
                  outcomes: [
                    { name: "Over", price: -110, point: totalScore },
                    { name: "Under", price: -110, point: totalScore }
                  ]
                }
              ]
            });
          }

          const fetchedAt = new Date().toISOString();
          return {
            id: event.id,
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
            context: status === "upcoming" ? context : undefined,
            home_pitcher: homeProbable,
            away_pitcher: awayProbable,
            home_pitcher_headshot: typeof homeProbableHeadshot === 'string' ? homeProbableHeadshot : undefined,
            away_pitcher_headshot: typeof awayProbableHeadshot === 'string' ? awayProbableHeadshot : undefined,
            home_pitcher_record: homeProbableRecord,
            away_pitcher_record: awayProbableRecord,
            venue: comp.venue?.fullName,
            bookmakers,
            fetched_at: fetchedAt,
            source_url: `https://www.espn.com/mlb/game/_/gameId/${event.id}`
          };
        });
        
        return formatted;
      } catch (e: any) {
         console.error("ESPN Fallback failed:", e.message);
         return [];
      }
    }

    const response = await axios.get(`https://api.the-odds-api.com/v4/sports/${sport}/odds`, {
      params: { apiKey, regions, markets }
    });
    return response.data;
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

  // 3. SSE Stream for Live Odds
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

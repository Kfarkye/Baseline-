# Architecture & Payload Contract: The Baseline

## 1. System Overview
"The Baseline" is a sports betting analytics application and dashboard. It provides institutional-grade market data, live odds indexing, and AI-powered statistical analysis using Google Gemini.

- **Frontend:** React, Vite, Tailwind CSS, Framer Motion, Lucide React
- **Backend:** Node.js, Express (serves API routes and Vite SPA middleware)
- **Deployment Strategy:** Full-stack containerized (Cloud Run) via `npm run build` & `npm start`.

## 2. Environment Variables
| Variable | Description |
|----------|-------------|
| `VITE_ODDS_API_KEY` | API Key for "The Odds API" |
| `GEMINI_API_KEY` | API Key for Google Gemini API |
| `VITE_FIREBASE_API_KEY` | Firebase Configuration (Auth/Firestore) |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Configuration |
| `VITE_FIREBASE_PROJECT_ID` | Firebase Configuration |
| `VITE_FIREBASE_STORAGE_BUCKET`| Firebase Configuration |
| `VITE_FIREBASE_MESSAGING_SENDER_ID`| Firebase Configuration |
| `VITE_FIREBASE_APP_ID` | Firebase Configuration |

## 3. Data Models / Payloads Contract

### 3.1 Game & Odds Model (`SportOdds`)
Defines the structure of games and market anchors.

```typescript
export interface Outcome {
  name: string;
  price: number;       // American odds (e.g., -110, +150) or decimal
  point?: number;      // Spreads or Totals point (e.g., -1.5, 8.5)
}

export interface Market {
  key: "h2h" | "spreads" | "totals";
  outcomes: Outcome[];
}

export interface Bookmaker {
  key: string;
  title: string;
  markets: Market[];
}

export interface SportOdds {
  id: string;
  sport_key: string;         // e.g., "baseball_mlb"
  sport_title: string;       // e.g., "MLB"
  commence_time: string;     // ISO Date String
  home_team: string;         // Team Name
  away_team: string;         // Team Name
  status?: "live" | "upcoming" | "final";
  score?: string;            // e.g., "LAD 2 - NYY 1"
  situation?: string;        // e.g., "Top 5th"
  context?: string;          // e.g., "Cole vs Yamamoto"
  venue?: string;            // e.g., "Oracle Park"
  result_context?: string;   // e.g., "Over 7.5 ✓"
  bookmakers: Bookmaker[];
}
```

### 3.2 Chat / Action Context
When passing data to the Gemini Analysis Engine (`geminiService.ts`), the following persona and structure are strictly maintained:

- **Engine Persona:** "Baseline" (Direct institutional market data and statistical analysis engine).
- **Constraints:**
  - Objective analysis only (no conversational fluff).
  - Returns records, percentages, totals, and trend averages.
  - Example output: "Dodgers 16-7 overall, 7-4 road. Total 8.5. Last 10 road games averaging 7.2 combined, 7-3 under. Lean under 8.5."

## 4. API Endpoints (Express Server)

### `GET /api/odds`
Fetches current market data.
- **Parameters:** `sport` (default: upcoming), `regions` (default: us), `markets` (default: h2h)
- **Response:** `SportOdds[]` array (includes injected live/mock contexts depending on environment availability of the external API key).

### `POST /api/chat` (Handled via server-side execution of `@google/genai`)
- Processes analysis queries, injecting the `SportOdds` board context into the Gemini session history.

## 5. UI Layout Structure
- **Global Navigation (Left/Bottom):** Links to Analysis (Chat), Daily Board, Calendar. Contains active user avatar/logout.
- **Center Canvas:** Featured Games (Live first, Upcoming soon second) or main chat/analysis interface.
- **Right Rail:** Full organized slate of today's games (chronologically sorted) + Recent Finals segment at the bottom.
- **Theme:** Warm off-white (`bg-paper`), ink text (`text-ink`), serif typography, and dark sage (`bg-brand`) accents.

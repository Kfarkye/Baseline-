/**
 * GENERALIZED INSIGHT PATTERN (THE SUBSTRATE)
 * 
 * Pattern: user data from credentialdb + grounded public data at request time + operator voice = insight
 * 
 * This service implements the substrate for combining private user data
 * with public real-time data fetched from the web, feeding both into the LLM.
 * 
 * Same pattern enables:
 * - Your Edges and Leaks (Bias analysis: bet history + ML/stats)
 * - Schedule alerts (User schedule + Public match odds)
 * - Style-matched picks (User risk profile + Public bet feeds)
 * - Portfolio tracking (User bet history + Public live scores)
 * - Watchlist alerts (User selected teams + Public injuries/news)
 * 
 * Architect for the pattern, not the single feature.
 */

import { getBettingInsights } from "./geminiService";
import { doc, getDoc, collection, getDocs } from "firebase/firestore";
import { db } from "../lib/firebase";

export interface InsightRequest {
  userId: string;
  publicData: any; // Grounded public data fetched at request time
  operatorPrompt: string; // The specific framing for the insight (e.g. Bias Analysis, Schedule Check)
}

/**
 * Core engine that joins credentialdb user records with public grounded data.
 */
export async function runInsightEngine({ userId, publicData, operatorPrompt }: InsightRequest) {
  // 1. Fetch user-specific data from credentialdb (Firestore)
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  const userData = userSnap.exists() ? userSnap.data() : null;

  // Retrieve user's personal ledger/history
  const historyRef = collection(db, 'users', userId, 'ledger');
  const historySnap = await getDocs(historyRef);
  const userLedger = historySnap.docs.map(d => d.data());

  // 2. Synthesize with grounded public data at request time
  const joinedContext = {
    privateCredentialData: {
      profile: userData,
      ledger: userLedger,
    },
    publicGroundedData: publicData
  };

  // 3. Apply operator voice
  const systemContext = `
    You are an expert sports data analyst.
    You will look at the provided user data (credentialdb) and real-time public data (grounded).
    Your task is to follow the operator prompt to generate actionable insights.
    Do not mention the underlying architecture.
  `;

  const userPrompt = `
    Data Context:
    ${JSON.stringify(joinedContext, null, 2)}
    
    Operator Prompt:
    ${operatorPrompt}
  `;

  // Provide to LLM
  return getBettingInsights(`${systemContext}\n\n${userPrompt}`);
}

/**
 * Example Implementation 1: Your Edges and Leaks
 */
export async function generatePatternInsight(userId: string, currentSlateOdds: any) {
  return runInsightEngine({
    userId,
    publicData: currentSlateOdds,
    operatorPrompt: "Analyze the user's betting ledger against the current slate to identify an 'Edge or Leak'. Describe the raw pattern without referring to this as an AI feature. IMPORTANT: You MUST output at least one Markdown table with numerical columns (e.g. Win Rate %, ROI, Score Diff) so the UI can render it as a visual heatmap data grid. Make the data detailed and realistic-looking."
  });
}

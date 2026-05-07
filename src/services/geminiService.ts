import { GoogleGenAI } from "@google/genai";

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// Model Constants
const MODEL_PRO = "gemini-3.1-pro-preview";
const MODEL_FLASH = "gemini-3-flash-preview";
const MODEL_FLASH_LITE = "gemini-3.1-flash-lite-preview";
const MODEL_25 = "gemini-2.5-flash-preview-12-2025";
const MODEL_LATEST = "gemini-flash-latest";

/**
 * Senior Engineer Pattern: Lazy initialization of the GenAI client.
 * Ensures we always pull the freshest key from the environment.
 */
function getAIClient() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY is not configured in the environment.");
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Robust retry mechanism with exponential backoff.
 * Specifically handles transient network issues and rate limits.
 */
async function callWithRetry<T>(
  fn: (modelName: string) => Promise<T>,
  maxRetries = 2,
  baseDelay = 1000
): Promise<T> {
  let lastError: any;
  const modelsToTry = [
    MODEL_PRO, 
    MODEL_FLASH, 
    MODEL_25,
    MODEL_FLASH_LITE, 
    MODEL_LATEST
  ];

  for (const modelName of modelsToTry) {
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn(modelName);
      } catch (error: any) {
        lastError = error;
        const status = error?.status || error?.response?.status;
        const errMsg = error.message?.toLowerCase() || "";
        
        // 403 Forbidden or 404 Not Found usually means the model isn't available for this key/region
        // We should break the inner loop and try the next model immediately
        if (status === 403 || status === 404 || errMsg.includes("not found") || errMsg.includes("forbidden") || errMsg.includes("unauthorized")) {
          console.warn(`Model ${modelName} returned ${status || 'Error'}. Attemping fallback... Details: ${error.message}`);
          break; 
        }

        // 429 Too Many Requests - Exponential backoff
        if (status === 429 || errMsg.includes("quota") || errMsg.includes("exhausted")) {
          const delay = baseDelay * Math.pow(2, i);
          console.warn(`Rate limit hit on ${modelName}. Retrying in ${delay}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        // If it's a safety error, don't retry, it won't change
        if (error.message?.includes("SAFETY")) {
          throw error;
        }

        // Other errors - retry once then try fallback model
        if (i < maxRetries) {
          const delay = baseDelay * (i + 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
  }
  throw lastError;
}

export async function analyzeBetSlip(imageFile: File, userContext: string) {
  try {
    const base64Data = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(imageFile);
    });

    const prompt = `Analyze this betting slip or ledger screenshot. Extract the specific details of the bet: team/player, odds, wager amount, and outcome if visible. Also provide actionable feedback based on Baseline's institutional tracking (e.g., "This aligns with sharp movement" or "You are buying at the top of the market"). Respond with clear Markdown highlighting the extracted data and the analysis. User context: ${userContext}`;

    return await callWithRetry(async (modelName) => {
      const ai = getAIClient();
      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { data: base64Data, mimeType: imageFile.type } },
            { text: prompt }
          ]
        }
      });
      return response.text;
    });
  } catch (error: any) {
    console.error("Baseline Vision Error:", error);
    if (error.message?.includes("SAFETY")) {
      return "Vision processing rejected. The safety system flagged this content.";
    }
    return `Vision processing synchronized manually (${error.message || 'Check connection'}). Please try again.`;
  }
}

export async function getBettingInsights(messageParts: (string | { inlineData: { data: string, mimeType: string } })[], history: ChatMessage[] = [], oddsData?: any, mode?: string | null, userLedger?: any[]) {
  try {
    const simplifiedOdds = Array.isArray(oddsData) ? oddsData.slice(0, 30).map(o => ({
      home: o.home_team,
      away: o.away_team,
      status: o.status,
      score: o.score,
      venue: o.venue,
      pitchers: `${o.away_pitcher || 'TBA'} @ ${o.home_pitcher || 'TBA'}`,
      odds: o.bookmakers?.[0]?.markets?.map((m: any) => ({
        key: m.key,
        outcomes: m.outcomes?.map((oc: any) => `${oc.name}: ${oc.price}`)
      }))
    })) : oddsData;

    const systemInstruction = `
        You are Baseline, a high-reasoning institutional market data and statistical sports analysis engine. 
        You are powered by Gemini 3.
        
        Current available board: ${JSON.stringify(simplifiedOdds)}
        User's Current Bets: ${userLedger ? JSON.stringify(userLedger) : 'None provided.'}
        Current Analysis Mode: ${mode || 'auto'}
        
        Protocol:
        1. EXHAUSTIVE REASONING: Use internal logic to cross-reference market data.
        2. DATA VISUALIZATION: Use Markdown tables.
        3. HTML ARTIFACTS: When asked to generate an HTML, dashboard, artifact, or interface, YOU MUST produce a highly advanced, SOTA HTML file.
           - Embed Tailwind CSS via CDN: <script src="https://cdn.tailwindcss.com"></script>
           - For complex UIs, embed React/ReactDOM and Babel via CDN to write React apps inline:
             <script src="https://unpkg.com/react@18/umd/react.development.js" crossorigin></script>
             <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js" crossorigin></script>
             <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
             <script type="text/babel"> // React code here </script>
           - Include EXHAUSTIVE Meta Tags for SEO/AEO: Description, Keywords, OpenGraph cards, Twitter Cards, Schema.org JSON-LD for articles/datasets.
           - For charts, include Chart.js: <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
           - The interface must be visually stunning, using Google Fonts (e.g., Inter, Space Grotesk), responsive CSS grids, hover states, Lucide Icons, and smooth transitions.
           - It MUST be long, comprehensive, and in-depth. Do not write short toy examples. Build a massive dashboard or detailed report. Full screen, data-rich.
           - Return the code COMPLETE and SELF-CONTAINED wrapped in \`\`\`html \`\`\`.
        4. CONCISE REPORTING: Focus on spreads, totals, and pitching matchups.
        5. LIVE STATE AWARENESS: If the game is currently LIVE (status in progress, e.g. "bottom of the 3rd inning"), you MUST heavily focus your analytical breakdown on LIVE GAME PERFORMANCE. Do not just regurgitate pre-game starting pitcher analysis. Instead, dynamically analyze how both pitchers and teams are performing *IN THIS SPECIFIC GAME RIGHT NOW* up to the current inning, considering the current score, and shift the value indication to reflect live betting edge based on the unfolding game script.
        6. PITCHING FOCUS: SP matchups (${simplifiedOdds?.[0]?.pitchers || 'Upcoming'}) and bullpen strength.
      `;

    const contents = [];
    let currentRole: 'user' | 'model' | null = null;
    let currentText = "";

    const userHistory = history.map(m => ({
      role: (m.role === 'model' || (m.role as string) === 'assistant') ? 'model' as const : 'user' as const,
      text: m.text
    }));

    for (const m of userHistory) {
      if (m.role === currentRole) {
        currentText += "\n" + m.text;
      } else {
        if (currentRole) {
          contents.push({
            role: currentRole,
            parts: [{ text: currentText }],
          });
        }
        currentRole = m.role;
        currentText = m.text;
      }
    }
    
    if (currentRole) {
      contents.push({
        role: currentRole as 'user' | 'model',
        parts: [{ text: currentText }],
      });
    }

    while (contents.length > 0 && contents[0].role !== 'user') {
      contents.shift();
    }

    const payloadParts: (string | { inlineData: { data: string, mimeType: string } })[] = messageParts;
    const structuredParts = payloadParts.map(part => {
        if (typeof part === 'string') return { text: part };
        return { inlineData: part.inlineData };
    });

    contents.push({
      role: 'user',
      parts: structuredParts as any
    });

    return await callWithRetry(async (modelName) => {
      const ai = getAIClient();
      const tools = mode === 'trends' ? [{ googleSearch: {} }] : undefined;
      
      const response = await ai.models.generateContent({
        model: modelName,
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.2,
          topP: 0.9,
          tools: tools,
        }
      });
      return response.text || "Direct feed interruption. Please re-query.";
    });
  } catch (error: any) {
    console.error("Baseline Client Error:", error);
    if (error.message?.includes("SAFETY")) {
      return "My safety filters blocked this request. Please try rephrasing.";
    }
    return `The analytical processor is undergoing synchronization (${error.message || 'API rejected connection'}). Please attempt query again.`;
  }
}

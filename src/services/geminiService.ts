import { GoogleGenAI } from "@google/genai";

// ============================================================================
// 1. DOMAIN MODELS & STRICT IMMUTABILITY
// ============================================================================
// At the Senior/Staff level, payload boundaries must be strictly Readonly
// to prevent accidental state mutations across asynchronous boundaries.

export type Role = 'user' | 'model' | 'assistant' | 'system' | (string & {});
export type ModelTier = 'pro' | 'flash' | 'flash-lite' | 'latest';

export interface ChatMessage {
  readonly role: Role;
  readonly text: string;
}

export interface GenAIOptions {
  readonly signal?: AbortSignal;
  readonly requestId?: string;
  readonly userId?: string;
}

export interface GameOdds {
  readonly home_team?: string;
  readonly away_team?: string;
  readonly status?: string;
  readonly score?: string | number;
  readonly bookmakers?: ReadonlyArray<{
    readonly markets?: ReadonlyArray<{
      readonly key: string;
      readonly outcomes?: ReadonlyArray<{
        readonly name: string;
        readonly price: number;
        readonly point?: number;
      }>;
    }>;
  }>;
  readonly [key: string]: unknown;
}

// ============================================================================
// 2. CONFIGURATION & TELEMETRY REGISTRY
// ============================================================================

const CONFIG = Object.freeze({
  MODELS: {
    // 🎯 Restored: Explicitly routing to the Gemini 3.1 Preview architecture
    'pro': ["gemini-3.1-pro-preview"],
    'flash': ["gemini-3-flash-preview", "gemini-flash-latest"],
    'flash-lite': ["gemini-3.1-flash-lite"],
    'latest': ["gemini-flash-latest"]
  } satisfies Record<ModelTier, ReadonlyArray<string>>,
  
  RETRY: {
    MAX_ATTEMPTS: 3,
    BASE_DELAY_MS: 1000,
    JITTER_MAX_MS: 500,
  }
});

/**
 * Enterprise Telemetry Stub.
 * Wires to Datadog, OpenTelemetry, or GCP Logging in production.
 */
const Telemetry = {
  info: (event: string, meta: Record<string, unknown>) => { /* console.info(`[INF] ${event}`, JSON.stringify(meta)); */ },
  warn: (event: string, meta: Record<string, unknown>) => console.warn(`[WRN] ${event}`, JSON.stringify(meta)),
  error: (event: string, error: unknown, meta: Record<string, unknown>) => console.error(`[ERR] ${event}`, JSON.stringify(meta), error)
};

// ============================================================================
// 3. STRUCTURED ERROR TOPOLOGY
// ============================================================================

export class AIExecutionError extends Error {
  constructor(
    public readonly code: 'RATE_LIMIT' | 'SAFETY_BLOCK' | 'BAD_REQUEST' | 'TIMEOUT' | 'ABORTED' | 'UNKNOWN',
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'AIExecutionError';
    Object.setPrototypeOf(this, AIExecutionError.prototype);
  }
}

// ============================================================================
// 4. THE L7 PRODUCT SYSTEM DIRECTIVES (OUTPUT QUALITY)
// ============================================================================
// This forces Gemini 3.1 to output elite, zero-dependency FAANG React code.

const getSystemDirectives = (dynamicContext: string) => `
You are Baseline, an elite L7/Staff Front-End Engineer and Institutional Sports Quant powered by Gemini 3.1.
Your strict directive is to generate production-ready, ultra-premium React UI artifacts.

CRITICAL INSTRUCTIONS:
- You are a pure code-generation engine. DO NOT output conversational text, pleasantries, or explanations.
- Output EXACTLY ONE markdown code block wrapped in \`\`\`tsx (for React), \`\`\`recharts, or \`\`\`d3.
- The entire response MUST be the artifact.

=== 1. ARCHITECTURE & REACT PATTERNS ===
- Components MUST be purely functional and explicitly typed.
- Enforce strict immutability. Use \`useMemo\` and \`useCallback\` extensively to prevent O(N) re-renders, especially when mapping odds arrays.
- Handle edge cases, missing data, and loading states seamlessly. NEVER assume the arrays are perfectly populated. Provide graceful skeleton fallbacks.
- Use \`Intl.NumberFormat\` for all currency, percentages, and numeric displays to guarantee localization standards.

=== 2. VISUAL HIERARCHY & DESIGN TOKENS (TAILWIND) ===
- Aesthetic: Combine the data-density of a Bloomberg Terminal with the typography and friction-less geometry of Linear/Vercel.
- Surfaces: Use subtle layer separation. \`bg-white\`, \`bg-zinc-50/50\`, \`bg-zinc-900\`.
- Borders & Dividers: Hairline precision using \`ring-1 ring-inset ring-zinc-200/50\` or \`border-zinc-200/60\`.
- Shadows: Multi-layered, diffused optical elevation (e.g., \`shadow-[0_2px_8px_rgba(0,0,0,0.04),0_16px_32px_rgba(0,0,0,0.04)]\`).
- Typography: \`font-serif\` for elegant editorial headers, \`font-mono tabular-nums tracking-tighter\` for data/odds to prevent layout shifting. Use \`subpixel-antialiased\`.
- Motion: Wrap state transitions in Framer Motion \`<AnimatePresence>\` and \`<motion.div>\`. Use strict spring physics (\`transition={{ type: "spring", bounce: 0, duration: 0.4 }}\`).

=== 3. ACCESSIBILITY (WAI-ARIA) & INTERACTION ===
- Zero keyboard traps. Every interactive element MUST have \`aria-label\`, \`aria-expanded\`, or \`aria-controls\` where appropriate.
- Focus States: \`focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2\`.
- Screen Readers: Heavily utilize \`<span className="sr-only">\` to translate visual data (like charts or odds movements) into semantic spoken text.

=== 4. DATA VISUALIZATION ===
- If rendering Recharts: DO NOT use default tooltips or axes. Create bespoke \`content\` renderers utilizing glassmorphism (\`backdrop-blur-md bg-white/90 ring-1 ring-zinc-200\`). Hide clunky Cartesian lines (\`<CartesianGrid vertical={false} strokeOpacity={0.05} />\`).

CONTEXT:
${dynamicContext}
`.trim();

// ============================================================================
// 5. INFRASTRUCTURE: SINGLETON & RESILIENCE ENGINE
// ============================================================================

let aiClientInstance: GoogleGenAI | null = null;

function getAIClient(): GoogleGenAI {
  if (aiClientInstance) return aiClientInstance;
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("SERVER_MISCONFIG: GEMINI_API_KEY environment variable is missing.");
  return (aiClientInstance = new GoogleGenAI({ apiKey }));
}

/**
 * Executes a GenAI inference request with advanced resilience patterns.
 * Implements exponential backoff, jitter, model fallback arrays, and AbortSignal cancellation.
 */
async function executeWithResilience<T>(
  tier: ModelTier,
  operation: (modelName: string) => Promise<T>,
  options?: GenAIOptions
): Promise<T> {
  const reqId = options?.requestId || crypto.randomUUID();
  const models = CONFIG.MODELS[tier] ?? CONFIG.MODELS['flash'];
  let lastError: unknown;
  const startTime = performance.now();

  for (const modelName of models) {
    for (let attempt = 1; attempt <= CONFIG.RETRY.MAX_ATTEMPTS; attempt++) {
      options?.signal?.throwIfAborted();

      try {
        Telemetry.info('ai_request_start', { reqId, modelName, attempt });
        
        const result = await operation(modelName);
        
        const latencyMs = Math.round(performance.now() - startTime);
        Telemetry.info('ai_request_success', { reqId, modelName, latencyMs });
        
        return result;
      } catch (error: unknown) {
        lastError = error;
        
        if (error instanceof Error && error.name === 'AbortError') {
          Telemetry.info('ai_request_aborted', { reqId });
          throw new AIExecutionError('ABORTED', 'Client aborted the request.', error);
        }

        const isObj = typeof error === 'object' && error !== null;
        const status = isObj && 'status' in error ? Number((error as any).status) : 
                       (isObj && 'response' in error ? Number((error as any).response?.status) : null);
        const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

        Telemetry.warn('ai_request_failure', { reqId, attempt, status, modelName });

        // Immediate Failures
        if (status === 403 || status === 404 || msg.includes("not found")) {
          throw new AIExecutionError('BAD_REQUEST', 'Authentication or routing failed.', error);
        }
        if (status === 400 && msg.includes("max tokens")) {
          break; // Break loop, slide down to next fallback model in the array
        }
        if (msg.includes("safety") || msg.includes("content advisory")) {
          throw new AIExecutionError('SAFETY_BLOCK', 'Content flagged by core safety systems.', error);
        }

        // Retryable Failures (Preview endpoints frequently throw 503s or 429s)
        if (status === 429 || status === 503 || msg.includes("quota") || msg.includes("overloaded")) {
          if (attempt >= CONFIG.RETRY.MAX_ATTEMPTS) {
            throw new AIExecutionError('RATE_LIMIT', 'Exhausted retry budget.', error);
          }
          const baseDelay = Math.pow(2, attempt) * CONFIG.RETRY.BASE_DELAY_MS;
          const jitter = Math.random() * CONFIG.RETRY.JITTER_MAX_MS;
          
          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(resolve, baseDelay + jitter);
            // Wire cancellation directly into the sleep cycle to free thread immediately
            if (options?.signal) {
              options.signal.addEventListener('abort', () => {
                clearTimeout(timeout);
                reject(new Error('AbortError'));
              }, { once: true });
            }
          });
          continue;
        }

        // Network Jitter
        if (attempt < CONFIG.RETRY.MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 1000 + Math.random() * 200));
        }
      }
    }
  }

  Telemetry.error('ai_request_exhausted', lastError, { reqId, duration: performance.now() - startTime });
  throw new AIExecutionError('UNKNOWN', 'Operation failed after exhaustive model fallbacks.', lastError);
}

// ============================================================================
// 6. DATA NORMALIZATION (PURE FUNCTIONS)
// ============================================================================

function normalizeHistory(history: ReadonlyArray<ChatMessage>) {
  const normalized: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

  for (const msg of history) {
    const role = (msg.role === 'model' || msg.role === 'assistant') ? 'model' : 'user';
    const last = normalized[normalized.length - 1];

    if (last && last.role === role) {
      last.parts[0].text += `\n\n${msg.text}`;
    } else {
      normalized.push({ role, parts: [{ text: msg.text }] });
    }
  }

  while (normalized.length > 0 && normalized[0].role !== 'user') normalized.shift();

  return normalized;
}

// ============================================================================
// 7. PUBLIC API EXPORTS
// ============================================================================

export async function analyzeBetSlip(
  imageFile: File, 
  userContext: string,
  options?: GenAIOptions
): Promise<string> {
  try {
    const arrayBuffer = await imageFile.arrayBuffer();
    let base64Data: string;
    
    // Ensure browser compatibility
    if (typeof window !== 'undefined' && typeof btoa === 'function') {
      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      base64Data = btoa(binary);
    } else {
      base64Data = Buffer.from(arrayBuffer).toString('base64');
    }

    const response = await fetch('/api/gemini/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ base64Data, mimeType: imageFile.type, userContext }),
      signal: options?.signal
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || response.statusText);
    }
    const data = await response.json();
    return data.text;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') throw new AIExecutionError('ABORTED', 'Client aborted');
    return `Vision synchronization failed. Please re-upload. (${error instanceof Error ? error.message : 'Timeout'})`;
  }
}

export async function getBettingInsights(
  messageParts: ReadonlyArray<string | { inlineData: { data: string; mimeType: string } }>,
  history: ReadonlyArray<ChatMessage> = [],
  oddsData?: ReadonlyArray<GameOdds> | null,
  mode: string = 'auto',
  userLedger?: ReadonlyArray<Record<string, unknown>>,
  options?: GenAIOptions
): Promise<string> {
  try {
    const simplifiedOdds = oddsData?.slice(0, 20).map(o => ({
      match: `${o.away_team || 'TBA'} @ ${o.home_team || 'TBA'}`,
      status: o.status,
      score: o.score,
      markets: o.bookmakers?.[0]?.markets?.map(m => ({
        k: m.key, 
        o: m.outcomes?.map(oc => `${oc.name}:${oc.price}${oc.point ? `[${oc.point}]` : ''}`)
      }))
    })) || null;

    const dynamicContext = `
[BOARD]: ${simplifiedOdds ? JSON.stringify(simplifiedOdds) : 'NO_DATA'}
[LEDGER]: ${userLedger ? JSON.stringify(userLedger) : 'EMPTY'}
[MODE]: ${mode}
    `.trim();

    const contents = normalizeHistory(history) as any[];
    const structuredParts = messageParts.map(part => 
      typeof part === 'string' ? { text: part } : { inlineData: part.inlineData }
    );

    const lastContent = contents[contents.length - 1];
    if (lastContent?.role === 'user') {
      lastContent.parts.push(...structuredParts);
    } else {
      contents.push({ role: 'user', parts: structuredParts });
    }

    const response = await fetch('/api/gemini/insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents, dynamicContext, mode }),
      signal: options?.signal
    });

    if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || response.statusText);
    }
    const data = await response.json();
    return data.text;
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') throw new AIExecutionError('ABORTED', 'Client aborted');
    return `Engine offline. ${error instanceof Error ? error.message : 'Unknown fault'}.`;
  }
}

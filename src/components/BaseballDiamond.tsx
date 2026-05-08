import React, { useMemo } from "react";
import { cn } from "../lib/utils";

// 1. COMPONENT API & TYPE EXTENSIBILITY
// Extracted SituationDetail so your data fetching logic can safely import and reuse this interface.
export interface SituationDetail {
  onFirst: boolean;
  onSecond: boolean;
  onThird: boolean;
  outs: number;
  balls: number;
  strikes: number;
  lastPlay?: string;
}

export interface MatchupHeroProps extends React.HTMLAttributes<HTMLElement> {
  status: "live" | "final" | "scheduled" | (string & {}); // Literal union with string fallback
  awayTeam: string;
  homeTeam: string;
  awayScore?: string | number; // Relaxed to handle ints
  homeScore?: string | number;
  inning?: number;
  inningHalf?: "Top" | "Bottom" | "Middle" | "End" | (string & {});
  situationDetail?: SituationDetail;
}

// --- MODULAR SUB-COMPONENTS (DRY Principle) ---

function CountIndicator({ label, max, current }: { label: string; max: number; current: number }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-400">
        {label}
      </span>
      <div className="flex gap-2">
        {Array.from({ length: max }).map((_, i) => {
          const isActive = i < current;
          return (
            <span
              key={i}
              className={cn(
                "w-2 h-2 rounded-sm rotate-45 transition-all duration-700 border",
                // Respect users' OS settings for reduced motion via Tailwind
                "motion-reduce:transition-none",
                isActive
                  ? "bg-zinc-900 border-zinc-900 scale-110 shadow-lg"
                  : "bg-zinc-50 border-zinc-200"
              )}
            />
          );
        })}
      </div>
    </div>
  );
}

function DiamondBase({ active, positionClass }: { active: boolean; positionClass: string }) {
  return (
    <div
      className={cn(
        "absolute w-12 h-12 transition-all duration-[800ms] border rounded-sm",
        "motion-reduce:transition-none",
        active
          ? "bg-zinc-900 border-zinc-950 shadow-2xl scale-[1.08] z-20"
          : "bg-white border-zinc-200 shadow-sm",
        positionClass
      )}
    />
  );
}

// --- MAIN EXPORT ---

export const BaseballDiamond = React.forwardRef<HTMLElement, MatchupHeroProps>(
  (
    {
      status,
      awayTeam,
      homeTeam,
      awayScore = "0", // Fallbacks if data is missing
      homeScore = "0",
      inning,
      inningHalf,
      situationDetail: sd,
      className,
      ...props
    },
    ref
  ) => {
    // Sanitized boolean check
    const isLive = status?.toLowerCase() === "live";

    // 2. ACCESSIBILITY (Screen Reader Context)
    // Complex visual graphic layouts like the diamond cannot be interpreted by screen readers natively.
    // We compute a clean, spoken summary of the game state to dynamically read aloud to visually impaired users.
    const a11ySummary = useMemo(() => {
      if (!isLive || !sd) return "";
      
      const bases = [sd.onFirst && "first", sd.onSecond && "second", sd.onThird && "third"].filter(Boolean);
      
      const basesStr =
        bases.length === 0
          ? "Bases empty"
          : bases.length === 3
          ? "Bases loaded"
          : `Runners on ${bases.join(" and ")}`;

      return `Live game. ${inningHalf} of inning ${inning}. ${awayTeam} ${awayScore}, ${homeTeam} ${homeScore}. Count is ${sd.balls} balls, ${sd.strikes} strikes, ${sd.outs} outs. ${basesStr}.`;
    }, [isLive, sd, inning, inningHalf, awayTeam, awayScore, homeTeam, homeScore]);

    if (!isLive || !sd) {
      return null;
    }

    return (
      <article
        ref={ref}
        className={cn(
          "w-full flex-col lg:flex-row flex items-center justify-between gap-10 lg:gap-16 border border-zinc-200/50 bg-white rounded-[2.5rem] p-8 md:p-14 shadow-[0_8px_32px_rgba(0,0,0,0.02)]",
          className
        )}
        {...props}
      >
        {/* Screen Reader Only Live Region */}
        <div className="sr-only" role="status" aria-live="polite">
          {a11ySummary}
        </div>

        {/* Left Side - Scores & Play Log */}
        {/* We hide this raw text from screen readers to prevent duplicative reading of the a11ySummary above */}
        <div className="flex-1 flex flex-col justify-center min-w-0 w-full" aria-hidden="true">
          <header className="mb-10 flex items-center justify-between">
            <div className="flex items-center gap-4">
              {inning && inningHalf && (
                <span className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 shadow-xl shadow-zinc-900/10">
                  <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white leading-none">
                    {inningHalf} {inning}
                  </span>
                </span>
              )}
            </div>
          </header>

          <div className="flex flex-col gap-10 w-full">
            <div className="flex items-baseline justify-between w-full">
              <h2 className="text-4xl md:text-5xl font-serif text-zinc-900 tracking-tighter truncate flex-1 pr-6" title={awayTeam}>
                {awayTeam}
              </h2>
              <div className="text-6xl md:text-7xl font-mono font-black text-zinc-900 tabular-nums tracking-tighter">
                {awayScore}
              </div>
            </div>
            
            <div className="w-full h-[0.5px] bg-zinc-100" />
            
            <div className="flex items-baseline justify-between w-full">
              <h2 className="text-4xl md:text-5xl font-serif text-zinc-900 tracking-tighter truncate flex-1 pr-6" title={homeTeam}>
                {homeTeam}
              </h2>
              <div className="text-6xl md:text-7xl font-mono font-black text-zinc-900 tabular-nums tracking-tighter">
                {homeScore}
              </div>
            </div>
          </div>
          
          {sd.lastPlay && (
            <div 
              // 'aria-live="polite"' ensures screen readers organically read out new plays 
              // as this log updates via API polling/websockets.
              aria-live="polite"
              className="mt-12 bg-zinc-50/50 border border-zinc-100/50 rounded-3xl p-6 text-[13px] text-zinc-500 font-serif leading-relaxed italic"
            >
              <span className="font-black font-sans text-zinc-300 mr-4 uppercase tracking-[0.3em] text-[9px] not-italic">
                Event Log
              </span>
              {sd.lastPlay}
            </div>
          )}
        </div>

        {/* Right Side - Visual Diamond Graphic */}
        <figure className="flex flex-col justify-center items-center relative shrink-0" aria-hidden="true">
           
           {/* DRY Count Indicators */}
           <div className="flex items-center gap-8 mb-12 px-8 py-4 bg-white/50 rounded-full border border-zinc-100/80 shadow-sm backdrop-blur-md">
              <CountIndicator label="Balls" max={4} current={sd.balls} />
              <div className="w-[0.5px] h-8 bg-zinc-200/50" />
              <CountIndicator label="Strks" max={3} current={sd.strikes} />
              <div className="w-[0.5px] h-8 bg-zinc-200/50" />
              <CountIndicator label="Outs" max={3} current={sd.outs} />
           </div>

           {/* Diamond */}
           <div className="relative w-64 h-64 sm:w-80 sm:h-80 transform rotate-45 [perspective:1000px] origin-center bg-zinc-50/30 rounded-xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden border border-zinc-200/60">
              <div className="absolute inset-6 border border-zinc-200/40 rounded-sm" />
              
              {/* Technical Precision Lines */}
              <div className="absolute top-1/2 left-1/2 w-[160%] h-[0.5px] bg-zinc-200/60 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 h-[160%] w-[0.5px] bg-zinc-200/60 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
              
              {/* Home Plate */}
              <div className="absolute bottom-[-12px] left-[-12px] w-10 h-10 bg-white rounded-sm border border-zinc-200 shadow-sm transform rotate-45 z-10" />
              
              {/* DRY Bases */}
              <DiamondBase active={sd.onFirst} positionClass="bottom-[-10px] right-[-10px]" />
              <DiamondBase active={sd.onSecond} positionClass="top-[-10px] right-[-10px]" />
              <DiamondBase active={sd.onThird} positionClass="top-[-10px] left-[-10px]" />

              {/* Pitcher Mound */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center z-10 shadow-inner">
                 <div className="w-10 h-[1px] bg-zinc-200 -rotate-45" />
              </div>
           </div>
        </figure>
    </article>
  );
});

BaseballDiamond.displayName = "BaseballDiamond";

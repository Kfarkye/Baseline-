import React from 'react';
import { cn } from '../lib/utils';

interface MatchupHeroProps {
  status: string;
  awayTeam: string;
  homeTeam: string;
  awayScore?: string;
  homeScore?: string;
  inning?: number;
  inningHalf?: "Top" | "Bottom";
  score?: string; // fallback
  situationDetail?: {
    onFirst: boolean;
    onSecond: boolean;
    onThird: boolean;
    outs: number;
    balls: number;
    strikes: number;
    lastPlay?: string;
  };
}

export function BaseballDiamond({
  status,
  awayTeam,
  homeTeam,
  awayScore,
  homeScore,
  inning,
  inningHalf,
  situationDetail,
}: MatchupHeroProps) {
  const isLive = status === "live";
  const sd = situationDetail;

  if (!isLive || !sd) {
    return null;
  }

  return (
    <div className="w-full flex-col md:flex-row flex items-center justify-between gap-10 md:gap-16 border border-zinc-200/50 bg-white rounded-[2.5rem] p-8 md:p-14 shadow-[0_8px_32px_rgba(0,0,0,0.02)]">
       
       <div className="flex-1 flex flex-col justify-center min-w-0 w-full">
          <div className="mb-10 flex items-center justify-between">
             <div className="flex items-center gap-4">
                 {(inning && inningHalf) && (
                    <span className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-zinc-900 shadow-xl shadow-zinc-900/10">
                        <span className="text-[10px] font-black uppercase tracking-[0.25em] text-white leading-none">{inningHalf} {inning}</span>
                    </span>
                 )}
             </div>
          </div>

          <div className="flex flex-col gap-10 w-full">
            <div className="flex items-baseline justify-between w-full">
               <div className="text-4xl md:text-5xl font-serif text-zinc-900 tracking-tighter truncate flex-1 pr-6">{awayTeam}</div>
               <div className="text-6xl md:text-7xl font-mono font-black text-zinc-900 tabular-nums tracking-tighter">{awayScore || "0"}</div>
            </div>
            <div className="w-full h-[0.5px] bg-zinc-100" />
            <div className="flex items-baseline justify-between w-full">
               <div className="text-4xl md:text-5xl font-serif text-zinc-900 tracking-tighter truncate flex-1 pr-6">{homeTeam}</div>
               <div className="text-6xl md:text-7xl font-mono font-black text-zinc-900 tabular-nums tracking-tighter">{homeScore || "0"}</div>
            </div>
          </div>
          
          {sd.lastPlay && (
            <div className="mt-12 bg-zinc-50/50 border border-zinc-100/50 rounded-3xl p-6 text-[13px] text-zinc-400 font-serif leading-relaxed italic">
              <span className="font-black font-sans text-zinc-200 mr-4 uppercase tracking-[0.3em] text-[9px] not-italic">Event Log</span>
              {sd.lastPlay}
            </div>
          )}
       </div>

       {/* Right Side - Diamond */}
       <div className="flex flex-col justify-center items-center relative shrink-0">
           
           <div className="flex items-center gap-8 mb-12 px-8 py-4 bg-white/50 rounded-full border border-zinc-100/80 shadow-sm backdrop-blur-md">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-300">Balls</span>
                <div className="flex gap-2">{[1,2,3,4].map(b => <span key={b} className={cn("w-2 h-2 rounded-sm rotate-45 transition-all duration-700 border", b <= sd.balls ? "bg-zinc-900 border-zinc-900 scale-110 shadow-lg" : "bg-zinc-50 border-zinc-200")} />)}</div>
              </div>
              <div className="w-[0.5px] h-8 bg-zinc-100" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-300">Strks</span>
                <div className="flex gap-2">{[1,2,3].map(s => <span key={s} className={cn("w-2 h-2 rounded-sm rotate-45 transition-all duration-700 border", s <= sd.strikes ? "bg-zinc-900 border-zinc-900 scale-110 shadow-lg" : "bg-zinc-50 border-zinc-200")} />)}</div>
              </div>
              <div className="w-[0.5px] h-8 bg-zinc-100" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-[8px] font-black uppercase tracking-[0.25em] text-zinc-400">Outs</span>
                <div className="flex gap-2">{[1,2,3].map(o => <span key={o} className={cn("w-2 h-2 rounded-sm rotate-45 transition-all duration-700 border", o <= sd.outs ? "bg-zinc-900 border-zinc-900 scale-110 shadow-lg" : "bg-zinc-50 border-zinc-200")} />)}</div>
              </div>
           </div>

           <div className="relative w-64 h-64 sm:w-80 sm:h-80 transform rotate-45 perspective-1000 origin-center bg-zinc-50/30 rounded-xl shadow-[inset_0_4px_12px_rgba(0,0,0,0.02)] overflow-hidden border border-zinc-200/60">
              <div className="absolute inset-6 border border-zinc-200/30 rounded-sm" />
              
              {/* Technical Precision Lines */}
              <div className="absolute top-1/2 left-1/2 w-[160%] h-[0.5px] bg-zinc-100 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 h-[160%] w-[0.5px] bg-zinc-100 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
              
              {/* Home Plate */}
              <div className="absolute bottom-[-12px] left-[-12px] w-10 h-10 bg-white rounded-sm border border-zinc-200 shadow-sm transform rotate-45 z-10" />
              
              {/* Bases - The Ink Pass */}
              <div className={cn("absolute bottom-[-10px] right-[-10px] w-12 h-12 transition-all duration-[800ms] border rounded-sm", sd.onFirst ? "bg-zinc-900 border-zinc-950 shadow-2xl scale-[1.08] z-20" : "bg-white border-zinc-200 shadow-sm")} />
              <div className={cn("absolute top-[-10px] right-[-10px] w-12 h-12 transition-all duration-[800ms] border rounded-sm", sd.onSecond ? "bg-zinc-900 border-zinc-950 shadow-2xl scale-[1.08] z-20" : "bg-white border-zinc-200 shadow-sm")} />
              <div className={cn("absolute top-[-10px] left-[-10px] w-12 h-12 transition-all duration-[800ms] border rounded-sm", sd.onThird ? "bg-zinc-900 border-zinc-950 shadow-2xl scale-[1.08] z-20" : "bg-white border-zinc-200 shadow-sm")} />

              {/* Pitcher Mound */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full bg-zinc-50 border border-zinc-100 flex items-center justify-center z-10 shadow-inner">
                 <div className="w-10 h-[1px] bg-zinc-200 rotate-[-45deg]" />
              </div>
           </div>
       </div>

    </div>
  );
}

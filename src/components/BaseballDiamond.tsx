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
    <div className="w-full flex-col md:flex-row flex items-center justify-between gap-8 md:gap-16 border border-zinc-200/60 bg-white rounded-[2rem] p-8 md:p-12 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
       
       <div className="flex-1 flex flex-col justify-center min-w-0 w-full">
          <div className="mb-8 flex items-center justify-between">
             <div className="flex items-center gap-3">
                 <span className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-red-50 text-red-600 border border-red-100">
                    <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse shadow-sm" />
                    <span className="text-[10px] sm:text-xs font-bold uppercase tracking-widest leading-none">Live</span>
                 </span>
                 {(inning && inningHalf) && (
                    <span className="text-xs font-bold text-zinc-500 uppercase tracking-[0.2em]">{inningHalf} {inning}</span>
                 )}
             </div>
          </div>

          <div className="flex flex-col gap-8 w-full">
            <div className="flex items-center justify-between w-full">
               <div className="text-3xl sm:text-4xl font-serif text-ink tracking-tight truncate flex-1 pr-4">{awayTeam}</div>
               <div className="text-5xl sm:text-6xl font-mono font-black text-ink tabular-nums">{awayScore || "0"}</div>
            </div>
            <div className="w-full h-px bg-zinc-100" />
            <div className="flex items-center justify-between w-full">
               <div className="text-3xl sm:text-4xl font-serif text-ink tracking-tight truncate flex-1 pr-4">{homeTeam}</div>
               <div className="text-5xl sm:text-6xl font-mono font-black text-ink tabular-nums">{homeScore || "0"}</div>
            </div>
          </div>
          
          {sd.lastPlay && (
            <div className="mt-8 bg-zinc-50 border border-zinc-100 rounded-2xl p-5 text-sm text-zinc-600 font-serif leading-relaxed">
              <span className="font-bold font-sans text-zinc-400 mr-3 uppercase tracking-[0.2em] text-[10px]">Play</span>
              {sd.lastPlay}
            </div>
          )}
       </div>

       {/* Right Side - Diamond */}
       <div className="flex flex-col justify-center items-center relative shrink-0">
           
           <div className="flex items-center gap-6 mb-8 px-6 py-3 bg-zinc-50 rounded-full border border-zinc-100 shadow-sm">
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Balls</span>
                <div className="flex gap-1.5">{[1,2,3,4].map(b => <span key={b} className={cn("w-2.5 h-2.5 rounded-full transition-colors border", b <= sd.balls ? "bg-[#2D4A3E] border-[#2D4A3E]" : "bg-white border-zinc-200")} />)}</div>
              </div>
              <div className="w-px h-8 bg-zinc-200" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Strikes</span>
                <div className="flex gap-1.5">{[1,2,3].map(s => <span key={s} className={cn("w-2.5 h-2.5 rounded-full transition-colors border", s <= sd.strikes ? "bg-red-500 border-red-500" : "bg-white border-zinc-200")} />)}</div>
              </div>
              <div className="w-px h-8 bg-zinc-200" />
              <div className="flex flex-col items-center gap-2">
                <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-400">Outs</span>
                <div className="flex gap-1.5">{[1,2,3].map(o => <span key={o} className={cn("w-2.5 h-2.5 rounded-full transition-colors border", o <= sd.outs ? "bg-red-500 border-red-500" : "bg-white border-zinc-200")} />)}</div>
              </div>
           </div>

           <div className="relative w-56 h-56 sm:w-72 sm:h-72 transform rotate-45 perspective-1000 origin-center bg-zinc-50/50 rounded-lg shadow-inner overflow-hidden border border-zinc-200">
              <div className="absolute inset-4 border-[3px] border-zinc-200/60 rounded-sm" />
              
              {/* Field Lines */}
              <div className="absolute top-1/2 left-1/2 w-[140%] h-px bg-zinc-200 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
              <div className="absolute top-1/2 left-1/2 h-[140%] w-px bg-zinc-200 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
              
              {/* Home */}
              <div className="absolute bottom-[-10px] left-[-10px] w-8 h-8 bg-white rounded-sm border-[3px] border-zinc-300 shadow-md transform rotate-45 z-10" />
              
              {/* First Base */}
              <div className={cn("absolute bottom-[-8px] right-[-8px] w-10 h-10 transition-all duration-500 border-[3px] rounded-sm", sd.onFirst ? "bg-[#2D4A3E] border-[#1E3027] shadow-[0_0_20px_rgba(45,74,62,0.4)] scale-110 z-20" : "bg-white border-zinc-300 shadow-sm")} />
              
              {/* Second Base */}
              <div className={cn("absolute top-[-8px] right-[-8px] w-10 h-10 transition-all duration-500 border-[3px] rounded-sm", sd.onSecond ? "bg-[#2D4A3E] border-[#1E3027] shadow-[0_0_20px_rgba(45,74,62,0.4)] scale-110 z-20" : "bg-white border-zinc-300 shadow-sm")} />
              
              {/* Third Base */}
              <div className={cn("absolute top-[-8px] left-[-8px] w-10 h-10 transition-all duration-500 border-[3px] rounded-sm", sd.onThird ? "bg-[#2D4A3E] border-[#1E3027] shadow-[0_0_20px_rgba(45,74,62,0.4)] scale-110 z-20" : "bg-white border-zinc-300 shadow-sm")} />

              {/* Pitcher Mound */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 rounded-full bg-zinc-100 border-2 border-zinc-200 flex items-center justify-center z-10 shadow-inner">
                 <div className="w-8 h-2 bg-white border border-zinc-200 rotate-[-45deg] rounded-sm shadow-sm" />
              </div>
           </div>
       </div>

    </div>
  );
}

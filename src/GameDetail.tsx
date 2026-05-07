import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { getEspnLogo } from "./App";
import { BaseballDiamond } from "./components/BaseballDiamond";

export default function GameDetail() {
  const { date, slug } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    const fetchGame = async () => {
      if (!slug) return;
      try {
        setLoading(true);
        // Extracts the ID if we had it, but usually we need to find it from the slug
        // Since our internal API might have it, let's look for the game
        const { data: allOdds } = await axios.get('/api/odds');
        const [awaySlug, homeSlug] = (slug || "").split("-at-");
        
        const matchedGame = allOdds.find((g: any) => {
           const hMatch = g.home_team.toLowerCase().replace(/[^a-z0-9]/g, "").includes(homeSlug.substring(0, 3));
           const aMatch = g.away_team.toLowerCase().replace(/[^a-z0-9]/g, "").includes(awaySlug.substring(0, 3));
           return hMatch && aMatch;
        });

        if (matchedGame) {
           const { data: detailData } = await axios.get(`/api/game-detail/${matchedGame.id}`);
           setData(detailData);
        } else {
           // Fallback to legacy if not found in current odds
           const formattedDate = date?.replace(/-/g, "");
           const sbUrl = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${formattedDate}`;
           const { data: sbData } = await axios.get(sbUrl);
           const event = sbData.events.find((e: any) => {
              const comp = e.competitions[0];
              const h = comp.competitors.find((c: any) => c.homeAway === "home");
              const a = comp.competitors.find((c: any) => c.homeAway === "away");
              return h.team.location.toLowerCase().includes(homeSlug.substring(0, 3));
           });
           if (event) {
             const { data: detailData } = await axios.get(`/api/game-detail/${event.id}`);
             setData(detailData);
           }
        }
      } catch (e: any) {
        console.error("Fetch failed", e);
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [date, slug]);

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-paper">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-zinc-900 border-t-transparent rounded-full animate-spin" />
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-zinc-400">Normalizing Vectors...</span>
      </div>
    </div>
  );
  if (!data) return null;
  
  // Normalized Mapping from our Internal API
  const { espn_summary, weather_vector } = data;
  const header = espn_summary.header;
  const boxscore = espn_summary.boxscore;
  const comp = header.competitions[0];
  const home = comp.competitors.find((c: any) => c.homeAway === "home");
  const away = comp.competitors.find((c: any) => c.homeAway === "away");

  return (
    <div className="flex flex-col w-full h-full bg-paper text-ink font-sans overflow-y-auto custom-scrollbar">
      <header className="flex items-center justify-between px-4 md:px-10 lg:px-12 py-6">
        <button onClick={() => navigate("/")} className="text-xs font-bold uppercase tracking-widest text-zinc-400 hover:text-ink transition-colors">Daily Board</button>
        <h1 className="text-sm font-bold tracking-tight">{away.team.shortDisplayName} @ {home.team.shortDisplayName}</h1>
        <div className="w-20"></div>
      </header>

      <main className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.4fr)_minmax(320px,0.6fr)] gap-8 px-6 md:px-10 lg:px-12 py-10">
        <section className="flex flex-col gap-8">
           <div className="bg-white border border-zinc-200/50 rounded-[2.5rem] p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
             <div className="flex items-center justify-between mb-10">
                <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300">Match Statistics</h2>
                <div className="px-3 py-1 rounded-full bg-zinc-50 border border-zinc-100 text-[10px] font-bold text-zinc-400">Technical Brief</div>
             </div>
             
             {weather_vector && (
               <div className="mb-12 flex items-center gap-3 p-4 rounded-2xl bg-zinc-50 border border-zinc-100">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-0.5">Atmosphere & Venue</div>
                    <div className="text-xs font-medium text-zinc-900 truncate">
                      {weather_vector.stadiumName} · {weather_vector.temp}°F · {weather_vector.description}
                    </div>
                  </div>
               </div>
             )}

             <div className="flex items-baseline gap-6 mb-12">
               <div className="text-6xl md:text-7xl font-mono font-black tabular-nums tracking-tighter text-zinc-900">{away.score} — {home.score}</div>
               <div className="text-xl font-black uppercase tracking-[0.25em] text-zinc-200">{header?.status?.type?.detail || "Upcoming"}</div>
             </div>
             
             <div className="mt-12 bg-zinc-50/30 rounded-[2rem] p-4 border border-zinc-100/50">
               <BaseballDiamond 
                 status={header?.status?.type?.state === "post" ? "final" : header?.status?.type?.state === "in" ? "live" : "upcoming"}
                 awayTeam={away.team.displayName}
                 homeTeam={home.team.displayName}
                 awayScore={away.score}
                 homeScore={home.score}
                 inning={comp.situation?.inning}
                 inningHalf={comp.situation?.inningHalf?.includes("Top") ? "Top" : "Bottom"}
                 situationDetail={comp.situation}
               />
             </div>
           </div>
        </section>

        <section className="flex flex-col gap-8">
          <div className="bg-white border border-zinc-200/50 rounded-[2.5rem] p-10 shadow-[0_4px_24px_rgba(0,0,0,0.02)]">
            <h2 className="text-[11px] font-black uppercase tracking-[0.3em] text-zinc-300 mb-10">Starting Lineup</h2>
            <div className="flex flex-col gap-6">
              <div className="group flex items-center gap-5 p-5 bg-zinc-50/50 hover:bg-zinc-50 rounded-3xl border border-zinc-100 transition-all duration-500">
                <div className="w-14 h-14 bg-white rounded-full border border-zinc-200 flex items-center justify-center font-black text-zinc-900 shadow-sm transition-transform duration-500 group-hover:scale-110">
                   {away.team.abbreviation}
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1.5">{away.team.shortDisplayName} Probable</div>
                  <div className="text-xl font-serif font-medium text-zinc-900">{boxscore.players?.find((p:any)=>p.team.id===away.team.id)?.statistics?.find((s:any)=>s?.type==='pitching')?.athletes?.[0]?.athlete.shortName || "TBA"}</div>
                </div>
              </div>

              <div className="group flex items-center gap-5 p-5 bg-zinc-50/50 hover:bg-zinc-50 rounded-3xl border border-zinc-100 transition-all duration-500">
                <div className="w-14 h-14 bg-white rounded-full border border-zinc-200 flex items-center justify-center font-black text-zinc-900 shadow-sm transition-transform duration-500 group-hover:scale-110">
                   {home.team.abbreviation}
                </div>
                <div>
                  <div className="text-[9px] font-black uppercase tracking-[0.2em] text-zinc-400 mb-1.5">{home.team.shortDisplayName} Probable</div>
                  <div className="text-xl font-serif font-medium text-zinc-900">{boxscore.players?.find((p:any)=>p.team.id===home.team.id)?.statistics?.find((s:any)=>s?.type==='pitching')?.athletes?.[0]?.athlete.shortName || "TBA"}</div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

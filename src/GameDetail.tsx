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
      try {
        setLoading(true);
        const formattedDate = date?.replace(/-/g, "");
        const sbUrl = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/scoreboard?dates=${formattedDate}`;
        const { data: sbData } = await axios.get(sbUrl);
        const [awaySlug, homeSlug] = (slug || "").split("-at-");
        const event = sbData.events.find((e: any) => {
           const comp = e.competitions[0];
           const home = comp.competitors.find((c: any) => c.homeAway === "home");
           const away = comp.competitors.find((c: any) => c.homeAway === "away");
           const hMatch = home.team.location.toLowerCase().replace(/[^a-z0-9]/g, "").includes(homeSlug.substring(0, 3));
           const aMatch = away.team.location.toLowerCase().replace(/[^a-z0-9]/g, "").includes(awaySlug.substring(0, 3));
           return hMatch && aMatch;
        }) || sbData.events[0];
        if (!event) return;
        const sumUrl = `https://site.api.espn.com/apis/site/v2/sports/baseball/mlb/summary?event=${event.id}`;
        const { data: sumData } = await axios.get(sumUrl);
        setData({ ...sumData, event });
      } catch (e: any) {
        
      } finally {
        setLoading(false);
      }
    };
    fetchGame();
  }, [date, slug]);

  if (loading) return null;
  if (!data) return null;
  
  const { header, boxscore, event } = data;
  const comp = header.competitions[0];
  const home = comp.competitors.find((c: any) => c.homeAway === "home");
  const away = comp.competitors.find((c: any) => c.homeAway === "away");

  return (
    <div className="flex flex-col w-full h-full bg-[#fdf9f0] text-[#1a1a1a] font-sans">
      <header className="flex items-center justify-between px-8 py-6">
        <button onClick={() => navigate("/")} className="text-xs font-bold uppercase tracking-widest text-[#888888]">Daily Board</button>
        <h1 className="text-sm font-bold tracking-tight">{away.team.shortDisplayName} @ {home.team.shortDisplayName}</h1>
        <div className="w-20"></div>
      </header>

      <main className="flex flex-row gap-8 px-8 py-8 overflow-x-auto h-full">
        <section className="flex flex-col gap-4 min-w-[320px]">
           <h2 className="text-xs font-bold uppercase tracking-widest text-[#888888]">Game Status</h2>
           <div className="text-5xl font-mono font-semibold tabular-nums">{away.score} — {home.score}</div>
           <div className="text-xl font-medium tracking-tight">{header?.status?.type?.detail || "TBA"}</div>
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
        </section>

        <section className="flex flex-col gap-4 min-w-[320px]">
          <h2 className="text-xs font-bold uppercase tracking-widest text-[#888888]">Pitching</h2>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold">{away.team.shortDisplayName} Pitcher</div>
            <div className="font-mono text-sm">{boxscore.players?.find((p:any)=>p.team.id===away.team.id)?.statistics?.find((s:any)=>s?.type==='pitching')?.athletes?.[0]?.athlete.shortName || "TBA"}</div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-sm font-semibold">{home.team.shortDisplayName} Pitcher</div>
            <div className="font-mono text-sm">{boxscore.players?.find((p:any)=>p.team.id===home.team.id)?.statistics?.find((s:any)=>s?.type==='pitching')?.athletes?.[0]?.athlete.shortName || "TBA"}</div>
          </div>
        </section>
      </main>
    </div>
  );
}

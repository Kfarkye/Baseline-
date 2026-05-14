import re

with open("/Users/k.far.88/Desktop/Baseline-/src/App.tsx", "r") as f:
    content = f.read()

# 1. PitcherDisplay
pitcher_display_old = """function PitcherDisplay({ teamFull, headshot, name, record, alignRight = false, small = false }: { teamFull: string, headshot?: string, name?: string, record?: string, alignRight?: boolean, small?: boolean }) {
  const teamAbbr = MLB_TEAM_MAP[teamFull as keyof typeof MLB_TEAM_MAP] || teamFull.substring(0, 3);
  const fallbackImg = `https://api.dicebear.com/7.x/initials/svg?seed=${name || 'TBA'}&backgroundColor=e4e4e7&textColor=52525b`;

  return (
    <div className={`flex items-center gap-3 ${alignRight ? 'justify-end flex-row-reverse text-right' : ''}`}>
      <div className={`${small ? 'w-8 h-8' : 'w-10 h-10'} rounded-full overflow-hidden bg-zinc-100 shrink-0 shadow-sm border border-zinc-200`}>
        <img 
            src={headshot || fallbackImg} 
            className="w-full h-full object-cover scale-110" 
            alt={name || 'TBA'} 
        />
      </div>
      <div className={`flex flex-col ${alignRight ? 'items-end' : ''}`}>
        <div className={`flex items-center gap-1.5 mb-0.5 ${alignRight ? 'flex-row-reverse' : ''}`}>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest">{teamAbbr.toUpperCase()}</span>
        </div>
        <span className={`${small ? 'text-xs' : 'text-sm'} font-semibold text-zinc-700 leading-none mb-1`}>{name || '—'}</span>
        <span className="text-[10px] font-mono text-zinc-800">{!record || record === '0' || record === '0-0' || record === '0.00 ERA' || record === 'N/A' || record === '0.0%' ? '—' : record}</span>
      </div>
    </div>
  );
}"""

pitcher_display_new = """function PitcherDisplay({ teamFull, headshot, name, record, alignRight = false, small = false, dark = false }: { teamFull: string, headshot?: string, name?: string, record?: string, alignRight?: boolean, small?: boolean, dark?: boolean }) {
  const teamAbbr = MLB_TEAM_MAP[teamFull as keyof typeof MLB_TEAM_MAP] || teamFull.substring(0, 3);
  const fallbackImg = `https://api.dicebear.com/7.x/initials/svg?seed=${name || 'TBA'}&backgroundColor=e4e4e7&textColor=52525b`;

  return (
    <div className={`flex items-center gap-3 ${alignRight ? 'justify-end flex-row-reverse text-right' : ''}`}>
      <div className={cn(
         small ? 'w-8 h-8' : 'w-10 h-10',
         "rounded-full overflow-hidden shrink-0 shadow-sm transition-colors",
         dark ? "bg-black/20 border border-white/10" : "bg-zinc-100 border border-zinc-200"
      )}>
        <img 
            src={headshot || fallbackImg} 
            className="w-full h-full object-cover scale-110" 
            alt={name || 'TBA'} 
        />
      </div>
      <div className={`flex flex-col ${alignRight ? 'items-end' : ''}`}>
        <div className={`flex items-center gap-1.5 mb-0.5 ${alignRight ? 'flex-row-reverse' : ''}`}>
          <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-widest font-mono">{teamAbbr.toUpperCase()}</span>
        </div>
        <span className={cn(
            small ? 'text-xs' : 'text-sm',
            "font-semibold leading-none mb-1",
            dark ? "text-zinc-200" : "text-zinc-700"
        )}>{name || '—'}</span>
        <span className={cn("text-[10px] font-mono", dark ? "text-zinc-400" : "text-zinc-800")}>
            {!record || record === '0' || record === '0-0' || record === '0.00 ERA' || record === 'N/A' || record === '0.0%' ? '—' : record}
        </span>
      </div>
    </div>
  );
}"""

content = content.replace(pitcher_display_old, pitcher_display_new)

# 2. Daily Board Wrapper Tab
daily_board_old = """               {activeTab === 'odds' && (
                 <motion.div 
                   key="odds"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="h-full p-4 sm:p-6 xl:p-10 overflow-y-auto custom-scrollbar"
                 >
                   <div className="max-w-5xl mx-auto space-y-10">
                     <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-100 pb-7">
                       <div>
                         <h2 className="text-3xl sm:text-4xl serif-italic font-medium text-ink tracking-tight mb-4">The Daily Board</h2>
                         <div className="flex items-center gap-2 bg-zinc-50/50 p-1 rounded-lg border border-zinc-100 inline-flex">
                           {['previous', 'today', 'tomorrow'].map(filter => (
                             <button
                               key={filter}
                               onClick={() => setSlateFilter(filter as any)}
                               className={cn(
                                 "text-[11px] uppercase tracking-widest font-bold px-6 py-2 rounded-md transition-all",
                                 slateFilter === filter 
                                   ? "bg-white text-brand shadow-sm ring-1 ring-zinc-200/50" 
                                   : "text-zinc-500 hover:text-ink hover:bg-zinc-100/50"
                               )}
                             >
                               {filter}
                             </button>
                           ))}
                         </div>
                       </div>
                       <button 
                         onClick={refreshOdds}
                         className="flex items-center gap-2 group text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-ink transition-colors"
                       >
                         <RefreshCw size={12} className={isTyping ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} strokeWidth={2} />
                         Refresh Feed
                       </button>
                     </div>

                     <div className="grid md:grid-cols-2 gap-5 md:gap-6 mt-2">
                       {fullSlate.map((odd) => (
                         <OddsCard 
                           key={odd.id} 
                           odd={odd} 
                           onClick={() => {
                             setActiveTab('chat');
                             setInputText(`Analysis for ${odd.away_team} vs ${odd.home_team}?`);
                             setTimeout(() => {
                                (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
                             }, 100);
                           }} 
                         />
                       ))}
                       {isLoadingOdds ? (
                          <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-zinc-200 rounded-xl space-y-4">
                             <RefreshCw className="animate-spin text-zinc-300" size={24} />
                             <p className="text-zinc-500 italic serif">Hydrating market data...</p>
                          </div>
                       ) : fullSlate.length === 0 ? (
                          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-zinc-200 rounded-xl">
                             <p className="text-zinc-600 font-medium mb-1">No games today.</p>
                             <p className="text-zinc-500 text-sm">Check back tomorrow.</p>
                          </div>
                       ) : null}
                     </div>
                   </div>
                 </motion.div>
               )}"""

daily_board_new = """               {activeTab === 'odds' && (
                 <motion.div 
                   key="odds"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="h-full p-4 sm:p-6 xl:p-10 overflow-y-auto custom-scrollbar bg-[#050505] selection:bg-brand/30"
                 >
                   <div className="max-w-5xl mx-auto space-y-10">
                     <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-white/[0.08] pb-7">
                       <div>
                         <h2 className="text-3xl sm:text-4xl serif-italic font-medium text-white tracking-tight mb-4">The Daily Board</h2>
                         <div className="flex items-center gap-2 bg-white/[0.02] p-1 rounded-lg border border-white/[0.05] inline-flex">
                           {['previous', 'today', 'tomorrow'].map(filter => (
                             <button
                               key={filter}
                               onClick={() => setSlateFilter(filter as any)}
                               className={cn(
                                 "text-[10px] uppercase tracking-widest font-bold px-6 py-2 rounded-md transition-all font-mono",
                                 slateFilter === filter 
                                   ? "bg-white/[0.1] text-white shadow-sm ring-1 ring-white/10" 
                                   : "text-zinc-500 hover:text-white hover:bg-white/[0.05]"
                               )}
                             >
                               {filter}
                             </button>
                           ))}
                         </div>
                       </div>
                       <button 
                         onClick={refreshOdds}
                         className="flex items-center gap-2 group text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-white transition-colors font-mono"
                       >
                         <RefreshCw size={12} className={isTyping ? "animate-spin" : "group-hover:rotate-180 transition-transform duration-500"} strokeWidth={2} />
                         Refresh Feed
                       </button>
                     </div>

                     <div className="grid md:grid-cols-2 gap-5 md:gap-6 mt-2">
                       {fullSlate.map((odd) => (
                         <OddsCard 
                           key={odd.id} 
                           odd={odd} 
                           onClick={() => {
                             setActiveTab('chat');
                             setInputText(`Analysis for ${odd.away_team} vs ${odd.home_team}?`);
                             setTimeout(() => {
                                (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
                             }, 100);
                           }} 
                         />
                       ))}
                       {isLoadingOdds ? (
                          <div className="col-span-full py-16 flex flex-col items-center justify-center border border-dashed border-white/[0.1] rounded-xl space-y-4">
                             <RefreshCw className="animate-spin text-zinc-500" size={24} />
                             <p className="text-zinc-400 italic serif">Hydrating market data...</p>
                          </div>
                       ) : fullSlate.length === 0 ? (
                          <div className="col-span-full py-20 flex flex-col items-center justify-center text-center border border-dashed border-white/[0.1] rounded-xl">
                             <p className="text-zinc-400 font-medium mb-1">No games today.</p>
                             <p className="text-zinc-500 text-sm">Check back tomorrow.</p>
                          </div>
                       ) : null}
                     </div>
                   </div>
                 </motion.div>
               )}"""

content = content.replace(daily_board_old, daily_board_new)

# 3. OddsCard
odds_card_old = """function OddsCard({ odd, onClick }: { odd: SportOdds, onClick?: () => void }) {
  const getLogo = getEspnLogo;
  const homePrice = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name))?.price || 0;
  const awayPrice = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name))?.price || 0;
  const totalsInfo = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'totals');
  const totalPoint = totalsInfo?.outcomes?.find(o => o.name === 'Over')?.point || "-";

  return (
    <button 
      onClick={onClick}
      className="block relative outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 rounded-2xl w-full text-left"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "bg-white border rounded-2xl p-5 sm:p-6 space-y-6 group transition-all cursor-pointer h-full card-hover",
          odd.status === 'live' ? "border-brand/40 bg-brand/5" : "border-zinc-100 hover:border-zinc-200"
        )}
      >
        <div className="flex justify-between items-start">
           <div className="space-y-1 flex items-center gap-3">
              {odd.status === 'live' && <span className="w-2 h-2 rounded-full bg-brand live-pulse shrink-0" />}
              <span className="text-[8px] text-zinc-500 uppercase tracking-[0.4em] font-bold">
                 {odd.sport_title} {odd.status === 'live' ? '• LIVE' : odd.status === 'final' ? '• FINAL' : `• ${new Date(odd.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
              </span>
           </div>
        </div>
        <div>
           <h4 className="text-2xl serif-italic font-medium text-ink tracking-tight">{odd.away_team.split(' ').pop()} @ {odd.home_team.split(' ').pop()}</h4>
        </div>

        <div className="space-y-6">
         {odd.status !== 'final' && odd.bookmakers?.length ? (
           <>
             <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
               <img src={getLogo(odd.away_team)} className="w-8 h-8 rounded-full shadow-sm ring-1 ring-zinc-200 group-hover:scale-110 transition-transform duration-300" alt="" />
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-ink">{odd.away_team}</span>
                 <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Moneyline</span>
               </div>
               <PriceTag price={awayPrice} />
             </div>

             <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
               <img src={getLogo(odd.home_team)} className="w-8 h-8 rounded-full shadow-sm ring-1 ring-zinc-200 group-hover:scale-110 transition-transform duration-300" alt="" />
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-ink">{odd.home_team}</span>
                 <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Moneyline</span>
               </div>
               <PriceTag price={homePrice} />
             </div>
           </>
         ) : odd.status !== 'final' ? (
           <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 px-3 py-4">
             <span className="text-[10px] uppercase tracking-widest text-zinc-500">
               {describeOddsLine(odd) || "ESPN checked. Market line not found yet."}
             </span>
           </div>
         ) : null}

         {/* Pitcher Matchup */}
         {(odd.home_pitcher || odd.away_pitcher) && (
           <div className="w-full mt-6 pt-6 border-t border-zinc-50 transition-opacity">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-1.5 rotate-45 bg-[#2D4A3E] shrink-0 opacity-80" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Pitching Matchup</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <PitcherDisplay 
                teamFull={odd.away_team} 
                name={odd.away_pitcher} 
                headshot={odd.away_pitcher_headshot} 
                record={odd.away_pitcher_record} 
              />
              <PitcherDisplay 
                teamFull={odd.home_team} 
                name={odd.home_pitcher} 
                headshot={odd.home_pitcher_headshot} 
                record={odd.home_pitcher_record} 
                alignRight 
              />
            </div>
          </div>
         )}
      </div>

      <div className="pt-6 border-t border-zinc-50">
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {odd.status !== 'final' && odd.bookmakers?.length ? (
            <div className="space-y-1">
               <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest">Total</span>
               <span className="font-mono text-xs font-bold text-zinc-500">{totalPoint}</span>
            </div>
            ) : null}
            <div className="space-y-1">
               <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{odd.away_team.split(' ').pop()} Last 10</span>
               <span className="font-mono text-xs font-bold text-zinc-500">6-4 U</span>
            </div>
            <div className="space-y-1">
               <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest">{odd.home_team.split(' ').pop()} Last 10</span>
               <span className="font-mono text-xs font-bold text-zinc-500">7-3 U</span>
            </div>
         </div>
      </div>
    </motion.div>
    </button>
  );
}"""

odds_card_new = """function OddsCard({ odd, onClick }: { odd: SportOdds, onClick?: () => void }) {
  const getLogo = getEspnLogo;
  const homePrice = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name))?.price || 0;
  const awayPrice = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name))?.price || 0;
  const totalsInfo = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'totals');
  const totalPoint = totalsInfo?.outcomes?.find(o => o.name === 'Over')?.point || "-";

  return (
    <button 
      onClick={onClick}
      className="block relative outline-none rounded-2xl w-full text-left group overflow-hidden"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden p-5 sm:p-6 space-y-6 transition-all duration-500 cursor-pointer h-full",
          "bg-white/[0.025] backdrop-blur-[24px] backdrop-saturate-[180%]",
          "border-t border-white/[0.08] border-b border-black/50 border-x border-white/[0.04]",
          "shadow-[inset_0_1px_0_rgba(255,255,255,0.05)] rounded-2xl hover:bg-white/[0.04] active:bg-white/[0.02]"
        )}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(255,255,255,0.05)_0%,transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

        <div className="flex justify-between items-start relative z-10">
           <div className="space-y-1 flex items-center gap-3">
              {odd.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 live-pulse shrink-0 shadow-[0_0_8px_rgba(16,185,129,0.8)]" />}
              <span className="text-[10px] text-zinc-400 uppercase tracking-[0.4em] font-bold font-mono">
                 {odd.sport_title} {odd.status === 'live' ? '• LIVE' : odd.status === 'final' ? '• FINAL' : `• ${new Date(odd.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
              </span>
           </div>
        </div>
        
        <div className="relative z-10">
           <h4 className="text-2xl font-serif text-white tracking-tight">{odd.away_team.split(' ').pop()} @ {odd.home_team.split(' ').pop()}</h4>
        </div>

        <div className="space-y-6 relative z-10">
         {odd.status !== 'final' && odd.bookmakers?.length ? (
           <>
             <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
               <img src={getLogo(odd.away_team)} className="w-8 h-8 rounded-full shadow-sm ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300" alt="" />
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-zinc-200">{odd.away_team}</span>
                 <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Moneyline</span>
               </div>
               <PriceTag price={awayPrice} dark />
             </div>

             <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
               <img src={getLogo(odd.home_team)} className="w-8 h-8 rounded-full shadow-sm ring-1 ring-white/10 group-hover:scale-110 transition-transform duration-300" alt="" />
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-zinc-200">{odd.home_team}</span>
                 <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Moneyline</span>
               </div>
               <PriceTag price={homePrice} dark />
             </div>
           </>
         ) : odd.status !== 'final' ? (
           <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-4">
             <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-mono">
               {describeOddsLine(odd) || "ESPN checked. Market line not found yet."}
             </span>
           </div>
         ) : null}

         {/* Pitcher Matchup */}
         {(odd.home_pitcher || odd.away_pitcher) && (
           <div className="w-full mt-6 pt-6 border-t border-white/[0.08] transition-opacity">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-1.5 h-1.5 rotate-45 bg-zinc-500 shrink-0 opacity-80" />
              <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 font-mono">Pitching Matchup</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <PitcherDisplay 
                teamFull={odd.away_team} 
                name={odd.away_pitcher} 
                headshot={odd.away_pitcher_headshot} 
                record={odd.away_pitcher_record} 
                dark
              />
              <PitcherDisplay 
                teamFull={odd.home_team} 
                name={odd.home_pitcher} 
                headshot={odd.home_pitcher_headshot} 
                record={odd.home_pitcher_record} 
                alignRight 
                dark
              />
            </div>
          </div>
         )}
      </div>

      <div className="pt-6 border-t border-white/[0.08] relative z-10">
         <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-8">
            {odd.status !== 'final' && odd.bookmakers?.length ? (
            <div className="space-y-1">
               <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest font-mono">Total</span>
               <span className="font-mono text-xs font-bold text-zinc-400">{totalPoint}</span>
            </div>
            ) : null}
            <div className="space-y-1">
               <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest font-mono">{odd.away_team.split(' ').pop()} Last 10</span>
               <span className="font-mono text-xs font-bold text-zinc-400">6-4 U</span>
            </div>
            <div className="space-y-1">
               <span className="block text-[8px] text-zinc-500 uppercase font-bold tracking-widest font-mono">{odd.home_team.split(' ').pop()} Last 10</span>
               <span className="font-mono text-xs font-bold text-zinc-400">7-3 U</span>
            </div>
         </div>
      </div>
    </motion.div>
    </button>
  );
}"""

content = content.replace(odds_card_old, odds_card_new)

# 4. PriceTag
pricetag_old = """function PriceTag({ price }: { price: number | string }) {
  if (price === 0 || price === "N/A" || !price) return <span className="opacity-0">-</span>;
  const displayPrice = typeof price === 'number' ? (price > 0 ? `+${price}` : price.toString()) : price;
  
  return (
    <div className="font-mono font-medium text-sm text-ink tracking-tight bg-white shadow-sm border border-zinc-100 rounded-md px-2 py-1 min-w-[50px] text-center">
       {displayPrice}
    </div>
  );
}"""

pricetag_new = """function PriceTag({ price, dark }: { price: number | string, dark?: boolean }) {
  if (price === 0 || price === "N/A" || !price) return <span className="opacity-0">-</span>;
  const displayPrice = typeof price === 'number' ? (price > 0 ? `+${price}` : price.toString()) : price;
  
  return (
    <div className={cn(
      "font-mono font-medium text-sm tracking-tight rounded-md px-2 py-1 min-w-[50px] text-center",
      dark 
        ? "bg-white/[0.05] text-white border border-white/[0.1] shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]" 
        : "bg-white text-ink border border-zinc-100 shadow-sm"
    )}>
       {displayPrice}
    </div>
  );
}"""

content = content.replace(pricetag_old, pricetag_new)

# 5. GameDetailView
game_detail_old = """function GameDetailView({ odds }: { odds: SportOdds[] }) {
  const { gameId } = useParams();
  const odd = odds.find(o => o.id === gameId);
  const navigate = useNavigate();

  const homePrice = odd?.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name))?.price || 0;
  const awayPrice = odd?.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name))?.price || 0;
  const totalsInfo = odd?.bookmakers?.[0]?.markets?.find(m => m.key === 'totals');
  const totalPoint = totalsInfo?.outcomes?.find(o => o.name === 'Over')?.point || "-";

  if (!odd) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500">
        <p>Game not found.</p>
        <button className="mt-4 text-brand hover:underline" onClick={() => navigate('/')}>Back to Board</button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar p-4 sm:p-6 xl:p-10 bg-white">
      <div className="max-w-4xl mx-auto w-full">
        <button className="text-[10px] items-center flex gap-2 font-bold uppercase tracking-widest text-zinc-500 hover:text-ink mb-8 transition-colors" onClick={() => navigate('/')}>
          <ChevronRight size={14} className="rotate-180" /> Back to Daily Board
        </button>

        <h1 className="text-3xl sm:text-5xl font-medium serif-italic text-ink mb-6">{odd.away_team} @ {odd.home_team}</h1>
        
        <div className="flex items-center gap-4 mb-12">
           <span className={cn("px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest", odd.status === 'live' ? "bg-brand text-white animate-pulse" : "bg-zinc-100 text-zinc-500")}>
             {odd.status === 'live' ? 'LIVE' : (odd.status === 'final' ? 'FINAL' : 'UPCOMING')}
           </span>
           <span className="text-sm font-mono text-zinc-500">{new Date(odd.commence_time).toLocaleString()} • {odd.venue || "TBA"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-t border-zinc-100 pt-10">
            <div className="flex flex-col gap-6">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Away Side</span>
                <div className="flex items-center gap-4">
                  <img src={getEspnLogo(odd.away_team)} className="w-16 h-16 rounded-full border border-zinc-100" alt="" />
                  <div>
                     <div className="flex items-center gap-3">
                       <h3 className="text-2xl serif text-ink">{odd.away_team}</h3>
                       {odd.status !== 'final' && <PriceTag price={awayPrice} />}
                     </div>
                     <p className="font-mono text-zinc-500 mt-1">{odd.score ? `Score: ${odd.away_score}` : ''}</p>
                  </div>
                </div>
            </div>
            <div className="flex flex-col gap-6 text-right items-end">
                 <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest">Home Side</span>
                 <div className="flex items-center gap-4 flex-row-reverse">
                   <img src={getEspnLogo(odd.home_team)} className="w-16 h-16 rounded-full border border-zinc-100" alt="" />
                   <div className="flex flex-col items-end">
                       <div className="flex items-center gap-3 flex-row-reverse">
                         <h3 className="text-2xl serif text-ink">{odd.home_team}</h3>
                         {odd.status !== 'final' && <PriceTag price={homePrice} />}
                       </div>
                       <p className="font-mono text-zinc-500 mt-1">{odd.score ? `Score: ${odd.home_score}` : ''}</p>
                   </div>
                 </div>
            </div>
        </div>

        <div className="flex justify-center mt-8 mb-4">
          <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-4 sm:px-6 py-4 flex items-center gap-6 sm:gap-12 font-mono text-sm">
             <div className="flex flex-col items-center">
                 <span className="text-[10px] text-zinc-500 font-sans font-bold uppercase mb-1">Total</span>
                 <span className="text-ink font-bold">{totalPoint !== "-" ? `O/U ${totalPoint}` : "—"}</span>
             </div>
             <div className="flex flex-col items-center">
                 <span className="text-[10px] text-zinc-500 font-sans font-bold uppercase mb-1">Status</span>
                 <span className="text-brand font-bold">{odd.status === 'final' ? 'Final' : (odd.situation || 'Pregame')}</span>
             </div>
          </div>
        </div>

        {(odd.away_pitcher || odd.home_pitcher) && (
            <div className="mt-10 sm:mt-16 bg-zinc-50 p-6 sm:p-8 rounded-xl border border-zinc-100">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mb-8 flex items-center gap-3">
                 <div className="w-2 h-2 rotate-45 bg-[#2D4A3E]" />
                 Pitching Matchup
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                   <div className="flex flex-col gap-2">
                       <span className="text-sm font-bold text-zinc-500 uppercase">{odd.away_team.split(' ').pop()} (A)</span>
                       <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                           <img src={odd.away_pitcher_headshot || `https://api.dicebear.com/7.x/initials/svg?seed=${odd.away_pitcher || 'TBA'}&backgroundColor=e4e4e7&textColor=52525b`} alt={odd.away_pitcher} className="w-full h-full object-cover scale-110" />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-2xl font-serif text-ink tracking-tight">{odd.away_pitcher || "TBA"}</span>
                           <span className="font-mono text-sm text-zinc-500">{odd.away_pitcher_record || "No record data"}</span>
                         </div>
                       </div>
                   </div>
                   <div className="flex flex-col gap-2 text-right items-end">
                       <span className="text-sm font-bold text-zinc-500 uppercase">{odd.home_team.split(' ').pop()} (H)</span>
                       <div className="flex items-center gap-3 flex-row-reverse">
                         <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                           <img src={odd.home_pitcher_headshot || `https://api.dicebear.com/7.x/initials/svg?seed=${odd.home_pitcher || 'TBA'}&backgroundColor=e4e4e7&textColor=52525b`} alt={odd.home_pitcher} className="w-full h-full object-cover scale-110" />
                         </div>
                         <div className="flex flex-col text-right">
                           <span className="text-2xl font-serif text-ink tracking-tight">{odd.home_pitcher || "TBA"}</span>
                           <span className="font-mono text-sm text-zinc-500">{odd.home_pitcher_record || "No record data"}</span>
                         </div>
                       </div>
                   </div>
               </div>
            </div>
        )}
      </div>
    </div>
  );
}"""

game_detail_new = """function GameDetailView({ odds }: { odds: SportOdds[] }) {
  const { gameId } = useParams();
  const odd = odds.find(o => o.id === gameId);
  const navigate = useNavigate();

  const homePrice = odd?.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name))?.price || 0;
  const awayPrice = odd?.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name))?.price || 0;
  const totalsInfo = odd?.bookmakers?.[0]?.markets?.find(m => m.key === 'totals');
  const totalPoint = totalsInfo?.outcomes?.find(o => o.name === 'Over')?.point || "-";

  if (!odd) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-500 bg-[#050505]">
        <p>Game not found.</p>
        <button className="mt-4 text-white hover:underline" onClick={() => navigate('/')}>Back to Board</button>
      </div>
    );
  }

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar p-4 sm:p-6 xl:p-10 bg-[#050505]">
      <div className="max-w-4xl mx-auto w-full">
        <button className="text-[10px] items-center flex gap-2 font-bold uppercase tracking-widest text-zinc-500 hover:text-white mb-8 transition-colors font-mono" onClick={() => navigate('/')}>
          <ChevronRight size={14} className="rotate-180" /> Back to Daily Board
        </button>

        <h1 className="text-3xl sm:text-5xl font-medium serif-italic text-white mb-6">{odd.away_team} @ {odd.home_team}</h1>
        
        <div className="flex items-center gap-4 mb-12">
           <span className={cn("px-4 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest font-mono", odd.status === 'live' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 animate-pulse" : "bg-white/[0.05] text-zinc-400 border border-white/[0.1]")}>
             {odd.status === 'live' ? 'LIVE' : (odd.status === 'final' ? 'FINAL' : 'UPCOMING')}
           </span>
           <span className="text-[10px] font-mono text-zinc-500 tracking-widest uppercase">{new Date(odd.commence_time).toLocaleString()} • {odd.venue || "TBA"}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-t border-white/[0.08] pt-10">
            <div className="flex flex-col gap-6">
                <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest font-mono">Away Side</span>
                <div className="flex items-center gap-4">
                  <img src={getEspnLogo(odd.away_team)} className="w-16 h-16 rounded-full border border-white/[0.08]" alt="" />
                  <div>
                     <div className="flex items-center gap-3">
                       <h3 className="text-2xl serif text-white">{odd.away_team}</h3>
                       {odd.status !== 'final' && <PriceTag price={awayPrice} dark />}
                     </div>
                     <p className="font-mono text-zinc-400 mt-1">{odd.score ? `Score: ${odd.away_score}` : ''}</p>
                  </div>
                </div>
            </div>
            <div className="flex flex-col gap-6 text-right items-end">
                 <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-widest font-mono">Home Side</span>
                 <div className="flex items-center gap-4 flex-row-reverse">
                   <img src={getEspnLogo(odd.home_team)} className="w-16 h-16 rounded-full border border-white/[0.08]" alt="" />
                   <div className="flex flex-col items-end">
                       <div className="flex items-center gap-3 flex-row-reverse">
                         <h3 className="text-2xl serif text-white">{odd.home_team}</h3>
                         {odd.status !== 'final' && <PriceTag price={homePrice} dark />}
                       </div>
                       <p className="font-mono text-zinc-400 mt-1">{odd.score ? `Score: ${odd.home_score}` : ''}</p>
                   </div>
                 </div>
            </div>
        </div>

        <div className="flex justify-center mt-8 mb-4">
          <div className="bg-white/[0.02] border border-white/[0.05] rounded-lg px-4 sm:px-6 py-4 flex items-center gap-6 sm:gap-12 font-mono text-sm">
             <div className="flex flex-col items-center">
                 <span className="text-[10px] text-zinc-500 font-bold uppercase mb-1 tracking-widest">Total</span>
                 <span className="text-white font-bold">{totalPoint !== "-" ? `O/U ${totalPoint}` : "—"}</span>
             </div>
             <div className="flex flex-col items-center">
                 <span className="text-[10px] text-zinc-500 font-bold uppercase mb-1 tracking-widest">Status</span>
                 <span className="text-zinc-300 font-bold">{odd.status === 'final' ? 'Final' : (odd.situation || 'Pregame')}</span>
             </div>
          </div>
        </div>

        {(odd.away_pitcher || odd.home_pitcher) && (
            <div className="mt-10 sm:mt-16 bg-white/[0.02] p-6 sm:p-8 rounded-xl border border-white/[0.05]">
               <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500 mb-8 flex items-center gap-3 font-mono">
                 <div className="w-2 h-2 rotate-45 bg-zinc-500" />
                 Pitching Matchup
               </h3>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 items-start">
                   <div className="flex flex-col gap-2">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">{odd.away_team.split(' ').pop()} (A)</span>
                       <div className="flex items-center gap-3">
                         <div className="w-12 h-12 rounded-full overflow-hidden bg-black/20 shrink-0 border border-white/[0.08]">
                           <img src={odd.away_pitcher_headshot || `https://api.dicebear.com/7.x/initials/svg?seed=${odd.away_pitcher || 'TBA'}&backgroundColor=e4e4e7&textColor=52525b`} alt={odd.away_pitcher} className="w-full h-full object-cover scale-110" />
                         </div>
                         <div className="flex flex-col">
                           <span className="text-2xl font-serif text-white tracking-tight">{odd.away_pitcher || "TBA"}</span>
                           <span className="font-mono text-sm text-zinc-400">{odd.away_pitcher_record || "No record data"}</span>
                         </div>
                       </div>
                   </div>
                   <div className="flex flex-col gap-2 text-right items-end">
                       <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest font-mono">{odd.home_team.split(' ').pop()} (H)</span>
                       <div className="flex items-center gap-3 flex-row-reverse">
                         <div className="w-12 h-12 rounded-full overflow-hidden bg-black/20 shrink-0 border border-white/[0.08]">
                           <img src={odd.home_pitcher_headshot || `https://api.dicebear.com/7.x/initials/svg?seed=${odd.home_pitcher || 'TBA'}&backgroundColor=e4e4e7&textColor=52525b`} alt={odd.home_pitcher} className="w-full h-full object-cover scale-110" />
                         </div>
                         <div className="flex flex-col text-right">
                           <span className="text-2xl font-serif text-white tracking-tight">{odd.home_pitcher || "TBA"}</span>
                           <span className="font-mono text-sm text-zinc-400">{odd.home_pitcher_record || "No record data"}</span>
                         </div>
                       </div>
                   </div>
               </div>
            </div>
        )}
      </div>
    </div>
  );
}"""

content = content.replace(game_detail_old, game_detail_new)

with open("/Users/k.far.88/Desktop/Baseline-/src/App.tsx", "w") as f:
    f.write(content)


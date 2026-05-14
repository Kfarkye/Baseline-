import re
import os

APP_PATH = '/Users/k.far.88/Desktop/Baseline-/src/App.tsx'
CSS_PATH = '/Users/k.far.88/Desktop/Baseline-/src/index.css'

with open(APP_PATH, 'r') as f:
    app_code = f.read()

# 1. Update Global Colors
replacements = {
    'bg-[#050505]': 'bg-[#FAFAFA]',
    'text-zinc-100': 'text-zinc-900',
    'text-white': 'text-zinc-900',
    'text-zinc-200': 'text-zinc-800',
    'text-zinc-300': 'text-zinc-700',
    'text-zinc-400': 'text-zinc-600',
    'text-zinc-500': 'text-zinc-500',
    'border-white/[0.08]': 'border-black/[0.08]',
    'border-white/[0.04]': 'border-black/[0.04]',
    'border-white/[0.1]': 'border-black/[0.08]',
    'bg-white/[0.05]': 'bg-black/[0.04]',
    'bg-white/[0.04]': 'bg-white',
    'bg-white/[0.025]': 'bg-white',
    'bg-white/[0.02]': 'bg-white',
    'bg-black/50': 'bg-black/[0.04]',
    'bg-[#0A0A0A]': 'bg-white',
    'bg-[#1c1917]': 'bg-white',
    'bg-[#292524]': 'bg-zinc-50',
    'border-zinc-800': 'border-zinc-200',
    'shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]': 'shadow-[0_2px_12px_rgba(0,0,0,0.04)]',
    'bg-ink': 'bg-[#000000]',
    'bg-brand': 'bg-[#D95B30]', # Looking at image 1, the avatar has an orange/red background (K). Wait, maybe brand is black? Let's leave brand.
}

for old, new in replacements.items():
    app_code = app_code.replace(old, new)

# 2. Rewrite OddsCard to match the Image 1 structure
new_odds_card = """function OddsCard({ odd, onClick }: { odd: SportOdds, onClick?: () => void }) {
  const getLogo = getEspnLogo;
  const homePrice = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name))?.price || 0;
  const awayPrice = odd.bookmakers?.[0]?.markets?.find(m => m.key === 'h2h')?.outcomes?.find(o => o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name))?.price || 0;
  
  return (
    <button 
      onClick={onClick}
      className="block relative outline-none w-full text-left group overflow-hidden"
    >
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "relative overflow-hidden p-5 sm:p-6 space-y-6 transition-all duration-300 cursor-pointer h-full",
          "bg-white border border-black/[0.04]",
          "shadow-[0_4px_24px_rgba(0,0,0,0.02)] rounded-[32px] hover:shadow-[0_8px_32px_rgba(0,0,0,0.06)]"
        )}
      >
        <div className="flex items-center justify-between">
           <div className="flex items-center gap-3">
              <span className="px-4 py-1.5 rounded-full border border-black/[0.08] text-[10px] font-bold tracking-widest text-zinc-900 bg-white">
                 {odd.status === 'final' ? 'FINAL' : odd.status === 'live' ? 'LIVE' : 'UPCOMING'}
              </span>
           </div>
           <span className="text-[10px] font-bold tracking-widest text-zinc-500 uppercase">
             ESPN UNLMTD, MLB.TV
           </span>
        </div>
        
        <div className="flex items-center justify-between pt-6 px-4">
           <div className="flex flex-col items-center flex-1">
             <img src={getLogo(odd.away_team)} className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-4" alt="" />
             <span className="text-xl sm:text-2xl font-bold text-zinc-900">{odd.away_team.split(' ').pop()}</span>
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">NEW YORK</span>
             <span className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-6">{odd.score ? odd.away_score : '0'}</span>
             <span className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-600 mt-4">27-17</span>
           </div>

           <div className="flex flex-col items-center justify-center px-4">
              <span className="text-zinc-300 font-bold text-xs">VS</span>
           </div>

           <div className="flex flex-col items-center flex-1">
             <img src={getLogo(odd.home_team)} className="w-20 h-20 sm:w-24 sm:h-24 object-contain mb-4" alt="" />
             <span className="text-xl sm:text-2xl font-bold text-zinc-900">{odd.home_team.split(' ').pop()}</span>
             <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-1">BALTIMORE</span>
             <span className="text-4xl sm:text-5xl font-bold text-zinc-900 mt-6">{odd.score ? odd.home_score : '7'}</span>
             <span className="px-3 py-1 bg-zinc-100 rounded-full text-[10px] font-bold text-zinc-600 mt-4">20-24</span>
           </div>
        </div>

        <div className="mt-8 bg-zinc-50 rounded-2xl p-5 border border-black/[0.04]">
           <span className="text-[9px] font-bold uppercase tracking-widest text-zinc-500 block mb-2">Park / Weather</span>
           <span className="text-sm font-medium text-zinc-900">Oriole Park at Camden Yards · 72°F · Right-to-Left Crosswind (12mph)</span>
        </div>
      </motion.div>
    </button>
  );
}"""

# Using regex to replace the OddsCard function
odds_card_pattern = re.compile(r'function OddsCard\([^\{]+\{.*?(?=\nfunction |\Z)', re.DOTALL)
app_code = odds_card_pattern.sub(new_odds_card + '\n\n', app_code, count=1)


# 3. Add BOOKS | PREDICTION Toggle and ALL | LIVE | PREGAME | ENDED tabs above the fullSlate.map
# Let's find the place where slate filters are currently mapped. It's inside a `div` with `md:hidden` and another desktop `div`.
# I'll replace the existing filter UI with the Image 1 top bar.
# The user wants "overall quality of image 1", so I will inject it at the top of the 'odds' tab.

top_bar_injection = """
<div className="mb-8 space-y-6">
  <div className="flex items-center gap-2 bg-[#FAFAFA] p-1.5 rounded-2xl border border-black/[0.04] max-w-sm mx-auto shadow-[0_2px_8px_rgba(0,0,0,0.02)]">
    <button className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-zinc-900 bg-white rounded-xl shadow-[0_2px_8px_rgba(0,0,0,0.04)]">Books</button>
    <button className="flex-1 py-3 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors">Prediction</button>
  </div>
  
  <div className="flex items-center justify-center gap-2">
    {['ALL', 'LIVE', 'PREGAME', 'ENDED'].map(filter => (
      <button 
        key={filter}
        className={cn(
          "px-5 py-2.5 rounded-full text-[10px] font-bold tracking-widest uppercase transition-all",
          filter === 'ALL' ? "bg-zinc-900 text-white shadow-lg" : "bg-white text-zinc-500 hover:text-zinc-900 border border-black/[0.04]"
        )}
      >
        {filter}
      </button>
    ))}
  </div>
</div>
"""

# Let's find the 'odds' tab rendering block and insert the top_bar_injection.
# We'll just replace the existing filter toggles.
# The desktop filter toggle:
desktop_filter_regex = re.compile(r'<div className="hidden md:flex items-center gap-2 bg-white/\[0\.02\] p-1 rounded-lg border border-black/\[0\.08\]">.*?</div>', re.DOTALL)
app_code = desktop_filter_regex.sub('', app_code)

# The mobile filter toggle:
mobile_filter_regex = re.compile(r'<div className="flex md:hidden w-full bg-white/\[0\.02\] border-b border-black/\[0\.08\] sticky top-0 z-10 backdrop-blur-md">.*?</div>', re.DOTALL)
app_code = mobile_filter_regex.sub('', app_code)

# Insert it before `<div className="grid md:grid-cols-2 gap-5 md:gap-6 mt-2">`
grid_start = '<div className="grid md:grid-cols-2 gap-5 md:gap-6 mt-2">'
app_code = app_code.replace(grid_start, top_bar_injection + '\n' + grid_start)


# 4. Clean up `PitcherDisplay` and `PriceTag` colors
app_code = app_code.replace('border border-white/[0.1]', 'border border-black/[0.08]')

# Write App.tsx back
with open(APP_PATH, 'w') as f:
    f.write(app_code)


# 5. Write new index.css
new_css = '''@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,200..800;1,6..72,200..800&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";

@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, sans-serif;
  --font-mono: "JetBrains Mono", SFMono-Regular, Consolas, "Liberation Mono", Menlo, Courier, monospace;
  --font-serif: "Newsreader", Charter, "Iowan Old Style", Georgia, serif;

  --color-brand: #0A0A0A;
  --color-brand-light: #292524;
  --color-paper: #FAFAFA;
  --color-ink: #0A0A0A;
  --color-border: rgba(0, 0, 0, 0.06);
  
  --color-zinc-50: #fafaf9;
  --color-zinc-100: #f5f5f4;
  --color-zinc-200: #e7e5e4;
  --color-zinc-300: #d6d3d1;
  --color-zinc-400: #a8a29e;
  --color-zinc-500: #78716c;
  --color-zinc-600: #57534e;
  --color-zinc-700: #44403c;
  --color-zinc-800: #292524;
  --color-zinc-900: #1c1917;
  --color-zinc-950: #0c0a09;
}

@layer base {
  :root {
    --safe-area-top: env(safe-area-inset-top, 0px);
    --safe-area-right: env(safe-area-inset-right, 0px);
    --safe-area-bottom: env(safe-area-inset-bottom, 0px);
    --safe-area-left: env(safe-area-inset-left, 0px);
  }

  html {
    scroll-behavior: smooth;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    height: 100%;
    max-width: 100%;
    overflow-x: hidden;
    background-color: #FAFAFA;
  }

  body {
    @apply bg-[#FAFAFA] text-zinc-900 antialiased selection:bg-brand/10 selection:text-black font-sans;
    font-feature-settings: "cv02", "cv03", "cv04", "ss01";
    text-rendering: auto;
    min-height: 100dvh;
    max-width: 100%;
    overflow-x: hidden;
  }

  #root {
    min-height: 100dvh;
    max-width: 100%;
    overflow-x: hidden;
  }

  html {
    scrollbar-gutter: stable;
  }

  *, *::before, *::after {
    transition-timing-function: cubic-bezier(0.16, 1, 0.3, 1);
  }

  @keyframes shimmer {
    100% { transform: translateX(100%); }
  }

  @keyframes skeleton-pulse {
    0%, 100% { opacity: 0.4; }
    50% { opacity: 0.8; }
  }

  .skeleton {
    background: linear-gradient(90deg, rgba(0,0,0,0.02) 25%, rgba(0,0,0,0.06) 50%, rgba(0,0,0,0.02) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
    border-radius: 6px;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 4px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    @apply bg-zinc-300 rounded-full;
    transition: background 0.2s;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    @apply bg-zinc-400;
  }

  .no-scrollbar::-webkit-scrollbar {
    display: none;
  }
  .no-scrollbar {
    -ms-overflow-style: none;
    scrollbar-width: none;
  }

  :focus-visible {
    outline: 2px solid var(--color-brand);
    outline-offset: 2px;
    border-radius: 4px;
  }

  img {
    image-rendering: auto;
  }
}

@layer components {
  .liquid-glass {
    @apply bg-white shadow-[0_4px_24px_rgba(0,0,0,0.02)] border border-black/[0.04];
  }
  
  .milled-border {
    @apply border-t border-t-black/[0.04] border-b border-b-black/[0.08] border-x border-x-black/[0.04];
  }

  .micro-copy {
    @apply font-mono text-[10px] uppercase tracking-widest text-zinc-500;
  }
}

.text-balance {
  text-wrap: balance;
}

.glass-panel {
  @apply liquid-glass;
}

.serif-italic {
  @apply font-serif italic text-zinc-900;
}

.serif {
  @apply font-serif text-zinc-900;
}

@keyframes pulse-ring {
  0% { box-shadow: 0 0 0 0 rgba(16,185,129,0.3); }
  70% { box-shadow: 0 0 0 6px rgba(16,185,129,0); }
  100% { box-shadow: 0 0 0 0 rgba(16,185,129,0); }
}

.live-pulse {
  animation: pulse-ring 2s cubic-bezier(0.16, 1, 0.3, 1) infinite;
}

.card-hover {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.card-hover:hover {
  transform: translateY(-1px);
  box-shadow: 0 12px 48px rgba(0,0,0,0.06), 0 2px 8px rgba(0,0,0,0.04);
}

@keyframes fade-up {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}

.animate-fade-up {
  animation: fade-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) both;
}

.safe-area-top {
  padding-top: max(0.5rem, var(--safe-area-top));
}

.safe-area-bottom {
  padding-bottom: max(0.75rem, var(--safe-area-bottom));
}

.safe-area-x {
  padding-left: max(0.5rem, var(--safe-area-left));
  padding-right: max(0.5rem, var(--safe-area-right));
}

.ambient-glow {
  display: none;
}
'''

with open(CSS_PATH, 'w') as f:
    f.write(new_css)

print("Refactor script executed successfully.")

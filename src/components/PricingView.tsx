import React, { useId } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';

// --- 1. TYPE SAFETY & INTERFACES ---
export interface PricingUser {
  id: string;
  tier?: 'free' | 'pro' | 'sharp' | (string & {});
}

export interface PricingViewProps extends React.HTMLAttributes<HTMLElement> {
  user?: PricingUser | null;
  onSubscribe: (tier: string) => void;
}

// --- 2. ACCESSIBLE & VALIDATED ICONS ---
// Fixed the React warning: "React does not recognize the 'size' prop on a DOM element".
// We destructure `size` and safely pipe it into the inline style attribute instead.
interface IconProps extends React.HTMLAttributes<HTMLSpanElement> {
  size?: number | string;
}

const createIcon = (label: string) => {
  const Icon = React.forwardRef<HTMLSpanElement, IconProps>(
    ({ className, size, style, ...props }, ref) => (
      <span
        ref={ref}
        aria-hidden="true" // Hides decorative text ("✓", "→") from screen readers
        className={cn("text-[10px] uppercase tracking-widest font-bold select-none shrink-0", className)}
        style={{ ...(size !== undefined ? { fontSize: size, lineHeight: 1 } : {}), ...style }}
        {...props}
      >
        {label}
      </span>
    )
  );
  Icon.displayName = `Icon(${label})`;
  return Icon;
};

const Check = createIcon("✓");
const ArrowRight = createIcon("→");
const Flame = createIcon("Hot");

// --- 3. DATA ABSTRACTION (DRY PRINCIPLE) ---
// Extracted static card data. This reduces JSX duplication by over 60% 
// and makes adding new tiers or A/B testing copy incredibly easy.

type TierTheme = 'light' | 'brand' | 'dark';

interface PricingTier {
  id: string;
  level: string;
  name: string;
  price: number;
  theme: TierTheme;
  badge?: string;
  features: { text: string; italic?: boolean }[];
  buttonLabel: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "free",
    level: "Access Level I",
    name: "Free",
    price: 0,
    theme: "light",
    buttonLabel: "Initiate Access",
    features: [
      { text: "Daily slate view" },
      { text: "Recent finals" },
      { text: "100 AI queries per 24h" },
      { text: "Standard grounding" },
    ],
  },
  {
    id: "pro",
    level: "Access Level II",
    name: "Pro",
    price: 19,
    theme: "brand",
    badge: "Institutional",
    buttonLabel: "Go Institutional",
    features: [
      { text: "Unlimited prompt engineering", italic: true },
      { text: "All intelligence protocols (Live, Stats, Trends)" },
      { text: "Multi-user collaborative ledger" },
      { text: "Custom volatility triggers" },
    ],
  },
  {
    id: "sharp",
    level: "Access Level III",
    name: "Sharp",
    price: 99,
    theme: "dark",
    buttonLabel: "Request Verification",
    features: [
      { text: "Full level II integration" },
      { text: "Market depth & movement history" },
      { text: "Psychological bias analysis engine" },
      { text: "Priority API gateway access" },
    ],
  },
];

// --- 4. ANIMATION VARIANTS ---
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15, delayChildren: 0.1 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { 
    opacity: 1, 
    y: 0, 
    transition: { type: "spring", stiffness: 300, damping: 25 } 
  },
};

// --- MAIN EXPORT ---
export const PricingView = React.forwardRef<HTMLElement, PricingViewProps>(
  ({ user, onSubscribe, className, ...props }, ref) => {
    const headingId = useId();

    return (
      <section 
        ref={ref}
        aria-labelledby={headingId}
        className={cn(
          "h-full w-full flex flex-col items-center overflow-y-auto px-6 py-16 xl:py-24 bg-white/50 pb-[calc(100px+env(safe-area-inset-bottom,1.5rem))]",
          className
        )}
        {...props}
      >
        <header className="text-center mb-10 md:mb-16">
          <motion.h1 
            id={headingId}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-4xl md:text-6xl font-serif text-ink mb-6"
          >
            Unfair Advantage
          </motion.h1>
          <motion.p 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-sm md:text-lg text-zinc-500 font-mono max-w-xl mx-auto text-balance"
          >
            Institutional-grade infrastructure meets AI intelligence. Choose your edge.
          </motion.p>
        </header>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-10 max-w-6xl w-full px-2"
        >
          {PRICING_TIERS.map((tier) => {
            const isLight = tier.theme === 'light';
            const isBrand = tier.theme === 'brand';
            const isDark = tier.theme === 'dark';

            // Determine if user is currently active on this tier
            const isCurrentTier = user?.tier === tier.id || (!user?.tier && user && tier.id === 'free');

            return (
              <motion.article 
                key={tier.id}
                variants={cardVariants}
                className={cn(
                  "rounded-3xl p-8 md:p-10 flex flex-col relative overflow-hidden transition-shadow duration-300 h-full w-full",
                  isLight && "bg-white border border-zinc-100 shadow-precise hover:shadow-float",
                  isBrand && "bg-white border-2 border-brand shadow-float lg:scale-105 z-10",
                  isDark && "bg-ink text-white shadow-precise"
                )}
              >
                {/* Decorative Elements */}
                {isBrand && tier.badge && (
                  <div className="absolute top-0 right-0 bg-brand text-white text-[9px] uppercase font-bold tracking-[0.4em] px-6 py-2 rounded-bl-xl shadow-lg z-20">
                    {tier.badge}
                  </div>
                )}
                {isDark && (
                  <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none">
                    <Flame size={140} />
                  </div>
                )}

                <h2 className={cn(
                  "text-[10px] uppercase font-bold tracking-[0.3em] mb-8 relative z-10",
                  isLight && "text-zinc-400",
                  isBrand && "text-brand",
                  isDark && "text-zinc-500"
                )}>
                  {tier.level}
                </h2>
                
                <h3 className={cn(
                  "text-3xl font-serif mb-2 relative z-10",
                  isDark ? "text-white" : "text-ink"
                )}>
                  {tier.name}
                </h3>
                
                <div className="flex items-end gap-2 mb-8 md:mb-10 relative z-10">
                  <span className="text-4xl md:text-5xl font-serif tracking-tighter">${tier.price}</span>
                  <span className={cn(
                    "font-mono text-xs md:text-sm mb-1.5 uppercase tracking-widest flex items-baseline gap-1",
                    isDark ? "text-zinc-500" : "text-zinc-400"
                  )}>
                    <span className="sr-only">per</span>
                    / Month
                  </span>
                </div>
                
                <ul 
                  aria-label={`Features for ${tier.name} plan`} 
                  className={cn(
                    "space-y-4 md:space-y-5 mb-auto relative z-10",
                    isBrand && "text-balance"
                  )}
                >
                  {tier.features.map((feature, i) => (
                    <li key={i} className="flex items-start gap-4">
                      <Check size={16} className="text-brand mt-[2px] shrink-0" />
                      <span className={cn(
                        "text-[13px] font-medium leading-relaxed",
                        isLight && "text-zinc-600",
                        isBrand && "text-zinc-800",
                        isDark && "text-zinc-300",
                        feature.italic && "font-serif-italic italic"
                      )}>
                        {feature.text}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <button 
                  type="button"
                  onClick={() => onSubscribe(tier.id)}
                  disabled={isCurrentTier}
                  aria-label={isCurrentTier ? `Currently subscribed to ${tier.name}` : `Subscribe to ${tier.name} plan`}
                  className={cn(
                    "relative z-10 w-full mt-10 md:mt-12 py-4 md:py-5 font-bold text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all duration-200 flex justify-center items-center gap-3",
                    // 5. ACCESSIBILITY: Proper focus rings strictly for keyboard navigation
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                    isLight && "bg-zinc-50 hover:bg-zinc-100 text-ink border border-zinc-100 focus-visible:ring-zinc-400",
                    isBrand && "bg-brand hover:brightness-110 text-white shadow-lg focus-visible:ring-brand focus-visible:ring-offset-white",
                    isDark && "bg-white/5 hover:bg-white/10 text-white border border-white/20 focus-visible:ring-white focus-visible:ring-offset-ink",
                    isCurrentTier && "opacity-50 cursor-not-allowed hover:bg-transparent"
                  )}
                >
                  {isCurrentTier ? 'Current Status' : tier.buttonLabel}
                  {!isCurrentTier && isBrand && <ArrowRight size={14} />}
                </button>
              </motion.article>
            );
          })}
        </motion.div>
      </section>
    );
  }
);

PricingView.displayName = "PricingView";

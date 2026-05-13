import React from 'react';
import { Check, Zap, Flame, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';

export function PricingView({ user, onSubscribe }: { user: any, onSubscribe: (tier: string) => void }) {
  return (
    <div className="h-full w-full flex flex-col items-center overflow-y-auto px-4 sm:px-6 py-8 xl:py-12 bg-white/50 safe-area-bottom">
      <div className="text-center mb-8 sm:mb-10">
        <h1 className="text-4xl sm:text-6xl serif text-ink mb-4">Unfair Advantage</h1>
        <p className="text-base text-zinc-700 font-mono max-w-xl mx-auto leading-relaxed">
          Real-time sports market data and AI insights. Choose your edge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 max-w-6xl w-full">
        {/* FREE */}
        <div className="bg-white border border-zinc-100 rounded-2xl p-6 sm:p-7 flex flex-col relative overflow-hidden transition-all hover:shadow-lg hover:border-zinc-200">
           <h3 className="text-xl font-bold text-ink mb-2">Free</h3>
           <div className="flex items-end gap-2 mb-8">
             <span className="text-4xl serif">$0</span><span className="text-zinc-600 font-mono text-sm mb-1">/ mo</span>
           </div>
           
           <ul className="space-y-4 mb-auto">
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Daily slate view</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Recent finals</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Unlimited chat questions</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Sign up required</span></li>
           </ul>
           
           <button 
             onClick={() => onSubscribe('free')}
             className="w-full mt-10 py-4 bg-zinc-100 hover:bg-zinc-200 text-ink font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
           >
             {user ? 'Current Plan' : 'Get Started'}
           </button>
        </div>

        {/* PRO */}
        <div className="bg-white border-2 border-brand rounded-2xl p-6 sm:p-7 flex flex-col relative overflow-hidden shadow-xl">
           <div className="absolute top-0 right-0 bg-brand text-white text-[10px] uppercase font-bold tracking-widest px-4 py-1.5 rounded-bl-lg">
             Most Popular
           </div>
           <h3 className="text-xl font-bold text-ink mb-2">Pro</h3>
           <div className="flex items-end gap-2 mb-8">
             <span className="text-4xl serif">$19</span><span className="text-zinc-600 font-mono text-sm mb-1">/ mo</span>
           </div>
           
           <ul className="space-y-4 mb-auto">
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Unlimited chat questions</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">All three modes (Live, Stats, Trends)</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Saved game history</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-700">Custom alerts <span className="ml-2 text-[9px] uppercase bg-brand/10 text-brand px-2 py-0.5 rounded-full font-bold">V2</span></span></li>
           </ul>
           
           <button 
             onClick={() => onSubscribe('pro')}
             className="w-full mt-10 py-4 bg-brand hover:bg-[#1E3027] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors flex justify-center items-center gap-2"
           >
             Upgrade to Pro <ArrowRight size={14} />
           </button>
        </div>

        {/* SHARP */}
        <div className="bg-ink text-white rounded-2xl p-6 sm:p-7 flex flex-col relative overflow-hidden shadow-2xl">
           <div className="absolute top-0 right-0 p-8 opacity-10">
             <Flame size={120} />
           </div>
           <h3 className="text-xl font-bold text-white mb-2 relative z-10">Sharp</h3>
           <div className="flex items-end gap-2 mb-8 relative z-10">
             <span className="text-4xl serif">$99</span><span className="text-zinc-100 font-mono text-sm mb-1">/ mo</span>
           </div>
           
           <ul className="space-y-4 mb-auto relative z-10">
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-100">Everything in Pro</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-100">Line movement history per game</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-100">Bias analysis on personal bet history</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-100">Priority grounding (faster responses)</span></li>
             <li className="flex items-start gap-3"><Check size={16} className="text-brand mt-1 shrink-0" /><span className="text-sm text-zinc-100">API access <span className="ml-2 text-[9px] uppercase bg-white/10 text-white px-2 py-0.5 rounded-full font-bold">V2</span></span></li>
           </ul>
           
           <button 
             onClick={() => onSubscribe('sharp')}
             className="relative z-10 w-full mt-10 py-4 bg-white/15 hover:bg-white/20 text-white border border-white/30 font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
           >
             Apply for Sharp
           </button>
        </div>
      </div>
      <p className="mt-8 text-center text-xs text-zinc-600 font-mono max-w-2xl">
        Stripe checkout remains web-based. iOS wrapper-ready shell; App Store commerce review required.
      </p>
    </div>
  );
}

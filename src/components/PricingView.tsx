import React from 'react';
import { Check, Zap, Flame, Shield, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export function PricingView({ user, onSubscribe }: { user: any, onSubscribe: (tier: string) => void }) {
  return (
    <div className="h-full w-full flex flex-col items-center overflow-y-auto px-6 py-16 xl:py-24 bg-white/50">
      <div className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl serif text-ink mb-6">Unfair Advantage</h1>
        <p className="text-lg text-zinc-500 font-mono max-w-xl mx-auto">
          Institutional-grade infrastructure meets AI intelligence. Choose your edge.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl w-full">
        {/* FREE */}
        <div className="bg-white border border-zinc-100 rounded-3xl p-10 flex flex-col relative overflow-hidden transition-all shadow-precise hover:shadow-float">
           <h3 className="text-[10px] uppercase font-bold text-zinc-400 tracking-[0.3em] mb-8">Access Level I</h3>
           <h4 className="text-3xl serif text-ink mb-2">Free</h4>
           <div className="flex items-end gap-2 mb-10">
             <span className="text-5xl serif tracking-tighter">$0</span><span className="text-zinc-400 font-mono text-sm mb-1.5 uppercase tracking-widest">/ Month</span>
           </div>
           
           <ul className="space-y-5 mb-auto">
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-600 font-medium">Daily slate view</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-600 font-medium">Recent finals</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-600 font-medium">100 AI queries per 24h</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-600 font-medium">Standard grounding</span></li>
           </ul>
           
           <button 
             onClick={() => onSubscribe('free')}
             className="w-full mt-12 py-4 bg-zinc-50 hover:bg-zinc-100 text-ink font-bold text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all border border-zinc-100"
           >
             {user ? 'Current Status' : 'Initiate Access'}
           </button>
        </div>

        {/* PRO */}
        <div className="bg-white border-2 border-brand rounded-3xl p-10 flex flex-col relative overflow-hidden shadow-float scale-105 z-10">
           <div className="absolute top-0 right-0 bg-brand text-white text-[9px] uppercase font-bold tracking-[0.4em] px-6 py-2 rounded-bl-xl shadow-lg">
             Institutional
           </div>
           <h3 className="text-[10px] uppercase font-bold text-brand tracking-[0.3em] mb-8">Access Level II</h3>
           <h4 className="text-3xl serif text-ink mb-2">Pro</h4>
           <div className="flex items-end gap-2 mb-10">
             <span className="text-5xl serif tracking-tighter">$19</span><span className="text-zinc-400 font-mono text-sm mb-1.5 uppercase tracking-widest">/ Month</span>
           </div>
           
           <ul className="space-y-5 mb-auto text-balance">
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-800 font-medium font-serif-italic italic">Unlimited prompt engineering</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-800 font-medium">All intelligence protocols (Live, Stats, Trends)</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-800 font-medium">Multi-user collaborative ledger</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-800 font-medium">Custom volatility triggers</span></li>
           </ul>
           
           <button 
             onClick={() => onSubscribe('pro')}
             className="w-full mt-12 py-5 bg-brand hover:brightness-110 text-white font-bold text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all shadow-lg flex justify-center items-center gap-3"
           >
             Go Institutional <ArrowRight size={14} />
           </button>
        </div>

        {/* SHARP */}
        <div className="bg-ink text-white rounded-3xl p-10 flex flex-col relative overflow-hidden shadow-precise">
           <div className="absolute top-0 right-0 p-10 opacity-5">
             <Flame size={140} />
           </div>
           <h3 className="text-[10px] uppercase font-bold text-zinc-500 tracking-[0.3em] mb-8 relative z-10">Access Level III</h3>
           <h4 className="text-3xl serif text-white mb-2 relative z-10">Sharp</h4>
           <div className="flex items-end gap-2 mb-10 relative z-10">
             <span className="text-5xl serif tracking-tighter">$99</span><span className="text-zinc-500 font-mono text-sm mb-1.5 uppercase tracking-widest">/ Month</span>
           </div>
           
           <ul className="space-y-5 mb-auto relative z-10">
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-300 font-medium">Full level II integration</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-300 font-medium">Market depth & movement history</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-300 font-medium">Psychological bias analysis engine</span></li>
             <li className="flex items-start gap-4"><Check size={16} className="text-brand mt-0.5 shrink-0" /><span className="text-[13px] text-zinc-300 font-medium">Priority API gateway access</span></li>
           </ul>
           
           <button 
             onClick={() => onSubscribe('sharp')}
             className="relative z-10 w-full mt-12 py-4 bg-white/5 hover:bg-white/10 text-white border border-white/20 font-bold text-[10px] uppercase tracking-[0.3em] rounded-xl transition-all"
           >
             Request Verification
           </button>
        </div>
      </div>
    </div>
  );
}

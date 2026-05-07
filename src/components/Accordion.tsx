import React, { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "../lib/utils";

export function Accordion({ title, children, defaultExpanded = false }: { title: string, children: React.ReactNode, defaultExpanded?: boolean }) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  return (
    <div className="bg-white border border-zinc-200/60 rounded-[1.5rem] shadow-sm mb-6 overflow-hidden">
      <button 
        onClick={() => setExpanded(!expanded)} 
        className="w-full flex items-center justify-between p-6 md:p-8 text-left bg-white hover:bg-zinc-50 transition-colors"
      >
        <h3 className="serif-italic text-2xl tracking-tight text-ink">{title}</h3>
        {expanded ? <ChevronUp className="text-zinc-400" /> : <ChevronDown className="text-zinc-400" />}
      </button>
      {expanded && (
        <div className="p-6 md:p-8 border-t border-zinc-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

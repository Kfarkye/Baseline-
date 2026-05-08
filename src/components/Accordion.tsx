import React, { useState, useId } from "react";
import { cn } from "../lib/utils";

// 1. TYPE SAFETY & A11Y
// Removed `any`, strongly typed props, and forwarded refs.
const createIcon = (label: string) => {
  const Icon = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => (
      <span
        ref={ref}
        aria-hidden="true" // Hides decorative text ("↓" / "↑") from screen readers
        className={cn("text-[10px] uppercase tracking-widest font-bold select-none", className)}
        {...props}
      >
        {label}
      </span>
    )
  );
  Icon.displayName = `Icon(${label})`;
  return Icon;
};

const ChevronDown = createIcon("↓");
const ChevronUp = createIcon("↑");

// 2. EXTENSIBILITY
// Inherit standard div attributes so consumers can pass custom classes, IDs, or data-* attributes
export interface AccordionProps extends React.HTMLAttributes<HTMLDivElement> {
  title: React.ReactNode; // Relaxed to ReactNode in case you want to pass formatting inside the title
  defaultExpanded?: boolean;
}

export const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  ({ title, children, defaultExpanded = false, className, ...props }, ref) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    
    // 3. UNIQUE IDs
    // Generate collision-free IDs to link the button and content for WAI-ARIA compliance
    const contentId = useId();
    const triggerId = useId();

    return (
      <div
        ref={ref}
        className={cn(
          "bg-white border border-zinc-200/60 rounded-[1.5rem] shadow-sm mb-6 overflow-hidden",
          className
        )}
        {...props}
      >
        <button
          id={triggerId}
          type="button" // Prevents accidental form submissions if placed inside a <form>
          aria-expanded={expanded}
          aria-controls={contentId}
          onClick={() => setExpanded((prev) => !prev)}
          className={cn(
            "w-full flex items-center justify-between p-6 md:p-8 text-left bg-white transition-colors hover:bg-zinc-50",
            // Accessible focus ring strictly for keyboard navigation
            "focus-visible:outline-none focus-visible:bg-zinc-50 focus-visible:ring-2 focus-visible:ring-zinc-400 focus-visible:ring-inset"
          )}
        >
          <h3 className="serif-italic text-2xl tracking-tight text-ink pr-4">{title}</h3>
          
          <span className="shrink-0 text-zinc-400">
            {expanded ? <ChevronUp /> : <ChevronDown />}
          </span>
        </button>

        {/* 4. SMOOTH ANIMATION */}
        {/* Uses a CSS Grid trick to natively animate height from 0 to auto without JavaScript calculations */}
        <div
          id={contentId}
          role="region"
          aria-labelledby={triggerId}
          className={cn(
            "grid transition-all duration-300 ease-in-out",
            // Toggle visibility to prevent hidden content from being focused via keyboard
            expanded ? "grid-rows-[1fr] opacity-100 visible" : "grid-rows-[0fr] opacity-0 invisible"
          )}
        >
          <div className="overflow-hidden">
            <div className="p-6 md:p-8 border-t border-zinc-100 bg-white">
              {children}
            </div>
          </div>
        </div>
      </div>
    );
  }
);

Accordion.displayName = "Accordion";

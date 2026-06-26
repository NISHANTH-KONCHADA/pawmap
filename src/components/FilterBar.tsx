import React, { useRef, useState, useEffect } from "react";
import { ChevronRight, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface FilterBarProps {
  activeFilter: string;
  onChange: (filter: string) => void;
}

const catTips = [
  "🐈 Feed stray cats around the same time daily to build routine!",
  "🐾 Slow-blink at a stray to signal peace and friendliness!",
  "🏥 Left ear-tipped cats are already spayed or neutered!",
  "🏡 Straw makes the ultimate cozy, dry outdoor shelter bedding!",
  "🥛 Fresh clean water is much healthier for cats than cow's milk!",
  "🍗 Cats are obligate carnivores and need high-protein diets!",
  "🐾 Always check car wheel wells or under hoods on cold mornings!"
];

export default function FilterBar({ activeFilter, onChange }: FilterBarProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showIndicator, setShowIndicator] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  const filters = [
    { value: "all", label: "🐾 All Kitties", bg: "bg-[#0D5C4A] text-white border-[#0D5C4A]/25" },
    { value: "sighting", label: "👀 Spotted Spot", bg: "bg-[#378ADD] text-white border-[#378ADD]/25" },
    { value: "colony", label: "🐱 Meow Colonies", bg: "bg-[#1D9E75] text-white border-[#1D9E75]/25" },
    { value: "tnr", label: "🏥 TNR Rescue", bg: "bg-[#D85A30] text-white border-[#D85A30]/25" },
    { value: "adopted", label: "🏡 Forever Beds", bg: "bg-[#639922] text-white border-[#639922]/25" }
  ];

  const checkScroll = () => {
    const el = scrollRef.current;
    if (el) {
      // Show scroll indicator if there's remaining scrollable content on the right
      const canScrollRight = el.scrollWidth > el.clientWidth + el.scrollLeft + 15;
      setShowIndicator(canScrollRight);
    }
  };

  useEffect(() => {
    const el = scrollRef.current;
    if (el) {
      const timer = setTimeout(checkScroll, 150);
      el.addEventListener("scroll", checkScroll);
      window.addEventListener("resize", checkScroll);
      return () => {
        clearTimeout(timer);
        el.removeEventListener("scroll", checkScroll);
        window.removeEventListener("resize", checkScroll);
      };
    }
  }, []);

  useEffect(() => {
    // Rotate through cat tips every 9 seconds
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % catTips.length);
    }, 9000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col gap-2 w-full max-w-[92vw] sm:max-w-none select-none" id="filter-bar-container">
      {/* 💡 Glassy Apple-themed Meow Tip Header Bar */}
      <div 
        id="filter-bar-tip-header"
        className="flex items-center justify-between gap-3 px-3.5 py-2.5 bg-forest-dark/88 backdrop-blur-md border border-white/10 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.15)] text-[9px] xs:text-[10.5px] sm:text-xs font-display font-medium text-white/95 transition-all duration-300 pointer-events-auto overflow-hidden relative"
      >
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <span className="flex items-center gap-1.5 text-amber-200 shrink-0 font-bold bg-white/10 border border-white/15 px-2 py-0.5 rounded-lg text-[8px] xs:text-[9px] uppercase tracking-wider shadow-2xs">
            <Sparkles className="w-3 h-3 text-amber-300 animate-pulse" /> Meow Tip
          </span>
          
          {/* Animated tip transitions using AnimatePresence */}
          <div className="relative h-5 flex-1 overflow-hidden min-w-0">
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ y: 15, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -15, opacity: 0 }}
                transition={{ duration: 0.35, ease: "easeInOut" }}
                className="absolute inset-0 flex items-center text-white/95 text-[9px] xs:text-[10px] sm:text-xs font-medium select-none font-sans leading-tight whitespace-normal overflow-hidden"
              >
                {catTips[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        
        <span className="hidden sm:inline text-[9px] text-amber-200 font-bold shrink-0 uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded-md border border-white/10 animate-pulse">
          🐾 Happy Spotting
        </span>
      </div>

      {/* Actual Horizontally Scrollable Tag buttons with Frost-glass treatment */}
      <div className="relative w-full">
        <div
          ref={scrollRef}
          className="flex gap-2 p-1.5 overflow-x-auto whitespace-nowrap bg-white/70 backdrop-blur-md rounded-2xl shadow-[0_8px_32px_rgba(13,92,74,0.06)] border border-white/40 max-w-full no-scrollbar pointer-events-auto"
          id="filter-bar"
        >
          {filters.map((f) => {
            const isActive = activeFilter === f.value;
            return (
              <motion.button
                key={f.value}
                id={`filter-${f.value}`}
                onClick={() => {
                  if (typeof navigator !== "undefined" && navigator.vibrate) {
                    navigator.vibrate(15); // Micro tactile tap
                  }
                  onChange(f.value);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className={`px-4 py-2.5 text-xs font-display font-semibold rounded-xl border transition-all duration-300 cursor-pointer ${
                  isActive
                    ? `${f.bg} shadow-md`
                    : "bg-white/40 text-mist border-transparent hover:bg-white/80 hover:text-ink backdrop-blur-xs"
                }`}
              >
                {f.label}
              </motion.button>
            );
          })}
        </div>

        {/* Floating gradient fading swipe indicator attached right over the scroll bar to prevent text overlap */}
        {showIndicator && (
          <div className="absolute right-0 top-0 bottom-0 flex items-center gap-1 pl-10 pr-3.5 bg-gradient-to-l from-white/95 via-white/85 to-transparent pointer-events-none rounded-r-2xl z-10">
            <span className="text-[9px] font-bold text-[#0D5C4A] tracking-wider uppercase">Swipe</span>
            <ChevronRight className="w-3.5 h-3.5 text-[#0D5C4A] animate-bounce-horizontal" />
          </div>
        )}
      </div>
    </div>
  );
}

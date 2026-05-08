import React, { useState, useEffect, useRef, useImperativeHandle, forwardRef } from "react";

export const getPitcherLiveStats = (pitcher: any, odd?: any) => {
  if (!pitcher) return "Currently Pitching";
  let activePitcher = pitcher;
  if (odd) {
    if (odd.home_live_pitcher?.name === pitcher.name) activePitcher = { ...pitcher, ...odd.home_live_pitcher };
    else if (odd.away_live_pitcher?.name === pitcher.name) activePitcher = { ...pitcher, ...odd.away_live_pitcher };
  }
  const pc = activePitcher.pitchCount ? `${activePitcher.pitchCount} PC` : "";
  const era = activePitcher.gameEra ? `${activePitcher.gameEra} ERA` : "";
  if (pc || era) {
    return [pc, era].filter(Boolean).join(" · ");
  }
  return activePitcher.summary || "Pitching";
};
import { motion, AnimatePresence } from "motion/react";
const createIcon = (label: string) => ({ className, ...props }: any) => <span className={`text-[10px] uppercase tracking-widest font-bold ${className || ""}`} {...props}>{label}</span>;
const createDot = () => ({ className, ...props }: any) => <span className={`w-1.5 h-1.5 rounded-full bg-current ${className || ""}`} {...props}></span>;

export const MessageSquare = createIcon("Msg");
export const TrendingUp = createIcon("Trnd");
export const Calendar = createIcon("Cal");
export const Wallet = createIcon("Wlt");
export const Settings = createIcon("Set");
export const UserIcon = createDot();
export const Send = createIcon("Run");
export const ChevronRight = createIcon("→");
export const ChevronLeft = createIcon("←");
export const ChevronDown = createIcon("↓");
export const LogOut = createIcon("Exit");
export const AlertCircle = createIcon("!");
export const PlusCircle = createIcon("+");
export const Plus = createIcon("+");
export const RefreshCw = createIcon("Sync");
export const BarChart = createIcon("Data");
export const Zap = createDot();
export const Check = createIcon("✓");
export const Wind = createIcon("Wnd");
export const Cloud = createIcon("Cld");
export const MapPin = createIcon("Loc");
export const ShieldCheck = createIcon("Sec");
export const Activity = createIcon("Act");
export const Clock = createIcon("Time");
export const History = createIcon("Hist");
export const LayoutGrid = createIcon("Grid");
export const Mic = createIcon("Mic");
export const Paperclip = createIcon("Atch");
export const Link2 = createIcon("Lnk");
export const ArrowRight = createIcon("→");
export const X = createIcon("✕");
export const Search = createIcon("Src");
export const Camera = createIcon("Cam");
export const Loader2 = ({ className, ...props }: any) => <span className={`text-[10px] uppercase tracking-widest font-bold animate-pulse ${className || ""}`} {...props}>...</span>;
export const Flame = createIcon("Hot");
import { auth, db } from "./lib/firebase";
import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  signOut,
  User as FirebaseUser,
} from "firebase/auth";
import {
  doc,
  getDoc,
  setDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { cn, formatCurrency } from "./lib/utils";
import {
  BrowserRouter,
  Routes,
  Route,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import {
  fetchCurrentOdds,
  listenToLiveOdds,
  SportOdds,
} from "./services/oddsService";
import { getBettingInsights, analyzeBetSlip, ChatMessage as GeminiChatMessage } from "./services/geminiService";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { PrismLight as SyntaxHighlighter } from "react-syntax-highlighter";
import python from "react-syntax-highlighter/dist/esm/languages/prism/python";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { ResponsiveContainer, LineChart, Line, BarChart as RechartsBarChart, Bar, ScatterChart, Scatter, AreaChart, Area, PieChart, Pie, Cell, ZAxis, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend } from "recharts";
import * as d3 from "d3";
export const Download = createIcon("DL");
export const Bot = createDot();
export const Copy = createIcon("Cp");
export const Code = createIcon("</>");
export const TerminalSquare = createIcon(">_");
export const FileText = createIcon("Doc");
export const Globe = createIcon("Net");
import { ArtifactRenderer } from "./components/ArtifactRenderer";
import { BaseballDiamond } from "./components/BaseballDiamond";
import { TeamStatsTable } from "./components/TeamStatsTable";
import GameDetail from "./GameDetail";

export const Info = createIcon("i");
export const UploadCloud = createIcon("Up");
export const ImageIcon = createIcon("Img");
export const Code2 = createIcon("</>");
export const Eye = createIcon("Vis");

SyntaxHighlighter.registerLanguage("python", python);

// --- Types ---
interface ChatMessage extends GeminiChatMessage {
  id?: string;
  timestamp?: any;
}

interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
}

interface UserData {
  userId: string;
  email: string;
  displayName: string;
  balance: number;
  planTier: "free" | "pro" | "sharp";
  queryCount: number;
  lastQueryDate: string;
  preferences: {
    favoriteLeagues: string[];
    riskLevel: "low" | "medium" | "high";
  };
}

export interface ArtifactMeta {
  id: string;
  title: string;
  type: string;
  source: string;
  createdAt: any;
  fetchedAt: any;
  content: string;
}

const MLB_TEAM_MAP: Record<string, string> = {
  "Arizona Diamondbacks": "ari",
  "Atlanta Braves": "atl",
  "Baltimore Orioles": "bal",
  "Boston Red Sox": "bos",
  "Chicago Cubs": "chc",
  "Chicago White Sox": "chw",
  "Cincinnati Reds": "cin",
  "Cleveland Guardians": "cle",
  "Colorado Rockies": "col",
  "Detroit Tigers": "det",
  "Houston Astros": "hou",
  "Kansas City Royals": "kc",
  "Los Angeles Angels": "laa",
  "Los Angeles Dodgers": "lad",
  "Miami Marlins": "mia",
  "Milwaukee Brewers": "mil",
  "Minnesota Twins": "min",
  "New York Mets": "nym",
  "New York Yankees": "nyy",
  "Oakland Athletics": "oak",
  "Philadelphia Phillies": "phi",
  "Pittsburgh Pirates": "pit",
  "San Diego Padres": "sd",
  "San Francisco Giants": "sf",
  "Seattle Mariners": "sea",
  "St. Louis Cardinals": "stl",
  "Tampa Bay Rays": "tb",
  "Texas Rangers": "tex",
  "Toronto Blue Jays": "tor",
  "Washington Nationals": "wsh",
};

export const getEspnLogo = (teamName: string) => {
  const abbr = MLB_TEAM_MAP[teamName];
  return abbr
    ? `https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/${abbr}.png`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=${teamName}&backgroundColor=FAF9F6&fontFamily=serif`;
};

const OddsDisplay = ({ price }: { price: number | string | undefined | null }) => {
  if (price === undefined || price === null) return null;
  const pStr = price.toString();
  const displayPrice =
    typeof price === "number"
      ? price > 0
        ? `+${price}`
        : price
      : pStr.startsWith("+") || pStr.startsWith("-")
        ? price
        : `+${price}`;

  const isPositive = typeof price === "number" ? price > 0 : pStr.startsWith('+');

  return (
    <div className={cn(
      "font-mono font-medium text-[10px] uppercase tracking-wider px-2.5 py-1.5 rounded-full ring-1 ring-inset transition-all",
      isPositive 
        ? "bg-[#F0FFF4] text-[#1C7C44] ring-[#1C7C44]/10" 
        : "bg-[#FFF5F5] text-[#C53030] ring-[#C53030]/10"
    )}>
      {displayPrice}
    </div>
  );
};

function PitcherDisplay({
  teamFull,
  headshot,
  name,
  record,
  alignRight = false,
  small = false,
}: {
  teamFull: string;
  headshot?: string;
  name?: string;
  record?: string;
  alignRight?: boolean;
  small?: boolean;
}) {
  let teamAbbr =
    MLB_TEAM_MAP[teamFull as keyof typeof MLB_TEAM_MAP] ||
    (teamFull || "TBA").substring(0, 3);
  
  if (teamFull === "Pitching") teamAbbr = "P";
  if (teamFull === "Batting") teamAbbr = "AB";

  const fallbackImg = `https://api.dicebear.com/7.x/initials/svg?seed=${name || "TBA"}&backgroundColor=e4e4e7&textColor=52525b`;

  return (
    <div
      className={cn("flex items-center gap-2", alignRight && "flex-row-reverse text-right")}
    >
      <div
        className={cn(
          small ? "w-8 h-8 md:w-9 md:h-9" : "w-12 h-12",
          "rounded-full overflow-hidden bg-white shrink-0 shadow-precise border border-zinc-100 transition-transform group-hover:scale-110 duration-500"
        )}
      >
        <img
          src={headshot || fallbackImg}
          className="w-full h-full object-cover scale-110"
          alt={name || "TBA"}
        />
      </div>
      <div className={cn("flex flex-col min-w-0 max-w-[80px] md:max-w-none", alignRight && "items-end")}>
        <div
          className={cn("flex items-center gap-1 mb-0", alignRight && "flex-row-reverse")}
        >
          <span className="text-[10px] md:text-[11px] font-bold text-zinc-900 truncate">
            {name ? name.split(" ").pop() : "TBA"}
          </span>
          <span className="text-[7px] md:text-[8px] font-black text-zinc-300 uppercase tracking-tighter">
            {(teamAbbr || "").toUpperCase()}
          </span>
        </div>
        <span className="text-[7px] md:text-[8px] font-mono text-zinc-400 font-bold tracking-tight truncate w-full">
          {record || "-"}
        </span>
      </div>
    </div>
  );
}


const CommandCenterModal = ({ 
    isMenuOpen, 
    setIsMenuOpen, 
    setActiveTab, 
    activeTab,
    navigate,
    slateFilter,
    setSlateFilter,
    gameStatusFilter,
    setGameStatusFilter,
    oddsSource,
    setOddsSource,
    setSelectedBookie
}: any) => {
    if (typeof isMenuOpen === 'undefined') return null;
    return (
    <AnimatePresence>
        {isMenuOpen && (
            <motion.div
                initial={{ opacity: 0, y: "100%" }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: "100%" }}
                transition={{ duration: 0.5, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-x-0 bottom-0 top-12 z-[100] bg-white rounded-t-[2.5rem] shadow-[0_-8px_40px_rgba(0,0,0,0.08)] p-8 flex flex-col xl:hidden"
            >
                <div className="flex justify-center mb-8">
                    <div className="w-12 h-1.5 bg-zinc-100 rounded-full" />
                </div>
                <div className="flex justify-between items-center mb-10">
                    <div className="flex items-center gap-4">
                        <div className="text-3xl font-serif italic text-brand">B</div>
                        <span className="text-[10px] font-black tracking-widest uppercase text-zinc-900 pt-1">Command Center</span>
                    </div>
                    <button onClick={() => setIsMenuOpen(false)} className="w-10 h-10 flex items-center justify-center bg-zinc-50 rounded-full text-zinc-400 hover:text-ink transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <nav className="flex flex-col gap-10 overflow-y-auto pb-[calc(2rem + env(safe-area-inset-bottom))] custom-scrollbar">
                    <div className="flex flex-col gap-2">
                        <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase mb-4">Core Navigation</span>
                        {[
                          { id: "board", label: "Board", icon: <TrendingUp size={20} /> },
                          { id: "analysis", label: "Analysis", icon: <MessageSquare size={20} /> },
                          { id: "market", label: "Market", icon: <BarChart size={20} /> },
                          { id: "stats", label: "Stats", icon: <Activity size={20} /> },
                          { id: "ledger", label: "Ledger", icon: <Wallet size={20} /> },
                        ].map((item) => (
                           <button 
                             key={item.id}
                             onClick={() => { navigate("/"); (setActiveTab as any)(item.id); setIsMenuOpen(false); }} 
                             className="flex items-center justify-between py-4 border-b border-zinc-100 group px-2"
                           >
                              <div className="flex items-center gap-6">
                                <div className="text-zinc-400 group-active:text-zinc-900 transition-colors">
                                  {item.icon}
                                </div>
                                <span className={cn(
                                    "text-xl font-medium tracking-tight",
                                    activeTab === item.id ? "text-zinc-900" : "text-zinc-500"
                                )}>{item.label}</span>
                              </div>
                              <ChevronRight size={16} className="text-zinc-200" />
                           </button>
                        ))}
                    </div>

                    <div className="flex flex-col gap-6">
                        <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">Filters</span>
                        
                        <div className="flex flex-col gap-2">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Date</span>
                           <div className="flex flex-wrap gap-2">
                           {["previous", "today", "tomorrow"].map(filter => (
                                <button key={filter} onClick={() => setSlateFilter?.(filter as any)} className={cn("px-0 py-1 text-sm font-medium border-b-2", slateFilter === filter ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 font-normal")}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</button>
                           ))}
                           </div>
                        </div>

                        <div className="flex flex-col gap-2">
                           <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Game Status</span>
                           <div className="flex flex-wrap gap-2">
                           {["all", "pregame", "live", "ended"].map(filter => (
                                <button key={filter} onClick={() => setGameStatusFilter?.(filter as any)} className={cn("px-0 py-1 text-sm font-medium border-b-2", gameStatusFilter === filter ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 font-normal")}>{filter.charAt(0).toUpperCase() + filter.slice(1)}</button>
                           ))}
                           </div>
                        </div>
                    </div>

                    <div className="flex flex-col gap-4">
                        <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">Market Source</span>
                        <div className="flex flex-col gap-2">
                           {["sportsbook", "prediction"].map(source => (
                                <button key={source} onClick={() => { setOddsSource?.(source as any); setSelectedBookie?.("All Bookmakers"); }} className={cn("px-0 py-1 text-left text-sm font-medium border-b-2", oddsSource === source ? "border-zinc-900 text-zinc-900" : "border-transparent text-zinc-400 font-normal")}>{source.charAt(0).toUpperCase() + source.slice(1)} Markets</button>
                           ))}
                        </div>
                    </div>
                </nav>
            </motion.div>
        )}
    </AnimatePresence>
    );
};

export interface ChatInputRef {
  setText: (text: string) => void;
}

export const ChatInputForm = forwardRef<ChatInputRef, {
  onSend: (text: string) => void;
  hasAttachment: boolean;
}>(({ onSend, hasAttachment }, ref) => {
  const [text, setText] = useState("");
  
  useImperativeHandle(ref, () => ({
    setText: (t: string) => setText(t)
  }));
  
  return (
    <form 
      className="flex items-center gap-2 pr-1 w-full"
      onSubmit={(e) => {
        e.preventDefault();
        onSend(text);
        setText("");
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Inquire institutional data..."
        className="flex-1 bg-transparent border-none outline-none focus:ring-0 text-sm py-4 px-6 placeholder:text-zinc-300 font-medium w-full"
      />
      <button
        type="submit"
        disabled={!text.trim() && !hasAttachment}
        className="w-12 h-12 flex items-center justify-center bg-zinc-900 border border-zinc-900 text-white rounded-full transition-all active:scale-90 disabled:opacity-20 flex-shrink-0"
      >
        <Send size={18} />
      </button>
    </form>
  );
});

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [odds, setOdds] = useState<SportOdds[]>([]);
  const [isLoadingOdds, setIsLoadingOdds] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const chatInputRef = useRef<ChatInputRef>(null);
  const [isTyping, setIsTyping] = useState(false);
  const [attachment, setAttachment] = useState<{name: string, type: string, data: string} | null>(null);
  const [isListening, setIsListening] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<
    "board" | "analysis" | "ledger" | "market" | "stats"
  >("board");
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    if (isMenuOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
        document.body.style.overflow = "";
    };
  }, [isMenuOpen]);
  const [isSlateOpen, setIsSlateOpen] = useState(false);
  const [isSlateExpanded, setIsSlateExpanded] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [groundingMode, setGroundingMode] = useState<
    "live" | "stats" | "trends" | null
  >(null);
  const [slateFilter, setSlateFilter] = useState<
    "previous" | "today" | "tomorrow"
  >("today");
  const [gameStatusFilter, setGameStatusFilter] = useState<
    "all" | "pregame" | "live" | "ended"
  >("all");
  const [selectedBookie, setSelectedBookie] =
    useState<string>("All Bookmakers");
  const [oddsSource, setOddsSource] = useState<"sportsbook" | "prediction">("sportsbook");
  const [selectedMarket, setSelectedMarket] = useState<string>("all");
  const [minOdds, setMinOdds] = useState<string>("");
  const [maxOdds, setMaxOdds] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [sharedArtifact, setSharedArtifact] = useState<{ id: string, content: string } | null>(null);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
  const [artifactsList, setArtifactsList] = useState<ArtifactMeta[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const [showScrollBottom, setShowScrollBottom] = useState(false);
  const navigate = useNavigate();

  const [aiStatus, setAiStatus] = useState<"checking" | "online" | "error">("checking");
  const [userLedger, setUserLedger] = useState<any[]>([]);
  const [ledgerFile, setLedgerFile] = useState<File | null>(null);
  const [ledgerPreview, setLedgerPreview] = useState<string | null>(null);
  const [isAnalyzingLedger, setIsAnalyzingLedger] = useState(false);
  const [ledgerAnalysis, setLedgerAnalysis] = useState<string | null>(null);

  const [scheduleTeamFilter, setScheduleTeamFilter] = useState('');

  useEffect(() => {
    fetch("/api/ai-status")
      .then(res => res.ok ? res.json() : Promise.reject())
      .then(data => setAiStatus(data.configured ? "online" : "error"))
      .catch(() => setAiStatus("error"));
  }, []);

  useEffect(() => {
    if (!user) {
      setUserLedger([]);
      return;
    }
    const q = query(
      collection(db, "users", user.uid, "ledger"),
      orderBy("timestamp", "desc")
    );
    return onSnapshot(q, (snapshot) => {
      setUserLedger(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    }, (err) => {
      console.warn("Ledger sync offline:", err);
    });
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const artifactId = params.get("artifact");
    if (artifactId) {
      setIsLoadingArtifact(true);
      const unsubscribe = onSnapshot(doc(db, "artifacts", artifactId), (docSnap) => {
        if (docSnap.exists()) {
          setSharedArtifact({ id: artifactId, content: docSnap.data().content });
        }
        setIsLoadingArtifact(false);
      }, (err) => {
        console.error("Failed to load artifact", err);
        setIsLoadingArtifact(false);
      });
      return () => unsubscribe();
    }
  }, []);

  const categorizeGame = (
    commenceTime: string,
  ): "previous" | "today" | "tomorrow" => {
    const timeZone = "America/Los_Angeles";
    const d = new Date(commenceTime);
    const now = new Date();
    
    const getPSTDateStr = (date: Date) => {
      const parts = new Intl.DateTimeFormat('en-US', {
        timeZone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).formatToParts(date);
      console.log("Parts:", parts);
      if (!Array.isArray(parts)) return "0000-00-00";
      const y = parts.find(p => p && p.type === 'year')?.value;
      const m = parts.find(p => p && p.type === 'month')?.value;
      const d = parts.find(p => p && p.type === 'day')?.value;
      return `${y}-${m}-${d}`;
    };

    const dStr = getPSTDateStr(d);
    const todayStr = getPSTDateStr(now);
    
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = getPSTDateStr(tomorrow);
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getPSTDateStr(yesterday);

    if (dStr === todayStr) return "today";
    if (dStr === tomorrowStr) return "tomorrow";
    if (dStr === yesterdayStr) return "previous";
    if (d < now) return "previous";
    
    return "tomorrow"; // Default for future
  };

  const allGamesSorted = [...(odds || [])].sort(
    (a, b) =>
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime(),
  );

  const liveGames = allGamesSorted.filter((o) => o && o.status === "live");
  const upcomingGames = allGamesSorted.filter(
    (o) => o && (o.status === "upcoming" || !o.status),
  );
  const finalGames = allGamesSorted
    .filter((o) => o && o.status === "final")
    .sort(
      (a, b) =>
        new Date(b.commence_time).getTime() -
        new Date(a.commence_time).getTime(),
    );
  const featuredGames = [...liveGames, ...upcomingGames].slice(0, 3);

  const previousGames = allGamesSorted.filter(
    (o) => o && categorizeGame(o.commence_time) === "previous",
  );
  let todayGames = allGamesSorted.filter(
    (o) => o && categorizeGame(o.commence_time) === "today",
  );

  // Sort live games first in today's games
  todayGames = [...todayGames].sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (a.status !== "live" && b.status === "live") return 1;
    return 0; // maintain time sort otherwise since allGamesSorted is already sorted by time
  });

  const tomorrowGames = allGamesSorted.filter(
    (o) => o && categorizeGame(o.commence_time) === "tomorrow",
  );

  const baseDateSlate =
    slateFilter === "previous"
      ? previousGames
      : slateFilter === "tomorrow"
        ? tomorrowGames
        : todayGames;

  const baseSlate = baseDateSlate.filter((game) => {
     if (!game) return false;
     if (gameStatusFilter === "all") return true;
     if (gameStatusFilter === "live") return game.status === "live";
     if (gameStatusFilter === "ended") return game.status === "final";
     if (gameStatusFilter === "pregame") return game.status === "upcoming" || !game.status;
     return true;
  });

   const sourceFilteredSlate = baseSlate.map(game => ({
     ...game,
     bookmakers: (game.bookmakers || []).filter(b => 
       oddsSource === "prediction" ? b.key === "kalshi" : b.key !== "kalshi"
     )
  }));

  const allBookmakers = Array.from(
    new Set(sourceFilteredSlate.flatMap((o) => (o.bookmakers || []).map((b) => b.title))),
  ).sort();

  const fullSlate = sourceFilteredSlate.filter((game) => {
    // 0. Ensure games have bookmakers for the selected source if in prediction mode
    if (oddsSource === "prediction" && (game.bookmakers || []).length === 0) return false;
    
    // 1. Bookmaker Filter
    let hasBookie = true;
    if (selectedBookie !== "All Bookmakers") {
      hasBookie = (game.bookmakers || []).some((b) => b.title === selectedBookie);
    }
    if (!hasBookie) return false;

    // Get the bookie data we'll use for market/odds filtering
    const bookie =
      selectedBookie === "All Bookmakers"
        ? (game.bookmakers || [])[0]
        : (game.bookmakers || []).find((b) => b.title === selectedBookie);

    // If a specific filter is set, and there's no bookie, hide it. However, if no specific filters are set, we can show it even without odds
    if (!bookie && (selectedMarket !== "all" || minOdds !== "" || maxOdds !== "")) {
        return false;
    }

    if (bookie) {
      // 2. Market Filter
      if (selectedMarket !== "all") {
        const hasMarket = (bookie.markets || []).some((m) => m.key === selectedMarket);
        if (!hasMarket) return false;
      }

      // 3. Odds Range Filter
      if (minOdds !== "" || maxOdds !== "") {
        const min = minOdds === "" ? -Infinity : parseFloat(minOdds);
        const max = maxOdds === "" ? Infinity : parseFloat(maxOdds);

        // Check if ANY outcome in ANY market matches the range
        const matchesRange = (bookie.markets || []).some((m) => {
          // If a specific market is selected, only check that one
          if (selectedMarket !== "all" && m.key !== selectedMarket) return false;

          return (m.outcomes || []).some((o) => {
            const price =
              typeof o.price === "string" ? parseFloat(o.price) : o.price;
            return price >= min && price <= max;
          });
        });

        if (!matchesRange) return false;
      }
    }

    return true;
  });

  const getSuggestions = () => {
    switch (groundingMode) {
      case "live":
        return [
          "Score on Dodgers game",
          "Late scratches tonight",
          "Weather at Wrigley",
        ];
      case "stats":
        return [
          "Record on Yankees vs LHP",
          "Cole's last 5 starts",
          "Padres home L10",
        ];
      case "trends":
        return [
          "Where's the line moved?",
          "Best edge tonight",
          "Unders trending",
        ];
      default:
        return [
          "Read on Dodgers Astros",
          "Best play tonight",
          "Totals trending under",
        ];
    }
  };

  const toggleMode = (mode: "live" | "stats" | "trends") => {
    setGroundingMode((prev) => (prev === mode ? null : mode));
  };

  // 1. Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      setAuthInitialized(true);

      if (u) {
        try {
          const userRef = doc(db, "users", u.uid);
          const userSnap = await getDoc(userRef);
          const today = new Date().toISOString().split("T")[0];

          if (!userSnap.exists()) {
            const newUserData: UserData = {
              userId: u.uid,
              email: u.email || "",
              displayName: u.displayName || "Punter",
              balance: 0,
              planTier: "free",
              queryCount: 0,
              lastQueryDate: today,
              preferences: { favoriteLeagues: [], riskLevel: "medium" },
            };
            await setDoc(userRef, newUserData);
            setUserData(newUserData);
          } else {
            const data = userSnap.data() as UserData;
            setUserData(data);

            if (data.lastQueryDate !== today) {
              await updateDoc(userRef, { queryCount: 0, lastQueryDate: today });
              setUserData((prev) =>
                prev ? { ...prev, queryCount: 0, lastQueryDate: today } : prev,
              );
            }
          }

          // Setup Chat Listener
          const q = query(
            collection(db, "users", u.uid, "chats"),
            orderBy("timestamp", "asc"),
          );
          onSnapshot(q, (snapshot) => {
            setMessages(snapshot.docs.map((d) => d.data() as ChatMessage));
          });

          // Setup Artifacts Listener
          try {
            const qArtifacts = query(
              collection(db, "artifacts"),
              where("creatorId", "==", u.uid),
            );
            onSnapshot(qArtifacts, (snapshot) => {
              const list = snapshot.docs.map(
                (d) => ({ id: d.id, ...d.data() }) as ArtifactMeta,
              );
              list.sort(
                (a, b) =>
                  (b.createdAt?.toMillis() || 0) -
                  (a.createdAt?.toMillis() || 0),
              );
              setArtifactsList(list);
            });
          } catch (e) {
            console.error("Error setting up artifacts listener:", e);
          }
        } catch (error) {
          console.error("Error setting up user data:", error);
        }
      }
    });
  }, []);

  // 2. Data Fetchers
  useEffect(() => {
    const unsubscribe = listenToLiveOdds((data) => {
      setOdds(data);
      setIsLoadingOdds(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const refreshOdds = async () => {
    setIsLoadingOdds(true);
    // Left for manual refresh if needed, but SSE handles auto updates
    const data = await fetchCurrentOdds();
    setOdds(data);
    setIsLoadingOdds(false);
  };

  const handleLogin = () => {
    signInWithPopup(auth, new GoogleAuthProvider());
  };

  const handleLogout = () => signOut(auth);

  const handleVoiceToggle = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Speech recognition not supported in this browser.");
        return;
    }

    if (isListening) {
        setIsListening(false);
    } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = true;
        recognition.onresult = (event: any) => {
            const transcript = Array.from(event.results)
                .map((result: any) => result[0])
                .map(result => result.transcript)
                .join("");
            chatInputRef.current?.setText(transcript);
        };
        recognition.onend = () => setIsListening(false);
        recognition.start();
        setIsListening(true);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    console.log("File selected:", file);
    if (file) {
        const reader = new FileReader();
        reader.onload = () => {
            const dataBase64 = (reader.result as string).split(',')[1];
            console.log("File type:", file.type);
            setAttachment({
                name: file.name,
                type: file.type || 'application/octet-stream',
                data: dataBase64
            });
        };
        reader.readAsDataURL(file);
    }
  };

  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const sendMessage = async (textToUse: string) => {
    console.log("Sending message...", { textToUse, attachment });
    if ((!textToUse.trim() && !attachment) || !user) return;

    // Use default tier if userData didn't load properly yet
    const planTier = userData?.planTier || "free";
    const queryCount = userData?.queryCount || 0;

    if (planTier === "free" && queryCount >= 100) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: ChatMessage = { role: "user", text: textToUse.trim() || "[Attachment]" };
    const savedInputText = textToUse.trim();
    setAttachment(null);
    setIsTyping(true);

    try {
      let finalInputText = savedInputText;
      const urlMatches = finalInputText.match(/https?:\/\/[^\s]+/g);
      if (urlMatches && urlMatches.length > 0) {
        for (const url of urlMatches) {
          try {
            const res = await fetch(`/api/fetch-url?url=${encodeURIComponent(url)}`);
            const data = await res.json();
            if (data.text) {
              finalInputText += `\n\n[Context from ${url}]:\n${data.text}`;
            }
          } catch (err) {
            console.error("Failed to fetch URL context", err);
          }
        }
      }

      const messageParts: (string | { inlineData: { data: string, mimeType: string } })[] = [];
      if (finalInputText) messageParts.push(finalInputText);
      if (attachment) messageParts.push({ inlineData: { data: attachment.data, mimeType: attachment.type } });

      if (userData) {
        try {
          await updateDoc(doc(db, "users", user.uid), {
            queryCount: queryCount + 1,
          });
          setUserData({ ...userData, queryCount: queryCount + 1 });
        } catch (e) {
          console.warn("Could not update query count", e);
        }
      }

      await addDoc(collection(db, "users", user.uid, "chats"), {
        ...userMessage,
        timestamp: serverTimestamp(),
      });

      const insights = await getBettingInsights(
        messageParts,
        messages,
        odds,
        groundingMode,
        userLedger
      );

      await addDoc(collection(db, "users", user.uid, "chats"), {
        role: "model",
        text: insights,
        timestamp: serverTimestamp(),
      });
    } catch (err: any) {
      console.error(err);

      let errorMsg = "Couldn't pull current data. Tap to retry.";
      if (err instanceof Error) {
        if (err.message.includes("Quota exceeded"))
          errorMsg = "Data limit reached for today. Please try again later.";
        else if (err.message.includes("Missing or insufficient permissions") || err.message.includes("forbidden"))
          errorMsg = "Market access synchronization failed. Tap to reconnect.";
      }

      await addDoc(collection(db, "users", user.uid, "chats"), {
        role: "model",
        text: `### ⚠️ Connection Interrupted\n\n${errorMsg}`,
        timestamp: serverTimestamp(),
      }).catch((e) => {
        console.error("Could not write error to chat", e);
      });
    } finally {
      setIsTyping(false);
    }
  };

  const handleLedgerUpload = async (file: File | null) => {
    if (!file) return;
    setLedgerFile(file);
    
    const previewUrl = URL.createObjectURL(file);
    setLedgerPreview(previewUrl);
    setLedgerAnalysis(null);
    setIsAnalyzingLedger(true);

    try {
      const context = userData ? `User is on ${userData.planTier} tier. Has ${userData.queryCount} queries.` : "Guest user.";
      const analysis = await analyzeBetSlip(file, context);
      setLedgerAnalysis(analysis);
    } catch (e) {
      setLedgerAnalysis("Failed to analyze image. Please try again.");
    } finally {
      setIsAnalyzingLedger(false);
    }
  };

  if (isLoadingArtifact) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-paper text-zinc-500 font-mono text-sm uppercase tracking-widest animate-pulse">
        Loading Artifact...
      </div>
    );
  }

  if (sharedArtifact) {
    return (
      <div className="h-full w-full bg-zinc-100 flex flex-col items-center overflow-auto py-12">
        <div className="w-full max-w-[1400px] flex items-center justify-between mb-4 px-6 xl:px-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center font-serif italic text-xl font-medium text-brand select-none leading-none">
              B
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Collaborative Document Artifact
            </span>
          </div>
          <button
            onClick={() => (window.location.href = window.location.origin)}
            className="text-[11px] font-medium text-brand px-4 py-2 border border-brand/20 bg-brand/5 rounded-full hover:bg-brand/10 transition-colors"
          >
            Create Your Own
          </button>
        </div>
        <div className="w-full max-w-[1400px] h-[800px] px-6 xl:px-0">
           <CollaborativeEditor artifact={sharedArtifact} />
        </div>
      </div>
    );
  }

  // Adjust active tab if no user
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 's') {
            e.preventDefault();
            setIsSlateOpen(prev => !prev);
        }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}, []);

  React.useEffect(() => {
    if (
      !user &&
      (activeTab === "analysis" || activeTab === "ledger" || activeTab === "market")
    ) {
      setActiveTab("board");
    }
  }, [user, activeTab]);

  if (!authInitialized) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-paper text-brand">
        <Activity size={32} className="animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex h-[100dvh] w-full items-center justify-center bg-paper text-ink selection:bg-brand/10 selection:text-ink relative overflow-hidden">
        {/* Subtle Ambient Bleed */}
        <div className="ambient-blob ambient-blob-1"></div>
        <div className="ambient-blob ambient-blob-2"></div>
        <div className="ambient-blob ambient-blob-3"></div>
        <div className="absolute inset-0 bg-paper/60 backdrop-blur-[100px] z-0 pointer-events-none" />

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative z-10 w-full max-w-sm px-6 text-center space-y-8"
        >
          <div className="w-16 h-16 mx-auto flex items-center justify-center font-serif italic text-5xl font-medium text-brand select-none mb-6">
            B
          </div>
          <div className="space-y-2">
             <h1 className="text-3xl font-serif font-bold text-ink">Baseline</h1>
             <p className="text-zinc-500 font-mono text-sm tracking-wide">Institution-level market intelligence.</p>
          </div>
          
          <div className="pt-8">
            <button
              onClick={handleLogin}
              className="w-full bg-ink hover:bg-brand text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors py-4 flex items-center justify-center gap-2"
            >
              Sign In with Google
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex h-[100dvh] w-full bg-paper text-ink font-sans overflow-hidden relative selection:bg-brand/10 selection:text-ink [touch-action:pan-y]">
      <CommandCenterModal 
        isMenuOpen={isMenuOpen} 
        setIsMenuOpen={setIsMenuOpen} 
        setActiveTab={setActiveTab} 
        activeTab={activeTab}
        navigate={navigate}
        slateFilter={slateFilter}
        setSlateFilter={setSlateFilter}
        gameStatusFilter={gameStatusFilter}
        setGameStatusFilter={setGameStatusFilter}
        oddsSource={oddsSource}
        setOddsSource={setOddsSource}
        setSelectedBookie={setSelectedBookie}
      />
      {/* Subtle Ambient Bleed */}
      <div className="ambient-blob ambient-blob-1"></div>
      <div className="ambient-blob ambient-blob-2"></div>
      <div className="ambient-blob ambient-blob-3"></div>
      <div className="absolute inset-0 bg-paper/60 backdrop-blur-[100px] z-0 pointer-events-none" />

      <div className="flex flex-col xl:flex-row h-full w-full z-10 relative overflow-y-auto xl:overflow-hidden overscroll-none">
        <AnimatePresence>
          {showUpgradeModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-paper/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="max-w-md w-full bg-white border border-zinc-100 rounded-2xl shadow-xl overflow-hidden p-8 flex flex-col items-center text-center relative"
              >
                <button
                  onClick={() => setShowUpgradeModal(false)}
                  className="absolute top-6 right-6 text-zinc-400 hover:text-ink"
                >
                  <AlertCircle size={16} />
                </button>
                <div className="w-16 h-16 rounded-full bg-brand/10 text-brand flex items-center justify-center mb-6">
                  <Zap size={24} />
                </div>
                <h3 className="text-2xl font-serif font-bold text-ink mb-2">
                  You've hit the limit
                </h3>
                <p className="text-zinc-600 mb-8 max-w-[280px]">
                  Free accounts are limited to 100 AI queries per day. Upgrade
                  to Pro for unlimited access and advanced tools.
                </p>
                <button
                  onClick={() => {
                    setShowUpgradeModal(false);
                    navigate("/pricing");
                  }}
                  className="w-full py-4 bg-brand hover:bg-[#1E3027] text-white font-bold text-xs uppercase tracking-widest rounded-xl transition-colors"
                >
                  View Plans
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* About Modal */}
        <AnimatePresence>
          {showAboutModal && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper/80 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-8 max-w-md w-full relative"
              >
                <button
                  onClick={() => setShowAboutModal(false)}
                  className="absolute top-6 right-6 text-zinc-400 hover:text-ink"
                >
                  <X size={20} strokeWidth={1.5} />
                </button>
                <div className="w-10 h-10 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6">
                  <Info size={20} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl font-serif font-medium text-ink tracking-tight mb-4">
                  About Baseline
                </h3>
                <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
                  <p>
                    Baseline connects generative AI directly to real-time sports
                    market data.
                  </p>
                  <div className="space-y-2">
                    <p>
                      <strong className="text-ink">Modes:</strong>
                    </p>
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong>Live:</strong> Real-time scores, innings, odds
                        shifts.
                      </li>
                      <li>
                        <strong>Stats:</strong> Pitcher metrics, team splits,
                        historicals.
                      </li>
                      <li>
                        <strong>Trends:</strong> Line movement and market
                        sentiment.
                      </li>
                    </ul>
                  </div>
                  <p>
                    Use the chat or tap a game card to explore deep-dive
                    analytics for any matchup. Data refreshed live via ESPN and
                    The Odds API.
                  </p>
                  <p className="pt-4 border-t border-zinc-100">
                    Feedback?{" "}
                    <a
                      href="mailto:hello@baseline.com"
                      className="text-brand hover:underline"
                    >
                      hello@baseline.com
                    </a>
                  </p>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-w-0 bg-paper pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0 overflow-hidden md:overflow-visible">
          {/* Unified Header */}
          <header className="h-16 flex items-center justify-between px-6 xl:px-12 border-b border-zinc-200/50 bg-white/70 backdrop-blur-3xl sticky top-0 z-30 transition-all">
            <div className="flex items-center gap-8">
                <button
                    onClick={() => setIsMenuOpen(true)}
                    className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                    <LayoutGrid size={20} />
                </button>
                <div className="w-8 h-8 flex items-center justify-center font-serif italic text-3xl font-medium text-brand select-none leading-none pointer-events-none ml-2 md:ml-0">
                    B
                </div>
                
                <nav className="hidden md:flex items-center gap-6">
                <button
                  onClick={() => { navigate("/"); setActiveTab("board"); }}
                  className={cn(
                    "text-xs uppercase tracking-[0.2em] font-bold transition-colors",
                    activeTab === "board" ? "text-ink" : "text-zinc-400 hover:text-zinc-600"
                  )}
                >
                  Board
                </button>
                {user && (
                  <button
                    onClick={() => { navigate("/"); setActiveTab("analysis"); }}
                    className={cn(
                      "text-xs uppercase tracking-[0.2em] font-bold transition-colors",
                      activeTab === "analysis" ? "text-ink" : "text-zinc-400 hover:text-zinc-600"
                    )}
                  >
                    Analysis
                  </button>
                )}
                <button
                    onClick={() => { navigate("/"); setActiveTab("ledger"); }}
                    className={cn( 
                        "text-xs uppercase tracking-[0.2em] font-bold transition-colors",
                        activeTab === "ledger" ? "text-ink" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    Ledger
                </button>
                <button
                    onClick={() => { navigate("/"); setActiveTab("market"); }}
                    className={cn(
                        "text-xs uppercase tracking-[0.2em] font-bold transition-colors",
                        activeTab === "market" ? "text-ink" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    Market
                </button>
                <button
                    onClick={() => { navigate("/"); setActiveTab("stats"); }}
                    className={cn(
                        "text-xs uppercase tracking-[0.2em] font-bold transition-colors",
                        activeTab === "stats" ? "text-ink" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    Stats
                </button>
                <button
                    onClick={() => setIsSlateOpen(!isSlateOpen)}
                    className={cn(
                        "text-xs uppercase tracking-[0.2em] font-bold transition-colors",
                        isSlateOpen ? "text-ink" : "text-zinc-400 hover:text-zinc-600"
                    )}
                >
                    The Slate
                </button>
              </nav>
            </div>

            <div className="flex items-center gap-6">
              <span className="text-[10px] text-zinc-400 uppercase tracking-widest font-bold hidden sm:inline-block">
                {new Date()
                  .toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "2-digit",
                    timeZone: "America/Los_Angeles",
                  })
                  .toUpperCase()}
              </span>
              <div className="flex items-center gap-4 relative group">
                <div className="w-8 h-8 rounded-full bg-zinc-50 border border-zinc-200 shadow-sm flex items-center justify-center overflow-hidden cursor-pointer transition-transform hover:scale-105">
                  {user.photoURL ? (
                    <img src={user.photoURL} alt="" />
                  ) : (
                    <UserIcon size={12} className="text-zinc-500" />
                  )}
                </div>
                <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-zinc-100 shadow-[0_4px_20px_rgba(0,0,0,0.08)] rounded-xl py-2 opacity-0 invisible group-hover:opacity-100 group-hover:visible translate-y-1 group-hover:translate-y-0 transition-all duration-200 z-50">
                  <div className="px-4 py-2 border-b border-zinc-100/60 mb-1">
                    <p className="text-xs font-bold text-zinc-900 truncate">
                      {user.email}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/pricing")}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors flex items-center gap-2"
                  >
                    <Zap size={14} className="text-zinc-800" /> Manage
                    Subscription
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900 transition-colors flex items-center gap-2"
                  >
                    <LogOut size={14} /> Sign out
                  </button>
                </div>
              </div>
            </div>
          </header>

          {/* Persistent Mobile Bottom Navigation */}
          <div className="md:hidden fixed bottom-0 left-0 right-0 z-[60] bg-white/95 backdrop-blur-2xl border-t border-zinc-200/80 pb-[env(safe-area-inset-bottom,1.5rem)] pt-2 px-4 flex items-center justify-around shadow-[0_-8px_30px_rgba(0,0,0,0.04)]">
            <MobileNavIcon 
              active={activeTab === "board"} 
              onClick={() => setActiveTab("board")} 
              label="Board" 
              icon={<TrendingUp size={20} />} 
            />
            <MobileNavIcon 
              active={activeTab === "analysis"} 
              onClick={() => setActiveTab("analysis")} 
              label="Analysis" 
              icon={<MessageSquare size={20} />} 
            />
            <MobileNavIcon 
              active={activeTab === "market"} 
              onClick={() => setActiveTab("market")} 
              label="Market" 
              icon={<BarChart size={20} />} 
            />
            <MobileNavIcon 
              active={activeTab === "ledger"} 
              onClick={() => setActiveTab("ledger")} 
              label="Ledger" 
              icon={<Wallet size={20} />} 
            />
          </div>

          <div className="flex-1 flex flex-col overflow-hidden relative overscroll-contain no-scrollbar">
            <div className="flex-1 flex flex-col min-w-0 relative overflow-hidden pb-[64px] xl:pb-0">
              <Routes>
                <Route
                  path="/"
                  element={
                    <AnimatePresence mode="wait">
                      {activeTab === "analysis" && (
                        <motion.div
                          key="analysis"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full flex flex-col max-w-4xl mx-auto w-full overflow-x-hidden overscroll-x-none touch-pan-y"
                        >
                          <div 
                            ref={chatScrollContainerRef}
                            onScroll={(e) => {
                              const target = e.currentTarget;
                              const isNotAtBottom = target.scrollHeight - target.scrollTop - target.clientHeight > 150;
                              setShowScrollBottom(isNotAtBottom);
                            }}
                            className="flex-1 px-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto space-y-16 custom-scrollbar scroll-smooth"
                          >
                            {messages.length === 0 && (
                              <div className="pb-12 pt-8">
                                <div className="mb-8">
                                  <h3 className="text-2xl serif-italic font-medium text-ink tracking-tight">
                                    Today's Market
                                  </h3>
                                  <div className="flex items-center gap-4 mt-2">
                                    {isLoadingOdds ? (
                                      <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-400 flex items-center gap-2">
                                        {""}
                                          Hydrating...
                                      </p>
                                    ) : (
                                      <p className="text-[10px] uppercase tracking-widest font-black text-zinc-900/80">
                                        {allGamesSorted.length} games ·{" "}
                                        {liveGames.length} active
                                      </p>
                                    )}
                                    <div className="flex items-center gap-1.5 ml-auto">
                                      <span className={cn(
                                        "w-1.5 h-1.5 rounded-full",
                                        aiStatus === "online" ? "bg-zinc-900" : aiStatus === "checking" ? "bg-zinc-300 animate-pulse" : "bg-zinc-200"
                                      )} />
                                      <span className="text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-400">
                                        AI Processor: {aiStatus}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <div className="flex flex-col gap-6">
                                  {featuredGames.map((odd) => (
                                    <button
                                      key={odd.id}
                                      onClick={() => {
                                        const matchDate = new Date(odd.commence_time).toISOString().split('T')[0];
                                        const homeSlug = odd.home_team.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                        const awaySlug = odd.away_team.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                        navigate(`/game/${matchDate}/${awaySlug}-at-${homeSlug}`);
                                      }}
                                      className="block w-full bg-white border border-zinc-200/60 p-6 md:p-8 rounded-[1.5rem] text-left hover:border-zinc-300 shadow-[0_2px_12px_rgba(0,0,0,0.02)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.06)] transition-all duration-300 group relative overflow-hidden"
                                    >
                                      {odd.status === "live" && (
                                        <div className="absolute top-0 left-0 w-full h-[3px] bg-zinc-900" />
                                      )}
                                      <div className="flex justify-between items-start mb-6">
                                        <div>
                                          <div className="flex items-center gap-2 mb-1.5">
                                            {odd.status === "live" && (
                                              <span className="w-1.5 h-1.5 rounded-full bg-zinc-900 shrink-0" />
                                            )}
                                            <span className={cn("text-[10px] font-black uppercase tracking-[0.25em]", odd.status === "live" ? "text-zinc-900" : "text-zinc-400 group-hover:text-zinc-500 transition-colors")}>
                                              {odd.sport_title}{" "}
                                              {odd.status === "live"
                                                ? `• ${odd.inning_half && odd.inning ? `${odd.inning_half} ${odd.inning}` : "Live"}`
                                                : ""}
                                            </span>
                                          </div>
                                          <span className="text-xs font-mono text-zinc-500 group-hover:text-zinc-600 transition-colors">
                                            {odd.venue || "TBA"} •{" "}
                                            {new Date(
                                              odd.commence_time,
                                            ).toLocaleTimeString([], {
                                              hour: "numeric",
                                              minute: "2-digit",
                                              timeZone: "America/Los_Angeles",
                                            })}
                                          </span>
                                        </div>
                                        <div className="text-right">
                                          {odd.status === "live" &&
                                          odd.score ? (
                                            <div className="flex flex-col items-end">
                                              <div className="text-xl font-mono font-bold text-zinc-900 tracking-tighter">
                                                {odd.score}
                                              </div>
                                              <div className="text-[10px] text-zinc-950 font-black uppercase tracking-[0.25em] mt-1.5">
                                                {odd.situation}
                                              </div>
                                            </div>
                                          ) : (
                                            <div className="text-[10px] text-zinc-500 font-serif italic bg-zinc-50 px-3 py-1.5 rounded-full border border-zinc-200/60">
                                              {odd.context || "Regular Season"}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-5">
                                        <div className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100 group-hover:border-zinc-200/60 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <img
                                              src={getEspnLogo(odd.away_team)}
                                              className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-zinc-200/50 bg-white shadow-sm p-1 transition-transform duration-500 group-hover:scale-110"
                                              alt=""
                                            />
                                            <div>
                                              <div className="font-medium text-lg md:text-xl text-zinc-900 serif tracking-tight">
                                                {odd.away_team}
                                              </div>
                                              <div className="text-[10px] md:text-xs font-mono text-zinc-500 mt-0.5">
                                                Away
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right flex items-center gap-4">
                                            {odd.bookmakers?.[0]?.markets?.map(
                                              (m) => {
                                                const outcome = m.outcomes.find(
                                                  (o) =>
                                                    o.name?.includes(
                                                      odd.away_team,
                                                    ) ||
                                                    odd.away_team?.includes(
                                                      o.name,
                                                    ) ||
                                                    o.name === "Over",
                                                );
                                                if (!outcome) return null;
                                                return (
                                                  <div
                                                    key={m.key}
                                                    className="flex flex-col items-end"
                                                  >
                                                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 mb-1 group-hover:text-zinc-500 transition-colors">
                                                      {m.key === "h2h"
                                                        ? "ML"
                                                        : m.key === "spreads"
                                                          ? "Spread"
                                                          : "Total"}
                                                    </span>
                                                    <OddsDisplay price={m.key === "totals"
                                                        ? outcome.point
                                                        : outcome.point
                                                          ? outcome.point
                                                          : outcome.price} />
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>

                                        <div className="flex justify-between items-center bg-zinc-50/50 p-4 rounded-2xl border border-zinc-100 group-hover:border-zinc-200/60 transition-colors">
                                          <div className="flex items-center gap-4">
                                            <img
                                              src={getEspnLogo(odd.home_team)}
                                              className="w-10 h-10 md:w-12 md:h-12 rounded-full border border-zinc-200/50 bg-white shadow-sm p-1 transition-transform duration-500 group-hover:scale-110"
                                              alt=""
                                            />
                                            <div>
                                              <div className="font-medium text-lg md:text-xl text-zinc-900 serif tracking-tight">
                                                {odd.home_team}
                                              </div>
                                              <div className="text-[10px] md:text-xs font-mono text-zinc-500 mt-0.5">
                                                Home
                                              </div>
                                            </div>
                                          </div>
                                          <div className="text-right flex items-center gap-4">
                                            {odd.bookmakers?.[0]?.markets?.map(
                                              (m) => {
                                                const outcome = m.outcomes.find(
                                                  (o) =>
                                                    o.name?.includes(
                                                      odd.home_team,
                                                    ) ||
                                                    odd.home_team?.includes(
                                                      o.name,
                                                    ) ||
                                                    o.name === "Under",
                                                );
                                                if (!outcome) return null;
                                                return (
                                                  <div
                                                    key={m.key}
                                                    className="flex flex-col items-end opacity-0"
                                                  >
                                                    <span className="text-[9px] uppercase tracking-widest text-zinc-400 mb-1 group-hover:text-zinc-500 transition-colors">
                                                      {m.key === "h2h"
                                                        ? "ML"
                                                        : m.key === "spreads"
                                                          ? "Spread"
                                                          : "Total"}
                                                    </span>
                                                    <OddsDisplay price={m.key === "totals"
                                                        ? outcome.point
                                                        : outcome.point
                                                          ? outcome.point
                                                          : outcome.price} />
                                                  </div>
                                                );
                                              },
                                            )}
                                            {/* We need odds to display on the bottom */}
                                            {odd.bookmakers?.[0]?.markets?.map(
                                              (m) => {
                                                const outcome = m.outcomes.find(
                                                  (o) =>
                                                    o.name?.includes(
                                                      odd.home_team,
                                                    ) ||
                                                    odd.home_team?.includes(
                                                      o.name,
                                                    ) ||
                                                    o.name === "Under",
                                                );
                                                if (!outcome) return null;
                                                return (
                                                  <div
                                                    key={`actual-${m.key}`}
                                                    className="absolute flex flex-col items-end"
                                                  >
                                                    <OddsDisplay price={m.key === "totals"
                                                        ? outcome.point
                                                        : outcome.point
                                                          ? outcome.point
                                                          : outcome.price} />
                                                  </div>
                                                );
                                              },
                                            )}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Featured Pitcher Matchup */}
                                      {(odd.away_pitcher ||
                                        odd.home_pitcher) && (
                                        <div className="mt-6 pt-5 border-t border-zinc-200/40">
                                          <div className="flex justify-center items-center gap-2 mb-4">
                                            <span className="inline-flex items-center gap-2 px-3 py-1 bg-zinc-100 rounded-full text-[9px] uppercase tracking-[0.2em] font-bold text-zinc-500">
                                              <div className="w-1.5 h-1.5 rounded bg-zinc-400" />
                                              Pitching Matchup
                                            </span>
                                          </div>
                                          <div className="grid grid-cols-2 gap-4">
                                            {(odd.status === "live" && odd.situation_detail?.pitcher && odd.situation_detail?.batter) ? (
                                              <>
                                                <PitcherDisplay teamFull="Pitching" name={odd.situation_detail.pitcher.name || "TBA"} headshot={odd.situation_detail.pitcher.headshot} record={getPitcherLiveStats(odd.situation_detail.pitcher, odd)} small />
                                                <PitcherDisplay teamFull="Batting" name={odd.situation_detail.batter.name || "TBA"} headshot={odd.situation_detail.batter.headshot} record={odd.situation_detail.batter.summary || "Hitting"} alignRight small />
                                              </>
                                            ) : (
                                              <>
                                                <PitcherDisplay
                                                  teamFull={odd.away_team}
                                                  name={odd.status === "live" && odd.away_live_pitcher ? odd.away_live_pitcher.name : odd.away_pitcher}
                                                  headshot={
                                                    odd.status === "live" && odd.away_live_pitcher ? odd.away_live_pitcher.headshot : odd.away_pitcher_headshot
                                                  }
                                                  record={odd.status === "live" && odd.away_live_pitcher ? getPitcherLiveStats(odd.away_live_pitcher) : odd.away_pitcher_record}
                                                  small
                                                />
                                                <PitcherDisplay
                                                  teamFull={odd.home_team}
                                                  name={odd.status === "live" && odd.home_live_pitcher ? odd.home_live_pitcher.name : odd.home_pitcher}
                                                  headshot={
                                                    odd.status === "live" && odd.home_live_pitcher ? odd.home_live_pitcher.headshot : odd.home_pitcher_headshot
                                                  }
                                                  record={odd.status === "live" && odd.home_live_pitcher ? getPitcherLiveStats(odd.home_live_pitcher) : odd.home_pitcher_record}
                                                  alignRight
                                                  small
                                                />
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            )}
                            {messages.map((m, i) => (
                              <ChatMessageItem key={i} m={m} />
                            ))}
                            {isTyping && (
                              <div className="flex gap-4 items-center">
                                <div className="w-1 h-1 bg-brand rounded-full animate-pulse" />
                                <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400">
                                  Calculating...
                                </span>
                              </div>
                            )}
                            <div ref={chatEndRef} />
                          </div>
                                                  {/* Input Area */}
                          <div className="p-4 safe-bottom sticky bottom-0 z-50 flex justify-center w-full bg-gradient-to-t from-white via-white/100 to-transparent pt-12 relative">
                            <AnimatePresence>
                              {showScrollBottom && (
                                <motion.button
                                  initial={{ opacity: 0, y: 10, scale: 0.9 }}
                                  animate={{ opacity: 1, y: 0, scale: 1 }}
                                  exit={{ opacity: 0, y: 10, scale: 0.9 }}
                                  transition={{ duration: 0.2 }}
                                  onClick={() => {
                                    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
                                  }}
                                  className="absolute -top-4 left-1/2 -translate-x-1/2 w-10 h-10 flex items-center justify-center bg-white border border-zinc-200 text-zinc-500 hover:text-zinc-900 rounded-full shadow-lg hover:shadow-xl transition-all active:scale-95 z-50"
                                >
                                  <ChevronDown size={18} />
                                </motion.button>
                              )}
                            </AnimatePresence>
                            <div className="w-full max-w-2xl bg-white shadow-float border border-zinc-200/50 rounded-[2.5rem] p-2 flex flex-col gap-3 relative">
                              {/* Modes */}
                              <div className="flex gap-1.5 px-1 py-1">
                                {(["live", "stats", "trends"] as const).map(
                                  (mode) => {
                                    const isActive = groundingMode === mode;
                                    return (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={() => toggleMode(mode)}
                                        className={cn(
                                          "flex-1 flex items-center justify-center transition-all text-[9px] rounded-full py-2 tracking-[0.1em] uppercase font-black",
                                          isActive
                                            ? "bg-zinc-900 text-white"
                                            : "bg-zinc-100 text-zinc-400 hover:text-zinc-900",
                                        )}
                                      >
                                        {mode}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
<ChatInputForm onSend={sendMessage} hasAttachment={!!attachment} ref={chatInputRef} />
                            </div>
                          </div>
                          {messages.length === 0 && (
                            <div className="flex-1 flex items-center justify-center -mt-20">
                              <div className="w-full max-w-lg mx-auto flex flex-col gap-6">
                                <div className="text-center space-y-2 mb-4">
                                  <h4 className="text-zinc-400 text-[10px] uppercase font-bold tracking-[0.4em]">Suggested Inquiries</h4>
                                </div>
                                <div className="flex flex-wrap gap-2 justify-center">
                                  {getSuggestions().map((sug, idx) => (
                                    <button
                                      key={idx}
                                      type="button"
                                      onClick={() => sendMessage(sug)}
                                      className="text-[11px] bg-white border border-zinc-200/60 text-zinc-500 px-5 py-3 rounded-2xl hover:border-zinc-900 hover:text-zinc-900 transition-all active:scale-95 shadow-sm"
                                    >
                                      {sug}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}

                      {activeTab === "board" && (
                        <motion.div
                          key="board"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full px-4 py-6 md:px-10 md:py-10 lg:px-12 lg:py-12 overflow-y-auto custom-scrollbar"
                        >
                          <div className="max-w-6xl mx-auto space-y-4 md:space-y-8">
                            <div className="flex flex-col md:border-b md:border-zinc-100 md:pb-10 md:gap-6 pt-2 md:pt-0">
                              {/* MOBILE HEADER (<768px) */}
                              <div className="md:hidden space-y-6 mb-8 px-2">
                                <div className="space-y-2">
                                  <h2 className="text-4xl font-bold text-zinc-900 tracking-tight">
                                    The Board
                                  </h2>
                                  <p className="text-zinc-500 text-sm font-medium leading-relaxed">
                                    Live institutional statistics and multi-market sportsbook anchors.
                                  </p>
                                </div>
                                
                                <div className="flex flex-col gap-5">
                                  <div className="flex items-center justify-between p-1 bg-zinc-50 border border-zinc-100 rounded-xl">
                                    {[
                                      { label: "Books", val: "sportsbook" },
                                      { label: "Prediction", val: "prediction" }
                                    ].map((source) => (
                                      <button
                                        key={source.val}
                                        onClick={() => {
                                          setOddsSource(source.val as any);
                                          setSelectedBookie("All Bookmakers");
                                        }}
                                        className={cn(
                                          "flex-1 text-[10px] uppercase tracking-widest font-black py-3 rounded-lg transition-all duration-300",
                                          oddsSource === source.val
                                            ? "bg-white text-zinc-900 shadow-sm border border-zinc-200/50"
                                            : "text-zinc-400"
                                        )}
                                      >
                                        {source.label}
                                      </button>
                                    ))}
                                  </div>
                                  
                                  <div className="flex items-center gap-3 overflow-x-auto no-scrollbar py-1">
                                    {["all", "live", "pregame", "ended"].map((filter) => (
                                      <button
                                        key={filter}
                                        onClick={() => setGameStatusFilter(filter as any)}
                                        className={cn(
                                          "shrink-0 px-4 py-2 rounded-full text-[10px] uppercase font-black tracking-widest border transition-all",
                                          gameStatusFilter === filter
                                            ? "bg-zinc-900 border-zinc-900 text-white"
                                            : "bg-white border-zinc-100 text-zinc-400"
                                        )}
                                      >
                                        {filter}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>

                              {/* DESKTOP HEADER (>768px) */}
                              <div className="hidden md:flex flex-row items-end justify-between gap-6 pb-4 md:pb-0">
                                <div>
                    <h2 className="text-5xl md:text-6xl font-bold text-zinc-900 tracking-[-0.03em] mb-4">
                      The Board
                    </h2>
                    <p className="text-zinc-400 font-medium tracking-tight mb-8 max-w-lg">
                      Institutional statistics and market board anchors. High-frequency updates from major sportsbooks.
                    </p>
                    <div className="hidden md:flex items-center gap-6">
                      <div className="flex items-center gap-8">
                        {["previous", "today", "tomorrow"].map(
                          (filter) => (
                            <button
                              key={filter}
                              onClick={() =>
                                setSlateFilter(filter as any)
                              }
                              className={cn(
                                "text-[10px] uppercase tracking-[0.25em] font-black transition-all",
                                slateFilter === filter
                                  ? "text-zinc-900 border-b-2 border-zinc-900 pb-1"
                                  : "text-zinc-300 hover:text-zinc-500 pb-1 border-b-2 border-transparent",
                              )}
                            >
                              {filter}
                            </button>
                          ),
                        )}
                      </div>
                      <div className="h-4 w-[1px] bg-zinc-200 mx-2" />
                      <div className="flex items-center gap-6">
                        {["all", "live", "pregame", "ended"].map(
                          (filter) => (
                            <button
                              key={filter}
                              onClick={() =>
                                setGameStatusFilter(filter as any)
                              }
                              className={cn(
                                "text-[10px] uppercase tracking-[0.25em] font-black transition-all",
                                gameStatusFilter === filter
                                  ? "text-zinc-900"
                                  : "text-zinc-300 hover:text-zinc-500",
                              )}
                            >
                              {filter}
                            </button>
                          ),
                        )}
                      </div>
              <div className="hidden md:flex items-center p-1 bg-zinc-50 border border-zinc-100 rounded-full inline-flex">
                                      {[
                                        { label: "Bookmakers", val: "sportsbook" },
                                        { label: "Predictions", val: "prediction" }
                                      ].map((source) => (
                                        <button
                                          key={source.val}
                                          onClick={() => {
                                            setOddsSource(source.val as any);
                                            setSelectedBookie("All Bookmakers");
                                          }}
                                          className={cn(
                                            "text-[9px] uppercase tracking-widest font-black px-5 py-2.5 rounded-full transition-all duration-500",
                                            oddsSource === source.val
                                              ? "bg-zinc-900 text-white shadow-lg"
                                              : "text-zinc-400 hover:text-zinc-600",
                                          )}
                                        >
                                          {source.label}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className={cn(
                                      "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest px-4 py-2.5 rounded-full border transition-all duration-300",
                                      showFilters
                                        ? "bg-zinc-900 border-zinc-900 text-white"
                                        : "bg-white border-zinc-200 text-zinc-500 hover:border-zinc-300 hover:text-zinc-800",
                                    )}
                                  >
                                    Filters
                                  </button>
                                  <button
                                    onClick={refreshOdds}
                                    className="flex items-center gap-2 group text-[10px] font-bold uppercase tracking-widest text-zinc-400 hover:text-zinc-800 transition-colors"
                                  >
                                    Refresh
                                  </button>
                                </div>
                                                              {/* MOBILE HEADER (<768px) - REMOVED */}
                              
                              <AnimatePresence>
                                {showFilters && (
                                  <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: "auto" }}
                                    exit={{ opacity: 0, height: 0 }}
                                    className="overflow-hidden"
                                  >
                                    <div className="flex flex-wrap gap-8 pt-4">
                                      <div className="space-y-3">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                                          Bookmaker
                                        </span>
                                        <div className="relative group">
                                          <select
                                            value={selectedBookie}
                                            onChange={(e) =>
                                              setSelectedBookie?.(e.target.value)
                                            }
                                            className="appearance-none bg-zinc-50 border border-zinc-100 rounded-lg px-4 py-2 pr-10 text-[11px] font-medium text-zinc-600 focus:outline-none focus:border-brand/40 cursor-pointer"
                                          >
                                            <option>All Bookmakers</option>
                                            {allBookmakers?.map((b) => (
                                              <option key={b}>{b}</option>
                                            ))}
                                          </select>
                                          <ChevronDown
                                            size={12}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none"
                                          />
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                                          Market
                                        </span>
                                        <div className="flex gap-2 bg-zinc-50 p-1 rounded-lg border border-zinc-100">
                                          {["all", "h2h", "spreads", "totals"].map(
                                            (m) => (
                                              <button
                                                key={m}
                                                onClick={() =>
                                                  setSelectedMarket?.(m)
                                                }
                                                className={cn(
                                                  "text-[10px] uppercase font-bold px-4 py-1.5 rounded-md transition-all",
                                                  selectedMarket === m
                                                    ? "bg-white text-ink shadow-sm ring-1 ring-zinc-200/50"
                                                    : "text-zinc-400 hover:text-ink hover:bg-zinc-100/30",
                                                )}
                                              >
                                                {m}
                                              </button>
                                            ),
                                          )}
                                        </div>
                                      </div>

                                      <div className="space-y-3">
                                        <span className="text-[10px] uppercase font-bold tracking-widest text-zinc-400">
                                          Odds Range
                                        </span>
                                        <div className="flex items-center gap-2">
                                          <input
                                            type="number"
                                            placeholder="Min"
                                            value={minOdds}
                                            onChange={(e) =>
                                              setMinOdds?.(e.target.value)
                                            }
                                            className="w-20 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 text-[11px] font-medium text-zinc-600 focus:outline-none focus:border-brand/40"
                                          />
                                          <span className="text-zinc-300">
                                            —
                                          </span>
                                          <input
                                            type="number"
                                            placeholder="Max"
                                            value={maxOdds}
                                            onChange={(e) =>
                                              setMaxOdds?.(e.target.value)
                                            }
                                            className="w-20 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2 text-[11px] font-medium text-zinc-600 focus:outline-none focus:border-brand/40"
                                          />
                                          <button
                                            onClick={() => {
                                              setMinOdds?.("");
                                              setMaxOdds?.("");
                                              setSelectedBookie?.(
                                                "All Bookmakers",
                                              );
                                              setSelectedMarket?.("all");
                                            }}
                                            className="text-[10px] font-bold text-zinc-400 hover:text-brand px-3 underline ml-2"
                                          >
                                            Reset
                                          </button>
                                        </div>
                                      </div>
                                    </div>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 lg:gap-7 mt-2">
                            {fullSlate?.map((odd) => (
                              <OddsCard
                                key={odd.id}
                                odd={odd}
                                oddsSource={oddsSource}
                                onClick={() => {
                                  const matchDate = new Date(odd.commence_time).toISOString().split('T')[0];
                                  const homeSlug = odd.home_team.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                  const awaySlug = odd.away_team.toLowerCase().replace(/[^a-z0-9]/g, '-');
                                  navigate(`/game/${matchDate}/${awaySlug}-at-${homeSlug}`);
                                }}
                              />
                            ))}
                            {isLoadingOdds ? (
                              <>
                                {[1, 2, 3, 4].map(i => (
                                  <div key={i} className="bg-white border border-zinc-100 rounded-3xl p-8 h-80 animate-pulse flex flex-col gap-8">
                                    <div className="h-4 bg-zinc-100 rounded w-1/3" />
                                    <div className="flex justify-between items-center px-4">
                                      <div className="w-16 h-16 bg-zinc-100 rounded-full" />
                                      <div className="w-16 h-16 bg-zinc-100 rounded-full" />
                                    </div>
                                    <div className="space-y-3">
                                      <div className="h-4 bg-zinc-100 rounded w-full" />
                                      <div className="h-4 bg-zinc-100 rounded w-5/6" />
                                    </div>
                                  </div>
                                ))}
                              </>
                            ) : oddsSource === "prediction" && (fullSlate?.length || 0) === 0 ? (
                              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center border border-dashed border-zinc-200 rounded-xl bg-zinc-50/30">
                                <div className="w-12 h-12 bg-brand/5 text-brand/40 rounded-full flex items-center justify-center mb-6">
                                  <BarChart size={24} />
                                </div>
                                <h3 className="text-lg serif font-medium text-ink mb-2">
                                  Prediction Markets Integrating
                                </h3>
                                <p className="text-zinc-500 max-w-sm mx-auto text-sm leading-relaxed px-6">
                                  Prediction markets data integrating shortly. Check back soon for Kalshi market prices alongside sportsbook lines.
                                </p>
                              </div>
                            ) : (fullSlate?.length || 0) === 0 ? (
                              <div className="col-span-full py-24 flex flex-col items-center justify-center text-center border border-dashed border-zinc-200 rounded-xl">
                                <p className="text-zinc-600 font-medium mb-1">
                                  No games found.
                                </p>
                                <p className="text-zinc-400 text-sm">
                                  Try checking a different section.
                                </p>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      </motion.div>
                    )}

                      {activeTab === "ledger" && (
                        <motion.div
                          key="ledger"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto custom-scrollbar pb-[calc(80px+env(safe-area-inset-bottom,1.5rem))]"
                        >
                          <div className="max-w-3xl">
                            <h2 className="text-4xl serif-italic font-medium text-ink tracking-tight mb-2">
                              My Action Ledger
                            </h2>
                            <p className="text-zinc-500 font-mono text-sm mb-12">
                              Private beta matching your bet history against
                              public ML facts.
                            </p>

                            <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-8 mb-8 relative overflow-hidden">
                              <div className="absolute top-0 right-0 p-4"></div>
                              <h3 className="text-lg serif font-medium text-ink mb-4">
                                Your Edges and Leaks
                              </h3>
                              <p className="text-zinc-600 text-sm leading-relaxed mb-6 font-mono">
                                Pattern matching your recent MLB history in
                                `credentialdb` against real-time ESPN
                                situational data. You have a heavy tendency
                                (-14% ROI) to back home favorites on getaway day
                                games.
                              </p>
                              <div className="flex items-center gap-4 border-t border-zinc-200/50 pt-4">
                                <button className="text-[11px] uppercase tracking-widest font-bold text-ink hover:text-brand transition-colors flex items-center gap-2">
                                  Run Full Audit <ChevronRight size={14} />
                                </button>
                              </div>
                            </div>

                            <div className="space-y-8">
                              <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400 mb-4 border-b border-zinc-100 pb-2">
                                Vision AI Import
                              </h3>
                              
                              <div className="bg-white border-2 border-dashed border-zinc-200 rounded-2xl p-8 hover:border-brand/30 hover:bg-zinc-50/50 transition-all text-center relative group">
                                <input 
                                  type="file" 
                                  accept="image/*"
                                  title="Upload Betting Slip"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                                  onChange={(e) => {
                                    if (e.target.files?.[0]) handleLedgerUpload(e.target.files[0]);
                                  }}
                                />
                                <div className="pointer-events-none flex flex-col items-center gap-4">
                                  <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center text-zinc-400 group-hover:text-brand transition-colors group-hover:scale-110 duration-300">
                                    <Camera size={24} strokeWidth={1.5} />
                                  </div>
                                  <div>
                                    <p className="font-bold text-ink mb-1">Drop a screenshot to audit</p>
                                    <p className="text-xs text-zinc-500 max-w-sm mx-auto font-mono">Baseline Vision will extract odds, stake, and side, then analyze against institutional metrics.</p>
                                  </div>
                                </div>
                              </div>

                              {ledgerPreview && (
                                <div className="bg-zinc-50 border border-zinc-100 rounded-2xl overflow-hidden mt-6">
                                  <div className="flex border-b border-zinc-100">
                                    <div className="w-1/3 bg-zinc-100 p-4 relative min-h-[150px]">
                                      <img src={ledgerPreview} alt="Slip Preview" className="absolute inset-0 w-full h-full object-cover opacity-90 mix-blend-multiply" />
                                    </div>
                                    <div className="w-2/3 p-6 flex flex-col justify-center">
                                      {isAnalyzingLedger ? (
                                        <div className="flex flex-col items-center justify-center h-full text-zinc-400 gap-4">
                                          <Loader2 className="animate-spin text-brand" size={24} />
                                          <span className="font-mono text-xs uppercase tracking-widest text-zinc-500">Extracting SLIP DATA...</span>
                                        </div>
                                      ) : ledgerAnalysis ? (
                                        <div className="markdown-body">
                                          <ReactMarkdown>{ledgerAnalysis}</ReactMarkdown>
                                        </div>
                                      ) : (
                                        <div className="text-zinc-500 italic">Processing...</div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              )}

                              <div className="mt-12">
                                <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-400 mb-4 border-b border-zinc-100 pb-2 flex justify-between items-center">
                                  <span>Recent Ledger</span>
                                  <span className="font-mono text-[9px] bg-brand/10 text-brand px-2 py-0.5 rounded-full">30 DAYS</span>
                                </h3>
                                <div className="flex items-center justify-between p-4 border border-zinc-100 rounded-xl hover:border-zinc-200 transition-colors bg-white hover:shadow-sm">
                                  <div className="flex flex-col gap-1.5">
                                    <span className="text-sm font-semibold text-ink flex items-center gap-2">
                                      Orioles / Marlins Under 8.5
                                      <span className="px-1.5 py-0.5 bg-zinc-100 text-zinc-500 text-[9px] font-bold uppercase rounded leading-none">Manual</span>
                                    </span>
                                    <span className="text-[10px] font-mono text-zinc-500">
                                      MIA @ BAL • {new Date("2026-05-04T12:00:00Z").toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles' })}
                                    </span>
                                  </div>
                                  <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-sm font-mono text-zinc-400">
                                      -110
                                    </span>
                                    <span className="text-[10px] font-bold uppercase text-[#D23D33] bg-[#D23D33]/10 px-2 py-0.5 rounded">
                                      Loss
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>
                        </motion.div>
                      )}

                      {activeTab === "stats" && (
                        <motion.div
                          key="stats"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto custom-scrollbar pb-[calc(80px+env(safe-area-inset-bottom,1.5rem))]"
                        >
                            <div className="max-w-5xl mx-auto">
                                <h2 className="text-3xl md:text-4xl serif-italic font-medium text-ink tracking-tight mb-8 md:mb-12">
                                  Team Statistics
                                </h2>
                                <div className="overflow-x-auto no-scrollbar -mx-6 px-6 md:mx-0 md:px-0">
                                  <TeamStatsTable />
                                </div>
                            </div>
                        </motion.div>
                      )}

                      {activeTab === "market" && (
                        <motion.div
                          key="market"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto custom-scrollbar pb-[calc(80px+env(safe-area-inset-bottom,1.5rem))]"
                        >
                          <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-100 pb-10 mb-8 md:mb-12 gap-6">
                              <div className="space-y-4">
                                <h2 className="text-3xl md:text-4xl serif-italic font-medium text-ink tracking-tight">
                                  Schedule
                                </h2>
                                <p className="text-zinc-500 text-[10px] uppercase tracking-[0.4em] font-bold">
                                  Rotations & Line Metrics
                                </p>
                              </div>
                              <div className="flex items-center bg-white border border-zinc-200 rounded-2xl px-4 py-3 w-full md:w-64 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20 transition-all shadow-sm">
                                <Search size={16} className="text-zinc-400 mr-2" />
                                <input
                                  type="text"
                                  placeholder="Filter by team..."
                                  className="bg-transparent border-none outline-none w-full text-sm text-ink font-mono placeholder:text-zinc-400 placeholder:font-sans"
                                  value={scheduleTeamFilter}
                                  onChange={(e) => setScheduleTeamFilter(e.target.value)}
                                />
                              </div>
                            </div>

                            <div className="grid gap-6">
                              {isLoadingOdds ? (
                                <>
                                  {[1, 2, 3].map(i => (
                                    <div key={i} className="bg-white border border-zinc-100 rounded-2xl p-6 h-32 animate-pulse" />
                                  ))}
                                </>
                              ) : odds.filter((odd) => {
                                  const searchStr = scheduleTeamFilter.toLowerCase();
                                  return (
                                    odd.home_team.toLowerCase().includes(searchStr) ||
                                    odd.away_team.toLowerCase().includes(searchStr)
                                  );
                                }).length === 0 ? (
                                  <div className="py-20 text-center border border-dashed border-zinc-200 rounded-2xl bg-zinc-50/20">
                                    <p className="text-zinc-400 font-serif italic">No matching matchups found in rotation.</p>
                                  </div>
                                ) : (
                                  odds
                                    .filter((odd) => {
                                      const searchStr = scheduleTeamFilter.toLowerCase();
                                      return (
                                        odd.home_team.toLowerCase().includes(searchStr) ||
                                        odd.away_team.toLowerCase().includes(searchStr)
                                      );
                                    })
                                    .map((odd, idx) => {
                                  // Simple true odds calculation (no-vig) across available books for ML
                                  let maxHomeML = -Infinity;
                                  let maxAwayML = -Infinity;
                                  let consensusTotal = "";
                                  
                                  odd.bookmakers.forEach(bm => {
                                    const h2h = bm.markets.find(m => m.key === 'h2h');
                                    if (h2h) {
                                      h2h.outcomes.forEach(out => {
                                        if (out.name === odd.home_team) maxHomeML = Math.max(maxHomeML, out.price);
                                        if (out.name === odd.away_team) maxAwayML = Math.max(maxAwayML, out.price);
                                      });
                                    }
                                    const totals = bm.markets.find(m => m.key === 'totals');
                                    if (totals && !consensusTotal) {
                                      consensusTotal = String(totals.outcomes[0].point);
                                    }
                                  });

                                  // Decimal to implied prob
                                  const getProb = (dec: number) => (dec > 0 ? 1 / dec : 0);
                                  const homeProb = getProb(maxHomeML);
                                  const awayProb = getProb(maxAwayML);
                                  const totalProb = homeProb + awayProb;
                                  
                                  // True odds / no-vig probability
                                  const trueHomeProb = totalProb > 0 ? homeProb / totalProb : 0;
                                  const trueAwayProb = totalProb > 0 ? awayProb / totalProb : 0;
                                  
                                  // Convert to American true odds
                                  const toAmerican = (prob: number) => {
                                    if (!prob || prob <= 0 || prob >= 1) return "N/A";
                                    if (prob >= 0.5) {
                                      return "-" + Math.round((prob / (1 - prob)) * 100);
                                    } else {
                                      return "+" + Math.round(((1 - prob) / prob) * 100);
                                    }
                                  };

                                  const trueHome = toAmerican(trueHomeProb);
                                  const trueAway = toAmerican(trueAwayProb);
                                  const vigPct = totalProb > 1 ? ((totalProb - 1) * 100).toFixed(1) : "0.0";

                                  return (
                                    <div
                                      key={odd.id}
                                      className="bg-white border border-zinc-100 rounded-2xl p-6 hover:shadow-lg hover:border-zinc-200 transition-all group flex flex-col md:flex-row gap-6 md:gap-12 md:items-center relative overflow-hidden"
                                    >
                                      {/* Left side: Time & Teams */}
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-4 flex-wrap">
                                          <span className="font-mono text-[10px] bg-zinc-100 text-zinc-600 px-2 py-1 rounded font-bold uppercase tracking-widest">
                                            {new Date(odd.commence_time).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' })}
                                          </span>
                                          <span className="font-mono text-[10px] text-brand border border-brand/20 bg-brand/5 px-2 py-1 rounded font-bold uppercase tracking-widest">
                                            {(odd.status === 'final' || odd.status === 'finished' || odd.status === 'completed') ? "FINAL" : 
                                               new Date(odd.commence_time).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }) + " PT"}
                                          </span>
                                          {odd.weather && odd.status !== "live" && (
                                            <span className="font-mono text-[10px] bg-zinc-50 border border-zinc-100 text-zinc-500 px-2 py-1 rounded font-bold uppercase tracking-widest ml-auto hidden sm:block">
                                              {odd.weather.display}
                                            </span>
                                          )}
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-lg font-medium text-zinc-800 group-hover:text-ink transition-colors">{odd.away_team}</span>
                                            {maxAwayML > 0 && <span className="font-mono text-sm px-2 py-1 bg-zinc-50 rounded hidden md:block">{toAmerican(1 / maxAwayML)}</span>}
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-lg font-medium text-zinc-800 group-hover:text-ink transition-colors">{odd.home_team}</span>
                                            {maxHomeML > 0 && <span className="font-mono text-sm px-2 py-1 bg-zinc-50 rounded hidden md:block">{toAmerican(1 / maxHomeML)}</span>}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right side: Line Metrics */}
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 pt-6 md:pt-0 border-t md:border-t-0 border-zinc-100 md:pl-8 md:border-l">
                                        <div>
                                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">True Odds</p>
                                          <div className="space-y-1">
                                            <p className="font-mono text-sm text-ink">{trueAway}</p>
                                            <p className="font-mono text-sm text-ink">{trueHome}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Win Prob</p>
                                          <div className="space-y-1">
                                            <p className="font-mono text-sm text-zinc-600">{(trueAwayProb * 100).toFixed(1)}%</p>
                                            <p className="font-mono text-sm text-zinc-600">{(trueHomeProb * 100).toFixed(1)}%</p>
                                          </div>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                          <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-2">Market</p>
                                          <div className="space-y-1">
                                            <p className="font-mono text-xs text-zinc-600"><span className="text-zinc-500 mr-2">Vig:</span>{vigPct}%</p>
                                            {consensusTotal && <p className="font-mono text-xs text-zinc-600"><span className="text-zinc-500 mr-2">Total:</span>{consensusTotal}</p>}
                                            {odd.venue && <p className="font-mono text-[10px] text-zinc-500 mt-2 truncate w-[100px]" title={odd.venue}>{odd.venue}</p>}
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })
                              )}
                            </div>
                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  }
                />
                <Route
                  path="/game/:date/:slug"
                  element={<GameDetail />}
                />
                <Route
                  path="/pricing"
                  element={
                    <PricingView
                      user={user}
                      onSubscribe={(tier) => console.log("Subscribe:", tier)}
                    />
                  }
                />
              </Routes>
            </div>

            {/* Overlay for mobile bottom sheet */}
            <AnimatePresence>
            {isSlateExpanded && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-40 bg-zinc-900/10 backdrop-blur-sm xl:hidden"
                onClick={() => setIsSlateExpanded(false)}
              />
            )}
            </AnimatePresence>

            {/* Sidebar / Bottom Rail */}
            <motion.aside 
              initial={false}
              animate={{ 
                x: isSlateOpen ? 0 : "100%",
                y: 0 
              }}
              className={cn(
                "bg-white/90 backdrop-blur-3xl flex flex-col shrink-0 border-l border-zinc-200/50",
                "fixed top-0 bottom-0 right-0 w-80 z-60",
                "shadow-none translate-y-0"
              )}
            >
              {/* Slate Content */}
              <div className="flex flex-col flex-1 overflow-hidden pt-4">
                {/* Header & Tabs */}
                <div className="flex-shrink-0 px-8 pb-4 z-20">
                  <div className="flex items-center justify-between mb-6">
                    <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">
                      Action Slate
                    </span>
                    <button onClick={() => setIsSlateOpen(false)} className="text-zinc-400 hover:text-ink">
                        <X size={16} />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto custom-scrollbar no-scrollbar">
                  {/* Game List */}
                  <div className="pb-8">
                    {isLoadingOdds ? (
                      <div className="p-10 text-center flex flex-col items-center justify-center mt-10">
                        <p className="text-[9px] text-zinc-400 uppercase tracking-widest font-bold">
                          Hydrating...
                        </p>
                      </div>
                    ) : fullSlate.length === 0 ? (
                      <div className="p-12 text-center flex flex-col gap-2 mt-10">
                        <span className="text-[11px] text-zinc-400 font-medium">No games scheduled for {slateFilter}</span>
                      </div>
                    ) : (
                      fullSlate.map((odd, idx) => {
                        const bookmaker = odd.bookmakers[0];
                        const totals = bookmaker?.markets.find((m) => m.key === "totals");
                        const totalPoint = totals?.outcomes.find((o) => o.name === "Over")?.point;
                        const h2h = bookmaker?.markets.find((m) => m.key === "h2h");
                        const moneylineStr = typeof h2h?.outcomes[0]?.price === "string" ? h2h.outcomes[0].price : undefined;

                        return (
                          <Link
                            key={idx}
                            to={`/game/${odd.id}`}
                            className={cn(
                              "block w-full flex flex-col px-6 xl:px-8 py-5 border-b border-zinc-200/40 transition-colors duration-200 group text-left",
                              odd.status === "live" ? "bg-zinc-50/50 hover:bg-zinc-100/50" : "hover:bg-zinc-50"
                            )}
                          >
                            <div className="w-full flex items-center justify-between">
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  {odd.status === "live" && (
                                    <span className="w-1.5 h-1.5 rounded-full bg-zinc-900" />
                                  )}
                                  <span className="text-[9px] uppercase tracking-widest font-black text-zinc-500 group-hover:text-zinc-800 transition-colors">
                                    {odd.status === "live" ? (
                                      <span className="text-zinc-900">{odd.inning_half && odd.inning ? `${odd.inning_half} ${odd.inning}` : "Live"}{odd.situation ? ` • ${odd.situation}` : ""}</span>
                                    ) : odd.status === "final" ? (
                                      "FINAL"
                                    ) : (
                                      new Date(odd.commence_time).toLocaleTimeString([], {
                                        hour: "numeric",
                                        minute: "2-digit",
                                      })
                                    )}
                                    {bookmaker?.title && (
                                      <span className="ml-2 text-zinc-400 group-hover:text-zinc-500 transition-colors">
                                        ({bookmaker.title})
                                      </span>
                                    )}
                                    {odd.weather && odd.status !== "live" && (
                                      <span className="ml-2 text-zinc-500 group-hover:text-zinc-700 transition-colors hidden md:inline">
                                        • {odd.weather.display}
                                      </span>
                                    )}
                                  </span>
                                </div>
                                <div className="text-sm text-zinc-900 font-medium">
                                  {odd.status === "live" || odd.status === "final" ? (
                                    <div className="flex flex-col gap-1.5 font-serif-italic">
                                      <span className="flex items-center justify-between w-40">
                                        <span>{odd.away_team}</span>
                                        <span className="font-mono font-medium text-xs text-zinc-500">{odd.away_score || "0"}</span>
                                      </span>
                                      <span className="flex items-center justify-between w-40">
                                        <span>{odd.home_team}</span>
                                        <span className="font-mono font-bold text-xs text-zinc-900">{odd.home_score || "0"}</span>
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="flex flex-col gap-1 font-serif-italic">
                                      <span>{odd.away_team}</span>
                                      <span className="text-zinc-500 text-xs text-medium">at {odd.home_team}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                {moneylineStr && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 group-hover:text-zinc-500 transition-colors">ML</span>
                                    <span className="font-mono text-sm text-zinc-700 group-hover:text-zinc-900 transition-colors">{moneylineStr}</span>
                                  </div>
                                )}
                                {totalPoint && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-400 group-hover:text-zinc-500 transition-colors">O/U</span>
                                    <span className="font-mono text-sm text-zinc-700 group-hover:text-zinc-900 transition-colors">{totalPoint}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Pitching Matchup - clean and subtle */}
                            {(odd.away_pitcher || odd.home_pitcher) && (
                              <div className="w-full mt-4 pt-4 border-t border-zinc-200/40 opacity-70 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1.5 mb-3">
                                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-500">Matchup</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {(odd.status === "live" && odd.situation_detail?.pitcher && odd.situation_detail?.batter) ? (
                                    <>
                                      <PitcherDisplay teamFull="Pitching" name={odd.situation_detail.pitcher.name || "TBA"} headshot={odd.situation_detail.pitcher.headshot} record={getPitcherLiveStats(odd.situation_detail.pitcher, odd)} small />
                                      <PitcherDisplay teamFull="Batting" name={odd.situation_detail.batter.name || "TBA"} headshot={odd.situation_detail.batter.headshot} record={odd.situation_detail.batter.summary || "Hitting"} alignRight small />
                                    </>
                                  ) : (
                                    <>
                                      <PitcherDisplay teamFull={odd.away_team} name={odd.status === "live" && odd.away_live_pitcher ? odd.away_live_pitcher.name : odd.away_pitcher} headshot={odd.status === "live" && odd.away_live_pitcher ? odd.away_live_pitcher.headshot : odd.away_pitcher_headshot} record={odd.status === "live" && odd.away_live_pitcher ? getPitcherLiveStats(odd.away_live_pitcher) : odd.away_pitcher_record} small />
                                      <PitcherDisplay teamFull={odd.home_team} name={odd.status === "live" && odd.home_live_pitcher ? odd.home_live_pitcher.name : odd.home_pitcher} headshot={odd.status === "live" && odd.home_live_pitcher ? odd.home_live_pitcher.headshot : odd.home_pitcher_headshot} record={odd.status === "live" && odd.home_live_pitcher ? getPitcherLiveStats(odd.home_live_pitcher) : odd.home_pitcher_record} alignRight small />
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </Link>
                        );
                      })
                    )}
                  </div>

                  {/* Recent Finals */}
                  {finalGames.length > 0 && (
                    <div className="border-t border-zinc-200/50 bg-zinc-50/50 mt-4 rounded-b-[2rem]">
                      <div className="px-6 xl:px-8 py-5 border-b border-zinc-200/40">
                        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-500 uppercase">
                          Recent Finals
                        </span>
                      </div>
                      <div className="p-6 xl:p-8 space-y-5">
                        {finalGames.map((odd, idx) => (
                          <Link 
                            key={idx} 
                            to={`/game/${odd.id}`}
                            className="block space-y-4 group outline-none"
                          >
                            <div className="flex justify-between items-center bg-white p-5 rounded-[1.25rem] shadow-[0_2px_8px_rgba(0,0,0,0.02)] border border-zinc-200/60 group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-all duration-300">
                               <div className="flex-1 space-y-3">
                                  <div className="flex items-center gap-3 text-sm">
                                    <img src={getEspnLogo(odd.away_team)} className="w-7 h-7 rounded-full border border-zinc-100 p-0.5 shadow-sm" alt="" />
                                    <span className="serif text-zinc-800 flex-1">{odd.away_team}</span>
                                    <span className="font-mono text-zinc-500 mr-2">{odd.away_score || "0"}</span>
                                  </div>
                                  <div className="flex items-center gap-3 text-sm">
                                    <img src={getEspnLogo(odd.home_team)} className="w-7 h-7 rounded-full border border-zinc-100 p-0.5 shadow-sm" alt="" />
                                    <span className="serif text-zinc-900 font-medium flex-1">{odd.home_team}</span>
                                    <span className="font-mono text-zinc-900 font-bold mr-2">{odd.home_score || "0"}</span>
                                  </div>
                               </div>
                               <ChevronRight className="w-4 h-4 text-zinc-400 group-hover:text-zinc-600 transition-colors" />
                            </div>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-8 text-center mt-auto">
                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-300">
                      Data via ESPN & The Odds API
                    </span>
                  </div>
                </div>
              </div>
            </motion.aside>

          </div>
        </main>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function AuthLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="h-full w-full bg-paper flex flex-col items-center justify-center p-12 text-center text-ink selection:bg-brand/10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full flex flex-col items-center"
      >
        <div className="mb-14 opacity-20">
          <div className="w-12 h-12 flex items-center justify-center font-serif italic text-6xl font-medium text-brand">
            B
          </div>
        </div>
        <h1 className="text-[18vw] sm:text-9xl font-semibold tracking-[-0.04em] leading-[0.85] mb-12 flex flex-col items-center">
          <span>THE DAILY</span>
          <span className="serif-italic font-medium text-brand">BASELINE</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-400 max-w-xl mx-auto leading-relaxed mb-16 font-medium">
          Institutional-grade statistical analysis and direct market board
          anchors. No fluff, just the tape.
        </p>
        <button
          onClick={onLogin}
          className="group relative flex items-center gap-8 py-4 px-10 border border-zinc-200 rounded-full hover:border-[#2D4A3E]/30 hover:bg-[#2D4A3E]/5 transition-all duration-500 overflow-hidden"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.4em] text-zinc-500 group-hover:text-brand transition-colors z-10 relative">
            Enter Board
          </div>
          <ChevronRight
            size={14}
            className="text-zinc-300 group-hover:text-brand group-hover:translate-x-2 transition-all duration-500 z-10 relative"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2D4A3E]/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </button>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 1 }}
        className="absolute bottom-12 flex items-center gap-8"
      >
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300">
          MLB
        </span>
        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300">
          NBA
        </span>
        <span className="w-1 h-1 bg-zinc-200 rounded-full" />
        <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-300">
          Direct Feed
        </span>
      </motion.div>
    </div>
  );
}

import { PricingView } from "./components/PricingView";

function SideNavIcon({
  active,
  onClick,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "relative w-12 h-12 flex items-center justify-center rounded-xl transition-all duration-300",
        active 
          ? "bg-white text-brand shadow-precise border border-zinc-100" 
          : "text-zinc-400 hover:text-ink hover:bg-zinc-100/50"
      )}
    >
      {active && (
        <motion.div
           layoutId="nav-pill"
           className="absolute -left-4 w-1.5 h-4 bg-brand rounded-r-full"
        />
      )}
      <div className={cn("transition-transform duration-300", active ? "scale-110" : "scale-100")}>
        {icon}
      </div>
    </button>
  );
}

function RechartsDataBlock({ codeString }: { codeString: string }) {
  try {
    const configData = JSON.parse(codeString);
    if (!configData || !configData.type || !configData.data || !configData.config) {
      throw new Error("Invalid Recharts block structure");
    }

    const { type, data, config } = configData;
    const isLine = type === "LineChart";
    const isBar = type === "BarChart";
    const isScatter = type === "ScatterChart";
    const isArea = type === "AreaChart";
    const isPie = type === "PieChart";

    const ChartComponent = isLine ? LineChart : isBar ? RechartsBarChart : isScatter ? ScatterChart : isArea ? AreaChart : isPie ? PieChart : LineChart;
    
    return (
      <div className="my-6 rounded-[2.5rem] bg-white border border-zinc-200 p-6 shadow-sm w-full h-[450px]">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-6">
          <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Data Visualization ({type})
          </span>
        </div>
        <div className="w-full h-[350px]">
          <ResponsiveContainer width="100%" height="100%">
            {/* @ts-ignore */}
            <ChartComponent data={data}>
              {!isPie && <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" />}
              {isScatter ? (
                <>
                  <XAxis dataKey={config.xAxisKey} type={config.xAxisType || "category"} tick={{ fontSize: 12, fill: "#71717a" }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                  <YAxis dataKey={config.yAxisKey} type={config.yAxisType || "number"} tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                  {config.zAxisKey && <ZAxis dataKey={config.zAxisKey} type="number" range={config.zAxisRange || [50, 400]} />}
                </>
              ) : !isPie ? (
                <>
                  <XAxis dataKey={config.xAxisKey} tick={{ fontSize: 12, fill: "#71717a" }} axisLine={{ stroke: "#e4e4e7" }} tickLine={false} />
                  <YAxis tick={{ fontSize: 12, fill: "#71717a" }} axisLine={false} tickLine={false} />
                </>
              ) : null}
              <RechartsTooltip 
                contentStyle={{ borderRadius: "12px", border: "none", boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)" }}
                itemStyle={{ fontSize: "14px", fontWeight: "600" }}
                labelStyle={{ fontSize: "12px", color: "#71717a", marginBottom: "4px" }}
              />
              <Legend wrapperStyle={{ fontSize: "12px", color: "#52525b" }} iconType="circle" />
              
              {isPie && config.series?.map((s: any, idx: number) => (
                <Pie 
                  key={idx} 
                  data={data} 
                  dataKey={s.dataKey} 
                  nameKey={config.xAxisKey} 
                  cx="50%" 
                  cy="50%" 
                  outerRadius={s.outerRadius || 120} 
                  innerRadius={s.innerRadius || 60} 
                  paddingAngle={5}
                >
                  {data.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={config.colors?.[index % config.colors.length] || "#09090b"} />
                  ))}
                </Pie>
              ))}

              {!isPie && config.series?.map((s: any, idx: number) => {
                if (isLine) {
                  return <Line key={idx} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color || "#09090b"} strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />;
                }
                if (isBar) {
                  return <Bar key={idx} dataKey={s.dataKey} name={s.name} fill={s.color || "#09090b"} radius={[4, 4, 0, 0]} />;
                }
                if (isScatter) {
                  return <Scatter key={idx} name={s.name} dataKey={s.dataKey || config.yAxisKey} fill={s.color || "#09090b"} />;
                }
                if (isArea) {
                  return <Area key={idx} type="monotone" dataKey={s.dataKey} name={s.name} stroke={s.color || "#09090b"} fill={s.color || "#09090b"} fillOpacity={0.3} />;
                }
                return null;
              })}
            </ChartComponent>
          </ResponsiveContainer>
        </div>
      </div>
    );
  } catch (e: any) {
    return (
      <div className="my-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 font-mono text-xs">
        Failed to render chart: {e.message}
      </div>
    );
  }
}

function D3DataBlock({ codeString }: { codeString: string }) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    
    let configData;
    try {
      configData = JSON.parse(codeString);
    } catch (e) {
      console.error("Invalid D3 config");
      return;
    }

    const { type, data, config } = configData;
    const width = containerRef.current.clientWidth;
    const height = 350;

    // Clear previous
    d3.select(containerRef.current).selectAll("*").remove();

    const svg = d3.select(containerRef.current)
      .append("svg")
      .attr("width", "100%")
      .attr("height", "100%")
      .attr("viewBox", `0 0 ${width} ${height}`);

    if (type === "NetworkGraph") {
      const { nodes, links } = data;
      
      const simulation = d3.forceSimulation(nodes)
        .force("link", (d3.forceLink(links) as any).id((d: any) => d.id).distance(config?.distance || 50))
        .force("charge", d3.forceManyBody().strength(config?.strength || -100))
        .force("center", d3.forceCenter(width / 2, height / 2));

      const link = svg.append("g")
        .selectAll("line")
        .data(links)
        .join("line")
        .attr("stroke", "#e4e4e7")
        .attr("stroke-width", 1.5);

      const node = svg.append("g")
        .selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", (d: any) => d.radius || 8)
        .attr("fill", (d: any) => d.color || "#09090b")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended) as any);

      node.append("title")
        .text((d: any) => d.label || d.id);

      simulation.on("tick", () => {
        link
          .attr("x1", (d: any) => d.source.x)
          .attr("y1", (d: any) => d.source.y)
          .attr("x2", (d: any) => d.target.x)
          .attr("y2", (d: any) => d.target.y);

        node
          .attr("cx", (d: any) => d.x)
          .attr("cy", (d: any) => d.y);
      });

      function dragstarted(event: any) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
      }
      
      function dragged(event: any) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
      }
      
      function dragended(event: any) {
        if (!event.active) simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
      }
    } else if (type === "Heatmap") {
       const margin = {top: 20, right: 20, bottom: 30, left: 40};
       const innerWidth = width - margin.left - margin.right;
       const innerHeight = height - margin.top - margin.bottom;

       const xGroups = Array.from(new Set(data.map((d: any) => d[config?.xAxisKey])));
       const yGroups = Array.from(new Set(data.map((d: any) => d[config?.yAxisKey])));

       const x = d3.scaleBand()
         .range([0, innerWidth])
         .domain(xGroups as string[])
         .padding(0.05);

       const y = d3.scaleBand()
         .range([innerHeight, 0])
         .domain(yGroups as string[])
         .padding(0.05);

       const colorScale = d3.scaleSequential()
         .interpolator(d3.interpolateBlues)
         .domain([0, d3.max(data, (d: any) => d[config?.valueKey]) as number]);

       const g = svg.append("g")
         .attr("transform", `translate(${margin.left},${margin.top})`);

       g.append("g")
         .attr("transform", `translate(0, ${innerHeight})`)
         .call(d3.axisBottom(x))
         .select(".domain").remove();

       g.append("g")
         .call(d3.axisLeft(y))
         .select(".domain").remove();

       g.selectAll()
         .data(data, (d: any) => d[config?.xAxisKey]+':'+d[config?.yAxisKey])
         .join("rect")
         .attr("x", (d: any) => x(d[config?.xAxisKey]) || 0)
         .attr("y", (d: any) => y(d[config?.yAxisKey]) || 0)
         .attr("width", x.bandwidth())
         .attr("height", y.bandwidth())
         .style("fill", (d: any) => colorScale(d[config?.valueKey]))
         .append("title")
         .text((d: any) => `${d[config?.xAxisKey]} - ${d[config?.yAxisKey]}: ${d[config?.valueKey]}`);
    }
  }, [codeString]);

  try {
    const configData = JSON.parse(codeString);
    return (
      <div className="my-6 rounded-[2.5rem] bg-white border border-zinc-200/50 p-6 shadow-sm w-full h-[450px]">
        <div className="flex items-center justify-between border-b border-zinc-100 pb-3 mb-6">
          <span className="font-mono text-[10px] font-bold text-zinc-500 uppercase tracking-[0.2em]">
            Data Visualization ({configData.type})
          </span>
        </div>
        <div className="w-full h-[350px]" ref={containerRef} />
      </div>
    );
  } catch (e: any) {
      return (
        <div className="my-6 p-4 rounded-xl bg-red-50 text-red-600 border border-red-100 font-mono text-xs">
          Failed to render D3 chart: {e.message}
        </div>
      );
  }
}


function CollaborativeEditor({ artifact }: { artifact: { id: string, content: string } }) {
  const [localContent, setLocalContent] = useState(artifact.content);
  
  useEffect(() => {
    setLocalContent(artifact.content);
  }, [artifact.content]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    setLocalContent(newVal);
  };

  const handleBlur = async () => {
    if (localContent !== artifact.content) {
      try {
        await updateDoc(doc(db, "artifacts", artifact.id), { content: localContent, fetchedAt: serverTimestamp() });
      } catch (err) {
        console.error("Failed to update artifact", err);
      }
    }
  };

  return (
    <div className="flex w-full h-full gap-4">
      <div className="flex-1 bg-zinc-900 shadow-sm ring-1 ring-zinc-900/5 relative rounded-xl overflow-hidden flex flex-col">
        <div className="border-b border-zinc-800 px-4 py-3 flex items-center gap-2">
          <Code2 size={14} className="text-zinc-500" />
          <span className="font-mono text-[10px] uppercase text-zinc-400 tracking-widest">Real-time Editor</span>
        </div>
        <textarea
           value={localContent}
           onChange={handleChange}
           onBlur={handleBlur}
           className="w-full flex-1 p-6 font-mono text-[13px] bg-transparent text-zinc-300 border-none outline-none resize-none"
           spellCheck={false}
        />
      </div>
      <div className="flex-1 bg-white shadow-sm ring-1 ring-zinc-900/5 rounded-xl overflow-hidden">
        <iframe
          srcDoc={localContent}
          className="w-full h-full border-none bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />
      </div>
    </div>
  );
}

function HtmlArtifactBlock({ codeString }: { codeString: string }) {
  const [view, setView] = useState<"preview" | "code">("preview");
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(codeString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const containerClasses = isFullscreen 
    ? "fixed inset-0 z-[100] bg-zinc-100 flex flex-col m-0 rounded-none w-full h-full"
    : "my-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm flex flex-col w-full";

  return (
    <motion.div layout className={containerClasses}>
      <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50 px-3 py-2">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2">
            <FileText size={14} className="text-zinc-500" />
            <span className="font-mono text-[11px] font-semibold text-zinc-600 uppercase tracking-wider">
              HTML Artifact
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-zinc-200/50 p-0.5 rounded-lg mr-2">
            <button
              onClick={() => setView("preview")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === "preview" 
                  ? "bg-white text-zinc-800 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Eye size={14} />
              Preview
            </button>
            <button
              onClick={() => setView("code")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[11px] font-medium transition-all ${
                view === "code" 
                  ? "bg-white text-zinc-800 shadow-sm" 
                  : "text-zinc-500 hover:text-zinc-700"
              }`}
            >
              <Code2 size={14} />
              Code
            </button>
          </div>

          <DeployDocumentBtn content={codeString} />
          
          <button
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-all"
            title="Copy HTML"
            onClick={handleCopy}
          >
            {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
          </button>
          
          <button
            className="p-1.5 text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100 rounded-md transition-all hidden md:flex"
            title={isFullscreen ? "Minimize" : "Expand"}
            onClick={() => setIsFullscreen(!isFullscreen)}
          >
            {isFullscreen ? <X size={16} /> : <TerminalSquare size={16} />} 
          </button>
        </div>
      </div>

      <div className={`w-full overflow-hidden flex flex-col bg-zinc-100/50 items-center ${isFullscreen ? 'flex-1 p-4 md:p-8' : 'p-0 py-4 md:py-8'}`}>
        <div className={`w-full bg-white shadow-sm ring-1 ring-zinc-900/5 relative overflow-hidden transition-all duration-300 ${isFullscreen ? 'h-full max-w-6xl rounded-2xl flex-1 flex' : 'min-h-[500px] h-[600px] max-w-[850px] rounded-xl'}`}>
          <AnimatePresence mode="wait">
            {view === "preview" ? (
              <motion.iframe
                key="preview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                srcDoc={codeString}
                className="w-full h-full border-none absolute inset-0 bg-white"
                sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
              />
            ) : (
              <motion.div
                key="code"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-0 bg-[#0d1117] overflow-auto"
              >
                <div className="p-6">
                  <SyntaxHighlighter
                    language="html"
                    style={vscDarkPlus}
                    customStyle={{
                      margin: 0,
                      padding: 0,
                      background: "transparent",
                      fontSize: "13px",
                      lineHeight: "1.6",
                    }}
                    wrapLines={true}
                    wrapLongLines={true}
                  >
                    {codeString}
                  </SyntaxHighlighter>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}

function DeployDocumentBtn({ content }: { content: string }) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!auth.currentUser) return;
    setIsDeploying(true);
    try {
      const docRef = await addDoc(collection(db, "artifacts"), {
        content: String(content).replace(/\n$/, ""),
        type: "html",
        title: "Generated Interface",
        source: "Gemini Chat Interaction",
        createdAt: serverTimestamp(),
        fetchedAt: serverTimestamp(),
        creatorId: auth.currentUser.uid,
      });
      const url = `${window.location.origin}${window.location.pathname}?artifact=${docRef.id}`;
      setDeployedUrl(url);
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeploying(false);
    }
  };

  if (deployedUrl) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-brand">Deployed!</span>
        <button
          onClick={() => navigator.clipboard.writeText(deployedUrl)}
          className="text-zinc-400 hover:text-zinc-600 transition-colors"
          title="Copy Link"
        >
          <Copy size={14} />
        </button>
        <button
          onClick={() => window.open(deployedUrl, "_blank")}
          className="text-zinc-400 hover:text-brand transition-colors"
          title="Open in new tab"
        >
          <Globe size={14} />
        </button>
      </div>
    );
  }

  return (
    <button
      className="text-zinc-400 hover:text-brand transition-colors"
      title="Generate Shareable Link"
      onClick={handleDeploy}
      disabled={isDeploying}
    >
      <Globe size={14} className={isDeploying ? "animate-pulse" : ""} />
    </button>
  );
}

function parseAuraTags(text: string) {
  const blocks = [];
  const regex = /\[(AURA_APP|AURA_CHART)\]([\s\S]*?)\[\/\1\]/g;
  let lastIndex = 0;
  let match;
  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      blocks.push({ type: 'markdown', content: text.substring(lastIndex, match.index) });
    }
    blocks.push({ type: match[1], content: match[2] });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) {
    blocks.push({ type: 'markdown', content: text.substring(lastIndex) });
  }
  return blocks.length > 0 ? blocks : [{ type: 'markdown', content: text }];
}

function ChatMessageItem({ m }: { m: ChatMessage }) {
  const isAI = m.role === "model";

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "grid grid-cols-[1fr] gap-6 max-w-2xl pb-8 md:pb-12",
        !isAI && "ml-auto text-right",
      )}
    >
      <div className="space-y-6">
        <div className={cn("flex items-center gap-4", !isAI && "justify-end")}>
          <span className="text-[0.65rem] font-bold uppercase tracking-[0.2em] text-zinc-400">
            {isAI ? "Analysis" : "User"}
          </span>
          <span className="w-1 h-1 bg-zinc-200 rounded-full" />
          <span className="text-[0.65rem] font-mono text-zinc-300 uppercase tabular-nums tracking-[0.2em]">
            {m.timestamp ? (
              new Date(m.timestamp?.toMillis ? m.timestamp.toMillis() : m.timestamp).toLocaleTimeString("en-US", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                hour12: false,
                timeZone: "America/Los_Angeles"
              })
            ) : "LIVE"}
          </span>
        </div>
        <div
          className={cn(
            "text-base leading-[1.8] tracking-tight",
            isAI
              ? "text-zinc-700 prose prose-zinc max-w-none prose-sm font-light w-full"
              : "text-zinc-900 font-medium text-xl md:text-2xl tracking-tighter w-full",
          )}
        >
          {isAI ? (
            <ArtifactRenderer content={m.text || ""} />
          ) : (
            <div className="text-zinc-900 font-normal tracking-tight">
              {m.text}
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function OddsCard({ odd, onClick, oddsSource }: { odd: SportOdds; onClick?: () => void; oddsSource?: "sportsbook" | "prediction" }) {
  const getLogo = getEspnLogo;
  
  const homePrice =
    odd.bookmakers?.[0]?.markets
      ?.find((m) => m.key === "h2h")
      ?.outcomes?.find(
        (o) =>
          o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name) || o.name?.includes("Yes"),
      )?.price || 0;
  const awayPrice =
    odd.bookmakers?.[0]?.markets
      ?.find((m) => m.key === "h2h")
      ?.outcomes?.find(
        (o) =>
          o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name) || o.name?.includes("No"),
      )?.price || 0;
  const totalsInfo = odd.bookmakers?.[0]?.markets?.find(
    (m) => m.key === "totals",
  );
  const totalPoint =
    totalsInfo?.outcomes?.find((o) => o.name === "Over")?.point || "-";
  const overPrice = totalsInfo?.outcomes?.find((o) => o.name === "Over")?.price || 0;
  const underPrice = totalsInfo?.outcomes?.find((o) => o.name === "Under")?.price || 0;

  const spreadsInfo = odd.bookmakers?.[0]?.markets?.find(
    (m) => m.key === "spreads",
  );
  const awaySpread = spreadsInfo?.outcomes?.find(
        (o) =>
          o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name),
      );
  const homeSpread = spreadsInfo?.outcomes?.find(
        (o) =>
          o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name),
      );

  return (
    <button
      onClick={onClick}
      className="block relative outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 rounded-[2.5rem] w-full text-left active:scale-[0.98] transition-all duration-200"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -6, transition: { duration: 0.4, ease: [0.32, 0.72, 0, 1] } }}
        whileTap={{ scale: 0.98 }}
        className={cn(
          "bg-white border rounded-[2.5rem] overflow-hidden flex flex-col group transition-all duration-500 shadow-precise hover:shadow-float cursor-pointer h-full border-zinc-200/50",
          odd.status === "live" && "ring-1 ring-zinc-900/5 border-zinc-900/10",
        )}
      >
        {/* Atmosphere Header */}
        <div className="bg-zinc-50/50 border-b border-zinc-100/60 px-6 md:px-8 py-4 md:py-5 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-500">
          <div className="flex items-center gap-5">
            <div className="flex items-center gap-2.5 px-3.5 py-1.5 bg-white rounded-full border border-zinc-100 shadow-sm">
              {odd.status === "live" ? (
                 <span className="text-zinc-900 flex items-center gap-1.5 font-black uppercase tracking-widest animate-pulse">
                  {odd.inning_half && odd.inning ? `${odd.inning_half} ${odd.inning}` : "Live"}
                </span>
              ) : (
                <span className="text-zinc-800 font-mono tracking-tighter">
                  {(odd.status === 'final' || odd.status === 'finished') ? "FINAL" : 
                    new Date(odd.commence_time).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 group-hover:text-zinc-700 transition-colors">
              <span className="truncate max-w-[124px] text-xs font-medium tracking-tight text-zinc-600">{odd.venue}</span>
            </div>
          </div>
          <div className="flex items-center gap-3 ml-auto">
            {!odd.situation_detail && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-100/50 border border-zinc-100/80 text-zinc-600">
                <span className="text-[9px] font-bold tracking-[0.1em]">{odd.tv_broadcast || "MLB.TV"}</span>
              </div>
            )}
            {odd.weather && odd.status !== "live" && (
              <div className="flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-zinc-100/50 border border-zinc-100/80 text-zinc-600">
                <span className="text-[9px] font-bold tracking-[0.1em]">{odd.weather.display}</span>
              </div>
            )}
          </div>
        </div>

        {/* Core Matchup */}
        <div className="p-6 md:p-10 space-y-6 md:space-y-8 flex-1 bg-white">
          <div className="relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] font-serif-italic text-sm text-zinc-300 pointer-events-none select-none z-10 flex flex-col items-center justify-center">
              vs
            </div>
            <div className="grid grid-cols-2 gap-8 md:gap-14">
              {/* Away Team */}
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-zinc-50 rounded-full scale-125 blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-700" />
                  <img
                    src={getLogo(odd.away_team)}
                    className="relative w-16 h-16 md:w-24 md:h-24 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-2.5 md:p-3 bg-white border border-zinc-50 group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    alt={odd.away_team}
                  />
                  {odd.status === "live" &&
                    parseInt(odd.away_score || "0") >
                      parseInt(odd.home_score || "0") && (
                      <div className="absolute top-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-zinc-900 rounded-full border-[2.5px] md:border-[3px] border-white shadow-md z-10" />
                    )}
                </div>
                <div>
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg md:text-2xl font-semibold text-zinc-900 tracking-tight leading-tight">
                      {odd?.away_team?.split?.(" ")?.pop?.() || "Away"}
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-0.5">{odd?.away_team?.split?.(" ")?.slice?.(0, -1)?.join?.(" ") || ""}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 mt-3 md:mt-4">
                    {odd.away_score && (
                      <span className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tighter block font-mono">
                        {odd.away_score}
                      </span>
                    )}
                    {odd.away_team_record && (
                      <span className="text-[9px] font-bold text-zinc-500 font-mono tracking-widest bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">{odd.away_team_record}</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Home Team */}
              <div className="flex flex-col items-center text-center space-y-4 md:space-y-5">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-zinc-50 rounded-full scale-125 blur-xl opacity-0 group-hover/logo:opacity-100 transition-opacity duration-700" />
                  <img
                    src={getLogo(odd.home_team)}
                    className="relative w-16 h-16 md:w-24 md:h-24 rounded-full shadow-[0_8px_32px_rgba(0,0,0,0.04)] p-2.5 md:p-3 bg-white border border-zinc-50 group-hover:scale-105 transition-transform duration-700 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    alt={odd.home_team}
                  />
                  {odd.status === "live" &&
                    parseInt(odd.home_score || "0") >
                      parseInt(odd.away_score || "0") && (
                      <div className="absolute top-0 right-0 w-3.5 h-3.5 md:w-4 md:h-4 bg-zinc-900 rounded-full border-[2.5px] md:border-[3px] border-white shadow-md z-10" />
                    )}
                </div>
                <div>
                  <div className="flex flex-col items-center">
                    <h3 className="text-lg md:text-2xl font-semibold text-zinc-900 tracking-tight leading-tight">
                      {odd?.home_team?.split?.(" ")?.pop?.() || "Home"}
                    </h3>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-[0.2em] mt-0.5">{odd?.home_team?.split?.(" ")?.slice?.(0, -1)?.join?.(" ") || ""}</span>
                  </div>
                  <div className="flex flex-col items-center gap-1.5 mt-3 md:mt-4">
                    {odd.home_score && (
                      <span className="text-2xl md:text-3xl font-bold text-zinc-900 tracking-tighter block font-mono">
                        {odd.home_score}
                      </span>
                    )}
                    {odd.home_team_record && (
                      <span className="text-[9px] font-bold text-zinc-500 font-mono tracking-widest bg-zinc-50 px-2 py-0.5 rounded-md border border-zinc-100">{odd.home_team_record}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matchup Visual / Context */}
          {odd.status === "live" && odd.situation_detail && (
            <div className="flex items-center justify-between px-6 py-5 bg-white rounded-[1.5rem] border border-zinc-100 shadow-[0_2px_12px_rgba(0,0,0,0.01)] overflow-hidden relative">
                {/* Background Accent */}
                <div className="absolute inset-0 bg-gradient-to-br from-white via-zinc-50/30 to-zinc-100/20 pointer-events-none" />
                
                <div className="flex flex-col gap-4 relative z-10">
                  <div className="flex items-center gap-6">
                    <span className="w-6 text-[8px] font-black text-zinc-300 font-mono tracking-[0.25em] uppercase italic">Ball</span>
                    <div className="flex gap-2">
                       {[1,2,3,4].map(b => (
                        <div key={b} className={cn(
                          "w-2 h-2 rounded-sm transition-all duration-700 transform rotate-45 border",
                          b <= odd.situation_detail!.balls 
                            ? "bg-zinc-900 border-zinc-950 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                            : "bg-zinc-50/50 border-zinc-200/60"
                        )} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="w-6 text-[8px] font-black text-zinc-300 font-mono tracking-[0.25em] uppercase italic">Strk</span>
                    <div className="flex gap-2">
                       {[1,2,3].map(s => (
                        <div key={s} className={cn(
                          "w-2 h-2 rounded-sm transition-all duration-700 transform rotate-45 border",
                          s <= odd.situation_detail!.strikes 
                            ? "bg-zinc-900 border-zinc-950 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                            : "bg-zinc-50/50 border-zinc-200/60"
                        )} />
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <span className="w-6 text-[8px] font-black text-zinc-400 font-mono tracking-[0.25em] uppercase italic">Outs</span>
                    <div className="flex gap-2">
                       {[1,2,3].map(o => (
                        <div key={o} className={cn(
                          "w-2 h-2 rounded-sm transition-all duration-700 transform rotate-45 border",
                          o <= odd.situation_detail!.outs 
                            ? "bg-zinc-900 border-zinc-950 shadow-[0_2px_4px_rgba(0,0,0,0.2)]" 
                            : "bg-zinc-50/50 border-zinc-200/60"
                        )} />
                      ))}
                    </div>
                  </div>
                  {(odd.situation_detail?.lastPitch || odd.situation_detail?.lastPlay) && (
                    <div className="mt-2 pt-2 border-t border-zinc-100 flex flex-col gap-1">
                      {odd.situation_detail.lastPitch && (
                        <div className="flex items-center gap-2">
                           <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-900 bg-zinc-100 px-1.5 py-0.5 rounded">
                             {odd.situation_detail.lastPitch.speed ? Math.round(odd.situation_detail.lastPitch.speed) + " MPH" : "PITCH"}
                           </span>
                           <span className="text-xs font-mono text-zinc-500">
                             {odd.situation_detail.lastPitch.type} {odd.situation_detail.lastPitch.call ? `· ${odd.situation_detail.lastPitch.call}` : ""}
                           </span>
                        </div>
                      )}
                      {odd.situation_detail.lastPlay && (
                        <p className="text-xs text-zinc-600 font-serif leading-tight">
                          {odd.situation_detail.lastPlay}
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <div className="relative w-24 h-24 transform rotate-45 origin-center bg-white border border-zinc-200/60 rounded shadow-[inset_0_2px_6px_rgba(0,0,0,0.03)] overflow-hidden">
                  <div className="absolute inset-3 border-[0.5px] border-zinc-100 rounded-sm" />
                  
                  {/* Field Lines */}
                  <div className="absolute top-1/2 left-1/2 w-[160%] h-[0.5px] bg-zinc-100 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
                  <div className="absolute top-1/2 left-1/2 h-[160%] w-[0.5px] bg-zinc-100 -translate-y-1/2 -translate-x-1/2 rotate-45 pointer-events-none" />
                  
                  {/* Bases */}
                  <div className="absolute bottom-[-5px] left-[-5px] w-5 h-5 bg-white rounded-sm border-[0.5px] border-zinc-200 shadow-sm transform rotate-45 z-10" />
                  
                  <div className={cn(
                    "absolute bottom-[-4px] right-[-4px] w-5 h-5 transition-all duration-[900ms] border rounded-sm transform",
                    odd.situation_detail.onFirst 
                      ? "bg-zinc-900 border-zinc-950 shadow-lg scale-110 z-20" 
                      : "bg-white border-zinc-100 shadow-sm"
                  )} />
                  
                  <div className={cn(
                    "absolute top-[-4px] right-[-4px] w-5 h-5 transition-all duration-[900ms] border rounded-sm transform",
                    odd.situation_detail.onSecond 
                      ? "bg-zinc-900 border-zinc-950 shadow-lg scale-110 z-20" 
                      : "bg-white border-zinc-100 shadow-sm"
                  )} />
                  
                  <div className={cn(
                    "absolute top-[-4px] left-[-4px] w-5 h-5 transition-all duration-[900ms] border rounded-sm transform",
                    odd.situation_detail.onThird 
                      ? "bg-zinc-900 border-zinc-950 shadow-lg scale-110 z-20" 
                      : "bg-white border-zinc-100 shadow-sm"
                  )} />

                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border border-zinc-100 flex items-center justify-center z-0">
                     <div className="w-4 h-[0.5px] bg-zinc-200 rotate-[-45deg]" />
                  </div>
                </div>
            </div>
          )}

          {/* Park / Weather - Always shown on the front of the card */}
          <div className="bg-zinc-50 rounded-[1.25rem] p-4 border border-zinc-200/50 flex flex-col justify-center min-h-[72px]">
             <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest mb-1.5">
                Park / Weather
             </div>
             <p className="text-sm text-zinc-600 leading-snug font-serif line-clamp-2">
                {odd.weather_vector ? (
                    <span className="text-zinc-900 font-medium">{odd.weather_vector.stadiumName} · {odd.weather_vector.temp}°F · {odd.weather_vector.description}</span>
                 ) : (
                    <>Playing at <span className="text-zinc-900 font-medium">{odd.location}</span>. {odd.venue_factor}{' '}
                    {odd.weather ? ` ${odd.weather.display}${odd.weather.wind ? ` with ${odd.weather.wind}` : ''}.` : ''}</>
                 )}
              </p>
          </div>

          {/* Institutional Data Row */}
          <div className="grid gap-2 md:gap-4 bg-zinc-100/30 p-2 rounded-[2rem] md:rounded-[2.25rem] border border-zinc-200/30 grid-cols-3">
              
              {/* Moneyline */}
              <div className="bg-white rounded-[1.75rem] md:rounded-[2rem] p-3 md:p-4 text-center border border-zinc-100/80 shadow-precise flex flex-col justify-center gap-2 md:gap-2.5 transition-shadow">
                <span className="block text-[7px] md:text-[8px] uppercase font-bold text-zinc-400 tracking-[0.2em] md:tracking-[0.25em] w-full text-center">
                  ML
                </span>
                <div className="flex flex-col gap-1 w-full flex-1 justify-center">
                  <div className="flex items-center justify-between w-full text-[9px] md:text-[11px] font-mono">
                    <span className="text-zinc-500 truncate mr-1 font-bold tracking-tight">{odd?.away_team?.split?.(" ")?.pop?.()?.substring?.(0,3)?.toUpperCase() || "AWY"}</span>
                    <div className="flex-shrink-0 scale-75 md:scale-90 origin-right"><PriceTag price={awayPrice} /></div>
                  </div>
                  <div className="flex items-center justify-between w-full text-[9px] md:text-[11px] font-mono">
                    <span className="text-zinc-500 truncate mr-1 font-bold tracking-tight">{odd?.home_team?.split?.(" ")?.pop?.()?.substring?.(0,3)?.toUpperCase() || "HME"}</span>
                    <div className="flex-shrink-0 scale-75 md:scale-90 origin-right"><PriceTag price={homePrice} /></div>
                  </div>
                </div>
              </div>

              {/* Over/Under */}
              <div className="bg-white rounded-[1.75rem] md:rounded-[2rem] p-3 md:p-4 text-center border border-zinc-100/80 shadow-precise flex flex-col justify-center gap-2 md:gap-2.5 transition-shadow">
                <span className="block text-[7px] md:text-[8px] uppercase font-bold text-zinc-400 tracking-[0.2em] md:tracking-[0.25em] w-full text-center">
                  Total
                </span>
                {totalPoint !== "-" ? (
                  <div className="flex flex-col gap-0.5 w-full flex-1 justify-center">
                    <div className="flex items-center justify-between w-full text-[9px] md:text-[11px] font-mono">
                      <span className="text-zinc-400 font-bold tracking-tighter">O {totalPoint}</span>
                      <span className="text-zinc-900 font-black">{overPrice > 0 ? `+${overPrice}` : overPrice}</span>
                    </div>
                    <div className="flex items-center justify-between w-full text-[9px] md:text-[11px] font-mono">
                      <span className="text-zinc-400 font-bold tracking-tighter">U {totalPoint}</span>
                      <span className="text-zinc-900 font-black">{underPrice > 0 ? `+${underPrice}` : underPrice}</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1">
                    <span className="text-[10px] font-mono font-medium text-zinc-300">N/A</span>
                  </div>
                )}
              </div>

              {/* Runline */}
              <div className="bg-white rounded-[1.75rem] md:rounded-[2rem] p-3 md:p-4 text-center border border-zinc-100/80 shadow-precise flex flex-col justify-center gap-2 md:gap-2.5 transition-shadow">
                <span className="block text-[7px] md:text-[8px] uppercase font-bold text-zinc-400 tracking-[0.2em] md:tracking-[0.25em] w-full text-center">
                  Spread
                </span>
                {awaySpread && homeSpread ? (
                  <div className="flex flex-col gap-0.5 w-full flex-1 justify-center">
                    <div className="flex items-center justify-between w-full text-zinc-900 font-mono whitespace-nowrap">
                      <span className="font-bold tracking-tighter text-[9px] md:text-[11px]">{awaySpread.point > 0 ? `+${awaySpread.point}` : awaySpread.point}</span>
                      <span className="text-[7px] md:text-[8px] font-black text-zinc-400">({awaySpread.price > 0 ? `+${awaySpread.price}` : (awaySpread.price || awayPrice)})</span>
                    </div>
                    <div className="flex items-center justify-between w-full text-zinc-900 font-mono whitespace-nowrap">
                      <span className="font-bold tracking-tighter text-[9px] md:text-[11px]">{homeSpread.point > 0 ? `+${homeSpread.point}` : homeSpread.point}</span>
                      <span className="text-[7px] md:text-[8px] font-black text-zinc-400">({homeSpread.price > 0 ? `+${homeSpread.price}` : (homeSpread.price || homePrice)})</span>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1">
                    <span className="text-[10px] font-mono font-medium text-zinc-300">N/A</span>
                  </div>
                )}
              </div>
          </div>

          {/* Pitching Narrative */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-4 relative px-2">
              <div className="absolute left-1/2 top-1 bottom-1 w-px bg-zinc-100/60 -translate-x-1/2" />
              {(odd.status === "live" && odd.situation_detail?.pitcher && odd.situation_detail?.batter) ? (
                <>
                  <PitcherDisplay
                    teamFull="Pitching"
                    name={odd.situation_detail.pitcher.name || "TBA"}
                    headshot={odd.situation_detail.pitcher.headshot}
                    record={getPitcherLiveStats(odd.situation_detail.pitcher, odd)}
                    small
                  />
                  <PitcherDisplay
                    teamFull="Batting"
                    name={odd.situation_detail.batter.name || "TBA"}
                    headshot={odd.situation_detail.batter.headshot}
                    record={odd.situation_detail.batter.summary || "Hitting"}
                    alignRight
                    small
                  />
                </>
              ) : (
                <>
                  <PitcherDisplay
                    teamFull={odd.away_team}
                    name={odd.status === "live" && odd.away_live_pitcher ? odd.away_live_pitcher.name : odd.away_pitcher}
                    headshot={odd.status === "live" && odd.away_live_pitcher ? odd.away_live_pitcher.headshot : odd.away_pitcher_headshot}
                    record={odd.status === "live" && odd.away_live_pitcher ? getPitcherLiveStats(odd.away_live_pitcher) : odd.away_pitcher_record}
                    small
                  />
                  <PitcherDisplay
                    teamFull={odd.home_team}
                    name={odd.status === "live" && odd.home_live_pitcher ? odd.home_live_pitcher.name : odd.home_pitcher}
                    headshot={odd.status === "live" && odd.home_live_pitcher ? odd.home_live_pitcher.headshot : odd.home_pitcher_headshot}
                    record={odd.status === "live" && odd.home_live_pitcher ? getPitcherLiveStats(odd.home_live_pitcher) : odd.home_pitcher_record}
                    alignRight
                    small
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </button>
  );
}

function MobileNavIcon({
  active,
  onClick,
  label,
  icon,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-300 py-1 flex-1 relative outline-none",
        active ? "text-ink" : "text-zinc-400"
      )}
    >
      <motion.div 
        whileTap={{ scale: 0.9 }}
        className="flex flex-col items-center gap-1"
      >
        <div className={cn(
          "transition-all duration-300",
          active ? "scale-110" : "scale-100"
        )}>
          {icon}
        </div>
        <span className={cn(
          "text-[9px] uppercase font-black tracking-wider transition-all duration-300",
          active ? "opacity-100" : "opacity-65"
        )}>
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="mobile-nav-indicator"
            className="absolute -bottom-1 w-1 h-1 bg-zinc-900 rounded-full"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </motion.div>
    </button>
  );
}

function PriceTag({ price }: { price: number | string }) {
  if (price === 0 || price === "N/A" || !price)
    return <span className="opacity-0">-</span>;
  const displayPrice =
    typeof price === "number"
      ? price > 0
        ? `+${price}`
        : price.toString()
      : price;

  const isPositive = typeof price === "number" ? price > 0 : price.toString().startsWith('+');

  return (
    <div className={cn(
      "font-mono text-[10px] font-bold px-3 py-1 rounded-full transition-all border shadow-sm",
      isPositive 
        ? "bg-zinc-900 text-white border-zinc-950" 
        : "bg-white text-zinc-900 border-zinc-200"
    )}>
      {displayPrice}
    </div>
  );
}

function GameDetailView({ odds, oddsSource }: { odds: SportOdds[], oddsSource?: "sportsbook" | "prediction" }) {
  const { gameId } = useParams();
  const odd = odds.find((o) => o.id === gameId);
  const navigate = useNavigate();

  if (!odd) {
    return (
      <div className="h-full w-full flex flex-col items-center justify-center text-zinc-400">
        <p>Game not found.</p>
        <button
          className="mt-4 text-brand hover:underline"
          onClick={() => navigate("/")}
        >
          Back to Board
        </button>
      </div>
    );
  }

  const homePrice =
    odd?.bookmakers?.[0]?.markets
      ?.find((m) => m.key === "h2h")
      ?.outcomes?.find(
        (o) =>
          o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name) || o.name?.includes("Yes"),
      )?.price || 0;
  const awayPrice =
    odd?.bookmakers?.[0]?.markets
      ?.find((m) => m.key === "h2h")
      ?.outcomes?.find(
        (o) =>
          o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name) || o.name?.includes("No"),
      )?.price || 0;
  const totalsInfo = odd?.bookmakers?.[0]?.markets?.find(
    (m) => m.key === "totals",
  );
  const totalPoint =
    totalsInfo?.outcomes?.find((o) => o.name === "Over")?.point || "-";

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar bg-white pb-[calc(100px+env(safe-area-inset-bottom,1.5rem))]">
      <div className="max-w-4xl mx-auto w-full px-5 md:px-0">
        <div className="pt-4 md:pt-12 mb-6 md:mb-12">
          <button
            className="group flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-zinc-400 hover:text-ink transition-all p-2 -ml-2"
            onClick={() => navigate("/")}
          >
            <ChevronLeft size={16} className="transition-transform group-active:-translate-x-1" /> Back to Slate
          </button>
        </div>

        <div className="mb-8">
          <div className="flex items-center gap-3 mb-3">
             <span
              className={cn(
                "px-3 py-0.5 rounded text-[9px] font-black uppercase tracking-widest whitespace-nowrap",
                odd.status === "live"
                  ? "bg-red-600 text-white animate-pulse"
                  : "bg-zinc-100 text-zinc-500",
              )}
            >
              {odd.status === "live"
                ? "LIVE"
                : (odd.status === "final" || odd.status === "finished")
                  ? "FINAL"
                  : "UPCOMING"}
            </span>
            <span className="text-zinc-400 text-[10px] font-mono uppercase tracking-widest ml-auto">
              {new Date(odd.commence_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
          <h1 className="text-2xl md:text-5xl font-medium serif-italic text-ink leading-tight">
            {odd.away_team} <span className="text-zinc-300 font-serif not-italic mx-1">@</span> {odd.home_team}
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-t border-zinc-100 pt-8 md:pt-12">
          <div className="flex flex-col gap-4 md:gap-6">
            <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">
              Away Side
            </span>
            <div className="flex items-center gap-4">
              <img
                src={getEspnLogo(odd.away_team)}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-zinc-50 shadow-sm"
                alt=""
              />
              <div>
                <div className="flex flex-wrap items-center gap-2 md:gap-3">
                  <h3 className="text-xl md:text-2xl serif text-ink">{odd.away_team}</h3>
                  {awayPrice !== 0 && <PriceTag price={awayPrice} />}
                </div>
                <p className="font-mono text-zinc-500 mt-1 text-xs">
                  {odd.away_score ? `Score: ${odd.away_score}` : "No score yet"}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-4 md:gap-6 text-left md:text-right md:items-end">
            <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">
              Home Side
            </span>
            <div className="flex items-center gap-4 md:flex-row-reverse">
              <img
                src={getEspnLogo(odd.home_team)}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-zinc-100"
                alt=""
              />
              <div className="flex flex-col md:items-end">
                <div className="flex flex-wrap items-center gap-2 md:gap-3 md:flex-row-reverse">
                  <h3 className="text-xl md:text-2xl serif text-ink">{odd.home_team}</h3>
                  {homePrice !== 0 && <PriceTag price={homePrice} />}
                </div>
                <p className="font-mono text-zinc-500 mt-1 text-xs">
                  {odd.home_score ? `Score: ${odd.home_score}` : "No score yet"}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-center mt-8 mb-4">
          <div className="bg-zinc-50 border border-zinc-100 rounded-lg px-4 md:px-6 py-4 flex flex-col md:flex-row items-center gap-6 md:gap-12 font-mono text-sm w-full md:w-auto">
            {totalPoint !== "-" && (
              <div className="flex flex-col items-center">
                <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase mb-1">
                  Total
                </span>
                <span className="text-ink font-bold">
                  O/U {totalPoint}
                </span>
              </div>
            )}
            <div className="flex flex-col items-center">
              <span className="text-[10px] text-zinc-400 font-sans font-bold uppercase mb-1">
                Status
              </span>
              <span className="text-brand font-bold">
                {odd.status === "final" ? "Final" : odd.situation || "Pregame"}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-8 mb-12">
            <BaseballDiamond 
              status={odd.status || "upcoming"}
              awayTeam={odd.away_team}
              homeTeam={odd.home_team}
              awayScore={odd.away_score}
              homeScore={odd.home_score}
              inning={odd.inning}
              inningHalf={odd.inning_half}
              situationDetail={odd.situation_detail}
            />
        </div>

        {(odd.away_pitcher || odd.home_pitcher) && (
          <div className="mt-16 bg-zinc-50 p-8 rounded-xl border border-zinc-100">
            <h3 className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-400 mb-8 flex items-center gap-3">
              <div className="w-2 h-2 rotate-45 bg-[#2D4A3E]" />
              {odd.status === "live" ? "Current Pitching" : "Starting Pitching Matchup"}
            </h3>

            <div className="grid grid-cols-2 gap-8 items-start">
              {(odd.status === "live" && odd.situation_detail?.pitcher && odd.situation_detail?.batter) ? (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-zinc-400 uppercase">
                      Pitching
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                        <img
                          src={odd.situation_detail.pitcher.headshot || `https://api.dicebear.com/7.x/initials/svg?seed=${odd.situation_detail.pitcher.name || "TBA"}&backgroundColor=e4e4e7&textColor=52525b`}
                          alt={odd.situation_detail.pitcher.name || "TBA"}
                          className="w-full h-full object-cover scale-110"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-serif text-ink tracking-tight">
                          {odd.situation_detail.pitcher.name || "TBA"}
                        </span>
                        <span className="font-mono text-sm text-zinc-500">
                          {getPitcherLiveStats(odd.situation_detail.pitcher, odd)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-right items-end">
                    <span className="text-sm font-bold text-zinc-400 uppercase">
                      Batting
                    </span>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                        <img
                          src={odd.situation_detail.batter.headshot || `https://api.dicebear.com/7.x/initials/svg?seed=${odd.situation_detail.batter.name || "TBA"}&backgroundColor=e4e4e7&textColor=52525b`}
                          alt={odd.situation_detail.batter.name || "TBA"}
                          className="w-full h-full object-cover scale-110"
                        />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-2xl font-serif text-ink tracking-tight">
                          {odd.situation_detail.batter.name || "TBA"}
                        </span>
                        <span className="font-mono text-sm text-zinc-500">
                          {odd.situation_detail.batter.summary || "Hitting"}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-2">
                    <span className="text-sm font-bold text-zinc-400 uppercase">
                      {odd.away_team.split(" ").pop()} (A)
                    </span>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                        <img
                          src={
                            ((odd.status === "live" && odd.away_live_pitcher?.headshot) 
                              ? odd.away_live_pitcher.headshot 
                              : odd.away_pitcher_headshot) ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${odd.away_pitcher || "TBA"}&backgroundColor=e4e4e7&textColor=52525b`
                          }
                          alt={(odd.status === "live" && odd.away_live_pitcher?.name) ? odd.away_live_pitcher.name : odd.away_pitcher || "TBA"}
                          className="w-full h-full object-cover scale-110"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-2xl font-serif text-ink tracking-tight">
                          {(odd.status === "live" && odd.away_live_pitcher?.name) ? odd.away_live_pitcher.name : odd.away_pitcher || "TBA"}
                        </span>
                        <span className="font-mono text-sm text-zinc-500">
                          {(odd.status === "live" && odd.away_live_pitcher) ? getPitcherLiveStats(odd.away_live_pitcher) : (odd.away_pitcher_record || "No record data")}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 text-right items-end">
                    <span className="text-sm font-bold text-zinc-400 uppercase">
                      {odd.home_team.split(" ").pop()} (H)
                    </span>
                    <div className="flex items-center gap-3 flex-row-reverse">
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-zinc-100 shrink-0 border border-zinc-200">
                        <img
                          src={
                            ((odd.status === "live" && odd.home_live_pitcher?.headshot) 
                              ? odd.home_live_pitcher.headshot 
                              : odd.home_pitcher_headshot) ||
                            `https://api.dicebear.com/7.x/initials/svg?seed=${odd.home_pitcher || "TBA"}&backgroundColor=e4e4e7&textColor=52525b`
                          }
                          alt={(odd.status === "live" && odd.home_live_pitcher?.name) ? odd.home_live_pitcher.name : odd.home_pitcher || "TBA"}
                          className="w-full h-full object-cover scale-110"
                        />
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-2xl font-serif text-ink tracking-tight">
                          {(odd.status === "live" && odd.home_live_pitcher?.name) ? odd.home_live_pitcher.name : odd.home_pitcher || "TBA"}
                        </span>
                        <span className="font-mono text-sm text-zinc-500">
                          {(odd.status === "live" && odd.home_live_pitcher) ? getPitcherLiveStats(odd.home_live_pitcher) : (odd.home_pitcher_record || "No record data")}
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

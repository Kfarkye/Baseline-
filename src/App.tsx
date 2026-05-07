import React, { useState, useEffect, useRef } from "react";

export const getPitcherLiveStats = (pitcher: any) => {
  if (!pitcher) return "Currently Pitching";
  const pc = pitcher.pitchCount ? `${pitcher.pitchCount} PC` : "";
  const era = pitcher.gameEra ? `${pitcher.gameEra} ERA` : "";
  if (pc || era) {
    return [pc, era].filter(Boolean).join(" · ");
  }
  return pitcher.summary || "Pitching";
};
import { motion, AnimatePresence } from "motion/react";
import {
  MessageSquare,
  TrendingUp,
  Calendar,
  Wallet,
  Settings,
  User as UserIcon,
  Send,
  ChevronRight,
  ChevronDown,
  LogOut,
  AlertCircle,
  PlusCircle,
  Plus,
  RefreshCw,
  BarChart,
  Zap,
  Check,
  Wind,
  Cloud,
  MapPin,
  ShieldCheck,
  Activity,
  Clock,
  History,
  LayoutGrid,
  Mic,
  Paperclip,
  Link2,
} from "lucide-react";
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
import {
  Download,
  Bot,
  Copy,
  Code,
  TerminalSquare,
  FileText,
  Globe,
  Info,
  UploadCloud,
  ImageIcon,
  Loader2,
  Camera,
  X,
  Search,
  Code2,
  Eye,
} from "lucide-react";
import { BaseballDiamond } from "./components/BaseballDiamond";
import { TeamStatsTable } from "./components/TeamStatsTable";
import GameDetail from "./GameDetail";

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

const OddsDisplay = ({ price }: { price: number | string | undefined }) => {
  if (price === undefined) return null;
  const displayPrice =
    typeof price === "number"
      ? price > 0
        ? `+${price}`
        : price
      : price.toString().startsWith("+") || price.toString().startsWith("-")
        ? price
        : `+${price}`;

  const isPositive = typeof price === "number" ? price > 0 : price.toString().startsWith('+');

  return (
    <div className={cn(
      "font-mono font-bold text-[10px] uppercase tracking-tight ring-1 ring-inset px-2.5 py-1 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all",
      isPositive 
        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10" 
        : "bg-white text-zinc-600 ring-zinc-200"
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
  const teamAbbr =
    MLB_TEAM_MAP[teamFull as keyof typeof MLB_TEAM_MAP] ||
    teamFull.substring(0, 3);
  const fallbackImg = `https://api.dicebear.com/7.x/initials/svg?seed=${name || "TBA"}&backgroundColor=e4e4e7&textColor=52525b`;

  return (
    <div
      className={cn("flex items-center gap-3", alignRight && "flex-row-reverse text-right")}
    >
      <div
        className={cn(
          small ? "w-9 h-9" : "w-12 h-12",
          "rounded-full overflow-hidden bg-zinc-50 shrink-0 shadow-[0_2px_8px_rgba(0,0,0,0.04)] border border-zinc-200/60 transition-transform group-hover:scale-105"
        )}
      >
        <img
          src={headshot || fallbackImg}
          className="w-full h-full object-cover scale-110"
          alt={name || "TBA"}
        />
      </div>
      <div className={cn("flex flex-col", alignRight && "items-end")}>
        <div
          className={cn("flex items-center gap-1.5 mb-0.5", alignRight && "flex-row-reverse")}
        >
          <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-[0.2em]">
            {teamAbbr.toUpperCase()}
          </span>
        </div>
        <span
          className={cn(
            small ? "text-sm" : "text-base",
            "font-medium text-zinc-900 leading-none mb-1 serif"
          )}
        >
          {name || "TBA"}
        </span>
        <span className="text-[10px] md:text-xs font-mono text-zinc-500">
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
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
                className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-[40px] p-6 flex flex-col xl:hidden overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-12">
                    <div className="text-3xl font-serif italic text-brand">B</div>
                    <button onClick={() => setIsMenuOpen(false)} className="text-sm font-bold tracking-widest uppercase text-zinc-500 hover:text-ink">
                        Close
                    </button>
                </div>
                
                <nav className="flex flex-col gap-10">
                    <div className="flex flex-col gap-4">
                        <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-400 uppercase">Navigation</span>
                        <button onClick={() => { navigate("/"); setActiveTab("board"); setIsMenuOpen(false); }} className="text-2xl font-medium tracking-tight text-ink text-left">Board</button>
                        <button onClick={() => { navigate("/"); setActiveTab("analysis"); setIsMenuOpen(false); }} className="text-2xl font-medium tracking-tight text-ink text-left">Analysis</button>
                        <button onClick={() => { navigate("/"); setActiveTab("ledger"); setIsMenuOpen(false); }} className="text-2xl font-medium tracking-tight text-ink text-left">Ledger</button>
                        <button onClick={() => { navigate("/"); setActiveTab("market"); setIsMenuOpen(false); }} className="text-2xl font-medium tracking-tight text-ink text-left">Market</button>
                        <button onClick={() => { navigate("/"); setActiveTab("stats"); setIsMenuOpen(false); }} className="text-2xl font-medium tracking-tight text-ink text-left">Stats</button>
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

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [odds, setOdds] = useState<SportOdds[]>([]);
  const [isLoadingOdds, setIsLoadingOdds] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState("");
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
  const [sharedArtifact, setSharedArtifact] = useState<string | null>(null);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
  const [artifactsList, setArtifactsList] = useState<ArtifactMeta[]>([]);
  const chatEndRef = useRef<HTMLDivElement>(null);
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
      getDoc(doc(db, "artifacts", artifactId))
        .then((docSnap) => {
          if (docSnap.exists()) {
            setSharedArtifact(docSnap.data().content);
          }
        })
        .catch((err) => {
          console.error("Failed to load artifact", err);
        })
        .finally(() => {
          setIsLoadingArtifact(false);
        });
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

  const allGamesSorted = [...odds].sort(
    (a, b) =>
      new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime(),
  );

  const liveGames = allGamesSorted.filter((o) => o.status === "live");
  const upcomingGames = allGamesSorted.filter(
    (o) => o.status === "upcoming" || !o.status,
  );
  const finalGames = allGamesSorted
    .filter((o) => o.status === "final")
    .sort(
      (a, b) =>
        new Date(b.commence_time).getTime() -
        new Date(a.commence_time).getTime(),
    );
  const featuredGames = [...liveGames, ...upcomingGames].slice(0, 3);

  const previousGames = allGamesSorted.filter(
    (o) => categorizeGame(o.commence_time) === "previous",
  );
  let todayGames = allGamesSorted.filter(
    (o) => categorizeGame(o.commence_time) === "today",
  );

  // Sort live games first in today's games
  todayGames = [...todayGames].sort((a, b) => {
    if (a.status === "live" && b.status !== "live") return -1;
    if (a.status !== "live" && b.status === "live") return 1;
    return 0; // maintain time sort otherwise since allGamesSorted is already sorted by time
  });

  const tomorrowGames = allGamesSorted.filter(
    (o) => categorizeGame(o.commence_time) === "tomorrow",
  );

  const baseDateSlate =
    slateFilter === "previous"
      ? previousGames
      : slateFilter === "tomorrow"
        ? tomorrowGames
        : todayGames;

  const baseSlate = baseDateSlate.filter((game) => {
     if (gameStatusFilter === "all") return true;
     if (gameStatusFilter === "live") return game.status === "live";
     if (gameStatusFilter === "ended") return game.status === "final";
     if (gameStatusFilter === "pregame") return game.status === "upcoming" || !game.status;
     return true;
  });

  const sourceFilteredSlate = baseSlate.map(game => ({
     ...game,
     bookmakers: game.bookmakers.filter(b => 
       oddsSource === "prediction" ? b.key === "kalshi" : b.key !== "kalshi"
     )
  }));

  const allBookmakers = Array.from(
    new Set(sourceFilteredSlate.flatMap((o) => o.bookmakers.map((b) => b.title))),
  ).sort();

  const fullSlate = sourceFilteredSlate.filter((game) => {
    // 1. Bookmaker Filter
    let hasBookie = true;
    if (selectedBookie !== "All Bookmakers") {
      hasBookie = game.bookmakers.some((b) => b.title === selectedBookie);
    }
    if (!hasBookie) return false;

    // Get the bookie data we'll use for market/odds filtering
    const bookie =
      selectedBookie === "All Bookmakers"
        ? game.bookmakers[0]
        : game.bookmakers.find((b) => b.title === selectedBookie);

    // If a specific filter is set, and there's no bookie, hide it. However, if no specific filters are set, we can show it even without odds
    if (!bookie && (selectedMarket !== "all" || minOdds !== "" || maxOdds !== "")) {
        return false;
    }

    if (bookie) {
      // 2. Market Filter
      if (selectedMarket !== "all") {
        const hasMarket = bookie.markets.some((m) => m.key === selectedMarket);
        if (!hasMarket) return false;
      }

      // 3. Odds Range Filter
      if (minOdds !== "" || maxOdds !== "") {
        const min = minOdds === "" ? -Infinity : parseFloat(minOdds);
        const max = maxOdds === "" ? Infinity : parseFloat(maxOdds);

        // Check if ANY outcome in ANY market matches the range
        const matchesRange = bookie.markets.some((m) => {
          // If a specific market is selected, only check that one
          if (selectedMarket !== "all" && m.key !== selectedMarket) return false;

          return m.outcomes.some((o) => {
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
            setInputText(transcript);
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

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    console.log("Sending message...", { inputText, attachment });
    if ((!inputText.trim() && !attachment) || !user) return;

    // Use default tier if userData didn't load properly yet
    const planTier = userData?.planTier || "free";
    const queryCount = userData?.queryCount || 0;

    if (planTier === "free" && queryCount >= 100) {
      setShowUpgradeModal(true);
      return;
    }

    const userMessage: ChatMessage = { role: "user", text: inputText.trim() || "[Attachment]" };
    const savedInputText = inputText.trim();
    setInputText("");
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
        <div className="w-full max-w-[850px] flex items-center justify-between mb-4 px-6 xl:px-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center font-serif italic text-xl font-medium text-brand select-none leading-none">
              B
            </div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
              Document Artifact
            </span>
          </div>
          <button
            onClick={() => (window.location.href = window.location.origin)}
            className="text-[11px] font-medium text-brand px-4 py-2 border border-brand/20 bg-brand/5 rounded-full hover:bg-brand/10 transition-colors"
          >
            Create Your Own
          </button>
        </div>
        <div className="w-full max-w-[850px] bg-white shadow-sm ring-1 ring-zinc-900/5 min-h-[800px]">
          <iframe
            srcDoc={sharedArtifact}
            className="w-full h-full min-h-[800px] border-none"
            sandbox="allow-scripts allow-same-origin"
          />
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
                    className="md:hidden text-xs font-bold tracking-[0.2em] uppercase"
                >
                    Menu
                </button>
                <div className="w-8 h-8 flex items-center justify-center font-serif italic text-3xl font-medium text-brand select-none leading-none pointer-events-none">
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
                          <div className="flex-1 px-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto space-y-16 custom-scrollbar">
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
                                            <PitcherDisplay
                                              teamFull={odd.away_team}
                                              name={odd.away_pitcher}
                                              headshot={
                                                odd.away_pitcher_headshot
                                              }
                                              record={odd.away_pitcher_record}
                                              small
                                            />
                                            <PitcherDisplay
                                              teamFull={odd.home_team}
                                              name={odd.home_pitcher}
                                              headshot={
                                                odd.home_pitcher_headshot
                                              }
                                              record={odd.home_pitcher_record}
                                              alignRight
                                              small
                                            />
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
                          <div className="p-2 pb-[env(safe-area-inset-bottom,0.5rem)] md:p-6 sticky bottom-0 md:bottom-4 z-50 flex justify-center">
                            <div className="w-full max-w-2xl bg-white shadow-[0_4px_24px_rgba(0,0,0,0.08)] border border-zinc-200 rounded-[2rem] p-1.5 flex flex-col gap-2 relative">
                              {/* Modes */}
                              <div className="flex gap-1">
                                {(["live", "stats", "trends"] as const).map(
                                  (mode) => {
                                    const isActive = groundingMode === mode;
                                    return (
                                      <button
                                        key={mode}
                                        type="button"
                                        onClick={() => toggleMode(mode)}
                                        className={cn(
                                          "flex-1 flex items-center justify-center transition-all text-[9px] rounded-full px-3 py-1.5 tracking-[0.1em] uppercase font-bold",
                                          isActive
                                            ? "bg-zinc-900 text-white"
                                            : "bg-white text-zinc-400 hover:text-zinc-900",
                                        )}
                                      >
                                        {mode}
                                      </button>
                                    );
                                  },
                                )}
                              </div>
                            {messages.length === 0 && (
                              <div className="flex flex-wrap gap-2 mb-5">
                                {getSuggestions().map((sug, idx) => (
                                  <button
                                    key={idx}
                                    type="button"
                                    onClick={() => setInputText(sug)}
                                    className="text-[11px] bg-zinc-50/80 border border-zinc-200/60 text-zinc-500 px-4 py-2.5 rounded-full hover:bg-white hover:text-zinc-900 hover:border-zinc-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300"
                                  >
                                    {sug}
                                  </button>
                                ))}
                              </div>
                            )}

                            {/* Actual Input Container */}
                             <div className="w-full flex flex-col gap-2">
                                    {attachment && (
                                        <div className="bg-zinc-100 rounded-lg p-2 flex items-center gap-2 text-xs text-zinc-600">
                                            <span>{attachment.name}</span>
                                            <button onClick={() => setAttachment(null)} className="ml-auto hover:text-red-500">
                                                <X size={14} />
                                            </button>
                                        </div>
                                    )}
                                    <div className="flex items-end gap-3 w-full bg-white border border-zinc-200 rounded-xl px-3 py-2 shadow-sm focus-within:ring-2 focus-within:ring-brand/20 transition-all">
                                        <input type="file" ref={fileInputRef} className="hidden" accept="image/*,application/pdf" onChange={handleFileChange} />
                                        <button title="Upload file" className="text-zinc-600 hover:text-zinc-900 p-1 shrink-0" onClick={() => fileInputRef.current?.click()}>
                                            <Plus size={20} />
                                        </button>
                                        <button title="Add URL Context" className="text-zinc-600 hover:text-zinc-900 p-1 shrink-0" onClick={() => {
                                            setInputText(prev => prev ? `${prev}\nGround this context: https://` : `Ground this context: https://`);
                                        }}>
                                            <Link2 size={20} />
                                        </button>
                                        <textarea
                                            value={inputText}
                                            onChange={(e) => setInputText(e.target.value)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" && !e.shiftKey) {
                                                    e.preventDefault();
                                                    sendMessage();
                                                }
                                            }}
                                            className="flex-1 text-sm bg-transparent outline-none p-1 text-zinc-900 resize-none min-h-[24px] max-h-32 placeholder-zinc-400"
                                            placeholder="Ask for anything or paste a link..."
                                            rows={1}
                                            style={{ height: 'auto' }}
                                            onInput={(e: any) => {
                                                e.target.style.height = 'auto';
                                                e.target.style.height = e.target.scrollHeight + 'px';
                                            }}
                                        />
                                        <button className={cn("text-zinc-600 hover:text-zinc-900 p-1 shrink-0 transition-colors", isListening ? "text-red-500 animate-pulse" : "")} onClick={handleVoiceToggle}>
                                            <Mic size={20} />
                                        </button>
                                        <button 
                                            onClick={() => {sendMessage();}}
                                            className={cn("p-1 shrink-0 transition-colors text-zinc-500", (inputText.trim() || attachment) ? "text-zinc-900" : "")}
                                            disabled={!inputText.trim() && !attachment}
                                        >
                                            <Send size={20} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
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
                          <div className="max-w-6xl mx-auto space-y-8">
                            <div className="flex flex-col border-b border-zinc-100 md:pb-10 md:gap-6">
                              {/* DESKTOP HEADER (>768px) */}
                              <div className="hidden md:flex flex-row items-end justify-between gap-6 pb-4 md:pb-0">
                                <div>
                                  <h2 className="text-4xl serif-italic font-medium text-zinc-900 tracking-tight mb-8">
                                    The Daily Board
                                  </h2>
                                  <div className="hidden md:flex items-center gap-4">
                                    <div className="flex items-center gap-6 inline-flex">
                                      {["previous", "today", "tomorrow"].map(
                                        (filter) => (
                                          <button
                                            key={filter}
                                            onClick={() =>
                                              setSlateFilter(filter as any)
                                            }
                                            className={cn(
                                              "text-[11px] uppercase tracking-[0.2em] transition-colors",
                                              slateFilter === filter
                                                ? "text-zinc-900 font-medium"
                                                : "text-zinc-400 hover:text-zinc-600",
                                            )}
                                          >
                                            {filter}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                    <div className="flex items-center gap-6 inline-flex">
                                      {["all", "pregame", "live", "ended"].map(
                                        (filter) => (
                                          <button
                                            key={filter}
                                            onClick={() =>
                                              setGameStatusFilter(filter as any)
                                            }
                                            className={cn(
                                              "text-[11px] uppercase tracking-[0.2em] transition-colors",
                                              gameStatusFilter === filter
                                                ? "text-zinc-900 font-medium"
                                                : "text-zinc-400 hover:text-zinc-600",
                                            )}
                                          >
                                            {filter}
                                          </button>
                                        ),
                                      )}
                                    </div>
                                    <div className="flex items-center p-1 bg-zinc-100/60 rounded-xl border border-zinc-200/50 inline-flex">
                                      {[
                                        { label: "Sportsbooks", val: "sportsbook" },
                                        { label: "Prediction Markets", val: "prediction" }
                                      ].map((source) => (
                                        <button
                                          key={source.val}
                                          onClick={() => {
                                            setOddsSource(source.val as any);
                                            setSelectedBookie("All Bookmakers");
                                          }}
                                          className={cn(
                                            "text-[10px] uppercase tracking-widest font-bold px-4 py-2 rounded-lg transition-all duration-300",
                                            oddsSource === source.val
                                              ? "bg-zinc-900 text-white shadow-[0_2px_8px_rgba(0,0,0,0.08)]"
                                              : "text-zinc-500 hover:text-zinc-700",
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
                          className="p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 h-full flex flex-col overflow-y-auto"
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
                          className="h-full p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto custom-scrollbar"
                        >
                            <div className="max-w-5xl mx-auto">
                                <h2 className="text-4xl serif-italic font-medium text-ink tracking-tight mb-12">
                                  Team Statistics
                                </h2>
                                <TeamStatsTable />
                            </div>
                        </motion.div>
                      )}

                      {activeTab === "market" && (
                        <motion.div
                          key="market"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="h-full p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 overflow-y-auto custom-scrollbar"
                        >
                          <div className="max-w-5xl mx-auto">
                            <div className="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-100 pb-10 mb-12 gap-6">
                              <div>
                                <h2 className="text-4xl serif-italic font-medium text-ink tracking-tight">
                                  Schedule
                                </h2>
                                <p className="text-zinc-400 text-[10px] uppercase tracking-[0.4em] font-bold mt-4">
                                  Rotations & Line Metrics
                                </p>
                              </div>
                              <div className="flex items-center bg-white border border-zinc-200 rounded-xl px-4 py-2 w-full md:w-64 focus-within:border-brand focus-within:ring-1 focus-within:ring-brand/20 transition-all">
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
                                        <div className="flex items-center gap-3 mb-4">
                                          <span className="font-mono text-[10px] bg-zinc-100 text-zinc-500 px-2 py-1 rounded font-bold uppercase tracking-widest">
                                            {new Date(odd.commence_time).toLocaleDateString('en-US', { timeZone: 'America/Los_Angeles', weekday: 'short', month: 'short', day: 'numeric' })}
                                          </span>
                                          <span className="font-mono text-[10px] text-brand border border-brand/20 bg-brand/5 px-2 py-1 rounded font-bold uppercase tracking-widest">
                                            {(odd.status === 'final' || odd.status === 'finished' || odd.status === 'completed') ? "FINAL" : 
                                               new Date(odd.commence_time).toLocaleTimeString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', minute: '2-digit' }) + " PT"}
                                          </span>
                                        </div>
                                        
                                        <div className="space-y-3">
                                          <div className="flex items-center justify-between">
                                            <span className="text-lg font-medium text-zinc-600 group-hover:text-ink transition-colors">{odd.away_team}</span>
                                            {maxAwayML > 0 && <span className="font-mono text-sm px-2 py-1 bg-zinc-50 rounded hidden md:block">{toAmerican(1 / maxAwayML)}</span>}
                                          </div>
                                          <div className="flex items-center justify-between">
                                            <span className="text-lg font-medium text-zinc-600 group-hover:text-ink transition-colors">{odd.home_team}</span>
                                            {maxHomeML > 0 && <span className="font-mono text-sm px-2 py-1 bg-zinc-50 rounded hidden md:block">{toAmerican(1 / maxHomeML)}</span>}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Right side: Line Metrics */}
                                      <div className="grid grid-cols-2 md:grid-cols-3 gap-6 md:gap-8 pt-6 md:pt-0 border-t md:border-t-0 border-zinc-100 md:pl-8 md:border-l">
                                        <div>
                                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">True Odds</p>
                                          <div className="space-y-1">
                                            <p className="font-mono text-sm text-ink">{trueAway}</p>
                                            <p className="font-mono text-sm text-ink">{trueHome}</p>
                                          </div>
                                        </div>
                                        <div>
                                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Win Prob</p>
                                          <div className="space-y-1">
                                            <p className="font-mono text-sm text-zinc-500">{(trueAwayProb * 100).toFixed(1)}%</p>
                                            <p className="font-mono text-sm text-zinc-500">{(trueHomeProb * 100).toFixed(1)}%</p>
                                          </div>
                                        </div>
                                        <div className="col-span-2 md:col-span-1">
                                          <p className="text-[10px] font-bold text-zinc-400 uppercase tracking-widest mb-2">Market</p>
                                          <div className="space-y-1">
                                            <p className="font-mono text-xs text-zinc-500"><span className="text-zinc-400 mr-2">Vig:</span>{vigPct}%</p>
                                            {consensusTotal && <p className="font-mono text-xs text-zinc-500"><span className="text-zinc-400 mr-2">Total:</span>{consensusTotal}</p>}
                                            {odd.venue && <p className="font-mono text-[10px] text-zinc-400 mt-2 truncate w-[100px]" title={odd.venue}>{odd.venue}</p>}
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
                                  <span className="text-[9px] uppercase tracking-widest font-black text-zinc-400 group-hover:text-zinc-900 transition-colors">
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
                                      <span className="ml-2 text-zinc-300 group-hover:text-zinc-400 transition-colors">
                                        ({bookmaker.title})
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
                                      <span className="text-zinc-400 text-xs">at {odd.home_team}</span>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right flex flex-col items-end gap-2">
                                {moneylineStr && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-300 group-hover:text-zinc-400 transition-colors">ML</span>
                                    <span className="font-mono text-sm text-zinc-700 group-hover:text-zinc-900 transition-colors">{moneylineStr}</span>
                                  </div>
                                )}
                                {totalPoint && (
                                  <div className="flex items-baseline gap-2">
                                    <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-300 group-hover:text-zinc-400 transition-colors">O/U</span>
                                    <span className="font-mono text-sm text-zinc-700 group-hover:text-zinc-900 transition-colors">{totalPoint}</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Pitching Matchup - clean and subtle */}
                            {(odd.away_pitcher || odd.home_pitcher) && (
                              <div className="w-full mt-4 pt-4 border-t border-zinc-200/40 opacity-70 group-hover:opacity-100 transition-opacity">
                                <div className="flex items-center gap-1.5 mb-3">
                                  <span className="text-[8px] uppercase tracking-[0.2em] font-bold text-zinc-400">Matchup</span>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  <PitcherDisplay teamFull={odd.away_team} name={odd.away_pitcher} headshot={odd.away_pitcher_headshot} record={odd.away_pitcher_record} small />
                                  <PitcherDisplay teamFull={odd.home_team} name={odd.home_pitcher} headshot={odd.home_pitcher_headshot} record={odd.home_pitcher_record} alignRight small />
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
                        <span className="text-[10px] font-bold tracking-[0.2em] text-zinc-400 uppercase">
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
                               <ChevronRight className="w-4 h-4 text-zinc-300 group-hover:text-zinc-500 transition-colors" />
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

function ChatMessageItem({ m }: { m: ChatMessage }) {
  const isAI = m.role === "model";
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
      className={cn(
        "grid grid-cols-[1fr] gap-4 max-w-2xl",
        !isAI && "ml-auto text-right",
      )}
    >
      <div className="space-y-4">
        <div className={cn("flex items-center gap-3", !isAI && "justify-end")}>
          <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-zinc-400">
            {isAI ? "Analysis" : "You"}
          </span>
          <span className="w-1 h-1 bg-zinc-200 rounded-full" />
          <span className="text-[10px] font-mono text-zinc-300 uppercase tabular-nums">
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
            "text-base leading-relaxed tracking-tight",
            isAI
              ? "text-zinc-700 prose prose-zinc max-w-none prose-sm font-light"
              : "text-zinc-900 font-medium text-xl md:text-2xl tracking-tighter",
          )}
        >
          {isAI ? (
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => (
                  <p className="mb-6 last:mb-0 text-zinc-700 leading-relaxed font-light">
                    {children}
                  </p>
                ),
                strong: ({ children }) => (
                  <strong className="text-zinc-900 font-semibold">{children}</strong>
                ),
                table: ({ children }) => (
                  <div className="w-full overflow-x-auto my-6 rounded-2xl border border-zinc-200 bg-zinc-50/50 backdrop-blur-sm">
                    <table className="w-full text-left border-collapse text-sm">
                      {children}
                    </table>
                  </div>
                ),
                thead: ({ children }) => (
                  <thead className="bg-white/50 border-b border-zinc-200">
                    {children}
                  </thead>
                ),
                tbody: ({ children }) => (
                  <tbody className="divide-y divide-zinc-200">
                    {children}
                  </tbody>
                ),
                tr: ({ children, isHeader, ...props }: any) => (
                  <tr
                    className="hover:bg-zinc-100/50 transition-colors"
                    {...props}
                  >
                    {children}
                  </tr>
                ),
                th: ({ children }) => (
                  <th className="px-5 py-3 font-semibold text-[10px] text-zinc-500 uppercase tracking-widest border-r border-zinc-200 last:border-r-0">
                    {children}
                  </th>
                ),
                td: ({ children }) => {
                  let numValue = NaN;

                  // Attempt to parse string or array of strings into a number for heatmap coloring
                  const parseNum = (val: any) => {
                    if (typeof val === "string") {
                      const numStr = val.replace(/[^0-9.-]/g, "");
                      if (numStr && val.match(/^[-+]?[0-9]*\.?[0-9]+%?$/)) {
                        return parseFloat(numStr);
                      }
                    }
                    return NaN;
                  };

                  if (Array.isArray(children) && children.length === 1) {
                    numValue = parseNum(children[0]);
                  } else {
                    numValue = parseNum(children);
                  }

                  let bgColor = "transparent";
                  let textColor = "inherit";
                  if (!isNaN(numValue)) {
                    // Values > 0 get green, < 0 get red. This creates a really nice dynamic heatmap effect.
                    if (numValue > 0) {
                      const alpha = Math.min(
                        Math.max(Math.abs(numValue) / 100, 0.05),
                        0.3,
                      );
                      bgColor = `rgba(34, 197, 94, ${alpha})`;
                      if (alpha > 0.2) textColor = "#064e3b";
                    } else if (numValue < 0) {
                      const alpha = Math.min(
                        Math.max(Math.abs(numValue) / 100, 0.05),
                        0.3,
                      );
                      bgColor = `rgba(239, 68, 68, ${alpha})`;
                      if (alpha > 0.2) textColor = "#7f1d1d";
                    }
                  }

                  return (
                    <td
                      className="px-5 py-3 font-mono text-[12px] tabular-nums whitespace-nowrap transition-colors border-r border-zinc-200 last:border-r-0"
                      style={{
                        backgroundColor: bgColor,
                        color: textColor !== "inherit" ? textColor : undefined,
                      }}
                    >
                      {children}
                    </td>
                  );
                },
                code: ({ inline, className, children, ...props }: any) => {
                  const match = /language-(\w+)/.exec(className || "");

                  const extractText = (node: any): string => {
                    if (typeof node === "string") return node;
                    if (typeof node === "number") return String(node);
                    if (Array.isArray(node))
                      return node.map(extractText).join("");
                    if (
                      node &&
                      typeof node === "object" &&
                      node.props &&
                      node.props.children
                    ) {
                      return extractText(node.props.children);
                    }
                    return "";
                  };

                  const codeString = extractText(children).replace(/\n$/, "");

                  if (!inline && match) {
                    if (match[1] === "html") {
                      return <HtmlArtifactBlock codeString={codeString} />;
                    }

                    return (
                        <div className="my-6 rounded-2xl bg-[#F4F4F5] border border-zinc-200 p-4 font-mono text-[12px] overflow-x-auto text-zinc-900 shadow-sm">
                            <div className="flex items-center justify-between border-b border-zinc-800/10 mb-2 pb-2">
                                <span className="font-mono text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                                    {match[1]}
                                </span>
                            </div>
                            <pre className="overflow-x-auto">
                              <code className={className} {...props}>
                                {children}
                              </code>
                            </pre>
                        </div>
                    );
                  }
                  return (
                    <code className="text-[12px] px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-800 font-mono" {...props}>
                      {children}
                    </code>
                  );
                },
              }}
            >
              {m.text}
            </ReactMarkdown>
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

  return (
    <button
      onClick={onClick}
      className="block relative outline-none focus:ring-2 focus:ring-zinc-900 focus:ring-offset-2 rounded-[2rem] w-full text-left"
    >
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{ y: -4, transition: { duration: 0.3, ease: "easeOut" } }}
        className={cn(
          "bg-white border rounded-[2rem] overflow-hidden flex flex-col group transition-all duration-300 shadow-[0_2px_12px_rgba(0,0,0,0.03)] hover:shadow-[0_8px_30px_rgba(0,0,0,0.08)] cursor-pointer h-full border-zinc-200/60",
          odd.status === "live" && "ring-1 ring-zinc-900/10 border-zinc-900/10",
        )}
      >
        {/* Atmosphere Header */}
        <div className="bg-zinc-50/80 border-b border-zinc-100 px-6 py-4 flex items-center justify-between text-[10px] uppercase tracking-widest font-bold text-zinc-400">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-lg border border-zinc-200/50 shadow-sm">
              {odd.status === "live" ? (
                 <span className="text-zinc-900 flex items-center gap-1.5 font-black uppercase tracking-widest">
                  {odd.inning_half && odd.inning ? `${odd.inning_half} ${odd.inning}` : "Live"}
                </span>
              ) : (
                <span className="text-zinc-600 font-mono">
                  {(odd.status === 'final' || odd.status === 'finished') ? "FINAL" : 
                    new Date(odd.commence_time).toLocaleTimeString([], {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 group-hover:text-zinc-800 transition-colors">
              <span className="truncate max-w-[140px] text-xs">{odd.venue}</span>
            </div>
          </div>
          {odd.weather && odd.status !== "live" && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-md bg-zinc-50 border border-zinc-100 text-zinc-500">
              <span className="text-[10px] font-medium">{odd.weather.display}</span>
              {odd.weather.wind && (
                <span className="text-[10px] font-mono border-l border-zinc-200 pl-2 text-zinc-400">{odd.weather.wind}</span>
              )}
            </div>
          )}
        </div>

        {/* Core Matchup */}
        <div className="p-5 md:p-7 space-y-6 flex-1 bg-white">
          <div className="relative">
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-[60%] font-serif-italic text-sm text-zinc-300 pointer-events-none select-none z-10 flex flex-col items-center justify-center">
              at
            </div>
            <div className="grid grid-cols-2 gap-8 md:gap-10">
              {/* Away Team */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-zinc-100/50 rounded-full scale-110 blur-lg opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
                  <img
                    src={getLogo(odd.away_team)}
                    className="relative w-16 h-16 md:w-20 md:h-20 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-2.5 bg-white border border-zinc-100 group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    alt={odd.away_team}
                  />
                  {odd.status === "live" &&
                    parseInt(odd.away_score || "0") >
                      parseInt(odd.home_score || "0") && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-zinc-900 rounded-full border-[2px] border-white shadow-sm z-10" />
                    )}
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl serif font-medium text-zinc-900 tracking-tight mb-1.5">
                    {odd.away_team.split(" ").pop()}
                  </h3>
                  <div className="flex flex-col items-center gap-1.5">
                    {odd.away_score && (
                      <span className="text-2xl font-bold text-zinc-900 tracking-tighter block font-mono">
                        {odd.away_score}
                      </span>
                    )}
                    {awayPrice !== 0 && <PriceTag price={awayPrice} />}
                  </div>
                </div>
              </div>

              {/* Home Team */}
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="relative group/logo">
                  <div className="absolute inset-0 bg-zinc-100/50 rounded-full scale-110 blur-lg opacity-0 group-hover/logo:opacity-100 transition-opacity duration-500" />
                  <img
                    src={getLogo(odd.home_team)}
                    className="relative w-16 h-16 md:w-20 md:h-20 rounded-full shadow-[0_4px_20px_rgba(0,0,0,0.06)] p-2.5 bg-white border border-zinc-100 group-hover:scale-105 transition-transform duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]"
                    alt={odd.home_team}
                  />
                  {odd.status === "live" &&
                    parseInt(odd.home_score || "0") >
                      parseInt(odd.away_score || "0") && (
                      <div className="absolute top-0 right-0 w-3 h-3 bg-zinc-900 rounded-full border-[2px] border-white shadow-sm z-10" />
                    )}
                </div>
                <div>
                  <h3 className="text-xl md:text-2xl serif font-medium text-zinc-900 tracking-tight mb-1.5">
                    {odd.home_team.split(" ").pop()}
                  </h3>
                  <div className="flex flex-col items-center gap-1.5">
                    {odd.home_score && (
                      <span className="text-2xl font-bold text-zinc-900 tracking-tighter block font-mono">
                        {odd.home_score}
                      </span>
                    )}
                    {homePrice !== 0 && <PriceTag price={homePrice} />}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Matchup Visual / Context */}
          {odd.status === "live" && odd.situation_detail ? (
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
          ) : (
            <div className="bg-zinc-50 rounded-[1.25rem] p-4 border border-zinc-200/50">
               <div className="text-[9px] uppercase font-bold text-zinc-400 tracking-widest mb-2">
                  Park / Weather
               </div>
               <p className="text-sm text-zinc-600 leading-relaxed font-serif line-clamp-2">
                  {odd.weather_vector ? (
                      <span className="text-zinc-900 font-medium">{odd.weather_vector.stadiumName} · {odd.weather_vector.temp}°F · {odd.weather_vector.description}</span>
                   ) : (
                      <>Playing at <span className="text-zinc-900 font-medium">{odd.location}</span>. {odd.venue_factor}{' '}
                      {odd.weather ? ` ${odd.weather.display}${odd.weather.wind ? ` with ${odd.weather.wind}` : ''}.` : ''}</>
                   )}
                </p>
            </div>
          )}

          {/* Institutional Data Row */}
          {!odd.situation_detail && (
            <div className={cn(
              "grid gap-3 bg-zinc-50/50 p-2 rounded-3xl border border-zinc-200/40",
              totalPoint !== "-" ? "grid-cols-3" : "grid-cols-2"
            )}>
                  {totalPoint !== "-" && (
                    <div className="bg-white rounded-[1.25rem] p-5 text-center border border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow">

                    <span className="block text-[9px] uppercase font-bold text-zinc-400 tracking-[0.2em] mb-2">
                      Totals
                    </span>
                    <span className="text-sm font-mono font-medium text-zinc-800">
                      O/U {totalPoint}
                    </span>
                  </div>
                )}
                <div className="bg-white rounded-[1.25rem] p-5 text-center border border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] overflow-hidden flex flex-col justify-center items-center group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow">
                  <span className="block text-[9px] uppercase font-bold text-zinc-400 tracking-[0.2em] mb-2">
                    Series
                  </span>
                  <span className="text-[12px] font-medium text-zinc-800 leading-tight block whitespace-break-spaces">
                    {odd.series_history || "No Data"}
                  </span>
                </div>
                <div className="bg-white rounded-[1.25rem] p-5 text-center border border-zinc-100 shadow-[0_2px_8px_rgba(0,0,0,0.02)] flex flex-col justify-center items-center group-hover:shadow-[0_4px_12px_rgba(0,0,0,0.04)] transition-shadow">
                  <span className="block text-[9px] uppercase font-bold text-zinc-400 tracking-[0.2em] mb-2">
                    Bullpen
                  </span>
                  <div className={cn(
                    "flex items-center justify-center text-xs font-bold text-center",
                    odd.bullpen_rating === "ELITE" ? "text-blue-600" : odd.bullpen_rating === "STUNTED" ? "text-red-500" : "text-zinc-600"
                  )}>
                    {odd.bullpen_rating}
                  </div>
                </div>
            </div>
          )}

          {/* Pitching Narrative */}
          <div className="pt-2">
            <div className="grid grid-cols-2 gap-12 relative">
              <div className="absolute left-1/2 top-0 bottom-0 w-px bg-zinc-100/80 -translate-x-1/2" />
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
            </div>
          </div>
        </div>

        {/* Narrative Pulse Footer */}
        <div className="py-4 px-6 bg-zinc-900 text-white font-mono text-[10px] flex items-center justify-center text-center">
          <div className="flex-1 leading-relaxed opacity-95 overflow-hidden line-clamp-2">
            <span className="text-zinc-400 font-bold mr-2 uppercase tracking-[0.2em]">
              TREND:
            </span>
            {odd.trend_story}
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
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center justify-center transition-all duration-500 py-1 flex-1 md:flex-none outline-none relative group md:px-4",
        active ? "text-ink" : "text-zinc-400"
      )}
    >
      <div className="flex flex-col items-center">
        <span className={cn(
          "text-[10px] uppercase font-black tracking-[0.3em] transition-all duration-500 ease-out",
          active ? "opacity-100 scale-110" : "opacity-30 scale-100"
        )}>
          {label}
        </span>
        {active && (
          <motion.div
            layoutId="mobile-nav-indicator"
            className="absolute -bottom-2 w-1 h-1 bg-brand rounded-full"
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
          />
        )}
      </div>
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
      "font-mono font-bold text-[10px] uppercase tracking-tight ring-1 ring-inset px-2.5 py-1 rounded shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all",
      isPositive 
        ? "bg-emerald-50 text-emerald-700 ring-emerald-600/10" 
        : "bg-white text-zinc-600 ring-zinc-200"
    )}>
      {displayPrice}
    </div>
  );
}

function GameDetailView({ odds, oddsSource }: { odds: SportOdds[], oddsSource?: "sportsbook" | "prediction" }) {
  const { gameId } = useParams();
  const odd = odds.find((o) => o.id === gameId);
  const navigate = useNavigate();

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

  return (
    <div className="h-full w-full flex flex-col overflow-y-auto custom-scrollbar p-6 md:px-12 md:pb-12 md:pt-16 lg:px-16 lg:pt-20 lg:pb-16 bg-white">
      <div className="max-w-4xl mx-auto w-full">
        <button
          className="text-[10px] items-center flex gap-2 font-bold uppercase tracking-widest text-zinc-400 hover:text-ink mb-8 md:mb-12 transition-colors"
          onClick={() => navigate("/")}
        >
          <ChevronRight size={14} className="rotate-180" /> Back to Daily Board
        </button>

        <h1 className="text-3xl md:text-5xl font-medium serif-italic text-ink mb-6">
          {odd.away_team} @ {odd.home_team}
        </h1>

        <div className="flex flex-wrap items-center gap-4 mb-8 md:mb-12 relative">
          <span
            className={cn(
              "px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest whitespace-nowrap",
              odd.status === "live"
                ? "bg-brand text-white animate-pulse"
                : "bg-zinc-100 text-zinc-500",
            )}
          >
            {odd.status === "live"
              ? "LIVE"
              : (odd.status === "final" || odd.status === "finished")
                ? "FINAL"
                : "UPCOMING"}
          </span>
          <span className="text-[11px] md:text-sm font-mono text-zinc-500">
            {new Date(odd.commence_time).toLocaleString("en-US", { timeZone: "America/Los_Angeles" })} •{" "}
            {odd.venue || "TBA"}
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 border-t border-zinc-100 pt-8 md:pt-12">
          <div className="flex flex-col gap-6">
            <span className="text-zinc-400 text-[10px] uppercase font-bold tracking-widest">
              Away Side
            </span>
            <div className="flex items-center gap-4">
              <img
                src={getEspnLogo(odd.away_team)}
                className="w-12 h-12 md:w-16 md:h-16 rounded-full border border-zinc-100"
                alt=""
              />
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h3 className="text-xl md:text-2xl serif text-ink">{odd.away_team}</h3>
                  {awayPrice !== 0 && <PriceTag price={awayPrice} />}
                </div>
                <p className="font-mono text-zinc-500 mt-1 text-xs">
                  {odd.away_score ? `Score: ${odd.away_score}` : ""}
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-6 text-left md:text-right md:items-end">
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
                <div className="flex flex-wrap items-center gap-3 md:flex-row-reverse">
                  <h3 className="text-xl md:text-2xl serif text-ink">{odd.home_team}</h3>
                  {homePrice !== 0 && <PriceTag price={homePrice} />}
                </div>
                <p className="font-mono text-zinc-500 mt-1 text-xs">
                  {odd.home_score ? `Score: ${odd.home_score}` : ""}
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

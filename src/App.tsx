import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  MessageSquare, 
  TrendingUp, 
  Calendar,
  Wallet, 
  Settings, 
  User as UserIcon, 
  Send, 
  ChevronRight,
  Menu,
  PenSquare,
  MoreHorizontal,
  Plus,
  Mic,
  LogOut,
  PlusCircle,
  RefreshCw,
  BarChart,
  Zap
} from 'lucide-react';
import { auth, db } from './lib/firebase';
import { 
  browserLocalPersistence,
  getRedirectResult,
  signInWithRedirect,
  signInWithPopup,
  GoogleAuthProvider, 
  onAuthStateChanged, 
  setPersistence,
  signOut,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  setDoc, 
  collection, 
  addDoc, 
  query, 
  onSnapshot,
  serverTimestamp,
  updateDoc,
  where
} from 'firebase/firestore';
import { cn, formatCurrency } from './lib/utils';
import { Routes, Route, useNavigate, useParams, Link } from 'react-router-dom';
import { fetchCurrentOdds, listenToLiveOdds, SportOdds } from './services/oddsService';
import { getBettingInsights, ChatMessage } from './services/geminiService';
import { APP_SHELL_LINKS, IOS_WRAPPER_NOTE } from './lib/appShellConfig';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { Download, Bot, Copy, Code, TerminalSquare, FileText, Globe, Info, X } from 'lucide-react';

SyntaxHighlighter.registerLanguage('python', python);

// --- Types ---
interface UserData {
  userId: string;
  email: string;
  displayName: string;
  balance: number;
  planTier: 'free' | 'pro' | 'sharp';
  isAdmin?: boolean;
  queryCount: number;
  lastQueryDate: string;
  preferences: {
    favoriteLeagues: string[];
    riskLevel: 'low' | 'medium' | 'high';
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
  "Washington Nationals": "wsh"
};

export const getEspnLogo = (teamName: string) => {
  const abbr = MLB_TEAM_MAP[teamName];
  return abbr 
    ? `https://a.espncdn.com/i/teamlogos/mlb/500/scoreboard/${abbr}.png`
    : `https://api.dicebear.com/7.x/identicon/svg?seed=${teamName}&backgroundColor=FAF9F6&fontFamily=serif`;
};

const BANNED_CONSUMER_PATTERNS: RegExp[] = [
  /confidence\s*score\s*:?[^\n]*/gi,
  /edge\s*score\s*:?[^\n]*/gi,
  /raw\s*rpc\s*names?\s*:?[^\n]*/gi,
  /internal\s*payload\s*names?\s*:?[^\n]*/gi,
  /payload\s*contract\s*:?[^\n]*/gi,
  /grounding/gi,
  /governance/gi,
  /sportsanswerstate\s*:?[^\n]*/gi,
  /failurestate\s*:?[^\n]*/gi,
  /auditevent\s*:?[^\n]*/gi,
  /\bquant\s*language\b/gi,
];

function sanitizeConsumerSportsText(text: string): string {
  let sanitized = text;
  for (const pattern of BANNED_CONSUMER_PATTERNS) {
    sanitized = sanitized.replace(pattern, "");
  }
  sanitized = sanitized
    .replace(/\bmoneyline\b/gi, "")
    .replace(/\bspread\b/gi, "")
    .replace(/\bover\s*\/\s*under\b/gi, "")
    .replace(/\bover\b/gi, "")
    .replace(/\bunder\b/gi, "")
    .replace(/\btotal\b/gi, "")
    .replace(/\bodds?\b/gi, "")
    .replace(/\bPASS\b/g, "")
    .replace(/\bsource failure\b/gi, "");
  sanitized = sanitized.replace(/\n{3,}/g, "\n\n").trim();
  return sanitized || "No publishable answer is available right now.";
}

function formatEsportsTimestamp(input?: string): string {
  if (!input) return "";
  const parsed = Date.parse(input);
  if (Number.isNaN(parsed)) return "";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(parsed);
}

function describeOddsLine(odd: SportOdds): string {
  if (odd.market_data_status?.state !== "partial") return "";
  return `ESPN checked • Market odds not found yet • ${formatEsportsTimestamp(odd.fetched_at) || "updated now"}`;
}

function buildAuthErrorMessage(errorCode: string): string {
  if (errorCode === "auth/unauthorized-domain") {
    return `Sign-in was blocked for ${window.location.hostname}. Ask an admin to add this domain under Firebase Auth and OAuth authorized domains/origins.`;
  }
  if (errorCode === "auth/popup-blocked") {
    return "Popup was blocked. Trying sign-in by redirect.";
  }
  if (errorCode === "auth/web-storage-unsupported") {
    return "This browser cannot complete popup sign-in. Try a supported browser.";
  }
  if (errorCode === "auth/operation-not-supported-in-this-environment") {
    return "Popup sign-in is not supported in this environment. Trying redirect.";
  }
  if (errorCode === "auth/cancelled-popup-request") {
    return "Sign-in popup was cancelled.";
  }
  return `Sign-in failed: ${errorCode}`;
}

function PitcherDisplay({ teamFull, headshot, name, record, alignRight = false, small = false }: { teamFull: string, headshot?: string, name?: string, record?: string, alignRight?: boolean, small?: boolean }) {
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
        <span className={`${small ? 'text-xs' : 'text-sm'} font-semibold text-zinc-700 leading-none mb-1`}>{name || 'TBA'}</span>
        <span className="text-[10px] font-mono text-zinc-800">{record || '-'}</span>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [odds, setOdds] = useState<SportOdds[]>([]);
  const [isLoadingOdds, setIsLoadingOdds] = useState(true);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'odds' | 'ledger' | 'wallet' | 'artifacts'>('chat');
  const [isSlateExpanded, setIsSlateExpanded] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);
  const [groundingMode, setGroundingMode] = useState<'live' | 'stats' | 'trends' | null>(null);
  const [slateFilter, setSlateFilter] = useState<'previous' | 'today' | 'tomorrow'>('today');
  const [sharedArtifact, setSharedArtifact] = useState<string | null>(null);
  const [isLoadingArtifact, setIsLoadingArtifact] = useState(false);
  const [artifactsList, setArtifactsList] = useState<ArtifactMeta[]>([]);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isMobileTabMenuOpen, setIsMobileTabMenuOpen] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((error) => {
      console.error("Auth persistence setup failed:", error);
    });
    getRedirectResult(auth).catch((error) => {
      const code = typeof (error as { code?: unknown }).code === "string" ? (error as { code: string }).code : "";
      const mapped = code ? buildAuthErrorMessage(code) : "Redirect sign-in failed. Please use the Sign In button.";
      if (mapped) {
        setAuthError(mapped);
      }
      console.error("Redirect sign-in failed:", error);
    });
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const artifactId = params.get('artifact');
    if (artifactId) {
      setIsLoadingArtifact(true);
      getDoc(doc(db, 'artifacts', artifactId)).then(docSnap => {
        if (docSnap.exists()) {
          setSharedArtifact(docSnap.data().content);
        }
      }).catch(err => {
        console.error("Failed to load artifact", err);
      }).finally(() => {
        setIsLoadingArtifact(false);
      });
    }
  }, []);

  const categorizeGame = (commenceTime: string): 'previous' | 'today' | 'tomorrow' => {
    // Shift game time and current time back by 10 hours (e.g. rollover at 6 AM ET)
    // This prevents late-night West Coast games from disappearing into 'previous' at midnight PT.
    const d = new Date(new Date(commenceTime).getTime() - 10 * 3600 * 1000);
    const today = new Date(new Date().getTime() - 10 * 3600 * 1000);
    const dDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const tDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const diffDays = Math.round((dDay.getTime() - tDay.getTime()) / (1000 * 3600 * 24));
    
    if (diffDays < 0) return 'previous';
    if (diffDays === 0) return 'today';
    return 'tomorrow';
  };

  const allGamesSorted = [...odds].sort((a, b) => new Date(a.commence_time).getTime() - new Date(b.commence_time).getTime());

  const liveGames = allGamesSorted.filter(o => o.status === 'live');
  const upcomingGames = allGamesSorted.filter(o => o.status === 'upcoming' || !o.status);
  const finalGames = allGamesSorted.filter(o => o.status === 'final').sort((a, b) => new Date(b.commence_time).getTime() - new Date(a.commence_time).getTime());
  const featuredGames = [...liveGames, ...upcomingGames].slice(0, 3);
  
  const previousGames = allGamesSorted.filter(o => categorizeGame(o.commence_time) === 'previous');
  let todayGames = allGamesSorted.filter(o => categorizeGame(o.commence_time) === 'today');
  
  // Sort live games first in today's games
  todayGames = [...todayGames].sort((a, b) => {
    if (a.status === 'live' && b.status !== 'live') return -1;
    if (a.status !== 'live' && b.status === 'live') return 1;
    return 0; // maintain time sort otherwise since allGamesSorted is already sorted by time
  });

  const tomorrowGames = allGamesSorted.filter(o => categorizeGame(o.commence_time) === 'tomorrow');

  const fullSlate = slateFilter === 'previous' ? previousGames : 
                    slateFilter === 'tomorrow' ? tomorrowGames : todayGames;

  const getSuggestions = () => {
    switch (groundingMode) {
      case 'live':
        return ["Score on Dodgers game", "Late scratches tonight", "Weather at Wrigley"];
      case 'stats':
        return ["Record on Yankees vs LHP", "Cole's last 5 starts", "Padres home L10"];
      case 'trends':
        return ["Where's the line moved?", "Best edge tonight", "Unders trending"];
      default:
        return ["Read on Dodgers Astros", "Best play tonight", "Totals trending under"];
    }
  };

  const toggleMode = (mode: 'live' | 'stats' | 'trends') => {
    setGroundingMode(prev => prev === mode ? null : mode);
  };

  // 1. Auth Listener
  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        setAuthError(null);
        try {
          const userRef = doc(db, 'users', u.uid);
          const userSnap = await getDoc(userRef);
          const today = new Date().toISOString().split('T')[0];
          
          if (!userSnap.exists()) {
            const newUserData: UserData = {
              userId: u.uid,
              email: u.email || '',
              displayName: u.displayName || 'Punter',
              balance: 0,
              planTier: 'free',
              queryCount: 0,
              lastQueryDate: today,
              preferences: { favoriteLeagues: [], riskLevel: 'medium' }
            };
            await setDoc(userRef, newUserData);
            setUserData(newUserData);
          } else {
            const data = userSnap.data() as UserData;

            setUserData(data);

            if (data.lastQueryDate !== today) {
              await updateDoc(userRef, { queryCount: 0, lastQueryDate: today });
              setUserData(prev => prev ? { ...prev, queryCount: 0, lastQueryDate: today } : prev);
            }
          }

          // Setup Chat Listener without orderBy to avoid missing index errors
          const q = query(
            collection(db, 'users', u.uid, 'chats')
          );
          onSnapshot(q, (snapshot) => {
            const msgs = snapshot.docs.map(d => d.data() as any);
            // Sort locally
            msgs.sort((a, b) => {
              const aTime = a.timestamp?.toMillis ? a.timestamp.toMillis() : Date.now();
              const bTime = b.timestamp?.toMillis ? b.timestamp.toMillis() : Date.now();
              return aTime - bTime;
            });
            setMessages(msgs as ChatMessage[]);
          }, (err) => {
            console.error("Chat listener failed:", err);
          });

          // Setup Artifacts Listener
          try {
            const qArtifacts = query(
              collection(db, 'artifacts'),
              where('creatorId', '==', u.uid)
            );
            onSnapshot(qArtifacts, (snapshot) => {
              const list = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ArtifactMeta));
              list.sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
              setArtifactsList(list);
            });
          } catch(e) {
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
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  useEffect(() => {
    const closeMenuOnOutsidePointer = (event: MouseEvent | TouchEvent) => {
      if (!userMenuRef.current) return;
      if (!userMenuRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', closeMenuOnOutsidePointer);
    document.addEventListener('touchstart', closeMenuOnOutsidePointer);
    return () => {
      document.removeEventListener('mousedown', closeMenuOnOutsidePointer);
      document.removeEventListener('touchstart', closeMenuOnOutsidePointer);
    };
  }, []);

  const refreshOdds = async () => {
    setIsLoadingOdds(true);
    // Left for manual refresh if needed, but SSE handles auto updates
    const data = await fetchCurrentOdds();
    setOdds(data);
    setIsLoadingOdds(false);
  };

  const handleLogin = async () => {
    setAuthError(null);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    try {
      await setPersistence(auth, browserLocalPersistence);
      await signInWithPopup(auth, provider);
      return;
    } catch (error: any) {
      const code = typeof error?.code === 'string' ? error.code : '';
      const mappedMessage = code ? buildAuthErrorMessage(code) : "Sign-in failed. Please try again.";
      const shouldFallbackToRedirect = [
        'auth/popup-blocked',
        'auth/popup-closed-by-user',
        'auth/cancelled-popup-request',
        'auth/web-storage-unsupported',
        'auth/operation-not-supported-in-this-environment',
      ].includes(code);

      if (shouldFallbackToRedirect) {
        const redirectMessage = code ? buildAuthErrorMessage(code) : "Switching to redirect sign-in.";
        setAuthError(redirectMessage);
        signInWithRedirect(auth, provider).catch((redirectError) => {
          const redirectCode = typeof (redirectError as { code?: unknown }).code === 'string'
            ? (redirectError as { code: string }).code
            : "";
          const mappedRedirectMessage = redirectCode ? buildAuthErrorMessage(redirectCode) : "Redirect sign-in failed. Please retry.";
          setAuthError(mappedRedirectMessage);
          console.error("Sign-in redirect failed:", redirectError);
        });
        return;
      }
      if (code) {
        setAuthError(mappedMessage);
      }
      console.error("Sign-in failed:", error);
    }
  };

  const handleLogout = () => signOut(auth);

  const sendMessage = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputText.trim()) return;
    if (!user) {
      await handleLogin();
      return;
    }

    const queryCount = userData?.queryCount || 0;

    const userMessage: ChatMessage = { role: 'user', text: inputText };
    setInputText('');
    
    // Optimistic UI for chat is handled by Firestore listener 
    // but we add locally for faster feel if needed or just wait for Firestore
    try {
      if (userData) {
        try {
          await updateDoc(doc(db, 'users', user.uid), {
            queryCount: queryCount + 1
          });
          setUserData({ ...userData, queryCount: queryCount + 1 });
        } catch (e) {
          console.warn("Could not update query count", e);
        }
      }

      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        ...userMessage,
        timestamp: serverTimestamp()
      });

      setIsTyping(true);
      const insights = await getBettingInsights(inputText, messages, odds, groundingMode);
      
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        role: 'model',
        text: insights,
        timestamp: serverTimestamp()
      });
    } catch (err: any) {
      console.error(err);
      
      let errorMsg = "Couldn't pull data. Try refresh.";
      if (err instanceof Error) {
        if (err.message.includes('Quota exceeded')) errorMsg = "Quota exceeded. Please check limits.";
        else if (err.message.includes('Missing or insufficient permissions')) errorMsg = "Permission denied. Please try again.";
      }
      
      await addDoc(collection(db, 'users', user.uid, 'chats'), {
        role: 'model',
        text: `*${errorMsg}*`,
        timestamp: serverTimestamp()
      }).catch(e => {
        console.error("Could not write error to chat", e);
      });
      
    } finally {
      setIsTyping(false);
    }
  };

  if (isLoadingArtifact) {
    return <div className="min-h-[100dvh] w-full flex items-center justify-center bg-paper text-zinc-500 font-mono text-sm uppercase tracking-widest animate-pulse">Loading Artifact...</div>;
  }

  if (sharedArtifact) {
    return (
      <div className="min-h-[100dvh] w-full bg-zinc-100 flex flex-col items-center overflow-auto px-4 py-8 safe-area-bottom">
        <div className="w-full max-w-[850px] flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center font-serif italic text-xl font-medium text-brand select-none leading-none">B</div>
            <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">Document Artifact</span>
          </div>
          <button 
             onClick={() => window.location.href = window.location.origin}
             className="text-[11px] font-medium text-brand px-4 py-2 border border-brand/20 bg-brand/5 rounded-full hover:bg-brand/10 transition-colors"
          >
            Create Your Own
          </button>
        </div>
        <div className="w-full max-w-[850px] bg-white shadow-sm ring-1 ring-zinc-900/5 min-h-[70dvh]">
          <iframe 
            srcDoc={sharedArtifact} 
            className="w-full h-full min-h-[70dvh] border-none"
            sandbox=""
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
    );
  }

  // Adjust active tab if no user — only block artifacts since it depends on user.uid query
  React.useEffect(() => {
    if (!user && activeTab === 'artifacts') {
      setActiveTab('odds');
    }
  }, [user, activeTab]);

  const isMobileChatScreen = location.pathname === '/' && activeTab === 'chat';

  React.useEffect(() => {
    setIsMobileTabMenuOpen(false);
  }, [activeTab]);

  return (
    <div className="flex min-h-[100dvh] bg-paper text-ink font-sans overflow-hidden relative">
      {/* Subtle Ambient Bleed */}
      <div className="ambient-blob ambient-blob-1"></div>
      <div className="ambient-blob ambient-blob-2"></div>
      <div className="ambient-blob ambient-blob-3"></div>
      <div className="absolute inset-0 bg-paper/60 backdrop-blur-[100px] z-0 pointer-events-none" />

      <div className="flex h-full w-full z-10 relative">
      {/* Primary Global Navigation */}
      <aside className="hidden md:flex w-16 flex-col items-center py-8 border-r border-zinc-200 bg-paper shrink-0 z-30">
        <div className="mb-10">
          <div className="w-8 h-8 flex items-center justify-center font-serif italic text-3xl font-medium text-brand select-none leading-none">B</div>
        </div>
        
        <nav className="flex flex-col gap-6 flex-1">
            <SideNavIcon 
              active={activeTab === 'chat'} 
              onClick={() => setActiveTab('chat')}
              icon={<MessageSquare size={20} strokeWidth={1.5} />}
            />
          <SideNavIcon 
            active={activeTab === 'odds'} 
            onClick={() => setActiveTab('odds')}
            icon={<TrendingUp size={20} strokeWidth={1.5} />}
          />
              <SideNavIcon 
                active={activeTab === 'ledger'} 
                onClick={() => setActiveTab('ledger')}
                icon={<BarChart size={20} strokeWidth={1.5} />}
              />
              <SideNavIcon 
                active={activeTab === 'wallet'} 
                onClick={() => setActiveTab('wallet')}
                icon={<Calendar size={20} strokeWidth={1.5} />}
              />
              <SideNavIcon 
                active={activeTab === 'artifacts'} 
                onClick={() => user ? setActiveTab('artifacts') : handleLogin()}
                icon={<FileText size={20} strokeWidth={1.5} />}
              />
        </nav>

        <div className="mt-auto flex flex-col gap-6 items-center">
          <button onClick={() => setShowAboutModal(true)} className="w-10 h-10 flex items-center justify-center rounded-[14px] text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50/80 transition-all duration-300">
            <Info size={20} strokeWidth={1.5} />
          </button>
          <button onClick={() => navigate('/pricing')} className="w-10 h-10 flex items-center justify-center rounded-[14px] text-brand hover:bg-brand/10 transition-all duration-300 mb-2">
            <Zap size={20} strokeWidth={1.5} />
          </button>
        </div>
      </aside>

      {/* About Modal */}
      <AnimatePresence>
        {showAboutModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-paper/80 backdrop-blur-sm overflow-y-auto">
             <motion.div 
               initial={{ opacity: 0, scale: 0.95 }}
               animate={{ opacity: 1, scale: 1 }}
               exit={{ opacity: 0, scale: 0.95 }}
               className="bg-white border border-zinc-200 shadow-xl rounded-2xl p-8 max-w-md w-full max-h-[calc(100dvh-2rem)] overflow-y-auto relative"
             >
               <button 
                 onClick={() => setShowAboutModal(false)}
                 className="absolute top-6 right-6 text-zinc-500 hover:text-ink"
               >
                 <X size={20} strokeWidth={1.5} />
               </button>
               <div className="w-10 h-10 bg-brand/10 text-brand rounded-full flex items-center justify-center mb-6">
                 <Info size={20} strokeWidth={1.5} />
               </div>
               <h3 className="text-2xl font-serif font-medium text-ink tracking-tight mb-4">About Baseline</h3>
               <div className="space-y-4 text-sm text-zinc-600 leading-relaxed">
                 <p>
                   Baseline connects generative AI directly to real-time sports market data. 
                 </p>
                 <div className="space-y-2">
                   <p><strong className="text-ink">Modes:</strong></p>
                   <ul className="list-disc pl-4 space-y-1">
                     <li><strong>Live:</strong> Real-time scores, innings, odds shifts.</li>
                     <li><strong>Stats:</strong> Pitcher metrics, team splits, historicals.</li>
                     <li><strong>Trends:</strong> Line movement and market sentiment.</li>
                   </ul>
                 </div>
                 <p>
                   Use the chat or tap a game card to explore deep-dive analytics for any matchup. ESPN checks all game-level context in-session.
                 </p>
                 <div className="pt-4 border-t border-zinc-100 space-y-2">
                   Feedback? <a href="mailto:hello@baseline.com" className="text-brand hover:underline">hello@baseline.com</a>
                   <p><a href={APP_SHELL_LINKS.privacyPolicyUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Privacy Policy</a></p>
                   <p><a href={APP_SHELL_LINKS.termsOfServiceUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">Terms of Service</a></p>
                   <p><a href={APP_SHELL_LINKS.appSupportUrl} target="_blank" rel="noopener noreferrer" className="text-brand hover:underline">App Support</a></p>
                   <p className="text-xs text-zinc-500">{IOS_WRAPPER_NOTE}</p>
                 </div>
               </div>
             </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-paper safe-area-bottom relative">
        {/* Unified Header */}
        <header className={cn(
          "h-16 items-center justify-between px-4 sm:px-6 xl:px-10 border-b border-zinc-100/80 bg-paper/70 backdrop-blur-xl backdrop-saturate-150 sticky top-0 z-20 safe-area-top",
          isMobileChatScreen ? "hidden md:flex" : "flex"
        )}>
          <div className="flex items-center gap-4 sm:gap-6">
            <button
              type="button"
              onClick={() => setIsMobileTabMenuOpen((prev) => !prev)}
              className="md:hidden w-10 h-10 rounded-full border border-zinc-200 bg-white/90 text-zinc-700 flex items-center justify-center"
              aria-label="Open navigation menu"
            >
              <Menu size={18} />
            </button>
            {location.pathname !== '/' && (
              <h1 className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">
                {location.pathname === '/pricing' ? 'Upgrade' : 'Daily Board'}
              </h1>
            )}
          </div>
          
          <div className="flex items-center gap-3 sm:gap-6">
            {authError ? (
              <p className="text-[11px] text-amber-700 max-w-[320px] text-right leading-snug">
                {authError}
              </p>
            ) : null}
            <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-medium hidden sm:inline-block">
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: '2-digit' }).toUpperCase()}
            </span>
            {user ? (
              <div className="flex items-center gap-4 relative" ref={userMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsUserMenuOpen((prev) => !prev)}
                  className="w-9 h-9 rounded-full bg-zinc-100 border border-zinc-200 flex items-center justify-center overflow-hidden cursor-pointer focus-visible:outline-none"
                  aria-label="Open account menu"
                  aria-expanded={isUserMenuOpen}
                >
                  {user.photoURL ? <img src={user.photoURL} alt="" /> : <UserIcon size={12} className="text-zinc-500" />}
                </button>
                <div className={cn(
                  "absolute right-0 top-full mt-2 w-52 bg-white border border-zinc-100 shadow-xl rounded-lg py-2 z-50",
                  isUserMenuOpen ? "block" : "hidden"
                )}>
                   <div className="px-4 py-2 border-b border-zinc-50 mb-2">
                     <p className="text-xs font-bold text-ink truncate">{user.email}</p>
                   </div>
                   <button onClick={() => { setIsUserMenuOpen(false); navigate('/pricing'); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-ink transition-colors flex items-center gap-2">
                     <Zap size={14} className="text-brand" /> Manage Subscription
                   </button>
                   <button onClick={() => { setIsUserMenuOpen(false); handleLogout(); }} className="w-full text-left px-4 py-2 text-sm text-zinc-700 hover:bg-zinc-50 hover:text-ink transition-colors flex items-center gap-2">
                     <LogOut size={14} /> Sign out
                   </button>
                </div>
              </div>
            ) : (
              <button onClick={handleLogin} className="bg-ink hover:bg-brand text-white text-xs font-bold uppercase tracking-widest px-5 py-2.5 rounded-full transition-all hover:shadow-lg hover:shadow-brand/20 active:scale-[0.98]">
                Sign In
              </button>
            )}
          </div>
        </header>

        <AnimatePresence>
          {isMobileTabMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 z-40 bg-black/20 backdrop-blur-sm"
              onClick={() => setIsMobileTabMenuOpen(false)}
            >
              <motion.div
                initial={{ x: -24, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -24, opacity: 0 }}
                transition={{ duration: 0.16 }}
                className="absolute left-3 right-3 top-[max(0.75rem,env(safe-area-inset-top))] bg-white border border-zinc-200 rounded-2xl shadow-xl p-3"
                onClick={(event) => event.stopPropagation()}
              >
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button type="button" onClick={() => { setActiveTab('chat'); setIsMobileTabMenuOpen(false); }} className={cn("rounded-xl px-3 py-3 text-left text-sm border", activeTab === 'chat' ? "border-brand/50 bg-brand/10 text-brand" : "border-zinc-200 text-zinc-700")}>Chat</button>
                  <button type="button" onClick={() => { setActiveTab('odds'); setIsMobileTabMenuOpen(false); }} className={cn("rounded-xl px-3 py-3 text-left text-sm border", activeTab === 'odds' ? "border-brand/50 bg-brand/10 text-brand" : "border-zinc-200 text-zinc-700")}>Daily Board</button>
                  <button type="button" onClick={() => { setActiveTab('ledger'); setIsMobileTabMenuOpen(false); }} className={cn("rounded-xl px-3 py-3 text-left text-sm border", activeTab === 'ledger' ? "border-brand/50 bg-brand/10 text-brand" : "border-zinc-200 text-zinc-700")}>Ledger</button>
                  <button type="button" onClick={() => { setActiveTab('wallet'); setIsMobileTabMenuOpen(false); }} className={cn("rounded-xl px-3 py-3 text-left text-sm border", activeTab === 'wallet' ? "border-brand/50 bg-brand/10 text-brand" : "border-zinc-200 text-zinc-700")}>Schedule</button>
                  <button type="button" onClick={() => { user ? setActiveTab('artifacts') : handleLogin(); setIsMobileTabMenuOpen(false); }} className={cn("rounded-xl px-3 py-3 text-left text-sm border", activeTab === 'artifacts' ? "border-brand/50 bg-brand/10 text-brand" : "border-zinc-200 text-zinc-700")}>Artifacts</button>
                  <button type="button" onClick={() => { navigate('/pricing'); setIsMobileTabMenuOpen(false); }} className="rounded-xl px-3 py-3 text-left text-sm border border-zinc-200 text-zinc-700">Pricing</button>
                </div>
                <div className="flex items-center justify-between gap-2 border-t border-zinc-100 pt-3">
                  <button type="button" onClick={() => { setShowAboutModal(true); setIsMobileTabMenuOpen(false); }} className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">About</button>
                  {user ? (
                    <button type="button" onClick={() => { handleLogout(); setIsMobileTabMenuOpen(false); }} className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">Sign Out</button>
                  ) : (
                    <button type="button" onClick={() => { handleLogin(); setIsMobileTabMenuOpen(false); }} className="text-xs font-semibold text-zinc-700 uppercase tracking-widest">Sign In</button>
                  )}
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 flex flex-col xl:flex-row overflow-hidden relative">
          <div className="flex-1 flex flex-col min-w-0 xl:border-r border-zinc-100 relative">
             <Routes>
               <Route path="/" element={
                 <AnimatePresence mode="wait">
              {activeTab === 'chat' && (
                <motion.div 
                  key="chat"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="h-full flex flex-col max-w-5xl mx-auto w-full"
                >
                  <div className="md:hidden px-3 pt-[max(0.5rem,env(safe-area-inset-top))] pb-2 border-b border-zinc-100/80 bg-paper/90 backdrop-blur-sm sticky top-0 z-20">
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setIsMobileTabMenuOpen((prev) => !prev)}
                        className="w-11 h-11 rounded-full bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center"
                        aria-label="Open navigation menu"
                      >
                        <Menu size={19} />
                      </button>
                      <div className="px-5 h-11 rounded-full bg-white/95 border border-zinc-200 text-brand text-[15px] font-medium flex items-center justify-center min-w-[128px]">
                        {isTyping ? "Thinking" : "Baseline"}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setInputText('');
                            setGroundingMode(null);
                            setActiveTab('chat');
                          }}
                          className="w-11 h-11 rounded-full bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center"
                          aria-label="New chat"
                        >
                          <PenSquare size={19} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowAboutModal(true)}
                          className="w-11 h-11 rounded-full bg-white border border-zinc-200 text-zinc-800 flex items-center justify-center"
                          aria-label="More actions"
                        >
                          <MoreHorizontal size={19} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 px-4 sm:px-6 lg:px-10 xl:px-12 py-5 md:py-8 overflow-y-auto space-y-8 md:space-y-10 custom-scrollbar pb-36 md:pb-48">
                    {messages.length === 0 && (
                      <div className="pb-8 pt-4">
                        <div className="mb-8">
                          <h3 className="text-2xl serif-italic font-medium text-ink tracking-tight">
                            Today's Slate
                          </h3>
                          {isLoadingOdds ? (
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-2 flex items-center gap-2">
                              <RefreshCw className="animate-spin" size={10} /> Hydrating...
                            </p>
                          ) : (
                            <p className="text-[10px] uppercase tracking-widest font-bold text-zinc-500 mt-2">
                              {todayGames.length} games · {liveGames.length} live
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-4 md:gap-5">
                           {featuredGames.map(odd => (
                             <button 
                               key={odd.id} 
                               onClick={() => {
                                 setInputText(`Read on ${odd.away_team} @ ${odd.home_team}`);
                                 setTimeout(() => {
                                   (document.querySelector('input[type="text"]') as HTMLInputElement)?.focus();
                                 }, 100);
                               }}
                               className="block w-full bg-white border border-zinc-200 p-4 sm:p-6 rounded-xl text-left hover:border-zinc-300 hover:shadow-sm transition-all group flex flex-col gap-4 relative overflow-hidden"
                             >
                                {odd.status === 'live' && (
                                  <div className="absolute top-0 left-0 w-full h-1 bg-brand" />
                                )}
                                <div className="flex justify-between items-start">
                                  <div>
                                    <div className="flex items-center gap-2 mb-1">
                                      {odd.status === 'live' && <span className="w-2 h-2 rounded-full bg-brand live-pulse shrink-0" />}
                                      <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">{odd.sport_title} {odd.status === 'live' ? '• LIVE' : ''}</span>
                                    </div>
                                    <span className="text-xs font-mono text-zinc-500">{odd.venue || 'TBA'} • {new Date(odd.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </div>
                                  <div className="text-right">
                                    {(odd.status === 'live' && odd.score) ? (
                                      <>
                                        <div className="text-lg font-mono font-bold text-ink">{odd.score}</div>
                                        <div className="text-xs text-brand font-medium">{odd.situation}</div>
                                      </>
                                    ) : (
                                      <div className="text-[11px] text-zinc-500 serif italic bg-zinc-50 px-3 py-1 rounded-full border border-zinc-100">
                                        {odd.context || 'Regular Season'}
                                      </div>
                                    )}
                                  </div>
                                </div>
                                
                                <div className="space-y-3">
                                  {odd.bookmakers?.length ? (
                                    <>
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                          <img src={getEspnLogo(odd.away_team)} className="w-10 h-10 rounded-full border border-zinc-100 shadow-sm transition-transform hover:scale-105" alt="" />
                                          <div>
                                            <div className="font-medium text-lg text-ink serif">{odd.away_team}</div>
                                          </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                          {odd.bookmakers?.[0]?.markets?.map(m => {
                                            const outcome = m.outcomes.find(o => o.name?.includes(odd.away_team) || odd.away_team?.includes(o.name) || o.name === 'Over');
                                            if (!outcome) return null;
                                            return (
                                              <div key={m.key} className="flex flex-col items-end">
                                                <span className="text-[9px] uppercase tracking-widest text-zinc-500 mb-0.5">{m.key === 'h2h' ? 'ML' : m.key === 'spreads' ? 'Spread' : 'Total'}</span>
                                                <span className="font-mono text-sm text-ink font-medium">
                                                  {m.key === 'totals' ? `O ${outcome.point}` : (outcome.point ? `${outcome.point > 0 ? '+' : ''}${outcome.point}` : (outcome.price > 0 ? `+${outcome.price}` : outcome.price))}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                      
                                      <div className="flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                          <img src={getEspnLogo(odd.home_team)} className="w-10 h-10 rounded-full border border-zinc-100 shadow-sm transition-transform hover:scale-105" alt="" />
                                          <div>
                                            <div className="font-medium text-lg text-ink serif">{odd.home_team}</div>
                                          </div>
                                        </div>
                                        <div className="text-right flex items-center gap-4">
                                          {odd.bookmakers?.[0]?.markets?.map(m => {
                                            const outcome = m.outcomes.find(o => o.name?.includes(odd.home_team) || odd.home_team?.includes(o.name) || o.name === 'Under');
                                            if (!outcome) return null;
                                            return (
                                              <div key={m.key} className="flex flex-col items-end">
                                                <span className="font-mono text-sm text-ink font-medium relative top-[14px]">
                                                  {m.key === 'totals' ? `U ${outcome.point}` : (outcome.point ? `${outcome.point > 0 ? '+' : ''}${outcome.point}` : (outcome.price > 0 ? `+${outcome.price}` : outcome.price))}
                                                </span>
                                              </div>
                                            );
                                          })}
                                        </div>
                                      </div>
                                    </>
                                  ) : (
                                    <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 px-4 py-3 text-[11px] uppercase tracking-widest text-zinc-500">
                                      {describeOddsLine(odd) || "ESPN checked. Market odds not found yet."}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Featured Pitcher Matchup */}
                                {(odd.away_pitcher || odd.home_pitcher) && (
                                  <div className="mt-4 pt-4 border-t border-zinc-100/60 transition-opacity">
                                    <div className="flex items-center gap-2 mb-3">
                                      <div className="w-1.5 h-1.5 rotate-45 bg-[#2D4A3E] shrink-0 opacity-80" />
                                      <span className="text-[10px] uppercase tracking-widest font-bold text-zinc-500">Pitching Matchup</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                                      <PitcherDisplay 
                                        teamFull={odd.away_team} 
                                        name={odd.away_pitcher} 
                                        headshot={odd.away_pitcher_headshot} 
                                        record={odd.away_pitcher_record} 
                                        small
                                      />
                                      <PitcherDisplay 
                                        teamFull={odd.home_team} 
                                        name={odd.home_pitcher} 
                                        headshot={odd.home_pitcher_headshot} 
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
                         <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">Calculating...</span>
                      </div>
                    )}
                     <div ref={chatEndRef} />
                   </div>
                   
                   {/* Minimal Input Area */}
                   <div className="px-3 sm:px-6 lg:px-10 xl:px-12 pt-3 pb-3 sticky bottom-0 bg-paper/95 backdrop-blur-md border-t border-zinc-100/70 flex flex-col z-20 safe-area-bottom">
                     <div className="hidden md:flex gap-2 mb-3 flex-wrap">
                       {(['live', 'stats', 'trends'] as const).map(mode => {
                         const isActive = groundingMode === mode;
                         return (
                           <button
                             key={mode}
                             type="button"
                             onClick={() => toggleMode(mode)}
                             className={cn(
                               "flex items-center justify-center transition-all text-[11px] rounded-[14px] px-[14px] py-[6px] tracking-wide uppercase",
                               isActive
                                 ? "bg-[#2D4A3E]/10 border border-[#2D4A3E]/60 text-brand font-medium"
                                 : "bg-transparent border border-[#2D4A3E]/30 text-brand/70 hover:text-brand hover:border-[#2D4A3E]/50"
                             )}
                           >
                             {isActive && (
                               <span className="w-1.5 h-1.5 rounded-full bg-brand mr-2" />
                             )}
                             {mode}
                           </button>
                         );
                       })}
                     </div>
                     
                     {messages.length === 0 && (
                       <div className="hidden md:flex flex-wrap gap-3 mb-4">
                         {getSuggestions().map((sug, idx) => (
                           <button 
                             key={idx}
                             type="button" 
                             onClick={() => setInputText(sug)} 
                             className="text-[11px] bg-white border border-zinc-200 text-zinc-600 px-4 py-2 rounded-full hover:bg-zinc-50 hover:text-ink transition-colors"
                           >
                             {sug}
                           </button>
                         ))}
                       </div>
                     )}

                     <div className="md:hidden flex gap-2 mb-2 overflow-x-auto no-scrollbar pb-1">
                       {(['live', 'stats', 'trends'] as const).map(mode => {
                         const isActive = groundingMode === mode;
                         return (
                           <button
                             key={mode}
                             type="button"
                             onClick={() => toggleMode(mode)}
                             className={cn(
                               "flex items-center justify-center whitespace-nowrap transition-all text-[10px] rounded-full px-3 py-1.5 uppercase tracking-wide border",
                               isActive
                                 ? "bg-[#2D4A3E]/10 border-[#2D4A3E]/60 text-brand font-medium"
                                 : "bg-white border-zinc-200 text-zinc-600"
                             )}
                           >
                             {mode}
                           </button>
                         );
                       })}
                     </div>

                     <form onSubmit={sendMessage} className="relative shadow-sm rounded-full flex items-center gap-2 w-full bg-white border border-zinc-200 px-3 py-2">
                       <button
                         type="button"
                         onClick={() => setIsMobileTabMenuOpen(true)}
                         className="md:hidden w-9 h-9 rounded-full text-zinc-700 hover:bg-zinc-100 flex items-center justify-center"
                         aria-label="Open quick actions"
                       >
                         <Plus size={20} />
                       </button>
                       <input 
                         type="text"
                         value={inputText}
                         onChange={(e) => setInputText(e.target.value)}
                         placeholder="Ask Baseline"
                         className="w-full bg-transparent border-none rounded-lg px-1 md:px-3 py-2 md:py-3 focus:outline-none transition-all text-base md:text-sm text-ink placeholder:text-zinc-500"
                       />
                       <button 
                         type="button"
                         className="md:hidden w-9 h-9 rounded-full text-zinc-500 hover:bg-zinc-100 flex items-center justify-center"
                         aria-label="Voice input"
                       >
                         <Mic size={18} />
                       </button>
                       <button 
                         type="submit"
                         disabled={!inputText.trim() || isTyping}
                         className="w-10 h-10 rounded-full bg-ink text-white flex items-center justify-center transition-colors disabled:opacity-30"
                       >
                         <Send size={18} strokeWidth={1.8} />
                       </button>
                     </form>
                   </div>
                </motion.div>
              )}

               {activeTab === 'odds' && (
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
                             setInputText(`Read on ${odd.away_team} @ ${odd.home_team}`);
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
               )}

               {activeTab === 'ledger' && (
                 <motion.div 
                   key="ledger"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="p-4 sm:p-6 xl:p-10 h-full flex flex-col overflow-y-auto custom-scrollbar"
                 >
                   <div className="max-w-3xl">
                     <h2 className="text-4xl serif-italic font-medium text-ink tracking-tight mb-2">My Action Ledger</h2>
                     <p className="text-zinc-500 font-mono text-sm mb-12">Private beta matching your bet history against public ML facts.</p>
                     
                     <div className="bg-zinc-50 border border-zinc-100 rounded-xl p-8 mb-8 relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4">
                       </div>
                       <h3 className="text-lg serif font-medium text-ink mb-4">Your Edges and Leaks</h3>
                       <p className="text-zinc-600 text-sm leading-relaxed mb-6 font-mono">
                         Pattern matching your recent MLB history in `credentialdb` against real-time ESPN situational data. You have a heavy tendency (-14% ROI) to back home favorites on getaway day games.
                       </p>
                       <div className="flex items-center gap-4 border-t border-zinc-200/50 pt-4">
                         <button className="text-[11px] uppercase tracking-widest font-bold text-ink hover:text-brand transition-colors flex items-center gap-2">
                           Run Full Audit <ChevronRight size={14} />
                         </button>
                       </div>
                     </div>

                     <div className="space-y-4">
                       <h3 className="text-[10px] font-bold tracking-[0.3em] uppercase text-zinc-500 mb-4 border-b border-zinc-100 pb-2">Recent Logged Bets</h3>
                       
                       <div className="flex items-center justify-between p-4 border border-zinc-100 rounded-lg hover:border-zinc-200 transition-colors">
                         <div className="flex flex-col gap-1">
                           <span className="text-sm font-semibold text-ink">Phillies ML</span>
                           <span className="text-[10px] font-mono text-zinc-500">vs Athletics • May 5, 2026</span>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           <span className="text-sm font-mono text-zinc-500">-135</span>
                           <span className="text-[10px] font-bold uppercase text-brand">Win</span>
                         </div>
                       </div>

                       <div className="flex items-center justify-between p-4 border border-zinc-100 rounded-lg hover:border-zinc-200 transition-colors">
                         <div className="flex flex-col gap-1">
                           <span className="text-sm font-semibold text-ink">Orioles / Marlins Under 8.5</span>
                           <span className="text-[10px] font-mono text-zinc-500">MIA @ BAL • May 4, 2026</span>
                         </div>
                         <div className="flex flex-col items-end gap-1">
                           <span className="text-sm font-mono text-zinc-500">-110</span>
                           <span className="text-[10px] font-bold uppercase text-[#D23D33]">Loss</span>
                         </div>
                       </div>
                       
                       <button className="w-full mt-4 py-4 border border-zinc-200 border-dashed rounded-lg text-zinc-500 hover:text-ink hover:border-zinc-300 transition-colors text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2">
                         <PlusCircle size={14} /> Log Manual Bet
                       </button>
                     </div>
                   </div>
                 </motion.div>
               )}

               {activeTab === 'wallet' && (
                 <motion.div 
                   key="wallet"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="h-full p-4 sm:p-6 xl:p-10 overflow-y-auto"
                 >
                   <div className="max-w-4xl mx-auto">
                      <div className="border-b border-zinc-100 pb-10 mb-12">
                        <h2 className="text-4xl serif-italic font-medium text-ink tracking-tight">Schedule</h2>
                        <p className="text-zinc-500 text-[10px] uppercase tracking-[0.35em] font-bold mt-4">Upcoming Rotations</p>
                      </div>
                      
                      <div className="space-y-6">
                         {[1,2,3,4,5].map(i => (
                           <div key={i} className="flex items-center gap-4 sm:gap-8 py-6 border-b border-zinc-100 group">
                              <span className="font-mono text-zinc-500 group-hover:text-ink transition-colors">0{i}</span>
                              <div className="flex-1">
                                 <h4 className="text-lg font-medium text-zinc-600 group-hover:text-ink transition-colors">San Francisco AT Los Angeles</h4>
                                 <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold mt-1">7:10 PM ET • Dodger Stadium</p>
                              </div>
                              <div className="text-right">
                                 <span className="block font-mono text-zinc-600 group-hover:text-brand transition-colors">-145 / +125</span>
                                 <span className="text-[9px] uppercase font-bold text-zinc-500">Total 8.5</span>
                              </div>
                           </div>
                         ))}
                      </div>
                   </div>
                 </motion.div>
               )}

               {activeTab === 'artifacts' && (
                 <motion.div 
                   key="artifacts"
                   initial={{ opacity: 0 }}
                   animate={{ opacity: 1 }}
                   exit={{ opacity: 0 }}
                   className="h-full p-4 sm:p-6 xl:p-10 overflow-y-auto"
                 >
                   <div className="max-w-4xl mx-auto">
                     <div className="border-b border-zinc-100 pb-10 mb-12">
                       <h2 className="text-4xl serif-italic font-medium text-ink tracking-tight">Generated Artifacts</h2>
                       <p className="text-zinc-500 text-[10px] uppercase tracking-[0.35em] font-bold mt-4">Registry of interfaces & reports</p>
                     </div>
                     
                     {artifactsList.length === 0 ? (
                       <div className="bg-white border border-dashed border-zinc-200 rounded-lg p-16 text-center text-zinc-500 flex flex-col items-center">
                          <FileText size={32} strokeWidth={1} className="text-zinc-300 mb-6" />
                          <h3 className="serif text-2xl mb-2 text-ink">No artifacts yet</h3>
                          <p className="font-mono text-xs">Ask the generative model to create an interface or report.</p>
                       </div>
                     ) : (
                       <div className="grid gap-6">
                         {artifactsList.map((artifact) => (
                           <div key={artifact.id} className="bg-white border border-zinc-200 rounded-xl p-8 hover:shadow-md transition-all group flex justify-between items-center cursor-pointer relative overflow-hidden" onClick={() => window.open(`?artifact=${artifact.id}`, '_blank', 'noopener,noreferrer')}>
                             <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                               <FileText size={120} />
                             </div>
                             <div className="flex flex-col gap-3 relative z-10">
                               <div className="flex items-center gap-4">
                                 <h3 className="font-serif text-2xl text-ink group-hover:text-brand transition-colors">{artifact.title || 'Untitled Interface'}</h3>
                                 <span className="bg-zinc-100 text-zinc-600 px-3 py-1 rounded-full text-[9px] uppercase font-bold tracking-widest">{artifact.type}</span>
                               </div>
                               <div className="flex flex-wrap items-center gap-4 text-xs font-mono text-zinc-500">
                                 <span className="flex items-center gap-2"><Globe size={14} className="text-zinc-500" /> {artifact.source || 'Generated Server-Side'}</span>
                                 {artifact.createdAt && (
                                   <span><span className="text-zinc-500 uppercase tracking-wider text-[10px] font-bold mr-2">Deployed</span> {new Date(artifact.createdAt.toMillis()).toLocaleString()}</span>
                                 )}
                               </div>
                             </div>
                             <div className="relative z-10 w-12 h-12 flex items-center justify-center rounded-full bg-zinc-50 group-hover:bg-brand group-hover:text-white transition-colors">
                               <ChevronRight size={20} className="text-zinc-500 group-hover:text-white transition-colors" />
                             </div>
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </motion.div>
               )}
                 </AnimatePresence>
               } />
               <Route path="/game/:gameId" element={<GameDetailView odds={odds} />} />
               <Route path="/pricing" element={<PricingView user={user} onSubscribe={(tier) => console.log('Subscribe:', tier)} />} />
             </Routes>
          </div>

          {/* Sidebar / Bottom Rail */}
          <aside className={cn(
            "w-full xl:w-80 bg-white flex flex-col shrink-0 border-t xl:border-t-0 xl:border-l border-zinc-100 xl:overflow-y-auto custom-scrollbar safe-area-bottom",
            activeTab === 'chat' ? "hidden xl:flex" : ""
          )}>
            {/* Mobile Toggle */}
            <button 
              className="xl:hidden w-full h-16 flex items-center justify-between px-4 sm:px-6 border-b border-zinc-100 bg-white sticky top-0 z-10"
              onClick={() => setIsSlateExpanded(!isSlateExpanded)}
            >
              <span className="text-[10px] font-bold tracking-[0.35em] text-zinc-500 uppercase">View Action & Results</span>
              <ChevronRight className={cn("text-zinc-500 transition-transform", isSlateExpanded && "rotate-90")} size={16} />
            </button>

            <div className={cn("xl:block", !isSlateExpanded && "hidden")}>
              {/* Full Slate */}
              <div className="border-b border-black/10">
                <div className="hidden xl:flex flex-col border-b border-black/10 bg-white sticky top-0 z-10 pt-4">
                  <div className="px-10 mb-4 flex justify-between items-center">
                    <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">Full Slate</span>
                  </div>
                  <div className="flex w-full overflow-x-auto no-scrollbar border-t border-black/10">
                    {['previous', 'today', 'tomorrow'].map(filter => (
                      <button
                        key={filter}
                        onClick={() => setSlateFilter(filter as any)}
                        className={cn(
                          "flex-1 text-[9px] uppercase tracking-widest font-bold py-3 text-center transition-colors border-b-2 hover:bg-zinc-50",
                          slateFilter === filter 
                            ? "border-brand text-brand" 
                            : "border-transparent text-zinc-500 hover:text-zinc-800"
                        )}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="p-0">
                  {isLoadingOdds ? (
                    <div className="p-10 text-center">
                      <RefreshCw className="animate-spin text-zinc-300 mx-auto mb-4" size={20} />
                      <p className="text-[10px] text-zinc-500 uppercase tracking-widest font-bold">Hydrating...</p>
                    </div>
                  ) : fullSlate.length === 0 ? (
                    <div className="p-10 text-center flex flex-col gap-1 text-[10px] text-zinc-500 uppercase tracking-widest font-bold">
                      <span>No games today</span>
                      <span>Check back tomorrow</span>
                    </div>
                  ) : fullSlate.map((odd, idx) => {
                    const bookmaker = odd.bookmakers[0];
                    const totals = bookmaker?.markets.find(m => m.key === 'totals');
                    const totalPoint = totals?.outcomes.find(o => o.name === 'Over')?.point;
                    const h2h = bookmaker?.markets.find(m => m.key === 'h2h');
                    const moneylineStr = typeof h2h?.outcomes[0]?.price === 'string' ? h2h.outcomes[0].price : undefined;
                    
                    return (
                      <Link 
                        key={idx} 
                        to={`/game/${odd.id}`}
                        className={cn(
                          "block w-full flex flex-col px-6 xl:px-10 py-5 border-b border-zinc-50/50 transition-colors group text-left",
                          odd.status === 'live' ? "bg-brand/5 hover:bg-brand/10" : "hover:bg-zinc-50"
                        )}
                      >
                        <div className="w-full flex items-center justify-between">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              {odd.status === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-brand live-pulse" />}
                              <span className="text-[10px] font-mono text-zinc-600 group-hover:text-zinc-900 transition-colors">
                                {odd.status === 'live' ? (
                                  <>LIVE{odd.situation ? ` • ${odd.situation}` : ''}</>
                                ) : odd.status === 'final' ? (
                                  <>FINAL</>
                                ) : (
                                  new Date(odd.commence_time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})
                                )}
                                {odd.market_data_status?.state === 'partial' && (
                                  <span className="ml-2 uppercase tracking-wide text-[9px] text-zinc-500">ESPN checked</span>
                                )}
                              </span>
                            </div>
                            <div className="text-sm serif text-zinc-800 mt-1">
                              {odd.status === 'live' || odd.status === 'final' ? (
                                <div className="flex flex-col gap-1">
                                  <span>{odd.away_team} <span className="font-mono font-bold text-xs ml-1">{odd.away_score || "0"}</span></span>
                                  <span>{odd.home_team} <span className="font-mono font-bold text-xs ml-1">{odd.home_score || "0"}</span></span>
                                </div>
                              ) : (
                                <span>{odd.away_team} @ {odd.home_team}</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end gap-1.5">
                            {moneylineStr && (
                              <div className="text-right">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 mr-2">ML</span>
                                <span className="font-mono text-sm text-zinc-800">{moneylineStr}</span>
                              </div>
                            )}
                            {totalPoint && (
                              <div className="text-right">
                                <span className="text-[10px] uppercase tracking-widest text-zinc-500 mr-2">O/U</span>
                                <span className="font-mono text-sm text-zinc-800">{totalPoint}</span>
                              </div>
                            )}
                            {!moneylineStr && !totalPoint && odd.market_data_status?.state === "partial" && (
                              <span className="text-[10px] uppercase tracking-widest text-zinc-500">ESPN checked • market odds not found yet</span>
                            )}
                          </div>
                        </div>

                        {/* Yahoo Sports Style Pitcher Diamond */}
                        {(odd.away_pitcher || odd.home_pitcher) && (
                          <div className="w-full mt-4 pt-3 border-t border-black/10 transition-opacity">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-1.5 h-1.5 rotate-45 bg-zinc-300 group-hover:bg-brand transition-colors shrink-0" />
                              <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500 group-hover:text-brand transition-colors">Pitching Matchup</span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <PitcherDisplay 
                                teamFull={odd.away_team} 
                                name={odd.away_pitcher} 
                                headshot={odd.away_pitcher_headshot} 
                                record={odd.away_pitcher_record} 
                                small
                              />
                              <PitcherDisplay 
                                teamFull={odd.home_team} 
                                name={odd.home_pitcher} 
                                headshot={odd.home_pitcher_headshot} 
                                record={odd.home_pitcher_record} 
                                alignRight 
                                small
                              />
                            </div>
                          </div>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* Recent Finals */}
              {finalGames.length > 0 && (
                <div>
                  <div className="h-16 flex items-center px-6 xl:px-10 border-b border-zinc-100 bg-white sticky top-0 z-10">
                    <span className="text-[10px] font-bold tracking-[0.4em] text-zinc-500 uppercase">Recent Finals</span>
                  </div>
                  <div className="p-6 xl:p-10 space-y-10">
                    {finalGames.map((odd, idx) => (
                      <div key={idx} className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-tight truncate w-32">{odd.sport_title}</span>
                          <span className="text-[9px] font-mono text-brand italic">FINAL</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2.5 opacity-60">
                              <img src={getEspnLogo(odd.away_team)} className="w-5 h-5 rounded-full border border-zinc-100 shadow-sm" alt="" />
                              <span className="serif text-ink">{odd.away_team}</span>
                            </div>
                            <span className="font-mono text-zinc-500">{odd.away_score || "0"}</span>
                          </div>
                          <div className="flex justify-between items-center text-sm">
                            <div className="flex items-center gap-2.5 font-medium">
                              <img src={getEspnLogo(odd.home_team)} className="w-5 h-5 rounded-full border border-zinc-100 shadow-sm" alt="" />
                              <span className="serif text-ink">{odd.home_team}</span>
                            </div>
                            <span className="font-mono font-bold text-ink">{odd.home_score || "0"}</span>
                          </div>
                        </div>
                        {odd.result_context && (
                          <div className="text-[11px] text-zinc-500 serif italic mt-2">
                            {odd.score} — {odd.result_context.replace('✓', '')} <span className="text-brand not-italic ml-1">✓</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              <div className="p-10 text-center mt-auto border-t border-zinc-100/50">
                <span className="text-[9px] uppercase tracking-widest font-bold text-zinc-500">ESPN checked board state</span>
              </div>
            </div>
          </aside>
        </div>
      </main>
      </div>
    </div>
  );
}

// --- Subcomponents ---

function AuthLanding({ onLogin }: { onLogin: () => void }) {
  return (
    <div className="min-h-[100dvh] bg-paper flex flex-col items-center justify-center p-6 sm:p-12 text-center text-ink selection:bg-brand/10 safe-area-top safe-area-bottom">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-4xl w-full flex flex-col items-center"
      >
        <div className="mb-14 opacity-20">
           <div className="w-12 h-12 flex items-center justify-center font-serif italic text-6xl font-medium text-brand">B</div>
        </div>
        <h1 className="text-[18vw] sm:text-9xl font-semibold tracking-[-0.04em] leading-[0.85] mb-12 flex flex-col items-center">
           <span>THE DAILY</span>
           <span className="serif-italic font-medium text-brand">BASELINE</span>
        </h1>
        <p className="text-lg sm:text-xl text-zinc-600 max-w-xl mx-auto leading-relaxed mb-16 font-medium">
           Institutional-grade statistical analysis and direct market board anchors. No fluff, just the tape.
        </p>
        <button 
          onClick={onLogin}
          className="group relative flex items-center gap-8 py-4 px-10 border border-zinc-200 rounded-full hover:border-[#2D4A3E]/30 hover:bg-[#2D4A3E]/5 transition-all duration-500 overflow-hidden"
        >
          <div className="text-[11px] font-bold uppercase tracking-[0.4em] text-zinc-500 group-hover:text-brand transition-colors z-10 relative">Enter Board</div>
          <ChevronRight size={14} className="text-zinc-500 group-hover:text-brand group-hover:translate-x-2 transition-all duration-500 z-10 relative" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#2D4A3E]/5 to-transparent -translate-x-full group-hover:animate-[shimmer_1.5s_infinite]" />
        </button>
      </motion.div>
      
      <motion.div 
         initial={{ opacity: 0 }}
         animate={{ opacity: 1 }}
         transition={{ delay: 0.5, duration: 1 }}
         className="absolute bottom-12 flex items-center gap-8"
      >
         <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">MLB</span>
         <span className="w-1 h-1 bg-zinc-200 rounded-full" />
         <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">NBA</span>
         <span className="w-1 h-1 bg-zinc-200 rounded-full" />
         <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-zinc-500">Direct Feed</span>
      </motion.div>
    </div>
  );
}

import { PricingView } from './components/PricingView';

function SideNavIcon({ active, onClick, icon }: { active: boolean, onClick: () => void, icon: React.ReactNode }) {
  return (
    <button 
      onClick={onClick}
      className="relative flex flex-col items-center group transition-all duration-300 focus-visible:outline-none"
    >
      <div className={cn(
        "w-10 h-10 flex items-center justify-center transition-all rounded-[14px]",
        active ? "bg-zinc-200/60 text-ink shadow-sm" : "text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100/50"
      )}>
        {icon}
      </div>
    </button>
  );
}

function DeployDocumentBtn({ content }: { content: string }) {
  const [isDeploying, setIsDeploying] = useState(false);
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null);

  const handleDeploy = async () => {
    if (!auth.currentUser) return;
    setIsDeploying(true);
    try {
      const docRef = await addDoc(collection(db, 'artifacts'), {
        content: String(content).replace(/\n$/, ''),
        type: 'html',
        title: "Generated Interface",
        source: "Gemini Chat Interaction",
        createdAt: serverTimestamp(),
        fetchedAt: serverTimestamp(),
        creatorId: auth.currentUser.uid
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
          className="text-zinc-500 hover:text-zinc-700 transition-colors" 
          title="Copy Link"
        >
          <Copy size={14} />
        </button>
        <button 
          onClick={() => window.open(deployedUrl, '_blank', 'noopener,noreferrer')}
          className="text-zinc-500 hover:text-brand transition-colors" 
          title="Open in new tab"
        >
          <Globe size={14} />
        </button>
      </div>
    );
  }

  return (
    <button 
      className="text-zinc-500 hover:text-brand transition-colors" 
      title="Generate Shareable Link"
      onClick={handleDeploy}
      disabled={isDeploying}
    >
      <Globe size={14} className={isDeploying ? "animate-pulse" : ""} />
    </button>
  );
}

function ChatMessageItem({ m }: { m: ChatMessage }) {
  const isAI = m.role === 'model';
  const renderText = isAI ? sanitizeConsumerSportsText(m.text) : m.text;
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn("grid grid-cols-[1fr] gap-3 md:gap-4 max-w-3xl", !isAI && "ml-auto w-full md:w-auto")}
    >
      <div className="space-y-4">
        <div className={cn("hidden md:flex items-center gap-3", !isAI && "justify-end")}>
          <span className="text-[8px] font-bold uppercase tracking-[0.4em] text-zinc-500">
            {isAI ? 'Analysis' : 'You'}
          </span>
          <span className="w-1 h-1 bg-zinc-50 rounded-full" />
          <span className="text-[8px] font-mono text-zinc-500 uppercase tabular-nums">06:05:26</span>
        </div>
        <div className={cn(
          "leading-[1.8] tracking-tight text-[15px] md:text-sm",
          isAI
            ? "text-zinc-800 md:text-zinc-700 prose prose-emerald max-w-none prose-sm font-normal"
            : "ml-auto max-w-[88%] md:max-w-none rounded-3xl bg-ink text-white md:bg-transparent md:text-ink font-medium md:serif-italic text-base md:text-lg px-4 py-3 md:px-6 md:py-0 md:border-r md:border-brand/20 text-left"
        )}>
          {isAI ? (
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={{
              p: ({ children }) => <p className="mb-7 last:mb-0 text-zinc-700 leading-[1.85]">{children}</p>,
              strong: ({ children }) => <strong className="text-ink font-semibold">{children}</strong>,
              table: ({ children }) => (
                <div className="w-full overflow-x-auto my-8 rounded-2xl border border-zinc-200/60 shadow-sm bg-white/50 backdrop-blur-sm">
                  <table className="w-full text-left border-collapse text-sm">
                    {children}
                  </table>
                </div>
              ),
              thead: ({ children }) => <thead className="bg-zinc-50/50 border-b border-zinc-200/60">{children}</thead>,
              tbody: ({ children }) => <tbody className="divide-y divide-zinc-100/60">{children}</tbody>,
              tr: ({ children, isHeader, ...props }: any) => <tr className="hover:bg-zinc-50/80 transition-colors" {...props}>{children}</tr>,
              th: ({ children }) => <th className="px-4 py-3 font-medium text-[10px] text-zinc-500 uppercase tracking-widest">{children}</th>,
              td: ({ children }) => {
                let numValue = NaN;
                
                // Attempt to parse string or array of strings into a number for heatmap coloring
                const parseNum = (val: any) => {
                  if (typeof val === 'string') {
                    const numStr = val.replace(/[^0-9.-]/g, '');
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
                
                let bgColor = 'transparent';
                let textColor = 'inherit';
                if (!isNaN(numValue)) {
                  // Values > 0 get green, < 0 get red. This creates a really nice dynamic heatmap effect.
                  if (numValue > 0) {
                     const alpha = Math.min(Math.max(Math.abs(numValue) / 100, 0.02), 0.3);
                     bgColor = `rgba(34, 197, 94, ${alpha})`;
                     if (alpha > 0.15) textColor = '#064e3b';
                  } else if (numValue < 0) {
                     const alpha = Math.min(Math.max(Math.abs(numValue) / 100, 0.02), 0.3);
                     bgColor = `rgba(239, 68, 68, ${alpha})`;
                     if (alpha > 0.15) textColor = '#7f1d1d';
                  }
                }
                
                return (
                  <td 
                    className="px-4 py-3 font-mono text-[11px] tabular-nums whitespace-nowrap transition-colors"
                    style={{ backgroundColor: bgColor, color: textColor !== 'inherit' ? textColor : undefined }}
                  >
                    {children}
                  </td>
                );
              },
              code: ({ inline, className, children, ...props }: any) => {
                const match = /language-(\w+)/.exec(className || '');
                
                const extractText = (node: any): string => {
                  if (typeof node === 'string') return node;
                  if (typeof node === 'number') return String(node);
                  if (Array.isArray(node)) return node.map(extractText).join('');
                  if (node && typeof node === 'object' && node.props && node.props.children) {
                    return extractText(node.props.children);
                  }
                  return '';
                };
                
                const codeString = extractText(children).replace(/\n$/, '');

                if (!inline && match) {
                  if (match[1] === 'html') {
                    return (
                      <div className="my-8 overflow-hidden rounded-xl border border-zinc-200 bg-white shadow-sm">
                        <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50/50 px-4 py-3">
                          <div className="flex items-center gap-2">
                            <FileText size={14} className="text-zinc-500" />
                            <span className="font-mono text-[11px] font-medium text-zinc-500 uppercase tracking-wider">
                              Document Artifact
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <DeployDocumentBtn content={codeString} />
                            <button 
                              className="text-zinc-500 hover:text-zinc-700 transition-colors" 
                              title="Copy HTML"
                              onClick={() => navigator.clipboard.writeText(codeString)}
                            >
                              <Copy size={14} />
                            </button>
                            <button 
                              className="text-zinc-500 hover:text-zinc-700 transition-colors" 
                              title="Show Source"
                              onClick={(e) => {
                                const el = (e.target as HTMLElement).closest('.rounded-xl')?.querySelector('.raw-source');
                                el?.classList.toggle('hidden');
                              }}
                            >
                              <Code size={14} />
                            </button>
                          </div>
                        </div>
                        <div className="p-0 w-full overflow-hidden flex flex-col bg-zinc-100 items-center py-8">
                          <div className="w-full max-w-[850px] bg-white shadow-sm ring-1 ring-zinc-900/5 min-h-[500px] relative">
                            <iframe 
                               srcDoc={codeString} 
                               className="w-full h-full min-h-[500px] border-none"
                               sandbox=""
                               referrerPolicy="no-referrer"
                            />
                            <div className="raw-source hidden absolute inset-0 bg-black/90 p-6 overflow-auto">
                              <pre className="text-zinc-300 text-xs font-mono whitespace-pre-wrap">{codeString}</pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div className="my-8 overflow-hidden rounded-xl border border-zinc-200 bg-[#1c1917] shadow-sm">
                      <div className="flex items-center justify-between border-b border-zinc-800 bg-[#292524] px-4 py-3">
                        <div className="flex items-center gap-2">
                          <TerminalSquare size={14} className="text-zinc-300" />
                          <span className="font-mono text-[11px] font-medium text-zinc-300 uppercase tracking-wider">
                            {match[1]} Artifact // Analytical Model
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            className="text-zinc-300 hover:text-white transition-colors" 
                            title="Copy code"
                            onClick={() => navigator.clipboard.writeText(codeString)}
                          >
                            <Copy size={14} />
                          </button>
                        </div>
                      </div>
                      <div className="p-4 overflow-x-auto text-[13px]">
                        <SyntaxHighlighter
                          {...props}
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          customStyle={{ margin: 0, padding: 0, background: 'transparent' }}
                        >
                          {codeString}
                        </SyntaxHighlighter>
                      </div>
                    </div>
                  );
                }
                return <code className="bg-zinc-50 px-1 py-0.5 rounded font-mono text-[10px] text-zinc-800 border border-zinc-100"{...props}>{children}</code>;
              }
            }}>
              {renderText}
            </ReactMarkdown>
          ) : (
            renderText
          )}
        </div>
      </div>
    </motion.div>
  );
}

function OddsCard({ odd, onClick }: { odd: SportOdds, onClick?: () => void }) {
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
         {odd.bookmakers?.length ? (
           <>
             <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
               <img src={getLogo(odd.home_team)} className="w-8 h-8 rounded-full shadow-sm ring-1 ring-zinc-200 group-hover:scale-110 transition-transform duration-300" alt="" />
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-ink">{odd.home_team}</span>
                 <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Moneyline / Spread / Total</span>
               </div>
               <PriceTag price={homePrice} />
             </div>

             <div className="grid grid-cols-[auto_1fr_auto] gap-6 items-center">
               <img src={getLogo(odd.away_team)} className="w-8 h-8 rounded-full shadow-sm ring-1 ring-zinc-200 group-hover:scale-110 transition-transform duration-300" alt="" />
               <div className="flex flex-col">
                 <span className="text-xs font-semibold text-ink">{odd.away_team}</span>
                 <span className="text-[9px] text-zinc-500 uppercase font-bold tracking-widest">Moneyline / Spread / Total</span>
               </div>
               <PriceTag price={awayPrice} />
             </div>
           </>
         ) : (
           <div className="rounded-xl border border-zinc-200/70 bg-zinc-50/70 px-3 py-4">
             <span className="text-[10px] uppercase tracking-widest text-zinc-500">
               {describeOddsLine(odd) || "ESPN checked. Market odds not found yet."}
             </span>
           </div>
         )}

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
            {odd.bookmakers?.length ? (
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
}

function PriceTag({ price }: { price: number | string }) {
  if (price === 0 || price === "N/A" || !price) return <span className="opacity-0">-</span>;
  const displayPrice = typeof price === 'number' ? (price > 0 ? `+${price}` : price.toString()) : price;
  
  return (
    <div className="font-mono font-medium text-sm text-ink tracking-tight bg-white shadow-sm border border-zinc-100 rounded-md px-2 py-1 min-w-[50px] text-center">
       {displayPrice}
    </div>
  );
}

function GameDetailView({ odds }: { odds: SportOdds[] }) {
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
                       <PriceTag price={awayPrice} />
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
                         <PriceTag price={homePrice} />
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
                 <span className="text-ink font-bold">{totalPoint !== "-" ? `O/U ${totalPoint}` : "N/A"}</span>
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
}

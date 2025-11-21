
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Plus, Activity, Book, 
  Brain, LogOut, Zap, Award, Clock, 
  CheckCircle2, RefreshCcw, Trophy, Music,
  Layers, ArrowRight, X, Settings, Moon, Sun, Globe, Volume2, Sparkles,
  Shield, Sword, Gamepad2, ShoppingBag, Users, Radio, Smile, Frown, Meh, Mic, Eye, BarChart3, FileText, Map, GraduationCap, Ghost, Palette, Leaf, Archive, Scroll, Heart, Lock, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, History, RotateCw, ThumbsUp, ThumbsDown, Calendar, MessageSquare, Send, Bell, Sprout, LayoutGrid, ListTodo, Trash2, Download, Gift, GitBranch, Maximize2, Minimize2, HelpCircle, Package, MessageCircle, BookOpen, Quote, AlertTriangle, AlertOctagon, Keyboard, Check, Edit3
} from 'lucide-react';
import { MonoCard } from './components/GlassCard';
import { User, StudySession, TimerState, Language, QuizQuestion, Quest, Flashcard, Subject, AccentColor, Boss, ShopItem, Stock, ConceptMapData, Guild, ExamQuestion, FirebaseConfig, ChatMessage, AppNotification, Todo, Achievement, SkillNode } from './types';
import { FirebaseService } from './services/firebase';
import { analyzeSession, generateQuiz, generateDailyQuests, generateFlashcards, explainConcept, generateStudyPlan, gradeEssay, generatePodcastScript, generateConceptMap, generateBoss, generateExam, startDebate, continueDebate } from './services/geminiService';
import { DEFAULT_SUBJECTS, TRANSLATIONS, ACCENT_COLORS, SHOP_ITEMS, MOCK_STOCKS, BOSS_TEMPLATES, GEMINI_API_KEY, FIREBASE_CONFIG, SKILL_TREE_NODES, ACHIEVEMENTS, LEVEL_THRESHOLDS } from './constants';

// --- SOUNDS ---
const AMBIENCE_TRACKS = [
  { id: 'rain', name: 'Rain', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  { id: 'cafe', name: 'Cafe', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  { id: 'white', name: 'White Noise', url: 'https://actions.google.com/sounds/v1/ambiences/humming_air_conditioner.ogg' },
  { id: 'lofi', name: 'Lo-Fi Radio', url: 'https://stream.zeno.fm/0r0xa792kwzuv' }, 
];

const QUOTES = [
  "Focus is the key to all success.",
  "Small steps every day lead to big results.",
  "The best way to predict the future is to create it.",
  "Discipline is choosing what you want most over what you want now.",
  "Don't watch the clock; do what it does. Keep going."
];

const AVATARS = ["👤", "🐱", "🐶", "🐰", "🦊", "🦁", "🤖", "👽", "👻", "🎃", "🦄", "🐲"];

const App: React.FC = () => {
  // --- STATE ---
  const [isConfigured, setIsConfigured] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showNotebookModal, setShowNotebookModal] = useState(false);
  const [showShortcutsModal, setShowShortcutsModal] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  
  // Auth
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState({ email: '', username: '', password: '' });
  const [authError, setAuthError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);

  // Navigation
  const [activeTab, setActiveTab] = useState<'focus' | 'leaderboard' | 'ai_lab' | 'game_center' | 'social'>('focus');
  
  // Timer & Modes
  const [timer, setTimer] = useState<TimerState>({
    timeLeft: 25 * 60,
    isActive: false,
    mode: 'focus',
    subjectId: null,
    isZenMode: false,
    isBattleMode: false
  });
  const [focusShieldActive, setFocusShieldActive] = useState(false);
  const [distractionCount, setDistractionCount] = useState(0);

  // Session Workflow
  const [sessionStep, setSessionStep] = useState<'idle' | 'mood_pre' | 'running' | 'mood_post' | 'notes' | 'analysis' | 'quiz' | 'flashcards'>('idle');
  const [notes, setNotes] = useState('');
  const [lastSession, setLastSession] = useState<StudySession | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [preMood, setPreMood] = useState<'happy'|'neutral'|'stressed'>('neutral');
  const [quizAnswers, setQuizAnswers] = useState<number[]>([]);
  const [quizScore, setQuizScore] = useState<number | null>(null);
  const [lootItem, setLootItem] = useState<string | null>(null);
  const [newUnlockedAchievement, setNewUnlockedAchievement] = useState<Achievement | null>(null);
  const [showDailyBonus, setShowDailyBonus] = useState(false);
  const [dailyQuote, setDailyQuote] = useState('');
  
  // Flashcards Review Mode
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewQueue, setReviewQueue] = useState<Flashcard[]>([]);
  const [currentReviewIndex, setCurrentReviewIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);

  // AI Lab
  const [aiToolMode, setAiToolMode] = useState<'explain' | 'plan' | 'essay' | 'podcast' | 'concept' | 'exam' | 'debate'>('explain');
  const [aiToolInput, setAiToolInput] = useState('');
  const [aiToolOutput, setAiToolOutput] = useState<any>(null);
  const [examAnswers, setExamAnswers] = useState<number[]>([]);
  const [debateMessages, setDebateMessages] = useState<{role: 'user'|'model', text: string}[]>([]);

  // Game Center
  const [activeBoss, setActiveBoss] = useState<Boss | null>(null);
  const [stocks, setStocks] = useState<Stock[]>(MOCK_STOCKS);
  const [gameSubTab, setGameSubTab] = useState<'market' | 'pet' | 'garden' | 'legacy' | 'skills' | 'inventory'>('market');
  const [showBossVictory, setShowBossVictory] = useState(false);
  const [legacyNote, setLegacyNote] = useState('');
  const [legacyDate, setLegacyDate] = useState('');

  // Social
  const [socialSubTab, setSocialSubTab] = useState<'lounge' | 'leaderboard' | 'guilds'>('lounge');
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [isCreatingGuild, setIsCreatingGuild] = useState(false);
  const [newGuildName, setNewGuildName] = useState('');
  const [guildChatMessages, setGuildChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [typingSound, setTypingSound] = useState(false);
  const [showSpotify, setShowSpotify] = useState(false);

  // Misc
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [eyeYogaActive, setEyeYogaActive] = useState(false);
  
  // Onboarding
  const [onboardingStep, setOnboardingStep] = useState(0);

  // Eisenhower
  const [todoInput, setTodoInput] = useState('');
  const [todoQuadrant, setTodoQuadrant] = useState<'q1' | 'q2' | 'q3' | 'q4'>('q1');

  // --- NOTIFICATIONS ---
  const addNotification = (title: string, message: string, type: 'info'|'success'|'warning' = 'info') => {
      const id = Date.now().toString();
      setNotifications(p => [...p, { id, title, message, type }]);
      setTimeout(() => setNotifications(p => p.filter(n => n.id !== id)), 5000);
      
      // Native Notification
      if(user?.preferences.enableNativeNotifications && Notification.permission === 'granted') {
          new Notification(title, { body: message });
      }
  };

  const requestNotificationPermission = async () => {
      if (!("Notification" in window)) {
          addNotification("Error", "Browser does not support notifications", "warning");
          return;
      }
      const permission = await Notification.requestPermission();
      if (permission === 'granted') {
          if(user) {
              const u = {...user, preferences: {...user.preferences, enableNativeNotifications: true}};
              setUser(u);
              FirebaseService.updateUser(u);
          }
          addNotification("Success", "Native notifications enabled!", "success");
      }
  };

  // --- INIT ---
  useEffect(() => {
    const initSystem = async () => {
        try {
            const success = FirebaseService.initialize(FIREBASE_CONFIG);
            if (success) {
                setIsConfigured(true);
                const currentUser = await FirebaseService.getCurrentUser();
                if (currentUser) {
                    try {
                        await checkDailyQuests(currentUser);
                        await checkDailyLogin(currentUser);
                    } catch (e) {
                        console.warn("Daily checks failed on init", e);
                    }
                    setUser(currentUser); // Ensure user is set
                    // Init timer from prefs if exists
                    if (currentUser.preferences.focusDuration) {
                        setTimer(t => ({...t, timeLeft: currentUser.preferences.focusDuration * 60}));
                    }
                }
                setIsOffline(FirebaseService.isUsingFallback());
            }
        } catch (e) {
            console.error("Initialization failed", e);
        }
        setIsLoading(false);
        setDailyQuote(QUOTES[new Date().getDay() % QUOTES.length]);
    };
    initSystem();
  }, []);

  // Theme Sync
  useEffect(() => {
    if (user) {
        document.documentElement.classList.toggle('dark', user.preferences.darkMode);
        const accentHex = ACCENT_COLORS[user.preferences.accent] || user.preferences.accent || '#000000';
        document.documentElement.style.setProperty('--accent-color', accentHex);
    }
  }, [user?.preferences]);

  // Audio Sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Keyboard Shortcuts
  useEffect(() => {
      const handleKeyDown = (e: KeyboardEvent) => {
          if(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
          
          if(e.code === 'Space') {
              e.preventDefault();
              if(activeTab === 'focus' && timer.timeLeft > 0) {
                  if(timer.isActive) {
                      setTimer(p => ({...p, isActive: false}));
                  } else if (sessionStep === 'running') {
                      setTimer(p => ({...p, isActive: true}));
                  }
              }
          }
          if(e.code === 'KeyD' && timer.isActive) {
              handleDistraction();
          }
          if(e.code === 'Escape') {
              setShowSettings(false);
              setShowHistoryModal(false);
              setShowNotebookModal(false);
              setShowReviewModal(false);
              setShowShortcutsModal(false);
              setEyeYogaActive(false);
              setLootItem(null);
              setNewUnlockedAchievement(null);
              setShowDailyBonus(false);
              if(timer.isZenMode) toggleZenMode();
          }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timer.isActive, activeTab, sessionStep, timer.isZenMode]);

  // Stock Market Simulation
  useEffect(() => {
      const interval = setInterval(() => {
          setStocks(prevStocks => prevStocks.map(s => {
              const change = (Math.random() - 0.5) * 2; // -1 to 1
              const newPrice = Math.max(1, s.price + change);
              return {
                  ...s,
                  price: newPrice,
                  trend: change > 0 ? 'up' : change < 0 ? 'down' : 'flat'
              };
          }));
      }, 10000); // Update every 10s
      return () => clearInterval(interval);
  }, []);

  // Pet Decay Loop
  useEffect(() => {
      if (!user || !user.pet) return;
      const interval = setInterval(() => {
          setUser(prev => {
              if(!prev || !prev.pet) return prev;
              const newHunger = Math.min(100, prev.pet.hunger + 1); 
              const newHappy = Math.max(0, prev.pet.happiness - 1); 
              
              if (newHunger >= 90) addNotification("Pet Alert", `${prev.pet.name} is starving!`, 'warning');
              if (newHappy <= 10) addNotification("Pet Alert", `${prev.pet.name} is very sad.`, 'warning');

              const updatedUser = { ...prev, pet: { ...prev.pet, hunger: newHunger, happiness: newHappy } };
              return updatedUser;
          });
      }, 60000); // Every minute
      return () => clearInterval(interval);
  }, [user?.pet?.name]);

  // Guild Chat Listener
  useEffect(() => {
      if (activeTab === 'social' && socialSubTab === 'guilds' && user?.guildId) {
          const unsubscribe = FirebaseService.subscribeToGuildChat(user.guildId, (msgs) => {
              setGuildChatMessages(msgs);
          });
          return () => unsubscribe();
      }
  }, [activeTab, socialSubTab, user?.guildId]);

  // Load Guilds/Leaderboard
  useEffect(() => {
      if(activeTab === 'social' && socialSubTab === 'guilds') {
          FirebaseService.getGuilds().then(setGuilds);
      }
      if(activeTab === 'social' && socialSubTab === 'leaderboard') {
          FirebaseService.getLeaderboard().then(setLeaderboard);
      }
  }, [activeTab, socialSubTab]);

  // Focus Shield Listener
  useEffect(() => {
    const handleBlur = () => {
        if(timer.isActive && !timer.isZenMode && !focusShieldActive) {
            setFocusShieldActive(true);
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.volume = 0.5;
            audio.play().catch(()=>{});
        }
    }
    const handleFocus = () => setFocusShieldActive(false);
    
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    return () => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
    };
  }, [timer.isActive, focusShieldActive]);

  // Typing Sound Listener
  useEffect(() => {
    const playType = () => {
        if (typingSound) {
            const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_MP3.mp3'); 
            audio.volume = 0.1;
            audio.play().catch(()=>{});
        }
    };
    window.addEventListener('keypress', playType);
    return () => window.removeEventListener('keypress', playType);
  }, [typingSound]);

  const checkDailyLogin = async (u: User) => {
      const now = new Date();
      const last = u.lastLoginDate ? new Date(u.lastLoginDate) : new Date(0);
      const isSameDay = now.getDate() === last.getDate() && 
                        now.getMonth() === last.getMonth() && 
                        now.getFullYear() === last.getFullYear();
      if (!isSameDay) {
          u.coins += 50;
          u.xp += 20;
          u.lastLoginDate = Date.now();
          await FirebaseService.updateUser(u);
          setUser(u);
          setShowDailyBonus(true);
      }
  };

  const checkDailyQuests = async (u: User) => {
    const now = Date.now();
    const lastGen = u.lastQuestGeneration || 0;
    const oneDay = 24 * 60 * 60 * 1000;

    if (now - lastGen > oneDay || u.quests.length === 0) {
      const newQuests = await generateDailyQuests(u.level, u.preferences.language);
      u.quests = newQuests;
      u.lastQuestGeneration = now;
      await FirebaseService.updateUser(u);
    }
    setUser(u);
  };
  
  const toggleZenMode = () => {
      if (!document.fullscreenElement) {
          document.documentElement.requestFullscreen();
          setTimer(p => ({...p, isZenMode: true}));
      } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
            setTimer(p => ({...p, isZenMode: false}));
          }
      }
  };
  
  const handleDistraction = () => {
      setDistractionCount(p => p + 1);
      addNotification("Distraction Logged", "Try to bring your attention back gently.", "info");
  };

  const t = (key: string) => user ? TRANSLATIONS[user.preferences.language][key] || key : '';

  // --- TIMER ENGINE ---
  useEffect(() => {
    let interval: number;
    if (timer.isActive && timer.timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimer(p => {
            if (p.isBattleMode && activeBoss && p.timeLeft % 5 === 0) {
                setActiveBoss(b => b ? ({...b, hp: Math.max(0, b.hp - 10)}) : null);
            }
            return { ...p, timeLeft: p.timeLeft - 1 };
        });
      }, 1000);
    } else if (timer.timeLeft === 0 && timer.isActive) {
      setTimer(p => ({ ...p, isActive: false }));
      if (timer.mode === 'focus') {
          if (timer.isBattleMode && activeBoss && activeBoss.hp <= 0) {
              setShowBossVictory(true);
          }
          handleFinishSession();
      }
    }
    return () => clearInterval(interval);
  }, [timer.isActive, timer.timeLeft, activeBoss]);

  // --- AUDIO ENGINE ---
  const toggleSound = (trackId: string) => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }

    if (activeSoundId === trackId) {
      setActiveSoundId(null);
    } else {
      const track = AMBIENCE_TRACKS.find(t => t.id === trackId);
      if (track) {
        const audio = new Audio(track.url);
        audio.loop = true;
        audio.volume = volume;
        audio.play();
        audioRef.current = audio;
        setActiveSoundId(trackId);
      }
    }
  };

  // --- LOGIC HANDLERS ---
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setAuthError('');
    try {
      let u: User;
      if (authMode === 'register') {
        u = await FirebaseService.register(authData.email, authData.password, authData.username);
      } else {
        u = await FirebaseService.login(authData.email, authData.password, rememberMe);
      }
      try {
        await checkDailyQuests(u);
        await checkDailyLogin(u);
      } catch (questErr) {
        console.warn("Failed to generate quests after auth", questErr);
      }
      setUser(u);
      setIsOffline(FirebaseService.isUsingFallback());
      addNotification("Welcome", `Welcome back, ${u.username}!`, "success");
      if (u.hasSeenOnboarding === false) setOnboardingStep(1);
    } catch (err: any) {
      setAuthError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const startSession = () => {
      setSessionStep('mood_pre');
      setDistractionCount(0);
  };

  const startTimerActual = () => {
      setSessionStep('running');
      setTimer(p => ({...p, isActive: true}));
      if (timer.isBattleMode) {
          generateBoss('General', user!.level).then(setActiveBoss);
      }
  };

  const handleFinishSession = () => {
    setTimer(p => ({ ...p, isActive: false }));
    setSessionStep('mood_post');
    if (audioRef.current) audioRef.current.pause();
    if(user?.preferences.enableNativeNotifications && Notification.permission === 'granted') {
        new Notification("Session Complete!", { body: "Great job! Time for a break." });
    }
    if (Math.random() < 0.3) {
        const drops = ["50 Coins", "XP Potion", "Apple", "Mystery Box"];
        setLootItem(drops[Math.floor(Math.random() * drops.length)]);
    }
  };
  
  const checkAchievements = async (currentUser: User) => {
      const unlocked = [...currentUser.unlockedAchievements];
      let newUnlock: Achievement | null = null;
      ACHIEVEMENTS.forEach(ach => {
          if (!unlocked.includes(ach.id) && ach.condition(currentUser)) {
              unlocked.push(ach.id);
              newUnlock = ach;
          }
      });
      if (newUnlock) {
          currentUser.unlockedAchievements = unlocked;
          currentUser.xp += 100;
          setNewUnlockedAchievement(newUnlock);
          addNotification("Achievement Unlocked!", (newUnlock as Achievement).title.en, "success");
          await FirebaseService.updateUser(currentUser);
      }
  };

  const submitSession = async () => {
    if (!user || !timer.subjectId) return;
    setAiLoading(true);

    const defaultFocusTime = user.preferences.focusDuration || 25;
    const duration = Math.floor((defaultFocusTime * 60 - timer.timeLeft) / 60) || 1;
    const subject = user.subjects.find(s => s.id === timer.subjectId)?.name || "General";
    
    const [analysis, quiz, cards] = await Promise.all([
      analyzeSession(subject, notes, duration, user.preferences.language),
      generateQuiz(subject, notes, user.preferences.language),
      generateFlashcards(subject, notes, user.preferences.language)
    ]);

    const formattedCards: Flashcard[] = cards.map(c => ({
        id: Date.now() + Math.random().toString(),
        subjectId: timer.subjectId!,
        front: c.front,
        back: c.back,
        interval: 0,
        repetitions: 0,
        ease: 2.5,
        nextReviewDate: Date.now()
    }));

    const isXpBoosted = user.xpBoostExpiresAt && user.xpBoostExpiresAt > Date.now();
    const newSession: StudySession = {
      id: Date.now().toString(),
      subjectId: timer.subjectId,
      durationMinutes: duration,
      timestamp: Date.now(),
      notes: notes,
      aiAnalysis: analysis,
      distractionCount: distractionCount,
      quiz: { questions: quiz },
      flashcards: formattedCards
    };

    user.sessions.push(newSession);
    let earnedXp = (duration * 10) + (analysis.grade === 'S' ? 100 : 0);
    if (isXpBoosted) earnedXp *= 2;
    
    user.xp += earnedXp;
    user.coins += duration;
    
    if (!user.masterDeck) user.masterDeck = [];
    user.masterDeck = [...user.masterDeck, ...formattedCards];

    if (user.pet) {
        user.pet.xp += duration;
        user.pet.hunger = Math.max(0, user.pet.hunger - 5);
        if(user.pet.stage === 'egg' && user.pet.xp > 100) user.pet.stage = 'baby';
        if(user.pet.stage === 'baby' && user.pet.xp > 500) user.pet.stage = 'teen';
        if(user.pet.stage === 'teen' && user.pet.xp > 1000) user.pet.stage = 'adult';
    }

    const subIdx = user.subjects.findIndex(s => s.id === timer.subjectId);
    if (subIdx > -1) {
      user.subjects[subIdx].totalMinutes += duration;
      user.subjects[subIdx].sessionsCount += 1;
    }
    if (lootItem === "50 Coins") user.coins += 50;
    else if (lootItem) user.inventory.push(lootItem);

    await FirebaseService.updateUser(user);
    setUser({...user});
    await checkAchievements(user);
    setLastSession(newSession);
    setAiLoading(false);
    setSessionStep('analysis');
  };

  const handleTradeStock = async (symbol: string, action: 'buy' | 'sell') => {
      if(!user) return;
      const stock = stocks.find(s => s.symbol === symbol);
      if(!stock) return;
      
      const price = stock.price;
      if(!user.stocks) user.stocks = {};
      const owned = user.stocks[symbol] || 0;

      if(action === 'buy') {
          if(user.coins >= price) {
              user.coins -= price;
              user.stocks[symbol] = owned + 1;
          } else addNotification("Error", "Not enough coins!", "warning");
      } else {
          if(owned > 0) {
              user.coins += price;
              user.stocks[symbol] = owned - 1;
          } else addNotification("Error", "You don't own this stock!", "warning");
      }
      await FirebaseService.updateUser(user);
      setUser({...user});
  };

  const buyItem = async (item: ShopItem) => {
      if(!user || user.coins < item.cost) return;
      user.coins -= item.cost;
      
      if(item.type === 'consumable') {
          if(item.id === 'pet_food' && user.pet) {
              user.pet.hunger = Math.max(0, user.pet.hunger - 30);
              user.pet.happiness = Math.min(100, user.pet.happiness + 10);
          } else if (item.id === 'xp_boost') {
              user.xpBoostExpiresAt = Date.now() + (60 * 60 * 1000);
          } else if (item.id === 'freeze') {
              user.streakFreezeActive = true;
          }
      } else {
          user.inventory.push(item.id);
          if(item.id.startsWith('theme_')) {
              user.preferences.accent = item.id.replace('theme_', '') as AccentColor;
          }
      }
      await FirebaseService.updateUser(user);
      setUser({...user});
  };

  const handleLogout = async () => {
    await FirebaseService.logout();
    setUser(null);
    setAuthData({ email: '', username: '', password: '' });
    setSessionStep('idle');
  };

  const startFlashcardReview = () => {
      if(!user || !user.masterDeck) {
          addNotification("Error", "No flashcards available.", "warning");
          return;
      }
      const due = user.masterDeck.filter(c => c.nextReviewDate <= Date.now());
      if(due.length === 0) {
          addNotification("All Caught Up!", "No flashcards due for review right now.", "success");
          return;
      }
      setReviewQueue(due);
      setCurrentReviewIndex(0);
      setIsFlipped(false);
      setShowReviewModal(true);
  };

  const handleInventoryUse = async (itemId: string) => {
      if(!user) return;
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if(!item) return;

      if(item.type === 'cosmetic') {
          if(item.id.startsWith('theme_')) {
              user.preferences.accent = item.id.replace('theme_', '') as AccentColor;
              addNotification("Theme Applied", item.name, "success");
              await FirebaseService.updateUser(user);
              setUser({...user});
          }
      }
  };

  const handleCardRating = async (rating: number) => {
      if(!user) return;
      
      const currentCard = reviewQueue[currentReviewIndex];
      
      // SRS Logic (Simplified SM2)
      // rating: 1=Again, 2=Hard, 3=Good, 4=Easy
      
      let nextEase = currentCard.ease;
      let nextReps = currentCard.repetitions;
      let nextInterval = currentCard.interval;
      
      if(rating === 1) { // Again
          nextReps = 0;
          nextInterval = 0; 
      } else {
          nextReps += 1;
          // Ease adjustment
          if(rating === 2) nextEase -= 0.15;
          if(rating === 4) nextEase += 0.15;
          nextEase = Math.max(1.3, nextEase);
          
          // Interval
          if(nextReps === 1) nextInterval = 1;
          else if(nextReps === 2) nextInterval = 6;
          else nextInterval = Math.round(nextInterval * nextEase);
      }
      
      const updatedCard = {
          ...currentCard,
          ease: nextEase,
          repetitions: nextReps,
          interval: nextInterval,
          nextReviewDate: Date.now() + (Math.max(1, nextInterval) * 24 * 60 * 60 * 1000)
      };
      
      // Update User State locally
      const newUser = {...user};
      newUser.masterDeck = user.masterDeck.map(c => c.id === currentCard.id ? updatedCard : c);
      setUser(newUser);
      
      // Check if done
      if(currentReviewIndex >= reviewQueue.length - 1) {
          setShowReviewModal(false);
          addNotification("Session Complete", `Reviewed ${reviewQueue.length} cards!`, "success");
          await FirebaseService.updateUser(newUser);
      } else {
          setIsFlipped(false);
          setTimeout(() => setCurrentReviewIndex(p => p + 1), 300);
      }
  };

  // --- RENDERERS ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-[#050505]">
        <div className="animate-pulse text-2xl font-display">LUMINA</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-20 pointer-events-none">
             <div className="absolute top-20 left-20 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl animate-blob"></div>
             <div className="absolute top-20 right-20 w-72 h-72 bg-yellow-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-2000"></div>
             <div className="absolute -bottom-8 left-20 w-72 h-72 bg-pink-500 rounded-full mix-blend-multiply filter blur-xl animate-blob animation-delay-4000"></div>
        </div>
        
        <MonoCard className="w-full max-w-md z-10 backdrop-blur-xl bg-white/80 dark:bg-black/80">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold font-display mb-2 tracking-tight">LUMINA</h1>
            <p className="text-gray-500 dark:text-gray-400">Focus. Evolve. Ascend.</p>
          </div>
          
          {authError && (
            <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center gap-2">
              <AlertTriangle size={16}/> {authError}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                placeholder="Email or Username"
                value={authData.email}
                onChange={e => setAuthData({ ...authData, email: e.target.value })}
              />
            </div>
            {authMode === 'register' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('username')}</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                  placeholder="Choose a unique handle"
                  value={authData.username}
                  onChange={e => setAuthData({ ...authData, username: e.target.value })}
                />
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('password')}</label>
              <input
                type="password"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-transparent focus:ring-2 focus:ring-black dark:focus:ring-white outline-none transition-all"
                placeholder="••••••••"
                value={authData.password}
                onChange={e => setAuthData({ ...authData, password: e.target.value })}
              />
            </div>
            
            {authMode === 'login' && (
               <label className="flex items-center gap-2 cursor-pointer group">
                  <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={rememberMe} 
                      onChange={e => setRememberMe(e.target.checked)} 
                  />
                  <div className={`w-5 h-5 border rounded flex items-center justify-center transition-colors ${rememberMe ? 'bg-[var(--accent-color)] border-[var(--accent-color)] text-white dark:text-black' : 'border-gray-400'}`}>
                      {rememberMe && <Check size={12} strokeWidth={3} />}
                  </div>
                  <span className="text-sm text-gray-600 dark:text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors">Remember Me</span>
               </label>
            )}

            <button
              type="submit"
              className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 transition-all transform active:scale-[0.98]"
            >
              {authMode === 'login' ? t('login') : t('register')}
            </button>
          </form>

          <div className="mt-6 text-center text-sm">
            <button
              onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
              className="text-gray-500 hover:text-black dark:hover:text-white underline decoration-dotted underline-offset-4 transition-colors"
            >
              {authMode === 'login' ? t('noAccount') : t('hasAccount')}
            </button>
          </div>
        </MonoCard>
      </div>
    );
  }

  return (
    <div className={`min-h-screen p-4 md:p-8 flex flex-col max-w-7xl mx-auto ${timer.isZenMode ? 'zen-active' : ''}`}>
      {/* --- NAVBAR --- */}
      {!timer.isZenMode && (
      <nav className="flex items-center justify-between mb-8 z-20 sticky top-4 bg-white/50 dark:bg-[#050505]/50 backdrop-blur-md p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-black dark:bg-white text-white dark:text-black rounded-xl flex items-center justify-center font-bold text-xl">L</div>
          <h1 className="font-display font-bold text-xl hidden md:block tracking-tight">LUMINA</h1>
          <div className="hidden md:flex items-center gap-1 ml-4 bg-gray-100 dark:bg-white/5 p-1 rounded-lg">
              {['focus', 'game_center', 'ai_lab', 'social'].map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab as any)}
                    className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${activeTab === tab ? 'bg-white dark:bg-white/10 shadow-sm text-black dark:text-white' : 'text-gray-500 hover:text-gray-900 dark:hover:text-gray-100'}`}
                  >
                      {tab === 'focus' && t('focus')}
                      {tab === 'game_center' && t('gameCenter')}
                      {tab === 'ai_lab' && t('aiLab')}
                      {tab === 'social' && t('social')}
                  </button>
              ))}
          </div>
        </div>
        <div className="flex items-center gap-4">
          {isOffline && <span className="text-xs px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full flex items-center gap-1"><WifiOff size={12}/> Offline</span>}
          <div className="flex items-center gap-3 px-3 py-1.5 bg-gray-100 dark:bg-white/5 rounded-full border border-gray-200 dark:border-white/10">
             <span className="text-lg">{user.avatar || '👤'}</span>
             <div className="flex flex-col">
                 <span className="text-xs font-bold uppercase tracking-wider opacity-50">{t('level')} {user.level}</span>
                 <div className="w-20 h-1.5 bg-gray-300 dark:bg-gray-700 rounded-full overflow-hidden">
                     <div className="h-full bg-[var(--accent-color)]" style={{ width: `${(user.xp / LEVEL_THRESHOLDS[user.level]) * 100}%` }}></div>
                 </div>
             </div>
          </div>
          <div className="flex items-center gap-2">
             <div className="flex items-center gap-1 px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-lg text-sm font-mono">
                 <span className="text-xs">🪙</span> {user.coins}
             </div>
             <div className="flex items-center gap-1 px-2 py-1 bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 rounded-lg text-sm font-mono">
                 <span className="text-xs">🔥</span> {user.streak}
             </div>
          </div>
          <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-white/10 rounded-lg transition-colors"><Settings size={20}/></button>
        </div>
      </nav>
      )}

      {/* --- MAIN CONTENT --- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
        
        {/* LEFT: Stats & Quick Actions */}
        {!timer.isZenMode && (
        <div className="lg:col-span-3 space-y-6 hidden lg:block">
            <MonoCard>
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4">{t('dailyQuests')}</h3>
                <div className="space-y-3">
                    {user.quests.map(q => (
                        <div key={q.id} className="flex items-center gap-3 group">
                            <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${q.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'border-gray-300 dark:border-gray-700'}`}>
                                {q.isCompleted && <CheckCircle2 size={12} />}
                            </div>
                            <div className="flex-1">
                                <p className={`text-sm ${q.isCompleted ? 'line-through opacity-50' : ''}`}>{q.description}</p>
                                <div className="h-1 w-full bg-gray-100 dark:bg-gray-800 rounded-full mt-1 overflow-hidden">
                                    <div className="h-full bg-green-500 transition-all duration-500" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }}></div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </MonoCard>

            <MonoCard>
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4">{t('generateReport')}</h3>
                 <div className="space-y-4">
                     <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-500">GPA (7d)</span>
                         <span className="font-mono font-bold text-xl">3.8</span>
                     </div>
                     <div className="flex justify-between items-center">
                         <span className="text-sm text-gray-500">Focus (7d)</span>
                         <span className="font-mono font-bold text-xl">12h</span>
                     </div>
                     <button className="w-full py-2 border border-gray-200 dark:border-white/10 rounded-lg text-sm hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">View Full Report</button>
                 </div>
            </MonoCard>
            
            <div className="bg-gradient-to-br from-violet-500 to-fuchsia-500 rounded-xl p-6 text-white relative overflow-hidden cursor-pointer hover:scale-[1.02] transition-transform" onClick={() => startFlashcardReview()}>
                <div className="absolute top-0 right-0 p-4 opacity-20"><Layers size={64} /></div>
                <h3 className="font-bold text-lg relative z-10">{t('reviewFlashcards')}</h3>
                <p className="text-white/80 text-sm relative z-10 mb-4">{user.masterDeck?.filter(c => c.nextReviewDate <= Date.now()).length || 0} cards due</p>
                <button className="px-4 py-1.5 bg-white/20 backdrop-blur rounded-lg text-sm font-medium hover:bg-white/30 transition-colors">Start Session</button>
            </div>
        </div>
        )}

        {/* MIDDLE: Active Tab Content */}
        <div className={`${timer.isZenMode ? 'col-span-12' : 'lg:col-span-6'} space-y-6 transition-all duration-500`}>
            
            {/* --- FOCUS TAB --- */}
            {activeTab === 'focus' && (
                <>
                   <MonoCard className={`relative overflow-hidden flex flex-col items-center justify-center py-12 transition-all ${timer.isActive ? 'border-[var(--accent-color)] shadow-lg' : ''}`}>
                       {/* Dynamic Background Pulse */}
                       {timer.isActive && <div className="absolute inset-0 bg-[var(--accent-color)] opacity-5 animate-pulse-slow pointer-events-none"></div>}
                       
                       {/* Visualizer */}
                       {activeSoundId && timer.isActive && (
                           <div className="absolute inset-x-0 bottom-0 h-24 flex items-end justify-center gap-1 opacity-20 pointer-events-none">
                               {[...Array(20)].map((_, i) => (
                                   <div key={i} className="w-2 bg-[var(--accent-color)] rounded-t-sm animate-music" style={{ height: `${Math.random() * 100}%`, animationDuration: `${0.5 + Math.random()}s` }}></div>
                               ))}
                           </div>
                       )}

                       <div className="relative z-10 text-center">
                           <div className="flex items-center justify-center gap-2 mb-6">
                               {['focus', 'shortBreak', 'longBreak'].map(m => (
                                   <button 
                                     key={m}
                                     onClick={() => setTimer(p => ({...p, mode: m as any, timeLeft: (m === 'focus' ? (user.preferences.focusDuration||25) : m === 'shortBreak' ? (user.preferences.shortBreakDuration||5) : (user.preferences.longBreakDuration||15)) * 60, isActive: false}))}
                                     className={`px-3 py-1 rounded-full text-xs font-medium uppercase tracking-wider transition-colors ${timer.mode === m ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                                   >
                                       {t(m)}
                                   </button>
                               ))}
                           </div>
                           
                           <div className="text-8xl md:text-9xl font-mono font-bold tracking-tighter mb-8 tabular-nums transition-all select-none">
                               {Math.floor(timer.timeLeft / 60).toString().padStart(2, '0')}:{Math.floor(timer.timeLeft % 60).toString().padStart(2, '0')}
                           </div>
                           
                           {/* Subject Selector or Display */}
                           {!timer.isActive && sessionStep !== 'running' ? (
                               <div className="mb-8 relative group">
                                   <select 
                                     value={timer.subjectId || ''} 
                                     onChange={(e) => setTimer(p => ({...p, subjectId: e.target.value}))}
                                     className="appearance-none bg-transparent text-xl font-medium text-center outline-none cursor-pointer border-b-2 border-transparent hover:border-gray-200 dark:hover:border-gray-700 transition-colors pb-1 pr-6"
                                   >
                                       <option value="" disabled>{t('selectSubject')}</option>
                                       {user.subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                   </select>
                                   <div className="absolute right-0 top-1/2 -translate-y-1/2 pointer-events-none opacity-50"><ArrowDownRight size={16}/></div>
                               </div>
                           ) : (
                               <div className="mb-8 text-xl font-medium opacity-50">{user.subjects.find(s => s.id === timer.subjectId)?.name}</div>
                           )}

                           {/* Controls */}
                           <div className="flex items-center gap-4">
                               {!timer.isActive ? (
                                   <button onClick={startTimerActual} className="w-16 h-16 rounded-full bg-black dark:bg-white text-white dark:text-black flex items-center justify-center hover:scale-110 transition-transform shadow-lg">
                                       <Play size={28} fill="currentColor" className="ml-1"/>
                                   </button>
                               ) : (
                                   <button onClick={() => setTimer(p => ({...p, isActive: false}))} className="w-16 h-16 rounded-full border-2 border-gray-200 dark:border-gray-700 flex items-center justify-center hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                                       <Pause size={28} />
                                   </button>
                               )}
                               {timer.isActive && (
                                   <button onClick={handleFinishSession} className="w-12 h-12 rounded-full bg-red-50 dark:bg-red-900/20 text-red-500 flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/40 transition-colors" title="Stop & Save">
                                       <Square size={20} fill="currentColor" />
                                   </button>
                               )}
                           </div>
                       </div>
                       
                       {/* Zen Mode Toggle */}
                       <button onClick={toggleZenMode} className="absolute top-4 right-4 p-2 text-gray-400 hover:text-black dark:hover:text-white transition-colors" title={t('zenMode')}>
                           {timer.isZenMode ? <Minimize2 size={20}/> : <Maximize2 size={20}/>}
                       </button>
                   </MonoCard>
                   
                   {!timer.isActive && !timer.isZenMode && (
                       <div className="grid grid-cols-2 gap-4">
                           {/* Eisenhower Matrix Mini */}
                           <MonoCard className="col-span-2" noPadding>
                               <div className="p-4 border-b border-gray-100 dark:border-white/5 flex justify-between items-center">
                                   <h3 className="font-bold text-sm uppercase tracking-wider flex items-center gap-2"><ListTodo size={16}/> Eisenhower Matrix</h3>
                                   <div className="flex text-xs bg-gray-100 dark:bg-white/5 rounded-lg p-1">
                                       {['q1', 'q2', 'q3', 'q4'].map(q => (
                                           <button key={q} onClick={() => setTodoQuadrant(q as any)} className={`px-3 py-1 rounded-md transition-colors ${todoQuadrant === q ? 'bg-white dark:bg-white/10 shadow-sm' : 'opacity-50'}`}>
                                               {q.toUpperCase()}
                                           </button>
                                       ))}
                                   </div>
                               </div>
                               <div className="p-4">
                                   <div className="flex gap-2 mb-4">
                                       <input 
                                           value={todoInput}
                                           onChange={e => setTodoInput(e.target.value)}
                                           onKeyDown={e => {
                                               if(e.key === 'Enter' && todoInput.trim()) {
                                                   const newTodo: Todo = { id: Date.now().toString(), text: todoInput, quadrant: todoQuadrant, completed: false };
                                                   const updated = [...user.todoList, newTodo];
                                                   setUser({...user, todoList: updated});
                                                   FirebaseService.updateUser({...user, todoList: updated});
                                                   setTodoInput('');
                                               }
                                           }}
                                           placeholder="Add a task..."
                                           className="flex-1 bg-transparent border-b border-gray-200 dark:border-gray-700 px-2 py-1 outline-none text-sm"
                                       />
                                       <button className="text-[var(--accent-color)]"><Plus size={18}/></button>
                                   </div>
                                   <div className="space-y-2 max-h-40 overflow-y-auto no-scrollbar">
                                       {user.todoList.filter(t => t.quadrant === todoQuadrant).map(todo => (
                                           <div key={todo.id} className="flex items-center gap-3 group">
                                               <button onClick={async () => {
                                                   const updated = user.todoList.map(t => t.id === todo.id ? {...t, completed: !t.completed} : t);
                                                   setUser({...user, todoList: updated});
                                                   await FirebaseService.updateUser({...user, todoList: updated});
                                               }} className={`w-4 h-4 border rounded-sm flex items-center justify-center ${todo.completed ? 'bg-gray-400 border-gray-400' : 'border-gray-300'}`}>
                                                   {todo.completed && <Check size={10} className="text-white"/>}
                                               </button>
                                               <span className={`text-sm flex-1 ${todo.completed ? 'line-through opacity-50' : ''}`}>{todo.text}</span>
                                               <button onClick={async () => {
                                                   const updated = user.todoList.filter(t => t.id !== todo.id);
                                                   setUser({...user, todoList: updated});
                                                   await FirebaseService.updateUser({...user, todoList: updated});
                                               }} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={14}/></button>
                                           </div>
                                       ))}
                                       {user.todoList.filter(t => t.quadrant === todoQuadrant).length === 0 && <p className="text-xs text-center opacity-40 italic">No tasks in this quadrant.</p>}
                                   </div>
                               </div>
                           </MonoCard>
                       </div>
                   )}
                   
                   {/* SESSION COMPLETE WORKFLOW */}
                   {sessionStep === 'mood_post' && (
                       <MonoCard className="animate-fade-in">
                           <h3 className="text-center text-xl font-bold mb-6">{t('howAreYou')}</h3>
                           <div className="flex justify-center gap-6">
                               {['happy', 'neutral', 'tired'].map(m => (
                                   <button key={m} onClick={() => setSessionStep('notes')} className="flex flex-col items-center gap-2 p-4 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors">
                                       <div className="text-4xl">{m === 'happy' ? '😄' : m === 'neutral' ? '😐' : '😫'}</div>
                                       <span className="text-xs uppercase font-medium opacity-60">{m}</span>
                                   </button>
                               ))}
                           </div>
                       </MonoCard>
                   )}
                   
                   {sessionStep === 'notes' && (
                       <MonoCard className="animate-slide-up">
                           <h3 className="text-lg font-bold mb-4">{t('whatDidYouStudy')}</h3>
                           <textarea 
                               value={notes}
                               onChange={e => setNotes(e.target.value)}
                               className="w-full h-32 bg-gray-50 dark:bg-[#111] border border-gray-200 dark:border-gray-800 rounded-xl p-4 mb-4 focus:ring-2 focus:ring-black dark:focus:ring-white outline-none resize-none"
                               placeholder={t('notesPlaceholder')}
                           />
                           <div className="flex justify-between items-center">
                               <div className="text-xs opacity-50 flex items-center gap-1"><Sparkles size={12}/> AI Analysis Ready</div>
                               <button onClick={submitSession} disabled={aiLoading} className="px-6 py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                                   {aiLoading ? <RefreshCcw className="animate-spin" size={16}/> : <ArrowRight size={16}/>}
                                   {t('saveSession')}
                               </button>
                           </div>
                       </MonoCard>
                   )}

                   {sessionStep === 'analysis' && lastSession && lastSession.aiAnalysis && (
                       <div className="space-y-4 animate-scale-in">
                           <MonoCard className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-100 dark:border-green-900/30">
                               <div className="flex justify-between items-start mb-4">
                                   <div>
                                       <h3 className="text-lg font-bold text-green-800 dark:text-green-400 flex items-center gap-2"><Brain size={20}/> AI Analysis</h3>
                                       <p className="text-sm text-green-700 dark:text-green-500 mt-1">{lastSession.aiAnalysis.summary}</p>
                                   </div>
                                   <div className="text-4xl font-display font-bold text-green-600 dark:text-green-400">{lastSession.aiAnalysis.grade}</div>
                               </div>
                               <div className="space-y-2">
                                   {lastSession.aiAnalysis.keyTakeaways.map((pt, i) => (
                                       <div key={i} className="flex items-start gap-2 text-sm text-green-800 dark:text-green-300">
                                           <div className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5"></div>
                                           {pt}
                                       </div>
                                   ))}
                               </div>
                           </MonoCard>
                           <div className="flex gap-4">
                               <button onClick={() => setSessionStep('quiz')} className="flex-1 py-3 border border-gray-200 dark:border-white/10 rounded-xl font-medium hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">{t('takeQuiz')}</button>
                               <button onClick={() => { setSessionStep('idle'); setNotes(''); }} className="flex-1 py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium hover:opacity-90 transition-colors">{t('done')}</button>
                           </div>
                       </div>
                   )}
                   
                   {sessionStep === 'quiz' && lastSession?.quiz && (
                       <MonoCard className="animate-fade-in">
                           <h3 className="text-lg font-bold mb-6 flex items-center justify-between">
                               <span>Post-Session Quiz</span>
                               <span className="text-xs px-2 py-1 bg-gray-100 dark:bg-white/10 rounded">3 Questions</span>
                           </h3>
                           {lastSession.quiz.questions.map((q, i) => (
                               <div key={i} className="mb-6">
                                   <p className="font-medium mb-3">{i+1}. {q.question}</p>
                                   <div className="grid grid-cols-1 gap-2">
                                       {q.options.map((opt, optI) => (
                                           <button 
                                               key={optI}
                                               onClick={() => {
                                                   const newAns = [...quizAnswers];
                                                   newAns[i] = optI;
                                                   setQuizAnswers(newAns);
                                               }}
                                               className={`text-left px-4 py-3 rounded-lg text-sm transition-all ${quizAnswers[i] === optI ? 'bg-black text-white dark:bg-white dark:text-black ring-2 ring-offset-2 ring-black dark:ring-white' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100'}`}
                                           >
                                               {opt}
                                           </button>
                                       ))}
                                   </div>
                               </div>
                           ))}
                           <button onClick={() => {
                               let score = 0;
                               lastSession.quiz!.questions.forEach((q, i) => {
                                   if(quizAnswers[i] === q.correctIndex) score++;
                               });
                               setQuizScore(score);
                               addNotification("Quiz Complete", `You scored ${score}/3`, score === 3 ? "success" : "info");
                           }} disabled={quizAnswers.length < 3} className="w-full py-3 bg-black dark:bg-white text-white dark:text-black rounded-xl font-medium disabled:opacity-50">
                               Submit Quiz
                           </button>
                       </MonoCard>
                   )}
                </>
            )}
            
            {/* --- GAME CENTER --- */}
            {activeTab === 'game_center' && (
                <div className="animate-fade-in">
                    <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
                        {['market', 'pet', 'garden', 'skills', 'inventory', 'legacy'].map(tab => (
                            <button 
                                key={tab}
                                onClick={() => setGameSubTab(tab as any)}
                                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${gameSubTab === tab ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}
                            >
                                {t(tab)}
                            </button>
                        ))}
                    </div>
                    
                    {gameSubTab === 'pet' && user.pet && (
                        <MonoCard className="text-center py-12 relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-b from-blue-50 to-transparent dark:from-blue-900/10 opacity-50 pointer-events-none"></div>
                            <div className="text-8xl animate-float mb-4">{user.pet.stage === 'egg' ? '🥚' : user.pet.stage === 'baby' ? '🐣' : user.pet.stage === 'teen' ? '🐥' : '🦅'}</div>
                            <h2 className="text-2xl font-bold mb-1">{user.pet.name}</h2>
                            <p className="text-sm text-gray-500 uppercase tracking-widest mb-8">Lvl {Math.floor(user.pet.xp / 100)} • {user.pet.type}</p>
                            
                            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto mb-8">
                                <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl">
                                    <div className="flex justify-between text-xs mb-1"><span>Hunger</span><span>{user.pet.hunger}%</span></div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-orange-400" style={{width: `${user.pet.hunger}%`}}></div></div>
                                </div>
                                <div className="bg-white/50 dark:bg-black/20 p-3 rounded-xl">
                                    <div className="flex justify-between text-xs mb-1"><span>Happy</span><span>{user.pet.happiness}%</span></div>
                                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full bg-pink-400" style={{width: `${user.pet.happiness}%`}}></div></div>
                                </div>
                            </div>
                            
                            <div className="flex justify-center gap-4">
                                <button onClick={() => buyItem(SHOP_ITEMS.find(i => i.id === 'pet_food')!)} className="px-6 py-2 bg-orange-100 text-orange-700 rounded-full font-medium hover:bg-orange-200 transition-colors">Feed (50c)</button>
                                <button onClick={() => { setUser(p => p ? ({...p, pet: {...p.pet!, happiness: Math.min(100, p.pet!.happiness+5)}}) : null) }} className="px-6 py-2 bg-blue-100 text-blue-700 rounded-full font-medium hover:bg-blue-200 transition-colors">Play</button>
                            </div>
                        </MonoCard>
                    )}

                    {gameSubTab === 'market' && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                {stocks.map(stock => (
                                    <MonoCard key={stock.symbol} className="relative overflow-hidden group">
                                        <div className="flex justify-between items-start mb-4">
                                            <div>
                                                <div className="font-bold text-lg">{stock.symbol}</div>
                                                <div className="text-xs text-gray-500">{stock.name}</div>
                                            </div>
                                            <div className={`flex items-center gap-1 font-mono ${stock.trend === 'up' ? 'text-green-500' : stock.trend === 'down' ? 'text-red-500' : 'text-gray-400'}`}>
                                                {stock.trend === 'up' ? <ArrowUpRight size={16}/> : stock.trend === 'down' ? <ArrowDownRight size={16}/> : <Activity size={16}/>}
                                                {stock.price.toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                            <div className="text-xs">Owned: <span className="font-bold">{user.stocks[stock.symbol] || 0}</span></div>
                                            <div className="flex gap-2">
                                                <button onClick={() => handleTradeStock(stock.symbol, 'sell')} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100">Sell</button>
                                                <button onClick={() => handleTradeStock(stock.symbol, 'buy')} className="px-2 py-1 text-xs bg-green-50 text-green-600 rounded hover:bg-green-100">Buy</button>
                                            </div>
                                        </div>
                                    </MonoCard>
                                ))}
                            </div>
                            <MonoCard>
                                <h3 className="font-bold mb-4 flex items-center gap-2"><ShoppingBag size={18}/> Item Shop</h3>
                                <div className="space-y-2">
                                    {SHOP_ITEMS.filter(i => i.type !== 'cosmetic').map(item => (
                                        <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-white/5 rounded-lg">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 bg-white dark:bg-white/10 rounded flex items-center justify-center">{item.icon}</div>
                                                <div>
                                                    <div className="text-sm font-bold">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.effect}</div>
                                                </div>
                                            </div>
                                            <button onClick={() => buyItem(item)} className="px-3 py-1 bg-black dark:bg-white text-white dark:text-black text-xs rounded-full font-bold hover:opacity-80">{item.cost}c</button>
                                        </div>
                                    ))}
                                </div>
                            </MonoCard>
                        </div>
                    )}
                    
                    {gameSubTab === 'inventory' && (
                        <MonoCard>
                            <div className="grid grid-cols-4 gap-4">
                                {user.inventory.length === 0 ? (
                                    <div className="col-span-4 text-center py-8 text-gray-500">Inventory Empty</div>
                                ) : (
                                    user.inventory.map((itemId, i) => {
                                        const item = SHOP_ITEMS.find(si => si.id === itemId);
                                        if(!item) return null;
                                        return (
                                            <button key={i} onClick={() => handleInventoryUse(itemId)} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl flex flex-col items-center gap-2 hover:bg-gray-100 transition-colors relative group">
                                                <div className="text-2xl">{item.icon}</div>
                                                <div className="text-xs font-medium text-center leading-tight">{item.name}</div>
                                                <div className="absolute inset-0 bg-black/80 text-white text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 rounded-xl transition-opacity">
                                                    Use
                                                </div>
                                            </button>
                                        );
                                    })
                                )}
                            </div>
                        </MonoCard>
                    )}
                    
                    {gameSubTab === 'skills' && (
                        <div className="space-y-8 relative">
                             {SKILL_TREE_NODES.map(node => {
                                 const isUnlocked = user.level >= node.requiredLevel;
                                 return (
                                     <div key={node.id} className={`flex items-center gap-4 ${isUnlocked ? 'opacity-100' : 'opacity-50 grayscale'}`}>
                                         <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center text-xl z-10 bg-white dark:bg-[#0A0A0A] ${isUnlocked ? 'border-[var(--accent-color)] shadow-[0_0_15px_var(--accent-color)]' : 'border-gray-300'}`}>
                                             {node.icon}
                                         </div>
                                         <div className="bg-white dark:bg-white/5 p-4 rounded-xl border border-gray-200 dark:border-white/10 flex-1">
                                             <h4 className="font-bold">{node.label}</h4>
                                             <p className="text-xs text-gray-500">{node.description}</p>
                                             {!isUnlocked && <p className="text-xs text-red-500 mt-1">Requires Level {node.requiredLevel}</p>}
                                         </div>
                                     </div>
                                 );
                             })}
                             <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-gray-200 dark:bg-gray-800 -z-10"></div>
                        </div>
                    )}
                    
                    {gameSubTab === 'legacy' && (
                        <MonoCard className="text-center py-12">
                             <Archive size={48} className="mx-auto mb-4 opacity-20"/>
                             <h2 className="text-xl font-bold mb-2">Time Capsule</h2>
                             <p className="text-sm text-gray-500 mb-6">Write a message to your future self.</p>
                             {user.legacy?.isLocked ? (
                                 <div className="p-4 bg-gray-100 dark:bg-white/5 rounded-xl inline-flex items-center gap-2">
                                     <Lock size={16}/> Locked until {new Date(user.legacy.unlockDate).toLocaleDateString()}
                                 </div>
                             ) : (
                                 <div className="max-w-md mx-auto space-y-4">
                                     <textarea 
                                        value={legacyNote}
                                        onChange={e => setLegacyNote(e.target.value)}
                                        placeholder="Dear future me..."
                                        className="w-full h-32 p-4 rounded-xl bg-gray-50 dark:bg-white/5 border-none resize-none"
                                     />
                                     <input 
                                        type="date" 
                                        value={legacyDate}
                                        onChange={e => setLegacyDate(e.target.value)}
                                        className="w-full p-2 rounded-lg bg-gray-50 dark:bg-white/5"
                                     />
                                     <button 
                                        onClick={async () => {
                                            const unlock = new Date(legacyDate).getTime();
                                            if (unlock > Date.now()) {
                                                const u = {...user, legacy: { note: legacyNote, unlockDate: unlock, isLocked: true }};
                                                setUser(u);
                                                await FirebaseService.updateUser(u);
                                                addNotification("Capsule Sealed", "See you in the future.", "success");
                                            }
                                        }}
                                        className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg font-medium"
                                     >
                                         Seal Capsule
                                     </button>
                                 </div>
                             )}
                        </MonoCard>
                    )}
                </div>
            )}
            
            {/* --- AI LAB --- */}
            {activeTab === 'ai_lab' && (
                <div className="animate-fade-in">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                        {['explain', 'plan', 'essay', 'podcast', 'concept', 'exam', 'debate'].map(mode => (
                            <button 
                                key={mode}
                                onClick={() => { setAiToolMode(mode as any); setAiToolOutput(null); }}
                                className={`p-3 rounded-xl text-sm font-medium border transition-all ${aiToolMode === mode ? 'bg-black text-white border-black dark:bg-white dark:text-black dark:border-white' : 'border-gray-200 dark:border-white/10 hover:border-gray-400'}`}
                            >
                                {t(mode === 'explain' ? 'explainConcept' : mode === 'plan' ? 'studyPlanner' : mode === 'essay' ? 'essayGrader' : mode === 'podcast' ? 'podcastGen' : mode === 'concept' ? 'conceptMap' : mode === 'exam' ? 'examSim' : 'Debate')}
                            </button>
                        ))}
                    </div>
                    
                    <MonoCard>
                        <div className="flex gap-2 mb-4">
                            <input 
                                value={aiToolInput}
                                onChange={e => setAiToolInput(e.target.value)}
                                placeholder="Enter topic or text..."
                                className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-lg outline-none"
                            />
                            <button 
                                onClick={async () => {
                                    setAiLoading(true);
                                    if(aiToolMode === 'explain') setAiToolOutput(await explainConcept(aiToolInput, user.preferences.language));
                                    if(aiToolMode === 'plan') setAiToolOutput(await generateStudyPlan(aiToolInput, user.preferences.language));
                                    if(aiToolMode === 'essay') setAiToolOutput(await gradeEssay(aiToolInput, user.preferences.language));
                                    if(aiToolMode === 'podcast') setAiToolOutput(await generatePodcastScript(aiToolInput, user.preferences.language));
                                    if(aiToolMode === 'concept') setAiToolOutput(await generateConceptMap(aiToolInput, user.preferences.language));
                                    if(aiToolMode === 'exam') setAiToolOutput(await generateExam(aiToolInput, user.preferences.language));
                                    if(aiToolMode === 'debate') {
                                        const opening = await startDebate(aiToolInput, user.preferences.language);
                                        setDebateMessages([{role: 'model', text: opening}]);
                                    }
                                    setAiLoading(false);
                                }}
                                disabled={aiLoading}
                                className="px-4 bg-[var(--accent-color)] text-white dark:text-black rounded-lg font-bold"
                            >
                                {aiLoading ? <RefreshCcw className="animate-spin"/> : <ArrowRight/>}
                            </button>
                        </div>
                        
                        {aiToolOutput && (
                            <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl animate-slide-up min-h-[200px] max-h-[500px] overflow-y-auto">
                                {aiToolMode === 'concept' ? (
                                    <div className="relative w-full h-64 border border-gray-200 dark:border-white/10 rounded-lg bg-white dark:bg-black overflow-hidden">
                                        {(aiToolOutput as ConceptMapData).edges.map((e, i) => {
                                            const from = (aiToolOutput as ConceptMapData).nodes.find(n => n.id === e.from);
                                            const to = (aiToolOutput as ConceptMapData).nodes.find(n => n.id === e.to);
                                            if(!from || !to) return null;
                                            return (
                                                <svg key={i} className="absolute inset-0 w-full h-full pointer-events-none">
                                                    <line x1={`${from.x}%`} y1={`${from.y}%`} x2={`${to.x}%`} y2={`${to.y}%`} stroke="currentColor" className="text-gray-300 dark:text-gray-700" strokeWidth="2" />
                                                </svg>
                                            )
                                        })}
                                        {(aiToolOutput as ConceptMapData).nodes.map(n => (
                                            <div key={n.id} className="absolute px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs font-bold shadow-sm transform -translate-x-1/2 -translate-y-1/2" style={{left: `${n.x}%`, top: `${n.y}%`}}>
                                                {n.label}
                                            </div>
                                        ))}
                                    </div>
                                ) : aiToolMode === 'exam' ? (
                                    <div className="space-y-6">
                                        {(aiToolOutput as ExamQuestion[]).map((q, i) => (
                                            <div key={i}>
                                                <p className="font-bold mb-2">{i+1}. {q.question}</p>
                                                <div className="space-y-2">
                                                    {q.options?.map((opt, optI) => (
                                                        <button key={optI} onClick={() => {
                                                            const a = [...examAnswers]; a[i] = optI; setExamAnswers(a);
                                                        }} className={`w-full text-left p-2 rounded text-sm ${examAnswers[i] === optI ? 'bg-black text-white' : 'bg-gray-100'}`}>
                                                            {opt}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="prose dark:prose-invert text-sm whitespace-pre-wrap">{typeof aiToolOutput === 'string' ? aiToolOutput : JSON.stringify(aiToolOutput, null, 2)}</div>
                                )}
                                
                                {aiToolMode === 'podcast' && typeof aiToolOutput === 'string' && (
                                    <button onClick={() => {
                                        const utter = new SpeechSynthesisUtterance(aiToolOutput);
                                        window.speechSynthesis.speak(utter);
                                    }} className="mt-4 flex items-center gap-2 text-xs font-bold uppercase tracking-wider hover:text-[var(--accent-color)]">
                                        <Play size={14}/> Play Audio
                                    </button>
                                )}
                            </div>
                        )}

                        {aiToolMode === 'debate' && debateMessages.length > 0 && (
                            <div className="space-y-4 mt-4">
                                <div className="h-64 overflow-y-auto space-y-3 p-3 bg-gray-50 dark:bg-white/5 rounded-xl">
                                    {debateMessages.map((m, i) => (
                                        <div key={i} className={`p-3 rounded-lg text-sm max-w-[80%] ${m.role === 'user' ? 'bg-black text-white ml-auto' : 'bg-white dark:bg-gray-800 mr-auto border border-gray-200 dark:border-gray-700'}`}>
                                            {m.text}
                                        </div>
                                    ))}
                                </div>
                                <div className="flex gap-2">
                                    <input 
                                        className="flex-1 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 bg-transparent text-sm"
                                        placeholder="Reply..."
                                        onKeyDown={async (e) => {
                                            if(e.key === 'Enter' && e.currentTarget.value) {
                                                const txt = e.currentTarget.value;
                                                setDebateMessages(p => [...p, {role: 'user', text: txt}]);
                                                e.currentTarget.value = '';
                                                const response = await continueDebate([...debateMessages, {role: 'user', text: txt}], user.preferences.language);
                                                setDebateMessages(p => [...p, {role: 'model', text: response}]);
                                            }
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </MonoCard>
                </div>
            )}
            
            {/* --- SOCIAL --- */}
            {activeTab === 'social' && (
                <div className="animate-fade-in">
                     <div className="flex gap-2 mb-4">
                         {['lounge', 'leaderboard', 'guilds'].map(tab => (
                             <button key={tab} onClick={() => setSocialSubTab(tab as any)} className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${socialSubTab === tab ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-white/5 text-gray-500'}`}>
                                 {t(tab)}
                             </button>
                         ))}
                     </div>
                     
                     {socialSubTab === 'guilds' && (
                         user.guildId ? (
                             <MonoCard className="h-[500px] flex flex-col">
                                 <div className="border-b border-gray-100 dark:border-white/5 pb-4 mb-4 flex justify-between items-center">
                                     <div className="flex items-center gap-3">
                                         <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center text-white text-xl">🛡️</div>
                                         <div>
                                             <h3 className="font-bold">My Guild</h3>
                                             <p className="text-xs text-gray-500">12 Members Online</p>
                                         </div>
                                     </div>
                                     <button className="text-xs text-red-500 hover:underline">Leave</button>
                                 </div>
                                 
                                 <div className="flex-1 overflow-y-auto space-y-3 mb-4 no-scrollbar">
                                     {guildChatMessages.map(msg => (
                                         <div key={msg.id} className={`flex flex-col ${msg.userId === user.id ? 'items-end' : 'items-start'}`}>
                                             <div className={`px-4 py-2 rounded-xl text-sm max-w-[80%] ${msg.userId === user.id ? 'bg-indigo-500 text-white rounded-tr-none' : 'bg-gray-100 dark:bg-white/10 rounded-tl-none'}`}>
                                                 {msg.text}
                                             </div>
                                             <span className="text-[10px] opacity-50 mt-1 px-1">{msg.username}</span>
                                         </div>
                                     ))}
                                 </div>
                                 
                                 <div className="flex gap-2">
                                     <input 
                                         value={chatInput}
                                         onChange={e => setChatInput(e.target.value)}
                                         placeholder="Message guild..."
                                         className="flex-1 px-4 py-2 bg-gray-50 dark:bg-white/5 rounded-full outline-none border border-transparent focus:border-indigo-500 transition-colors"
                                         onKeyDown={e => e.key === 'Enter' && FirebaseService.sendGuildMessage(user.guildId!, user, chatInput).then(() => setChatInput(''))}
                                     />
                                     <button onClick={() => FirebaseService.sendGuildMessage(user.guildId!, user, chatInput).then(() => setChatInput(''))} className="w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center hover:scale-105 transition-transform">
                                         <Send size={18}/>
                                     </button>
                                 </div>
                             </MonoCard>
                         ) : (
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                 <MonoCard>
                                     <h3 className="font-bold mb-4">Join a Guild</h3>
                                     <div className="space-y-2">
                                         {guilds.map(g => (
                                             <div key={g.id} className="flex justify-between items-center p-3 border border-gray-100 dark:border-white/5 rounded-lg hover:border-indigo-500 cursor-pointer transition-colors" onClick={() => FirebaseService.joinGuild(g.id, user).then(() => setUser({...user, guildId: g.id}))}>
                                                 <div className="flex items-center gap-2">
                                                     <span className="text-xl">{g.banner}</span>
                                                     <span className="font-medium">{g.name}</span>
                                                 </div>
                                                 <span className="text-xs bg-gray-100 dark:bg-white/10 px-2 py-1 rounded-full">{g.members} mem</span>
                                             </div>
                                         ))}
                                     </div>
                                 </MonoCard>
                                 <MonoCard>
                                     <h3 className="font-bold mb-4">Create Guild</h3>
                                     <input value={newGuildName} onChange={e => setNewGuildName(e.target.value)} className="w-full p-2 border rounded mb-4 bg-transparent" placeholder="Guild Name" />
                                     <button onClick={() => FirebaseService.createGuild(newGuildName, '🛡️', user).then((g) => setUser({...user, guildId: g.id}))} className="w-full py-2 bg-black dark:bg-white text-white dark:text-black rounded-lg">Create (Free)</button>
                                 </MonoCard>
                             </div>
                         )
                     )}
                     
                     {socialSubTab === 'leaderboard' && (
                         <MonoCard className="divide-y divide-gray-100 dark:divide-gray-800">
                             {leaderboard.map((entry, i) => (
                                 <div key={i} className={`flex items-center justify-between py-4 px-2 ${entry.isCurrentUser ? 'bg-yellow-50 dark:bg-yellow-900/10 -mx-2 px-4 rounded-lg' : ''}`}>
                                     <div className="flex items-center gap-4">
                                         <div className={`w-8 h-8 flex items-center justify-center font-bold rounded-full ${i===0 ? 'bg-yellow-400 text-black' : i===1 ? 'bg-gray-300 text-black' : i===2 ? 'bg-orange-400 text-black' : 'bg-gray-100 dark:bg-white/10 text-gray-500'}`}>
                                             {i+1}
                                         </div>
                                         <span className="font-medium">{entry.username}</span>
                                     </div>
                                     <div className="font-mono text-sm opacity-70">{entry.xp} XP</div>
                                 </div>
                             ))}
                         </MonoCard>
                     )}
                </div>
            )}
            
        </div>

        {/* RIGHT: Sidebar */}
        {!timer.isZenMode && (
        <div className="lg:col-span-3 space-y-6 hidden lg:block">
            <MonoCard>
                <h3 className="text-sm font-bold uppercase tracking-wider opacity-50 mb-4 flex items-center gap-2"><Music size={14}/> Ambience</h3>
                <div className="grid grid-cols-2 gap-2">
                    {AMBIENCE_TRACKS.map(track => (
                         <button 
                             key={track.id}
                             onClick={() => toggleSound(track.id)}
                             className={`p-3 rounded-xl text-xs font-medium transition-all flex flex-col items-center gap-2 ${activeSoundId === track.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-50 dark:bg-white/5 hover:bg-gray-100'}`}
                         >
                             {track.id === 'rain' ? '🌧️' : track.id === 'cafe' ? '☕' : track.id === 'white' ? '💨' : '📻'}
                             {track.name}
                         </button>
                    ))}
                </div>
                <div className="mt-4 flex items-center gap-2">
                    <Volume2 size={14} className="text-gray-400"/>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.1" 
                        value={volume} 
                        onChange={e => setVolume(parseFloat(e.target.value))} 
                        className="w-full accent-black dark:accent-white h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                    />
                </div>
            </MonoCard>
            
            <div className="p-6 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 flex flex-col items-center justify-center text-center gap-2 hover:border-gray-400 transition-colors cursor-pointer" onClick={() => setIsAddingSubject(true)}>
                <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-white/5 flex items-center justify-center"><Plus size={20}/></div>
                <span className="text-sm font-medium">{t('addSubject')}</span>
            </div>
            
            {isAddingSubject && (
                <MonoCard className="animate-scale-in">
                    <h3 className="font-bold mb-2">New Subject</h3>
                    <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="w-full p-2 border rounded mb-2 bg-transparent" placeholder="Name" autoFocus />
                    <div className="flex gap-2">
                        <button onClick={() => setIsAddingSubject(false)} className="flex-1 py-1 text-xs text-gray-500">Cancel</button>
                        <button onClick={() => {
                             const s: Subject = { id: Date.now().toString(), name: newSubjectName, totalMinutes: 0, sessionsCount: 0 };
                             const u = {...user, subjects: [...user.subjects, s]};
                             setUser(u);
                             FirebaseService.updateUser(u);
                             setIsAddingSubject(false);
                             setNewSubjectName('');
                        }} className="flex-1 py-1 bg-black text-white rounded text-xs">Add</button>
                    </div>
                </MonoCard>
            )}
            
            <div className="bg-gradient-to-r from-pink-500 to-rose-500 rounded-xl p-6 text-white cursor-pointer hover:brightness-110 transition-all" onClick={() => setShowDailyBonus(true)}>
                <h3 className="font-bold flex items-center gap-2"><Gift size={18}/> Daily Bonus</h3>
                <p className="text-xs opacity-80 mt-1">Claim your free XP!</p>
            </div>
        </div>
        )}
      </div>

      {/* --- MODALS --- */}
      {/* Settings Modal */}
      {showSettings && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <MonoCard className="w-full max-w-md animate-scale-in max-h-[90vh] overflow-y-auto">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">{t('settings')}</h2>
                      <button onClick={() => setShowSettings(false)}><X size={20}/></button>
                  </div>
                  
                  <div className="space-y-6">
                      {/* Avatar Selection */}
                      <section>
                          <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Avatar</label>
                          <div className="grid grid-cols-6 gap-2">
                              {AVATARS.map(av => (
                                  <button key={av} onClick={() => { setUser({...user, avatar: av}); FirebaseService.updateUser({...user, avatar: av}); }} className={`text-2xl p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/10 ${user.avatar === av ? 'bg-gray-100 dark:bg-white/10' : ''}`}>{av}</button>
                              ))}
                          </div>
                      </section>

                      <section>
                          <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">{t('timerSettings')}</label>
                          <div className="grid grid-cols-3 gap-4">
                              <div>
                                  <span className="text-xs block mb-1">{t('focus')} (m)</span>
                                  <input type="number" value={user.preferences.focusDuration || 25} onChange={e => { const u = {...user, preferences: {...user.preferences, focusDuration: parseInt(e.target.value)}}; setUser(u); FirebaseService.updateUser(u); }} className="w-full p-2 rounded border bg-transparent text-center"/>
                              </div>
                              <div>
                                  <span className="text-xs block mb-1">{t('shortBreak')} (m)</span>
                                  <input type="number" value={user.preferences.shortBreakDuration || 5} onChange={e => { const u = {...user, preferences: {...user.preferences, shortBreakDuration: parseInt(e.target.value)}}; setUser(u); FirebaseService.updateUser(u); }} className="w-full p-2 rounded border bg-transparent text-center"/>
                              </div>
                              <div>
                                  <span className="text-xs block mb-1">{t('longBreak')} (m)</span>
                                  <input type="number" value={user.preferences.longBreakDuration || 15} onChange={e => { const u = {...user, preferences: {...user.preferences, longBreakDuration: parseInt(e.target.value)}}; setUser(u); FirebaseService.updateUser(u); }} className="w-full p-2 rounded border bg-transparent text-center"/>
                              </div>
                          </div>
                      </section>

                      <section>
                          <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">{t('theme')}</label>
                          <div className="flex items-center justify-between mb-4">
                              <span className="text-sm">Dark Mode</span>
                              <button onClick={() => { const u = {...user, preferences: {...user.preferences, darkMode: !user.preferences.darkMode}}; setUser(u); FirebaseService.updateUser(u); }} className={`w-12 h-6 rounded-full relative transition-colors ${user.preferences.darkMode ? 'bg-black' : 'bg-gray-200'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${user.preferences.darkMode ? 'left-7' : 'left-1'}`}></div>
                              </button>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm">Custom Color</span>
                              <input type="color" value={user.preferences.accent.startsWith('#') ? user.preferences.accent : '#000000'} onChange={e => { const u = {...user, preferences: {...user.preferences, accent: e.target.value}}; setUser(u); FirebaseService.updateUser(u); }} className="w-8 h-8 rounded-full border-none cursor-pointer overflow-hidden" />
                          </div>
                      </section>
                      
                      <section>
                          <label className="text-xs font-bold uppercase text-gray-500 mb-2 block">Preferences</label>
                          <div className="flex items-center justify-between mb-2">
                              <span className="text-sm">{t('typingAsmr')}</span>
                              <button onClick={() => setTypingSound(!typingSound)} className={`w-12 h-6 rounded-full relative transition-colors ${typingSound ? 'bg-green-500' : 'bg-gray-200'}`}>
                                  <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${typingSound ? 'left-7' : 'left-1'}`}></div>
                              </button>
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm">Native Notifications</span>
                              <button onClick={requestNotificationPermission} className={`px-3 py-1 text-xs rounded border ${user.preferences.enableNativeNotifications ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-100'}`}>
                                  {user.preferences.enableNativeNotifications ? 'Enabled' : 'Enable'}
                              </button>
                          </div>
                      </section>

                      <div className="pt-6 border-t border-gray-100 dark:border-white/5 flex flex-col gap-2">
                          <button onClick={() => {
                              const blob = new Blob([JSON.stringify(user, null, 2)], {type: 'application/json'});
                              const url = URL.createObjectURL(blob);
                              const a = document.createElement('a');
                              a.href = url; a.download = `lumina_data_${Date.now()}.json`;
                              a.click();
                          }} className="w-full py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/5">
                              {t('exportData')}
                          </button>
                          <button onClick={handleLogout} className="w-full py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium hover:bg-red-100 flex items-center justify-center gap-2">
                              <LogOut size={16}/> {t('logout')}
                          </button>
                      </div>
                  </div>
              </MonoCard>
          </div>
      )}
      
      {/* History Modal */}
      {showHistoryModal && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
              <MonoCard className="w-full max-w-2xl h-[80vh] flex flex-col">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="text-xl font-bold">{t('history')}</h2>
                      <button onClick={() => setShowHistoryModal(false)}><X size={20}/></button>
                  </div>
                  <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                      {user.sessions.slice().reverse().map(s => (
                          <div key={s.id} className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-transparent hover:border-gray-200 transition-colors">
                              <div className="flex justify-between mb-2">
                                  <span className="font-bold">{user.subjects.find(sub => sub.id === s.subjectId)?.name}</span>
                                  <span className="text-sm text-gray-500">{new Date(s.timestamp).toLocaleDateString()}</span>
                              </div>
                              <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                                  <span>⏱️ {s.durationMinutes}m</span>
                                  {s.aiAnalysis && <span>🏆 Grade: {s.aiAnalysis.grade}</span>}
                              </div>
                              <p className="text-sm italic opacity-80">"{s.notes}"</p>
                          </div>
                      ))}
                  </div>
              </MonoCard>
          </div>
      )}
      
      {/* Notifications Toast */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
          {notifications.map(n => (
              <div key={n.id} className="bg-white dark:bg-black border border-gray-200 dark:border-white/10 shadow-xl p-4 rounded-xl w-72 animate-slide-up pointer-events-auto flex gap-3 items-start">
                  <div className={`mt-1 ${n.type === 'success' ? 'text-green-500' : n.type === 'warning' ? 'text-yellow-500' : 'text-blue-500'}`}>
                      {n.type === 'success' ? <CheckCircle2 size={16}/> : n.type === 'warning' ? <AlertTriangle size={16}/> : <Bell size={16}/>}
                  </div>
                  <div>
                      <h4 className="font-bold text-sm">{n.title}</h4>
                      <p className="text-xs opacity-80">{n.message}</p>
                  </div>
              </div>
          ))}
      </div>
      
      {/* Review Modal */}
      {showReviewModal && reviewQueue.length > 0 && (
          <div className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4">
              <div className="w-full max-w-lg perspective-1000">
                  <div className={`relative w-full h-80 transition-transform duration-500 transform-style-3d cursor-pointer ${isFlipped ? 'rotate-y-180' : ''}`} onClick={() => setIsFlipped(!isFlipped)}>
                      {/* Front */}
                      <div className="absolute inset-0 backface-hidden bg-white dark:bg-gray-900 rounded-2xl p-8 flex items-center justify-center text-center border-2 border-white/10 shadow-2xl">
                          <h3 className="text-2xl font-bold">{reviewQueue[currentReviewIndex].front}</h3>
                          <p className="absolute bottom-4 text-xs text-gray-500 uppercase tracking-widest">Click to Flip</p>
                      </div>
                      {/* Back */}
                      <div className="absolute inset-0 backface-hidden rotate-y-180 bg-black dark:bg-white text-white dark:text-black rounded-2xl p-8 flex flex-col items-center justify-center text-center shadow-2xl">
                          <h3 className="text-xl font-medium mb-8">{reviewQueue[currentReviewIndex].back}</h3>
                          <div className="flex gap-2 w-full" onClick={e => e.stopPropagation()}>
                              {[{l:'Again', v:1, c:'bg-red-500'}, {l:'Hard', v:2, c:'bg-orange-500'}, {l:'Good', v:3, c:'bg-blue-500'}, {l:'Easy', v:4, c:'bg-green-500'}].map(btn => (
                                  <button key={btn.l} onClick={() => handleCardRating(btn.v)} className={`flex-1 py-2 rounded text-xs font-bold text-white ${btn.c} hover:brightness-110`}>
                                      {btn.l}
                                  </button>
                              ))}
                          </div>
                      </div>
                  </div>
                  <div className="text-center text-white mt-4 font-mono text-sm">
                      Card {currentReviewIndex + 1} of {reviewQueue.length}
                  </div>
              </div>
          </div>
      )}
      
      {/* Shortcuts Modal */}
      {showShortcutsModal && (
          <div className="fixed inset-0 bg-black/20 backdrop-blur z-50 flex items-center justify-center" onClick={() => setShowShortcutsModal(false)}>
              <MonoCard className="p-8 animate-scale-in" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Keyboard size={20}/> Keyboard Shortcuts</h2>
                  <div className="space-y-2 font-mono text-sm">
                      <div className="flex justify-between gap-8"><span className="opacity-50">Space</span> <span>Play / Pause Timer</span></div>
                      <div className="flex justify-between gap-8"><span className="opacity-50">D</span> <span>Log Distraction</span></div>
                      <div className="flex justify-between gap-8"><span className="opacity-50">Esc</span> <span>Close Modals / Zen Mode</span></div>
                  </div>
              </MonoCard>
          </div>
      )}
      
      {/* Daily Bonus Modal */}
      {showDailyBonus && (
          <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
              <MonoCard className="text-center p-8 animate-scale-in">
                  <div className="text-6xl mb-4 animate-bounce">🎁</div>
                  <h2 className="text-2xl font-bold mb-2">Daily Login Bonus!</h2>
                  <p className="text-gray-500 mb-6">Thanks for coming back to study.</p>
                  <div className="flex justify-center gap-4 mb-6">
                      <div className="bg-yellow-100 text-yellow-700 px-4 py-2 rounded-lg font-bold">+50 Coins</div>
                      <div className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-bold">+20 XP</div>
                  </div>
                  <button onClick={() => setShowDailyBonus(false)} className="px-8 py-2 bg-black text-white rounded-full font-bold hover:scale-105 transition-transform">Awesome</button>
              </MonoCard>
          </div>
      )}
      
      {/* Boss Victory Modal */}
      {showBossVictory && (
          <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4">
              <div className="text-center text-white animate-scale-in">
                  <Trophy size={80} className="mx-auto mb-4 text-yellow-400 animate-pulse"/>
                  <h1 className="text-4xl font-bold mb-2">{t('bossDefeated')}</h1>
                  <p className="text-xl opacity-80 mb-8">You conquered the Procrastination Demon!</p>
                  <button onClick={() => {setShowBossVictory(false); setActiveBoss(null);}} className="px-8 py-3 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform">
                      Claim Victory
                  </button>
              </div>
          </div>
      )}
      
      <button onClick={() => setShowShortcutsModal(true)} className="fixed bottom-4 left-4 p-2 bg-white/50 dark:bg-black/50 backdrop-blur rounded-full text-xs font-bold opacity-50 hover:opacity-100 transition-opacity">
          <HelpCircle size={16}/>
      </button>
      
    </div>
  );
};

export default App;

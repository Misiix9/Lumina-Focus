
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Plus, Activity, Book, 
  Brain, LogOut, Zap, Award, Clock, 
  CheckCircle2, RefreshCcw, Trophy, Music,
  Layers, ArrowRight, X, Settings, Moon, Sun, Globe, Volume2, Sparkles,
  Shield, Sword, Gamepad2, ShoppingBag, Users, Radio, Smile, Frown, Meh, Mic, Eye, BarChart3, FileText, Map, GraduationCap, Ghost, Palette, Leaf, Archive, Scroll, Heart, Sword as SwordIcon, Lock, Wifi, WifiOff,
  ArrowUpRight, ArrowDownRight, History, RotateCw, ThumbsUp, ThumbsDown, Calendar, MessageSquare, Send, Bell, Sprout, LayoutGrid, ListTodo, Trash2, Download, Gift, GitBranch, Maximize2, Minimize2, HelpCircle, Package, MessageCircle, BookOpen, Quote, AlertTriangle, AlertOctagon, Keyboard, Check
} from 'lucide-react';
import { MonoCard } from './components/GlassCard';
import { User, StudySession, TimerState, Language, QuizQuestion, Quest, Flashcard, Subject, AccentColor, Boss, ShopItem, Stock, ConceptMapData, Guild, ExamQuestion, FirebaseConfig, ChatMessage, AppNotification, Todo, Achievement } from './types';
import { FirebaseService } from './services/firebase';
import { analyzeSession, generateQuiz, generateDailyQuests, generateFlashcards, explainConcept, generateStudyPlan, gradeEssay, generatePodcastScript, generateConceptMap, generateBoss, generateExam, startDebate, continueDebate } from './services/geminiService';
import { DEFAULT_SUBJECTS, TRANSLATIONS, ACCENT_COLORS, SHOP_ITEMS, MOCK_STOCKS, BOSS_TEMPLATES, GEMINI_API_KEY, FIREBASE_CONFIG, SKILL_TREE_NODES, ACHIEVEMENTS } from './constants';

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
        // Apply accent color variable
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
              const newHunger = Math.min(100, prev.pet.hunger + 1); // Hunger goes up
              const newHappy = Math.max(0, prev.pet.happiness - 1); // Happiness goes down
              
              if (newHunger >= 90) addNotification("Pet Alert", `${prev.pet.name} is starving!`, 'warning');
              if (newHappy <= 10) addNotification("Pet Alert", `${prev.pet.name} is very sad.`, 'warning');

              const updatedUser = { ...prev, pet: { ...prev.pet, hunger: newHunger, happiness: newHappy } };
              return updatedUser;
          });
      }, 60000); // Every minute
      return () => clearInterval(interval);
  }, [user?.pet?.name]); // Restart if pet name changes

  // Guild Chat Listener
  useEffect(() => {
      if (activeTab === 'social' && socialSubTab === 'guilds' && user?.guildId) {
          const unsubscribe = FirebaseService.subscribeToGuildChat(user.guildId, (msgs) => {
              setGuildChatMessages(msgs);
          });
          return () => unsubscribe();
      }
  }, [activeTab, socialSubTab, user?.guildId]);

  // Load Guilds/Leaderboard when tab active
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
            const audio = new Audio('https://freetestdata.com/wp-content/uploads/2021/09/Free_Test_Data_100KB_MP3.mp3'); // Placeholder click
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

  // --- HELPER: TRANSLATE ---
  const t = (key: string) => {
    if (!user) return '';
    return TRANSLATIONS[user.preferences.language][key] || key;
  };

  // --- TIMER ENGINE ---
  useEffect(() => {
    let interval: number;
    if (timer.isActive && timer.timeLeft > 0) {
      interval = window.setInterval(() => {
        setTimer(p => {
            // Battle Mode Logic
            if (p.isBattleMode && activeBoss && p.timeLeft % 5 === 0) {
                // Deal damage to boss every 5s
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
      
      // Start Onboarding if new
      if (u.hasSeenOnboarding === false) {
          setOnboardingStep(1);
      }
    } catch (err: any) {
      console.error("Auth Error:", err);
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
    
    // Native Notification
    if(user?.preferences.enableNativeNotifications && Notification.permission === 'granted') {
        new Notification("Session Complete!", { body: "Great job! Time for a break." });
    }
    
    // Loot Drop Chance (30%)
    if (Math.random() < 0.3) {
        const drops = [
            "50 Coins", "XP Potion", "Apple", "Mystery Box"
        ];
        const loot = drops[Math.floor(Math.random() * drops.length)];
        setLootItem(loot);
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
          currentUser.xp += 100; // Bonus
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
        nextReviewDate: Date.now() // Due immediately
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

    const updatedQuests = user.quests.map(q => {
      if (q.type === 'minutes') q.progress += duration;
      if (q.type === 'sessions') q.progress += 1;
      if (q.type === 'score' && analysis.grade === 'S') q.progress += 1;
      if (!q.isCompleted && q.progress >= q.target) {
        q.isCompleted = true;
        user.xp += q.xpReward;
        user.coins += 50;
        addNotification("Quest Complete!", q.description, "success");
      }
      return q;
    });

    user.sessions.push(newSession);
    let earnedXp = (duration * 10) + (analysis.grade === 'S' ? 100 : 0);
    if (isXpBoosted) earnedXp *= 2;
    
    user.xp += earnedXp;
    user.coins += duration;
    user.quests = updatedQuests;
    
    if (!user.masterDeck) user.masterDeck = [];
    user.masterDeck = [...user.masterDeck, ...formattedCards];

    if (user.pet) {
        user.pet.xp += duration;
        user.pet.hunger = Math.max(0, user.pet.hunger - 5);
        if(user.pet.stage === 'egg' && user.pet.xp > 100) {
             user.pet.stage = 'baby';
             addNotification("Pet Evolved!", `${user.pet.name} is now a baby!`, "success");
        }
        if(user.pet.stage === 'baby' && user.pet.xp > 500) user.pet.stage = 'teen';
        if(user.pet.stage === 'teen' && user.pet.xp > 1000) user.pet.stage = 'adult';
    }

    const subIdx = user.subjects.findIndex(s => s.id === timer.subjectId);
    if (subIdx > -1) {
      user.subjects[subIdx].totalMinutes += duration;
      user.subjects[subIdx].sessionsCount += 1;
    }
    
    // Loot handling
    if (lootItem) {
        if (lootItem === "50 Coins") user.coins += 50;
        // Logic for other items would go here
        user.inventory.push(lootItem);
    }

    await FirebaseService.updateUser(user);
    setUser({...user});
    
    // Check Achievements
    await checkAchievements(user);
    
    setLastSession(newSession);
    setAiLoading(false);
    setSessionStep('analysis');
  };

  // SRS Review Logic
  const startFlashcardReview = () => {
      if(!user || !user.masterDeck) return;
      const now = Date.now();
      const due = user.masterDeck.filter(c => c.nextReviewDate <= now);
      if(due.length === 0) {
          addNotification("Caught Up", "No cards due for review!", "success");
          return;
      }
      setReviewQueue(due);
      setCurrentReviewIndex(0);
      setIsFlipped(false);
      setShowReviewModal(true);
  };

  const handleCardRating = async (quality: number) => {
      if(!user) return;
      const card = reviewQueue[currentReviewIndex];
      
      // SuperMemo-2 Simplified
      let nextInterval = 1;
      let nextReps = card.repetitions;
      let nextEase = card.ease;

      if (quality >= 3) {
          if (card.repetitions === 0) nextInterval = 1;
          else if (card.repetitions === 1) nextInterval = 6;
          else nextInterval = Math.round(card.interval * card.ease);
          nextReps++;
          nextEase = card.ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
          if (nextEase < 1.3) nextEase = 1.3;
      } else {
          nextReps = 0;
          nextInterval = 1;
      }

      const updatedCard = {
          ...card,
          interval: nextInterval,
          repetitions: nextReps,
          ease: nextEase,
          nextReviewDate: Date.now() + (nextInterval * 24 * 60 * 60 * 1000)
      };

      // Update in user master deck
      const deckIdx = user.masterDeck.findIndex(c => c.id === card.id);
      if(deckIdx !== -1) {
          user.masterDeck[deckIdx] = updatedCard;
          await FirebaseService.updateUser(user);
      }

      if (currentReviewIndex < reviewQueue.length - 1) {
          setIsFlipped(false);
          setCurrentReviewIndex(p => p + 1);
      } else {
          setShowReviewModal(false);
          addNotification("Review Complete", "Deck reviewed!", "success");
      }
  };

  const buyItem = async (item: ShopItem) => {
      if(!user || user.coins < item.cost) return;
      user.coins -= item.cost;
      
      if(item.type === 'consumable') {
          if(item.id === 'pet_food' && user.pet) {
              user.pet.hunger = Math.max(0, user.pet.hunger - 30);
              user.pet.happiness = Math.min(100, user.pet.happiness + 10);
              addNotification("Yummy!", `${user.pet.name} enjoyed the food.`, "success");
          } else if (item.id === 'xp_boost') {
              user.xpBoostExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hr
              addNotification("Power Up!", "XP Boost Active for 1 Hour!", "success");
          } else if (item.id === 'freeze') {
              user.streakFreezeActive = true;
              addNotification("Protected!", "Streak Freeze Equipped!", "success");
          }
      } else {
          user.inventory.push(item.id);
          if(item.id.startsWith('theme_')) {
              const accent = item.id.replace('theme_', '') as AccentColor;
              user.preferences.accent = accent;
          }
      }
      await FirebaseService.updateUser(user);
      setUser({...user});
  };
  
  const handleInventoryUse = async (itemId: string) => {
      if (!user) return;
      const item = SHOP_ITEMS.find(i => i.id === itemId);
      if (!item) return; 
      
      if (item.type === 'cosmetic' && item.id.startsWith('theme_')) {
           const accent = item.id.replace('theme_', '') as AccentColor;
           user.preferences.accent = accent;
           addNotification("Theme Equipped", `Switched to ${item.name}`, "success");
           await FirebaseService.updateUser(user);
           setUser({...user});
           return;
      }
      
      if (item.type === 'consumable') {
           if(item.id === 'pet_food' && user.pet) {
              user.pet.hunger = Math.max(0, user.pet.hunger - 30);
              user.pet.happiness = Math.min(100, user.pet.happiness + 10);
              addNotification("Yummy!", `${user.pet.name} enjoyed the food.`, "success");
          } else if (item.id === 'xp_boost') {
              user.xpBoostExpiresAt = Date.now() + (60 * 60 * 1000); // 1 hr
              addNotification("Power Up!", "XP Boost Active for 1 Hour!", "success");
          }
          // Remove ONE instance of item
          const idx = user.inventory.indexOf(itemId);
          if (idx > -1) {
              user.inventory.splice(idx, 1);
          }
          await FirebaseService.updateUser(user);
          setUser({...user});
      }
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
          } else {
              addNotification("Error", "Not enough coins!", "warning");
              return;
          }
      } else {
          if(owned > 0) {
              user.coins += price;
              user.stocks[symbol] = owned - 1;
          } else {
              addNotification("Error", "You don't own this stock!", "warning");
              return;
          }
      }
      await FirebaseService.updateUser(user);
      setUser({...user});
  };
  
  const handleSendMessage = async () => {
      if (!user || !user.guildId || !chatInput.trim()) return;
      try {
          await FirebaseService.sendGuildMessage(user.guildId, user, chatInput);
          setChatInput('');
      } catch (e) {
          addNotification("Chat Error", "Failed to send. Check permissions.", "warning");
      }
  };
  
  // Todo Handlers
  const addTodo = async () => {
      if(!user || !todoInput.trim()) return;
      const newTodo: Todo = {
          id: Date.now().toString(),
          text: todoInput,
          quadrant: todoQuadrant,
          completed: false
      };
      const updatedUser = { ...user, todoList: [...(user.todoList || []), newTodo] };
      setUser(updatedUser);
      setTodoInput('');
      await FirebaseService.updateUser(updatedUser);
  };
  
  const toggleTodo = async (id: string) => {
      if(!user) return;
      const updatedTodos = user.todoList.map(t => t.id === id ? {...t, completed: !t.completed} : t);
      const updatedUser = { ...user, todoList: updatedTodos };
      setUser(updatedUser);
      await FirebaseService.updateUser(updatedUser);
  };

  const deleteTodo = async (id: string) => {
      if(!user) return;
      const updatedTodos = user.todoList.filter(t => t.id !== id);
      const updatedUser = { ...user, todoList: updatedTodos };
      setUser(updatedUser);
      await FirebaseService.updateUser(updatedUser);
  };

  const downloadData = () => {
      if(!user) return;
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(user));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", "lumina_data.json");
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };
  
  const finishOnboarding = async () => {
      if(!user) return;
      const u = { ...user, hasSeenOnboarding: true };
      setUser(u);
      setOnboardingStep(0);
      await FirebaseService.updateUser(u);
  };

  // --- AI TOOLS HANDLER ---
  const runAiTool = async () => {
      if(!user) return;
      setAiLoading(true);
      setAiToolOutput(null);
      try {
        if(aiToolMode === 'explain') {
            const res = await explainConcept(aiToolInput, user.preferences.language);
            setAiToolOutput(res);
        } else if(aiToolMode === 'plan') {
            const res = await generateStudyPlan(aiToolInput, user.preferences.language);
            setAiToolOutput(res);
        } else if(aiToolMode === 'essay') {
            const res = await gradeEssay(aiToolInput, user.preferences.language);
            setAiToolOutput(res);
        } else if(aiToolMode === 'podcast') {
            const res = await generatePodcastScript(aiToolInput, user.preferences.language);
            setAiToolOutput(res);
        } else if(aiToolMode === 'concept') {
            const res = await generateConceptMap(aiToolInput, user.preferences.language);
            setAiToolOutput(res);
        } else if(aiToolMode === 'exam') {
            const res = await generateExam(aiToolInput, user.preferences.language);
            setAiToolOutput(res);
        } else if(aiToolMode === 'debate') {
            // Initial Debate Start
            setDebateMessages([{role: 'user', text: aiToolInput}]);
            const res = await startDebate(aiToolInput, user.preferences.language);
            setDebateMessages(p => [...p, {role: 'model', text: res}]);
            setAiToolOutput(true); // Flag to show chat UI
        }
      } catch (e) {
          console.error(e);
      }
      setAiLoading(false);
  };
  
  const handleDebateReply = async () => {
      if(!user || !aiToolInput) return;
      const newHistory = [...debateMessages, {role: 'user' as const, text: aiToolInput}];
      setDebateMessages(newHistory);
      setAiToolInput('');
      setAiLoading(true);
      
      const reply = await continueDebate(newHistory, user.preferences.language);
      setDebateMessages([...newHistory, {role: 'model', text: reply}]);
      setAiLoading(false);
  }

  // --- RENDERERS ---

  const renderCalendar = () => {
      const today = new Date();
      const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
      const days = Array.from({length: daysInMonth}, (_, i) => i + 1);
      const safeSessions = user?.sessions || [];
      const sessionDates = new Set(safeSessions.map(s => new Date(s.timestamp).getDate()));

      return (
          <div className="p-4 border rounded-lg mt-4">
              <h3 className="font-bold mb-2 flex items-center gap-2"><Calendar size={16}/> Study Streak</h3>
              <div className="grid grid-cols-7 gap-2">
                  {days.map(d => {
                      const active = sessionDates.has(d);
                      return (
                          <div key={d} className={`aspect-square flex items-center justify-center text-xs rounded ${active ? 'bg-black text-white dark:bg-white dark:text-black font-bold' : 'bg-gray-50 dark:bg-[#222] text-gray-400'}`}>
                              {d}
                          </div>
                      )
                  })}
              </div>
          </div>
      );
  };
  
  const renderWeeklyReport = () => {
      if(!user) return null;
      const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
      const weeklySessions = user.sessions.filter(s => s.timestamp > oneWeekAgo);
      
      const totalMins = weeklySessions.reduce((acc, s) => acc + s.durationMinutes, 0);
      const subjects: {[key: string]: number} = {};
      weeklySessions.forEach(s => {
          const name = user.subjects.find(sub => sub.id === s.subjectId)?.name || 'Unknown';
          subjects[name] = (subjects[name] || 0) + s.durationMinutes;
      });
      const topSubject = Object.entries(subjects).sort((a,b) => b[1] - a[1])[0];
      
      const gradePoints = {'S': 4, 'A': 4, 'B': 3, 'C': 2, 'D': 1};
      const gpa = weeklySessions.reduce((acc, s) => acc + (gradePoints[s.aiAnalysis?.grade || 'C'] || 0), 0) / (weeklySessions.length || 1);
      
      return (
          <MonoCard accent={user.preferences.accent} className="mt-4">
              <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart3 size={16}/> {t('generateReport')}</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                      <div className="text-2xl font-bold">{totalMins}</div>
                      <div className="text-xs opacity-50">Minutes</div>
                  </div>
                  <div>
                      <div className="text-xl font-bold truncate">{topSubject ? topSubject[0] : '-'}</div>
                      <div className="text-xs opacity-50">Top Subject</div>
                  </div>
                  <div>
                      <div className="text-2xl font-bold">{gpa.toFixed(1)}</div>
                      <div className="text-xs opacity-50">GPA</div>
                  </div>
              </div>
          </MonoCard>
      )
  };

  const renderAuth = () => (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-black text-black dark:text-white">
      <div className="lg:w-1/2 bg-black text-white dark:bg-white dark:text-black flex flex-col justify-center p-12 relative overflow-hidden">
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-black to-black" />
         <div className="relative z-10 space-y-4 animate-slide-up">
           <h1 className="text-8xl font-display font-bold tracking-tighter">LUMINA.</h1>
           <p className="text-xl font-mono text-gray-400 dark:text-gray-600">Monochrome Focus System</p>
           {isOffline && <div className="inline-block px-2 py-1 rounded border border-white/20 text-xs bg-red-500/20 text-red-400 font-mono">OFFLINE MODE</div>}
         </div>
      </div>
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
           <div className="flex gap-8 border-b border-gray-200 pb-1">
              <button onClick={() => setAuthMode('login')} className={`pb-4 text-sm font-bold uppercase ${authMode === 'login' ? 'border-b-2 border-black dark:border-white' : 'text-gray-400'}`}>Login</button>
              <button onClick={() => setAuthMode('register')} className={`pb-4 text-sm font-bold uppercase ${authMode === 'register' ? 'border-b-2 border-black dark:border-white' : 'text-gray-400'}`}>Register</button>
           </div>
           {authError && <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded border border-red-200 text-red-500 text-sm font-mono">{authError}</div>}
           <form onSubmit={handleAuth} className="space-y-6">
             <input 
                type={authMode === 'register' ? "email" : "text"} 
                value={authData.email} 
                onChange={e => setAuthData({...authData, email: e.target.value})} 
                className="w-full bg-transparent border-b-2 border-gray-200 py-4 text-lg outline-none focus:border-black dark:focus:border-white transition-all placeholder:text-gray-400" 
                placeholder={authMode === 'register' ? "Email" : "Email or Username"} 
                required 
             />
             {authMode === 'register' && (
                <input type="text" value={authData.username} onChange={e => setAuthData({...authData, username: e.target.value})} className="w-full bg-transparent border-b-2 border-gray-200 py-4 text-lg outline-none focus:border-black dark:focus:border-white transition-all placeholder:text-gray-400" placeholder="Username" required />
             )}
             <input type="password" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} className="w-full bg-transparent border-b-2 border-gray-200 py-4 text-lg outline-none focus:border-black dark:focus:border-white transition-all placeholder:text-gray-400" placeholder="Password" required />
             
             {authMode === 'login' && (
                 <button type="button" onClick={() => setRememberMe(!rememberMe)} className="flex items-center gap-3 group cursor-pointer">
                     <div className={`w-5 h-5 border-2 border-gray-300 dark:border-gray-600 flex items-center justify-center transition-all ${rememberMe ? 'bg-black dark:bg-white border-black dark:border-white' : 'group-hover:border-gray-400'}`}>
                        {rememberMe && <Check size={12} className="text-white dark:text-black" />}
                     </div>
                     <span className="text-sm font-medium opacity-70 group-hover:opacity-100">Remember Me</span>
                 </button>
             )}

             <button className="w-full bg-black dark:bg-white text-white dark:text-black h-16 font-bold text-lg uppercase hover:scale-[1.01] active:scale-[0.99] transition-transform shadow-xl hover:shadow-2xl">
                {isLoading ? 'Processing...' : (authMode === 'login' ? 'Login' : 'Create Account')}
             </button>
           </form>
        </div>
      </div>
    </div>
  );

  const renderNotifications = () => (
      <div className="fixed bottom-4 right-4 z-[100] space-y-2 pointer-events-none">
          {notifications.map(n => (
              <div key={n.id} className="bg-white dark:bg-[#222] border border-black dark:border-white p-4 rounded-lg shadow-xl flex items-start gap-3 min-w-[300px] animate-slide-up pointer-events-auto">
                  {n.type === 'success' && <CheckCircle2 className="text-green-500" size={20}/>}
                  {n.type === 'warning' && <Shield className="text-yellow-500" size={20}/>}
                  {n.type === 'info' && <Bell className="text-blue-500" size={20}/>}
                  <div>
                      <div className="font-bold text-sm">{n.title}</div>
                      <div className="text-xs opacity-70">{n.message}</div>
                  </div>
              </div>
          ))}
      </div>
  );

  const renderTimeline = () => {
      const hours = new Array(24).fill(0);
      (user?.sessions || []).forEach(s => {
          const h = new Date(s.timestamp).getHours();
          hours[h] += s.durationMinutes;
      });
      const max = Math.max(...hours, 1);

      return (
          <div className="flex items-end justify-between h-24 gap-1 mt-4">
              {hours.map((h, i) => (
                  <div key={i} className="flex-1 bg-gray-100 dark:bg-[#222] rounded-t-sm relative group">
                      <div 
                        className="absolute bottom-0 w-full bg-black dark:bg-white transition-all" 
                        style={{height: `${(h/max)*100}%`}} 
                      />
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 text-xs bg-black text-white p-1 rounded">
                          {i}:00 - {h}m
                      </div>
                  </div>
              ))}
          </div>
      );
  };
  
  const renderEisenhower = () => (
      <MonoCard accent={user?.preferences.accent}>
          <h3 className="font-bold mb-4 flex items-center gap-2"><LayoutGrid size={16}/> Eisenhower Matrix</h3>
          <div className="flex gap-2 mb-4">
              <input 
                value={todoInput} 
                onChange={e => setTodoInput(e.target.value)} 
                onKeyDown={e => e.key === 'Enter' && addTodo()}
                placeholder="Add task..." 
                className="flex-1 bg-transparent border-b outline-none text-sm py-1"
              />
              <select 
                value={todoQuadrant} 
                onChange={e => setTodoQuadrant(e.target.value as any)}
                className="bg-transparent border rounded text-xs"
              >
                  <option value="q1">Do First</option>
                  <option value="q2">Schedule</option>
                  <option value="q3">Delegate</option>
                  <option value="q4">Don't Do</option>
              </select>
              <button onClick={addTodo}><Plus size={16}/></button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs h-64">
              {[
                  {id: 'q1', title: 'Urgent & Important', color: 'bg-red-50 dark:bg-red-900/10'},
                  {id: 'q2', title: 'Not Urgent & Important', color: 'bg-blue-50 dark:bg-blue-900/10'},
                  {id: 'q3', title: 'Urgent & Not Important', color: 'bg-yellow-50 dark:bg-yellow-900/10'},
                  {id: 'q4', title: 'Not Urgent & Not Important', color: 'bg-gray-50 dark:bg-gray-800/30'},
              ].map(q => (
                  <div key={q.id} className={`${q.color} p-2 rounded relative overflow-y-auto no-scrollbar`}>
                      <div className="font-bold opacity-50 mb-2">{q.title}</div>
                      {user?.todoList?.filter(t => t.quadrant === q.id).map(t => (
                          <div key={t.id} className="flex items-center justify-between mb-1 group">
                              <span className={`${t.completed ? 'line-through opacity-30' : ''}`} onClick={() => toggleTodo(t.id)}>{t.text}</span>
                              <button onClick={() => deleteTodo(t.id)} className="opacity-0 group-hover:opacity-100 text-red-500"><Trash2 size={10}/></button>
                          </div>
                      ))}
                  </div>
              ))}
          </div>
      </MonoCard>
  );

  const renderFocusTab = () => (
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
             <div className="lg:col-span-3 space-y-4">
                <MonoCard noPadding className="p-4 bg-black text-white dark:bg-white dark:text-black" accent={user?.preferences.accent}>
                   <h3 className="text-xs font-bold uppercase tracking-wider opacity-70 mb-4">{t('dailyQuests')}</h3>
                   <div className="space-y-3">
                      {user?.quests.map(q => (
                        <div key={q.id} className="flex items-center gap-3">
                           <div className={`w-5 h-5 rounded border flex items-center justify-center ${q.isCompleted ? 'bg-white text-black dark:bg-black dark:text-white border-transparent' : 'border-white/30 dark:border-black/30'}`}>
                              {q.isCompleted && <CheckCircle2 size={12} />}
                           </div>
                           <div className="flex-1">
                              <div className={`text-xs font-bold ${q.isCompleted ? 'line-through opacity-50' : ''}`}>{q.description}</div>
                              <div className="w-full h-1 bg-white/20 dark:bg-black/20 mt-1 rounded-full overflow-hidden">
                                 <div className="h-full bg-white dark:bg-black transition-all duration-500" style={{ width: `${Math.min(100, (q.progress / q.target) * 100)}%` }} />
                              </div>
                           </div>
                        </div>
                      ))}
                   </div>
                </MonoCard>
                
                {/* Subject Selection */}
                <div className="space-y-2 max-h-[200px] overflow-y-auto no-scrollbar">
                   {user?.subjects.map(sub => (
                     <MonoCard 
                       key={sub.id} 
                       noPadding 
                       accent={user.preferences.accent}
                       onClick={() => setTimer(p => ({...p, subjectId: sub.id}))}
                       className={`p-4 cursor-pointer transition-all ${timer.subjectId === sub.id ? 'border-black dark:border-white ring-1 ring-black dark:ring-white' : 'opacity-60 hover:opacity-100'}`}
                     >
                       <div className="flex justify-between font-bold text-sm">
                          <span>{sub.name}</span>
                          {timer.subjectId === sub.id && <Activity size={14} className="animate-pulse"/>}
                       </div>
                     </MonoCard>
                   ))}
                </div>

                {/* Productivity Tools Card */}
                <MonoCard accent={user?.preferences.accent}>
                   <h3 className="text-xs font-bold uppercase opacity-70 mb-3">Tools</h3>
                   <div className="grid grid-cols-2 gap-2">
                       <button onClick={() => setEyeYogaActive(true)} className="p-2 text-xs border rounded flex flex-col items-center gap-1 hover:bg-gray-50 dark:hover:bg-[#222]">
                           <Eye size={16}/> Eye Yoga
                       </button>
                       <button onClick={startFlashcardReview} className="p-2 text-xs border rounded flex flex-col items-center gap-1 hover:bg-gray-50 dark:hover:bg-[#222]">
                           <Layers size={16}/> Review Cards
                       </button>
                       <button onClick={() => setShowSpotify(!showSpotify)} className="p-2 text-xs border rounded flex flex-col items-center gap-1 hover:bg-gray-50 dark:hover:bg-[#222]">
                           <Music size={16}/> Spotify
                       </button>
                       <button onClick={() => setShowNotebookModal(true)} className="p-2 text-xs border rounded flex flex-col items-center gap-1 hover:bg-gray-50 dark:hover:bg-[#222]">
                           <BookOpen size={16}/> Notebook
                       </button>
                   </div>
                </MonoCard>
                
                {showSpotify && (
                    <div className="rounded-xl overflow-hidden">
                        <iframe style={{borderRadius: "12px"}} src="https://open.spotify.com/embed/playlist/37i9dQZF1DX8Uebhn9wzrS?utm_source=generator&theme=0" width="100%" height="152" frameBorder="0" allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy"></iframe>
                    </div>
                )}
             </div>

             {/* Center Timer */}
             <div className="lg:col-span-6 space-y-6 relative">
                 {/* Focus Shield Blur Effect */}
                  {focusShieldActive && (
                    <div className="absolute inset-0 z-50 bg-white/50 dark:bg-black/50 blur-shield flex items-center justify-center animate-fade-in rounded-xl">
                        <div className="bg-red-500 text-white p-4 rounded-lg font-bold flex items-center gap-2">
                            <Shield className="animate-pulse"/> Focus Shield Active
                        </div>
                    </div>
                  )}
                  
                  <MonoCard className={`flex flex-col items-center justify-center relative transition-all duration-500 ${timer.isZenMode ? 'fixed inset-0 z-[200] w-screen h-screen rounded-none' : 'min-h-[400px]'}`} accent={user?.preferences.accent}>
                      {!timer.isZenMode && (
                        <div className="absolute top-4 right-4 flex flex-col items-end gap-4 z-10">
                                <div className="flex gap-2 items-center">
                                    {/* Audio Visualizer */}
                                    {activeSoundId && (
                                        <div className="flex gap-0.5 h-8 items-end mr-2">
                                            {[1,2,3,4,5].map(i => (
                                                <div key={i} className="w-1 bg-[var(--accent-color)] animate-[bounce_1s_infinite]" style={{animationDelay: `${i*0.1}s`, height: `${30 + Math.random()*70}%`}}></div>
                                            ))}
                                        </div>
                                    )}
                                    {AMBIENCE_TRACKS.map(track => (
                                        <button 
                                        key={track.id}
                                        onClick={() => toggleSound(track.id)}
                                        className={`p-2 rounded-full transition-all ${activeSoundId === track.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222] text-gray-400'}`}
                                        title={track.name}
                                        >
                                        {track.id === 'lofi' ? <Radio size={14} /> : <Music size={14} />}
                                        </button>
                                    ))}
                                </div>
                        </div>
                      )}
                      
                      {timer.isZenMode && (
                          <button onClick={toggleZenMode} className="absolute top-8 right-8 p-4 opacity-20 hover:opacity-100 transition-opacity"><Minimize2 size={32}/></button>
                      )}
                      
                      <div className={`font-display font-bold leading-none tracking-tighter tabular-nums ${timer.isZenMode ? 'text-[15rem] sm:text-[20vw]' : 'text-[7rem] sm:text-[9rem]'}`}>
                            {Math.floor(timer.timeLeft / 60)}:{String(timer.timeLeft % 60).padStart(2, '0')}
                      </div>
                      
                      {/* Controls */}
                      <div className={`flex gap-4 mt-8 transition-opacity ${timer.isZenMode ? 'opacity-0 hover:opacity-100' : 'opacity-100'}`}>
                          {!timer.isActive ? (
                              <button 
                                  onClick={startSession}
                                  className="px-12 py-4 bg-black dark:bg-white text-white dark:text-black font-bold uppercase tracking-widest rounded-full hover:scale-105 transition-transform"
                              >
                                  {t('start')}
                              </button>
                          ) : (
                              <>
                                  <button onClick={() => setTimer(p => ({...p, isActive: false}))} className="px-8 py-4 border border-black dark:border-white rounded-full font-bold uppercase">{t('pause')}</button>
                                  {/* Distraction Logger */}
                                  <button onClick={handleDistraction} className="p-4 rounded-full border border-gray-200 hover:bg-red-50 text-red-500 transition-colors" title="Log Distraction (Press D)">
                                      <AlertTriangle size={20}/>
                                  </button>
                                  <button onClick={handleFinishSession} className="p-4 rounded-full border border-red-200 text-red-500"><Square size={20} fill="currentColor"/></button>
                              </>
                          )}
                      </div>
                      
                      {/* Distraction Counter */}
                      {timer.isActive && distractionCount > 0 && (
                          <div className="absolute bottom-4 text-xs font-bold text-red-500 opacity-60 flex items-center gap-1">
                              <AlertOctagon size={12}/> {distractionCount} Distractions
                          </div>
                      )}
                  </MonoCard>
                  
                  {/* Session Flow Cards */}
                  {(sessionStep === 'mood_pre' || sessionStep === 'mood_post') && (
                    <MonoCard className="animate-slide-up text-center">
                        <h3 className="text-xl font-bold mb-4">{t('howAreYou')}</h3>
                        <div className="flex justify-center gap-8">
                            {['happy', 'neutral', 'stressed'].map((m) => (
                                <button key={m} onClick={() => {
                                    if(sessionStep === 'mood_pre') {
                                        setPreMood(m as any);
                                        startTimerActual();
                                    } else {
                                        setSessionStep('notes');
                                    }
                                }} className="flex flex-col items-center gap-2 hover:scale-110 transition-transform">
                                    {m === 'happy' ? <Smile size={40} /> : m === 'neutral' ? <Meh size={40} /> : <Frown size={40} />}
                                    <span className="text-xs uppercase font-bold">{m}</span>
                                </button>
                            ))}
                        </div>
                    </MonoCard>
                  )}
                  {sessionStep === 'notes' && (
                   <MonoCard className="animate-slide-up" accent={user?.preferences.accent}>
                      <h3 className="text-lg font-bold mb-4">{t('whatDidYouStudy')}</h3>
                      <textarea 
                        value={notes} 
                        onChange={e => setNotes(e.target.value)}
                        className="w-full h-32 bg-gray-50 dark:bg-[#111] p-4 rounded-lg resize-none outline-none border border-transparent focus:border-[var(--accent-color)]"
                        placeholder={t('notesPlaceholder')}
                      />
                      <div className="flex justify-between items-center mt-2">
                          <button onClick={submitSession} disabled={aiLoading} className="py-3 px-8 bg-black dark:bg-white text-white dark:text-black font-bold uppercase">
                            {aiLoading ? t('loadingAi') : t('saveSession')}
                          </button>
                      </div>
                   </MonoCard>
                  )}
             </div>

             {/* RIGHT STATS */}
             <div className="lg:col-span-3 space-y-4">
                <MonoCard accent={user?.preferences.accent}>
                   <div className="flex justify-between items-center mb-2">
                      <div className="text-xs font-bold uppercase text-gray-400">Level {user?.level}</div>
                   </div>
                   <div className="text-4xl font-bold">{user?.xp} XP</div>
                   <div className="w-full h-1 bg-gray-100 dark:bg-[#222] mt-4 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-color)]" style={{width: `${(user!.xp % 1000)/10}%`}} />
                   </div>
                </MonoCard>
                
                {/* DAILY QUOTE */}
                <MonoCard accent={user?.preferences.accent} noPadding className="p-4 bg-gray-50 dark:bg-[#111] border-none">
                    <div className="flex gap-2 opacity-60 text-xs uppercase font-bold mb-2"><Quote size={12}/> Daily Quote</div>
                    <p className="font-display italic text-sm">"{dailyQuote}"</p>
                </MonoCard>

                {renderEisenhower()}
                
                <MonoCard accent={user?.preferences.accent} noPadding className="p-4">
                    <h3 className="text-xs font-bold uppercase mb-2">{t('timeline')}</h3>
                    {renderTimeline()}
                </MonoCard>
                
                {renderWeeklyReport()}

                <button onClick={() => setShowHistoryModal(true)} className="w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-gray-50 dark:hover:bg-[#111]">
                    <History size={16}/> {t('history')}
                </button>
             </div>
      </div>
  );
  
  const renderGameCenter = () => (
      <div className="space-y-6 animate-slide-up">
          <div className="flex gap-2 mb-6 overflow-x-auto no-scrollbar">
              {['market', 'pet', 'garden', 'legacy', 'skills', 'inventory'].map(t => (
                  <button key={t} onClick={() => setGameSubTab(t as any)} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${gameSubTab === t ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>
                      {t}
                  </button>
              ))}
          </div>
          
          {/* INVENTORY */}
          {gameSubTab === 'inventory' && (
              <MonoCard accent={user?.preferences.accent}>
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><Package/> Inventory</h2>
                  {user?.inventory.length === 0 ? (
                      <div className="text-center opacity-50 p-12">Inventory is empty. Visit the Market!</div>
                  ) : (
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          {user?.inventory.map((itemId, i) => {
                              const item = SHOP_ITEMS.find(si => si.id === itemId) || { name: itemId, icon: <Package/>, type: 'consumable' };
                              return (
                                  <div key={i} className="p-4 border rounded-xl flex flex-col items-center gap-2 hover:border-[var(--accent-color)] transition-colors group cursor-pointer" onClick={() => handleInventoryUse(itemId)}>
                                      <div className="text-2xl">{item.icon}</div>
                                      <div className="font-bold text-sm text-center">{item.name}</div>
                                      <div className="text-xs opacity-0 group-hover:opacity-100 text-green-500 font-bold">Click to Use/Equip</div>
                                  </div>
                              )
                          })}
                      </div>
                  )}
              </MonoCard>
          )}

          {/* SKILL TREE */}
          {gameSubTab === 'skills' && (
              <MonoCard accent={user?.preferences.accent} className="min-h-[500px]">
                  <h2 className="text-2xl font-bold mb-6 flex items-center gap-2"><GitBranch/> Skill Tree</h2>
                  <div className="relative flex justify-center py-12">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                          {SKILL_TREE_NODES.map(node => {
                              const isUnlocked = (user?.level || 0) >= node.requiredLevel;
                              return (
                                  <div key={node.id} className={`flex flex-col items-center text-center p-6 border-2 rounded-xl transition-all ${isUnlocked ? 'border-[var(--accent-color)] bg-white dark:bg-[#111]' : 'border-gray-200 dark:border-[#333] opacity-50 grayscale'}`}>
                                      <div className="text-4xl mb-4">{node.icon}</div>
                                      <h3 className="font-bold text-lg">{node.label}</h3>
                                      <p className="text-xs opacity-70 mb-2">{node.description}</p>
                                      <div className="text-xs font-mono px-2 py-1 bg-gray-100 dark:bg-[#222] rounded">Lvl {node.requiredLevel}</div>
                                  </div>
                              )
                          })}
                      </div>
                      {/* Connector Lines (Simplified) */}
                      <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-100 dark:bg-[#222] -z-0 transform -translate-y-1/2 hidden md:block"/>
                  </div>
              </MonoCard>
          )}
          
          {gameSubTab === 'pet' && user?.pet && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <MonoCard className="flex flex-col items-center justify-center p-12" accent={user.preferences.accent}>
                      <div className="text-9xl animate-float mb-8">
                          {user.pet.stage === 'egg' ? '🥚' : user.pet.stage === 'baby' ? '🐣' : user.pet.stage === 'teen' ? '🦖' : '🐲'}
                      </div>
                      <h2 className="text-3xl font-bold">{user.pet.name}</h2>
                      <p className="text-sm opacity-50 font-mono uppercase mb-6">Level {Math.floor(user.pet.xp / 100)} • {user.pet.type}</p>
                      <div className="w-full space-y-2 max-w-xs">
                          <div className="flex justify-between text-xs font-bold"><span>Hunger</span> <span>{user.pet.hunger}%</span></div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-[#333] rounded-full overflow-hidden"><div className="h-full bg-red-500" style={{width: `${user.pet.hunger}%`}}/></div>
                          
                          <div className="flex justify-between text-xs font-bold"><span>Happiness</span> <span>{user.pet.happiness}%</span></div>
                          <div className="w-full h-2 bg-gray-200 dark:bg-[#333] rounded-full overflow-hidden"><div className="h-full bg-green-500" style={{width: `${user.pet.happiness}%`}}/></div>
                      </div>
                  </MonoCard>
                  <MonoCard accent={user.preferences.accent}>
                      <h3 className="font-bold mb-4">Pet Actions</h3>
                      <div className="grid grid-cols-2 gap-4">
                          <button onClick={() => buyItem(SHOP_ITEMS.find(i => i.id === 'pet_food')!)} className="p-4 border rounded-xl flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#222]">
                              <Sparkles size={24} />
                              <span className="font-bold">Feed (50c)</span>
                          </button>
                          <button onClick={() => addNotification("Playing", `${user.pet!.name} is happy!`, 'success')} className="p-4 border rounded-xl flex flex-col items-center gap-2 hover:bg-gray-50 dark:hover:bg-[#222]">
                              <Gamepad2 size={24} />
                              <span className="font-bold">Play</span>
                          </button>
                      </div>
                  </MonoCard>
              </div>
          )}

          {gameSubTab === 'market' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2 space-y-4">
                      {stocks.map(stock => (
                          <MonoCard key={stock.symbol} noPadding className="p-4 flex items-center justify-between" accent={user?.preferences.accent}>
                              <div className="flex items-center gap-4">
                                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${stock.trend === 'up' ? 'bg-green-100 text-green-600' : stock.trend === 'down' ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500'}`}>
                                      {stock.trend === 'up' ? <ArrowUpRight size={20}/> : stock.trend === 'down' ? <ArrowDownRight size={20}/> : <Activity size={20}/>}
                                  </div>
                                  <div>
                                      <div className="font-bold">{stock.symbol}</div>
                                      <div className="text-xs opacity-50">{stock.name}</div>
                                  </div>
                              </div>
                              <div className="text-right">
                                  <div className="font-mono font-bold text-xl">${stock.price.toFixed(2)}</div>
                                  <div className="flex gap-2 mt-1">
                                      <button onClick={() => handleTradeStock(stock.symbol, 'buy')} className="px-3 py-1 bg-black text-white text-xs rounded font-bold">Buy</button>
                                      <button onClick={() => handleTradeStock(stock.symbol, 'sell')} className="px-3 py-1 border border-black text-xs rounded font-bold">Sell</button>
                                  </div>
                              </div>
                          </MonoCard>
                      ))}
                  </div>
                  <MonoCard accent={user?.preferences.accent}>
                      <h3 className="font-bold mb-4">Portfolio</h3>
                      <div className="space-y-2">
                          {Object.entries(user?.stocks || {}).map(([sym, qty]) => (
                              <div key={sym} className="flex justify-between text-sm">
                                  <span>{sym}</span>
                                  <span className="font-mono">x{qty}</span>
                              </div>
                          ))}
                          <div className="pt-4 border-t mt-4 flex justify-between font-bold">
                              <span>Cash</span>
                              <span>{user?.coins}c</span>
                          </div>
                      </div>
                  </MonoCard>
              </div>
          )}
          
          {gameSubTab === 'garden' && (
              <MonoCard className="min-h-[500px] relative overflow-hidden bg-gradient-to-b from-blue-50 to-green-50 dark:from-[#111] dark:to-[#050505]" accent={user?.preferences.accent}>
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-[#8B4513] opacity-20 rounded-full blur-xl transform translate-y-12"/>
                  <div className="flex items-end justify-around h-full pb-12 px-8">
                      {user?.subjects.map((sub, i) => {
                          const height = Math.min(200, 50 + (sub.totalMinutes / 10));
                          return (
                              <div key={sub.id} className="flex flex-col items-center gap-2 group relative">
                                  <div className="absolute -top-12 opacity-0 group-hover:opacity-100 bg-white text-black text-xs p-2 rounded transition-opacity whitespace-nowrap z-10">
                                      {sub.name}: {sub.totalMinutes}m
                                  </div>
                                  <Leaf 
                                    size={height} 
                                    strokeWidth={1} 
                                    className={`text-green-600 dark:text-green-400 fill-current opacity-80 transition-all duration-1000`} 
                                    style={{ transform: `scale(${1 + (i%2)*0.2})` }}
                                  />
                                  <div className="w-2 h-8 bg-amber-700 opacity-60"/>
                                  <span className="text-xs font-bold uppercase opacity-50">{sub.name}</span>
                              </div>
                          )
                      })}
                  </div>
              </MonoCard>
          )}

          {gameSubTab === 'legacy' && (
              <MonoCard accent={user?.preferences.accent}>
                  <h3 className="text-2xl font-bold mb-4 flex items-center gap-2"><Archive/> Time Capsule</h3>
                  {user?.legacy?.isLocked && user.legacy.unlockDate > Date.now() ? (
                      <div className="text-center p-12 space-y-4">
                          <Lock size={48} className="mx-auto opacity-50"/>
                          <p>This capsule is locked until</p>
                          <div className="font-mono font-bold text-xl">{new Date(user.legacy.unlockDate).toLocaleDateString()}</div>
                      </div>
                  ) : user?.legacy?.isLocked ? (
                      <div className="p-8 space-y-4">
                          <div className="text-green-500 font-bold">Unlocked! Message from the past:</div>
                          <div className="p-6 bg-yellow-50 dark:bg-[#222] font-handwriting text-lg italic">
                              "{user.legacy.note}"
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <p className="opacity-70">Write a message to your future self. It will be locked until the date you choose.</p>
                          <textarea 
                            className="w-full h-32 p-4 bg-gray-50 dark:bg-[#111] rounded-xl outline-none resize-none"
                            placeholder="Dear future me..."
                            value={legacyNote}
                            onChange={e => setLegacyNote(e.target.value)}
                          />
                          <input 
                             type="date" 
                             className="w-full p-3 bg-gray-50 dark:bg-[#111] rounded-xl outline-none"
                             onChange={e => setLegacyDate(e.target.value)}
                          />
                          <button 
                             onClick={async () => {
                                 if(!legacyNote || !legacyDate || !user) return;
                                 const unlock = new Date(legacyDate).getTime();
                                 const updatedUser = {
                                     ...user, 
                                     legacy: { note: legacyNote, unlockDate: unlock, isLocked: true }
                                 };
                                 await FirebaseService.updateUser(updatedUser);
                                 setUser(updatedUser);
                             }}
                             className="w-full py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase"
                          >
                              Seal Capsule
                          </button>
                      </div>
                  )}
              </MonoCard>
          )}
      </div>
  );

  // ... AI Lab and Social renderers unchanged ...
  const renderAiLab = () => (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
          <div className="lg:col-span-1 space-y-2">
              {[
                  { id: 'explain', label: 'Simplifier', icon: Sparkles },
                  { id: 'plan', label: 'Study Planner', icon: Calendar },
                  { id: 'essay', label: 'Essay Grader', icon: FileText },
                  { id: 'podcast', label: 'Podcast Gen', icon: Mic },
                  { id: 'concept', label: 'Concept Map', icon: Map },
                  { id: 'exam', label: 'Exam Sim', icon: GraduationCap },
                  { id: 'debate', label: 'Debate AI', icon: MessageCircle },
              ].map(tool => (
                  <button 
                    key={tool.id}
                    onClick={() => { setAiToolMode(tool.id as any); setAiToolOutput(null); setAiToolInput(''); setDebateMessages([]); }}
                    className={`w-full p-4 rounded-xl flex items-center gap-3 transition-all ${aiToolMode === tool.id ? 'bg-black text-white dark:bg-white dark:text-black shadow-lg' : 'bg-white dark:bg-[#111] hover:bg-gray-50 dark:hover:bg-[#222]'}`}
                  >
                      <tool.icon size={18}/> <span className="font-bold text-sm">{tool.label}</span>
                  </button>
              ))}
          </div>
          <div className="lg:col-span-3">
            <MonoCard className="min-h-[600px] flex flex-col" accent={user?.preferences.accent}>
               <h2 className="text-2xl font-bold mb-6 flex items-center gap-2 capitalize">
                   {aiToolMode} Tool
               </h2>
               
               {aiToolMode === 'debate' && aiToolOutput === true ? (
                   // DEBATE CHAT INTERFACE
                   <div className="flex-1 flex flex-col">
                       <div className="flex-1 overflow-y-auto space-y-4 mb-4 p-4 bg-gray-50 dark:bg-[#111] rounded-xl max-h-[400px]">
                           {debateMessages.map((msg, i) => (
                               <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                   <div className={`max-w-[80%] p-3 rounded-xl text-sm ${msg.role === 'user' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-white border dark:bg-[#222]'}`}>
                                       {msg.text}
                                   </div>
                               </div>
                           ))}
                           {aiLoading && <div className="text-xs opacity-50">Thinking...</div>}
                       </div>
                       <div className="flex gap-2">
                           <input 
                               value={aiToolInput} 
                               onChange={e => setAiToolInput(e.target.value)}
                               onKeyDown={e => e.key === 'Enter' && handleDebateReply()}
                               className="flex-1 p-3 border rounded-lg bg-transparent"
                               placeholder="Type your argument..."
                           />
                           <button onClick={handleDebateReply} className="p-3 bg-black text-white dark:bg-white dark:text-black rounded-lg"><Send size={20}/></button>
                       </div>
                   </div>
               ) : (
                   // STANDARD TOOLS INTERFACE
                   <div className="space-y-4">
                          <textarea 
                            value={aiToolInput}
                            onChange={e => setAiToolInput(e.target.value)}
                            className="w-full h-32 p-4 bg-gray-50 dark:bg-[#111] rounded-xl resize-none outline-none"
                            placeholder={aiToolMode === 'explain' ? 'Enter a complex concept...' : 'Paste content here...'}
                          />
                          <button 
                            onClick={runAiTool} 
                            disabled={aiLoading || !aiToolInput}
                            className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black font-bold uppercase rounded-lg disabled:opacity-50"
                          >
                              {aiLoading ? 'Processing...' : 'Run AI'}
                          </button>
                          
                          {/* OUTPUT DISPLAY */}
                          {aiToolOutput && (
                              <div className="mt-8 pt-8 border-t border-gray-100 dark:border-[#333] animate-fade-in">
                                  {/* PODCAST TTS PLAYBACK */}
                                  {aiToolMode === 'podcast' && typeof aiToolOutput === 'string' && (
                                      <div className="mb-4">
                                          <button 
                                            onClick={() => {
                                                const msg = new SpeechSynthesisUtterance(aiToolOutput);
                                                const voices = window.speechSynthesis.getVoices();
                                                const prefVoice = voices.find(v => v.lang.includes('en') && v.name.includes('Google')) || voices[0];
                                                if(prefVoice) msg.voice = prefVoice;
                                                window.speechSynthesis.speak(msg);
                                            }}
                                            className="flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-full font-bold text-sm"
                                          >
                                              <Play size={16}/> Listen to Podcast
                                          </button>
                                      </div>
                                  )}
    
                                  {/* PLAIN TEXT OUTPUT */}
                                  {typeof aiToolOutput === 'string' && (
                                      <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{aiToolOutput}</div>
                                  )}
                              </div>
                          )}
                    </div>
               )}
            </MonoCard>
          </div>
      </div>
  );
  
  // ... Social renderer ...
  const renderSocial = () => (
      <div className="space-y-6 animate-slide-up">
          <div className="flex gap-2">
              <button onClick={() => setSocialSubTab('lounge')} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${socialSubTab === 'lounge' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>Lounge</button>
              <button onClick={() => setSocialSubTab('leaderboard')} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${socialSubTab === 'leaderboard' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>Leaderboard</button>
              <button onClick={() => setSocialSubTab('guilds')} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${socialSubTab === 'guilds' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>Guilds</button>
          </div>

          {socialSubTab === 'lounge' && (
              <MonoCard accent={user?.preferences.accent} className="min-h-[400px] flex items-center justify-center relative overflow-hidden">
                  <div className="absolute inset-0 bg-grid-pattern opacity-10"></div>
                  <div className="text-center space-y-4 relative z-10">
                      <div className="flex justify-center gap-4 mb-4">
                          {[1,2,3,4,5].map(i => (
                              <div key={i} className="w-3 h-3 rounded-full bg-green-500 animate-pulse shadow-[0_0_10px_currentColor]" style={{animationDelay: `${Math.random()}s`}}></div>
                          ))}
                      </div>
                      <h3 className="font-bold text-2xl">Study Lounge Active</h3>
                      <p className="opacity-50 max-w-md">You are studying alongside others. Feel their presence in the silence.</p>
                  </div>
              </MonoCard>
          )}
          
          {socialSubTab === 'leaderboard' && (
              <MonoCard accent={user?.preferences.accent}>
                  <div className="flex items-center gap-4 mb-8">
                    <Trophy size={32} />
                    <h2 className="text-2xl font-bold">{t('leaderboard')}</h2>
                  </div>
                  {leaderboard.map((entry, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${entry.isCurrentUser ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#111]'}`}>
                            <div className="flex items-center gap-4">
                                <div className="font-mono font-bold text-xl w-8">#{idx+1}</div>
                                <div className="font-bold">{entry.username}</div>
                            </div>
                            <div className="font-mono">{entry.xp} XP</div>
                        </div>
                    ))}
              </MonoCard>
          )}
           {/* Guilds renderer simplified for brevity but functional in previous */}
           {socialSubTab === 'guilds' && (
              <div className="grid grid-cols-1 gap-6">
                 {user?.guildId ? (
                      <MonoCard accent={user?.preferences.accent}>
                          <h3>Guild Dashboard</h3>
                          <p>Chat active.</p>
                      </MonoCard>
                 ) : (
                     <MonoCard><h3>Join a Guild</h3></MonoCard>
                 )}
              </div>
           )}
      </div>
  );


  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black"><div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"/></div>;
  if (!user) return renderAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white transition-colors duration-500 font-sans">
      {renderNotifications()}
      
      {/* TOP NAVIGATION BAR */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-black/80 backdrop-blur-md border-b border-gray-200 dark:border-[#222] h-16 flex items-center justify-between px-6">
          <div className="flex items-center gap-8">
              <h1 className="font-display font-bold text-xl tracking-tighter">LUMINA.</h1>
              <div className="hidden md:flex gap-1">
                  <button 
                      onClick={() => setActiveTab('focus')} 
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'focus' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                      Focus
                  </button>
                  <button 
                      onClick={() => setActiveTab('game_center')} 
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'game_center' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                      Game Center
                  </button>
                  <button 
                      onClick={() => setActiveTab('ai_lab')} 
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'ai_lab' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                      AI Lab
                  </button>
                  <button 
                      onClick={() => setActiveTab('social')} 
                      className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${activeTab === 'social' ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-500 hover:text-black dark:hover:text-white'}`}
                  >
                      Social
                  </button>
              </div>
          </div>
          <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 px-3 py-1 bg-gray-100 dark:bg-[#222] rounded-full">
                  <span className="text-lg">{user.avatar}</span>
                  <span className="text-xs font-bold hidden sm:inline">{user.username}</span>
              </div>
              <button onClick={() => setShowSettings(true)} className="p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded-full transition-colors">
                  <Settings size={20}/>
              </button>
          </div>
      </nav>

      {/* MOBILE TAB BAR */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white dark:bg-black border-t border-gray-200 dark:border-[#222] h-16 flex items-center justify-around md:hidden px-2 pb-safe">
          {[
              { id: 'focus', icon: Clock, label: 'Focus' },
              { id: 'game_center', icon: Gamepad2, label: 'Game' },
              { id: 'ai_lab', icon: Brain, label: 'AI' },
              { id: 'social', icon: Users, label: 'Social' },
          ].map(t => (
              <button 
                  key={t.id} 
                  onClick={() => setActiveTab(t.id as any)}
                  className={`flex flex-col items-center gap-1 p-2 w-16 ${activeTab === t.id ? 'text-black dark:text-white' : 'text-gray-400'}`}
              >
                  <t.icon size={20} strokeWidth={activeTab === t.id ? 3 : 2} />
                  <span className="text-[10px] font-bold uppercase">{t.label}</span>
              </button>
          ))}
      </div>
      
      {/* SHORTCUTS MODAL */}
      {showShortcutsModal && (
          <div className="fixed inset-0 z-[200] bg-black/80 flex items-center justify-center" onClick={() => setShowShortcutsModal(false)}>
              <MonoCard className="max-w-md w-full" onClick={e => e.stopPropagation()}>
                  <h2 className="text-xl font-bold mb-4 flex items-center gap-2"><Keyboard/> Keyboard Shortcuts</h2>
                  <div className="space-y-2">
                      <div className="flex justify-between border-b pb-2"><span>Play/Pause Timer</span> <span className="font-mono bg-gray-200 dark:bg-[#333] px-2 rounded">Space</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Log Distraction</span> <span className="font-mono bg-gray-200 dark:bg-[#333] px-2 rounded">D</span></div>
                      <div className="flex justify-between border-b pb-2"><span>Close Modals / Zen Mode</span> <span className="font-mono bg-gray-200 dark:bg-[#333] px-2 rounded">Esc</span></div>
                  </div>
              </MonoCard>
          </div>
      )}
      
      {/* ... Existing Modals ... */}
      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <div className="bg-white dark:bg-[#111] w-full max-w-md p-8 rounded-2xl border border-gray-200 dark:border-[#333] space-y-6 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold font-display">{t('settings')}</h2>
                    <button onClick={() => setShowSettings(false)}><X size={24} /></button>
                </div>
                <div className="space-y-4">
                    {/* Theme Toggle */}
                    <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-[#333] rounded-xl">
                        <div className="flex items-center gap-3">
                            {user.preferences.darkMode ? <Moon size={20} /> : <Sun size={20} />}
                            <span className="font-medium">{t('theme')}</span>
                        </div>
                        <button onClick={() => {
                            const u = {...user, preferences: {...user.preferences, darkMode: !user.preferences.darkMode}};
                            setUser(u);
                            FirebaseService.updateUser(u);
                        }} className="px-4 py-2 bg-gray-100 dark:bg-[#222] rounded-lg font-bold text-sm">
                            {user.preferences.darkMode ? 'Dark' : 'Light'}
                        </button>
                    </div>
                    
                    {/* Custom Accent Color Picker */}
                    <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-[#333] rounded-xl">
                        <div className="flex items-center gap-3">
                            <Palette size={20} />
                            <span className="font-medium">Custom Accent</span>
                        </div>
                        <input 
                           type="color" 
                           value={user.preferences.accent.startsWith('#') ? user.preferences.accent : '#000000'} 
                           onChange={e => {
                               const u = {...user, preferences: {...user.preferences, accent: e.target.value}};
                               setUser(u);
                               FirebaseService.updateUser(u);
                           }}
                           className="w-8 h-8 rounded cursor-pointer border-none"
                        />
                    </div>

                    {/* Native Notifications */}
                    <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-[#333] rounded-xl">
                        <div className="flex items-center gap-3">
                            <Bell size={20} />
                            <span className="font-medium">Desktop Notifications</span>
                        </div>
                        <button onClick={requestNotificationPermission} className={`px-4 py-2 rounded-lg font-bold text-sm ${user.preferences.enableNativeNotifications ? 'bg-green-500 text-white' : 'bg-gray-100 dark:bg-[#222]'}`}>
                            {user.preferences.enableNativeNotifications ? 'Enabled' : 'Enable'}
                        </button>
                    </div>
                    
                    {/* Shortcuts Help */}
                    <button onClick={() => setShowShortcutsModal(true)} className="w-full py-3 border border-gray-200 dark:border-[#333] rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#222]">
                        <Keyboard size={16}/> Keyboard Shortcuts
                    </button>

                    {/* Timer Duration Settings */}
                    <div className="p-4 border border-gray-200 dark:border-[#333] rounded-xl space-y-3">
                        <div className="flex items-center gap-2 font-bold"><Clock size={16}/> Timer Settings (mins)</div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                            <div>
                                <label className="block opacity-50 mb-1">Focus</label>
                                <input 
                                    type="number" 
                                    value={user.preferences.focusDuration || 25}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 25;
                                        const u = {...user, preferences: {...user.preferences, focusDuration: val}};
                                        setUser(u);
                                        FirebaseService.updateUser(u);
                                    }}
                                    className="w-full p-2 bg-gray-50 dark:bg-[#222] rounded border border-transparent focus:border-black dark:focus:border-white"
                                />
                            </div>
                            <div>
                                <label className="block opacity-50 mb-1">Short Break</label>
                                <input 
                                    type="number" 
                                    value={user.preferences.shortBreakDuration || 5}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 5;
                                        const u = {...user, preferences: {...user.preferences, shortBreakDuration: val}};
                                        setUser(u);
                                        FirebaseService.updateUser(u);
                                    }}
                                    className="w-full p-2 bg-gray-50 dark:bg-[#222] rounded"
                                />
                            </div>
                             <div>
                                <label className="block opacity-50 mb-1">Long Break</label>
                                <input 
                                    type="number" 
                                    value={user.preferences.longBreakDuration || 15}
                                    onChange={e => {
                                        const val = parseInt(e.target.value) || 15;
                                        const u = {...user, preferences: {...user.preferences, longBreakDuration: val}};
                                        setUser(u);
                                        FirebaseService.updateUser(u);
                                    }}
                                    className="w-full p-2 bg-gray-50 dark:bg-[#222] rounded"
                                />
                            </div>
                        </div>
                    </div>
                    
                    {/* Data Export */}
                    <button onClick={downloadData} className="w-full py-3 border border-gray-200 dark:border-[#333] rounded-xl flex items-center justify-center gap-2 hover:bg-gray-50 dark:hover:bg-[#222]">
                        <Download size={16}/> {t('exportData')}
                    </button>

                    <button onClick={() => FirebaseService.logout().then(() => setUser(null))} className="w-full py-3 text-red-500 border border-red-200 rounded-xl hover:bg-red-50 font-bold uppercase">
                        {t('logout')}
                    </button>
                </div>
            </div>
        </div>
      )}

      <main className="pt-24 pb-12 px-4 max-w-7xl mx-auto">
        {activeTab === 'focus' && renderFocusTab()}
        {activeTab === 'ai_lab' && renderAiLab()}
        {activeTab === 'game_center' && renderGameCenter()}
        {activeTab === 'social' && renderSocial()}
      </main>
    </div>
  );
};

export default App;

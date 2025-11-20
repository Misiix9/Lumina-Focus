
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, Square, Plus, Activity, Book, 
  Brain, LogOut, Zap, Award, Clock, 
  CheckCircle2, RefreshCcw, Trophy, Music,
  Layers, ArrowRight, X, Settings, Moon, Sun, Globe, Volume2, Sparkles,
  Shield, Sword, Gamepad2, ShoppingBag, Users, Radio, Smile, Frown, Meh, Mic, Eye, BarChart3, FileText, Map, GraduationCap, Ghost, Palette, Leaf, Archive, Scroll, Heart, Sword as SwordIcon
} from 'lucide-react';
import { MonoCard } from './components/GlassCard';
import { User, StudySession, TimerState, Language, QuizQuestion, Quest, Flashcard, Subject, AccentColor, Boss, ShopItem, Stock, ConceptMapData, Guild, ExamQuestion } from './types';
import { FirebaseService } from './services/firebase';
import { analyzeSession, generateQuiz, generateDailyQuests, generateFlashcards, explainConcept, generateStudyPlan, gradeEssay, generatePodcastScript, generateConceptMap, generateBoss, generateExam } from './services/geminiService';
import { DEFAULT_SUBJECTS, TRANSLATIONS, ACCENT_COLORS, SHOP_ITEMS, MOCK_STOCKS, BOSS_TEMPLATES } from './constants';

// --- SOUNDS ---
const AMBIENCE_TRACKS = [
  { id: 'rain', name: 'Rain', url: 'https://actions.google.com/sounds/v1/weather/rain_heavy_loud.ogg' },
  { id: 'cafe', name: 'Cafe', url: 'https://actions.google.com/sounds/v1/ambiences/coffee_shop.ogg' },
  { id: 'white', name: 'White Noise', url: 'https://actions.google.com/sounds/v1/ambiences/humming_air_conditioner.ogg' },
  { id: 'lofi', name: 'Lo-Fi Radio', url: 'https://stream.zeno.fm/0r0xa792kwzuv' }, // Example Stream
];

const App: React.FC = () => {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Auth
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [authData, setAuthData] = useState({ email: '', username: '', password: '' });
  const [authError, setAuthError] = useState('');

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

  // Session Workflow
  const [sessionStep, setSessionStep] = useState<'idle' | 'mood_pre' | 'running' | 'mood_post' | 'notes' | 'analysis' | 'quiz' | 'flashcards'>('idle');
  const [notes, setNotes] = useState('');
  const [lastSession, setLastSession] = useState<StudySession | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [preMood, setPreMood] = useState<'happy'|'neutral'|'stressed'>('neutral');
  
  // AI Lab
  const [aiToolMode, setAiToolMode] = useState<'explain' | 'plan' | 'essay' | 'podcast' | 'concept' | 'exam'>('explain');
  const [aiToolInput, setAiToolInput] = useState('');
  const [aiToolOutput, setAiToolOutput] = useState<any>(null);

  // Game Center
  const [activeBoss, setActiveBoss] = useState<Boss | null>(null);
  const [stocks, setStocks] = useState<Stock[]>(MOCK_STOCKS);
  const [gameSubTab, setGameSubTab] = useState<'market' | 'pet' | 'garden' | 'legacy'>('market');

  // Social
  const [socialSubTab, setSocialSubTab] = useState<'lounge' | 'leaderboard' | 'guilds'>('lounge');
  const [guilds, setGuilds] = useState<Guild[]>([
      { id: 'g1', name: 'Midnight Scholars', members: 124, totalXp: 50000, banner: '🌙' },
      { id: 'g2', name: 'Code Wizards', members: 45, totalXp: 21000, banner: '🧙‍♂️' },
  ]);

  // Audio
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [activeSoundId, setActiveSoundId] = useState<string | null>(null);
  const [volume, setVolume] = useState(0.5);
  const [typingSound, setTypingSound] = useState(false);

  // Misc
  const [leaderboard, setLeaderboard] = useState<any[]>([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [eyeYogaActive, setEyeYogaActive] = useState(false);

  // --- INIT ---
  useEffect(() => {
    init();
  }, []);

  // Theme Sync
  useEffect(() => {
    if (user) {
        document.documentElement.classList.toggle('dark', user.preferences.darkMode);
        // Apply accent color variable
        const accentHex = ACCENT_COLORS[user.preferences.accent] || '#000000';
        document.documentElement.style.setProperty('--accent-color', accentHex);
    }
  }, [user?.preferences]);

  // Audio Sync
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  // Focus Shield Listener
  useEffect(() => {
    const handleMouseLeave = () => {
        if (timer.isActive && !timer.isZenMode) { // Zen mode hides UI anyway
            setFocusShieldActive(true);
            const audio = new Audio('https://actions.google.com/sounds/v1/alarms/beep_short.ogg');
            audio.volume = 0.5;
            audio.play().catch(()=>{});
        }
    };
    const handleMouseEnter = () => setFocusShieldActive(false);

    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    return () => {
        document.removeEventListener('mouseleave', handleMouseLeave);
        document.removeEventListener('mouseenter', handleMouseEnter);
    };
  }, [timer.isActive]);

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


  const init = async () => {
    const currentUser = await FirebaseService.getCurrentUser();
    if (currentUser) {
      // Ensure new properties exist if old user
      if (!currentUser.coins) currentUser.coins = 0;
      if (!currentUser.stocks) currentUser.stocks = {};
      if (!currentUser.pet) currentUser.pet = { name: 'Orb', stage: 'egg', xp: 0, type: 'void', hunger: 100, happiness: 100 };
      await checkDailyQuests(currentUser);
    }
    setIsLoading(false);
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
              // Boss Defeated
              alert(t('bossDefeated'));
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
        u = await FirebaseService.login(authData.email || authData.username, authData.password);
      }
      await checkDailyQuests(u);
    } catch (err: any) {
      setAuthError(err.message);
      setIsLoading(false);
    }
  };

  const startSession = () => {
      setSessionStep('mood_pre');
  };

  const startTimerActual = () => {
      setSessionStep('running');
      setTimer(p => ({...p, isActive: true}));
      // Spawn boss if battle mode
      if (timer.isBattleMode) {
          generateBoss('General', user!.level).then(setActiveBoss);
      }
  };

  const handleFinishSession = () => {
    setTimer(p => ({ ...p, isActive: false }));
    setSessionStep('mood_post');
    if (audioRef.current) audioRef.current.pause();
  };

  const submitSession = async () => {
    if (!user || !timer.subjectId) return;
    setAiLoading(true);

    const duration = Math.floor((25 * 60 - timer.timeLeft) / 60) || 1;
    const subject = user.subjects.find(s => s.id === timer.subjectId)?.name || "General";
    
    const [analysis, quiz, cards] = await Promise.all([
      analyzeSession(subject, notes, duration, user.preferences.language),
      generateQuiz(subject, notes, user.preferences.language),
      generateFlashcards(subject, notes, user.preferences.language)
    ]);

    const newSession: StudySession = {
      id: Date.now().toString(),
      subjectId: timer.subjectId,
      durationMinutes: duration,
      timestamp: Date.now(),
      notes: notes,
      aiAnalysis: analysis,
      quiz: { questions: quiz },
      flashcards: cards
    };

    // Update Quests
    const updatedQuests = user.quests.map(q => {
      if (q.type === 'minutes') q.progress += duration;
      if (q.type === 'sessions') q.progress += 1;
      if (q.type === 'score' && analysis.grade === 'S') q.progress += 1;
      if (!q.isCompleted && q.progress >= q.target) {
        q.isCompleted = true;
        user.xp += q.xpReward;
        user.coins += 50; // Coin reward
      }
      return q;
    });

    user.sessions.push(newSession);
    user.xp += (duration * 10) + (analysis.grade === 'S' ? 100 : 0);
    user.coins += duration; // 1 coin per minute
    user.quests = updatedQuests;
    
    // Update Pet
    if (user.pet) {
        user.pet.xp += duration;
        user.pet.hunger = Math.max(0, user.pet.hunger - 5);
        // Evolve
        if(user.pet.stage === 'egg' && user.pet.xp > 100) user.pet.stage = 'baby';
        if(user.pet.stage === 'baby' && user.pet.xp > 500) user.pet.stage = 'teen';
        if(user.pet.stage === 'teen' && user.pet.xp > 1000) user.pet.stage = 'adult';
    }

    // Update Subject Stats
    const subIdx = user.subjects.findIndex(s => s.id === timer.subjectId);
    if (subIdx > -1) {
      user.subjects[subIdx].totalMinutes += duration;
      user.subjects[subIdx].sessionsCount += 1;
    }

    await FirebaseService.updateUser(user);
    setUser({...user});
    
    setLastSession(newSession);
    setAiLoading(false);
    setSessionStep('analysis');
  };

  const buyItem = async (item: ShopItem) => {
      if(!user || user.coins < item.cost) return;
      user.coins -= item.cost;
      if(item.type === 'consumable') {
          if(item.id === 'pet_food' && user.pet) {
              user.pet.hunger = Math.min(100, user.pet.hunger + 20);
              alert(t('feedPet'));
          } else {
              alert(`Used ${item.name}!`);
          }
      } else {
          user.inventory.push(item.id);
          // Apply theme if it's a theme
          if(item.id.startsWith('theme_')) {
              const accent = item.id.replace('theme_', '') as AccentColor;
              user.preferences.accent = accent;
          }
      }
      await FirebaseService.updateUser(user);
      setUser({...user});
  };

  // --- AI LAB HANDLER ---
  const handleAiToolSubmit = async () => {
      if(!aiToolInput.trim() || !user) return;
      setAiLoading(true);
      let result: any = null;

      switch(aiToolMode) {
          case 'explain': result = await explainConcept(aiToolInput, user.preferences.language); break;
          case 'plan': result = await generateStudyPlan(aiToolInput, user.preferences.language); break;
          case 'essay': result = await gradeEssay(aiToolInput, user.preferences.language); break;
          case 'podcast': result = await generatePodcastScript(aiToolInput, user.preferences.language); break;
          case 'concept': result = await generateConceptMap(aiToolInput, user.preferences.language); break;
          case 'exam': result = await generateExam(aiToolInput, user.preferences.language); break;
      }
      setAiToolOutput(result);
      setAiLoading(false);
  };

  // --- RENDERERS ---

  const renderAuth = () => (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white dark:bg-black text-black dark:text-white">
      <div className="lg:w-1/2 bg-black text-white dark:bg-white dark:text-black flex flex-col justify-center p-12 relative overflow-hidden">
         <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-gray-800 via-black to-black" />
         <div className="relative z-10 space-y-4 animate-slide-up">
           <h1 className="text-8xl font-display font-bold tracking-tighter">LUMINA.</h1>
           <p className="text-xl font-mono text-gray-400 dark:text-gray-600">Monochrome Focus System</p>
         </div>
      </div>
      <div className="lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
           <div className="flex gap-8 border-b border-gray-200 pb-1">
              <button onClick={() => setAuthMode('login')} className={`pb-4 text-sm font-bold uppercase ${authMode === 'login' ? 'border-b-2 border-black dark:border-white' : 'text-gray-400'}`}>Login</button>
              <button onClick={() => setAuthMode('register')} className={`pb-4 text-sm font-bold uppercase ${authMode === 'register' ? 'border-b-2 border-black dark:border-white' : 'text-gray-400'}`}>Register</button>
           </div>
           {authError && <div className="text-red-500 text-sm">{authError}</div>}
           <form onSubmit={handleAuth} className="space-y-6">
             <input type="text" value={authData.username} onChange={e => setAuthData({...authData, username: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 outline-none focus:border-black dark:focus:border-white transition-colors" placeholder="Username" />
             {authMode === 'register' && <input type="email" value={authData.email} onChange={e => setAuthData({...authData, email: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 outline-none focus:border-black dark:focus:border-white transition-colors" placeholder="Email" />}
             <input type="password" value={authData.password} onChange={e => setAuthData({...authData, password: e.target.value})} className="w-full bg-transparent border-b border-gray-300 py-3 outline-none focus:border-black dark:focus:border-white transition-colors" placeholder="Password" />
             <button className="w-full bg-black dark:bg-white text-white dark:text-black h-14 font-bold uppercase hover:opacity-90 transition-opacity">Start System</button>
           </form>
        </div>
      </div>
    </div>
  );

  const renderTimeline = () => {
      const hours = new Array(24).fill(0);
      user?.sessions.forEach(s => {
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

  const renderFocusTab = () => (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
             {/* LEFT: Quests & Subjects */}
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

                <div className="space-y-2">
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
                   <button 
                     onClick={() => setIsAddingSubject(true)}
                     className="w-full py-2 border border-dashed border-gray-300 dark:border-gray-700 rounded-lg text-xs font-bold uppercase hover:border-black dark:hover:border-white transition-colors"
                   >
                     + {t('addSubject')}
                   </button>
                   {isAddingSubject && (
                       <div className="flex gap-2 animate-scale-in">
                           <input value={newSubjectName} onChange={e => setNewSubjectName(e.target.value)} className="flex-1 p-2 border rounded" placeholder="Subject..." />
                           <button onClick={() => { 
                               if(user && newSubjectName) {
                                   user.subjects.push({id: Date.now().toString(), name: newSubjectName, totalMinutes: 0, sessionsCount: 0});
                                   FirebaseService.updateUser(user).then(() => setUser({...user}));
                                   setIsAddingSubject(false);
                                   setNewSubjectName('');
                               }
                           }} className="p-2 bg-black text-white rounded"><CheckCircle2 size={14}/></button>
                       </div>
                   )}
                </div>
                
                {/* Eisenhower Matrix Mini */}
                <MonoCard className="min-h-[200px] flex flex-col" accent={user?.preferences.accent}>
                    <h3 className="text-xs font-bold uppercase mb-2">{t('eisenhower')}</h3>
                    <div className="grid grid-cols-2 gap-1 flex-1">
                        <div className="bg-red-100 dark:bg-red-900/20 p-1 text-[10px]">Do First</div>
                        <div className="bg-blue-100 dark:bg-blue-900/20 p-1 text-[10px]">Schedule</div>
                        <div className="bg-yellow-100 dark:bg-yellow-900/20 p-1 text-[10px]">Delegate</div>
                        <div className="bg-gray-100 dark:bg-gray-800 p-1 text-[10px]">Delete</div>
                    </div>
                </MonoCard>
             </div>

             {/* CENTER: Timer */}
             <div className="lg:col-span-6 space-y-6 relative">
                {/* Focus Shield Overlay */}
                {focusShieldActive && (
                    <div className="absolute inset-0 z-50 bg-black/80 blur-shield flex flex-col items-center justify-center text-white text-center p-8 rounded-xl animate-fade-in">
                        <Shield size={64} className="mb-4 text-red-500 animate-pulse"/>
                        <h2 className="text-4xl font-bold font-display">{t('focusShield')}</h2>
                        <p className="text-lg">Get back to work!</p>
                    </div>
                )}

                {/* Zen Mode Toggle */}
                {!timer.isZenMode && (
                    <div className="flex justify-end gap-2">
                        <button onClick={() => setTimer(p => ({...p, isZenMode: !p.isZenMode}))} className="text-xs uppercase font-bold flex items-center gap-1 opacity-50 hover:opacity-100">
                            <Eye size={14} /> {t('zenMode')}
                        </button>
                        <button onClick={() => setTimer(p => ({...p, isBattleMode: !p.isBattleMode}))} className={`text-xs uppercase font-bold flex items-center gap-1 ${timer.isBattleMode ? 'text-red-500' : 'opacity-50 hover:opacity-100'}`}>
                            <Sword size={14} /> {t('battleMode')}
                        </button>
                    </div>
                )}

                <MonoCard className="min-h-[400px] flex flex-col items-center justify-center relative" accent={user?.preferences.accent}>
                   {timer.isZenMode ? (
                       <div className="fixed inset-0 z-50 bg-black text-white flex items-center justify-center cursor-pointer" onClick={() => setTimer(p => ({...p, isZenMode: false}))}>
                            <div className="text-[15vw] font-bold font-mono">{Math.floor(timer.timeLeft / 60)}:{String(timer.timeLeft % 60).padStart(2, '0')}</div>
                       </div>
                   ) : (
                       <>
                           {/* Battle Mode Boss */}
                           {timer.isBattleMode && activeBoss && (
                               <div className="absolute top-0 left-0 w-full p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200">
                                   <div className="flex justify-between items-center mb-2">
                                       <span className="font-bold flex items-center gap-2 text-red-600">{activeBoss.image} {activeBoss.name}</span>
                                       <span className="text-xs font-mono">{activeBoss.hp}/{activeBoss.maxHp} HP</span>
                                   </div>
                                   <div className="w-full h-2 bg-red-200 rounded-full">
                                       <div className="h-full bg-red-600 transition-all duration-500" style={{width: `${(activeBoss.hp / activeBoss.maxHp) * 100}%`}} />
                                   </div>
                               </div>
                           )}

                            {/* Ambience Controls */}
                            <div className="absolute top-4 right-4 flex flex-col items-end gap-4 z-10">
                                <div className="flex gap-2">
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
                                {activeSoundId && (
                                    <div className="flex items-center gap-2 animate-fade-in bg-gray-100 dark:bg-[#222] p-2 rounded-lg">
                                        <Volume2 size={14} />
                                        <input type="range" min="0" max="1" step="0.1" value={volume} onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-20 h-1 accent-black dark:accent-white" />
                                    </div>
                                )}
                            </div>

                            <div className="text-[7rem] sm:text-[9rem] font-display font-bold leading-none tracking-tighter tabular-nums">
                                {Math.floor(timer.timeLeft / 60)}:{String(timer.timeLeft % 60).padStart(2, '0')}
                            </div>
                            
                            <div className="flex gap-4 mt-8">
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
                                        <button onClick={handleFinishSession} className="p-4 rounded-full border border-red-200 text-red-500"><Square size={20} fill="currentColor"/></button>
                                    </>
                                )}
                            </div>
                       </>
                   )}
                </MonoCard>

                {/* MOOD CHECK */}
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
                                        // Post mood logic can be saved here
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

                {/* NOTES */}
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
                          <button onClick={() => setTypingSound(!typingSound)} className={`text-xs flex items-center gap-1 ${typingSound ? 'font-bold' : 'opacity-50'}`}><Zap size={12}/> {t('typingAsmr')}</button>
                          <button onClick={submitSession} disabled={aiLoading} className="py-3 px-8 bg-black dark:bg-white text-white dark:text-black font-bold uppercase">
                            {aiLoading ? t('loadingAi') : t('saveSession')}
                          </button>
                      </div>
                   </MonoCard>
                )}
                
                {/* ANALYSIS */}
                {sessionStep === 'analysis' && lastSession?.aiAnalysis && (
                    <MonoCard className="animate-fade-in" accent={user?.preferences.accent}>
                        <div className="flex justify-between items-start border-b border-gray-100 pb-4 mb-4">
                            <div>
                            <div className="text-4xl font-bold" style={{color: 'var(--accent-color)'}}>{lastSession.aiAnalysis.grade}</div>
                            <div className="text-xs text-gray-500 uppercase">{t('grade')}</div>
                            </div>
                            <div className="text-right max-w-[200px]">
                            <div className="text-sm font-medium leading-tight">{lastSession.aiAnalysis.summary}</div>
                            </div>
                        </div>
                        <button onClick={() => setSessionStep('idle')} className="w-full py-3 bg-gray-100 dark:bg-[#222] font-bold uppercase hover:bg-gray-200 dark:hover:bg-[#333]">
                        {t('done')}
                        </button>
                    </MonoCard>
                )}
             </div>
             
             {/* RIGHT: Stats */}
             <div className="lg:col-span-3 space-y-4">
                <MonoCard accent={user?.preferences.accent}>
                   <div className="text-xs font-bold uppercase text-gray-400 mb-2">Level {user?.level}</div>
                   <div className="text-4xl font-bold">{user?.xp} XP</div>
                   <div className="w-full h-1 bg-gray-100 dark:bg-[#222] mt-4 rounded-full overflow-hidden">
                      <div className="h-full bg-[var(--accent-color)]" style={{width: `${(user!.xp % 1000)/10}%`}} />
                   </div>
                </MonoCard>
                
                <MonoCard accent={user?.preferences.accent}>
                    <h3 className="text-xs font-bold uppercase mb-2">{t('timeline')}</h3>
                    {renderTimeline()}
                </MonoCard>

                <button onClick={() => setEyeYogaActive(true)} className="w-full py-3 border rounded-xl flex items-center justify-center gap-2 font-bold hover:bg-gray-50 dark:hover:bg-[#111]">
                    <Eye size={16}/> {t('eyeYoga')}
                </button>
             </div>
          </div>
  );

  const renderAiLab = () => (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 animate-slide-up">
          <div className="lg:col-span-1 space-y-2">
              {['explain', 'plan', 'essay', 'podcast', 'concept', 'exam'].map(m => (
                  <button 
                    key={m} 
                    onClick={() => { setAiToolMode(m as any); setAiToolOutput(null); setAiToolInput(''); }}
                    className={`w-full text-left p-4 rounded-lg border font-bold uppercase transition-all ${aiToolMode === m ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-transparent hover:bg-gray-100 dark:hover:bg-[#222]'}`}
                  >
                    {t(m === 'explain' ? 'explainConcept' : m === 'plan' ? 'studyPlanner' : m === 'essay' ? 'essayGrader' : m === 'podcast' ? 'podcastGen' : m === 'concept' ? 'conceptMap' : 'examSim')}
                  </button>
              ))}
          </div>
          
          <div className="lg:col-span-3">
              <MonoCard accent={user?.preferences.accent}>
                <textarea 
                    value={aiToolInput}
                    onChange={e => setAiToolInput(e.target.value)}
                    className="w-full h-32 bg-transparent border-b border-gray-200 dark:border-[#333] resize-none outline-none text-lg font-display"
                    placeholder={aiToolMode === 'exam' ? 'Enter subject to generate exam...' : t('explainPlaceholder')}
                />
                <div className="flex justify-end mt-4">
                    <button 
                        onClick={handleAiToolSubmit} 
                        disabled={aiLoading}
                        className="px-6 py-2 bg-black text-white dark:bg-white dark:text-black font-bold uppercase rounded-full disabled:opacity-50"
                    >
                        {aiLoading ? <Activity className="animate-spin" /> : <ArrowRight />}
                    </button>
                </div>
              </MonoCard>

              {aiToolOutput && (
                  <MonoCard className="mt-6 animate-fade-in" accent={user?.preferences.accent}>
                      {aiToolMode === 'concept' ? (
                          <div className="h-[300px] relative border border-gray-100 dark:border-[#333] rounded-lg overflow-hidden">
                              {(aiToolOutput as ConceptMapData).edges.map((e, i) => {
                                  const from = (aiToolOutput as ConceptMapData).nodes.find(n => n.id === e.from);
                                  const to = (aiToolOutput as ConceptMapData).nodes.find(n => n.id === e.to);
                                  if(!from || !to) return null;
                                  return (
                                      <svg key={i} className="absolute inset-0 w-full h-full pointer-events-none">
                                          <line x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="currentColor" strokeWidth="1" className="opacity-20" />
                                      </svg>
                                  )
                              })}
                              {(aiToolOutput as ConceptMapData).nodes.map(n => (
                                  <div key={n.id} className="absolute w-24 h-24 rounded-full bg-white dark:bg-black border border-current flex items-center justify-center text-xs text-center p-2 font-bold shadow-lg" style={{left: n.x - 48, top: n.y - 48}}>
                                      {n.label}
                                  </div>
                              ))}
                          </div>
                      ) : aiToolMode === 'exam' ? (
                          <div className="space-y-6">
                              <h3 className="text-xl font-bold">Exam Simulator</h3>
                              {(aiToolOutput as ExamQuestion[]).map((q, i) => (
                                  <div key={i} className="p-4 border rounded-lg">
                                      <div className="font-bold mb-2">{i+1}. {q.question}</div>
                                      {q.options && (
                                          <div className="space-y-2">
                                              {q.options.map((opt, idx) => (
                                                  <button key={idx} className="block w-full text-left p-2 hover:bg-gray-100 dark:hover:bg-[#222] rounded border border-transparent hover:border-gray-200">
                                                      {opt}
                                                  </button>
                                              ))}
                                          </div>
                                      )}
                                  </div>
                              ))}
                          </div>
                      ) : (
                          <div className="prose dark:prose-invert max-w-none whitespace-pre-line font-sans">
                              {typeof aiToolOutput === 'string' ? aiToolOutput : JSON.stringify(aiToolOutput, null, 2)}
                              
                              {aiToolMode === 'podcast' && (
                                  <button onClick={() => {
                                      const msg = new SpeechSynthesisUtterance(aiToolOutput as string);
                                      window.speechSynthesis.speak(msg);
                                  }} className="mt-4 flex items-center gap-2 text-xs font-bold uppercase"><Play size={14}/> Listen</button>
                              )}
                          </div>
                      )}
                  </MonoCard>
              )}
          </div>
      </div>
  );

  const renderGameCenter = () => (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-slide-up">
          <div className="lg:col-span-3 flex gap-2 mb-4">
              {['market', 'pet', 'garden', 'legacy'].map(tab => (
                  <button 
                    key={tab} 
                    onClick={() => setGameSubTab(tab as any)}
                    className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${gameSubTab === tab ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}
                  >
                      {t(tab === 'market' ? 'market' : tab === 'pet' ? 'pet' : tab === 'garden' ? 'Brain Garden' : 'Legacy')}
                  </button>
              ))}
          </div>

          {gameSubTab === 'market' && (
            <>
                <MonoCard accent={user?.preferences.accent} className="lg:col-span-1">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-xl">{t('market')}</h3>
                        <div className="text-xs font-mono">{user?.coins} Coins</div>
                    </div>
                    <div className="space-y-3">
                        {stocks.map(stock => (
                            <div key={stock.symbol} className="flex justify-between items-center p-3 border rounded-lg">
                                <div>
                                    <div className="font-bold">{stock.symbol}</div>
                                    <div className="text-xs opacity-50">{stock.name}</div>
                                </div>
                                <div className="text-right">
                                    <div className={`font-mono ${stock.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>${stock.price.toFixed(2)}</div>
                                    <button className="text-[10px] bg-black text-white dark:bg-white dark:text-black px-2 py-1 rounded mt-1">{t('buy')}</button>
                                </div>
                            </div>
                        ))}
                    </div>
                </MonoCard>

                <MonoCard accent={user?.preferences.accent} className="lg:col-span-2">
                    <h3 className="font-bold text-xl mb-4">{t('shop')}</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {SHOP_ITEMS.map(item => (
                            <div key={item.id} onClick={() => buyItem(item)} className="border rounded-xl p-4 flex flex-col items-center justify-between gap-4 hover:border-black dark:hover:border-white cursor-pointer transition-all">
                                <div className="bg-gray-100 dark:bg-[#222] p-3 rounded-full">{item.icon}</div>
                                <div className="text-center">
                                    <div className="font-bold text-sm">{item.name}</div>
                                    <div className="text-xs opacity-50 font-mono">{item.cost}c</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </MonoCard>
            </>
          )}

          {gameSubTab === 'pet' && user?.pet && (
              <MonoCard accent={user?.preferences.accent} className="lg:col-span-3 flex flex-col items-center justify-center py-12">
                  <div className="w-48 h-48 bg-gray-100 dark:bg-[#222] rounded-full flex items-center justify-center text-6xl animate-float mb-8 relative">
                      {user.pet.stage === 'egg' ? '🥚' : user.pet.stage === 'baby' ? '🐣' : user.pet.stage === 'teen' ? '🐥' : '🦅'}
                      {user.pet.hunger < 50 && <div className="absolute -top-4 right-0 text-2xl animate-bounce">🥩?</div>}
                  </div>
                  <h2 className="text-3xl font-display font-bold mb-2">{user.pet.name}</h2>
                  <div className="flex gap-4 mb-8 text-sm font-mono uppercase">
                      <div>Lvl {Math.floor(user.pet.xp / 100)}</div>
                      <div>{user.pet.type} Type</div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-8 w-full max-w-md mb-8">
                      <div>
                          <div className="flex justify-between text-xs mb-1 font-bold">HUNGER</div>
                          <div className="h-2 bg-gray-200 dark:bg-[#333] rounded-full overflow-hidden">
                              <div className="h-full bg-red-500" style={{width: `${user.pet.hunger}%`}} />
                          </div>
                      </div>
                      <div>
                          <div className="flex justify-between text-xs mb-1 font-bold">HAPPINESS</div>
                          <div className="h-2 bg-gray-200 dark:bg-[#333] rounded-full overflow-hidden">
                              <div className="h-full bg-green-500" style={{width: `${user.pet.happiness}%`}} />
                          </div>
                      </div>
                  </div>
                  
                  <button onClick={() => buyItem({id: 'pet_food', name: 'Food', cost: 20, type: 'consumable', icon: null})} className="px-8 py-3 bg-black text-white dark:bg-white dark:text-black rounded-full font-bold uppercase">
                      Feed (20c)
                  </button>
              </MonoCard>
          )}

          {gameSubTab === 'garden' && (
              <MonoCard accent={user?.preferences.accent} className="lg:col-span-3">
                  <div className="flex items-center gap-4 mb-6">
                      <Leaf size={24} />
                      <h3 className="text-2xl font-bold">Brain Garden</h3>
                  </div>
                  <div className="grid grid-cols-4 md:grid-cols-8 gap-4">
                      {user?.subjects.map(sub => {
                          const trees = Math.floor(sub.totalMinutes / 60);
                          return (
                              <div key={sub.id} className="aspect-square border border-dashed border-gray-300 dark:border-[#333] rounded-lg flex flex-col items-center justify-center p-2 hover:bg-gray-50 dark:hover:bg-[#111] transition-colors">
                                  <div className="text-2xl mb-2">{trees > 10 ? '🌳' : trees > 5 ? '🌲' : trees > 0 ? '🌱' : '🕳️'}</div>
                                  <div className="text-[10px] font-bold uppercase text-center truncate w-full">{sub.name}</div>
                                  <div className="text-[9px] font-mono opacity-50">{trees} Trees</div>
                              </div>
                          )
                      })}
                  </div>
              </MonoCard>
          )}

          {gameSubTab === 'legacy' && (
              <MonoCard accent={user?.preferences.accent} className="lg:col-span-3 flex flex-col items-center justify-center py-12 text-center">
                  <Archive size={48} className="mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold mb-2">Time Capsule</h3>
                  <p className="text-gray-500 mb-8 max-w-md">Write a letter to your future self. It will remain locked until you reach 1,000 total study hours.</p>
                  
                  {((user?.sessions.reduce((acc, s) => acc + s.durationMinutes, 0) || 0) / 60) >= 1000 ? (
                      <div className="p-8 border border-green-500 rounded-xl">
                          <h4 className="font-bold text-green-500 mb-4">UNLOCKED</h4>
                          <textarea className="w-full h-32 bg-transparent outline-none" placeholder="Write your legacy..."></textarea>
                      </div>
                  ) : (
                      <div className="flex items-center gap-2 px-6 py-3 bg-gray-100 dark:bg-[#222] rounded-lg font-mono text-sm">
                          <Clock size={14} />
                          <span>Locked. Current Progress: {Math.floor((user?.sessions.reduce((acc, s) => acc + s.durationMinutes, 0) || 0) / 60)} / 1000 Hours</span>
                      </div>
                  )}
              </MonoCard>
          )}
      </div>
  );

  const renderSocial = () => (
      <div className="space-y-6 animate-slide-up">
          <div className="flex gap-2">
              <button onClick={() => setSocialSubTab('lounge')} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${socialSubTab === 'lounge' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>Lounge</button>
              <button onClick={() => setSocialSubTab('leaderboard')} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${socialSubTab === 'leaderboard' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>Leaderboard</button>
              <button onClick={() => setSocialSubTab('guilds')} className={`px-4 py-2 rounded-full text-sm font-bold uppercase ${socialSubTab === 'guilds' ? 'bg-black text-white dark:bg-white dark:text-black' : 'bg-gray-100 dark:bg-[#222]'}`}>Guilds</button>
          </div>

          {socialSubTab === 'lounge' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <MonoCard accent={user?.preferences.accent}>
                    <h3 className="font-bold text-xl mb-4">{t('lounge')}</h3>
                    <div className="space-y-2">
                        {[1,2,3,4,5].map(i => (
                            <div key={i} className="flex items-center gap-3 p-2 border-b border-gray-50 dark:border-[#222]">
                                <div className="w-8 h-8 rounded-full bg-gray-200 dark:bg-[#333] animate-pulse"/>
                                <div className="flex-1">
                                    <div className="w-24 h-3 bg-gray-200 dark:bg-[#333] rounded animate-pulse mb-1"/>
                                    <div className="w-12 h-2 bg-gray-100 dark:bg-[#444] rounded animate-pulse"/>
                                </div>
                                <div className="text-xs font-bold text-green-500">Studying</div>
                            </div>
                        ))}
                    </div>
                </MonoCard>
                <MonoCard accent={user?.preferences.accent} className="flex flex-col items-center justify-center text-center p-8">
                    <Users size={48} className="mb-4 opacity-20"/>
                    <h3 className="font-bold text-lg">Join a Room</h3>
                    <p className="text-sm opacity-50 mb-6">Study with others in real-time (Coming Soon)</p>
                    <button className="px-6 py-2 border rounded-full font-bold uppercase hover:bg-black hover:text-white transition-colors">Find Room</button>
                </MonoCard>
              </div>
          )}
          
          {socialSubTab === 'leaderboard' && (
              <MonoCard accent={user?.preferences.accent}>
                  <div className="flex items-center gap-4 mb-8">
                    <Trophy size={32} />
                    <h2 className="text-2xl font-bold">{t('leaderboard')}</h2>
                    </div>
                    <div className="space-y-2">
                    {leaderboard.map((entry, idx) => (
                        <div key={idx} className={`flex items-center justify-between p-4 rounded-lg transition-colors ${entry.isCurrentUser ? 'bg-black text-white dark:bg-white dark:text-black' : 'border-b border-gray-100 dark:border-[#222] hover:bg-gray-50 dark:hover:bg-[#111]'}`}>
                            <div className="flex items-center gap-4">
                                <div className="font-mono font-bold text-xl w-8">#{idx+1}</div>
                                <div className="font-bold">{entry.username}</div>
                            </div>
                            <div className="font-mono">{entry.xp} XP</div>
                        </div>
                    ))}
                  </div>
              </MonoCard>
          )}

          {socialSubTab === 'guilds' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {guilds.map(guild => (
                      <MonoCard key={guild.id} accent={user?.preferences.accent} className="relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-4 text-6xl opacity-10">{guild.banner}</div>
                          <h3 className="text-xl font-bold mb-1">{guild.banner} {guild.name}</h3>
                          <div className="flex gap-4 text-xs font-mono opacity-60 mb-4">
                              <span>{guild.members} Members</span>
                              <span>{guild.totalXp} Guild XP</span>
                          </div>
                          <button className="w-full py-2 border border-black dark:border-white rounded font-bold uppercase hover:bg-black hover:text-white dark:hover:bg-white dark:hover:text-black transition-colors">Join Guild</button>
                      </MonoCard>
                  ))}
                  <MonoCard className="flex items-center justify-center border-dashed" onClick={() => alert("Create Guild Modal")}>
                      <div className="flex items-center gap-2 font-bold uppercase opacity-50 hover:opacity-100 cursor-pointer">
                          <Plus size={20} /> Create Guild
                      </div>
                  </MonoCard>
              </div>
          )}
      </div>
  );

  // --- MAIN RENDER ---
  if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black"><div className="w-8 h-8 border-4 border-black dark:border-white border-t-transparent rounded-full animate-spin"/></div>;
  if (!user) return renderAuth();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#050505] text-black dark:text-white transition-colors duration-500 font-sans">
      
      {/* NAV */}
      <nav className="fixed top-0 w-full h-16 bg-white/90 dark:bg-black/90 backdrop-blur-md border-b border-gray-200 dark:border-[#222] z-40 px-6 flex items-center justify-between">
         <div className="font-display font-bold text-xl tracking-tight">LUMINA</div>
         <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {[
                {id: 'focus', icon: Book}, 
                {id: 'ai_lab', icon: Brain}, 
                {id: 'game_center', icon: Gamepad2}, 
                {id: 'social', icon: Users}
            ].map(tab => (
                <button 
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id as any); if(tab.id==='social') FirebaseService.getLeaderboard().then(setLeaderboard); }} 
                    className={`px-4 py-2 rounded-full text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id ? 'bg-black text-white dark:bg-white dark:text-black' : 'text-gray-400 hover:text-black dark:hover:text-white'}`}
                >
                    <tab.icon size={16}/> <span className="hidden sm:inline">{t(tab.id)}</span>
                </button>
            ))}
         </div>
         <div className="flex items-center gap-4">
            <div className="text-xs font-mono hidden sm:block">{user.coins}c</div>
            <button onClick={() => setShowSettings(true)} className="hover:rotate-90 transition-transform duration-500"><Settings size={18}/></button>
         </div>
      </nav>

      {/* EYE YOGA OVERLAY */}
      {eyeYogaActive && (
          <div className="fixed inset-0 z-[70] bg-black/90 flex items-center justify-center" onClick={() => setEyeYogaActive(false)}>
              <div className="w-8 h-8 bg-white rounded-full animate-float"/>
          </div>
      )}

      {/* SETTINGS MODAL */}
      {showSettings && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 backdrop-blur-sm" onClick={() => setShowSettings(false)}>
            <div className="bg-white dark:bg-[#111] w-full max-w-md p-8 rounded-2xl border border-gray-200 dark:border-[#333] space-y-6" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-center">
                    <h2 className="text-2xl font-bold font-display">{t('settings')}</h2>
                    <button onClick={() => setShowSettings(false)}><X size={24} /></button>
                </div>
                
                <div className="space-y-4">
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

                    <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-[#333] rounded-xl">
                        <div className="flex items-center gap-3">
                            <Palette size={20} />
                            <span className="font-medium">{t('accentColor')}</span>
                        </div>
                        <div className="flex gap-1">
                            {Object.keys(ACCENT_COLORS).map(color => (
                                <button 
                                    key={color}
                                    onClick={() => {
                                        const u = {...user, preferences: {...user.preferences, accent: color as AccentColor}};
                                        setUser(u);
                                        FirebaseService.updateUser(u);
                                    }}
                                    className="w-6 h-6 rounded-full border border-gray-300"
                                    style={{backgroundColor: ACCENT_COLORS[color as AccentColor]}}
                                />
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-between items-center p-4 border border-gray-200 dark:border-[#333] rounded-xl">
                        <div className="flex items-center gap-3">
                            <Globe size={20} />
                            <span className="font-medium">{t('language')}</span>
                        </div>
                        <button onClick={() => {
                            const u = {...user, preferences: {...user.preferences, language: user.preferences.language === Language.EN ? Language.HU : Language.EN}};
                            setUser(u);
                            FirebaseService.updateUser(u);
                        }} className="px-4 py-2 bg-gray-100 dark:bg-[#222] rounded-lg font-bold text-sm">
                            {user.preferences.language}
                        </button>
                    </div>

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

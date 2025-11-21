
import React from 'react';

export enum Language {
  EN = 'EN',
  HU = 'HU'
}

export type AccentColor = string; // Allow custom hex strings

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface Achievement {
  id: string;
  title: { en: string; hu: string };
  description: { en: string; hu: string };
  icon: React.ReactNode;
  condition: (user: User) => boolean;
}

export interface Subject {
  id: string;
  name: string;
  totalMinutes: number;
  sessionsCount: number;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export interface ExamQuestion {
  id: number;
  question: string;
  type: 'multiple_choice' | 'essay';
  options?: string[];
  correctIndex?: number;
}

export interface Flashcard {
  id: string; 
  subjectId: string; 
  front: string;
  back: string;
  nextReviewDate: number; 
  interval: number; 
  ease: number; 
  repetitions: number;
}

export interface Quest {
  id: string;
  description: string;
  xpReward: number;
  isCompleted: boolean;
  target: number;
  progress: number;
  type: 'minutes' | 'sessions' | 'score';
}

export interface AiAnalysis {
  summary: string;
  score: number;
  grade: 'S' | 'A' | 'B' | 'C' | 'D';
  keyTakeaways: string[];
}

export interface StudySession {
  id: string;
  subjectId: string;
  durationMinutes: number;
  timestamp: number;
  notes: string;
  mood?: 'happy' | 'neutral' | 'tired' | 'stressed';
  distractionCount?: number;
  aiAnalysis?: AiAnalysis;
  quiz?: {
    questions: QuizQuestion[];
    userScore?: number; 
  };
  flashcards?: Flashcard[];
}

// --- GAMIFICATION TYPES ---

export interface Boss {
  id: string;
  name: string;
  hp: number;
  maxHp: number;
  level: number;
  image: string; 
  description: string;
}

export interface Pet {
  name: string;
  stage: 'egg' | 'baby' | 'teen' | 'adult';
  xp: number;
  type: 'geometry' | 'organic' | 'mech' | 'void'; 
  hunger: number;
  happiness: number;
}

export interface Stock {
  symbol: string;
  name: string;
  price: number;
  trend: 'up' | 'down' | 'flat';
  owned: number;
}

export interface ShopItem {
  id: string;
  name: string;
  cost: number;
  icon: React.ReactNode;
  type: 'consumable' | 'cosmetic';
  effect?: string;
}

export interface ChatMessage {
  id: string;
  userId: string;
  username: string;
  text: string;
  timestamp: number;
}

export interface Guild {
  id: string;
  name: string;
  members: number;
  totalXp: number;
  banner: string;
  chat?: ChatMessage[]; 
}

export interface SkillNode {
  id: string;
  label: string;
  description: string;
  requiredLevel: number;
  icon: string;
  parentId?: string;
}

// --- UTILITY TYPES ---

export interface Todo {
  id: string;
  text: string;
  quadrant: 'q1' | 'q2' | 'q3' | 'q4'; // Urgent/Important matrix
  completed: boolean;
}

// --- AI LAB TYPES ---

export interface ConceptNode {
  id: string;
  label: string;
  x: number;
  y: number;
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export interface ConceptMapData {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning';
}

export interface User {
  id: string;
  username: string;
  email?: string;
  level: number;
  xp: number;
  streak: number;
  coins: number; 
  lastStudyDate: number | null;
  lastLoginDate?: number;
  subjects: Subject[];
  sessions: StudySession[];
  quests: Quest[];
  lastQuestGeneration: number;
  preferences: {
    darkMode: boolean;
    language: Language;
    accent: AccentColor;
    focusDuration: number;
    shortBreakDuration: number;
    longBreakDuration: number;
    enableNativeNotifications?: boolean;
  };
  createdAt: number;
  unlockedAchievements: string[];
  passwordHash?: string;
  hasSeenOnboarding?: boolean;
  
  // New Features
  pet?: Pet;
  avatar?: string;
  inventory: string[]; 
  stocks: { [symbol: string]: number }; 
  activeBoss?: Boss;
  guildId?: string;
  todoList: Todo[];
  
  // SRS & Effects
  masterDeck: Flashcard[];
  xpBoostExpiresAt?: number; 
  streakFreezeActive?: boolean;
  
  legacy?: {
      note: string;
      unlockDate: number;
      isLocked: boolean;
  };
}

export interface TimerState {
  timeLeft: number;
  isActive: boolean;
  mode: 'focus' | 'shortBreak' | 'longBreak';
  subjectId: string | null;
  isZenMode: boolean;
  isBattleMode: boolean;
}

export interface MonoCardProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
  noPadding?: boolean;
  accent?: AccentColor;
}

export interface LeaderboardEntry {
  username: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
}


import React from 'react';

export enum Language {
  EN = 'EN',
  HU = 'HU'
}

export type AccentColor = 'monochrome' | 'neon-green' | 'electric-blue' | 'crimson-red' | 'cyber-yellow';

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
  id: string; // Added ID for global tracking
  subjectId: string; // Link to subject
  front: string;
  back: string;
  nextReviewDate: number; // SRS timestamp
  interval: number; // SRS interval in days
  ease: number; // SRS ease factor
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
  image: string; // emoji or url
  description: string;
}

export interface Pet {
  name: string;
  stage: 'egg' | 'baby' | 'teen' | 'adult';
  xp: number;
  type: 'geometry' | 'organic' | 'mech' | 'void'; // Based on subject
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

export interface Guild {
  id: string;
  name: string;
  members: number;
  totalXp: number;
  banner: string;
  chat?: { user: string, msg: string }[]; // Simulated chat
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

export interface User {
  id: string;
  username: string;
  email?: string;
  level: number;
  xp: number;
  streak: number;
  coins: number; // New currency for shop
  lastStudyDate: number | null;
  subjects: Subject[];
  sessions: StudySession[];
  quests: Quest[];
  lastQuestGeneration: number;
  preferences: {
    darkMode: boolean;
    language: Language;
    accent: AccentColor;
  };
  createdAt: number;
  unlockedAchievements: string[];
  passwordHash?: string;
  
  // New Features
  pet?: Pet;
  inventory: string[]; // Shop item IDs
  stocks: { [symbol: string]: number }; // Owned stocks
  activeBoss?: Boss;
  guildId?: string;
  
  // SRS & Effects
  masterDeck: Flashcard[];
  xpBoostExpiresAt?: number; // Timestamp
  streakFreezeActive?: boolean;
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
  onClick?: () => void;
  noPadding?: boolean;
  accent?: AccentColor;
}

export interface LeaderboardEntry {
  username: string;
  xp: number;
  level: number;
  isCurrentUser: boolean;
}

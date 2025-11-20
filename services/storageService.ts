
import { User, StudySession, Subject, Language } from '../types';
import { DEFAULT_SUBJECTS } from '../constants';

const DB_KEY = 'lumina_db_v1';
const CURRENT_USER_ID_KEY = 'lumina_active_user_id';

interface Database {
  users: User[];
}

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize DB if empty
const getDB = (): Database => {
  const stored = localStorage.getItem(DB_KEY);
  if (!stored) return { users: [] };
  return JSON.parse(stored);
};

const saveDB = (db: Database) => {
  localStorage.setItem(DB_KEY, JSON.stringify(db));
};

export const StorageService = {
  // --- AUTH ---
  async register(username: string, password: string): Promise<User> {
    await delay(800); // Fake loading
    const db = getDB();
    
    if (db.users.find(u => u.username === username)) {
      throw new Error("Username already exists");
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      passwordHash: btoa(password), // Simple mock encoding
      level: 1,
      xp: 0,
      streak: 0,
      coins: 0,
      inventory: [],
      stocks: {},
      lastStudyDate: null,
      subjects: DEFAULT_SUBJECTS.map(s => ({...s, sessionsCount: 0})),
      sessions: [],
      quests: [],
      lastQuestGeneration: 0,
      unlockedAchievements: [],
      preferences: { darkMode: false, language: Language.EN, accent: 'monochrome' },
      createdAt: Date.now()
    };

    db.users.push(newUser);
    saveDB(db);
    localStorage.setItem(CURRENT_USER_ID_KEY, newUser.id);
    return newUser;
  },

  async login(username: string, password: string): Promise<User> {
    await delay(600);
    const db = getDB();
    const user = db.users.find(u => u.username === username && u.passwordHash === btoa(password));
    
    if (!user) throw new Error("Invalid credentials");
    
    localStorage.setItem(CURRENT_USER_ID_KEY, user.id);
    return user;
  },

  async logout(): Promise<void> {
    localStorage.removeItem(CURRENT_USER_ID_KEY);
  },

  async getCurrentUser(): Promise<User | null> {
    const id = localStorage.getItem(CURRENT_USER_ID_KEY);
    if (!id) return null;
    const db = getDB();
    return db.users.find(u => u.id === id) || null;
  },

  // --- DATA OPERATIONS ---
  async saveSession(userId: string, session: StudySession): Promise<User> {
    await delay(400);
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    const user = db.users[userIndex];
    
    // Update Session History
    user.sessions.push(session);

    // Update Subject Stats
    const subIndex = user.subjects.findIndex(s => s.id === session.subjectId);
    if (subIndex >= 0) {
      user.subjects[subIndex].totalMinutes += session.durationMinutes;
      user.subjects[subIndex].sessionsCount += 1;
    }

    // Calculate Streak
    const now = new Date();
    const lastDate = user.lastStudyDate ? new Date(user.lastStudyDate) : null;
    
    if (!lastDate) {
      user.streak = 1;
    } else {
      const diffTime = Math.abs(now.getTime() - lastDate.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      
      if (now.getDate() !== lastDate.getDate()) {
        if (diffDays <= 2) { // Allows for yesterday
           user.streak += 1;
        } else {
           user.streak = 1; // Reset
        }
      }
    }
    user.lastStudyDate = Date.now();

    // Calculate XP & Level
    // Base XP: 10 per minute
    // Bonus: +50 per quiz question right (handled separately usually, but simple here)
    // Bonus: +100 if Grade A/S
    let xpGain = session.durationMinutes * 10;
    if (session.aiAnalysis && (session.aiAnalysis.grade === 'S' || session.aiAnalysis.grade === 'A')) {
      xpGain += 100;
    }

    user.xp += xpGain;
    // Level formula: 100 * level^1.5
    const nextLevelReq = Math.floor(100 * Math.pow(user.level, 1.5));
    if (user.xp >= nextLevelReq) {
      user.level += 1;
    }

    db.users[userIndex] = user;
    saveDB(db);
    return user;
  },

  async updateSubject(userId: string, subjectName: string): Promise<User> {
    await delay(300);
    const db = getDB();
    const userIndex = db.users.findIndex(u => u.id === userId);
    if (userIndex === -1) throw new Error("User not found");

    const newSubject: Subject = {
      id: Date.now().toString(),
      name: subjectName,
      totalMinutes: 0,
      sessionsCount: 0
    };

    db.users[userIndex].subjects.push(newSubject);
    saveDB(db);
    return db.users[userIndex];
  }
};

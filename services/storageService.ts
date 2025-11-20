
import { User, StudySession, Subject, Language, Guild, LeaderboardEntry } from '../types';
import { DEFAULT_SUBJECTS } from '../constants';

const DB_KEY = 'lumina_db_v2';
const CURRENT_USER_ID_KEY = 'lumina_active_user_id';
const GUILDS_KEY = 'lumina_guilds_db';

interface Database {
  users: User[];
  guilds: Guild[];
}

// Helper to simulate network delay
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Initialize DB if empty
const getDB = (): Database => {
  const stored = localStorage.getItem(DB_KEY);
  const storedGuilds = localStorage.getItem(GUILDS_KEY);
  
  const users = stored ? JSON.parse(stored).users : [];
  const guilds = storedGuilds ? JSON.parse(storedGuilds) : [];
  
  return { users, guilds };
};

const saveDB = (db: Database) => {
  localStorage.setItem(DB_KEY, JSON.stringify({ users: db.users }));
  localStorage.setItem(GUILDS_KEY, JSON.stringify(db.guilds));
};

export const StorageService = {
  // --- AUTH ---
  async register(username: string, password: string): Promise<User> {
    await delay(800); // Fake loading
    const db = getDB();
    
    if (db.users.find(u => u.username === username)) {
      throw new Error("Username already exists (Local)");
    }

    const newUser: User = {
      id: Math.random().toString(36).substr(2, 9),
      username,
      passwordHash: btoa(password),
      level: 1,
      xp: 0,
      streak: 0,
      coins: 0,
      inventory: [],
      stocks: {},
      pet: { name: 'Orb', stage: 'egg', xp: 0, type: 'void', hunger: 100, happiness: 100 },
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
    
    if (!user) throw new Error("Invalid credentials (Local)");
    
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

  // --- GENERIC DATA OPERATIONS ---
  async updateUser(user: User): Promise<void> {
      const db = getDB();
      const idx = db.users.findIndex(u => u.id === user.id);
      if(idx !== -1) {
          db.users[idx] = user;
          saveDB(db);
      }
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
      const db = getDB();
      const currentId = localStorage.getItem(CURRENT_USER_ID_KEY);
      return db.users
        .sort((a, b) => b.xp - a.xp)
        .slice(0, 10)
        .map(u => ({
            username: u.username,
            xp: u.xp,
            level: u.level,
            isCurrentUser: u.id === currentId
        }));
  },

  // --- GUILDS ---
  async getGuilds(): Promise<Guild[]> {
      return getDB().guilds;
  },

  async createGuild(name: string, banner: string, ownerUser: User): Promise<Guild> {
      const db = getDB();
      const newGuild: Guild = {
          id: Date.now().toString(),
          name,
          banner,
          members: 1,
          totalXp: ownerUser.xp
      };
      db.guilds.push(newGuild);
      
      // Update user
      const uIdx = db.users.findIndex(u => u.id === ownerUser.id);
      if(uIdx !== -1) {
          db.users[uIdx].guildId = newGuild.id;
          ownerUser.guildId = newGuild.id; // return updated user ref
      }
      
      saveDB(db);
      return newGuild;
  },

  async joinGuild(guildId: string, user: User): Promise<void> {
      const db = getDB();
      const gIdx = db.guilds.findIndex(g => g.id === guildId);
      const uIdx = db.users.findIndex(u => u.id === user.id);
      
      if(gIdx !== -1 && uIdx !== -1) {
          db.guilds[gIdx].members += 1;
          db.guilds[gIdx].totalXp += user.xp;
          db.users[uIdx].guildId = guildId;
          saveDB(db);
      }
  }
};

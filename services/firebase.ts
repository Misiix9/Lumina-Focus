
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser, Auth } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, Firestore, addDoc } from "firebase/firestore";
import { User, FirebaseConfig, Guild, LeaderboardEntry, Language } from '../types';
import { StorageService } from './storageService';
import { DEFAULT_SUBJECTS } from "../constants";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isInitialized = false;
let useFallback = false; // Flag to track if we are using local storage

export const FirebaseService = {
  
  initialize(config: FirebaseConfig) {
    try {
      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
      isInitialized = true;
      useFallback = false;
      console.log("🔥 Firebase initialized");
      return true;
    } catch (e) {
      console.error("Firebase init failed, switching to Local Storage:", e);
      useFallback = true;
      return true; // Return true so the app continues to load
    }
  },

  isUsingFallback() {
      return useFallback;
  },
  
  async register(email: string, password: string, username: string): Promise<User> {
    if (useFallback) return StorageService.register(username, password);

    try {
        if (!isInitialized || !auth || !db) throw new Error("Firebase not initialized");
        
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser: User = {
          id: userCredential.user.uid,
          username,
          email,
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
        
        await setDoc(doc(db, "users", newUser.id), newUser);
        return newUser;
    } catch (e: any) {
        console.warn("Firebase register failed, falling back:", e.message);
        useFallback = true;
        return StorageService.register(username, password);
    }
  },

  async login(email: string, password: string): Promise<User> {
    if (useFallback) return StorageService.login(email, password); // In fallback, username is treated as email field

    try {
        if (!isInitialized || !auth || !db) throw new Error("Firebase not initialized");
        
        // Firebase requires email, Storage mock uses username. We try both.
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const docRef = doc(db, "users", userCredential.user.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
            return docSnap.data() as User;
        } else {
            throw new Error("User profile not found");
        }
    } catch (e: any) {
        console.warn("Firebase login failed, falling back:", e.message);
        useFallback = true;
        return StorageService.login(email, password);
    }
  },

  async logout() {
    if (useFallback) return StorageService.logout();
    try {
        if (!isInitialized || !auth) return;
        await signOut(auth);
    } catch (e) {
        useFallback = true;
        StorageService.logout();
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (useFallback) return StorageService.getCurrentUser();
    
    try {
        if (!isInitialized || !auth || !db) return null;
        const currentUser = auth.currentUser;
        // If no auth user synchronously, we might need to wait for auth state changed in a real app, 
        // but for this simple impl we check if it exists or fallback to storage
        if (!currentUser) {
            return StorageService.getCurrentUser(); 
        }
        
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        return docSnap.exists() ? docSnap.data() as User : null;
    } catch (e) {
        console.warn("Get Current User failed, fallback:", e);
        useFallback = true;
        return StorageService.getCurrentUser();
    }
  },

  async updateUser(user: User): Promise<void> {
    if (useFallback) return StorageService.updateUser(user);
    try {
        if (!isInitialized || !db) throw new Error("DB not initialized");
        await updateDoc(doc(db, "users", user.id), { ...user });
    } catch (e) {
        console.warn("Update failed, fallback:", e);
        useFallback = true;
        StorageService.updateUser(user);
    }
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (useFallback) return StorageService.getLeaderboard();
    try {
        if (!isInitialized || !db) return [];
        const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(10));
        const snapshot = await getDocs(q);
        const currentUser = auth?.currentUser;
        
        return snapshot.docs.map(d => {
        const data = d.data() as User;
        return {
            username: data.username,
            xp: data.xp,
            level: data.level,
            isCurrentUser: currentUser ? currentUser.uid === data.id : false
        };
        });
    } catch (e) {
        useFallback = true;
        return StorageService.getLeaderboard();
    }
  },

  // --- SOCIAL / GUILDS ---
  async getGuilds(): Promise<Guild[]> {
      if (useFallback) return StorageService.getGuilds();
      try {
          if(!isInitialized || !db) return [];
          const q = query(collection(db, "guilds"), limit(10));
          const snapshot = await getDocs(q);
          return snapshot.docs.map(d => ({id: d.id, ...d.data()} as Guild));
      } catch(e) {
          console.warn("Guild fetch failed, fallback:", e);
          useFallback = true;
          return StorageService.getGuilds();
      }
  },

  async createGuild(name: string, banner: string, ownerUser: User): Promise<Guild> {
      if (useFallback) return StorageService.createGuild(name, banner, ownerUser);
      try {
          if(!isInitialized || !db) throw new Error("DB not ready");
          const newGuild: Omit<Guild, 'id'> = {
              name,
              banner,
              members: 1,
              totalXp: ownerUser.xp
          };
          const docRef = await addDoc(collection(db, "guilds"), newGuild);
          const guild = { id: docRef.id, ...newGuild };
          
          ownerUser.guildId = guild.id;
          await this.updateUser(ownerUser);
          return guild;
      } catch(e) {
          useFallback = true;
          return StorageService.createGuild(name, banner, ownerUser);
      }
  },

  async joinGuild(guildId: string, user: User): Promise<void> {
      if (useFallback) return StorageService.joinGuild(guildId, user);
      try {
          if(!isInitialized || !db) throw new Error("DB not ready");
          
          const guildRef = doc(db, "guilds", guildId);
          const guildSnap = await getDoc(guildRef);
          if(!guildSnap.exists()) throw new Error("Guild not found");
          
          const guildData = guildSnap.data() as Guild;
          await updateDoc(guildRef, {
              members: guildData.members + 1,
              totalXp: guildData.totalXp + user.xp
          });
          
          user.guildId = guildId;
          await this.updateUser(user);
      } catch (e) {
          useFallback = true;
          StorageService.joinGuild(guildId, user);
      }
  }
};

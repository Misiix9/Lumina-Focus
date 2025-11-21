
import { initializeApp, FirebaseApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser, Auth, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs, Firestore, addDoc, where, onSnapshot } from "firebase/firestore";
import { User, FirebaseConfig, Guild, LeaderboardEntry, Language, ChatMessage } from '../types';
import { StorageService } from './storageService';
import { DEFAULT_SUBJECTS } from "../constants";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let isInitialized = false;
let useFallback = false; 

export const FirebaseService = {
  
  initialize(config: FirebaseConfig) {
    try {
      if (!config.apiKey || config.apiKey.includes("mock")) {
          console.log("Using mock/fallback mode due to missing config");
          useFallback = true;
          return true;
      }

      app = initializeApp(config);
      auth = getAuth(app);
      db = getFirestore(app);
      isInitialized = true;
      useFallback = false;
      console.log("🔥 Firebase initialized in Production Mode");
      return true;
    } catch (e) {
      console.error("Firebase init failed:", e);
      return false; 
    }
  },

  isUsingFallback() {
      return useFallback;
  },
  
  _createDefaultUser(id: string, email: string, username: string): User {
      return {
          id,
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
          lastLoginDate: Date.now(),
          subjects: DEFAULT_SUBJECTS.map(s => ({...s, sessionsCount: 0})),
          sessions: [],
          quests: [], 
          lastQuestGeneration: 0,
          unlockedAchievements: [],
          preferences: { 
              darkMode: false, 
              language: Language.EN, 
              accent: 'monochrome',
              focusDuration: 25,
              shortBreakDuration: 5,
              longBreakDuration: 15,
              enableNativeNotifications: false
          },
          createdAt: Date.now(),
          masterDeck: [],
          xpBoostExpiresAt: 0,
          streakFreezeActive: false,
          legacy: { note: '', unlockDate: 0, isLocked: false },
          todoList: [],
          hasSeenOnboarding: false,
          avatar: '👤'
      };
  },

  async register(email: string, password: string, username: string): Promise<User> {
    if (useFallback) return StorageService.register(username, password);

    if (!isInitialized || !auth || !db) throw new Error("Firebase not initialized");
    
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const newUser = this._createDefaultUser(userCredential.user.uid, email, username);
        
        try {
            await setDoc(doc(db, "users", newUser.id), newUser);
        } catch (dbError: any) {
            console.error("DB Creation failed during register:", dbError);
            // Suppress error to allow access
        }
        return newUser;
    } catch (e: any) {
        throw e;
    }
  },

  async login(identifier: string, password: string, rememberMe: boolean = false): Promise<User> {
    if (useFallback) return StorageService.login(identifier, password);

    if (!isInitialized || !auth || !db) throw new Error("Firebase not initialized");
    
    // Handle Persistence
    try {
        await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
    } catch (e) {
        console.warn("Persistence setting failed", e);
    }
    
    let email = identifier;

    if (!identifier.includes('@')) {
        try {
            const q = query(collection(db, "users"), where("username", "==", identifier));
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                email = querySnapshot.docs[0].data().email;
            } else {
                // Failover to prevent confusing error
                throw new Error("Username not found.");
            }
        } catch (queryError: any) {
             throw new Error("Connection issue or Username not found. Please log in with your EMAIL address.");
        }
    }
    
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    
    const docRef = doc(db, "users", userCredential.user.uid);
    let docSnap;
    
    try {
        docSnap = await getDoc(docRef);
    } catch (readError: any) {
        if (readError.code === 'unavailable' || readError.message.includes('offline')) {
             // Allow temp access
             const healedUser = this._createDefaultUser(userCredential.user.uid, userCredential.user.email || email, "TempUser");
             return healedUser;
        }
        throw readError;
    }
    
    if (docSnap.exists()) {
        return docSnap.data() as User;
    } else {
        const healedUser = this._createDefaultUser(
            userCredential.user.uid, 
            userCredential.user.email || email, 
            identifier.includes('@') ? identifier.split('@')[0] : identifier
        );
        await setDoc(docRef, healedUser);
        return healedUser;
    }
  },

  async logout() {
    if (useFallback) return StorageService.logout();
    try {
        if (!isInitialized || !auth) return;
        await signOut(auth);
    } catch (e) {
        console.error("Logout error", e);
    }
  },

  async getCurrentUser(): Promise<User | null> {
    if (useFallback) return StorageService.getCurrentUser();
    
    try {
        if (!isInitialized || !auth || !db) return null;
        const currentUser = auth.currentUser;
        if (!currentUser) return null;
        
        const docSnap = await getDoc(doc(db, "users", currentUser.uid));
        if (docSnap.exists()) {
            return docSnap.data() as User;
        }
        return null;
    } catch (e) {
        return null;
    }
  },

  async updateUser(user: User): Promise<void> {
    if (useFallback) return StorageService.updateUser(user);
    try {
        if (!isInitialized || !db) throw new Error("DB not initialized");
        await updateDoc(doc(db, "users", user.id), { ...user });
    } catch (e: any) {
       // Silent fail in prod to avoid annoying user, relies on local state
       if(e.code === 'permission-denied') {
           throw new Error("Database Permission Denied. Please check Firebase Rules.");
       }
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
    } catch (e: any) {
        return [];
    }
  },

  async getGuilds(): Promise<Guild[]> {
      if (useFallback) return StorageService.getGuilds();
      try {
          if(!isInitialized || !db) return [];
          const q = query(collection(db, "guilds"), limit(10));
          const snapshot = await getDocs(q);
          return snapshot.docs.map(d => ({id: d.id, ...d.data()} as Guild));
      } catch(e) {
          return [];
      }
  },

  async createGuild(name: string, banner: string, ownerUser: User): Promise<Guild> {
      if (useFallback) return StorageService.createGuild(name, banner, ownerUser);
      if(!isInitialized || !db) throw new Error("DB not ready");
      
      const newGuild: Omit<Guild, 'id'> = {
          name,
          banner,
          members: 1,
          totalXp: ownerUser.xp,
          chat: []
      };
      const docRef = await addDoc(collection(db, "guilds"), newGuild);
      const guild = { id: docRef.id, ...newGuild };
      
      ownerUser.guildId = guild.id;
      await this.updateUser(ownerUser);
      return guild;
  },

  async joinGuild(guildId: string, user: User): Promise<void> {
      if (useFallback) return StorageService.joinGuild(guildId, user);
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
  },

  // --- CHAT ---
  subscribeToGuildChat(guildId: string, callback: (messages: ChatMessage[]) => void) {
      if (useFallback || !isInitialized || !db) return () => {};
      
      const q = query(
          collection(db, `guilds/${guildId}/messages`), 
          orderBy("timestamp", "desc"), 
          limit(50)
      );
      
      return onSnapshot(q, (snapshot) => {
          const msgs = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as ChatMessage));
          callback(msgs.reverse());
      }, (error) => {
          console.error("Chat subscription error. Check Firestore Rules.", error);
          // Return empty to prevent UI crash
          callback([]);
      });
  },

  async sendGuildMessage(guildId: string, user: User, text: string) {
      if (useFallback || !isInitialized || !db) return;
      
      const msg: Omit<ChatMessage, 'id'> = {
          userId: user.id,
          username: user.username,
          text,
          timestamp: Date.now()
      };
      
      try {
          await addDoc(collection(db, `guilds/${guildId}/messages`), msg);
      } catch (e) {
          console.error("Failed to send message. Permission denied?", e);
          throw e;
      }
  }
};

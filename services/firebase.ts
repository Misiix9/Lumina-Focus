
import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, User as FirebaseUser } from "firebase/auth";
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, query, orderBy, limit, getDocs } from "firebase/firestore";
import { User, StudySession, Subject, Language, Quest, LeaderboardEntry } from '../types';
import { DEFAULT_SUBJECTS } from '../constants';

// --- FIREBASE CONFIGURATION ---
// REPLACE THESE VALUES WITH YOUR FIREBASE CONSOLE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSy...", // User needs to fill this
  authDomain: "lumina-app.firebaseapp.com",
  projectId: "lumina-app",
  storageBucket: "lumina-app.appspot.com",
  messagingSenderId: "123...",
  appId: "1:123..."
};

// --- FALLBACK STORAGE (MOCK) ---
// This allows the app to run "out of the box" if the user hasn't set up Firebase yet.
const LOCAL_DB_KEY = 'lumina_db_v2';
const LOCAL_USER_ID_KEY = 'lumina_active_user_id';

let app, auth, db;
let useFirebase = false;

try {
  // Basic check if config is valid (placeholder check)
  if (firebaseConfig.apiKey !== "AIzaSy...") {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);
    db = getFirestore(app);
    useFirebase = true;
    console.log("🔥 Connected to Firebase");
  } else {
    console.warn("⚠️ Firebase config missing. Falling back to LocalStorage.");
  }
} catch (e) {
  console.error("Firebase initialization error:", e);
}

// --- HELPER FUNCTIONS FOR LOCAL FALLBACK ---
const getLocalDB = (): { users: User[] } => {
  const stored = localStorage.getItem(LOCAL_DB_KEY);
  return stored ? JSON.parse(stored) : { users: [] };
};
const saveLocalDB = (data: { users: User[] }) => localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(data));
const delay = (ms: number) => new Promise(res => setTimeout(res, ms));

export const FirebaseService = {
  
  async register(email: string, password: string, username: string): Promise<User> {
    if (useFirebase) {
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
        lastStudyDate: null,
        subjects: DEFAULT_SUBJECTS.map(s => ({...s, sessionsCount: 0})),
        sessions: [],
        quests: [], // Generated on first load
        lastQuestGeneration: 0,
        unlockedAchievements: [],
        preferences: { darkMode: false, language: Language.EN, accent: 'monochrome' },
        createdAt: Date.now()
      };
      await setDoc(doc(db, "users", newUser.id), newUser);
      return newUser;
    } else {
      await delay(800);
      const db = getLocalDB();
      if (db.users.find(u => u.username === username)) throw new Error("User exists");
      const newUser: User = {
        id: Math.random().toString(36).substr(2, 9),
        username,
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
      saveLocalDB(db);
      localStorage.setItem(LOCAL_USER_ID_KEY, newUser.id);
      return newUser;
    }
  },

  async login(emailOrUser: string, password: string): Promise<User> {
    if (useFirebase) {
      const userCredential = await signInWithEmailAndPassword(auth, emailOrUser, password);
      const docRef = doc(db, "users", userCredential.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) return docSnap.data() as User;
      throw new Error("User data not found in Firestore");
    } else {
      await delay(600);
      const db = getLocalDB();
      // Mock login allows username OR email
      const user = db.users.find(u => u.username === emailOrUser || (u.email === emailOrUser));
      if (!user) throw new Error("Invalid credentials"); // Password check skipped for mock simplicity
      localStorage.setItem(LOCAL_USER_ID_KEY, user.id);
      return user;
    }
  },

  async logout() {
    if (useFirebase) await signOut(auth);
    else localStorage.removeItem(LOCAL_USER_ID_KEY);
  },

  async getCurrentUser(): Promise<User | null> {
    if (useFirebase) {
      const currentUser = auth.currentUser;
      if (!currentUser) return null;
      const docSnap = await getDoc(doc(db, "users", currentUser.uid));
      return docSnap.exists() ? docSnap.data() as User : null;
    } else {
      const id = localStorage.getItem(LOCAL_USER_ID_KEY);
      if (!id) return null;
      return getLocalDB().users.find(u => u.id === id) || null;
    }
  },

  async updateUser(user: User): Promise<void> {
    if (useFirebase) {
      await updateDoc(doc(db, "users", user.id), { ...user });
    } else {
      const db = getLocalDB();
      const idx = db.users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        db.users[idx] = user;
        saveLocalDB(db);
      }
    }
  },

  async getLeaderboard(): Promise<LeaderboardEntry[]> {
    if (useFirebase) {
      const q = query(collection(db, "users"), orderBy("xp", "desc"), limit(10));
      const snapshot = await getDocs(q);
      const currentUser = auth.currentUser;
      return snapshot.docs.map(d => {
        const data = d.data() as User;
        return {
          username: data.username,
          xp: data.xp,
          level: data.level,
          isCurrentUser: currentUser ? currentUser.uid === data.id : false
        };
      });
    } else {
      const db = getLocalDB();
      const sorted = [...db.users].sort((a, b) => b.xp - a.xp).slice(0, 10);
      const currentId = localStorage.getItem(LOCAL_USER_ID_KEY);
      return sorted.map(u => ({
        username: u.username,
        xp: u.xp,
        level: u.level,
        isCurrentUser: u.id === currentId
      }));
    }
  }
};

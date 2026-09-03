import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult,
  signOut, 
  onAuthStateChanged,
  User 
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  getDocs, 
  deleteDoc, 
  updateDoc, 
  onSnapshot, 
  serverTimestamp,
  writeBatch
} from "firebase/firestore";
import firebaseConfig from "../../firebase-applet-config.json";
import { SavedItem, UserProfile, CustomInstructions } from "../types";

// Initialize Firebase App singleton
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firebase Auth
export const auth = getAuth(app);

// Google Auth Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Initialize Firestore with custom databaseId if configured
export const db = firebaseConfig.firestoreDatabaseId && firebaseConfig.firestoreDatabaseId !== "(default)"
  ? getFirestore(app, firebaseConfig.firestoreDatabaseId)
  : getFirestore(app);

// Authentication Helpers
export async function signInWithGoogle(): Promise<{ user: User | null; error?: string }> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    if (result.user) {
      // Sync user profile in Firestore
      await syncUserProfile(result.user);
      return { user: result.user };
    }
    return { user: null };
  } catch (error: any) {
    console.error("Google Sign-In Popup Error:", error);
    // If popup was blocked by browser or iframe policy, fallback to redirect or return clear error
    if (error.code === 'auth/popup-blocked' || error.code === 'auth/cancelled-popup-request') {
      try {
        await signInWithRedirect(auth, googleProvider);
        return { user: null };
      } catch (redirectError: any) {
        return { user: null, error: redirectError.message || "Sign-in popup was blocked. Please allow popups." };
      }
    }
    return { user: null, error: error.message || "Failed to sign in with Google" };
  }
}

export async function checkRedirectAuthResult(): Promise<User | null> {
  try {
    const result = await getRedirectResult(auth);
    if (result && result.user) {
      await syncUserProfile(result.user);
      return result.user;
    }
    return null;
  } catch (error) {
    console.error("Redirect auth check error:", error);
    return null;
  }
}

export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Sign out error:", error);
    throw error;
  }
}

export function onAuthChange(callback: (user: UserProfile | null) => void) {
  return onAuthStateChanged(auth, async (user) => {
    if (user) {
      const profile: UserProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        role: 'teacher'
      };
      callback(profile);
      // Background sync profile
      syncUserProfile(user).catch(err => console.warn("Profile sync warning:", err));
    } else {
      callback(null);
    }
  });
}

// User Profile Firestore Sync
export async function syncUserProfile(user: User): Promise<void> {
  if (!user || !user.uid) return;
  const userRef = doc(db, "users", user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || "",
        displayName: user.displayName || "Educator",
        photoURL: user.photoURL || "",
        role: "teacher",
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      });
    } else {
      await updateDoc(userRef, {
        lastLoginAt: new Date().toISOString(),
        displayName: user.displayName || snap.data()?.displayName || "Educator",
        photoURL: user.photoURL || snap.data()?.photoURL || ""
      });
    }
  } catch (e) {
    console.warn("Could not sync user profile to Firestore:", e);
  }
}

// Cloud Storage Helpers for Saved Educational Items
export async function saveItemToCloud(userId: string, item: SavedItem): Promise<boolean> {
  if (!userId || !item.id) return false;
  try {
    const itemRef = doc(db, "users", userId, "savedItems", item.id);
    await setDoc(itemRef, {
      id: item.id,
      userId,
      type: item.type,
      title: item.title,
      date: item.date,
      data: item.data,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (error) {
    console.error("Error saving item to Firestore cloud:", error);
    return false;
  }
}

export async function deleteItemFromCloud(userId: string, itemId: string): Promise<boolean> {
  if (!userId || !itemId) return false;
  try {
    const itemRef = doc(db, "users", userId, "savedItems", itemId);
    await deleteDoc(itemRef);
    return true;
  } catch (error) {
    console.error("Error deleting item from Firestore cloud:", error);
    return false;
  }
}

export async function updateItemInCloud(userId: string, itemId: string, updatedData: any, updatedTitle?: string): Promise<boolean> {
  if (!userId || !itemId) return false;
  try {
    const itemRef = doc(db, "users", userId, "savedItems", itemId);
    const payload: any = {
      data: updatedData,
      updatedAt: new Date().toISOString()
    };
    if (updatedTitle) {
      payload.title = updatedTitle;
    }
    await updateDoc(itemRef, payload);
    return true;
  } catch (error) {
    console.error("Error updating item in Firestore cloud:", error);
    return false;
  }
}

// Subscribe to real-time updates of user's saved items in Firestore
export function subscribeToUserSavedItems(
  userId: string, 
  onUpdate: (items: SavedItem[]) => void,
  onError?: (err: Error) => void
) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  const itemsCol = collection(db, "users", userId, "savedItems");
  
  return onSnapshot(itemsCol, (snapshot) => {
    const cloudItems: SavedItem[] = [];
    snapshot.forEach((docSnap) => {
      const d = docSnap.data();
      cloudItems.push({
        id: d.id || docSnap.id,
        type: d.type,
        title: d.title,
        date: d.date || new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        data: d.data
      });
    });

    // Sort descending by ID or date (newest first)
    cloudItems.sort((a, b) => {
      const idA = Number(a.id) || 0;
      const idB = Number(b.id) || 0;
      return idB - idA;
    });

    onUpdate(cloudItems);
  }, (err) => {
    console.error("Firestore realtime snapshot error:", err);
    if (onError) onError(err);
  });
}

// Batch Sync Local Items into Cloud when user first signs in
export async function batchSyncLocalItemsToCloud(userId: string, localItems: SavedItem[]): Promise<number> {
  if (!userId || !localItems || localItems.length === 0) return 0;

  try {
    const itemsCol = collection(db, "users", userId, "savedItems");
    const existingSnap = await getDocs(itemsCol);
    const existingIds = new Set<string>();
    existingSnap.forEach(d => existingIds.add(d.id));

    const batch = writeBatch(db);
    let count = 0;

    for (const item of localItems) {
      if (!existingIds.has(item.id)) {
        const itemRef = doc(db, "users", userId, "savedItems", item.id);
        batch.set(itemRef, {
          id: item.id,
          userId,
          type: item.type,
          title: item.title,
          date: item.date,
          data: item.data,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        count++;
      }
    }

    if (count > 0) {
      await batch.commit();
    }
    return count;
  } catch (error) {
    console.error("Batch sync local items to cloud error:", error);
    return 0;
  }
}

// Save Custom Teacher Prompting Instructions to Cloud
export async function saveUserPreferencesToCloud(userId: string, preferences: CustomInstructions): Promise<boolean> {
  if (!userId) return false;
  try {
    const prefRef = doc(db, "users", userId, "preferences", "customInstructions");
    await setDoc(prefRef, {
      ...preferences,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e) {
    console.error("Error saving preferences to Firestore:", e);
    return false;
  }
}

// Get Custom Teacher Prompting Instructions from Cloud
export async function getUserPreferencesFromCloud(userId: string): Promise<CustomInstructions | null> {
  if (!userId) return null;
  try {
    const prefRef = doc(db, "users", userId, "preferences", "customInstructions");
    const snap = await getDoc(prefRef);
    if (snap.exists()) {
      return snap.data() as CustomInstructions;
    }
    return null;
  } catch (e) {
    console.warn("Could not get preferences from Firestore:", e);
    return null;
  }
}

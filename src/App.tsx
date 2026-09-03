import React, { useState, useEffect, useCallback, useRef } from "react";
import { GraduationCap, AlertTriangle, X, Laptop, Cloud, Database } from "lucide-react";
import TeacherView from "./components/TeacherView";
import GoogleAuthProfile from "./components/GoogleAuthProfile";
import { SavedItem, UserProfile, CloudSyncState } from "./types";
import { safeGetLocalStorage, safeSetLocalStorage, formatDuplicateTitle } from "./utils/storageUtils";
import { 
  onAuthChange, 
  checkRedirectAuthResult, 
  subscribeToUserSavedItems, 
  saveItemToCloud, 
  deleteItemFromCloud, 
  updateItemInCloud, 
  batchSyncLocalItemsToCloud 
} from "./lib/firebase";

export default function App() {
  const [savedItems, setSavedItems] = useState<SavedItem[]>([]);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [syncState, setSyncState] = useState<CloudSyncState>('local_only');
  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);
  const [cloudBanner, setCloudBanner] = useState<string | null>(null);
  const unsubscribeFirestoreRef = useRef<(() => void) | null>(null);

  const [isLaptopMode, setIsLaptopMode] = useState<boolean>(() => {
    // Auto-detect laptop viewport by default if innerHeight is <= 900
    if (typeof window !== 'undefined') {
      return window.innerHeight <= 900 || window.innerWidth <= 1440;
    }
    return true;
  });

  // 1. Initial Local Storage Load
  useEffect(() => {
    const loaded = safeGetLocalStorage<SavedItem[]>("eduos_saved_items", []);
    setSavedItems(loaded);
  }, []);

  // 2. Auth State and Cloud Firestore Setup
  useEffect(() => {
    // Check for any pending redirect auth results on load
    checkRedirectAuthResult().catch(err => console.warn("Redirect check:", err));

    const unsubscribeAuth = onAuthChange(async (currentUser) => {
      setUser(currentUser);

      // Clean up any previous Firestore subscription
      if (unsubscribeFirestoreRef.current) {
        unsubscribeFirestoreRef.current();
        unsubscribeFirestoreRef.current = null;
      }

      if (currentUser) {
        setSyncState('syncing');

        // Subscribe to real-time Firestore updates for this user
        const unsubscribeSnapshot = subscribeToUserSavedItems(
          currentUser.uid,
          (cloudItems) => {
            // Merge or set cloud items
            if (cloudItems && cloudItems.length > 0) {
              setSavedItems(cloudItems);
              safeSetLocalStorage("eduos_saved_items", cloudItems);
              setSyncState('synced');
            } else {
              // If cloud is empty but local has items, sync local items to cloud
              const currentLocal = safeGetLocalStorage<SavedItem[]>("eduos_saved_items", []);
              if (currentLocal.length > 0) {
                batchSyncLocalItemsToCloud(currentUser.uid, currentLocal).then(count => {
                  if (count > 0) {
                    setCloudBanner(`Synced ${count} existing local materials to your Firestore cloud storage!`);
                    setTimeout(() => setCloudBanner(null), 5000);
                  }
                });
              }
              setSyncState('synced');
            }
          },
          (err) => {
            console.error("Cloud subscription error:", err);
            setSyncState('error');
          }
        );

        unsubscribeFirestoreRef.current = unsubscribeSnapshot;
      } else {
        // Logged out: fallback to local items
        setSyncState('local_only');
        const loaded = safeGetLocalStorage<SavedItem[]>("eduos_saved_items", []);
        setSavedItems(loaded);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeFirestoreRef.current) {
        unsubscribeFirestoreRef.current();
      }
    };
  }, []);

  // 3. Manual Sync Handler
  const handleManualCloudSync = useCallback(async () => {
    if (!user) return;
    setSyncState('syncing');
    try {
      const count = await batchSyncLocalItemsToCloud(user.uid, savedItems);
      setSyncState('synced');
      setCloudBanner(`Successfully synced ${savedItems.length} materials to Firestore cloud database.`);
      setTimeout(() => setCloudBanner(null), 4000);
    } catch (e) {
      console.error("Manual cloud sync failed:", e);
      setSyncState('error');
    }
  }, [user, savedItems]);

  // 4. Save Item Callback (Dual Persistence: LocalStorage + Firestore Cloud)
  const handleSaveItem = (type: SavedItem['type'], title: string, data: any) => {
    const existingTitles = savedItems.map(item => item.title);
    const uniqueTitle = formatDuplicateTitle(title, existingTitles);

    const newItem: SavedItem = {
      id: Date.now().toString(),
      type,
      title: uniqueTitle,
      date: new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
      data
    };

    // Update Local State & Local Storage
    setSavedItems(prev => {
      const updated = [newItem, ...prev];
      const res = safeSetLocalStorage("eduos_saved_items", updated);
      if (res.quotaExceeded) {
        setQuotaWarning("Browser local storage quota reached. Older saved items were automatically pruned for browser storage, but your new item is active in this session!");
      }
      return updated;
    });

    // Write to Firestore Cloud Storage if user is logged in
    if (user) {
      setSyncState('syncing');
      saveItemToCloud(user.uid, newItem).then(success => {
        if (success) {
          setSyncState('synced');
        } else {
          setSyncState('error');
        }
      });
    }
  };

  // 5. Delete Item Callback (LocalStorage + Firestore Cloud)
  const handleDeleteItem = (id: string) => {
    setSavedItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      safeSetLocalStorage("eduos_saved_items", updated);
      return updated;
    });

    if (user) {
      setSyncState('syncing');
      deleteItemFromCloud(user.uid, id).then(() => setSyncState('synced'));
    }
  };

  // 6. Update Existing Item Callback (LocalStorage + Firestore Cloud)
  const handleUpdateItem = (id: string, updatedData: any, updatedTitle?: string) => {
    setSavedItems(prev => {
      const updated = prev.map(item => {
        if (item.id === id) {
          return {
            ...item,
            title: updatedTitle || item.title,
            data: updatedData
          };
        }
        return item;
      });
      safeSetLocalStorage("eduos_saved_items", updated);
      return updated;
    });

    if (user) {
      setSyncState('syncing');
      updateItemInCloud(user.uid, id, updatedData, updatedTitle).then(() => setSyncState('synced'));
    }
  };

  const savedIds = savedItems.map(item => item.id);
  const localItemsCount = safeGetLocalStorage<SavedItem[]>("eduos_saved_items", []).length;

  return (
    <div className={`min-h-screen bg-[#0f172a] text-slate-100 flex flex-col font-sans relative overflow-x-hidden ${isLaptopMode ? 'laptop-optimized' : ''}`} id="eduos_app_container">
      {/* Frosted glass background blur blobs */}
      <div className="absolute top-[-100px] left-[-100px] w-[500px] h-[500px] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-[600px] h-[600px] bg-emerald-600/10 rounded-full blur-[150px] pointer-events-none z-0"></div>
      
      {/* Header */}
      <header className={`sticky top-0 z-40 bg-slate-900/70 backdrop-blur-md border-b border-white/10 ${isLaptopMode ? 'px-3 md:px-6 py-2.5' : 'px-4 md:px-8 py-3.5'} flex items-center justify-between gap-4 shadow-lg relative z-10 transition-all`} id="main_app_header">
        
        {/* Branding Logo */}
        <div className="flex items-center gap-2.5 shrink-0" id="branding_logo">
          <div className="w-8 h-8 md:w-9 md:h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-display font-bold text-base md:text-lg text-white tracking-tight leading-none">EduOS AI</h1>
            <p className="text-[9px] md:text-[10px] font-mono text-slate-400 uppercase tracking-widest mt-0.5">Educational OS</p>
          </div>
        </div>

        {/* Right Header Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Laptop Mode Toggle */}
          <button
            onClick={() => setIsLaptopMode(prev => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isLaptopMode 
                ? 'bg-indigo-600/30 border-indigo-400 text-indigo-200 shadow-sm' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-white/10'
            }`}
            title="Toggle Laptop Screen Fit (compact padding & vertical scaling)"
          >
            <Laptop className="w-3.5 h-3.5 text-indigo-400" />
            <span className="hidden sm:inline">Laptop Fit</span>
          </button>

          {/* Teacher Suite Indicator */}
          <div className="hidden lg:flex items-center gap-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-xl shrink-0" id="status_pill_box">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-[10px] md:text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">Teacher Suite</span>
          </div>

          {/* Google Auth & Cloud Storage Profile Dropdown */}
          <GoogleAuthProfile 
            user={user}
            syncState={syncState}
            savedItemsCount={savedItems.length}
            localItemsCount={localItemsCount}
            onManualCloudSync={handleManualCloudSync}
          />
        </div>
      </header>

      {/* Cloud Notification Banner */}
      {cloudBanner && (
        <div className="bg-gradient-to-r from-indigo-900/90 to-blue-900/90 border-b border-indigo-500/40 px-4 py-2.5 flex items-center justify-between text-xs text-indigo-200 shadow-xl relative z-50 animate-fade-in" id="toast_cloud_banner">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-4 h-4 text-indigo-300 shrink-0" />
            <span>{cloudBanner}</span>
          </div>
          <button 
            onClick={() => setCloudBanner(null)} 
            className="p-1 hover:bg-indigo-500/20 rounded text-indigo-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Storage Quota Warning Notification */}
      {quotaWarning && (
        <div className="bg-amber-950/80 border-b border-amber-500/40 px-4 py-3 flex items-center justify-between text-xs text-amber-200 shadow-xl relative z-50 animate-fade-in" id="toast_quota_warning">
          <div className="flex items-center gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{quotaWarning}</span>
          </div>
          <button 
            onClick={() => setQuotaWarning(null)} 
            className="p-1 hover:bg-amber-500/20 rounded text-amber-300 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Educational Dashboard Container */}
      <main className={`flex-1 max-w-7xl w-full mx-auto ${isLaptopMode ? 'p-2 sm:p-4 md:p-5 gap-3 sm:gap-4' : 'p-4 md:p-8 gap-6'} flex flex-col relative z-10 transition-all`} id="eduos_main_viewport">
        
        {/* Welcome Section */}
        {!isLaptopMode && (
          <div className="flex flex-col md:flex-row md:items-center justify-between bg-white/5 backdrop-blur-md border border-white/10 p-5 md:p-6 rounded-2xl shadow-lg gap-4" id="view_intro_banner">
            <div>
              <div className="text-xs font-mono font-bold text-indigo-400 uppercase tracking-wider mb-1 flex items-center gap-2">
                <span>Curriculum Suite / Teacher Dashboard</span>
                {user && (
                  <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono">
                    Cloud Storage Active
                  </span>
                )}
              </div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                Design outstanding curriculum structures
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Autogenerate curriculum-aligned worksheets, lesson timings, and customized exams with answer rubrics. Save and manage your resources with instant Firestore Cloud Storage synchronization.
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl self-start md:self-center shrink-0" id="status_ai_ready">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                {user ? "Cloud Synced" : "AI Engines Ready"}
              </span>
            </div>
          </div>
        )}

        {/* Active Panel (Teacher View) */}
        <div className="flex-1" id="active_workspace_router">
          <TeacherView 
            onSave={handleSaveItem} 
            savedIds={savedIds} 
            savedItems={savedItems} 
            onDeleteItem={handleDeleteItem} 
            onUpdateItem={handleUpdateItem}
          />
        </div>

      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 bg-slate-900/40 backdrop-blur-md py-4 px-4 md:px-8 mt-6 text-center text-xs text-slate-500 relative z-10" id="main_app_footer">
        <p className="font-medium text-slate-400">EduOS AI - Advanced Educational Operating System Client</p>
        <p className="mt-0.5 font-mono text-[10px] uppercase tracking-widest text-slate-500">
          {user ? `Connected to Google Cloud Firestore (${user.email})` : "Offline-First Local Persistence | Sign in with Google for Cloud Storage"}
        </p>
      </footer>

    </div>
  );
}

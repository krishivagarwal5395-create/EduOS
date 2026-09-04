import React, { useState, useEffect } from "react";
import { GraduationCap, AlertTriangle, X, Laptop, Database, Check } from "lucide-react";
import TeacherView from "./components/TeacherView";
import { SavedItem } from "./types";
import { safeGetLocalStorage, safeSetLocalStorage, formatDuplicateTitle } from "./utils/storageUtils";

export default function App() {
  // 1. Initial Local Storage Load for Saved Items
  const [savedItems, setSavedItems] = useState<SavedItem[]>(() => {
    return safeGetLocalStorage<SavedItem[]>("eduos_saved_items", []);
  });

  const [quotaWarning, setQuotaWarning] = useState<string | null>(null);

  // 2. Persistent Laptop Mode Preference
  const [isLaptopMode, setIsLaptopMode] = useState<boolean>(() => {
    const savedMode = safeGetLocalStorage<boolean | null>("eduos_laptop_mode", null);
    if (savedMode !== null) return savedMode;
    if (typeof window !== 'undefined') {
      return window.innerHeight <= 900 || window.innerWidth <= 1440;
    }
    return true;
  });

  useEffect(() => {
    safeSetLocalStorage("eduos_laptop_mode", isLaptopMode);
  }, [isLaptopMode]);

  // 3. Sync savedItems to LocalStorage whenever they change
  useEffect(() => {
    safeSetLocalStorage("eduos_saved_items", savedItems);
  }, [savedItems]);

  // 4. Ensure Local Storage write on page unload / hide (Closing browser tab or window)
  useEffect(() => {
    const handleSaveOnUnload = () => {
      safeSetLocalStorage("eduos_saved_items", savedItems);
    };

    window.addEventListener("beforeunload", handleSaveOnUnload);
    window.addEventListener("pagehide", handleSaveOnUnload);

    return () => {
      window.removeEventListener("beforeunload", handleSaveOnUnload);
      window.removeEventListener("pagehide", handleSaveOnUnload);
    };
  }, [savedItems]);

  // 5. Save Item Callback (Persistent Local Storage)
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

    // Update Local State & Local Storage immediately
    setSavedItems(prev => {
      const updated = [newItem, ...prev];
      const res = safeSetLocalStorage("eduos_saved_items", updated);
      if (res.quotaExceeded) {
        setQuotaWarning("Browser local storage quota reached. Older saved items were automatically pruned for browser storage, but your new item is saved!");
      }
      return updated;
    });
  };

  // 6. Delete Item Callback (Persistent Local Storage)
  const handleDeleteItem = (id: string) => {
    setSavedItems(prev => {
      const updated = prev.filter(item => item.id !== id);
      safeSetLocalStorage("eduos_saved_items", updated);
      return updated;
    });
  };

  // 7. Update Existing Item Callback (Persistent Local Storage)
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
  };

  const savedIds = savedItems.map(item => item.id);

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

          {/* Local Storage Saved Status Badge */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/60 text-slate-200 text-xs font-medium shadow-sm">
            <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col text-left leading-none">
              <span className="text-[11px] font-bold text-white flex items-center gap-1">
                Local Storage
                <Check className="w-3 h-3 text-emerald-400 inline" />
              </span>
              <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                {savedItems.length} {savedItems.length === 1 ? 'item' : 'items'} saved
              </span>
            </div>
          </div>
        </div>
      </header>

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
                <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-mono flex items-center gap-1">
                  <Database className="w-3 h-3" />
                  Local Storage Persistent
                </span>
              </div>
              <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
                Design outstanding curriculum structures
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                Autogenerate curriculum-aligned worksheets, lesson timings, presentations, and customized exams with answer rubrics. All your materials are stored permanently in your browser's local storage.
              </p>
            </div>
            
            <div className="hidden md:flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-2 rounded-xl self-start md:self-center shrink-0" id="status_ai_ready">
              <span className="flex h-2 w-2 rounded-full bg-emerald-400"></span>
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider">
                AI Engines Ready
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
          Persistent Browser Storage Active — All data saved locally on your device
        </p>
      </footer>

    </div>
  );
}


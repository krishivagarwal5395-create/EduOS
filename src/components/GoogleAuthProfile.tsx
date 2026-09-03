import React, { useState, useRef, useEffect } from "react";
import { 
  Cloud, 
  CloudCheck, 
  CloudUpload, 
  CloudOff, 
  RefreshCw, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle, 
  ChevronDown,
  ExternalLink,
  Database,
  Layers
} from "lucide-react";
import { UserProfile, CloudSyncState, SavedItem } from "../types";
import { signInWithGoogle, signOutUser, batchSyncLocalItemsToCloud } from "../lib/firebase";

interface GoogleAuthProfileProps {
  user: UserProfile | null;
  syncState: CloudSyncState;
  savedItemsCount: number;
  localItemsCount: number;
  onManualCloudSync?: () => Promise<void>;
}

export default function GoogleAuthProfile({
  user,
  syncState,
  savedItemsCount,
  localItemsCount,
  onManualCloudSync
}: GoogleAuthProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isSyncingLocal, setIsSyncingLocal] = useState(false);
  const [syncSuccessMessage, setSyncSuccessMessage] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setAuthError(null);
    try {
      const res = await signInWithGoogle();
      if (res.error) {
        setAuthError(res.error);
      } else if (!res.cancelled && res.user) {
        setIsOpen(false);
      }
    } catch (e: any) {
      if (
        e?.code !== 'auth/popup-closed-by-user' && 
        e?.code !== 'auth/cancelled-popup-request' &&
        e?.code !== 'auth/user-cancelled'
      ) {
        setAuthError(e.message || "Failed to sign in with Google");
      }
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setIsOpen(false);
    } catch (e: any) {
      console.error("Sign out error:", e);
    }
  };

  const handleSyncToCloud = async () => {
    if (!user) return;
    setIsSyncingLocal(true);
    setSyncSuccessMessage(null);
    try {
      if (onManualCloudSync) {
        await onManualCloudSync();
        setSyncSuccessMessage("All curriculum items synced to Firestore Cloud Storage!");
      }
    } catch (e: any) {
      console.error("Sync error:", e);
    } finally {
      setIsSyncingLocal(false);
      setTimeout(() => setSyncSuccessMessage(null), 4000);
    }
  };

  return (
    <div className="relative" ref={menuRef} id="google_auth_profile_wrapper">
      {!user ? (
        // NOT SIGNED IN - SHOW GOOGLE SIGN IN BUTTON
        <div className="flex items-center gap-2">
          <button
            onClick={handleSignIn}
            disabled={isSigningIn}
            className="flex items-center gap-2 bg-white hover:bg-slate-100 text-slate-900 px-3.5 py-1.5 rounded-xl font-medium text-xs shadow-md border border-white/20 transition-all transform hover:scale-[1.02] active:scale-95 disabled:opacity-50"
            id="btn_google_signin"
            title="Sign in with Google to sync materials with Firestore Cloud Storage"
          >
            {isSigningIn ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-700" />
            ) : (
              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )}
            <span className="font-semibold">{isSigningIn ? "Connecting..." : "Sign in with Google"}</span>
          </button>
        </div>
      ) : (
        // SIGNED IN - SHOW PROFILE BADGE WITH CLOUD SYNC STATUS
        <div className="flex items-center gap-2">
          {/* Cloud Sync Status Pill */}
          <div 
            onClick={() => setIsOpen(!isOpen)}
            className="hidden sm:flex items-center gap-1.5 bg-slate-800/80 hover:bg-slate-800 border border-white/10 px-2.5 py-1.5 rounded-xl cursor-pointer text-xs transition-colors"
            title={`Cloud Storage: ${syncState === 'synced' ? 'Up to date' : syncState === 'syncing' ? 'Syncing...' : 'Connected'}`}
          >
            {syncState === 'synced' ? (
              <CloudCheck className="w-3.5 h-3.5 text-emerald-400" />
            ) : syncState === 'syncing' ? (
              <RefreshCw className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            ) : (
              <Cloud className="w-3.5 h-3.5 text-indigo-400" />
            )}
            <span className="text-[11px] font-mono text-slate-300">
              {syncState === 'synced' ? 'Cloud Synced' : syncState === 'syncing' ? 'Syncing...' : 'Cloud Active'}
            </span>
          </div>

          {/* User Profile Avatar Trigger */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 border border-white/15 p-1 sm:px-2.5 sm:py-1 rounded-xl text-xs font-semibold text-white transition-all"
            id="btn_user_profile_dropdown"
          >
            {user.photoURL ? (
              <img
                src={user.photoURL}
                alt={user.displayName || "User"}
                className="w-6 h-6 rounded-lg object-cover border border-white/20 shadow-sm"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-6 h-6 rounded-lg bg-indigo-500 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                {(user.displayName || user.email || "U")[0].toUpperCase()}
              </div>
            )}
            <span className="hidden md:inline max-w-[110px] truncate text-slate-200">
              {user.displayName || user.email?.split('@')[0]}
            </span>
            <ChevronDown className="w-3 h-3 text-slate-400" />
          </button>
        </div>
      )}

      {/* DROPDOWN MENU */}
      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 bg-slate-900/95 border border-white/15 rounded-2xl shadow-2xl backdrop-blur-2xl p-4 text-white z-50 animate-fade-in space-y-4"
          id="google_auth_dropdown_panel"
        >
          {user ? (
            <>
              {/* Profile Header */}
              <div className="flex items-center gap-3 border-b border-white/10 pb-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || "User"}
                    className="w-10 h-10 rounded-xl object-cover border border-indigo-400 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-black flex items-center justify-center text-base shadow-md">
                    {(user.displayName || user.email || "U")[0].toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white truncate">
                      {user.displayName || "Educator"}
                    </h3>
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                  <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 mt-1">
                    Google Connected
                  </span>
                </div>
              </div>

              {/* Cloud Database Storage Metrics */}
              <div className="space-y-2.5 bg-white/5 p-3 rounded-xl border border-white/10 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-amber-400" />
                    <span>Firestore Storage</span>
                  </span>
                  <span className="font-mono font-bold text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    Live Cloud Sync
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] pt-1 border-t border-white/5">
                  <span className="text-slate-400">Cloud Saved Materials:</span>
                  <span className="font-mono font-bold text-white">{savedItemsCount} items</span>
                </div>
              </div>

              {/* Success Notification */}
              {syncSuccessMessage && (
                <div className="p-2.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{syncSuccessMessage}</span>
                </div>
              )}

              {/* Cloud Sync Actions */}
              <div className="space-y-2 pt-1">
                <button
                  onClick={handleSyncToCloud}
                  disabled={isSyncingLocal}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
                >
                  {isSyncingLocal ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CloudUpload className="w-3.5 h-3.5" />
                  )}
                  <span>{isSyncingLocal ? "Syncing..." : "Sync All Materials to Cloud"}</span>
                </button>

                <button
                  onClick={handleSignOut}
                  className="w-full py-2 px-3 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 text-slate-300 hover:text-rose-300 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            // Sign in prompt within dropdown
            <div className="space-y-3 text-center py-2">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center mx-auto text-indigo-400">
                <Cloud className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Google Cloud Storage</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Sign in with your Google account to automatically store worksheets, quizzes, question papers, and study plans in Google Cloud Firestore.
                </p>
              </div>

              {authError && (
                <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-1.5 text-left">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <button
                onClick={handleSignIn}
                disabled={isSigningIn}
                className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all transform hover:scale-[1.01]"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                </svg>
                <span>{isSigningIn ? "Signing in..." : "Continue with Google"}</span>
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

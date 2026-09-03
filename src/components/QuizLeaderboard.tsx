import React, { useState, useEffect } from "react";
import { 
  Trophy, 
  Crown, 
  Sparkles, 
  Flame, 
  TrendingUp, 
  Medal, 
  Award, 
  Users, 
  Plus, 
  Minus, 
  RotateCcw, 
  Volume2, 
  VolumeX, 
  Maximize2, 
  BarChart2, 
  LayoutList,
  CheckCircle2,
  Zap,
  Star,
  ChevronUp,
  ChevronDown,
  Edit2,
  Settings2
} from "lucide-react";
import { ClassroomTeam, QuizQuestionItem } from "../types";
import EditTeamsModal from "./EditTeamsModal";

export interface QuizLeaderboardProps {
  teams: ClassroomTeam[];
  currentQuestion?: QuizQuestionItem | null;
  currentQuestionIndex?: number;
  totalQuestions?: number;
  onAwardPoints: (teamId: string, points: number) => void;
  onResetScores?: () => void;
  onAddTeam?: (team: { name: string; captainName: string; color: string }) => void;
  onRemoveTeam?: (teamId: string) => void;
  onUpdateTeams?: (updatedTeams: ClassroomTeam[]) => void;
  onOpenEditTeamsModal?: () => void;
  soundEnabled?: boolean;
  onToggleSound?: () => void;
  isCompact?: boolean;
  className?: string;
  onPlayVictoryFanfare?: () => void;
}

export default function QuizLeaderboard({
  teams,
  currentQuestion,
  currentQuestionIndex = 0,
  totalQuestions = 1,
  onAwardPoints,
  onResetScores,
  onAddTeam,
  onRemoveTeam,
  onUpdateTeams,
  onOpenEditTeamsModal,
  soundEnabled = true,
  onToggleSound,
  isCompact = false,
  className = "",
  onPlayVictoryFanfare
}: QuizLeaderboardProps) {
  const [viewMode, setViewMode] = useState<"race" | "podium" | "cards">(isCompact ? "race" : "race");
  const [lastAwardedTeamId, setLastAwardedTeamId] = useState<string | null>(null);
  const [lastPointChange, setLastPointChange] = useState<number | null>(null);
  const [showEditTeamsModal, setShowEditTeamsModal] = useState<boolean>(false);
  const [showAddTeamModal, setShowAddTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newCaptainName, setNewCaptainName] = useState("");
  const [newTeamColor, setNewTeamColor] = useState("from-amber-500 to-orange-600");

  const questionPoints = currentQuestion?.points || 10;

  // Sort teams in descending order by score
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);
  const highestScore = Math.max(1, ...teams.map(t => t.score));
  const totalTeamPoints = teams.reduce((acc, t) => acc + t.score, 0);
  const leader = sortedTeams[0];

  const handlePointClick = (teamId: string, points: number) => {
    onAwardPoints(teamId, points);
    setLastAwardedTeamId(teamId);
    setLastPointChange(points);
    setTimeout(() => {
      setLastAwardedTeamId(null);
      setLastPointChange(null);
    }, 2000);
  };

  const handleCreateTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newCaptainName.trim()) return;
    if (onAddTeam) {
      onAddTeam({
        name: newTeamName.trim(),
        captainName: newCaptainName.trim(),
        color: newTeamColor
      });
      setNewTeamName("");
      setNewCaptainName("");
      setShowAddTeamModal(false);
    }
  };

  const colorOptions = [
    { label: "Amber Fire", value: "from-amber-500 to-orange-600" },
    { label: "Emerald Jungle", value: "from-emerald-500 to-teal-600" },
    { label: "Cyber Indigo", value: "from-indigo-500 to-blue-600" },
    { label: "Royal Purple", value: "from-purple-500 to-pink-600" },
    { label: "Rose Flame", value: "from-rose-500 to-red-600" },
    { label: "Sky Cyan", value: "from-cyan-500 to-blue-500" }
  ];

  return (
    <div 
      className={`bg-slate-900/90 border border-white/15 rounded-3xl backdrop-blur-xl shadow-2xl p-4 sm:p-5 md:p-6 text-white relative overflow-hidden flex flex-col gap-4 ${className}`}
      id="quiz_leaderboard_component"
    >
      {/* Ambient background lighting */}
      <div className="absolute top-0 right-1/3 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* 1. LEADERBOARD HEADER BAR */}
      <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20 font-black">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-display font-black text-base sm:text-lg text-white tracking-tight">
                Live Quiz Leaderboard
              </h3>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[10px] font-mono font-bold uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                Dynamic Scoring
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {leader ? (
                <>
                  Leader: <span className="font-bold text-amber-300">{leader.name}</span> ({leader.score} pts) • {teams.length} Teams Active
                </>
              ) : (
                "Scores update live as teams answer"
              )}
            </p>
          </div>
        </div>

        {/* View Switcher & Sound / Reset Actions */}
        <div className="flex items-center gap-1.5 self-end sm:self-center flex-wrap">
          {/* View Mode Tabs */}
          <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
            <button
              onClick={() => setViewMode("race")}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "race" 
                  ? "bg-amber-500 text-slate-950 shadow-md" 
                  : "text-slate-400 hover:text-white"
              }`}
              title="Race Bar Chart View"
            >
              <BarChart2 className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Race</span>
            </button>

            <button
              onClick={() => setViewMode("podium")}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "podium" 
                  ? "bg-amber-500 text-slate-950 shadow-md" 
                  : "text-slate-400 hover:text-white"
              }`}
              title="Podium Stand View"
            >
              <Crown className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Podium</span>
            </button>

            <button
              onClick={() => setViewMode("cards")}
              className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "cards" 
                  ? "bg-amber-500 text-slate-950 shadow-md" 
                  : "text-slate-400 hover:text-white"
              }`}
              title="Team Card Grid View"
            >
              <LayoutList className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Cards</span>
            </button>
          </div>

          {/* Sound Effect Toggle */}
          {onToggleSound && (
            <button
              onClick={onToggleSound}
              className={`p-1.5 rounded-xl border text-xs transition-colors ${
                soundEnabled
                  ? "bg-purple-500/20 border-purple-400/50 text-purple-300"
                  : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
              }`}
              title={soundEnabled ? "Mute Leaderboard SFX" : "Enable Leaderboard SFX"}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-purple-300" /> : <VolumeX className="w-3.5 h-3.5" />}
            </button>
          )}

          {/* Play Victory Fanfare */}
          {onPlayVictoryFanfare && (
            <button
              onClick={onPlayVictoryFanfare}
              className="px-2.5 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 border border-purple-400/40 text-purple-200 text-xs font-bold flex items-center gap-1 transition-all"
              title="Play Championship Victory Sound"
            >
              <Sparkles className="w-3.5 h-3.5 text-purple-300" />
              <span className="hidden lg:inline">Fanfare</span>
            </button>
          )}

          {/* Edit Teams Modal Trigger */}
          <button
            onClick={() => {
              if (onOpenEditTeamsModal) {
                onOpenEditTeamsModal();
              } else {
                setShowEditTeamsModal(true);
              }
            }}
            className="px-2.5 py-1.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/40 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm"
            title="Edit Teams, Captains, Colors & Points"
          >
            <Settings2 className="w-3.5 h-3.5 text-purple-400" />
            <span>Edit Teams</span>
          </button>

          {/* Add Team Modal Trigger */}
          {onAddTeam && (
            <button
              onClick={() => setShowAddTeamModal(true)}
              className="p-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white transition-colors"
              title="Quick Add Team"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Reset Scores */}
          {onResetScores && (
            <button
              onClick={() => {
                if (window.confirm("Reset all team scores to 0 for a new round?")) {
                  onResetScores();
                }
              }}
              className="p-1.5 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/40 border border-white/10 text-slate-400 hover:text-rose-300 transition-colors"
              title="Reset All Scores"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. ACTIVE QUESTION QUICK-AWARD BAR */}
      {currentQuestion && (
        <div className="relative z-10 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              <span className="font-bold text-amber-300">
                Question {currentQuestionIndex + 1} of {totalQuestions}:
              </span>{" "}
              <span className="text-slate-300 line-clamp-1 max-w-md font-medium">
                {currentQuestion.question}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
            <span className="text-[11px] font-mono text-amber-200 font-semibold mr-1">
              Worth <strong>+{questionPoints} pts</strong>:
            </span>
            <div className="flex items-center gap-1 overflow-x-auto max-w-full">
              {teams.map(team => (
                <button
                  key={team.id}
                  onClick={() => handlePointClick(team.id, questionPoints)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition-all transform active:scale-95 flex items-center gap-1 shadow-md ${
                    lastAwardedTeamId === team.id
                      ? "bg-emerald-500 text-slate-950 scale-105 ring-2 ring-emerald-400"
                      : "bg-gradient-to-r " + team.color + " text-white hover:brightness-110"
                  }`}
                  title={`Award full +${questionPoints} pts to ${team.name}`}
                >
                  <Plus className="w-3 h-3" />
                  <span className="truncate max-w-[80px]">{team.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 3. LEADERBOARD DISPLAY MODES */}

      {/* MODE A: RACE TRACK BAR CHART VIEW (Smooth dynamic percentage bars) */}
      {viewMode === "race" && (
        <div className="relative z-10 space-y-3 py-1">
          {sortedTeams.map((team, rankIndex) => {
            const percentage = Math.max(8, Math.round((team.score / highestScore) * 100));
            const isWinner = rankIndex === 0 && team.score > 0;
            const isSecond = rankIndex === 1 && team.score > 0;
            const isThird = rankIndex === 2 && team.score > 0;
            const isRecentlyAwarded = lastAwardedTeamId === team.id;

            return (
              <div
                key={team.id}
                className={`group relative p-3 sm:p-3.5 rounded-2xl border transition-all duration-300 ${
                  isRecentlyAwarded 
                    ? "bg-emerald-950/60 border-emerald-400 ring-2 ring-emerald-400/50 scale-[1.01]" 
                    : isWinner 
                    ? "bg-slate-800/90 border-amber-400/60 shadow-lg shadow-amber-500/10" 
                    : "bg-slate-800/60 border-white/10 hover:border-white/20"
                }`}
              >
                {/* Team Info Row */}
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* Rank Badge */}
                    <div className={`w-7 h-7 rounded-xl font-mono font-black text-xs flex items-center justify-center shrink-0 shadow-md ${
                      isWinner 
                        ? "bg-gradient-to-br from-amber-400 to-yellow-500 text-slate-950 ring-2 ring-amber-300" 
                        : isSecond 
                        ? "bg-slate-300 text-slate-900 font-bold" 
                        : isThird 
                        ? "bg-amber-700 text-amber-100" 
                        : "bg-white/10 text-slate-300"
                    }`}>
                      {isWinner ? <Crown className="w-4 h-4 text-slate-950" /> : `#${rankIndex + 1}`}
                    </div>

                    {/* Team & Captain Name */}
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-extrabold text-sm text-white truncate">
                          {team.name}
                        </span>
                        {isWinner && (
                          <span className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 text-[10px] font-bold">
                            <Star className="w-2.5 h-2.5 fill-amber-400 text-amber-400" /> Leader
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-amber-200/90 font-mono truncate flex items-center gap-1">
                        <Crown className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                        <span>Capt: <strong>{team.captainName}</strong></span>
                      </div>
                    </div>
                  </div>

                  {/* Score & Quick Point Modifier Buttons */}
                  <div className="flex items-center gap-3 shrink-0">
                    {/* Floating Point Award Animation Badge */}
                    {isRecentlyAwarded && lastPointChange !== null && (
                      <span className="animate-bounce font-mono font-black text-xs px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 shadow-md">
                        {lastPointChange > 0 ? `+${lastPointChange}` : lastPointChange} pts!
                      </span>
                    )}

                    {/* Score Number */}
                    <div className="text-right">
                      <span className="font-display font-black text-lg sm:text-xl text-white tracking-tight">
                        {team.score}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono ml-1">pts</span>
                    </div>

                    {/* Quick +/- Action Buttons */}
                    <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                      <button
                        onClick={() => handlePointClick(team.id, questionPoints)}
                        className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-black text-xs transition-colors"
                        title={`Award +${questionPoints} pts to ${team.name}`}
                      >
                        +{questionPoints}
                      </button>
                      <button
                        onClick={() => handlePointClick(team.id, 5)}
                        className="px-1.5 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-xs transition-colors"
                        title={`Award +5 bonus pts to ${team.name}`}
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handlePointClick(team.id, -5)}
                        className="px-1.5 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition-colors"
                        title={`Deduct -5 pts from ${team.name}`}
                      >
                        -5
                      </button>
                      {teams.length > 2 && onRemoveTeam && (
                        <button
                          onClick={() => onRemoveTeam(team.id)}
                          className="px-1 py-0.5 rounded text-slate-500 hover:text-rose-400 text-[10px]"
                          title="Remove Team"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Animated Race Progress Bar */}
                <div className="w-full bg-slate-900/90 rounded-full h-3 sm:h-3.5 p-0.5 border border-white/10 overflow-hidden relative">
                  <div
                    className={`h-full rounded-full bg-gradient-to-r ${team.color} transition-all duration-500 ease-out relative shadow-sm`}
                    style={{ width: `${percentage}%` }}
                  >
                    {/* Glowing head of the bar */}
                    <div className="absolute right-0 top-0 bottom-0 w-2 bg-white/60 rounded-full shadow-[0_0_8px_white]" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODE B: 3D PODIUM STAND VIEW (Championship Stage) */}
      {viewMode === "podium" && (
        <div className="relative z-10 pt-4 pb-2">
          <div className="grid grid-cols-3 gap-2 sm:gap-4 items-end max-w-xl mx-auto">
            
            {/* 2nd Place Stand */}
            {sortedTeams[1] && (
              <div className="flex flex-col items-center space-y-2 order-1 group">
                <div className="w-9 h-9 rounded-2xl bg-slate-300 text-slate-950 font-black flex items-center justify-center text-xs shadow-lg">
                  2nd
                </div>
                <div className="text-xs font-bold text-white text-center truncate max-w-[110px]">
                  {sortedTeams[1].name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Capt: {sortedTeams[1].captainName}
                </div>

                {/* Quick Point Trigger */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePointClick(sortedTeams[1].id, questionPoints)}
                    className="px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500 text-emerald-200 hover:text-slate-950 text-[10px] font-bold"
                  >
                    +{questionPoints}
                  </button>
                  <button
                    onClick={() => handlePointClick(sortedTeams[1].id, 5)}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
                  >
                    +5
                  </button>
                </div>

                <div className="w-full h-28 bg-gradient-to-t from-slate-800 to-slate-700 rounded-t-3xl border-t-2 border-slate-300 flex flex-col items-center justify-center shadow-xl p-2">
                  <span className="font-display font-black text-xl text-white">
                    {sortedTeams[1].score}
                  </span>
                  <span className="text-[10px] font-mono text-slate-300">points</span>
                </div>
              </div>
            )}

            {/* 1st Place Stand (Champion) */}
            {sortedTeams[0] && (
              <div className="flex flex-col items-center space-y-2 order-2 group">
                <div className="relative">
                  <Crown className="w-8 h-8 text-yellow-400 animate-bounce" />
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-yellow-400 to-amber-500 text-slate-950 font-black flex items-center justify-center text-base shadow-2xl ring-4 ring-yellow-300/40">
                    1st
                  </div>
                </div>
                <div className="text-sm font-black text-yellow-300 text-center truncate max-w-[130px]">
                  {sortedTeams[0].name}
                </div>
                <div className="text-xs text-amber-200 font-mono font-bold">
                  Capt: {sortedTeams[0].captainName}
                </div>

                {/* Quick Point Trigger */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePointClick(sortedTeams[0].id, questionPoints)}
                    className="px-2.5 py-1 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 text-xs font-black shadow-md transition-transform active:scale-95"
                  >
                    +{questionPoints}
                  </button>
                  <button
                    onClick={() => handlePointClick(sortedTeams[0].id, 5)}
                    className="px-2 py-1 rounded-xl bg-amber-400/30 hover:bg-amber-400 text-amber-200 hover:text-slate-950 text-xs font-bold"
                  >
                    +5
                  </button>
                </div>

                <div className="w-full h-40 bg-gradient-to-t from-yellow-600/70 via-amber-600/80 to-yellow-500 rounded-t-3xl border-t-4 border-yellow-300 flex flex-col items-center justify-center shadow-2xl p-2">
                  <span className="font-display font-black text-2xl text-slate-950">
                    {sortedTeams[0].score}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-900">points</span>
                </div>
              </div>
            )}

            {/* 3rd Place Stand */}
            {sortedTeams[2] && (
              <div className="flex flex-col items-center space-y-2 order-3 group">
                <div className="w-9 h-9 rounded-2xl bg-amber-700 text-amber-100 font-black flex items-center justify-center text-xs shadow-lg">
                  3rd
                </div>
                <div className="text-xs font-bold text-white text-center truncate max-w-[110px]">
                  {sortedTeams[2].name}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Capt: {sortedTeams[2].captainName}
                </div>

                {/* Quick Point Trigger */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePointClick(sortedTeams[2].id, questionPoints)}
                    className="px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500 text-emerald-200 hover:text-slate-950 text-[10px] font-bold"
                  >
                    +{questionPoints}
                  </button>
                  <button
                    onClick={() => handlePointClick(sortedTeams[2].id, 5)}
                    className="px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white text-[10px] font-bold"
                  >
                    +5
                  </button>
                </div>

                <div className="w-full h-20 bg-gradient-to-t from-amber-950 to-amber-900 rounded-t-3xl border-t-2 border-amber-600 flex flex-col items-center justify-center shadow-xl p-2">
                  <span className="font-display font-black text-lg text-amber-200">
                    {sortedTeams[2].score}
                  </span>
                  <span className="text-[10px] font-mono text-amber-300/80">points</span>
                </div>
              </div>
            )}

          </div>

          {/* Teams Ranked 4th and below */}
          {sortedTeams.length > 3 && (
            <div className="mt-4 pt-3 border-t border-white/10 space-y-1.5 max-w-xl mx-auto">
              <span className="text-[11px] font-mono text-slate-400 block mb-1">Challenger Teams:</span>
              {sortedTeams.slice(3).map((team, idx) => (
                <div key={team.id} className="flex items-center justify-between p-2 rounded-xl bg-white/5 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-slate-400">#{idx + 4}</span>
                    <span className="font-bold text-white">{team.name}</span>
                    <span className="text-[10px] text-slate-400 font-mono">(Capt: {team.captainName})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">{team.score} pts</span>
                    <button
                      onClick={() => handlePointClick(team.id, questionPoints)}
                      className="px-2 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 text-[10px] font-bold"
                    >
                      +{questionPoints}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODE C: TEAM CARD GRID VIEW */}
      {viewMode === "cards" && (
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {sortedTeams.map((team, rankIndex) => (
            <div
              key={team.id}
              className={`p-4 rounded-2xl border bg-gradient-to-br ${team.color} bg-opacity-20 border-white/15 flex flex-col justify-between gap-3 shadow-lg relative overflow-hidden`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-xl bg-black/50 text-white font-mono font-black text-xs flex items-center justify-center">
                    #{rankIndex + 1}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white leading-tight">{team.name}</h4>
                    <p className="text-[10px] text-amber-200 font-mono mt-0.5">Capt: {team.captainName}</p>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xl font-display font-black text-white">
                    {team.score} <span className="text-[10px] font-normal text-slate-300">pts</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-between border-t border-white/10 pt-2.5">
                <span className="text-[10px] font-mono text-slate-300 font-semibold">Award:</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handlePointClick(team.id, questionPoints)}
                    className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow transition-transform active:scale-95"
                  >
                    +{questionPoints}
                  </button>
                  <button
                    onClick={() => handlePointClick(team.id, 5)}
                    className="px-2 py-1 rounded-lg bg-teal-500/40 hover:bg-teal-500 text-teal-100 font-bold text-xs"
                  >
                    +5
                  </button>
                  <button
                    onClick={() => handlePointClick(team.id, -5)}
                    className="px-1.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500 text-rose-200 font-bold text-xs"
                  >
                    -5
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. BOTTOM TOURNAMENT STATS STRIP */}
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 border-t border-white/10 pt-3 text-[11px] text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          <span>Total Points Awarded: <strong className="text-white font-mono">{totalTeamPoints} pts</strong></span>
          <span>Leader Advantage: <strong className="text-amber-300 font-mono">+{leader ? (leader.score - (sortedTeams[1]?.score || 0)) : 0} pts</strong></span>
        </div>
        <div className="text-slate-400 font-mono">
          EduOS Live Classroom Engine
        </div>
      </div>

      {/* 5. ADD TEAM MODAL */}
      {showAddTeamModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h4 className="font-bold text-sm text-white flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                Add New Classroom Team
              </h4>
              <button
                onClick={() => setShowAddTeamModal(false)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateTeam} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Team Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Quantum Thinkers"
                  value={newTeamName}
                  onChange={e => setNewTeamName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Captain Name:</label>
                <input
                  type="text"
                  placeholder="e.g. Alex"
                  value={newCaptainName}
                  onChange={e => setNewCaptainName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  required
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1 font-semibold">Team Color Theme:</label>
                <div className="grid grid-cols-3 gap-2">
                  {colorOptions.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewTeamColor(c.value)}
                      className={`p-2 rounded-xl border text-[10px] font-bold text-white bg-gradient-to-r ${c.value} ${
                        newTeamColor === c.value ? "border-white ring-2 ring-purple-400" : "border-transparent"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddTeamModal(false)}
                  className="px-3 py-1.5 text-slate-400 hover:text-white text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  Create Team
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. EDIT TEAMS MODAL */}
      {showEditTeamsModal && (
        <EditTeamsModal
          isOpen={showEditTeamsModal}
          onClose={() => setShowEditTeamsModal(false)}
          teams={teams}
          onSaveTeams={(updated) => {
            if (onUpdateTeams) {
              onUpdateTeams(updated);
            }
          }}
          onResetScores={onResetScores}
        />
      )}
    </div>
  );
}

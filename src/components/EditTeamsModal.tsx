import React, { useState } from "react";
import { 
  Users, 
  Plus, 
  Trash2, 
  X, 
  Check, 
  RotateCcw, 
  Sparkles, 
  Palette, 
  Crown, 
  Flame, 
  AlertCircle,
  Shuffle
} from "lucide-react";
import { ClassroomTeam } from "../types";

export interface EditTeamsModalProps {
  isOpen: boolean;
  onClose: () => void;
  teams: ClassroomTeam[];
  onSaveTeams: (updatedTeams: ClassroomTeam[]) => void;
  onResetScores?: () => void;
}

export const TEAM_COLOR_PRESETS = [
  { label: "Cosmic Indigo", value: "from-blue-600 to-indigo-600", bg: "bg-indigo-600" },
  { label: "Emerald Jungle", value: "from-emerald-600 to-teal-600", bg: "bg-emerald-600" },
  { label: "Solar Amber", value: "from-amber-600 to-orange-600", bg: "bg-amber-600" },
  { label: "Cyber Purple", value: "from-purple-600 to-pink-600", bg: "bg-purple-600" },
  { label: "Rose Flame", value: "from-rose-600 to-red-600", bg: "bg-rose-600" },
  { label: "Sky Cyan", value: "from-cyan-600 to-sky-600", bg: "bg-cyan-600" },
  { label: "Neon Lime", value: "from-lime-500 to-emerald-600", bg: "bg-lime-600" },
  { label: "Violet Galaxy", value: "from-violet-600 to-fuchsia-600", bg: "bg-violet-600" }
];

export default function EditTeamsModal({
  isOpen,
  onClose,
  teams: initialTeams,
  onSaveTeams,
  onResetScores
}: EditTeamsModalProps) {
  const [teams, setTeams] = useState<ClassroomTeam[]>(initialTeams);
  const [selectedTeamId, setSelectedTeamId] = useState<string>(initialTeams[0]?.id || "");
  const [isAddingNewTeam, setIsAddingNewTeam] = useState<boolean>(false);
  
  // New Team Form State
  const [newTeamName, setNewTeamName] = useState("");
  const [newCaptainName, setNewCaptainName] = useState("");
  const [newMembersInput, setNewMembersInput] = useState("");
  const [newColor, setNewColor] = useState(TEAM_COLOR_PRESETS[0].value);

  if (!isOpen) return null;

  const activeTeam = teams.find(t => t.id === selectedTeamId) || teams[0];

  const handleUpdateActiveTeam = (field: keyof ClassroomTeam, value: any) => {
    if (!activeTeam) return;
    setTeams(prev => prev.map(t => {
      if (t.id === activeTeam.id) {
        return { ...t, [field]: value };
      }
      return t;
    }));
  };

  const handleMembersChange = (text: string) => {
    const parsed = text.split(",").map(m => m.trim()).filter(Boolean);
    handleUpdateActiveTeam("members", parsed);
  };

  const handleAddNewTeam = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || !newCaptainName.trim()) return;

    const parsedMembers = newMembersInput.split(",").map(m => m.trim()).filter(Boolean);
    if (!parsedMembers.includes(newCaptainName.trim())) {
      parsedMembers.unshift(newCaptainName.trim());
    }

    const newTeam: ClassroomTeam = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      captainName: newCaptainName.trim(),
      color: newColor,
      score: 0,
      members: parsedMembers
    };

    setTeams(prev => [...prev, newTeam]);
    setSelectedTeamId(newTeam.id);
    setNewTeamName("");
    setNewCaptainName("");
    setNewMembersInput("");
    setIsAddingNewTeam(false);
  };

  const handleDeleteTeam = (idToDelete: string) => {
    if (teams.length <= 2) {
      alert("A quiz requires at least 2 teams to play.");
      return;
    }
    if (window.confirm("Are you sure you want to remove this team?")) {
      const remaining = teams.filter(t => t.id !== idToDelete);
      setTeams(remaining);
      if (selectedTeamId === idToDelete) {
        setSelectedTeamId(remaining[0]?.id || "");
      }
    }
  };

  const handleSaveAndClose = () => {
    onSaveTeams(teams);
    onClose();
  };

  const handleScoreChange = (teamId: string, delta: number) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return { ...t, score: Math.max(0, t.score + delta) };
      }
      return t;
    }));
  };

  const handleManualScoreSet = (teamId: string, val: number) => {
    const num = isNaN(val) ? 0 : Math.max(0, val);
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        return { ...t, score: num };
      }
      return t;
    }));
  };

  const handleResetAllScores = () => {
    if (window.confirm("Reset all team scores to 0?")) {
      setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
      if (onResetScores) onResetScores();
    }
  };

  const handleRandomizeColors = () => {
    const shuffledPresets = [...TEAM_COLOR_PRESETS].sort(() => 0.5 - Math.random());
    setTeams(prev => prev.map((t, idx) => ({
      ...t,
      color: shuffledPresets[idx % shuffledPresets.length].value
    })));
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 md:p-6 overflow-y-auto animate-fade-in"
      id="edit_teams_modal_overlay"
    >
      <div 
        className="w-full max-w-3xl bg-slate-900 border border-white/15 rounded-3xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        id="edit_teams_modal_card"
      >
        {/* Modal Header */}
        <div className="bg-slate-800/80 border-b border-white/10 px-5 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-white shadow-md shadow-purple-500/20">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base sm:text-lg text-white">
                Classroom Team Manager
              </h3>
              <p className="text-xs text-slate-400">
                Edit team names, captains, members, colors, and live scores
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRandomizeColors}
              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs flex items-center gap-1.5 transition-colors"
              title="Randomize Team Colors"
            >
              <Palette className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden sm:inline">Random Colors</span>
            </button>
            <button
              onClick={handleResetAllScores}
              className="p-2 rounded-xl bg-white/5 hover:bg-rose-500/20 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 border border-white/10 text-xs flex items-center gap-1.5 transition-colors"
              title="Reset All Team Scores to 0"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset Scores</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body: Two-column layout (Team list on left, Editor on right) */}
        <div className="flex-1 flex flex-col md:flex-row overflow-hidden divide-y md:divide-y-0 md:divide-x divide-white/10">
          
          {/* Left Column: Team List / Selector */}
          <div className="w-full md:w-64 bg-slate-900/60 p-3 sm:p-4 overflow-y-auto space-y-2 shrink-0">
            <div className="flex items-center justify-between pb-1">
              <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                Teams ({teams.length})
              </span>
              <button
                onClick={() => setIsAddingNewTeam(true)}
                className="px-2.5 py-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs flex items-center gap-1 shadow transition-transform active:scale-95"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {teams.map((t, idx) => {
                const isSelected = !isAddingNewTeam && t.id === selectedTeamId;
                return (
                  <button
                    key={t.id}
                    onClick={() => {
                      setSelectedTeamId(t.id);
                      setIsAddingNewTeam(false);
                    }}
                    className={`w-full p-2.5 rounded-2xl border text-left flex items-center justify-between gap-2 transition-all ${
                      isSelected
                        ? "bg-white/15 border-purple-400/80 shadow-md ring-1 ring-purple-400/50"
                        : "bg-white/5 border-white/10 hover:bg-white/10 text-slate-300"
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-6 h-6 rounded-lg bg-gradient-to-r ${t.color} text-white font-black text-[10px] flex items-center justify-center shrink-0 shadow`}>
                        {idx + 1}
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-xs text-white truncate">{t.name}</div>
                        <div className="text-[10px] text-slate-400 truncate">Capt: {t.captainName}</div>
                      </div>
                    </div>

                    <div className="font-mono font-bold text-xs text-amber-300 shrink-0">
                      {t.score} <span className="text-[9px] text-slate-400 font-normal">pts</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Team Editor OR Add New Team Form */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto bg-slate-900/90">
            {isAddingNewTeam ? (
              /* ADD NEW TEAM FORM */
              <form onSubmit={handleAddNewTeam} className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h4 className="font-bold text-sm text-white flex items-center gap-2">
                    <Plus className="w-4 h-4 text-purple-400" />
                    Create New Quiz Team
                  </h4>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewTeam(false)}
                    className="text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Team Name:</label>
                  <input
                    type="text"
                    value={newTeamName}
                    onChange={e => setNewTeamName(e.target.value)}
                    placeholder="e.g. Astro Knights"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">Captain Name:</label>
                  <input
                    type="text"
                    value={newCaptainName}
                    onChange={e => setNewCaptainName(e.target.value)}
                    placeholder="e.g. Samantha"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                    required
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">
                    Team Members (comma separated):
                  </label>
                  <input
                    type="text"
                    value={newMembersInput}
                    onChange={e => setNewMembersInput(e.target.value)}
                    placeholder="e.g. Samantha, Liam, Noah, Emma"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Color Theme:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TEAM_COLOR_PRESETS.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setNewColor(c.value)}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-white bg-gradient-to-r ${c.value} ${
                          newColor === c.value ? "border-white ring-2 ring-purple-400 shadow-md" : "border-transparent opacity-80 hover:opacity-100"
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
                    onClick={() => setIsAddingNewTeam(false)}
                    className="px-4 py-2 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl text-xs font-bold shadow-lg"
                  >
                    Save &amp; Add Team
                  </button>
                </div>
              </form>
            ) : activeTeam ? (
              /* EDIT EXISTING TEAM FORM */
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className={`w-4 h-4 rounded-full bg-gradient-to-r ${activeTeam.color}`} />
                    <h4 className="font-bold text-sm text-white">
                      Edit Team: <span className="text-purple-300">{activeTeam.name}</span>
                    </h4>
                  </div>

                  {teams.length > 2 && (
                    <button
                      onClick={() => handleDeleteTeam(activeTeam.id)}
                      className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 transition-colors"
                      title="Delete this team"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Delete Team</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-semibold">Team Name:</label>
                    <input
                      type="text"
                      value={activeTeam.name}
                      onChange={e => handleUpdateActiveTeam("name", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-slate-300 block mb-1 font-semibold">Captain Name:</label>
                    <input
                      type="text"
                      value={activeTeam.captainName}
                      onChange={e => handleUpdateActiveTeam("captainName", e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-purple-400 font-bold"
                    />
                  </div>
                </div>

                {/* Score Modifier Section */}
                <div className="p-3.5 bg-white/5 border border-white/10 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Flame className="w-4 h-4 text-amber-400" />
                      Current Team Score
                    </span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="number"
                        value={activeTeam.score}
                        onChange={e => handleManualScoreSet(activeTeam.id, parseInt(e.target.value, 10))}
                        className="w-20 px-2.5 py-1 bg-slate-900 border border-amber-400/50 rounded-lg text-center font-display font-black text-amber-300 text-sm focus:outline-none focus:border-amber-400"
                        min="0"
                      />
                      <span className="text-xs text-slate-400 font-mono">pts</span>
                    </div>
                  </div>

                  {/* Quick Adjust Buttons */}
                  <div className="flex items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-mono">Quick Adjust:</span>
                    <button
                      type="button"
                      onClick={() => handleScoreChange(activeTeam.id, 10)}
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 font-bold text-xs transition-colors"
                    >
                      +10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreChange(activeTeam.id, 5)}
                      className="px-2 py-0.5 rounded-lg bg-teal-500/20 hover:bg-teal-500 text-teal-300 hover:text-slate-950 font-bold text-xs transition-colors"
                    >
                      +5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreChange(activeTeam.id, -5)}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition-colors"
                    >
                      -5
                    </button>
                    <button
                      type="button"
                      onClick={() => handleScoreChange(activeTeam.id, -10)}
                      className="px-2 py-0.5 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white font-bold text-xs transition-colors"
                    >
                      -10
                    </button>
                    <button
                      type="button"
                      onClick={() => handleManualScoreSet(activeTeam.id, 0)}
                      className="px-2 py-0.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-400 hover:text-white text-[11px] transition-colors ml-auto"
                    >
                      Zero
                    </button>
                  </div>
                </div>

                {/* Team Members List / Tag input */}
                <div>
                  <label className="text-xs text-slate-300 block mb-1 font-semibold">
                    Roster / Members (comma separated):
                  </label>
                  <input
                    type="text"
                    value={activeTeam.members?.join(", ") || ""}
                    onChange={e => handleMembersChange(e.target.value)}
                    placeholder="e.g. Maya, Alex, Jordan, Sarah"
                    className="w-full px-3 py-2 bg-slate-800 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Student names in this team for attendance and captain rotation
                  </p>
                </div>

                {/* Team Color Selection */}
                <div>
                  <label className="text-xs text-slate-300 block mb-1.5 font-semibold">Theme Color:</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {TEAM_COLOR_PRESETS.map((c, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleUpdateActiveTeam("color", c.value)}
                        className={`p-2 rounded-xl border text-[11px] font-bold text-white bg-gradient-to-r ${c.value} transition-all ${
                          activeTeam.color === c.value
                            ? "border-white ring-2 ring-purple-400 shadow-md scale-[1.02]"
                            : "border-transparent opacity-80 hover:opacity-100"
                        }`}
                      >
                        {c.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-slate-800/80 border-t border-white/10 px-5 py-3.5 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {teams.length} teams configured • Ready for live quiz session
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveAndClose}
              className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-black text-xs rounded-xl shadow-lg flex items-center gap-1.5 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>Apply Changes</span>
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

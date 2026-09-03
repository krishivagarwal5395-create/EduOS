import React, { useState, useEffect, useRef } from "react";
import { 
  Trophy, Users, CheckCircle2, AlertCircle, Sparkles, RefreshCw, 
  HelpCircle, Eye, EyeOff, Award, ChevronRight, ChevronLeft, 
  Plus, Trash2, Edit3, Bookmark, RotateCcw, Volume2, VolumeX, ShieldCheck, 
  Timer, Flame, BookOpen, Star, Crown, Play, Pause, Check, X, FileText, FileDown, Save,
  Maximize2, Minimize2, Lightbulb, Zap, PartyPopper
} from "lucide-react";
import { ClassroomQuiz, ClassroomTeam, QuizQuestionItem, SavedItem, CustomInstructions } from "../types";
import { handleExportTeacherAnswerKeyPDF, handleExportTeacherAnswerKeyWord, handleExportToPDF, handleExportToWord } from "../utils/exportUtils";
import QuizLeaderboard from "./QuizLeaderboard";

// Web Audio API Synthesizer for Quiz SFX
class QuizAudioEngine {
  private ctx: AudioContext | null = null;
  public enabled: boolean = true;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  playCorrect() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc2.type = "triangle";

      osc1.frequency.setValueAtTime(523.25, now); // C5
      osc1.frequency.exponentialRampToValueAtTime(659.25, now + 0.1); // E5
      osc1.frequency.exponentialRampToValueAtTime(783.99, now + 0.2); // G5
      osc1.frequency.exponentialRampToValueAtTime(1046.50, now + 0.32); // C6

      osc2.frequency.setValueAtTime(261.63, now);
      osc2.frequency.exponentialRampToValueAtTime(523.25, now + 0.32);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.6);
      osc2.stop(now + 0.6);
    } catch (e) {}
  }

  playIncorrect() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(150, now + 0.28);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch (e) {}
  }

  playTick() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(now);
      osc.stop(now + 0.05);
    } catch (e) {}
  }

  playFanfare() {
    if (!this.enabled) return;
    try {
      this.init();
      if (!this.ctx) return;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51];
      const now = this.ctx.currentTime;
      notes.forEach((freq, idx) => {
        if (!this.ctx) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);
        gain.gain.setValueAtTime(0.2, now + idx * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.45);
        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.5);
      });
    } catch (e) {}
  }
}

const quizAudio = new QuizAudioEngine();

interface ClassroomQuizMakerProps {
  savedMaterials: SavedItem[];
  customInstructions: CustomInstructions;
  onSaveItem: (type: 'class-quiz', title: string, data: ClassroomQuiz) => void;
  prefillChapter?: string;
  prefillSubject?: string;
  prefillGrade?: string;
  initialQuiz?: ClassroomQuiz | null;
}

const DEFAULT_TEAMS: ClassroomTeam[] = [
  { id: "team-1", name: "Cosmic Falcons", captainName: "Maya", color: "from-blue-600 to-indigo-600", score: 0, members: ["Maya", "Alex", "Jordan"] },
  { id: "team-2", name: "Quantum Sparks", captainName: "Leo", color: "from-emerald-600 to-teal-600", score: 0, members: ["Leo", "Sophia", "Ethan"] },
  { id: "team-3", name: "Solar Titans", captainName: "Aarav", color: "from-amber-600 to-orange-600", score: 0, members: ["Aarav", "Emma", "Lucas"] },
  { id: "team-4", name: "Bio Blazers", captainName: "Chloe", color: "from-purple-600 to-pink-600", score: 0, members: ["Chloe", "Daniel", "Zoe"] }
];

const TEAM_COLOR_OPTIONS = [
  { label: "Blue / Indigo", value: "from-blue-600 to-indigo-600", border: "border-blue-400" },
  { label: "Emerald / Teal", value: "from-emerald-600 to-teal-600", border: "border-emerald-400" },
  { label: "Amber / Orange", value: "from-amber-600 to-orange-600", border: "border-amber-400" },
  { label: "Purple / Pink", value: "from-purple-600 to-pink-600", border: "border-purple-400" },
  { label: "Rose / Red", value: "from-rose-600 to-red-600", border: "border-rose-400" },
  { label: "Cyan / Sky", value: "from-cyan-600 to-sky-600", border: "border-cyan-400" }
];

export default function ClassroomQuizMaker({
  savedMaterials,
  customInstructions,
  onSaveItem,
  prefillChapter = "",
  prefillSubject = "Science",
  prefillGrade = "Grade 7",
  initialQuiz = null
}: ClassroomQuizMakerProps) {
  // Generation States
  const [chapterTopic, setChapterTopic] = useState(prefillChapter);
  const [subject, setSubject] = useState(prefillSubject);
  const [grade, setGrade] = useState(prefillGrade);
  const [numQuestions, setNumQuestions] = useState<number>(8);
  const [difficulty, setDifficulty] = useState<string>("Balanced (Fun & Challenging)");
  const [chapterCompleted, setChapterCompleted] = useState<boolean>(true);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("none");
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Active Quiz Game State
  const [quiz, setQuiz] = useState<ClassroomQuiz | null>(initialQuiz || null);
  const [currentQIndex, setCurrentQIndex] = useState<number>(0);
  const [activeQuizTab, setActiveQuizTab] = useState<'stage' | 'leaderboard'>('stage');
  const [teacherMode, setTeacherMode] = useState<boolean>(true);
  const [isEditingQuestion, setIsEditingQuestion] = useState<boolean>(false);
  const [selectedOptionIndex, setSelectedOptionIndex] = useState<number | null>(null);
  const [revealedOptions, setRevealedOptions] = useState<Record<number, boolean>>({});
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  // Editable Question Form State
  const [editQText, setEditQText] = useState<string>("");
  const [editOptions, setEditOptions] = useState<string[]>(["", "", "", ""]);
  const [editCorrectOptionIndex, setEditCorrectOptionIndex] = useState<number>(0);
  const [editExplanation, setEditExplanation] = useState<string>("");
  const [editTeacherHint, setEditTeacherHint] = useState<string>("");
  const [editCommonMisconception, setEditCommonMisconception] = useState<string>("");
  const [editPoints, setEditPoints] = useState<number>(10);

  // Teams & Scoring State
  const [teams, setTeams] = useState<ClassroomTeam[]>(DEFAULT_TEAMS);
  const [newTeamName, setNewTeamName] = useState<string>("");
  const [newCaptainName, setNewCaptainName] = useState<string>("");
  const [newTeamColor, setNewTeamColor] = useState<string>(TEAM_COLOR_OPTIONS[0].value);
  const [teamFormOpen, setTeamFormOpen] = useState<boolean>(false);
  const [selectedAwardTeamId, setSelectedAwardTeamId] = useState<string>(teams[0]?.id || "");
  const [pointNotification, setPointNotification] = useState<string | null>(null);

  // Fullscreen, Audio & Timer States
  const [isFullScreen, setIsFullScreen] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [timerDuration, setTimerDuration] = useState<number>(30); // 15, 30, 45, 60, 90, 0=off
  const [timerRemaining, setTimerRemaining] = useState<number>(30);
  const [timerIsRunning, setTimerIsRunning] = useState<boolean>(false);
  const [showFullscreenLeaderboard, setShowFullscreenLeaderboard] = useState<boolean>(false);
  const [showFullscreenHint, setShowFullscreenHint] = useState<boolean>(false);
  const [showFullscreenTeacherHUD, setShowFullscreenTeacherHUD] = useState<boolean>(false);
  const timerRef = useRef<any>(null);

  // Sync Audio Setting
  useEffect(() => {
    quizAudio.enabled = soundEnabled;
  }, [soundEnabled]);

  // Timer Tick Interval
  useEffect(() => {
    if (timerIsRunning && timerDuration > 0) {
      timerRef.current = setInterval(() => {
        setTimerRemaining(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setTimerIsRunning(false);
            quizAudio.playIncorrect();
            return 0;
          }
          if (prev <= 6) {
            quizAudio.playTick();
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerIsRunning, timerDuration]);

  const handleResetTimer = (dur?: number) => {
    const durationToSet = dur !== undefined ? dur : timerDuration;
    setTimerRemaining(durationToSet);
    setTimerIsRunning(false);
  };

  const handleStartTimer = () => {
    if (timerRemaining === 0) {
      setTimerRemaining(timerDuration);
    }
    setTimerIsRunning(true);
  };

  const handlePauseTimer = () => {
    setTimerIsRunning(false);
  };

  // Fullscreen Toggler
  const toggleFullScreen = () => {
    if (!isFullScreen) {
      setIsFullScreen(true);
      setShowFullscreenLeaderboard(false);
      setShowFullscreenHint(false);
      handleResetTimer();
      try {
        if (document.documentElement.requestFullscreen) {
          document.documentElement.requestFullscreen().catch(() => {});
        }
      } catch (e) {}
    } else {
      setIsFullScreen(false);
      setShowFullscreenLeaderboard(false);
      try {
        if (document.fullscreenElement && document.exitFullscreen) {
          document.exitFullscreen().catch(() => {});
        }
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (initialQuiz) {
      setQuiz(initialQuiz);
      setCurrentQIndex(0);
      setSelectedOptionIndex(null);
      setRevealedOptions({});
      handleResetTimer();
    }
  }, [initialQuiz]);

  const currentQ: QuizQuestionItem | undefined = quiz?.questions?.[currentQIndex];

  // Sync edit form state when switching questions
  useEffect(() => {
    if (currentQ) {
      setEditQText(currentQ.question || "");
      setEditOptions(currentQ.options && currentQ.options.length > 0 ? [...currentQ.options] : ["", "", "", ""]);
      setEditCorrectOptionIndex(currentQ.correctOptionIndex ?? 0);
      setEditExplanation(currentQ.explanation || "");
      setEditTeacherHint(currentQ.teacherHint || "");
      setEditCommonMisconception(currentQ.commonMisconception || "");
      setEditPoints(currentQ.points || 10);
    }
  }, [currentQIndex, quiz]);

  // Keyboard Navigation for Fullscreen and Interactive Stage
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.key === 'Escape' && isFullScreen) {
        setIsFullScreen(false);
        return;
      }

      if (e.key.toLowerCase() === 'f' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        if (quiz) {
          toggleFullScreen();
        }
        return;
      }

      if (!quiz) return;

      // Question navigation
      if (e.key === 'ArrowRight' || e.key.toLowerCase() === 'n') {
        if (currentQIndex < quiz.questions.length - 1) {
          setCurrentQIndex(prev => prev + 1);
          setSelectedOptionIndex(null);
          setRevealedOptions({});
          setIsEditingQuestion(false);
          setShowFullscreenHint(false);
          handleResetTimer();
        }
      } else if (e.key === 'ArrowLeft' || e.key.toLowerCase() === 'p') {
        if (currentQIndex > 0) {
          setCurrentQIndex(prev => prev - 1);
          setSelectedOptionIndex(null);
          setRevealedOptions({});
          setIsEditingQuestion(false);
          setShowFullscreenHint(false);
          handleResetTimer();
        }
      } else if (['1', '2', '3', '4'].includes(e.key)) {
        const oIdx = parseInt(e.key) - 1;
        if (currentQ?.options && oIdx < currentQ.options.length) {
          handleSelectOption(oIdx);
        }
      } else if (['a', 'b', 'c', 'd'].includes(e.key.toLowerCase())) {
        const oIdx = e.key.toLowerCase().charCodeAt(0) - 97;
        if (currentQ?.options && oIdx < currentQ.options.length) {
          handleSelectOption(oIdx);
        }
      } else if (e.key === ' ') {
        e.preventDefault();
        if (timerIsRunning) {
          handlePauseTimer();
        } else if (timerDuration > 0 && timerRemaining > 0) {
          handleStartTimer();
        }
      } else if (e.key.toLowerCase() === 't') {
        if (isFullScreen) {
          setShowFullscreenTeacherHUD(prev => !prev);
        } else {
          setTeacherMode(prev => !prev);
        }
      } else if (e.key.toLowerCase() === 'l' && isFullScreen) {
        setShowFullscreenLeaderboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [quiz, isFullScreen, currentQIndex, currentQ, timerIsRunning, timerDuration, timerRemaining]);

  // Filter saved materials for chapter selection
  const chapterMaterials = savedMaterials.filter(m => m.type === 'scanned-chapter' || m.type === 'notebook' || m.type === 'lesson-plan');

  const handleGenerateQuiz = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!chapterTopic.trim() && selectedMaterialId === "none") {
      setError("Please specify a chapter/topic or select a saved chapter from the library.");
      return;
    }

    setLoading(true);
    setError(null);
    setIsEditingQuestion(false);

    let sourceContent = "";
    if (selectedMaterialId !== "none") {
      const found = savedMaterials.find(m => m.id === selectedMaterialId);
      if (found) {
        if (found.type === 'scanned-chapter') {
          sourceContent = found.data?.content || "";
        } else if (found.type === 'notebook') {
          sourceContent = `${found.data?.summary || ""}\n${(found.data?.sections || []).map((s: any) => `${s.heading}:\n${s.points?.join("\n")}`).join("\n\n")}`;
        } else {
          sourceContent = JSON.stringify(found.data);
        }
      }
    }

    try {
      const res = await fetch("/api/edu/generate-class-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chapterTopic: chapterTopic.trim(),
          subject,
          grade,
          numQuestions,
          difficulty,
          chapterCompleted,
          customInstructions: customInstructions?.generalTone,
          sourceContent
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate class quiz");

      setQuiz(data);
      setCurrentQIndex(0);
      setSelectedOptionIndex(null);
      setRevealedOptions({});
      // Reset team scores for new quiz
      setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to AI engine");
    } finally {
      setLoading(false);
    }
  };

  // Save Teacher Edited Question & Correct Answer
  const handleSaveQuestionEdit = () => {
    if (!quiz || !currentQ) return;
    const cleanOptions = editOptions.map((opt, i) => opt.trim() || `Option ${String.fromCharCode(65 + i)}`);
    const correctLetter = String.fromCharCode(65 + editCorrectOptionIndex);

    const updatedQuestion: QuizQuestionItem = {
      ...currentQ,
      question: editQText.trim() || currentQ.question,
      options: cleanOptions,
      correctOptionIndex: editCorrectOptionIndex,
      correctOptionLetter: correctLetter,
      correctAnswerText: cleanOptions[editCorrectOptionIndex],
      explanation: editExplanation.trim(),
      teacherHint: editTeacherHint.trim(),
      commonMisconception: editCommonMisconception.trim(),
      points: Number(editPoints) || 10
    };

    const updatedQuestions = [...quiz.questions];
    updatedQuestions[currentQIndex] = updatedQuestion;

    const updatedQuiz: ClassroomQuiz = {
      ...quiz,
      questions: updatedQuestions
    };

    setQuiz(updatedQuiz);
    setIsEditingQuestion(false);
    setSelectedOptionIndex(null);
    setRevealedOptions({});
    setPointNotification(`Saved changes to Question ${currentQIndex + 1} & Answer Key!`);
    setTimeout(() => setPointNotification(null), 2500);
  };

  // Add a new question to the active quiz
  const handleAddQuestion = () => {
    if (!quiz) return;
    const newQ: QuizQuestionItem = {
      id: `q-${Date.now()}`,
      question: "Enter new classroom question here...",
      options: ["Option A", "Option B", "Option C", "Option D"],
      correctOptionIndex: 0,
      correctOptionLetter: "A",
      correctAnswerText: "Option A",
      explanation: "Teacher explanation for the correct answer.",
      teacherHint: "Hint for students.",
      commonMisconception: "Common pitfall to avoid.",
      points: 10
    };

    const updatedQuiz: ClassroomQuiz = {
      ...quiz,
      questions: [...quiz.questions, newQ]
    };
    setQuiz(updatedQuiz);
    setCurrentQIndex(updatedQuiz.questions.length - 1);
    setIsEditingQuestion(true);
  };

  // Delete current question
  const handleDeleteQuestion = (idxToDelete: number) => {
    if (!quiz || quiz.questions.length <= 1) return;
    const updatedQuestions = quiz.questions.filter((_, i) => i !== idxToDelete);
    const updatedQuiz: ClassroomQuiz = {
      ...quiz,
      questions: updatedQuestions
    };
    setQuiz(updatedQuiz);
    setCurrentQIndex(Math.max(0, idxToDelete - 1));
    setIsEditingQuestion(false);
  };

  // Option Click Handler (Interactive Classroom Flow)
  const handleSelectOption = (oIdx: number) => {
    setSelectedOptionIndex(oIdx);
    setRevealedOptions(prev => ({ ...prev, [oIdx]: true }));
    if (currentQ) {
      if (oIdx === currentQ.correctOptionIndex) {
        quizAudio.playCorrect();
      } else {
        quizAudio.playIncorrect();
      }
    }
  };

  // Award Points to a specific team
  const handleAwardPoints = (teamId: string, pts: number) => {
    setTeams(prev => prev.map(t => {
      if (t.id === teamId) {
        const newScore = Math.max(0, t.score + pts);
        return { ...t, score: newScore };
      }
      return t;
    }));

    if (pts > 0) {
      quizAudio.playCorrect();
    } else {
      quizAudio.playIncorrect();
    }

    const targetTeam = teams.find(t => t.id === teamId);
    setPointNotification(`${pts > 0 ? `+${pts}` : pts} pts awarded to ${targetTeam?.name} (Captain: ${targetTeam?.captainName})!`);
    setTimeout(() => setPointNotification(null), 3000);
  };

  // Add New Team
  const handleAddTeam = () => {
    if (!newTeamName.trim() || !newCaptainName.trim()) return;
    const newTeam: ClassroomTeam = {
      id: `team-${Date.now()}`,
      name: newTeamName.trim(),
      captainName: newCaptainName.trim(),
      color: newTeamColor,
      score: 0,
      members: [newCaptainName.trim()]
    };
    setTeams(prev => [...prev, newTeam]);
    setNewTeamName("");
    setNewCaptainName("");
    setTeamFormOpen(false);
  };

  // Remove Team
  const handleRemoveTeam = (id: string) => {
    setTeams(prev => prev.filter(t => t.id !== id));
  };

  // Reset all team points
  const handleResetScores = () => {
    setTeams(prev => prev.map(t => ({ ...t, score: 0 })));
  };

  const handleSaveQuiz = () => {
    if (!quiz) return;
    onSaveItem('class-quiz', `${quiz.quizTitle} (${quiz.chapter})`, quiz);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  // Sort teams by score for leaderboard
  const sortedTeams = [...teams].sort((a, b) => b.score - a.score);

  return (
    <div className="flex flex-col gap-6" id="classroom_quiz_maker_view">
      
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-amber-900/40 via-purple-900/30 to-slate-900/60 border border-amber-500/30 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-mono text-xs uppercase tracking-wider mb-1">
            <Trophy className="w-4 h-4 text-amber-400" />
            <span>Classroom Game Show &amp; Question Studio</span>
            <span className="bg-amber-500/20 text-amber-300 text-[10px] px-2 py-0.5 rounded-full border border-amber-500/30">Team Play</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            Interactive Classroom Team Quiz
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Generate engaging interactive quizzes for chapters. Form student teams with designated captains, project questions on screen, manage points dynamically, and receive the teacher's complete answer key.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setSoundEnabled(prev => !prev)}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all ${
              soundEnabled
                ? 'bg-purple-500/20 border-purple-400/50 text-purple-200'
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title={soundEnabled ? "Mute Game Show Sounds" : "Unmute Game Show Sounds"}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-300" /> : <VolumeX className="w-4 h-4" />}
            <span className="hidden sm:inline">{soundEnabled ? "Sound On" : "Muted"}</span>
          </button>

          <button
            onClick={() => setTeacherMode(prev => !prev)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              teacherMode 
                ? 'bg-amber-500/20 border-amber-400 text-amber-200 shadow-md shadow-amber-500/10' 
                : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
            }`}
            title="Toggle Teacher Mode (reveals answers and teaching tips)"
          >
            {teacherMode ? <Eye className="w-4 h-4 text-amber-400" /> : <EyeOff className="w-4 h-4" />}
            <span>{teacherMode ? "Teacher Key Visible" : "Student Display Mode"}</span>
          </button>

          {quiz && (
            <button
              onClick={toggleFullScreen}
              className="px-4 py-2 rounded-xl text-xs font-extrabold flex items-center gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 shadow-lg shadow-amber-500/20 border border-amber-400 transition-all transform hover:scale-[1.02]"
              title="Launch Full Screen Projector Mode (Press F)"
            >
              <Maximize2 className="w-4 h-4 text-slate-950" />
              <span>Full Screen Arena</span>
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs rounded-xl flex items-center justify-between shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-4">✕</button>
        </div>
      )}

      {pointNotification && (
        <div className="bg-gradient-to-r from-emerald-900/90 to-teal-900/90 border border-emerald-400/50 px-4 py-3 rounded-xl text-emerald-200 text-xs font-bold flex items-center justify-between shadow-xl animate-fade-in">
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-emerald-300 animate-bounce" />
            <span>{pointNotification}</span>
          </div>
          <button onClick={() => setPointNotification(null)} className="text-emerald-400 hover:text-emerald-200">✕</button>
        </div>
      )}

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Chapter Setup & Teams Management (4 cols) */}
        <div className="lg:col-span-4 space-y-5">
          
          {/* 1. Chapter Quiz Generator Form */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-lg space-y-4">
            <div className="border-b border-white/10 pb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-amber-400" />
                <span>Chapter &amp; Topic Selection</span>
              </h3>
            </div>

            <form onSubmit={handleGenerateQuiz} className="space-y-3.5">
              
              {/* Select from Saved Scanned Chapters */}
              {chapterMaterials.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Select Chapter from Saved Library
                  </label>
                  <select
                    value={selectedMaterialId}
                    onChange={(e) => {
                      setSelectedMaterialId(e.target.value);
                      const found = savedMaterials.find(m => m.id === e.target.value);
                      if (found) {
                        setChapterTopic(found.title.replace(/^\[.*?\]\s*/, ''));
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="none">-- Custom Chapter Input Below --</option>
                    {chapterMaterials.map(m => (
                      <option key={m.id} value={m.id}>
                        [{m.type}] {m.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Chapter Name / Topic */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Chapter / Topic Name <span className="text-amber-400">*</span>
                </label>
                <input
                  type="text"
                  value={chapterTopic}
                  onChange={(e) => setChapterTopic(e.target.value)}
                  placeholder="e.g. Photosynthesis & Cellular Energy, Linear Equations..."
                  className="w-full px-3.5 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-400"
                  required
                />
              </div>

              {/* Chapter Completed Done Checkbox */}
              <div className="bg-amber-950/30 border border-amber-500/30 rounded-xl p-3 flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-amber-200 block">Mark Chapter as Done</span>
                  <p className="text-[10px] text-amber-300/70">Marks this chapter completed for curriculum tracking</p>
                </div>
                <button
                  type="button"
                  onClick={() => setChapterCompleted(prev => !prev)}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border transition-all ${
                    chapterCompleted 
                      ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md shadow-amber-500/20' 
                      : 'border-white/20 bg-slate-900 text-transparent'
                  }`}
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                </button>
              </div>

              {/* Subject & Grade */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Subject</label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Grade</label>
                  <input
                    type="text"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  />
                </div>
              </div>

              {/* Questions Count & Difficulty */}
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Questions</label>
                  <select
                    value={numQuestions}
                    onChange={(e) => setNumQuestions(Number(e.target.value))}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value={5}>5 Questions</option>
                    <option value={8}>8 Questions</option>
                    <option value={10}>10 Questions</option>
                    <option value={12}>12 Questions</option>
                    <option value={15}>15 Questions</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">Difficulty</label>
                  <select
                    value={difficulty}
                    onChange={(e) => setDifficulty(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                  >
                    <option value="Elementary & Fun">Elementary &amp; Fun</option>
                    <option value="Balanced (Fun & Challenging)">Balanced</option>
                    <option value="Advanced Competition">Advanced AP/IB</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-amber-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Generating Classroom Quiz...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Generate Interactive Quiz</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* 2. Teams & Captains Management Panel */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 md:p-5 backdrop-blur-md shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">Class Teams &amp; Captains</h3>
              </div>
              
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleResetScores}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 text-[10px] font-semibold text-slate-400 hover:text-white"
                  title="Reset all team scores"
                >
                  Reset Scores
                </button>
                <button
                  onClick={() => setTeamFormOpen(prev => !prev)}
                  className="p-1 rounded-lg bg-purple-600 hover:bg-purple-500 text-white"
                  title="Add new team"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Team Add Form Dropdown */}
            {teamFormOpen && (
              <div className="bg-slate-900/90 border border-purple-500/30 rounded-xl p-3 space-y-2.5 animate-fade-in">
                <div className="text-xs font-bold text-purple-300">Create New Team</div>
                <input
                  type="text"
                  placeholder="Team Name (e.g. Science Dragons)"
                  value={newTeamName}
                  onChange={(e) => setNewTeamName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-white/15 rounded-lg text-xs text-white placeholder-slate-500"
                />
                <input
                  type="text"
                  placeholder="Captain Allotted Name (e.g. Sarah)"
                  value={newCaptainName}
                  onChange={(e) => setNewCaptainName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-800 border border-white/15 rounded-lg text-xs text-white placeholder-slate-500"
                />
                <div className="flex gap-1.5 overflow-x-auto pb-1">
                  {TEAM_COLOR_OPTIONS.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setNewTeamColor(c.value)}
                      className={`w-6 h-6 rounded-full bg-gradient-to-r ${c.value} border-2 ${newTeamColor === c.value ? 'border-white ring-2 ring-purple-400' : 'border-transparent'}`}
                    />
                  ))}
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setTeamFormOpen(false)}
                    className="px-2.5 py-1 text-slate-400 hover:text-white text-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleAddTeam}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold"
                  >
                    Add Team
                  </button>
                </div>
              </div>
            )}

            {/* Teams List with Live Scores & Quick Point Modifiers */}
            <div className="space-y-2.5 max-h-[380px] overflow-y-auto smooth-scroll pr-1">
              {teams.map((team, idx) => (
                <div
                  key={team.id}
                  className={`p-3 rounded-xl border bg-gradient-to-r ${team.color} bg-opacity-20 border-white/10 flex flex-col gap-2 relative shadow-md`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-black/40 flex items-center justify-center text-xs font-mono font-bold text-white">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xs font-bold text-white leading-tight">{team.name}</div>
                        <div className="text-[10px] text-amber-200 font-mono flex items-center gap-1 mt-0.5">
                          <Crown className="w-3 h-3 text-amber-300" />
                          <span>Captain: <strong>{team.captainName}</strong></span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-base font-display font-extrabold text-white">
                        {team.score} <span className="text-[10px] font-normal text-slate-300">pts</span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Teacher Point Adjustment Controls */}
                  <div className="flex items-center justify-between border-t border-white/10 pt-2 text-[10px]">
                    <span className="text-slate-300 font-semibold">Quick Points:</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleAwardPoints(team.id, 10)}
                        className="px-2 py-0.5 rounded bg-emerald-500/30 hover:bg-emerald-500/50 border border-emerald-400/40 text-emerald-200 font-bold"
                      >
                        +10
                      </button>
                      <button
                        onClick={() => handleAwardPoints(team.id, 5)}
                        className="px-2 py-0.5 rounded bg-teal-500/30 hover:bg-teal-500/50 border border-teal-400/40 text-teal-200 font-bold"
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleAwardPoints(team.id, -5)}
                        className="px-2 py-0.5 rounded bg-rose-500/30 hover:bg-rose-500/50 border border-rose-400/40 text-rose-200 font-bold"
                      >
                        -5
                      </button>
                      {teams.length > 2 && (
                        <button
                          onClick={() => handleRemoveTeam(team.id)}
                          className="p-1 rounded text-slate-400 hover:text-rose-300"
                          title="Remove Team"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>

          </div>

        </div>

        {/* Right Column: Interactive Quiz Stage & Teacher Answer Key (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          
          {quiz && currentQ ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-2xl space-y-6 animate-fade-in">
              
              {/* Quiz Header Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-semibold">
                      Question {currentQIndex + 1} of {quiz.questions.length}
                    </span>
                    {quiz.chapterCompleted && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        Chapter Completed
                      </span>
                    )}
                    <span className="text-xs text-slate-400 font-mono">• {currentQ.points || 10} Points</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-1.5">{quiz.quizTitle}</h3>
                </div>

                {/* Question Navigation & Actions */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  {/* Stage / Leaderboard View Tab Switcher */}
                  <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                    <button
                      type="button"
                      onClick={() => setActiveQuizTab('stage')}
                      className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        activeQuizTab === 'stage'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <HelpCircle className="w-3.5 h-3.5" />
                      <span>Stage</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveQuizTab('leaderboard')}
                      className={`px-2.5 py-1 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                        activeQuizTab === 'leaderboard'
                          ? 'bg-amber-500 text-slate-950 shadow-md'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Trophy className="w-3.5 h-3.5 text-slate-950" />
                      <span>Leaderboard</span>
                    </button>
                  </div>

                  {/* Edit Question & Key Toggle */}
                  <button
                    onClick={() => setIsEditingQuestion(prev => !prev)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      isEditingQuestion
                        ? 'bg-amber-500 border-amber-400 text-slate-950 shadow-md font-bold'
                        : 'bg-amber-500/15 border-amber-500/30 text-amber-300 hover:bg-amber-500/25'
                    }`}
                    title="Edit question text, options, or change correct answer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>{isEditingQuestion ? "Editing" : "Edit Q"}</span>
                  </button>

                  {/* Export Separate Teacher Answer Key PDF */}
                  <button
                    onClick={() => handleExportTeacherAnswerKeyPDF(quiz)}
                    className="px-2.5 py-1.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold flex items-center gap-1 transition-all"
                    title="Export dedicated Teacher Master Answer Key PDF"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-400" />
                    <span className="hidden sm:inline">Key PDF</span>
                  </button>

                  {/* Save Quiz */}
                  <button
                    onClick={handleSaveQuiz}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      savedSuccess 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{savedSuccess ? "Saved!" : "Save"}</span>
                  </button>

                  {/* Full Screen Mode Launcher */}
                  <button
                    onClick={toggleFullScreen}
                    className="px-3.5 py-1.5 rounded-xl border border-amber-400/60 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
                    title="Enter Full Screen Quiz Arena (Press F)"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-slate-950" />
                    <span>Full Screen (F)</span>
                  </button>

                  {/* Prev / Next Pagination */}
                  <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
                    <button
                      onClick={() => {
                        if (currentQIndex > 0) {
                          setCurrentQIndex(prev => prev - 1);
                          setSelectedOptionIndex(null);
                          setRevealedOptions({});
                          setIsEditingQuestion(false);
                        }
                      }}
                      disabled={currentQIndex === 0}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30"
                      title="Previous Question"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-slate-400 px-1">
                      {currentQIndex + 1}/{quiz.questions.length}
                    </span>
                    <button
                      onClick={() => {
                        if (currentQIndex < quiz.questions.length - 1) {
                          setCurrentQIndex(prev => prev + 1);
                          setSelectedOptionIndex(null);
                          setRevealedOptions({});
                          setIsEditingQuestion(false);
                        }
                      }}
                      disabled={currentQIndex === quiz.questions.length - 1}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-white disabled:opacity-30"
                      title="Next Question"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>

              {/* VIEW SWITCHER: QUESTION STAGE VS LIVE LEADERBOARD */}
              {activeQuizTab === 'leaderboard' ? (
                <QuizLeaderboard
                  teams={teams}
                  currentQuestion={currentQ}
                  currentQuestionIndex={currentQIndex}
                  totalQuestions={quiz.questions.length}
                  onAwardPoints={handleAwardPoints}
                  onResetScores={handleResetScores}
                  onAddTeam={(t) => {
                    setTeams(prev => [...prev, {
                      id: `team-${Date.now()}`,
                      name: t.name,
                      captainName: t.captainName,
                      color: t.color,
                      score: 0,
                      members: [t.captainName]
                    }]);
                  }}
                  onRemoveTeam={handleRemoveTeam}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => setSoundEnabled(prev => !prev)}
                  onPlayVictoryFanfare={() => quizAudio.playFanfare()}
                />
              ) : (
                <>
                  {/* INLINE TEACHER QUESTION & ANSWER KEY EDITOR */}
              {isEditingQuestion ? (
                <div className="bg-slate-900/95 border-2 border-amber-500/50 rounded-2xl p-5 md:p-6 shadow-2xl space-y-4 animate-fade-in">
                  <div className="flex items-center justify-between border-b border-amber-500/30 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 font-bold flex items-center justify-center text-xs">
                        Q{currentQIndex + 1}
                      </div>
                      <span className="font-bold text-amber-300 text-sm">Edit Question &amp; Correct Answer Key</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handleAddQuestion}
                        className="px-2.5 py-1 bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 border border-purple-500/40 rounded-lg text-xs font-semibold flex items-center gap-1"
                        title="Add a new question to this quiz"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Question</span>
                      </button>
                      {quiz.questions.length > 1 && (
                        <button
                          onClick={() => handleDeleteQuestion(currentQIndex)}
                          className="px-2.5 py-1 bg-rose-600/20 hover:bg-rose-600/40 text-rose-300 border border-rose-500/30 rounded-lg text-xs font-semibold flex items-center gap-1"
                          title="Delete this question"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Question Text Input */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-200">Question Text</label>
                    <textarea
                      value={editQText}
                      onChange={(e) => setEditQText(e.target.value)}
                      rows={3}
                      className="w-full px-3.5 py-2.5 bg-slate-950 border border-white/20 rounded-xl text-xs md:text-sm text-white focus:outline-none focus:border-amber-400 font-medium"
                      placeholder="Enter question text..."
                    />
                  </div>

                  {/* Options with Correct Answer Selector */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-200">
                        Multiple Choice Options <span className="text-amber-400">(Select the radio button for the Correct Answer)</span>
                      </label>
                      <span className="text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30">
                        Selected Correct: Option {String.fromCharCode(65 + editCorrectOptionIndex)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {editOptions.map((opt, oIdx) => {
                        const isCorrect = editCorrectOptionIndex === oIdx;
                        return (
                          <div
                            key={oIdx}
                            onClick={() => setEditCorrectOptionIndex(oIdx)}
                            className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-2.5 ${
                              isCorrect
                                ? 'bg-emerald-950/60 border-emerald-400 ring-1 ring-emerald-400/50'
                                : 'bg-slate-950 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <div className="pt-0.5">
                              <input
                                type="radio"
                                name="correctOptionRadio"
                                checked={isCorrect}
                                onChange={() => setEditCorrectOptionIndex(oIdx)}
                                className="w-4 h-4 text-emerald-500 focus:ring-emerald-400 cursor-pointer"
                              />
                            </div>
                            <div className="flex-1 space-y-1">
                              <div className="flex items-center justify-between">
                                <span className={`text-xs font-mono font-bold ${isCorrect ? 'text-emerald-300' : 'text-slate-400'}`}>
                                  Option {String.fromCharCode(65 + oIdx)} {isCorrect && "✔ (Correct Answer)"}
                                </span>
                              </div>
                              <input
                                type="text"
                                value={opt}
                                onChange={(e) => {
                                  const newOpts = [...editOptions];
                                  newOpts[oIdx] = e.target.value;
                                  setEditOptions(newOpts);
                                }}
                                onClick={(e) => e.stopPropagation()}
                                placeholder={`Option ${String.fromCharCode(65 + oIdx)} text...`}
                                className="w-full px-2.5 py-1.5 bg-slate-900 border border-white/15 rounded-lg text-xs text-white focus:outline-none focus:border-amber-400"
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Points & Explanation */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 pt-1">
                    <div className="sm:col-span-3 space-y-1">
                      <label className="text-xs font-bold text-slate-200">Points</label>
                      <select
                        value={editPoints}
                        onChange={(e) => setEditPoints(Number(e.target.value))}
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400 font-semibold"
                      >
                        <option value={5}>5 Points</option>
                        <option value={10}>10 Points</option>
                        <option value={15}>15 Points</option>
                        <option value={20}>20 Points</option>
                      </select>
                    </div>

                    <div className="sm:col-span-9 space-y-1">
                      <label className="text-xs font-bold text-slate-200">Teacher Solution Explanation</label>
                      <input
                        type="text"
                        value={editExplanation}
                        onChange={(e) => setEditExplanation(e.target.value)}
                        placeholder="Pedagogical explanation for this question..."
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-amber-400"
                      />
                    </div>
                  </div>

                  {/* Hints & Misconception */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-teal-300">Teacher Team Hint (Optional)</label>
                      <input
                        type="text"
                        value={editTeacherHint}
                        onChange={(e) => setEditTeacherHint(e.target.value)}
                        placeholder="Helpful clue for classroom captains..."
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-teal-400"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-rose-300">Common Student Misconception (Optional)</label>
                      <input
                        type="text"
                        value={editCommonMisconception}
                        onChange={(e) => setEditCommonMisconception(e.target.value)}
                        placeholder="Common mistake students make..."
                        className="w-full px-3 py-2 bg-slate-950 border border-white/20 rounded-xl text-xs text-white focus:outline-none focus:border-rose-400"
                      />
                    </div>
                  </div>

                  {/* Save Edit Buttons */}
                  <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
                    <button
                      type="button"
                      onClick={() => setIsEditingQuestion(false)}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveQuestionEdit}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg flex items-center gap-1.5 transition-all"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Question &amp; Answer Key</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* QUESTION CARD (Interactive Stage) */
                <div className="bg-slate-950/70 border border-white/15 rounded-2xl p-5 md:p-6 shadow-xl space-y-5">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center justify-center font-bold text-sm shrink-0">
                      Q{currentQIndex + 1}
                    </div>
                    <h4 className="text-base md:text-lg font-display font-bold text-white leading-relaxed">
                      {currentQ.question}
                    </h4>
                  </div>

                  {/* MULTIPLE CHOICE OPTIONS GRID */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {currentQ.options?.map((opt, oIdx) => {
                      const isSelected = selectedOptionIndex === oIdx;
                      const isCorrect = oIdx === currentQ.correctOptionIndex;
                      const isRevealed = revealedOptions[oIdx] || (teacherMode && isCorrect);

                      let cardStyle = "bg-slate-900/80 border-white/10 text-slate-200 hover:bg-slate-800 hover:border-amber-400/50";
                      if (revealedOptions[oIdx]) {
                        if (isCorrect) {
                          cardStyle = "bg-emerald-950/80 border-emerald-400 text-emerald-100 shadow-lg shadow-emerald-500/20";
                        } else {
                          cardStyle = "bg-rose-950/80 border-rose-500/70 text-rose-200";
                        }
                      } else if (teacherMode && isCorrect) {
                        cardStyle = "bg-emerald-950/40 border-emerald-500/50 text-emerald-200 ring-1 ring-emerald-500/30";
                      }

                      return (
                        <button
                          key={oIdx}
                          type="button"
                          onClick={() => handleSelectOption(oIdx)}
                          className={`p-4 rounded-xl border text-left transition-all duration-200 flex items-start gap-3 relative group ${cardStyle}`}
                        >
                          <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold font-mono shrink-0 transition-colors ${
                            revealedOptions[oIdx]
                              ? isCorrect ? 'bg-emerald-500 text-slate-950' : 'bg-rose-500 text-white'
                              : 'bg-white/10 text-slate-300 group-hover:bg-amber-500 group-hover:text-slate-950'
                          }`}>
                            {String.fromCharCode(65 + oIdx)}
                          </div>

                          <div className="flex-1 text-xs md:text-sm font-medium leading-relaxed">
                            {opt.replace(/^[A-D]\)\s*/, '')}
                          </div>

                          {revealedOptions[oIdx] && (
                            <div className="shrink-0">
                              {isCorrect ? (
                                <Check className="w-5 h-5 text-emerald-400 animate-bounce" />
                              ) : (
                                <X className="w-5 h-5 text-rose-400" />
                              )}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* TEACHER POINT AWARD BAR */}
                  <div className="bg-slate-900/90 border border-white/10 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
                      <span className="text-xs font-bold text-white">Award Points to Answering Team:</span>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
                      <select
                        value={selectedAwardTeamId}
                        onChange={(e) => setSelectedAwardTeamId(e.target.value)}
                        className="px-2.5 py-1.5 bg-slate-800 border border-white/15 rounded-lg text-xs text-white font-semibold focus:outline-none focus:border-amber-400"
                      >
                        {teams.map(t => (
                          <option key={t.id} value={t.id}>
                            {t.name} (Capt: {t.captainName})
                          </option>
                        ))}
                      </select>

                      <button
                        type="button"
                        onClick={() => handleAwardPoints(selectedAwardTeamId, currentQ.points || 10)}
                        className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>+{currentQ.points || 10} pts (Correct)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleAwardPoints(selectedAwardTeamId, 5)}
                        className="px-2.5 py-1.5 bg-teal-600/30 hover:bg-teal-600/50 border border-teal-500/40 text-teal-200 text-xs font-semibold rounded-lg"
                      >
                        +5 Bonus
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* TEACHER'S SECRET ANSWER KEY & PEDAGOGICAL BREAKDOWN */}
              {teacherMode && !isEditingQuestion && (
                <div className="bg-amber-950/30 border border-amber-500/40 rounded-2xl p-4 md:p-5 space-y-3 animate-fade-in shadow-lg">
                  <div className="flex items-center justify-between border-b border-amber-500/20 pb-2.5">
                    <div className="flex items-center gap-2 text-amber-300 font-bold text-xs">
                      <ShieldCheck className="w-4 h-4 text-amber-400" />
                      <span>Teacher's Answer Key &amp; Teaching Notes</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setIsEditingQuestion(true)}
                        className="text-[11px] text-amber-300 hover:text-amber-200 underline font-semibold flex items-center gap-1"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Edit This Key</span>
                      </button>
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/30 font-bold">
                        Correct: Option {currentQ.correctOptionLetter || String.fromCharCode(65 + currentQ.correctOptionIndex)}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                    {/* Explanation */}
                    <div className="bg-black/40 rounded-xl p-3 border border-white/5">
                      <span className="font-bold text-amber-300 block mb-1 text-[11px]">🧠 Explanation &amp; Rationale:</span>
                      <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                    </div>

                    {/* Hints & Common Misconceptions */}
                    <div className="space-y-2">
                      {currentQ.teacherHint && (
                        <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                          <span className="font-bold text-teal-300 block mb-0.5 text-[10px]">💡 Teacher Hint for Teams:</span>
                          <p className="text-slate-300 text-[11px]">{currentQ.teacherHint}</p>
                        </div>
                      )}
                      {currentQ.commonMisconception && (
                        <div className="bg-black/40 rounded-xl p-2.5 border border-white/5">
                          <span className="font-bold text-rose-300 block mb-0.5 text-[10px]">⚠️ Common Student Misconception:</span>
                          <p className="text-slate-300 text-[11px]">{currentQ.commonMisconception}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Complete Teacher Answer Key Summary Table */}
              {teacherMode && quiz.questions && quiz.questions.length > 0 && (
                <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                      Full Quiz Master Answer Key ({quiz.questions.length} Questions)
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleExportTeacherAnswerKeyPDF(quiz)}
                        className="text-[11px] text-rose-300 hover:text-rose-200 underline flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>PDF Key</span>
                      </button>
                      <button
                        onClick={() => handleExportTeacherAnswerKeyWord(quiz)}
                        className="text-[11px] text-indigo-300 hover:text-indigo-200 underline flex items-center gap-1"
                      >
                        <FileDown className="w-3 h-3" />
                        <span>Word Key</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-2 pt-1">
                    {quiz.questions.map((q, qIdx) => (
                      <button
                        key={q.id || qIdx}
                        onClick={() => {
                          setCurrentQIndex(qIdx);
                          setSelectedOptionIndex(null);
                          setRevealedOptions({});
                          setIsEditingQuestion(false);
                        }}
                        className={`p-2 rounded-lg border text-center transition-all ${
                          currentQIndex === qIdx
                            ? 'bg-amber-500 text-slate-950 font-bold border-amber-400 shadow-md'
                            : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                        }`}
                      >
                        <div className="text-[10px] opacity-75">Q{qIdx + 1}</div>
                        <div className="text-xs font-bold">{q.correctOptionLetter || String.fromCharCode(65 + q.correctOptionIndex)}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              </>
            )}

            </div>
          ) : (
            /* Empty State Guide */
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-md shadow-lg flex flex-col items-center justify-center min-h-[440px] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <Trophy className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-bold text-white">Classroom Interactive Team Quiz</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Select a chapter on the left and mark it <strong>Done</strong>. EduOS will generate an engaging multi-team interactive quiz for your students with automated scoring, captain assignments, and a complete teacher answer key.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left w-full max-w-lg mt-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                  <span className="font-bold text-amber-300 block mb-1">1. Pick Chapter</span>
                  <p className="text-[11px] text-slate-400">Select textbook chapter &amp; mark done.</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                  <span className="font-bold text-purple-300 block mb-1">2. Assign Captains</span>
                  <p className="text-[11px] text-slate-400">Teams led by student captains compete.</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                  <span className="font-bold text-emerald-300 block mb-1">3. Manage Points</span>
                  <p className="text-[11px] text-slate-400">Click options &amp; award points live with answer key.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>

      {/* FULL SCREEN GAME SHOW QUIZ ARENA */}
      {isFullScreen && quiz && currentQ && (
        <div 
          className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-3xl text-white flex flex-col justify-between p-4 sm:p-6 md:p-8 select-none overflow-y-auto smooth-scroll animate-fade-in"
          id="fullscreen_quiz_arena"
        >
          {/* Ambient Lighting Background Accents */}
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* 1. TOP ARENA HEADER */}
          <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-4 border-b border-white/15 pb-4">
            
            {/* Title & Question Indicator */}
            <div className="flex items-center gap-3 flex-wrap">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-extrabold text-slate-950 shadow-lg shadow-amber-500/30">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    Question {currentQIndex + 1} of {quiz.questions.length}
                  </span>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {currentQ.points || 10} Points
                  </span>
                  <span className="text-xs text-slate-400 font-medium">
                    {quiz.chapter}
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-white mt-0.5 truncate max-w-md">
                  {quiz.quizTitle}
                </h2>
              </div>
            </div>

            {/* 2. TIMER & COUNTDOWN HUD */}
            <div className="flex items-center gap-2 bg-slate-900/90 border border-white/15 px-3.5 py-2 rounded-2xl shadow-xl backdrop-blur-md">
              <div className="flex items-center gap-2">
                <Timer className={`w-5 h-5 ${timerIsRunning ? 'text-amber-400 animate-spin' : 'text-slate-400'}`} />
                <span className={`text-xl font-mono font-black tabular-nums ${
                  timerRemaining <= 5 
                    ? 'text-rose-400 animate-pulse' 
                    : timerRemaining <= 10 
                    ? 'text-amber-300' 
                    : 'text-white'
                }`}>
                  {timerDuration > 0 ? `${timerRemaining}s` : "∞"}
                </span>
              </div>

              {/* Timer Control Buttons */}
              {timerDuration > 0 && (
                <div className="flex items-center gap-1 border-l border-white/15 pl-2 ml-1">
                  {timerIsRunning ? (
                    <button
                      onClick={handlePauseTimer}
                      className="p-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 transition-colors"
                      title="Pause Timer (Spacebar)"
                    >
                      <Pause className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={handleStartTimer}
                      className="p-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/40 text-emerald-300 transition-colors"
                      title="Start Timer (Spacebar)"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => handleResetTimer()}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white transition-colors"
                    title="Reset Timer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Timer Duration Preset Dropdown */}
              <select
                value={timerDuration}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTimerDuration(val);
                  handleResetTimer(val);
                }}
                className="bg-slate-800 border border-white/10 rounded-lg text-xs text-slate-300 px-2 py-1 ml-1 focus:outline-none focus:border-amber-400 font-semibold"
              >
                <option value={15}>15s</option>
                <option value={30}>30s</option>
                <option value={45}>45s</option>
                <option value={60}>60s</option>
                <option value={90}>90s</option>
                <option value={0}>No Timer</option>
              </select>
            </div>

            {/* 3. CONTROLS (Sound, Teacher HUD, Leaderboard, Exit) */}
            <div className="flex items-center gap-2 flex-wrap">
              {/* Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(prev => !prev)}
                className={`p-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  soundEnabled 
                    ? 'bg-purple-500/20 border-purple-400 text-purple-200 shadow-md shadow-purple-500/10' 
                    : 'bg-white/5 border-white/10 text-slate-400 hover:text-white'
                }`}
                title={soundEnabled ? "Mute SFX" : "Unmute SFX"}
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-purple-300" /> : <VolumeX className="w-4 h-4" />}
              </button>

              {/* Teacher HUD Toggle */}
              <button
                onClick={() => setShowFullscreenTeacherHUD(prev => !prev)}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  showFullscreenTeacherHUD 
                    ? 'bg-amber-500 border-amber-400 text-slate-950 font-extrabold shadow-lg shadow-amber-500/20' 
                    : 'bg-white/5 border-white/10 text-amber-300 hover:bg-white/10'
                }`}
                title="Toggle Teacher's Secret Answer HUD (Press T)"
              >
                <ShieldCheck className="w-4 h-4" />
                <span className="hidden sm:inline">Teacher HUD (T)</span>
              </button>

              {/* Leaderboard Podium Toggle */}
              <button
                onClick={() => {
                  setShowFullscreenLeaderboard(prev => !prev);
                  if (!showFullscreenLeaderboard) {
                    quizAudio.playFanfare();
                  }
                }}
                className={`px-3 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all ${
                  showFullscreenLeaderboard 
                    ? 'bg-gradient-to-r from-amber-500 to-yellow-500 text-slate-950 font-extrabold shadow-lg shadow-yellow-500/20' 
                    : 'bg-white/5 border-white/10 text-yellow-300 hover:bg-white/10'
                }`}
                title="Toggle Live Leaderboard Podium (Press L)"
              >
                <Crown className="w-4 h-4 text-yellow-400" />
                <span className="hidden sm:inline">Podium (L)</span>
              </button>

              {/* Exit Fullscreen */}
              <button
                onClick={toggleFullScreen}
                className="px-3.5 py-2 rounded-xl border border-rose-500/30 bg-rose-500/20 hover:bg-rose-500/30 text-rose-200 text-xs font-bold flex items-center gap-1.5 transition-all"
                title="Exit Full Screen (Esc or F)"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit</span>
              </button>
            </div>

          </div>

          {/* 2. MAIN QUESTION STAGE (Projector Optimized) */}
          <div className="relative z-10 max-w-6xl mx-auto w-full my-auto py-6 flex flex-col justify-center space-y-8">
            
            {/* Big Question Header */}
            <div className="space-y-4 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs sm:text-sm font-bold font-mono">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span>CHAPTER CHALLENGE • {currentQ.points || 10} PTS</span>
              </div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-display font-black text-white leading-tight max-w-5xl mx-auto text-balance drop-shadow-md">
                {currentQ.question}
              </h1>
            </div>

            {/* 4 Interactive Option Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 pt-2">
              {currentQ.options?.map((opt, oIdx) => {
                const isCorrect = oIdx === currentQ.correctOptionIndex;
                const isRevealed = revealedOptions[oIdx] || (teacherMode && isCorrect && !isFullScreen);
                const letter = String.fromCharCode(65 + oIdx);

                let cardClasses = "bg-slate-900/90 border-white/20 text-slate-100 hover:bg-slate-800 hover:border-amber-400/80 hover:scale-[1.01] shadow-xl";
                if (revealedOptions[oIdx]) {
                  if (isCorrect) {
                    cardClasses = "bg-gradient-to-r from-emerald-950/90 to-teal-950/90 border-emerald-400 text-emerald-100 shadow-2xl shadow-emerald-500/30 ring-2 ring-emerald-400/60";
                  } else {
                    cardClasses = "bg-gradient-to-r from-rose-950/90 to-red-950/90 border-rose-500/80 text-rose-200 ring-1 ring-rose-500/40";
                  }
                }

                return (
                  <button
                    key={oIdx}
                    type="button"
                    onClick={() => handleSelectOption(oIdx)}
                    className={`p-5 sm:p-6 md:p-7 rounded-2xl sm:rounded-3xl border-2 text-left transition-all duration-200 flex items-center justify-between gap-4 group cursor-pointer ${cardClasses}`}
                  >
                    <div className="flex items-center gap-4 sm:gap-5 flex-1">
                      <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center text-base sm:text-lg font-black font-mono shrink-0 shadow-md transition-colors ${
                        revealedOptions[oIdx]
                          ? isCorrect ? 'bg-emerald-400 text-slate-950' : 'bg-rose-500 text-white'
                          : 'bg-white/10 text-white group-hover:bg-amber-400 group-hover:text-slate-950'
                      }`}>
                        {letter}
                      </div>
                      <div className="text-base sm:text-lg md:text-xl font-semibold leading-snug">
                        {opt.replace(/^[A-D]\)\s*/, '')}
                      </div>
                    </div>

                    <div className="shrink-0 flex items-center gap-2">
                      <span className="hidden sm:inline text-xs font-mono text-slate-500 group-hover:text-slate-300">
                        [{letter}]
                      </span>
                      {revealedOptions[oIdx] && (
                        <div>
                          {isCorrect ? (
                            <div className="w-8 h-8 rounded-full bg-emerald-500/30 border border-emerald-400 flex items-center justify-center">
                              <Check className="w-5 h-5 text-emerald-300 animate-bounce" />
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-rose-500/30 border border-rose-400 flex items-center justify-center">
                              <X className="w-5 h-5 text-rose-300" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Clue Hint (If teacher wants to give students a hint) */}
            {currentQ.teacherHint && (
              <div className="flex justify-center pt-2">
                {!showFullscreenHint ? (
                  <button
                    onClick={() => setShowFullscreenHint(true)}
                    className="px-4 py-1.5 rounded-full bg-teal-500/15 border border-teal-500/30 text-teal-300 hover:bg-teal-500/25 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                  >
                    <Lightbulb className="w-3.5 h-3.5 text-teal-400" />
                    <span>Reveal Classroom Hint</span>
                  </button>
                ) : (
                  <div className="bg-teal-950/80 border border-teal-400/50 px-5 py-2.5 rounded-2xl text-teal-200 text-xs sm:text-sm font-medium flex items-center gap-2 shadow-lg animate-fade-in max-w-2xl">
                    <Lightbulb className="w-4 h-4 text-teal-300 shrink-0" />
                    <span><strong>Teacher Clue:</strong> {currentQ.teacherHint}</span>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* 3. BOTTOM LIVE TEAMS & NAVIGATION BAR */}
          <div className="relative z-10 border-t border-white/15 pt-4 space-y-3">
            
            <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
              
              {/* Previous Question Button */}
              <button
                onClick={() => {
                  if (currentQIndex > 0) {
                    setCurrentQIndex(prev => prev - 1);
                    setSelectedOptionIndex(null);
                    setRevealedOptions({});
                    setIsEditingQuestion(false);
                    setShowFullscreenHint(false);
                    handleResetTimer();
                  }
                }}
                disabled={currentQIndex === 0}
                className="px-4 py-2.5 rounded-2xl bg-white/10 hover:bg-white/20 disabled:opacity-30 text-white font-bold text-xs sm:text-sm flex items-center gap-2 transition-all"
                title="Previous Question (Left Arrow)"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Previous (P)</span>
              </button>

              {/* LIVE TEAM SCORECARDS WITH INSTANT POINT MODIFIERS */}
              <div className="flex items-center gap-3 overflow-x-auto smooth-scroll max-w-4xl py-1 px-2">
                {teams.map((team, idx) => (
                  <div
                    key={team.id}
                    className={`shrink-0 p-2.5 sm:p-3 rounded-2xl border bg-gradient-to-r ${team.color} bg-opacity-25 border-white/15 flex items-center gap-3 shadow-lg`}
                  >
                    <div className="w-7 h-7 rounded-xl bg-black/50 flex items-center justify-center font-mono font-bold text-xs text-white">
                      #{idx + 1}
                    </div>

                    <div>
                      <div className="text-xs font-extrabold text-white leading-tight flex items-center gap-1">
                        <span>{team.name}</span>
                        <Crown className="w-3 h-3 text-amber-300" />
                      </div>
                      <div className="text-[10px] text-amber-200 font-mono">
                        Capt: <strong>{team.captainName}</strong>
                      </div>
                    </div>

                    <div className="text-base sm:text-lg font-display font-black text-white px-1">
                      {team.score} <span className="text-[10px] font-normal text-slate-300">pts</span>
                    </div>

                    {/* Instant Point Awards */}
                    <div className="flex items-center gap-1 border-l border-white/15 pl-2">
                      <button
                        onClick={() => handleAwardPoints(team.id, currentQ.points || 10)}
                        className="px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-md transition-transform active:scale-95"
                        title={`Award +${currentQ.points || 10} pts to ${team.name}`}
                      >
                        +{currentQ.points || 10}
                      </button>
                      <button
                        onClick={() => handleAwardPoints(team.id, 5)}
                        className="px-1.5 py-1 rounded-lg bg-teal-500/40 hover:bg-teal-500 text-teal-100 font-bold text-xs transition-colors"
                        title={`Award +5 bonus pts to ${team.name}`}
                      >
                        +5
                      </button>
                      <button
                        onClick={() => handleAwardPoints(team.id, -5)}
                        className="px-1.5 py-1 rounded-lg bg-rose-500/30 hover:bg-rose-500 text-rose-200 font-bold text-xs transition-colors"
                        title={`Deduct -5 pts from ${team.name}`}
                      >
                        -5
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Next Question / Finish Button */}
              {currentQIndex < quiz.questions.length - 1 ? (
                <button
                  onClick={() => {
                    setCurrentQIndex(prev => prev + 1);
                    setSelectedOptionIndex(null);
                    setRevealedOptions({});
                    setIsEditingQuestion(false);
                    setShowFullscreenHint(false);
                    handleResetTimer();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-extrabold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all transform hover:scale-[1.02]"
                  title="Next Question (Right Arrow)"
                >
                  <span>Next Question (N)</span>
                  <ChevronRight className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={() => {
                    setShowFullscreenLeaderboard(true);
                    quizAudio.playFanfare();
                  }}
                  className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-slate-950 font-black text-xs sm:text-sm flex items-center gap-2 shadow-xl shadow-yellow-500/30 transition-all animate-bounce"
                >
                  <PartyPopper className="w-4 h-4" />
                  <span>Show Final Podium!</span>
                </button>
              )}

            </div>

          </div>

          {/* 4. TEACHER SECRET HUD MODAL (Floating Panel) */}
          {showFullscreenTeacherHUD && (
            <div className="fixed bottom-24 right-6 z-50 w-full max-w-md bg-slate-950/95 border-2 border-amber-500/70 rounded-3xl p-5 shadow-2xl backdrop-blur-2xl animate-fade-in space-y-3">
              <div className="flex items-center justify-between border-b border-amber-500/30 pb-2.5">
                <div className="flex items-center gap-2 text-amber-300 font-bold text-sm">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Teacher's Answer Key HUD</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-black text-emerald-400 bg-emerald-500/20 px-2.5 py-0.5 rounded-lg border border-emerald-500/40">
                    Correct: Option {currentQ.correctOptionLetter || String.fromCharCode(65 + currentQ.correctOptionIndex)}
                  </span>
                  <button
                    onClick={() => setShowFullscreenTeacherHUD(false)}
                    className="text-slate-400 hover:text-white font-bold text-xs ml-1"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-xs">
                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="font-bold text-amber-300 block mb-1 text-[11px]">Correct Answer Text:</span>
                  <p className="text-white font-medium">{currentQ.correctAnswerText || currentQ.options?.[currentQ.correctOptionIndex]}</p>
                </div>

                <div className="bg-white/5 rounded-xl p-3 border border-white/10">
                  <span className="font-bold text-amber-300 block mb-1 text-[11px]">Pedagogical Explanation:</span>
                  <p className="text-slate-300 leading-relaxed">{currentQ.explanation}</p>
                </div>

                {currentQ.teacherHint && (
                  <div className="bg-teal-950/60 rounded-xl p-2.5 border border-teal-500/30">
                    <span className="font-bold text-teal-300 block mb-0.5 text-[10px]">Team Clue / Hint:</span>
                    <p className="text-teal-200">{currentQ.teacherHint}</p>
                  </div>
                )}

                {currentQ.commonMisconception && (
                  <div className="bg-rose-950/60 rounded-xl p-2.5 border border-rose-500/30">
                    <span className="font-bold text-rose-300 block mb-0.5 text-[10px]">Common Student Pitfall:</span>
                    <p className="text-rose-200">{currentQ.commonMisconception}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 5. LEADERBOARD PODIUM CELEBRATION MODAL */}
          {showFullscreenLeaderboard && (
            <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 sm:p-6 md:p-8 animate-fade-in overflow-y-auto">
              <div className="w-full max-w-4xl relative">
                {/* Close Button Floating */}
                <button
                  onClick={() => setShowFullscreenLeaderboard(false)}
                  className="absolute top-4 right-4 z-20 text-slate-300 hover:text-white p-2 rounded-xl bg-black/50 hover:bg-black/80 border border-white/10 text-sm font-bold shadow-lg"
                  title="Close Leaderboard (Press L or Esc)"
                >
                  ✕ Close
                </button>

                <QuizLeaderboard
                  teams={teams}
                  currentQuestion={currentQ}
                  currentQuestionIndex={currentQIndex}
                  totalQuestions={quiz.questions.length}
                  onAwardPoints={handleAwardPoints}
                  onResetScores={handleResetScores}
                  onAddTeam={(t) => {
                    setTeams(prev => [...prev, {
                      id: `team-${Date.now()}`,
                      name: t.name,
                      captainName: t.captainName,
                      color: t.color,
                      score: 0,
                      members: [t.captainName]
                    }]);
                  }}
                  onRemoveTeam={handleRemoveTeam}
                  soundEnabled={soundEnabled}
                  onToggleSound={() => setSoundEnabled(prev => !prev)}
                  onPlayVictoryFanfare={() => quizAudio.playFanfare()}
                />
              </div>
            </div>
          )}

        </div>
      )}

    </div>
  );
}

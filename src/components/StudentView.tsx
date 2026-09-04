import React, { useState, useEffect } from "react";
import { 
  BookOpen, Award, Layers, Sparkles, Calendar, Zap, 
  Send, HelpCircle, RefreshCw, Bookmark, Check, ArrowRight, ArrowLeft 
} from "lucide-react";
import { Quiz, FlashcardCollection, StudyPlan, RevisionMaterial } from "../types";
import { safeFetchJson } from "../utils/apiUtils";

interface StudentViewProps {
  onSave: (type: 'quiz' | 'study-plan' | 'revision', title: string, data: any) => void;
  savedIds: string[];
}

export default function StudentView({ onSave, savedIds }: StudentViewProps) {
  const [activeTab, setActiveTab] = useState<'explain' | 'quiz' | 'flashcards' | 'homework' | 'planner' | 'revision'>('explain');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Explain Mode State
  const [explainTopic, setExplainTopic] = useState<string>("");
  const [explainStyle, setExplainStyle] = useState<string>("grade_6");
  const [explainResult, setExplainResult] = useState<string>("");

  // Quiz Mode State
  const [quizSubject, setQuizSubject] = useState<string>("");
  const [quizTopics, setQuizTopics] = useState<string>("");
  const [quizDifficulty, setQuizDifficulty] = useState<string>("Medium");
  const [generatedQuiz, setGeneratedQuiz] = useState<Quiz | null>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [quizSubmitted, setQuizSubmitted] = useState<boolean>(false);

  // Flashcard State
  const [flashcardTopic, setFlashcardTopic] = useState<string>("");
  const [flashcards, setFlashcards] = useState<FlashcardCollection | null>(null);
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [isFlipped, setIsFlipped] = useState<boolean>(false);
  const [cardStats, setCardStats] = useState<Record<number, 'learned' | 'review'>>({});

  // Homework Helper State
  const [homeworkQuery, setHomeworkQuery] = useState<string>("");
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([
    { role: 'assistant', text: "Hi! I'm your guiding Homework Helper. Ask me any homework question, and I'll help you solve it step-by-step without giving away the direct answer!" }
  ]);

  // Study Planner State
  const [subjectsToStudy, setSubjectsToStudy] = useState<string>("");
  const [weakAreas, setWeakAreas] = useState<string>("");
  const [examDate, setExamDate] = useState<string>("");
  const [hoursPerDay, setHoursPerDay] = useState<number>(2);
  const [studyPlan, setStudyPlan] = useState<StudyPlan | null>(null);

  // Revision Sheet State
  const [revisionSubject, setRevisionSubject] = useState<string>("");
  const [revisionTopic, setRevisionTopic] = useState<string>("");
  const [revisionGrade, setRevisionGrade] = useState<string>("Grade 10");
  const [revisionResult, setRevisionResult] = useState<RevisionMaterial | null>(null);

  // Success indicator for saves
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  // Reset states when changing active tool
  useEffect(() => {
    setError(null);
  }, [activeTab]);

  // Handle saving of resources with UI response
  const triggerSave = (type: 'quiz' | 'study-plan' | 'revision', title: string, data: any, saveKey: string) => {
    onSave(type, title, data);
    setSaveSuccess(prev => ({ ...prev, [saveKey]: true }));
    setTimeout(() => {
      setSaveSuccess(prev => ({ ...prev, [saveKey]: false }));
    }, 2000);
  };

  // 1. Explain Mode API Call
  const handleExplainSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!explainTopic.trim()) return;
    setLoading(true);
    setError(null);
    setExplainResult("");
    try {
      const data = await safeFetchJson<{ text: string }>("/api/edu/explain", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: explainTopic, style: explainStyle }),
      });
      setExplainResult(data.text || "No explanation returned");
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 2. Quiz Generator API Call
  const handleQuizSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizSubject.trim() || !quizTopics.trim()) return;
    setLoading(true);
    setError(null);
    setGeneratedQuiz(null);
    setSelectedAnswers({});
    setQuizSubmitted(false);
    try {
      const data = await safeFetchJson<Quiz>("/api/edu/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subject: quizSubject, topics: quizTopics, difficulty: quizDifficulty }),
      });
      setGeneratedQuiz(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 3. Flashcards API Call
  const handleFlashcardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flashcardTopic.trim()) return;
    setLoading(true);
    setError(null);
    setFlashcards(null);
    setCurrentCardIndex(0);
    setIsFlipped(false);
    setCardStats({});
    try {
      const data = await safeFetchJson<FlashcardCollection>("/api/edu/flashcards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: flashcardTopic }),
      });
      setFlashcards(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 4. Homework Helper API Call
  const handleHomeworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!homeworkQuery.trim() || loading) return;

    const userMsg = homeworkQuery;
    setHomeworkQuery("");
    setLoading(true);
    setError(null);

    // Update log
    const updatedHistory = [...chatLog, { role: 'user' as const, text: userMsg }];
    setChatLog(updatedHistory);

    try {
      // Map history to server schema
      const mappedHistory = updatedHistory.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.text
      }));

      const data = await safeFetchJson<{ text: string }>("/api/edu/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "student_homework",
          query: userMsg,
          chatHistory: mappedHistory
        }),
      });
      setChatLog(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err: any) {
      setError(err.message || "Chat failed");
    } finally {
      setLoading(false);
    }
  };

  // 5. Study Planner API Call
  const handlePlannerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectsToStudy.trim()) return;
    setLoading(true);
    setError(null);
    setStudyPlan(null);
    try {
      const data = await safeFetchJson<StudyPlan>("/api/edu/study-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          examDate,
          subjects: subjectsToStudy,
          weakAreas,
          hoursPerDay
        }),
      });
      setStudyPlan(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // 6. Revision Sheets API Call
  const handleRevisionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionSubject.trim() || !revisionTopic.trim()) return;
    setLoading(true);
    setError(null);
    setRevisionResult(null);
    try {
      const data = await safeFetchJson<RevisionMaterial>("/api/edu/revision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: revisionSubject,
          topic: revisionTopic,
          grade: revisionGrade
        }),
      });
      setRevisionResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectOption = (qIdx: number, oIdx: number) => {
    if (quizSubmitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: oIdx }));
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto px-4 py-2 relative z-10" id="student_workspace">
      {/* Student Sub-Navigation Sidebar */}
      <div className="lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/10 lg:pr-4 animate-fade-in" id="student_subnav_rail">
        <button
          id="btn_tab_explain"
          onClick={() => setActiveTab('explain')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'explain' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Explain Mode</span>
        </button>
        <button
          id="btn_tab_quiz"
          onClick={() => setActiveTab('quiz')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'quiz' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Award className="w-4 h-4" />
          <span>Interactive Quiz</span>
        </button>
        <button
          id="btn_tab_flashcards"
          onClick={() => setActiveTab('flashcards')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'flashcards' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Layers className="w-4 h-4" />
          <span>Flashcards</span>
        </button>
        <button
          id="btn_tab_homework"
          onClick={() => setActiveTab('homework')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'homework' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Sparkles className="w-4 h-4" />
          <span>Homework Helper</span>
        </button>
        <button
          id="btn_tab_planner"
          onClick={() => setActiveTab('planner')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'planner' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Calendar className="w-4 h-4" />
          <span>Study Planner</span>
        </button>
        <button
          id="btn_tab_revision"
          onClick={() => setActiveTab('revision')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'revision' ? 'bg-white/10 text-white border border-white/10 shadow-sm' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <Zap className="w-4 h-4" />
          <span>Revision Sheet</span>
        </button>
      </div>

      {/* Main Feature Content Screen */}
      <div className="flex-1 min-w-0" id="student_workspace_content">
        {error && (
          <div className="p-4 mb-4 bg-red-500/10 text-red-200 text-sm rounded-lg border border-red-500/20 flex items-center justify-between" id="student_error_alert">
            <span>{error}</span>
            <button className="text-red-400 hover:text-white" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* LOADING SCREEN */}
        {loading && !explainResult && !generatedQuiz && !flashcards && !studyPlan && !revisionResult && activeTab !== 'homework' && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg" id="student_loading">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
            <h3 className="font-semibold text-white">Generating Educational Content...</h3>
            <p className="text-xs text-slate-400 mt-1">Please wait while EduOS AI structures the perfect learning material.</p>
          </div>
        )}

        {/* 1. EXPLAIN MODE PANEL */}
        {activeTab === 'explain' && (
          <div className="space-y-6" id="panel_explain">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Explain Concept Mode
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter any academic concept, formula, or event to get a tailor-made explanation styled exactly how you learn best.
              </p>

              <form onSubmit={handleExplainSubmit} className="mt-4 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Concept to Explain</label>
                  <input
                    id="input_explain_topic"
                    type="text"
                    value={explainTopic}
                    onChange={(e) => setExplainTopic(e.target.value)}
                    placeholder="e.g. Photosynthesis, Quadratic Formula, French Revolution..."
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Explanation Style / Level</label>
                    <select
                      id="select_explain_style"
                      value={explainStyle}
                      onChange={(e) => setExplainStyle(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none bg-[#1e293b] text-white"
                    >
                      <option value="6_years_old">Like I'm 6 years old (Simple & Warm)</option>
                      <option value="grade_6">Like I'm in Grade 6 (Engaging & Clear)</option>
                      <option value="high_school">High School Student (Detailed & Formal)</option>
                      <option value="analogies">With Everyday Analogies (Highly Relatable)</option>
                      <option value="stories">Using an Engaging Story (Creative)</option>
                    </select>
                  </div>

                  <div className="flex items-end">
                    <button
                      id="btn_explain_submit"
                      type="submit"
                      disabled={loading || !explainTopic.trim()}
                      className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10"
                    >
                      {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Explain Concept"}
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* Explain Mode Response */}
            {explainResult && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-4 animate-fade-in" id="explain_result_display">
                <div className="flex items-center justify-between border-b border-white/10 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></span>
                    <h3 className="font-semibold text-white">EduOS Explanation: {explainTopic}</h3>
                  </div>
                  <span className="text-xs font-medium text-indigo-200 bg-white/10 border border-white/10 px-2.5 py-1 rounded-full capitalize">
                    {explainStyle.replace('_', ' ')}
                  </span>
                </div>
                <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap space-y-3 prose">
                  {explainResult}
                </div>
                <div className="pt-3 border-t border-white/10 text-xs text-slate-400 italic flex items-center justify-between">
                  <span>Adheres to active recall and curriculum-friendly frameworks.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 2. INTERACTIVE QUIZ MODE */}
        {activeTab === 'quiz' && (
          <div className="space-y-6" id="panel_quiz">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Award className="w-5 h-5 text-indigo-400" /> Interactive Quiz Generator
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Construct and take mock tests. EduOS AI will generate 5 questions with options and deliver an immediate breakdown of results.
              </p>

              <form onSubmit={handleQuizSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subject</label>
                    <input
                      id="input_quiz_subject"
                      type="text"
                      value={quizSubject}
                      onChange={(e) => setQuizSubject(e.target.value)}
                      placeholder="e.g. Science, Biology, Algebra, History"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Difficulty Level</label>
                    <select
                      id="select_quiz_diff"
                      value={quizDifficulty}
                      onChange={(e) => setQuizDifficulty(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none bg-[#1e293b] text-white"
                    >
                      <option value="Easy">Easy (Conceptual / Recall)</option>
                      <option value="Medium">Medium (Application & Understanding)</option>
                      <option value="Hard">Hard (Critical Thinking & Advanced)</option>
                      <option value="Adaptive">Adaptive (Mixed Levels)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Topics / Scope</label>
                  <input
                    id="input_quiz_topics"
                    type="text"
                    value={quizTopics}
                    onChange={(e) => setQuizTopics(e.target.value)}
                    placeholder="e.g. Mitosis vs Meiosis, Quadratic formula, Ecosystems, Magna Carta"
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn_quiz_generate"
                    type="submit"
                    disabled={loading || !quizSubject.trim() || !quizTopics.trim()}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate Interactive Quiz"}
                  </button>
                </div>
              </form>
            </div>

            {/* Render generated quiz */}
            {generatedQuiz && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="quiz_display_box">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{generatedQuiz.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Solve all 5 questions to receive a detailed breakdown and save options.</p>
                  </div>
                  <div className="flex items-center gap-3 mt-2 md:mt-0">
                    <button
                      id="btn_save_quiz"
                      onClick={() => triggerSave('quiz', generatedQuiz.title, generatedQuiz, 'quiz_save')}
                      className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      {saveSuccess['quiz_save'] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save Quiz</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {generatedQuiz.questions.map((q, qIdx) => {
                    const isCorrect = selectedAnswers[qIdx] === q.correctIndex;
                    return (
                      <div key={qIdx} className="p-4 rounded-xl border border-white/10 bg-white/5 space-y-3" id={`quiz_q_${qIdx}`}>
                        <div className="flex items-start gap-2.5">
                          <span className="flex items-center justify-center w-6 h-6 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-full mt-0.5 shrink-0">{qIdx + 1}</span>
                          <h4 className="font-medium text-white text-sm md:text-base">{q.question}</h4>
                        </div>

                        {/* Options */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pl-8">
                          {q.options.map((option, oIdx) => {
                            let optionStyle = "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10";
                            
                            if (quizSubmitted) {
                              if (oIdx === q.correctIndex) {
                                optionStyle = "border-emerald-500/50 bg-emerald-500/20 text-emerald-200 font-medium";
                              } else if (selectedAnswers[qIdx] === oIdx) {
                                optionStyle = "border-rose-500/50 bg-rose-500/20 text-rose-200 font-medium";
                              } else {
                                optionStyle = "border-white/5 bg-white/5 text-slate-500 cursor-not-allowed";
                              }
                            } else if (selectedAnswers[qIdx] === oIdx) {
                              optionStyle = "border-indigo-500 bg-indigo-500/25 text-indigo-200 font-medium ring-2 ring-indigo-500/20";
                            }

                            return (
                              <button
                                key={oIdx}
                                type="button"
                                onClick={() => handleSelectOption(qIdx, oIdx)}
                                disabled={quizSubmitted}
                                className={`w-full text-left px-4 py-2.5 rounded-lg border text-xs md:text-sm transition-all focus:outline-none ${optionStyle}`}
                              >
                                <span className="font-semibold text-slate-400 mr-1">{["A", "B", "C", "D"][oIdx]}.</span> {option}
                              </button>
                            );
                          })}
                        </div>

                        {/* Solution breakdown after submission */}
                        {quizSubmitted && (
                          <div className={`mt-3 pl-8 py-2.5 px-4 rounded-lg text-xs leading-relaxed ${isCorrect ? "bg-emerald-500/10 text-emerald-200 border-l-4 border-emerald-500" : "bg-rose-500/10 text-rose-200 border-l-4 border-rose-500"}`}>
                            <p className="font-semibold flex items-center gap-1 mb-1">
                              {isCorrect ? "🎉 Correct!" : "❌ Incorrect"}
                            </p>
                            <p className="text-slate-300">{q.explanation}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Quiz controls */}
                <div className="flex items-center justify-between pt-4 border-t border-white/10">
                  {!quizSubmitted ? (
                    <>
                      <span className="text-xs text-slate-400">
                        Answered {Object.keys(selectedAnswers).length} / 5 questions
                      </span>
                      <button
                        id="btn_quiz_submit"
                        onClick={() => setQuizSubmitted(true)}
                        disabled={Object.keys(selectedAnswers).length < 5}
                        className="px-6 py-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 text-white text-sm font-semibold rounded-lg transition-colors shadow-md"
                      >
                        Submit Answers
                      </button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-slate-200">
                          Score: {Object.keys(selectedAnswers).filter(k => selectedAnswers[Number(k)] === generatedQuiz.questions[Number(k)].correctIndex).length} / 5
                        </span>
                        <span className="text-xs text-slate-500">|</span>
                        <span className="text-xs text-slate-400">
                          {Math.round((Object.keys(selectedAnswers).filter(k => selectedAnswers[Number(k)] === generatedQuiz.questions[Number(k)].correctIndex).length / 5) * 100)}% Accuracy
                        </span>
                      </div>
                      <button
                        id="btn_quiz_retake"
                        onClick={() => {
                          setSelectedAnswers({});
                          setQuizSubmitted(false);
                        }}
                        className="px-5 py-2 border border-white/10 hover:bg-white/5 text-slate-300 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Retake Quiz
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        {/* 3. INTERACTIVE FLASHCARD MODE */}
        {activeTab === 'flashcards' && (
          <div className="space-y-6" id="panel_flashcards">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" /> Flashcard Generator
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter any study topic to spawn a set of interactive physical-style cards with prompts on the front, definitions on the back, and memory retention controls.
              </p>

              <form onSubmit={handleFlashcardSubmit} className="mt-4 flex gap-3">
                <div className="flex-1">
                  <input
                    id="input_flashcard_topic"
                    type="text"
                    value={flashcardTopic}
                    onChange={(e) => setFlashcardTopic(e.target.value)}
                    placeholder="e.g. Periodic Table Elements, Spanish Conjugations, Trig Identities"
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                  />
                </div>
                <button
                  id="btn_flashcards_generate"
                  type="submit"
                  disabled={loading || !flashcardTopic.trim()}
                  className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shrink-0"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Spawn Cards"}
                </button>
              </form>
            </div>

            {flashcards && flashcards.flashcards.length > 0 && (
              <div className="flex flex-col items-center justify-center space-y-6 max-w-xl mx-auto" id="flashcard_display_area">
                
                {/* 3D-Style Card Container */}
                <div 
                  id="interactive_flashcard"
                  onClick={() => setIsFlipped(!isFlipped)}
                  className="w-full h-64 cursor-pointer perspective-1000 group relative select-none animate-fade-in"
                >
                  <div className={`w-full h-full relative transition-transform duration-500 transform-style-3d ${isFlipped ? 'rotate-y-180' : ''}`}>
                    
                    {/* Front of Card */}
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-lg backface-hidden flex flex-col justify-between">
                      <div className="flex justify-between items-center text-xs text-slate-400 font-semibold uppercase tracking-wider">
                        <span>Card {currentCardIndex + 1} of {flashcards.flashcards.length}</span>
                        <span className="text-indigo-400 font-medium">Question Side</span>
                      </div>
                      <div className="text-center px-4 my-auto">
                        <h3 className="text-lg md:text-xl font-bold text-white leading-tight">
                          {flashcards.flashcards[currentCardIndex].question}
                        </h3>
                        {flashcards.flashcards[currentCardIndex].hint && (
                          <p className="text-xs text-indigo-200 italic mt-3 bg-white/5 border border-white/5 py-1 px-3 rounded-full inline-block">
                            Hint: {flashcards.flashcards[currentCardIndex].hint}
                          </p>
                        )}
                      </div>
                      <div className="text-center text-xs text-indigo-400 font-medium group-hover:text-indigo-300 transition-colors">
                        Click card to flip and view explanation
                      </div>
                    </div>

                    {/* Back of Card */}
                    <div className="absolute inset-0 bg-indigo-500/10 border border-indigo-500/20 backdrop-blur-md rounded-2xl p-6 shadow-lg backface-hidden rotate-y-180 flex flex-col justify-between">
                      <div className="flex justify-between items-center text-xs text-indigo-300 font-semibold uppercase tracking-wider">
                        <span>Card {currentCardIndex + 1} of {flashcards.flashcards.length}</span>
                        <span>Answer Side</span>
                      </div>
                      <div className="text-center px-4 my-auto">
                        <p className="text-base md:text-lg text-slate-100 font-medium whitespace-pre-wrap leading-relaxed">
                          {flashcards.flashcards[currentCardIndex].answer}
                        </p>
                      </div>
                      <div className="text-center text-xs text-slate-500">
                        Click card again to flip back
                      </div>
                    </div>

                  </div>
                </div>

                {/* Self-Assessment Metrics */}
                <div className="flex items-center gap-4 w-full" id="flashcard_self_assessment">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardStats(prev => ({ ...prev, [currentCardIndex]: 'review' }));
                      if (currentCardIndex < flashcards.flashcards.length - 1) {
                        setCurrentCardIndex(prev => prev + 1);
                        setIsFlipped(false);
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${cardStats[currentCardIndex] === 'review' ? 'bg-amber-500/20 text-amber-200 border-amber-500/30 shadow-sm' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                  >
                    👎 Needs Review
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setCardStats(prev => ({ ...prev, [currentCardIndex]: 'learned' }));
                      if (currentCardIndex < flashcards.flashcards.length - 1) {
                        setCurrentCardIndex(prev => prev + 1);
                        setIsFlipped(false);
                      }
                    }}
                    className={`flex-1 py-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors ${cardStats[currentCardIndex] === 'learned' ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30 shadow-sm' : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10'}`}
                  >
                    👍 Mastered Card
                  </button>
                </div>

                {/* Flashcards Navigation */}
                <div className="flex items-center justify-between w-full border-t border-white/10 pt-4" id="flashcards_navigation">
                  <button
                    id="btn_flashcard_prev"
                    disabled={currentCardIndex === 0}
                    onClick={() => {
                      setCurrentCardIndex(prev => prev - 1);
                      setIsFlipped(false);
                    }}
                    className="p-2 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 rounded-lg text-slate-300 transition-colors"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>

                  <div className="text-xs font-bold text-slate-300 bg-white/10 border border-white/10 px-3 py-1 rounded-full">
                    {Object.values(cardStats).filter(v => v === 'learned').length} / {flashcards.flashcards.length} Learned
                  </div>

                  <button
                    id="btn_flashcard_next"
                    disabled={currentCardIndex === flashcards.flashcards.length - 1}
                    onClick={() => {
                      setCurrentCardIndex(prev => prev + 1);
                      setIsFlipped(false);
                    }}
                    className="p-2 border border-white/10 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 rounded-lg text-slate-300 transition-colors"
                  >
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 4. HOMEWORK HELPER (CRITICAL: DOES NOT SIMPLY ANSWER) */}
        {activeTab === 'homework' && (
          <div className="flex flex-col h-[520px] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg animate-fade-in" id="panel_homework">
            <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between rounded-t-2xl">
              <div>
                <h2 className="text-base font-semibold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" /> AI Homework Helper
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">I will not do your work, but I will guide you through to the correct solution step-by-step.</p>
              </div>
              <button 
                id="btn_reset_homework_chat"
                onClick={() => setChatLog([{ role: 'assistant', text: "Hi! I'm your guiding Homework Helper. Ask me any homework question, and I'll help you solve it step-by-step without giving away the direct answer!" }])}
                className="text-xs font-semibold text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Clear Chat
              </button>
            </div>

            {/* Chat Bubble Log */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4" id="homework_chat_box">
              {chatLog.map((chat, idx) => (
                <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`} id={`chat_bubble_${idx}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed ${chat.role === 'user' ? 'bg-indigo-600/30 text-indigo-100 border border-indigo-500/20 rounded-br-none shadow-sm' : 'bg-white/5 text-slate-200 border border-white/5 rounded-bl-none shadow-sm'}`}>
                    <p className="whitespace-pre-wrap">{chat.text}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start" id="homework_chat_loading">
                  <div className="bg-white/5 text-slate-400 border border-white/5 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Homework helper is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Input Submission Footer */}
            <form onSubmit={handleHomeworkSubmit} className="p-3 border-t border-white/10 flex gap-2" id="homework_input_form">
              <input
                id="input_homework_query"
                type="text"
                value={homeworkQuery}
                onChange={(e) => setHomeworkQuery(e.target.value)}
                placeholder="Ask your homework question (e.g. 'How do I solve 2x + 5 = 15?')"
                className="flex-1 px-4 py-2 text-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
              <button
                id="btn_homework_send"
                type="submit"
                disabled={loading || !homeworkQuery.trim()}
                className="p-2.5 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 text-white rounded-lg transition-all flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10"
              >
                <Send className="w-4.5 h-4.5" />
              </button>
            </form>
          </div>
        )}

        {/* 5. STUDY PLANNER PANEL */}
        {activeTab === 'planner' && (
          <div className="space-y-6" id="panel_planner">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-400" /> Personal Study Planner
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Enter your subjects and study habits to generate a custom 7-day structured revision planner to tackle exams confidently.
              </p>

              <form onSubmit={handlePlannerSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subjects to Prepare</label>
                    <input
                      id="input_planner_subjects"
                      type="text"
                      value={subjectsToStudy}
                      onChange={(e) => setSubjectsToStudy(e.target.value)}
                      placeholder="e.g. Mathematics, Science, Literature"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Weak Areas / Struggles</label>
                    <input
                      id="input_planner_weak"
                      type="text"
                      value={weakAreas}
                      onChange={(e) => setWeakAreas(e.target.value)}
                      placeholder="e.g. Calculus integrals, organic chemistry equations"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Target Exam Date / Deadline</label>
                    <input
                      id="input_planner_date"
                      type="date"
                      value={examDate}
                      onChange={(e) => setExamDate(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Study Hours Available Per Day</label>
                    <input
                      id="input_planner_hours"
                      type="number"
                      min={1}
                      max={8}
                      value={hoursPerDay}
                      onChange={(e) => setHoursPerDay(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn_planner_generate"
                    type="submit"
                    disabled={loading || !subjectsToStudy.trim()}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate Study Schedule"}
                  </button>
                </div>
              </form>
            </div>

            {studyPlan && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="planner_result_box">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">Your Personalized Revision Road Map</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Customized milestone schedule prioritizing your weak areas.</p>
                  </div>
                  <button
                    id="btn_save_planner"
                    onClick={() => triggerSave('study-plan', `Study Plan: ${subjectsToStudy}`, studyPlan, 'planner_save')}
                    className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {saveSuccess['planner_save'] ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save Plan</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                  <h4 className="font-semibold text-indigo-300 text-sm mb-1.5">🎯 Strategy Overview</h4>
                  <p className="text-slate-200 text-sm leading-relaxed">{studyPlan.overview}</p>
                </div>

                {/* Schedule Grid */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-white text-sm">🗓️ 7-Day Revision Agenda</h4>
                  <div className="overflow-x-auto rounded-lg border border-white/10">
                    <table className="w-full text-left border-collapse text-xs md:text-sm">
                      <thead>
                        <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-semibold uppercase tracking-wider">
                          <th className="p-3">Day</th>
                          <th className="p-3">Target Topics</th>
                          <th className="p-3">Time Goal</th>
                          <th className="p-3">Method / Checklist</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 text-slate-200">
                        {studyPlan.schedule.map((dayItem, idx) => (
                          <tr key={idx} className="hover:bg-white/5 transition-colors">
                            <td className="p-3 font-bold text-indigo-300 whitespace-nowrap">{dayItem.day}</td>
                            <td className="p-3">
                              <div className="flex flex-wrap gap-1">
                                {dayItem.topics.map((t, tIdx) => (
                                  <span key={tIdx} className="bg-white/10 border border-white/10 text-slate-200 px-2 py-0.5 rounded text-xs font-medium">
                                    {t}
                                  </span>
                                ))}
                              </div>
                            </td>
                            <td className="p-3 text-indigo-200 font-semibold whitespace-nowrap">{dayItem.duration}</td>
                            <td className="p-3 text-slate-300 text-xs">{dayItem.notes}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Strategic Advice */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-white text-sm">💡 Strategic Revision & Well-being Tips</h4>
                  <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {studyPlan.tips.map((tip, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10">
                        <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. REVISION SHEET MODE */}
        {activeTab === 'revision' && (
          <div className="space-y-6" id="panel_revision">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Zap className="w-5 h-5 text-indigo-400" /> Revision Sheet Generator
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Generate high-impact revision sheets, complete with cheat-sheet summaries, essential equations/terms, and sample high-probability exam questions.
              </p>

              <form onSubmit={handleRevisionSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subject</label>
                    <input
                      id="input_revision_sub"
                      type="text"
                      value={revisionSubject}
                      onChange={(e) => setRevisionSubject(e.target.value)}
                      placeholder="e.g. Physics, Chemistry, Economics"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Topic</label>
                    <input
                      id="input_revision_top"
                      type="text"
                      value={revisionTopic}
                      onChange={(e) => setRevisionTopic(e.target.value)}
                      placeholder="e.g. Newton's Laws, Supply & Demand"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Grade Level</label>
                    <input
                      id="input_revision_grade"
                      type="text"
                      value={revisionGrade}
                      onChange={(e) => setRevisionGrade(e.target.value)}
                      placeholder="e.g. Grade 11, High school"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn_revision_generate"
                    type="submit"
                    disabled={loading || !revisionSubject.trim() || !revisionTopic.trim()}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Build Revision Sheet"}
                  </button>
                </div>
              </form>
            </div>

            {revisionResult && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="revision_result_box">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{revisionResult.title || `${revisionTopic} Study Companion`}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Perfect overview for last-minute studies and active retention.</p>
                  </div>
                  <button
                    id="btn_save_revision"
                    onClick={() => triggerSave('revision', revisionResult.title || `${revisionTopic} Companion`, revisionResult, 'revision_save')}
                    className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
                  >
                    {saveSuccess['revision_save'] ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-green-400" />
                        <span>Saved!</span>
                      </>
                    ) : (
                      <>
                        <Bookmark className="w-3.5 h-3.5" />
                        <span>Save Sheet</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Quick Notes Grid */}
                <div className="space-y-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">📝 Key Concepts Summarized</h4>
                  <ul className="space-y-2 pl-2">
                    {revisionResult.quickNotes.map((note, idx) => (
                      <li key={idx} className="text-sm text-slate-200 border-l-2 border-indigo-400 pl-3 py-0.5">
                        {note}
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Formulas Or Core Terms Grid */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">🔑 Essential Terms & Equations</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {revisionResult.formulasOrTerms.map((item, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm">
                        <strong className="text-indigo-300 block mb-1">{item.term}</strong>
                        <span className="text-slate-300">{item.definitionOrFormula}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Common Mistakes */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-rose-400 text-sm flex items-center gap-2">⚠️ Common Mistakes to Avoid</h4>
                  <ul className="space-y-2 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                    {revisionResult.commonMistakes.map((mistake, idx) => (
                      <li key={idx} className="text-xs md:text-sm text-rose-200 flex items-start gap-2">
                        <span className="font-bold">({idx + 1})</span>
                        <span>{mistake}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* High probability questions */}
                <div className="space-y-3 pt-2">
                  <h4 className="font-semibold text-white text-sm flex items-center gap-2">🔮 Likely Exam Questions</h4>
                  <div className="space-y-3">
                    {revisionResult.likelyQuestions.map((q, idx) => (
                      <div key={idx} className="p-3 border border-white/10 rounded-lg bg-white/5">
                        <p className="text-sm font-semibold text-white mb-1">Q{idx + 1}: {q.question}</p>
                        <p className="text-xs text-slate-300"><strong className="text-indigo-400 font-medium">Answer Tip:</strong> {q.answerHint}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

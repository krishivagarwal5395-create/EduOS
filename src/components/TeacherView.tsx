import React, { useState, useEffect } from "react";
import Markdown from "react-markdown";
import { 
  FileText, List, BookOpen, Sparkles, RefreshCw, Bookmark, Check, 
  Printer, ArrowRight, Clipboard, Scan, Image as ImageIcon, Zap, Clock, Bot,
  Presentation as PresentationIcon, Video, Trophy, Calendar
} from "lucide-react";
import { LessonPlan, Worksheet, QuestionPaper, SavedItem, CustomInstructions, SlipTest } from "../types";
import SavedMaterials from "./SavedMaterials";
import AICoPilot from "./AICoPilot";
import SlipTestMaker from "./SlipTestMaker";
import PresentationMaker from "./PresentationMaker";
import PPTPromptGenerator from "./PPTPromptGenerator";
import ClassroomQuizMaker from "./ClassroomQuizMaker";
import StudyPlanMaker from "./StudyPlanMaker";
import YouTubeScriptMaker from "./YouTubeScriptMaker";
import { compileClipboardText, handleExportToWord, handleExportToPDF } from "../utils/exportUtils";
import { FileDown, Eye } from "lucide-react";

import { safeGetLocalStorage, safeSetLocalStorage } from "../utils/storageUtils";
import { safeFetchJson, compressImageFile } from "../utils/apiUtils";

interface TeacherViewProps {
  onSave: (type: SavedItem['type'], title: string, data: any) => void;
  savedIds: string[];
  savedItems: SavedItem[];
  onDeleteItem: (id: string) => void;
  onUpdateItem?: (id: string, updatedData: any, updatedTitle?: string) => void;
}

export default function TeacherView({ onSave, savedIds, savedItems, onDeleteItem, onUpdateItem }: TeacherViewProps) {
  const [activeTab, setActiveTab] = useState<'lessons' | 'worksheets' | 'exams' | 'sliptest' | 'presentation' | 'classquiz' | 'studyplan' | 'youtube' | 'ai' | 'library' | 'scanner' | 'notebook'>('lessons');
  const [activeQuizToPlay, setActiveQuizToPlay] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [copiedStates, setCopiedStates] = useState<Record<string, boolean>>({});
  const [prefillMaterialIds, setPrefillMaterialIds] = useState<string[]>([]);

  // Custom Instructions Global State
  const [customInstructions, setCustomInstructions] = useState<CustomInstructions>(() => {
    return safeGetLocalStorage<CustomInstructions>("eduos_custom_instructions", {
      lessonPlan: "",
      worksheet: "",
      exam: "",
      slipTest: "",
      generalTone: ""
    });
  });

  const handleUpdateCustomInstructions = (updated: CustomInstructions) => {
    setCustomInstructions(updated);
    safeSetLocalStorage("eduos_custom_instructions", updated);
  };

  const [agenticPrefillParams, setAgenticPrefillParams] = useState<any>(null);

  const handleExecuteAgenticAction = (actionType: string, params: any) => {
    setAgenticPrefillParams(params);
    if (actionType === 'generate_slip_test') {
      setActiveTab('sliptest');
    } else if (actionType === 'generate_lesson_plan') {
      if (params.subject) setLessonSubject(params.subject);
      if (params.grade) setLessonGrade(params.grade);
      if (params.topic) setLessonTopic(params.topic);
      if (params.duration) setLessonDuration(params.duration);
      setActiveTab('lessons');
    } else if (actionType === 'generate_worksheet') {
      if (params.subject) setWorksheetSubject(params.subject);
      if (params.grade) setWorksheetGrade(params.grade);
      if (params.topic) setWorksheetTopic(params.topic);
      setActiveTab('worksheets');
    } else if (actionType === 'generate_question_paper') {
      if (params.subject) setExamSubject(params.subject);
      if (params.grade) setExamGrade(params.grade);
      if (params.topics) setExamTopics(params.topics);
      if (params.duration) setExamDuration(params.duration);
      if (params.timings) setExamTimings(params.timings);
      if (params.portion) setExamPortion(params.portion);
      setActiveTab('exams');
    } else if (actionType === 'generate_presentation') {
      if (params.materialIds) setPrefillMaterialIds(params.materialIds);
      setActiveTab('presentation');
    } else if (actionType === 'generate_youtube_script') {
      if (params.materialIds) setPrefillMaterialIds(params.materialIds);
      setActiveTab('youtube');
    }
  };

  const handleCopy = (type: string, title: string, data: any, key: string) => {
    const text = compileClipboardText({ type, title, data });
    navigator.clipboard.writeText(text);
    setCopiedStates(prev => ({ ...prev, [key]: true }));
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }));
    }, 2000);
  };

  // Lesson Plan States
  const [lessonSubject, setLessonSubject] = useState<string>("");
  const [lessonGrade, setLessonGrade] = useState<string>("");
  const [lessonTopic, setLessonTopic] = useState<string>("");
  const [lessonDuration, setLessonDuration] = useState<string>("45 minutes");
  const [lessonNumClasses, setLessonNumClasses] = useState<number>(1);
  const [lessonSelectedChapterId, setLessonSelectedChapterId] = useState<string>("custom");
  const [lessonFileBase64, setLessonFileBase64] = useState<string | null>(null);
  const [lessonFileMimeType, setLessonFileMimeType] = useState<string | null>(null);
  const [lessonInlineInstructions, setLessonInlineInstructions] = useState<string>("");
  const [lessonPlan, setLessonPlan] = useState<LessonPlan | null>(null);

  // Worksheet States
  const [worksheetSubject, setWorksheetSubject] = useState<string>("");
  const [worksheetGrade, setWorksheetGrade] = useState<string>("");
  const [worksheetTopic, setWorksheetTopic] = useState<string>("");
  const [worksheetSelectedChapterId, setWorksheetSelectedChapterId] = useState<string>("custom");
  const [worksheetInlineInstructions, setWorksheetInlineInstructions] = useState<string>("");
  const [worksheetResult, setWorksheetResult] = useState<Worksheet | null>(null);

  // Exam Question Paper States
  const [examSubject, setExamSubject] = useState<string>("");
  const [examGrade, setExamGrade] = useState<string>("");
  const [examMarks, setExamMarks] = useState<string>("50");
  const [examDuration, setExamDuration] = useState<string>("2 Hours");
  const [examTimings, setExamTimings] = useState<string>("09:00 AM - 11:00 AM");
  const [examPortion, setExamPortion] = useState<string>("");
  const [examDifficulty, setExamDifficulty] = useState<string>("Medium");
  const [examTopics, setExamTopics] = useState<string>("");
  const [examSelectedChapterId, setExamSelectedChapterId] = useState<string>("custom");
  const [examBlueprint, setExamBlueprint] = useState<string>("Include 5 MCQs (1 mark), 3 short answers (5 marks), and 2 long answer/application questions (15 marks).");
  const [examInlineInstructions, setExamInlineInstructions] = useState<string>("");
  const [questionPaper, setQuestionPaper] = useState<QuestionPaper | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState<boolean>(false);

  // Notebook Notes States
  const [notebookTopic, setNotebookTopic] = useState<string>("");
  const [notebookSelectedChapterId, setNotebookSelectedChapterId] = useState<string>("custom");
  const [notebookFileBase64, setNotebookFileBase64] = useState<string | null>(null);
  const [notebookFileMimeType, setNotebookFileMimeType] = useState<string | null>(null);
  const [notebookInlineInstructions, setNotebookInlineInstructions] = useState<string>("");
  const [notebookNotesResult, setNotebookNotesResult] = useState<any | null>(null);

  // Book Scanner States
  const [scanImage, setScanImage] = useState<string | null>(null);
  const [scanMimeType, setScanMimeType] = useState<string | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [scanSubject, setScanSubject] = useState<string>("");
  const [scanChapterName, setScanChapterName] = useState<string>("");

  // Save feedbacks
  const [saveSuccess, setSaveSuccess] = useState<Record<string, boolean>>({});

  const savedChapters = savedItems.filter(item => item.type === 'scanned-chapter' || item.type === 'chapter' || item.type === 'revision');

  const getSavedChapterText = (item?: SavedItem) => {
    if (!item || !item.data) return "";
    if (typeof item.data === "string") return item.data;
    return item.data.content || item.data.text || item.data.chapterContent || JSON.stringify(item.data);
  };

  useEffect(() => {
    setError(null);
  }, [activeTab]);

  const triggerSave = (type: 'lesson-plan' | 'worksheet' | 'question-paper' | 'scanned-chapter' | 'notebook' | 'slip-test', title: string, data: any, saveKey: string) => {
    onSave(type, title, data);
    setSaveSuccess(prev => ({ ...prev, [saveKey]: true }));
    setTimeout(() => {
      setSaveSuccess(prev => ({ ...prev, [saveKey]: false }));
    }, 2000);
  };

  // 1. Generate Lesson Plan Call
  const handleLessonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lessonSubject.trim() || !lessonTopic.trim() || !lessonGrade.trim()) return;
    setLoading(true);
    setError(null);
    setLessonPlan(null);
    try {
      let sourceContent = "";
      if (lessonSelectedChapterId !== "custom") {
        const chapter = savedItems.find(i => i.id === lessonSelectedChapterId);
        sourceContent = getSavedChapterText(chapter);
      }

      const data = await safeFetchJson("/api/edu/lesson-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: lessonSubject,
          grade: lessonGrade,
          topic: lessonTopic,
          duration: lessonDuration,
          numClasses: lessonNumClasses,
          sourceContent,
          fileBase64: lessonFileBase64 ? lessonFileBase64.split(',')[1] : null,
          fileMimeType: lessonFileMimeType,
          customInstructions: [customInstructions.lessonPlan, lessonInlineInstructions].filter(Boolean).join("\n\n")
        }),
      });
      setLessonPlan(data);
    } catch (err: any) {
      setError(err.message || "An error occurred generating lesson plan.");
    } finally {
      setLoading(false);
    }
  };

  const handleLessonFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { dataUrl, mimeType } = await compressImageFile(file);
        setLessonFileBase64(dataUrl);
        setLessonFileMimeType(mimeType);
      } catch (_) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setLessonFileBase64(reader.result as string);
          setLessonFileMimeType(file.type);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // 2. Generate Worksheet Call
  const handleWorksheetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!worksheetSubject.trim() || !worksheetTopic.trim() || !worksheetGrade.trim()) return;
    setLoading(true);
    setError(null);
    setWorksheetResult(null);
    try {
      let chapterContent = "";
      if (worksheetSelectedChapterId !== "custom") {
        const chapter = savedItems.find(i => i.id === worksheetSelectedChapterId);
        chapterContent = getSavedChapterText(chapter);
      }

      const data = await safeFetchJson("/api/edu/worksheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: worksheetSubject,
          grade: worksheetGrade,
          topic: worksheetTopic,
          chapterContent,
          customInstructions: [customInstructions.worksheet, worksheetInlineInstructions].filter(Boolean).join("\n\n")
        }),
      });
      setWorksheetResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred generating worksheet.");
    } finally {
      setLoading(false);
    }
  };

  // Generate Notebook Notes Call
  const handleNotebookSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!notebookTopic.trim()) return;
    setLoading(true);
    setError(null);
    setNotebookNotesResult(null);
    try {
      let sourceContent = "";
      if (notebookSelectedChapterId !== "custom") {
        const chapter = savedItems.find(i => i.id === notebookSelectedChapterId);
        sourceContent = getSavedChapterText(chapter);
      }

      const data = await safeFetchJson("/api/edu/notebook", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: notebookTopic,
          sourceContent,
          fileBase64: notebookFileBase64 ? notebookFileBase64.split(',')[1] : null,
          fileMimeType: notebookFileMimeType,
          customInstructions: [customInstructions.generalTone, notebookInlineInstructions].filter(Boolean).join("\n\n")
        }),
      });
      setNotebookNotesResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred generating notebook notes.");
    } finally {
      setLoading(false);
    }
  };

  const handleNotebookFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        const { dataUrl, mimeType } = await compressImageFile(file);
        setNotebookFileBase64(dataUrl);
        setNotebookFileMimeType(mimeType);
      } catch (_) {
        const reader = new FileReader();
        reader.onloadend = () => {
          setNotebookFileBase64(reader.result as string);
          setNotebookFileMimeType(file.type);
        };
        reader.readAsDataURL(file);
      }
    }
  };

  // 3. Generate Exam Paper Call
  const handleExamSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!examSubject.trim() || !examTopics.trim() || !examGrade.trim()) return;
    setLoading(true);
    setError(null);
    setQuestionPaper(null);
    setShowAnswerKey(false);
    try {
      let chapterContent = "";
      if (examSelectedChapterId !== "custom") {
        const chapter = savedItems.find(i => i.id === examSelectedChapterId);
        chapterContent = getSavedChapterText(chapter);
      }

      const data = await safeFetchJson("/api/edu/question-paper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: examSubject,
          grade: examGrade,
          marks: examMarks,
          duration: examDuration,
          timings: examTimings,
          portion: examPortion,
          difficulty: examDifficulty,
          topics: examTopics,
          blueprint: examBlueprint,
          chapterContent,
          customInstructions: [customInstructions.exam, examInlineInstructions].filter(Boolean).join("\n\n")
        }),
      });
      setQuestionPaper(data);
    } catch (err: any) {
      setError(err.message || "An error occurred generating exam paper.");
    } finally {
      setLoading(false);
    }
  };

  // 4. Book Scanner Call
  const handleScanSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!scanImage || !scanMimeType) return;
    setLoading(true);
    setError(null);
    setScanResult(null);
    try {
      const commaIdx = scanImage.indexOf(',');
      const rawBase64 = commaIdx !== -1 ? scanImage.slice(commaIdx + 1) : scanImage;
      
      let cleanType = scanMimeType.toLowerCase().trim().split(';')[0];
      if (cleanType.includes('pdf')) cleanType = 'application/pdf';
      else if (cleanType.includes('png')) cleanType = 'image/png';
      else if (cleanType.includes('webp')) cleanType = 'image/webp';
      else if (cleanType.includes('text')) cleanType = 'text/plain';
      else cleanType = 'image/jpeg';

      const data = await safeFetchJson<{ text: string; suggestedSubject?: string; suggestedChapter?: string }>("/api/edu/scan-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageBase64: rawBase64.trim(),
          mimeType: cleanType
        }),
      });
      setScanResult(data.text);
      if (data.suggestedSubject && !scanSubject) setScanSubject(data.suggestedSubject);
      if (data.suggestedChapter && !scanChapterName) setScanChapterName(data.suggestedChapter);
    } catch (err: any) {
      setError(err.message || "An error occurred scanning book / extracting text.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = (ev.target?.result as string) || "";
        setScanResult(text);
        try {
          const encoder = new TextEncoder();
          const bytes = encoder.encode(text);
          let binary = '';
          for (let i = 0; i < bytes.length; i++) {
            binary += String.fromCharCode(bytes[i]);
          }
          const base64 = btoa(binary);
          setScanImage(`data:text/plain;base64,${base64}`);
        } catch (_) {
          setScanImage(`data:text/plain;base64,${btoa(unescape(encodeURIComponent(text)))}`);
        }
        setScanMimeType("text/plain");
        if (!scanChapterName) setScanChapterName(file.name.replace(/\.[^/.]+$/, ""));
      };
      reader.readAsText(file);
      return;
    }

    try {
      const { dataUrl, mimeType } = await compressImageFile(file);
      setScanImage(dataUrl);
      setScanMimeType(mimeType);
    } catch (_) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setScanImage(reader.result as string);
        setScanMimeType(file.type || (file.name.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg'));
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto px-4 py-2" id="teacher_workspace">
      {/* Teacher Subnav Rail */}
      <div className="lg:w-64 shrink-0 flex flex-row lg:flex-col gap-1 overflow-x-auto lg:overflow-visible pb-2 lg:pb-0 border-b lg:border-b-0 lg:border-r border-white/10 lg:pr-4" id="teacher_subnav_rail">
        <button
          id="btn_tab_ai"
          onClick={() => setActiveTab('ai')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-semibold whitespace-nowrap transition-all ${activeTab === 'ai' ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20' : 'text-indigo-300 hover:bg-white/5 hover:text-white bg-indigo-500/10 border border-indigo-500/20'}`}
        >
          <Sparkles className="w-4 h-4 text-indigo-300" />
          <span>AI Assistant & Co-Pilot</span>
        </button>
        <button
          id="btn_tab_sliptest"
          onClick={() => setActiveTab('sliptest')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'sliptest' ? 'bg-amber-500/20 text-amber-200 border border-amber-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <Zap className="w-4 h-4 text-amber-400" />
          <span>Slip Test Generator</span>
        </button>
        <button
          id="btn_tab_lessons"
          onClick={() => setActiveTab('lessons')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'lessons' ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Lesson Planner</span>
        </button>
        <button
          id="btn_tab_worksheets"
          onClick={() => setActiveTab('worksheets')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'worksheets' ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <FileText className="w-4 h-4" />
          <span>Worksheet Maker</span>
        </button>
        <button
          id="btn_tab_exams"
          onClick={() => setActiveTab('exams')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'exams' ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <List className="w-4 h-4" />
          <span>Exam Question Paper</span>
        </button>
        <button
          id="btn_tab_presentation"
          onClick={() => setActiveTab('presentation')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'presentation' ? 'bg-indigo-600 text-white shadow-md' : 'text-indigo-300 hover:bg-white/5 hover:text-white bg-indigo-500/10 border border-indigo-500/20'}`}
        >
          <PresentationIcon className="w-4 h-4 text-indigo-400" />
          <span>PPT Prompt Generator</span>
        </button>
        <button
          id="btn_tab_classquiz"
          onClick={() => setActiveTab('classquiz')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'classquiz' ? 'bg-amber-600 text-white shadow-md' : 'text-amber-300 hover:bg-white/5 hover:text-white bg-amber-500/10 border border-amber-500/20'}`}
        >
          <Trophy className="w-4 h-4 text-amber-400" />
          <span>Class Team Quiz</span>
        </button>
        <button
          id="btn_tab_studyplan"
          onClick={() => setActiveTab('studyplan')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'studyplan' ? 'bg-teal-600 text-white shadow-md' : 'text-teal-300 hover:bg-white/5 hover:text-white bg-teal-500/10 border border-teal-500/20'}`}
        >
          <Calendar className="w-4 h-4 text-teal-400" />
          <span>3-Week Study Plan</span>
        </button>
        <button
          id="btn_tab_youtube"
          onClick={() => setActiveTab('youtube')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'youtube' ? 'bg-rose-600 text-white shadow-md' : 'text-rose-300 hover:bg-white/5 hover:text-white bg-rose-500/10 border border-rose-500/20'}`}
        >
          <Video className="w-4 h-4 text-rose-400" />
          <span>YouTube Video Finder</span>
        </button>
        <button
          id="btn_tab_library"
          onClick={() => setActiveTab('library')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'library' ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <Bookmark className="w-4 h-4" />
          <span>Saved Materials</span>
        </button>
        <button
          id="btn_tab_scanner"
          onClick={() => setActiveTab('scanner')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'scanner' ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <Scan className="w-4 h-4" />
          <span>Book Scanner</span>
        </button>
        <button
          id="btn_tab_notebook"
          onClick={() => setActiveTab('notebook')}
          className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${activeTab === 'notebook' ? 'bg-indigo-500/15 text-indigo-200 border border-indigo-500/30' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
        >
          <BookOpen className="w-4 h-4" />
          <span>Notebook Notes</span>
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 min-w-0" id="teacher_workspace_content">
        {error && (
          <div className="p-4 mb-4 bg-rose-500/10 text-rose-200 text-sm rounded-xl border border-rose-500/20 flex items-center justify-between" id="teacher_error_alert">
            <span>{error}</span>
            <button className="text-rose-400 hover:text-rose-200 font-semibold" onClick={() => setError(null)}>Dismiss</button>
          </div>
        )}

        {/* Loading Spinner */}
        {loading && !lessonPlan && !worksheetResult && !questionPaper && !scanResult && (
          <div className="flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg animate-pulse" id="teacher_loading">
            <RefreshCw className="w-8 h-8 text-indigo-400 animate-spin mb-4" />
            <h3 className="font-semibold text-white">Generating Teacher Resources...</h3>
            <p className="text-xs text-slate-400 mt-1">Please wait while EduOS AI drafts curriculum-aligned original content.</p>
          </div>
        )}

        {/* 0. AI ASSISTANT & CO-PILOT TAB */}
        {activeTab === 'ai' && (
          <AICoPilot
            savedItems={savedItems}
            customInstructions={customInstructions}
            onUpdateCustomInstructions={handleUpdateCustomInstructions}
            onExecuteAgenticAction={handleExecuteAgenticAction}
            onSaveItem={onSave}
          />
        )}

        {/* 0.5 SLIP TEST GENERATOR TAB */}
        {activeTab === 'sliptest' && (
          <SlipTestMaker
            savedChapters={savedChapters}
            customInstructions={customInstructions.slipTest}
            onSave={triggerSave}
            saveSuccess={saveSuccess}
            prefillParams={agenticPrefillParams}
          />
        )}

        {/* 1. LESSON PLANNER FORM */}
        {activeTab === 'lessons' && (
          <div className="space-y-6" id="panel_lessons">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-indigo-400" /> Professional Lesson Planner
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Design custom lesson plans containing objectives, timing splits, Exit tickets, materials, homework ideas, and activity guidelines.
              </p>

              <form onSubmit={handleLessonSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subject</label>
                    <input
                      id="input_lesson_sub"
                      type="text"
                      value={lessonSubject}
                      onChange={(e) => setLessonSubject(e.target.value)}
                      placeholder="e.g. Science, Mathematics, Geography"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Grade level</label>
                    <input
                      id="input_lesson_grade"
                      type="text"
                      value={lessonGrade}
                      onChange={(e) => setLessonGrade(e.target.value)}
                      placeholder="e.g. Grade 5, Year 8, High school"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Lesson Topic / Standard</label>
                    <input
                      id="input_lesson_topic"
                      type="text"
                      value={lessonTopic}
                      onChange={(e) => setLessonTopic(e.target.value)}
                      placeholder="e.g. Water Cycle, Ecosystems, Fractions"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Duration per Class</label>
                    <select
                      id="select_lesson_dur"
                      value={lessonDuration}
                      onChange={(e) => setLessonDuration(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
                    >
                      <option value="30 minutes">30 Minutes</option>
                      <option value="45 minutes">45 Minutes</option>
                      <option value="60 minutes">60 Minutes</option>
                      <option value="90 minutes">90 Minutes / Block</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Number of Days / Classes</label>
                    <input
                      type="number"
                      min="1"
                      max="14"
                      value={lessonNumClasses}
                      onChange={(e) => setLessonNumClasses(parseInt(e.target.value) || 1)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Source Material (Optional)</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      {savedChapters.length > 0 && (
                        <select
                          value={lessonSelectedChapterId}
                          onChange={(e) => setLessonSelectedChapterId(e.target.value)}
                          className="w-full md:w-1/2 px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
                        >
                          <option value="custom">No saved chapter</option>
                          {savedChapters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.data.subject} - {c.data.chapterName}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex-1">
                        <label className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-indigo-400/50 bg-slate-900/40 hover:bg-indigo-500/10 cursor-pointer transition-colors text-sm text-slate-300">
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {lessonFileBase64 ? 'File selected' : 'Upload PDF / Image'}
                          </span>
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, application/pdf"
                            onChange={handleLessonFileUpload}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Custom Instructions (Optional)</label>
                  <textarea
                    id="input_lesson_custom_instructions"
                    value={lessonInlineInstructions}
                    onChange={(e) => setLessonInlineInstructions(e.target.value)}
                    placeholder="e.g. Include 5E model phases, focus on hands-on activities, add accommodations for ELL students"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn_lesson_generate"
                    type="submit"
                    disabled={loading || !lessonSubject.trim() || !lessonTopic.trim() || !lessonGrade.trim()}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Draft Lesson Plan"}
                  </button>
                </div>
              </form>
            </div>

            {/* Generated Lesson Plan display */}
            {lessonPlan && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="lesson_result_box">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{lessonPlan.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Grade: {lessonPlan.grade} | Duration: {lessonPlan.duration}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy('lesson-plan', lessonPlan.title, lessonPlan, 'lesson_copy')}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedStates['lesson_copy'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleExportToPDF({ type: 'lesson-plan', title: lessonPlan.title, data: lessonPlan })}
                      className="px-3 py-1.5 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Export to PDF"
                      id="btn_lesson_export_pdf"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleExportToWord({ type: 'lesson-plan', title: lessonPlan.title, data: lessonPlan })}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Download Word Doc"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Print / Save PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn_save_lesson"
                      onClick={() => triggerSave('lesson-plan', lessonPlan.title, lessonPlan, 'lesson_save')}
                      className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ml-2"
                    >
                      {saveSuccess['lesson_save'] ? (
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
                </div>

                {/* Objectives */}
                {lessonPlan.objectives && (
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white text-sm">🎯 Learning Objectives (SWBAT)</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-200 pl-2">
                      {lessonPlan.objectives.map((obj, idx) => (
                        <li key={idx}>{obj}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Materials */}
                <div className="space-y-2 pt-2">
                  <h4 className="font-semibold text-white text-sm">🎒 Required Materials & Resources</h4>
                  <div className="flex flex-wrap gap-2">
                    {lessonPlan.materials.map((mat, idx) => (
                      <span key={idx} className="bg-white/10 text-slate-200 text-xs font-medium px-3 py-1 rounded-full border border-white/10">
                        {mat}
                      </span>
                    ))}
                  </div>
                </div>

                {lessonPlan.days ? (
                  <div className="space-y-6 pt-4">
                    <h4 className="font-semibold text-white text-md border-b border-white/10 pb-2">📅 Unit Plan Breakdown</h4>
                    {lessonPlan.days.map((day, dIdx) => (
                      <div key={dIdx} className="bg-slate-900/40 p-5 rounded-xl border border-white/10 space-y-4">
                        <h4 className="font-bold text-lg text-indigo-400">{day.day}: {day.topic}</h4>
                        {day.objectives && (
                          <div className="space-y-1">
                            <span className="font-semibold text-white text-sm">🎯 Objectives:</span>
                            <ul className="list-disc list-inside text-sm text-slate-300 pl-4">
                              {day.objectives.map((obj, idx) => (
                                <li key={idx}>{obj}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        <div className="overflow-x-auto rounded-lg border border-white/10 mt-3">
                          <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-semibold uppercase tracking-wider">
                                <th className="p-3">Time</th>
                                <th className="p-3">Segment</th>
                                <th className="p-3">Action Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-200">
                              {day.outline?.map((out, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="p-3 font-bold text-indigo-300 whitespace-nowrap">{out.time}</td>
                                  <td className="p-3 font-semibold text-white">{out.section}</td>
                                  <td className="p-3 text-slate-300 leading-relaxed text-xs md:text-sm">{out.activity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                          {day.assessment && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                              <h5 className="font-semibold text-white text-xs mb-1">📝 Formative Assessment</h5>
                              <p className="text-slate-300 text-xs leading-relaxed">{day.assessment}</p>
                            </div>
                          )}
                          {day.homework && (
                            <div className="p-3 bg-white/5 rounded-lg border border-white/10">
                              <h5 className="font-semibold text-white text-xs mb-1">🏠 Homework Task</h5>
                              <p className="text-slate-300 text-xs leading-relaxed">{day.homework}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <>
                    {/* Timing split table */}
                    {lessonPlan.outline && (
                      <div className="space-y-3 pt-2">
                        <h4 className="font-semibold text-white text-sm">⏱️ Timed Lesson Segment Outline</h4>
                        <div className="overflow-x-auto rounded-lg border border-white/10">
                          <table className="w-full text-left border-collapse text-xs md:text-sm">
                            <thead>
                              <tr className="bg-white/5 border-b border-white/10 text-slate-300 font-semibold uppercase tracking-wider">
                                <th className="p-3">Time Split</th>
                                <th className="p-3">Lesson Segment</th>
                                <th className="p-3">Teacher & Student Action Details</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-slate-200">
                              {lessonPlan.outline.map((out, idx) => (
                                <tr key={idx} className="hover:bg-white/5 transition-colors">
                                  <td className="p-3 font-bold text-indigo-300 whitespace-nowrap">{out.time}</td>
                                  <td className="p-3 font-semibold text-white">{out.section}</td>
                                  <td className="p-3 text-slate-300 leading-relaxed text-xs md:text-sm">{out.activity}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                    
                    {/* Homework and Assessment */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="font-semibold text-white text-sm mb-1.5">📝 Formative Assessment / Exit Ticket</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">{lessonPlan.assessment}</p>
                      </div>
                      <div className="p-4 bg-white/5 rounded-xl border border-white/10">
                        <h4 className="font-semibold text-white text-sm mb-1.5">🏠 Consolidating Homework Task</h4>
                        <p className="text-slate-300 text-sm leading-relaxed">{lessonPlan.homework}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* 2. WORKSHEET MAKER FORM */}
        {activeTab === 'worksheets' && (
          <div className="space-y-6" id="panel_worksheets">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" /> Worksheet Maker
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Draft targeted class worksheets on any subject complete with student directions, 5 formatted exercise questions, and matching step-by-step solutions.
              </p>

              <form onSubmit={handleWorksheetSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subject</label>
                    <input
                      id="input_work_sub"
                      type="text"
                      value={worksheetSubject}
                      onChange={(e) => setWorksheetSubject(e.target.value)}
                      placeholder="e.g. Physics, Chemistry, Grammar"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Grade Level</label>
                    <input
                      id="input_work_grade"
                      type="text"
                      value={worksheetGrade}
                      onChange={(e) => setWorksheetGrade(e.target.value)}
                      placeholder="e.g. Grade 4, Year 9"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Source Material</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      {savedChapters.length > 0 && (
                        <select
                          value={worksheetSelectedChapterId}
                          onChange={(e) => {
                            setWorksheetSelectedChapterId(e.target.value);
                            if (e.target.value !== "custom") {
                              const chapter = savedChapters.find(c => c.id === e.target.value);
                              if (chapter) setWorksheetTopic(chapter.data.chapterName);
                            } else {
                              setWorksheetTopic("");
                            }
                          }}
                          className="w-full md:w-1/3 px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
                        >
                          <option value="custom">Custom Topic</option>
                          {savedChapters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.data.subject} - {c.data.chapterName}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        id="input_work_topic"
                        type="text"
                        value={worksheetTopic}
                        onChange={(e) => setWorksheetTopic(e.target.value)}
                        placeholder="e.g. Newton's 2nd Law, Present Perfect"
                        className="flex-1 w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Custom Instructions (Optional)</label>
                  <textarea
                    id="input_work_custom_instructions"
                    value={worksheetInlineInstructions}
                    onChange={(e) => setWorksheetInlineInstructions(e.target.value)}
                    placeholder="e.g. Include 2 application word problems, add step-by-step hints, keep font readable"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn_worksheet_generate"
                    type="submit"
                    disabled={loading || !worksheetSubject.trim() || !worksheetTopic.trim() || !worksheetGrade.trim()}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Build Student Worksheet"}
                  </button>
                </div>
              </form>
            </div>

            {worksheetResult && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="worksheet_result_box">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{worksheetResult.title}</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Grade Level: {worksheetGrade}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCopy('worksheet', worksheetResult.title, worksheetResult, 'worksheet_copy')}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedStates['worksheet_copy'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleExportToPDF({ type: 'worksheet', title: worksheetResult.title, data: worksheetResult })}
                      className="px-3 py-1.5 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Export to PDF"
                      id="btn_worksheet_export_pdf"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleExportToWord({ type: 'worksheet', title: worksheetResult.title, data: worksheetResult })}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Download Word Doc"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Print / Save PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn_save_worksheet"
                      onClick={() => triggerSave('worksheet', worksheetResult.title, worksheetResult, 'worksheet_save')}
                      className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ml-2"
                    >
                      {saveSuccess['worksheet_save'] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save Worksheet</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Instructions */}
                <div className="p-3.5 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                  <strong className="text-xs font-bold text-indigo-300 uppercase block tracking-wider mb-1">Student Instructions:</strong>
                  <p className="text-slate-200 text-sm leading-relaxed">{worksheetResult.instructions}</p>
                </div>

                {/* Questions Grid */}
                <div className="space-y-4 pt-2">
                  <h4 className="font-semibold text-white text-sm border-b border-white/10 pb-1.5">📝 Exercises</h4>
                  <div className="space-y-4">
                    {worksheetResult.questions.map((q, idx) => (
                      <div key={idx} className="flex gap-3">
                        <span className="font-bold text-slate-500">{idx + 1}.</span>
                        <div className="space-y-2 flex-1">
                          <p className="text-sm font-medium text-white">{q}</p>
                          {/* Answer Box Space */}
                          <div className="h-14 border border-dashed border-white/10 rounded-lg bg-white/5"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Answer Keys */}
                <div className="space-y-3 pt-4 border-t border-white/10">
                  <h4 className="font-semibold text-indigo-400 text-sm">🔑 Answer Key & Step-by-Step Solutions</h4>
                  <div className="space-y-3 pl-2 text-sm text-slate-300">
                    {worksheetResult.solutions.map((sol, idx) => (
                      <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                        <p className="font-bold text-indigo-300 mb-1">Question {idx + 1} Solution:</p>
                        <p className="leading-relaxed text-xs md:text-sm">{sol}</p>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </div>
        )}

        {/* 3. QUESTION PAPER GENERATOR */}
        {activeTab === 'exams' && (
          <div className="space-y-6" id="panel_exams">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <List className="w-5 h-5 text-indigo-400" /> Exam Question Paper & Key Compiler
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Input your curriculum parameters to construct a balanced exam question paper featuring section division, marks allocation, and full answer keys with marks rubrics.
              </p>

              <form onSubmit={handleExamSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subject</label>
                    <input
                      id="input_exam_sub"
                      type="text"
                      value={examSubject}
                      onChange={(e) => setExamSubject(e.target.value)}
                      placeholder="e.g. World History, Algebra II"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Grade Level</label>
                    <input
                      id="input_exam_grade"
                      type="text"
                      value={examGrade}
                      onChange={(e) => setExamGrade(e.target.value)}
                      placeholder="e.g. Grade 10, Year 11"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Total Marks</label>
                    <input
                      id="input_exam_marks"
                      type="text"
                      value={examMarks}
                      onChange={(e) => setExamMarks(e.target.value)}
                      placeholder="e.g. 50, 100"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Exam Duration</label>
                    <input
                      id="input_exam_duration"
                      type="text"
                      value={examDuration}
                      onChange={(e) => setExamDuration(e.target.value)}
                      placeholder="e.g. 2 Hours, 90 Minutes"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Exam Timings</label>
                    <input
                      id="input_exam_timings"
                      type="text"
                      value={examTimings}
                      onChange={(e) => setExamTimings(e.target.value)}
                      placeholder="e.g. 09:00 AM - 11:00 AM"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Portion / Syllabus</label>
                    <input
                      id="input_exam_portion"
                      type="text"
                      value={examPortion}
                      onChange={(e) => setExamPortion(e.target.value)}
                      placeholder="e.g. Units 1 to 4, Chapters 5-8"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Difficulty</label>
                    <select
                      id="select_exam_diff"
                      value={examDifficulty}
                      onChange={(e) => setExamDifficulty(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
                    >
                      <option value="Easy">Easy (Recall / Direct questions)</option>
                      <option value="Medium">Medium (Balanced MCQ, short answer, application)</option>
                      <option value="Hard">Hard (Higher-order thinking, advanced critical thinking)</option>
                    </select>
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Source Material</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      {savedChapters.length > 0 && (
                        <select
                          value={examSelectedChapterId}
                          onChange={(e) => {
                            setExamSelectedChapterId(e.target.value);
                            if (e.target.value !== "custom") {
                              const chapter = savedChapters.find(c => c.id === e.target.value);
                              if (chapter) setExamTopics(chapter.data.chapterName);
                            } else {
                              setExamTopics("");
                            }
                          }}
                          className="w-full md:w-1/3 px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
                        >
                          <option value="custom">Custom Topics</option>
                          {savedChapters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.data.subject} - {c.data.chapterName}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        id="input_exam_topics"
                        type="text"
                        value={examTopics}
                        onChange={(e) => setExamTopics(e.target.value)}
                        placeholder="e.g. Quadratic equations, factorisation, graphing"
                        className="flex-1 w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Structure / Blueprint specifications</label>
                  <textarea
                    id="input_exam_blueprint"
                    rows={2}
                    value={examBlueprint}
                    onChange={(e) => setExamBlueprint(e.target.value)}
                    className="w-full px-4 py-2 text-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Custom Instructions (Optional)</label>
                  <textarea
                    id="input_exam_custom_instructions"
                    value={examInlineInstructions}
                    onChange={(e) => setExamInlineInstructions(e.target.value)}
                    placeholder="e.g. Provide extra space for working out math steps, include state board question styling, mark allocation breakdowns"
                    rows={2}
                    className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500 resize-none"
                  />
                </div>

                <div className="flex justify-end pt-2">
                  <button
                    id="btn_exam_generate"
                    type="submit"
                    disabled={loading || !examSubject.trim() || !examTopics.trim() || !examGrade.trim()}
                    className="bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-indigo-500/10"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Draft Question Paper"}
                  </button>
                </div>
              </form>
            </div>

            {questionPaper && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="exam_result_box">
                <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-semibold text-lg text-white">{questionPaper.paperTitle}</h3>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Grade: {questionPaper.grade} &nbsp;|&nbsp; Total Marks: {questionPaper.totalMarks} Marks
                      {questionPaper.duration && ` | Duration: ${questionPaper.duration}`}
                      {questionPaper.timings && ` | Timings: ${questionPaper.timings}`}
                    </p>
                    {questionPaper.portion && (
                      <p className="text-xs font-mono text-indigo-300 mt-1">
                        Syllabus / Portion: {questionPaper.portion}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-2 md:mt-0">
                    <button
                      id="btn_toggle_exam_keys"
                      onClick={() => setShowAnswerKey(!showAnswerKey)}
                      className="px-4 py-1.5 border border-white/10 text-slate-200 hover:bg-white/10 bg-white/5 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>{showAnswerKey ? "View Question Paper Only" : "Show Answer Key Rubrics"}</span>
                    </button>
                    <button
                      onClick={() => handleCopy('question-paper', questionPaper.paperTitle, questionPaper, 'exam_copy')}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedStates['exam_copy'] ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={() => handleExportToPDF({ type: 'question-paper', title: questionPaper.paperTitle, data: questionPaper })}
                      className="px-3 py-1.5 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Export to PDF"
                      id="btn_exam_export_pdf"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleExportToWord({ type: 'question-paper', title: questionPaper.paperTitle, data: questionPaper })}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Download Word Doc"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                      title="Print / Save PDF"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>
                    <button
                      id="btn_save_exam"
                      onClick={() => triggerSave('question-paper', questionPaper.paperTitle, questionPaper, 'exam_save')}
                      className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors ml-2"
                    >
                      {saveSuccess['exam_save'] ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-green-400" />
                          <span>Saved!</span>
                        </>
                      ) : (
                        <>
                          <Bookmark className="w-3.5 h-3.5" />
                          <span>Save Paper</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {!showAnswerKey ? (
                  /* EXAM PAPER MODE */
                  <div className="space-y-6" id="exam_paper_view">
                    {/* General instructions */}
                    <div className="p-3.5 bg-white/5 rounded-xl border border-white/10">
                      <strong className="text-xs font-bold text-slate-300 uppercase block tracking-wider mb-1">Candidate Instructions:</strong>
                      <p className="text-slate-400 text-xs leading-relaxed whitespace-pre-wrap">{questionPaper.instructions}</p>
                    </div>

                    {/* Section listings */}
                    {questionPaper.sections.map((section, sIdx) => (
                      <div key={sIdx} className="space-y-4">
                        <h4 className="font-bold text-sm bg-white/10 py-1.5 px-3 text-white rounded uppercase tracking-wider border border-white/5">{section.sectionName}</h4>
                        <div className="space-y-4">
                          {section.questions.map((q, qIdx) => (
                            <div key={qIdx} className="flex justify-between items-start text-sm">
                              <div className="flex gap-2">
                                <span className="font-bold text-slate-500">{qIdx + 1}.</span>
                                <p className="text-slate-200 max-w-3xl leading-relaxed">{q.questionText}</p>
                              </div>
                              <span className="text-xs font-bold text-indigo-300 whitespace-nowrap pl-4">[{q.marks}]</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  /* SOLUTIONS KEY RUBRIC */
                  <div className="space-y-4" id="exam_solutions_view">
                    <h4 className="font-bold text-sm text-indigo-400 border-b border-white/10 pb-1 flex items-center gap-2">
                      🔑 Comprehensive Solution Schema & Grading Rubric
                    </h4>
                    <div className="space-y-3">
                      {questionPaper.answerKey.map((key, idx) => (
                        <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 text-sm">
                          <div className="flex justify-between border-b border-white/10 pb-1.5 mb-2">
                            <strong className="text-indigo-300">Question: {key.questionNumber}</strong>
                            <span className="text-xs font-semibold text-slate-400">Grading Rule</span>
                          </div>
                          <div className="space-y-2 text-slate-200">
                            <div>
                              <span className="text-xs font-bold uppercase text-slate-400 block mb-0.5">Model Answer / Expected response:</span>
                              <p className="leading-relaxed whitespace-pre-wrap">{key.answerText}</p>
                            </div>
                            <div className="pt-1.5 border-t border-white/5 text-xs text-indigo-300">
                              <strong className="font-bold">Marking Criteria: </strong> {key.markingCriteria}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              </div>
            )}
          </div>
        )}

        {activeTab === 'presentation' && (
          <div className="space-y-6 animate-fade-in" id="panel_presentation">
            <PPTPromptGenerator
              savedMaterials={savedItems}
              customInstructions={customInstructions}
              onSaveItem={(type, title, data) => onSave(type, title, data)}
              prefillTopic={agenticPrefillParams?.topic}
              prefillGrade={agenticPrefillParams?.grade}
            />
          </div>
        )}

        {activeTab === 'classquiz' && (
          <div className="space-y-6 animate-fade-in" id="panel_classquiz">
            <ClassroomQuizMaker
              savedMaterials={savedItems}
              customInstructions={customInstructions}
              onSaveItem={(type, title, data) => onSave(type, title, data)}
              prefillChapter={agenticPrefillParams?.topic || agenticPrefillParams?.chapter}
              prefillSubject={agenticPrefillParams?.subject}
              prefillGrade={agenticPrefillParams?.grade}
              initialQuiz={activeQuizToPlay}
            />
          </div>
        )}

        {activeTab === 'studyplan' && (
          <div className="space-y-6 animate-fade-in" id="panel_studyplan">
            <StudyPlanMaker
              savedMaterials={savedItems}
              customInstructions={customInstructions}
              onSaveItem={(type, title, data) => onSave(type, title, data)}
            />
          </div>
        )}

        {activeTab === 'youtube' && (
          <div className="space-y-6 animate-fade-in" id="panel_youtube">
            <YouTubeScriptMaker
              savedMaterials={savedItems}
              customInstructions={customInstructions}
              onSaveItem={(type, title, data) => onSave(type, title, data)}
              prefillMaterialIds={prefillMaterialIds}
            />
          </div>
        )}

        {activeTab === 'library' && (
          <div className="space-y-6 animate-fade-in" id="panel_library">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Bookmark className="w-5 h-5 text-indigo-400" /> Saved Curriculum Materials
              </h2>
              <p className="text-sm text-slate-400 mt-1">
                Access, view, print, and convert your saved educational worksheets, lesson plans, PPTs, video scripts, and interactive class quizzes.
              </p>
            </div>
            <SavedMaterials 
              items={savedItems} 
              onDelete={onDeleteItem}
              onDuplicate={(item) => onSave(item.type, item.title, item.data)}
              onUpdateItem={onUpdateItem}
              onConductQuiz={(quizData) => {
                setActiveQuizToPlay(quizData);
                setActiveTab('classquiz');
              }}
              onCreatePPTFromMaterials={(mIds) => {
                setPrefillMaterialIds(mIds);
                setActiveTab('presentation');
              }}
              onCreateYouTubeFromMaterials={(mIds) => {
                setPrefillMaterialIds(mIds);
                setActiveTab('youtube');
              }}
            />
          </div>
        )}
        {activeTab === 'scanner' && (
          <div className="space-y-6 animate-fade-in" id="panel_scanner">
            <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
              <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
                <Scan className="w-5 h-5 text-indigo-400" /> AI Book Scanner
              </h2>
              <p className="text-sm text-slate-400 leading-relaxed">
                Upload images or photos of textbook pages to extract structured, readable text using advanced AI OCR. Perfect for digitizing curriculum resources quickly.
              </p>

              <form onSubmit={handleScanSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Upload Textbook Page</label>
                  <div className="flex items-center gap-4">
                    <label className="relative cursor-pointer flex-1 group">
                      <div className="w-full flex items-center justify-center p-6 border-2 border-dashed border-white/20 rounded-xl bg-slate-900/40 hover:bg-white/5 hover:border-indigo-500/50 transition-all text-slate-400 group-hover:text-indigo-300">
                        <div className="text-center">
                          <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-70" />
                          <span className="text-sm font-medium">{scanImage ? "Document selected - Click to change" : "Click to browse or drag & drop"}</span>
                          <span className="block text-xs opacity-70 mt-1">Supports JPG, PNG, WebP, PDF, TXT</span>
                        </div>
                      </div>
                      <input 
                        type="file" 
                        accept="image/png, image/jpeg, image/webp, application/pdf, .pdf, text/plain, .txt, .md"
                        onChange={handleImageUpload}
                        className="hidden" 
                      />
                    </label>
                  </div>
                  
                  {scanImage && scanMimeType?.startsWith('image/') && (
                    <div className="mt-4 flex justify-center">
                      <img src={scanImage} alt="Scanned document preview" className="max-h-64 object-contain rounded-lg border border-white/10 shadow-lg" />
                    </div>
                  )}
                  {scanImage && scanMimeType === 'application/pdf' && (
                    <div className="mt-4 flex flex-col items-center justify-center p-6 bg-slate-900/40 rounded-lg border border-white/10 shadow-lg text-slate-300">
                      <FileText className="w-10 h-10 mb-2 text-rose-400" />
                      <span className="text-sm font-medium">PDF Document Selected</span>
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={loading || !scanImage}
                  className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10"
                >
                  {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <><Sparkles className="w-4 h-4" /> Extract Text with AI</>}
                </button>
              </form>
            </div>

            {scanResult && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg animate-fade-in relative">
                <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/10">
                  <h3 className="font-semibold text-white text-lg">Extracted Text</h3>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(scanResult);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white bg-white/5 transition-all text-xs font-medium"
                  >
                    <Clipboard className="w-3.5 h-3.5" /> Copy Text
                  </button>
                </div>
                
                <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed font-sans mb-6">
                  <Markdown>{scanResult}</Markdown>
                </div>

                <div className="bg-slate-900/40 p-4 rounded-xl border border-white/10 space-y-4">
                  <h4 className="font-semibold text-white text-sm">Save to Curriculum Library</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Subject</label>
                      <input
                        type="text"
                        value={scanSubject}
                        onChange={(e) => setScanSubject(e.target.value)}
                        placeholder="e.g. Science"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Chapter Name</label>
                      <input
                        type="text"
                        value={scanChapterName}
                        onChange={(e) => setScanChapterName(e.target.value)}
                        placeholder="e.g. Chapter 4: Ecosystems"
                        className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-sm text-white focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={() => triggerSave('scanned-chapter', `${scanSubject} - ${scanChapterName}`, { subject: scanSubject, chapterName: scanChapterName, content: scanResult, originalFile: { data: scanImage as string, mimeType: scanMimeType as string } }, 'scanner')}
                      disabled={!scanSubject.trim() || !scanChapterName.trim()}
                      className="bg-emerald-600 hover:bg-emerald-500 disabled:bg-white/5 disabled:text-slate-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-md shadow-emerald-500/20"
                    >
                      {saveSuccess['scanner'] ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      {saveSuccess['scanner'] ? "Saved to Library" : "Save Chapter"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* 6. Notebook Notes */}
        {activeTab === 'notebook' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
                <BookOpen className="w-32 h-32" />
              </div>
              <div className="flex items-center gap-2 mb-2">
                <div className="bg-indigo-500/20 p-2 rounded-lg">
                  <BookOpen className="w-5 h-5 text-indigo-400" />
                </div>
                <h2 className="text-xl font-display font-bold tracking-tight">Notebook Notes Generator</h2>
              </div>
              <p className="text-sm text-slate-400 mb-6 max-w-2xl">Generate structured, easy-to-read notebook notes for any topic, optionally based on a saved chapter.</p>
              
              <form onSubmit={handleNotebookSubmit} className="mt-4 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Topic</label>
                    <input
                      id="input_notebook_topic"
                      type="text"
                      value={notebookTopic}
                      onChange={(e) => setNotebookTopic(e.target.value)}
                      placeholder="e.g. Newton's 2nd Law, The Water Cycle"
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                      required
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Source Material (Optional)</label>
                    <div className="flex flex-col md:flex-row gap-4">
                      {savedChapters.length > 0 && (
                        <select
                          value={notebookSelectedChapterId}
                          onChange={(e) => {
                            setNotebookSelectedChapterId(e.target.value);
                            if (e.target.value !== "custom") {
                              const chapter = savedChapters.find(c => c.id === e.target.value);
                              if (chapter && !notebookTopic) setNotebookTopic(chapter.data.chapterName);
                            }
                          }}
                          className="w-full md:w-1/3 px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
                        >
                          <option value="custom">No saved chapter</option>
                          {savedChapters.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.data.subject} - {c.data.chapterName}
                            </option>
                          ))}
                        </select>
                      )}
                      <div className="flex-1">
                        <label className="flex items-center justify-center w-full px-4 py-2.5 rounded-lg border border-dashed border-white/20 hover:border-indigo-400/50 bg-slate-900/40 hover:bg-indigo-500/10 cursor-pointer transition-colors text-sm text-slate-300">
                          <span className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            {notebookFileBase64 ? 'File selected' : 'Upload PDF / Image'}
                          </span>
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg, application/pdf"
                            onChange={handleNotebookFileUpload}
                            className="hidden" 
                          />
                        </label>
                      </div>
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Custom Instructions (Optional)</label>
                    <textarea
                      id="input_notebook_custom_instructions"
                      value={notebookInlineInstructions}
                      onChange={(e) => setNotebookInlineInstructions(e.target.value)}
                      placeholder="e.g. Highlight key terms in bold, include bulleted summary points, use simple clear language"
                      rows={2}
                      className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500 resize-none"
                    />
                  </div>
                </div>

                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={loading || !notebookTopic.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white font-medium text-sm px-6 py-2.5 rounded-xl transition-colors flex items-center gap-2 shadow-lg shadow-indigo-600/20"
                    id="btn_generate_notebook"
                  >
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate Notes"}
                  </button>
                </div>
              </form>
            </div>

            {notebookNotesResult && (
              <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg animate-fade-in relative" id="notebook_result_panel">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-white/10">
                  <div>
                    <h3 className="font-semibold text-white text-lg tracking-tight">{notebookNotesResult.topic}</h3>
                    <p className="text-xs text-indigo-300 font-mono mt-1">Generated Notes</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleCopy('notebook', notebookNotesResult.topic, notebookNotesResult, 'notebook_copy')}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Copy to clipboard"
                    >
                      {copiedStates['notebook_copy'] ? <Check className="w-4 h-4 text-green-400" /> : <Clipboard className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => handleExportToPDF({ type: 'notebook', title: notebookNotesResult.topic, data: notebookNotesResult })}
                      className="px-3 py-1.5 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Export to PDF"
                      id="btn_notebook_export_pdf"
                    >
                      <FileText className="w-3.5 h-3.5 text-rose-400" />
                      <span>PDF</span>
                    </button>
                    <button
                      onClick={() => handleExportToWord({ type: 'notebook', title: notebookNotesResult.topic, data: notebookNotesResult })}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Download Word Doc"
                    >
                      <FileDown className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => window.print()}
                      className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                      title="Print / Save PDF"
                    >
                      <Printer className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => triggerSave('notebook', notebookNotesResult.topic, notebookNotesResult, 'notebook')}
                      className="bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 px-4 py-2 rounded-xl text-sm font-semibold transition-all flex items-center gap-2"
                      id="btn_save_notebook"
                    >
                      {saveSuccess['notebook'] ? <Check className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                      <span>Save Notes</span>
                    </button>
                  </div>
                </div>
                
                <div className="space-y-6">
                  {notebookNotesResult.summary && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                      <p className="text-sm text-indigo-100 leading-relaxed italic">{notebookNotesResult.summary}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {notebookNotesResult.sections?.map((section: any, idx: number) => (
                      <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-xl p-5">
                        <h4 className="text-md font-bold text-white mb-3 flex items-center gap-2">
                          <span className="text-indigo-400 font-mono text-xs">{idx + 1}.</span> {section.heading}
                        </h4>
                        <ul className="space-y-2 pl-6 list-disc marker:text-slate-500">
                          {section.points?.map((point: string, i: number) => (
                            <li key={i} className="text-sm text-slate-300 leading-relaxed">{point}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>

                  {notebookNotesResult.keyTerms && notebookNotesResult.keyTerms.length > 0 && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <h4 className="font-bold text-white mb-4">Key Terms</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {notebookNotesResult.keyTerms.map((item: any, i: number) => (
                          <div key={i} className="bg-slate-900/40 border border-white/5 p-3 rounded-lg flex flex-col gap-1">
                            <span className="text-xs font-mono font-semibold text-emerald-400">{item.term}</span>
                            <span className="text-xs text-slate-300">{item.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

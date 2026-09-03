import React, { useState } from "react";
import Markdown from "react-markdown";
import { 
  Trash2, Eye, FileText, Calendar, Award, BookOpen, Layers, 
  X, Check, Clipboard, Printer, FileDown, Presentation as PresentationIcon, Video, Sparkles, ExternalLink, RefreshCw, Copy,
  Trophy, Play, Edit3, Save, Plus, ArrowLeft, ShieldCheck, Download
} from "lucide-react";
import { SavedItem, Quiz, StudyPlan, LessonPlan, Worksheet, QuestionPaper, RevisionMaterial, Presentation as PresentationType, YouTubeRecommendationResult } from "../types";
import { compileClipboardText, handleExportToWord, handleExportToPDF, handleExportToPPTX, handleExportTeacherAnswerKeyPDF, handleExportTeacherAnswerKeyWord } from "../utils/exportUtils";
import { createGoogleSlideDeck, openGoogleSlidesWebUrl } from "../utils/googleSlidesService";
import SlideGraphicRenderer from "./SlideGraphicRenderer";

interface SavedMaterialsProps {
  items: SavedItem[];
  onDelete: (id: string) => void;
  onDuplicate?: (item: SavedItem) => void;
  onUpdateItem?: (id: string, updatedData: any, updatedTitle?: string) => void;
  onConductQuiz?: (quizData: any) => void;
  onCreatePPTFromMaterials?: (materialIds: string[]) => void;
  onCreateYouTubeFromMaterials?: (materialIds: string[]) => void;
}

export default function SavedMaterials({ 
  items, 
  onDelete,
  onDuplicate,
  onUpdateItem,
  onConductQuiz,
  onCreatePPTFromMaterials,
  onCreateYouTubeFromMaterials 
}: SavedMaterialsProps) {
  const [filterType, setFilterType] = useState<string>("all");
  const [selectedItem, setSelectedItem] = useState<SavedItem | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [showOriginal, setShowOriginal] = useState<boolean>(false);
  const [modalGSlidesLoading, setModalGSlidesLoading] = useState<boolean>(false);
  const [modalGSlidesUrl, setModalGSlidesUrl] = useState<string | null>(null);
  const [modalGSlidesError, setModalGSlidesError] = useState<string | null>(null);
  
  // In-modal Quiz editing state
  const [isEditingQuizInModal, setIsEditingQuizInModal] = useState<boolean>(false);
  const [editedQuizData, setEditedQuizData] = useState<any | null>(null);
  const [quizSaveSuccess, setQuizSaveSuccess] = useState<boolean>(false);

  const handleModalExportGoogleSlides = async (presentationData: PresentationType) => {
    setModalGSlidesLoading(true);
    setModalGSlidesError(null);
    try {
      const res = await createGoogleSlideDeck(presentationData);
      setModalGSlidesUrl(res.presentationUrl);
    } catch (err: any) {
      console.error("Modal Google Slides error:", err);
      setModalGSlidesError(err.message || "Could not export to Google Slides.");
    } finally {
      setModalGSlidesLoading(false);
    }
  };

  const filteredItems = filterType === "all" 
    ? items 
    : items.filter(item => item.type === filterType || (filterType === "youtube-script" && (item.type === "youtube-recommendation" || item.type === "youtube-script")));

  const handleCopyText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getTypeLabel = (type: SavedItem['type']) => {
    switch (type) {
      case 'quiz': return { label: 'Quiz', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
      case 'study-plan': return { label: 'Study Plan', color: 'bg-blue-500/10 text-blue-300 border-blue-500/20' };
      case 'lesson-plan': return { label: 'Lesson Plan', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
      case 'worksheet': return { label: 'Worksheet', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
      case 'question-paper': return { label: 'Exam Paper', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' };
      case 'revision': return { label: 'Revision Sheet', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
      case 'scanned-chapter': return { label: 'Scanned Chapter', color: 'bg-cyan-500/10 text-cyan-300 border-cyan-500/20' };
      case 'notebook': return { label: 'Notebook Notes', color: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
      case 'slip-test': return { label: 'Slip Test', color: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
      case 'presentation': return { label: 'PPT Deck', color: 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20' };
      case 'ppt-prompt': return { label: 'PPT AI Prompt', color: 'bg-purple-500/10 text-purple-300 border-purple-500/20' };
      case 'class-quiz': return { label: 'Class Team Quiz', color: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
      case 'exam-study-plan': return { label: 'Exam Study Plan', color: 'bg-teal-500/10 text-teal-300 border-teal-500/20' };
      case 'youtube-script': return { label: 'YouTube Script', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
      case 'youtube-recommendation': return { label: 'YouTube Videos', color: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
      default: return { label: 'Material', color: 'bg-white/10 text-slate-200 border-white/10' };
    }
  };


  const handleExportCSV = () => {
    if (filteredItems.length === 0) return;

    const headers = ["Title", "Type", "Date", "Content"];
    
    const escapeCSV = (field: string) => {
      if (field === null || field === undefined) return '""';
      const str = String(field);
      if (str.includes(',') || str.includes('"') || str.includes('\n')) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    const rows = filteredItems.map(item => {
      const typeLabel = getTypeLabel(item.type).label;
      const content = compileClipboardText(item);
      
      return [
        escapeCSV(item.title),
        escapeCSV(typeLabel),
        escapeCSV(new Date(item.date).toLocaleDateString()),
        escapeCSV(content)
      ].join(',');
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `exported_materials_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-2" id="saved_materials_dashboard">
      
      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-white/10 pb-4 mb-6" id="saved_filters_bar">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mr-2">Filter Library:</span>
        <button
          id="filter_btn_all"
          onClick={() => setFilterType("all")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "all" ? "bg-indigo-600 border-indigo-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          All Materials
        </button>
        <button
          id="filter_btn_quiz"
          onClick={() => setFilterType("quiz")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "quiz" ? "bg-green-600 border-green-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Quizzes
        </button>
        <button
          id="filter_btn_planner"
          onClick={() => setFilterType("study-plan")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "study-plan" ? "bg-blue-600 border-blue-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Study Plans
        </button>
        <button
          id="filter_btn_lessons"
          onClick={() => setFilterType("lesson-plan")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "lesson-plan" ? "bg-indigo-600 border-indigo-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Lesson Plans
        </button>
        <button
          id="filter_btn_worksheets"
          onClick={() => setFilterType("worksheet")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "worksheet" ? "bg-amber-600 border-amber-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Worksheets
        </button>
        <button
          id="filter_btn_exams"
          onClick={() => setFilterType("question-paper")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "question-paper" ? "bg-purple-600 border-purple-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Exam Papers
        </button>
        <button
          id="filter_btn_revision"
          onClick={() => setFilterType("revision")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "revision" ? "bg-rose-600 border-rose-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Revision
        </button>
        <button
          id="filter_btn_chapters"
          onClick={() => setFilterType("scanned-chapter")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "scanned-chapter" ? "bg-cyan-600 border-cyan-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Chapters
        </button>
        <button
          id="filter_btn_sliptest"
          onClick={() => setFilterType("slip-test")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "slip-test" ? "bg-emerald-600 border-emerald-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Slip Tests
        </button>
        <button
          id="filter_btn_presentation"
          onClick={() => setFilterType("presentation")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "presentation" ? "bg-indigo-600 border-indigo-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          PPT Decks
        </button>
        <button
          id="filter_btn_ppt_prompt"
          onClick={() => setFilterType("ppt-prompt")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "ppt-prompt" ? "bg-purple-600 border-purple-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          PPT Prompts
        </button>
        <button
          id="filter_btn_classquiz"
          onClick={() => setFilterType("class-quiz")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "class-quiz" ? "bg-amber-600 border-amber-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Class Quizzes
        </button>
        <button
          id="filter_btn_exam_study_plan"
          onClick={() => setFilterType("exam-study-plan")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "exam-study-plan" ? "bg-teal-600 border-teal-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          Study Plans
        </button>
        <button
          id="filter_btn_youtube"
          onClick={() => setFilterType("youtube-script")}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-full border transition-colors ${filterType === "youtube-script" ? "bg-rose-600 border-rose-600 text-white" : "border-white/10 text-slate-300 hover:bg-white/5 hover:text-white bg-white/5"}`}
        >
          YouTube Scripts
        </button>
        <div className="flex-grow"></div>
        <button
          id="btn_export_csv"
          onClick={handleExportCSV}
          disabled={filteredItems.length === 0}
          className="ml-auto flex items-center gap-2 px-4 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/20 rounded-lg text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          title="Export current view to CSV"
        >
          <FileDown className="w-4 h-4" />
          <span>Export CSV</span>
        </button>
      </div>

      {/* Library Grid */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-12 bg-white/5 backdrop-blur-md rounded-2xl border border-dashed border-white/10" id="empty_saved_box">
          <FileText className="w-8 h-8 text-slate-400 mb-2" />
          <h3 className="font-semibold text-white">No Materials Found</h3>
          <p className="text-xs text-slate-400 mt-0.5">Generate and click "Save" on Student or Teacher tools to see them here.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" id="saved_items_grid">
          {filteredItems.map((item) => {
            const badge = getTypeLabel(item.type);
            return (
              <div 
                key={item.id} 
                className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-5 shadow-lg hover:shadow-xl hover:bg-white/10 transition-all duration-200 flex flex-col justify-between"
                id={`saved_card_${item.id}`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${badge.color}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-400">{item.date}</span>
                  </div>
                  <h3 className="font-bold text-white text-sm md:text-base leading-snug line-clamp-2">
                    {item.title}
                  </h3>
                </div>

                <div className="flex items-center justify-end flex-wrap gap-1.5 mt-5 pt-3 border-t border-white/5">
                  {item.type === "class-quiz" && onConductQuiz && (
                    <button
                      onClick={() => onConductQuiz(item.data)}
                      className="px-2.5 py-1.5 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white border border-amber-400/40 text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-sm"
                      title="Launch live interactive classroom quiz with teams & captains"
                      id={`btn_card_conduct_quiz_${item.id}`}
                    >
                      <Play className="w-3 h-3 text-white fill-white" />
                      <span>Conduct Quiz</span>
                    </button>
                  )}

                  {item.type === "class-quiz" && (
                    <button
                      onClick={() => handleExportTeacherAnswerKeyPDF(item.data)}
                      className="px-2 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                      title="Export confidential Teacher Answer Key PDF"
                      id={`btn_card_key_pdf_${item.id}`}
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      <span className="hidden sm:inline">Answer Key</span>
                    </button>
                  )}

                  {onCreatePPTFromMaterials && (
                    <button
                      onClick={() => onCreatePPTFromMaterials([item.id])}
                      className="px-2.5 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                      title="Generate PPT Presentation from this material"
                      id={`btn_card_ppt_${item.id}`}
                    >
                      <PresentationIcon className="w-3 h-3 text-indigo-400" />
                      <span>Make PPT</span>
                    </button>
                  )}

                  {onCreateYouTubeFromMaterials && (
                    <button
                      onClick={() => onCreateYouTubeFromMaterials([item.id])}
                      className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1"
                      title="Generate YouTube Video Script from this material"
                      id={`btn_card_yt_${item.id}`}
                    >
                      <Video className="w-3 h-3 text-rose-400" />
                      <span>YouTube</span>
                    </button>
                  )}

                  {onDuplicate && (
                    <button
                      onClick={() => onDuplicate(item)}
                      className="p-1.5 text-slate-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-lg transition-colors"
                      title="Duplicate this item"
                      id={`btn_duplicate_${item.id}`}
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onDelete(item.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors ml-auto"
                    title="Delete item"
                    id={`btn_delete_${item.id}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => {
                      setSelectedItem(item);
                      setShowOriginal(false);
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                    id={`btn_view_${item.id}`}
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Open</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* EXPANDED MODAL POPUP */}
      {selectedItem && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-fade-in" id="expanded_modal">
          <div className="bg-[#131a2c]/95 backdrop-blur-xl rounded-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl border border-white/10 text-white">
            {/* Modal Header */}
            <div className="p-5 border-b border-white/10 bg-white/5 flex items-center justify-between">
              <div>
                <span className={`px-2 py-0.5 text-xs font-bold rounded uppercase border tracking-wider ${getTypeLabel(selectedItem.type).color}`}>
                  {getTypeLabel(selectedItem.type).label}
                </span>
                <h3 className="font-bold text-white text-base md:text-lg mt-1">{selectedItem.title}</h3>
              </div>
              <div className="flex items-center gap-2">
                {onDuplicate && (
                  <button
                    onClick={() => {
                      onDuplicate(selectedItem);
                    }}
                    className="px-2.5 py-2 border border-indigo-500/30 hover:bg-indigo-500/20 rounded-lg text-indigo-200 bg-indigo-500/10 transition-all flex items-center gap-1 text-xs font-semibold"
                    title="Duplicate this item"
                    id="btn_modal_duplicate"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Duplicate</span>
                  </button>
                )}
                <button
                  onClick={() => handleExportToWord(selectedItem)}
                  className="p-2 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5"
                  title="Export to Word"
                  id="btn_modal_export_word"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleCopyText(compileClipboardText(selectedItem))}
                  className="p-2 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5"
                  title="Copy content to clipboard"
                  id="btn_modal_copy"
                >
                  {copied ? <Check className="w-4 h-4 text-green-400" /> : <Clipboard className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => handleExportToPDF(selectedItem)}
                  className="px-3 py-2 border border-rose-500/30 hover:bg-rose-500/20 rounded-lg text-rose-200 bg-rose-500/10 transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="Export to PDF"
                  id="btn_modal_export_pdf"
                >
                  <FileText className="w-4 h-4 text-rose-400" />
                  <span>PDF</span>
                </button>
                <button
                  onClick={() => handleExportToWord(selectedItem)}
                  className="p-2 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5"
                  title="Download Word Doc"
                >
                  <FileDown className="w-4 h-4" />
                </button>
                <button
                  onClick={() => window.print()}
                  className="p-2 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white bg-white/5 transition-all flex items-center gap-1.5"
                  title="Print Document"
                >
                  <Printer className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setSelectedItem(null)}
                  className="p-2 border border-white/10 hover:bg-white/10 rounded-lg text-slate-300 hover:text-white bg-white/5 transition-all ml-2"
                  id="btn_modal_close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Scrollable Content Panel */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6" id="modal_scrollable_panel">
              
              {/* QUIZ RENDER */}
              {selectedItem.type === "quiz" && (
                <div className="space-y-4" id="modal_render_quiz">
                  {(selectedItem.data as Quiz).questions.map((q, idx) => (
                    <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 space-y-2">
                      <p className="font-semibold text-white text-sm">Q{idx+1}: {q.question}</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5 pl-4 text-xs text-slate-300">
                        {q.options.map((opt, oIdx) => (
                          <div key={oIdx} className={`p-2 rounded border ${oIdx === q.correctIndex ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-200 font-semibold' : 'bg-slate-900/50 border-white/5'}`}>
                            {["A","B","C","D"][oIdx]}. {opt}
                          </div>
                        ))}
                      </div>
                      <div className="mt-2 text-xs bg-indigo-500/10 text-indigo-200 p-2.5 rounded border border-indigo-500/20">
                        <strong>Explanation:</strong> {q.explanation}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* STUDY PLAN RENDER */}
              {selectedItem.type === "study-plan" && (
                <div className="space-y-4" id="modal_render_planner">
                  <div className="p-4 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-sm">
                    <strong>Strategy Summary:</strong>
                    <p className="text-slate-200 mt-1 leading-relaxed">{(selectedItem.data as StudyPlan).overview}</p>
                  </div>
                  <div className="space-y-2">
                    <strong className="text-sm text-white block">7-Day Schedule:</strong>
                    <div className="overflow-x-auto rounded-lg border border-white/10">
                      <table className="w-full text-left border-collapse text-xs md:text-sm">
                        <thead>
                          <tr className="bg-white/5 border-b border-white/10 font-semibold text-slate-300">
                            <th className="p-3">Day</th>
                            <th className="p-3">Focus Topics</th>
                            <th className="p-3">Time</th>
                            <th className="p-3">Guideline</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 text-slate-200">
                          {(selectedItem.data as StudyPlan).schedule.map((s, idx) => (
                            <tr key={idx} className="hover:bg-white/5 transition-colors">
                              <td className="p-3 font-bold text-indigo-300">{s.day}</td>
                              <td className="p-3">{s.topics.join(', ')}</td>
                              <td className="p-3 text-indigo-200 font-semibold">{s.duration}</td>
                              <td className="p-3 text-slate-400 text-xs">{s.notes}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <div className="space-y-1.5 pt-2">
                    <strong className="text-sm text-white block">Strategic tips:</strong>
                    <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-200 pl-2">
                      {(selectedItem.data as StudyPlan).tips.map((t, idx) => <li key={idx}>{t}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {/* LESSON PLAN RENDER */}
              {selectedItem.type === "lesson-plan" && (
                <div className="space-y-4" id="modal_render_lessons">
                  <p className="text-xs text-slate-400 font-mono">Grade: {(selectedItem.data as LessonPlan).grade} | Duration: {(selectedItem.data as LessonPlan).duration}</p>
                    
                  {(selectedItem.data as LessonPlan).objectives && (
                    <div className="space-y-1.5">
                      <strong className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Objectives:</strong>
                      <ul className="list-disc list-inside text-sm text-slate-200 pl-2">
                        {(selectedItem.data as LessonPlan).objectives?.map((o, idx) => <li key={idx}>{o}</li>)}
                      </ul>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <strong className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Materials Required:</strong>
                    <p className="text-sm text-slate-200">{(selectedItem.data as LessonPlan).materials.join(', ')}</p>
                  </div>

                  {(selectedItem.data as LessonPlan).days ? (
                    <div className="space-y-6 pt-2">
                      <strong className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Unit Plan Breakdown:</strong>
                      {(selectedItem.data as LessonPlan).days?.map((day, dIdx) => (
                        <div key={dIdx} className="bg-slate-900/40 p-4 rounded-xl border border-white/10 space-y-3">
                          <h4 className="font-bold text-md text-indigo-400">{day.day}: {day.topic}</h4>
                          {day.objectives && (
                            <div className="space-y-1 text-sm text-slate-200">
                              <strong>Objectives:</strong> {day.objectives.join(' | ')}
                            </div>
                          )}
                          <div className="border border-white/10 rounded-lg overflow-hidden text-xs md:text-sm">
                            <div className="grid grid-cols-3 bg-white/5 border-b border-white/10 p-2 font-semibold text-slate-300">
                              <div>Time</div>
                              <div>Segment</div>
                              <div>Action Details</div>
                            </div>
                            {day.outline?.map((o, idx) => (
                              <div key={idx} className="grid grid-cols-3 p-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                                <div className="font-bold text-indigo-300">{o.time}</div>
                                <div className="font-semibold text-white">{o.section}</div>
                                <div className="text-slate-300 leading-relaxed text-xs">{o.activity}</div>
                              </div>
                            ))}
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                            {day.assessment && (
                              <div>
                                <strong className="block text-xs font-bold text-slate-400 uppercase mb-1">Assessment:</strong>
                                <p className="text-slate-300 text-xs leading-relaxed">{day.assessment}</p>
                              </div>
                            )}
                            {day.homework && (
                              <div>
                                <strong className="block text-xs font-bold text-slate-400 uppercase mb-1">Homework:</strong>
                                <p className="text-slate-300 text-xs leading-relaxed">{day.homework}</p>
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <>
                      <div className="space-y-2">
                        <strong className="text-xs font-bold text-slate-400 uppercase tracking-wider block">Timed Outline:</strong>
                        <div className="border border-white/10 rounded-lg overflow-hidden text-xs md:text-sm">
                          <div className="grid grid-cols-3 bg-white/5 border-b border-white/10 p-2 font-semibold text-slate-300">
                            <div>Time</div>
                            <div>Segment</div>
                            <div>Action Details</div>
                          </div>
                          {(selectedItem.data as LessonPlan).outline?.map((o, idx) => (
                            <div key={idx} className="grid grid-cols-3 p-2.5 border-b border-white/5 last:border-b-0 hover:bg-white/5 transition-colors">
                              <div className="font-bold text-indigo-300">{o.time}</div>
                              <div className="font-semibold text-white">{o.section}</div>
                              <div className="text-slate-300 leading-relaxed text-xs">{o.activity}</div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 text-sm">
                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <strong className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Assessment:</strong>
                          <p className="text-slate-300">{(selectedItem.data as LessonPlan).assessment}</p>
                        </div>
                        <div className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <strong className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Homework:</strong>
                          <p className="text-slate-300">{(selectedItem.data as LessonPlan).homework}</p>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* WORKSHEET RENDER */}
              {selectedItem.type === "worksheet" && (
                <div className="space-y-4" id="modal_render_worksheets">
                  <p className="text-sm italic text-slate-200 bg-white/5 p-3 rounded border border-white/10">{(selectedItem.data as Worksheet).instructions}</p>
                  <div className="space-y-3">
                    <strong className="text-sm text-white block border-b border-white/10 pb-1">Questions:</strong>
                    {(selectedItem.data as Worksheet).questions.map((q, idx) => (
                      <p key={idx} className="text-sm text-slate-200 pl-2 border-l-2 border-indigo-500 py-0.5"><strong className="text-indigo-300 mr-1">{idx+1}.</strong> {q}</p>
                    ))}
                  </div>
                  <div className="space-y-2 pt-3 border-t border-white/10">
                    <strong className="text-sm text-indigo-400 block">Solutions:</strong>
                    {(selectedItem.data as Worksheet).solutions.map((s, idx) => (
                      <div key={idx} className="text-xs md:text-sm bg-white/5 p-2.5 rounded border border-white/10">
                        <strong className="text-indigo-300 block mb-0.5">Solution {idx+1}:</strong>
                        <p className="text-slate-300 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* EXAM PAPER RENDER */}
              {selectedItem.type === "question-paper" && (
                <div className="space-y-6" id="modal_render_exams">
                  <p className="text-xs text-slate-400 font-mono">Total Marks: {(selectedItem.data as QuestionPaper).totalMarks} Marks</p>
                  <p className="text-sm italic text-slate-200 bg-white/5 p-3 rounded border border-white/10">{(selectedItem.data as QuestionPaper).instructions}</p>
                  
                  {/* Sections list */}
                  {(selectedItem.data as QuestionPaper).sections.map((section, sIdx) => (
                    <div key={sIdx} className="space-y-3">
                      <h4 className="font-bold text-xs bg-white/10 py-1 px-2 text-white rounded tracking-wider uppercase border border-white/5">{section.sectionName}</h4>
                      <div className="space-y-2">
                        {section.questions.map((q, qIdx) => (
                          <div key={qIdx} className="flex justify-between text-sm leading-relaxed text-slate-200">
                            <div><strong className="text-slate-500 mr-1">{qIdx+1}.</strong> {q.questionText}</div>
                            <span className="text-xs font-bold text-indigo-300 pl-4">[{q.marks}]</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                  {/* Solutions list */}
                  <div className="space-y-3 pt-4 border-t border-white/10">
                    <strong className="text-sm text-indigo-400 block">Answers & Solutions Guide:</strong>
                    <div className="space-y-3 text-xs md:text-sm">
                      {(selectedItem.data as QuestionPaper).answerKey.map((key, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg">
                          <strong className="text-indigo-300 block mb-1">Question {key.questionNumber} Answer:</strong>
                          <p className="text-slate-300 leading-relaxed whitespace-pre-wrap">{key.answerText}</p>
                          <p className="text-xs text-indigo-200 font-medium mt-1">Rubric: {key.markingCriteria}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SLIP TEST RENDER */}
              {selectedItem.type === "slip-test" && (
                <div className="space-y-6" id="modal_render_slip_test">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-white/5 p-3 rounded-lg border border-white/10 gap-2">
                    <span><strong>Grade:</strong> {selectedItem.data.grade}</span>
                    <span><strong>Duration:</strong> {selectedItem.data.duration}</span>
                    <span><strong>Total Marks:</strong> {selectedItem.data.totalMarks}</span>
                  </div>
                  <p className="text-sm italic text-slate-200 bg-white/5 p-3 rounded border border-white/10">{selectedItem.data.instructions}</p>
                  
                  <div className="space-y-3">
                    <h4 className="font-bold text-xs bg-white/10 py-1 px-2 text-white rounded tracking-wider uppercase border border-white/5">Questions</h4>
                    <div className="space-y-3">
                      {selectedItem.data.questions?.map((q: any, idx: number) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm text-slate-200">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="font-bold text-slate-400 mr-2">{q.questionNumber || `Q${idx+1}`}.</span>
                              <span>{q.questionText}</span>
                            </div>
                            <span className="text-xs font-bold text-indigo-300 shrink-0">[{q.marks}]</span>
                          </div>
                          {q.options && q.options.length > 0 && (
                            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pl-4">
                              {q.options.map((opt: string, oIdx: number) => (
                                <div key={oIdx} className="bg-white/5 p-1.5 rounded border border-white/5">
                                  {String.fromCharCode(65 + oIdx)}. {opt}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Answer Key */}
                  {selectedItem.data.answerKey && selectedItem.data.answerKey.length > 0 && (
                    <div className="space-y-3 pt-4 border-t border-white/10">
                      <strong className="text-sm text-emerald-400 block">Answer Key & Marking Criteria:</strong>
                      <div className="space-y-2 text-xs md:text-sm">
                        {selectedItem.data.answerKey.map((key: any, idx: number) => (
                          <div key={idx} className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                            <strong className="text-emerald-300 block mb-1">{key.questionNumber}:</strong>
                            <p className="text-slate-200 font-medium">{key.answerText}</p>
                            <p className="text-xs text-emerald-200 mt-1 font-mono">Criteria: {key.markingCriteria}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* REVISION SHEET RENDER */}
              {selectedItem.type === "revision" && (
                <div className="space-y-6" id="modal_render_revision">
                  {/* Quick Notes */}
                  <div className="space-y-2">
                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">📝 Key Concepts</h4>
                    <ul className="space-y-1.5 list-disc list-inside text-sm text-slate-200 pl-2">
                      {(selectedItem.data as RevisionMaterial).quickNotes.map((note, idx) => (
                        <li key={idx}>{note}</li>
                      ))}
                    </ul>
                  </div>

                  {/* Essential Terms */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">🔑 Key Terms & Formulas</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {(selectedItem.data as RevisionMaterial).formulasOrTerms.map((item, idx) => (
                        <div key={idx} className="p-3 bg-white/5 border border-white/10 rounded-lg text-sm">
                          <strong className="text-indigo-300 block mb-1">{item.term}</strong>
                          <span className="text-slate-300">{item.definitionOrFormula}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Common Mistakes */}
                  <div className="space-y-2 pt-2">
                    <h4 className="font-semibold text-rose-300 text-sm flex items-center gap-2">⚠️ Common Mistakes to Avoid</h4>
                    <ul className="space-y-2 bg-rose-500/10 p-4 rounded-xl border border-rose-500/20">
                      {(selectedItem.data as RevisionMaterial).commonMistakes.map((mistake, idx) => (
                        <li key={idx} className="text-xs md:text-sm text-rose-200 flex items-start gap-2">
                          <span className="font-bold">({idx + 1})</span>
                          <span>{mistake}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Sample questions */}
                  <div className="space-y-3 pt-2">
                    <h4 className="font-semibold text-white text-sm flex items-center gap-2">🔮 Likely Exam Questions</h4>
                    <div className="space-y-3">
                      {(selectedItem.data as RevisionMaterial).likelyQuestions.map((q, idx) => (
                        <div key={idx} className="p-3 border border-white/10 rounded-lg bg-white/5">
                          <p className="text-sm font-semibold text-white mb-1">Q{idx + 1}: {q.question}</p>
                          <p className="text-xs text-slate-300"><strong className="text-indigo-300 font-medium">Answer Guide:</strong> {q.answerHint}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SCANNED CHAPTER RENDER */}
              {selectedItem.type === "scanned-chapter" && (
                <div className="space-y-4" id="modal_render_scanned_chapter">
                  {selectedItem.data.originalFile && (
                    <div className="flex bg-slate-900/50 p-1 rounded-lg border border-white/5 w-fit">
                      <button
                        onClick={() => setShowOriginal(false)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${!showOriginal ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                        Extracted Text
                      </button>
                      <button
                        onClick={() => setShowOriginal(true)}
                        className={`px-4 py-1.5 rounded-md text-xs font-semibold transition-all ${showOriginal ? 'bg-indigo-500 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                      >
                        Original File
                      </button>
                    </div>
                  )}

                  <div className="bg-white/5 border border-white/10 rounded-xl p-4 md:p-6 shadow-inner min-h-[400px]">
                    {!showOriginal ? (
                      <div className="prose prose-invert max-w-none text-sm text-slate-300 leading-relaxed font-sans">
                        <Markdown>{selectedItem.data.content}</Markdown>
                      </div>
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center">
                        {selectedItem.data.originalFile?.mimeType === 'application/pdf' ? (
                          <iframe 
                            src={selectedItem.data.originalFile.data} 
                            className="w-full h-[600px] rounded-lg border border-white/10 bg-white"
                            title="Original Scanned PDF"
                          />
                        ) : (
                          <img 
                            src={selectedItem.data.originalFile?.data} 
                            alt="Original Scanned Document" 
                            className="max-w-full max-h-[600px] rounded-lg border border-white/10 object-contain"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* NOTEBOOK NOTES RENDER */}
              {selectedItem.type === "notebook" && (
                <div className="space-y-6" id="modal_render_notebook">
                  {selectedItem.data.summary && (
                    <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4">
                      <p className="text-sm text-indigo-100 leading-relaxed italic">{selectedItem.data.summary}</p>
                    </div>
                  )}

                  <div className="space-y-6">
                    {selectedItem.data.sections?.map((section: any, idx: number) => (
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

                  {selectedItem.data.keyTerms && selectedItem.data.keyTerms.length > 0 && (
                    <div className="mt-8 border-t border-white/10 pt-6">
                      <h4 className="font-bold text-white mb-4">Key Terms</h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {selectedItem.data.keyTerms.map((item: any, i: number) => (
                          <div key={i} className="bg-slate-900/40 border border-white/5 p-3 rounded-lg flex flex-col gap-1">
                            <span className="text-xs font-mono font-semibold text-emerald-400">{item.term}</span>
                            <span className="text-xs text-slate-300">{item.definition}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* PRESENTATION DECK RENDER */}
              {selectedItem.type === "presentation" && (
                <div className="space-y-6" id="modal_render_presentation">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-indigo-500/10 p-3.5 rounded-xl border border-indigo-500/20 gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <span><strong>Audience:</strong> {(selectedItem.data as PresentationType).targetAudience || 'Students'}</span>
                      <span><strong>Slide Count:</strong> {(selectedItem.data as PresentationType).slides?.length || 0} Slides</span>
                      <span><strong>Style:</strong> {(selectedItem.data as PresentationType).theme || 'Modern Academic'}</span>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleExportToPPTX(selectedItem.data as PresentationType)}
                        className="px-3.5 py-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all shrink-0"
                      >
                        <PresentationIcon className="w-4 h-4 text-orange-200" />
                        <span>Download PowerPoint (.pptx)</span>
                        <FileDown className="w-3.5 h-3.5 text-orange-200" />
                      </button>

                      <button
                        onClick={() => handleModalExportGoogleSlides(selectedItem.data as PresentationType)}
                        disabled={modalGSlidesLoading}
                        className="px-3.5 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-amber-500/20 transition-all shrink-0 disabled:opacity-50"
                      >
                        {modalGSlidesLoading ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-slate-950" />
                            <span>Creating in Google Slides...</span>
                          </>
                        ) : (
                          <>
                            <PresentationIcon className="w-4 h-4 text-slate-950" />
                            <span>Export to Google Slides</span>
                            <ExternalLink className="w-3 h-3 text-slate-800" />
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {modalGSlidesUrl && (
                    <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex items-center justify-between gap-2">
                      <span>✨ Successfully created in Google Slides!</span>
                      <a
                        href={modalGSlidesUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs flex items-center gap-1"
                      >
                        Open Slides ↗
                      </a>
                    </div>
                  )}

                  {modalGSlidesError && (
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in">
                      <div className="flex items-center gap-2">
                        <span className="text-base">💡</span>
                        <span>{modalGSlidesError}</span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleExportToPPTX(selectedItem.data as PresentationType)}
                          className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/40 rounded-lg text-xs font-medium transition-colors"
                        >
                          Download .pptx Instead
                        </button>
                        <button
                          onClick={() => setModalGSlidesError(null)}
                          className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
                          title="Dismiss"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    {(selectedItem.data as PresentationType).slides?.map((slide, idx) => (
                      <div key={idx} className="p-5 rounded-xl bg-slate-900/80 border border-white/10 space-y-3">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="text-xs font-mono font-bold px-2.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                            Slide {slide.slideNumber}
                          </span>
                          {slide.keyTakeaway && (
                            <span className="text-xs italic text-amber-300 opacity-90 truncate max-w-sm">
                              💡 {slide.keyTakeaway}
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                          <div className="md:col-span-7 space-y-2">
                            <h4 className="font-bold text-base text-white">{slide.title}</h4>
                            {slide.subtitle && <p className="text-xs text-indigo-200 font-medium">{slide.subtitle}</p>}

                            {slide.bulletPoints && slide.bulletPoints.length > 0 && (
                              <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 pl-1 pt-1">
                                {slide.bulletPoints.map((bp, bpIdx) => (
                                  <li key={bpIdx}>{bp}</li>
                                ))}
                              </ul>
                            )}
                          </div>

                          <div className="md:col-span-5 min-h-[200px]">
                            <SlideGraphicRenderer slide={slide} />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* YOUTUBE SCRIPT RENDER */}
              {selectedItem.type === "youtube-script" && (
                <div className="space-y-6" id="modal_render_youtube_script">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 gap-2">
                    <span><strong>Est. Duration:</strong> {(selectedItem.data as any).estimatedDuration || '3-5 minutes'}</span>
                    <span><strong>Audience:</strong> {(selectedItem.data as any).targetAudience || 'Students'}</span>
                  </div>

                  {(selectedItem.data as any).hook && (
                    <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-100">
                      <strong className="block text-amber-300 font-bold mb-1 uppercase tracking-wider">🔥 Opening Video Hook:</strong>
                      "{(selectedItem.data as any).hook}"
                    </div>
                  )}

                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Scene-by-Scene Storyboard</h4>
                    {(selectedItem.data as any).scenes?.map((scene: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-2 text-xs">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <span className="font-mono font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded">
                            Scene {scene.sceneNumber} ({scene.timestamp})
                          </span>
                          {scene.onScreenText && (
                            <span className="text-[10px] font-mono text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              Text: "{scene.onScreenText}"
                            </span>
                          )}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                          <div className="bg-slate-950 p-2.5 rounded border border-white/5 text-slate-300">
                            <strong className="block text-rose-300 text-[10px] uppercase">On-Screen B-Roll:</strong>
                            {scene.visualDescription}
                          </div>
                          <div className="bg-emerald-950/40 p-2.5 rounded border border-emerald-500/20 text-emerald-100 italic">
                            <strong className="block text-emerald-300 text-[10px] uppercase not-italic">Voiceover Dialogue:</strong>
                            "{scene.narration}"
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {(selectedItem.data as any).outroCallToAction && (
                    <div className="p-4 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-xs text-emerald-200">
                      <strong className="block font-bold text-emerald-400 mb-1 uppercase">📢 Outro Call To Action:</strong>
                      {(selectedItem.data as any).outroCallToAction}
                    </div>
                  )}
                </div>
              )}

              {/* YOUTUBE RECOMMENDATION RENDER */}
              {selectedItem.type === "youtube-recommendation" && (
                <div className="space-y-6" id="modal_render_youtube_recommendation">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-rose-500/10 p-3 rounded-xl border border-rose-500/20 gap-2">
                    <span><strong>Topic:</strong> {selectedItem.data.topic || selectedItem.title}</span>
                    <span><strong>Target Grade:</strong> {selectedItem.data.targetGrade || 'Students'}</span>
                  </div>

                  {selectedItem.data.overviewNote && (
                    <div className="p-4 rounded-xl bg-slate-900 border border-rose-500/30 text-xs text-rose-200">
                      <strong className="block text-rose-300 font-bold mb-1 uppercase tracking-wider">💡 Lesson Integration Strategy:</strong>
                      {selectedItem.data.overviewNote}
                    </div>
                  )}

                  <div className="space-y-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Curated Educational YouTube Videos</h4>
                    {selectedItem.data.videos?.map((vid: any, idx: number) => (
                      <div key={idx} className="p-4 rounded-xl bg-slate-900/80 border border-white/10 space-y-3 text-xs">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2">
                          <div>
                            <span className="font-mono font-bold text-rose-300 mr-2">📺 {vid.channelName}</span>
                            <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">⏱️ {vid.duration}</span>
                            <h5 className="font-bold text-white text-sm mt-1">{vid.videoTitle}</h5>
                          </div>
                          <a
                            href={
                              vid.youtubeUrl && vid.youtubeUrl.startsWith('http')
                                ? vid.youtubeUrl
                                : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${vid.videoTitle} ${vid.channelName}`)}`
                            }
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold rounded-xl text-xs self-start shrink-0 flex items-center gap-1.5 shadow-md transition-all"
                          >
                            <span>▶ Watch Video on YouTube</span>
                            <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                          </a>
                        </div>
                        <p className="text-slate-300 leading-relaxed">{vid.summary}</p>
                        <div className="p-2.5 bg-emerald-950/40 rounded border border-emerald-500/20 text-emerald-200 italic">
                          <strong>Why Recommended:</strong> "{vid.whyRecommended}"
                        </div>
                        {vid.keyTimestamps && vid.keyTimestamps.length > 0 && (
                          <div className="space-y-1 pt-1">
                            <strong className="text-slate-400 text-[10px] uppercase block">Timestamps & Chapters:</strong>
                            <div className="flex flex-wrap gap-1.5">
                              {vid.keyTimestamps.map((ts: any, tIdx: number) => (
                                <span key={tIdx} className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono text-[10px]">
                                  {ts.time}: {ts.topic}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        {vid.discussionQuestions && vid.discussionQuestions.length > 0 && (
                          <div className="space-y-1 pt-1 bg-amber-950/20 p-2.5 rounded border border-amber-500/20 text-amber-200">
                            <strong className="text-amber-300 text-[10px] uppercase block">Discussion Questions:</strong>
                            <ul className="list-disc list-inside space-y-1 text-xs">
                              {vid.discussionQuestions.map((q: string, qIdx: number) => (
                                <li key={qIdx}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PPT PROMPT RENDER */}
              {selectedItem.type === "ppt-prompt" && (
                <div className="space-y-6" id="modal_render_ppt_prompt">
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-purple-500/10 p-4 rounded-xl border border-purple-500/20 gap-3">
                    <div className="space-y-1">
                      <span className="font-bold text-purple-300 text-sm">{selectedItem.data.lessonTitle || selectedItem.title}</span>
                      <div className="flex flex-wrap gap-2 text-slate-400">
                        <span>Target AI: <strong className="text-white">{selectedItem.data.targetAi || 'AI Presentation Tool'}</strong></span>
                        <span>•</span>
                        <span>Grade: {selectedItem.data.grade || 'General'}</span>
                        <span>•</span>
                        <span>Subject: {selectedItem.data.subject || 'Curriculum'}</span>
                        <span>•</span>
                        <span>{selectedItem.data.slideCount || (selectedItem.data.slides ? selectedItem.data.slides.length : 0)} Slides</span>
                      </div>
                    </div>

                    <button
                      onClick={() => handleCopyText(selectedItem.data.dropInPrompt || '')}
                      className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all"
                    >
                      <Copy className="w-4 h-4" />
                      <span>{copied ? "Copied Prompt!" : "Copy Drop-in Prompt"}</span>
                    </button>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-purple-300">Drop-in AI Master Prompt</label>
                    <div className="p-4 bg-slate-900 border border-purple-500/30 rounded-xl text-xs font-mono text-purple-100 whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
                      {selectedItem.data.dropInPrompt}
                    </div>
                  </div>

                  {selectedItem.data.slides && selectedItem.data.slides.length > 0 && (
                    <div className="space-y-3">
                      <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Slide Structure Preview</h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {selectedItem.data.slides.map((s: any, idx: number) => (
                          <div key={idx} className="p-3.5 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                            <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                              <span className="font-bold text-purple-300">Slide {s.slideNumber}: {s.title}</span>
                            </div>
                            <ul className="list-disc list-inside space-y-1 text-slate-300">
                              {(s.bulletPoints || []).map((b: string, bIdx: number) => (
                                <li key={bIdx}>{b}</li>
                              ))}
                            </ul>
                            {s.visualDescription && (
                              <p className="text-slate-400 italic text-[11px] pt-1 border-t border-white/5">
                                🎨 <strong>Visual:</strong> {s.visualDescription}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* CLASS TEAM QUIZ RENDER */}
              {selectedItem.type === "class-quiz" && (
                <div className="space-y-6" id="modal_render_class_quiz">
                  {/* Top Action & Meta Bar */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-300 bg-amber-500/10 p-4 rounded-xl border border-amber-500/20 gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-amber-400" />
                        <h4 className="font-bold text-amber-300 text-sm">
                          {(isEditingQuizInModal && editedQuizData ? editedQuizData.quizTitle : selectedItem.data.quizTitle) || selectedItem.title}
                        </h4>
                      </div>
                      <div className="flex flex-wrap gap-2 text-slate-400">
                        <span>Chapter: <strong className="text-white">{(isEditingQuizInModal && editedQuizData ? editedQuizData.chapter : selectedItem.data.chapter)}</strong></span>
                        <span>•</span>
                        <span>Grade: {(isEditingQuizInModal && editedQuizData ? editedQuizData.grade : selectedItem.data.grade)}</span>
                        <span>•</span>
                        <span>Status: <strong className={(isEditingQuizInModal && editedQuizData ? editedQuizData.chapterCompleted : selectedItem.data.chapterCompleted) ? "text-emerald-400" : "text-amber-400"}>
                          {(isEditingQuizInModal && editedQuizData ? editedQuizData.chapterCompleted : selectedItem.data.chapterCompleted) ? "Completed ✓" : "In Progress"}
                        </strong></span>
                      </div>
                    </div>

                    {/* Action Buttons: Conduct Quiz & Export Keys & Edit */}
                    <div className="flex items-center flex-wrap gap-2">
                      {onConductQuiz && (
                        <button
                          onClick={() => {
                            const quizToRun = isEditingQuizInModal && editedQuizData ? editedQuizData : selectedItem.data;
                            setSelectedItem(null);
                            onConductQuiz(quizToRun);
                          }}
                          className="px-3.5 py-2 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                          title="Launch interactive game arena with team rosters & scoreboard"
                        >
                          <Play className="w-3.5 h-3.5 fill-white" />
                          <span>Conduct Quiz in Arena</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleExportTeacherAnswerKeyPDF(isEditingQuizInModal && editedQuizData ? editedQuizData : selectedItem.data)}
                        className="px-3 py-2 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-200 border border-emerald-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Export confidential Teacher Answer Key PDF"
                      >
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Teacher Key (PDF)</span>
                      </button>

                      <button
                        onClick={() => handleExportTeacherAnswerKeyWord(isEditingQuizInModal && editedQuizData ? editedQuizData : selectedItem.data)}
                        className="px-3 py-2 bg-blue-600/30 hover:bg-blue-600/50 text-blue-200 border border-blue-500/40 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm"
                        title="Export Teacher Answer Key Word Doc"
                      >
                        <Download className="w-3.5 h-3.5 text-blue-400" />
                        <span>Teacher Key (.DOC)</span>
                      </button>

                      <button
                        onClick={() => {
                          if (isEditingQuizInModal) {
                            setIsEditingQuizInModal(false);
                          } else {
                            setEditedQuizData(JSON.parse(JSON.stringify(selectedItem.data)));
                            setIsEditingQuizInModal(true);
                          }
                        }}
                        className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 border transition-all ${
                          isEditingQuizInModal
                            ? "bg-slate-700 border-slate-500 text-slate-200"
                            : "bg-indigo-600/30 hover:bg-indigo-600/50 border-indigo-500/40 text-indigo-200"
                        }`}
                      >
                        <Edit3 className="w-3.5 h-3.5 text-indigo-300" />
                        <span>{isEditingQuizInModal ? "Exit Edit Mode" : "Edit Quiz / Answers"}</span>
                      </button>
                    </div>
                  </div>

                  {/* Save feedback banner */}
                  {quizSaveSuccess && (
                    <div className="p-3 bg-emerald-500/20 border border-emerald-500/40 text-emerald-200 rounded-xl text-xs flex items-center gap-2 animate-fade-in">
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Changes saved successfully to your curriculum library!</span>
                    </div>
                  )}

                  {/* IN-PLACE EDITING FORM */}
                  {isEditingQuizInModal && editedQuizData && (
                    <div className="space-y-6 bg-slate-900/80 p-5 rounded-2xl border border-indigo-500/30">
                      <div className="flex items-center justify-between pb-3 border-b border-white/10">
                        <div>
                          <h4 className="text-sm font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-2">
                            <Edit3 className="w-4 h-4" /> Edit Quiz Content &amp; Teacher Key
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5">
                            Modify questions, correct options, points, explanations, hints, or add new questions.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => {
                              if (!onUpdateItem) return;
                              onUpdateItem(selectedItem.id, editedQuizData, editedQuizData.quizTitle);
                              setSelectedItem({
                                ...selectedItem,
                                title: editedQuizData.quizTitle || selectedItem.title,
                                data: editedQuizData
                              });
                              setQuizSaveSuccess(true);
                              setTimeout(() => setQuizSaveSuccess(false), 2500);
                            }}
                            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                          >
                            <Save className="w-4 h-4" />
                            <span>Save Changes to Library</span>
                          </button>
                        </div>
                      </div>

                      {/* Quiz Title & Chapter */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Quiz Title</label>
                          <input
                            type="text"
                            value={editedQuizData.quizTitle || ""}
                            onChange={(e) => setEditedQuizData({ ...editedQuizData, quizTitle: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Chapter / Topic</label>
                          <input
                            type="text"
                            value={editedQuizData.chapter || ""}
                            onChange={(e) => setEditedQuizData({ ...editedQuizData, chapter: e.target.value })}
                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>

                      {/* Question List Editor */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                            Questions ({editedQuizData.questions?.length || 0})
                          </label>
                          <button
                            onClick={() => {
                              const newQ = {
                                id: `q-${Date.now()}`,
                                question: "Enter question here...",
                                options: ["Option A", "Option B", "Option C", "Option D"],
                                correctOptionIndex: 0,
                                correctOptionLetter: "A",
                                correctAnswerText: "Option A",
                                points: 10,
                                explanation: "Explanation for answer.",
                                teacherHint: "Helpful clue.",
                                commonMisconception: "Common mistake."
                              };
                              setEditedQuizData({
                                ...editedQuizData,
                                questions: [...(editedQuizData.questions || []), newQ]
                              });
                            }}
                            className="px-3 py-1.5 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Question</span>
                          </button>
                        </div>

                        {(editedQuizData.questions || []).map((q: any, qIdx: number) => (
                          <div key={qIdx} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-bold text-indigo-300 text-sm">Question {qIdx + 1}</span>
                              <div className="flex items-center gap-3">
                                <div className="flex items-center gap-1.5">
                                  <label className="text-slate-400 text-[11px]">Points:</label>
                                  <input
                                    type="number"
                                    min="1"
                                    max="100"
                                    value={q.points || 10}
                                    onChange={(e) => {
                                      const updated = [...editedQuizData.questions];
                                      updated[qIdx] = { ...updated[qIdx], points: parseInt(e.target.value) || 10 };
                                      setEditedQuizData({ ...editedQuizData, questions: updated });
                                    }}
                                    className="w-16 bg-slate-800 border border-white/10 rounded px-2 py-1 text-xs text-white text-center font-mono"
                                  />
                                </div>
                                <button
                                  onClick={() => {
                                    if (editedQuizData.questions.length <= 1) return;
                                    const updated = editedQuizData.questions.filter((_: any, i: number) => i !== qIdx);
                                    setEditedQuizData({ ...editedQuizData, questions: updated });
                                  }}
                                  disabled={editedQuizData.questions.length <= 1}
                                  className="text-rose-400 hover:text-rose-300 p-1 disabled:opacity-30 transition-colors"
                                  title="Delete question"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>

                            {/* Question prompt text */}
                            <div>
                              <label className="block text-[11px] text-slate-400 mb-1">Question Prompt</label>
                              <textarea
                                rows={2}
                                value={q.question || ""}
                                onChange={(e) => {
                                  const updated = [...editedQuizData.questions];
                                  updated[qIdx] = { ...updated[qIdx], question: e.target.value };
                                  setEditedQuizData({ ...editedQuizData, questions: updated });
                                }}
                                className="w-full bg-slate-900 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-indigo-500"
                              />
                            </div>

                            {/* Options with radio button for correct answer */}
                            <div className="space-y-2">
                              <label className="block text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                                Multiple Choice Options &amp; Correct Answer Selection
                              </label>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {(q.options || []).map((opt: string, oIdx: number) => {
                                  const isCorrect = oIdx === q.correctOptionIndex;
                                  return (
                                    <div
                                      key={oIdx}
                                      className={`flex items-center gap-2 p-2 rounded-lg border transition-all ${
                                        isCorrect
                                          ? "bg-emerald-500/10 border-emerald-500/50"
                                          : "bg-slate-900 border-white/10"
                                      }`}
                                    >
                                      <input
                                        type="radio"
                                        name={`correct_q_${qIdx}`}
                                        checked={isCorrect}
                                        onChange={() => {
                                          const updated = [...editedQuizData.questions];
                                          const letter = String.fromCharCode(65 + oIdx);
                                          updated[qIdx] = {
                                            ...updated[qIdx],
                                            correctOptionIndex: oIdx,
                                            correctOptionLetter: letter,
                                            correctAnswerText: opt
                                          };
                                          setEditedQuizData({ ...editedQuizData, questions: updated });
                                        }}
                                        className="text-emerald-500 focus:ring-emerald-500 cursor-pointer"
                                      />
                                      <span className="font-bold text-slate-400 text-xs w-4">
                                        {String.fromCharCode(65 + oIdx)}.
                                      </span>
                                      <input
                                        type="text"
                                        value={opt}
                                        onChange={(e) => {
                                          const updated = [...editedQuizData.questions];
                                          const newOpts = [...(updated[qIdx].options || [])];
                                          newOpts[oIdx] = e.target.value;
                                          updated[qIdx] = {
                                            ...updated[qIdx],
                                            options: newOpts,
                                            correctAnswerText: updated[qIdx].correctOptionIndex === oIdx ? e.target.value : updated[qIdx].correctAnswerText
                                          };
                                          setEditedQuizData({ ...editedQuizData, questions: updated });
                                        }}
                                        className="flex-1 bg-transparent border-none text-xs text-white focus:outline-none"
                                        placeholder={`Option ${String.fromCharCode(65 + oIdx)}`}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            {/* Explanation, Hint, Pitfall */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
                              <div>
                                <label className="block text-[11px] text-emerald-400 font-semibold mb-1">Answer Explanation</label>
                                <textarea
                                  rows={2}
                                  value={q.explanation || ""}
                                  onChange={(e) => {
                                    const updated = [...editedQuizData.questions];
                                    updated[qIdx] = { ...updated[qIdx], explanation: e.target.value };
                                    setEditedQuizData({ ...editedQuizData, questions: updated });
                                  }}
                                  className="w-full bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-slate-200"
                                  placeholder="Explanation for students..."
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-amber-400 font-semibold mb-1">Teacher Team Hint</label>
                                <textarea
                                  rows={2}
                                  value={q.teacherHint || ""}
                                  onChange={(e) => {
                                    const updated = [...editedQuizData.questions];
                                    updated[qIdx] = { ...updated[qIdx], teacherHint: e.target.value };
                                    setEditedQuizData({ ...editedQuizData, questions: updated });
                                  }}
                                  className="w-full bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-slate-200"
                                  placeholder="Hint if teams get stuck..."
                                />
                              </div>

                              <div>
                                <label className="block text-[11px] text-rose-400 font-semibold mb-1">Common Student Pitfall</label>
                                <textarea
                                  rows={2}
                                  value={q.commonMisconception || ""}
                                  onChange={(e) => {
                                    const updated = [...editedQuizData.questions];
                                    updated[qIdx] = { ...updated[qIdx], commonMisconception: e.target.value };
                                    setEditedQuizData({ ...editedQuizData, questions: updated });
                                  }}
                                  className="w-full bg-slate-900 border border-white/10 rounded p-1.5 text-xs text-slate-200"
                                  placeholder="Common misconception..."
                                />
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Bottom Save Bar */}
                      <div className="flex justify-end gap-3 pt-3 border-t border-white/10">
                        <button
                          onClick={() => setIsEditingQuizInModal(false)}
                          className="px-4 py-2 border border-white/10 text-slate-300 hover:bg-white/5 rounded-xl text-xs font-semibold"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!onUpdateItem) return;
                            onUpdateItem(selectedItem.id, editedQuizData, editedQuizData.quizTitle);
                            setSelectedItem({
                              ...selectedItem,
                              title: editedQuizData.quizTitle || selectedItem.title,
                              data: editedQuizData
                            });
                            setIsEditingQuizInModal(false);
                            setQuizSaveSuccess(true);
                            setTimeout(() => setQuizSaveSuccess(false), 2500);
                          }}
                          className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-md transition-all"
                        >
                          <Save className="w-4 h-4" />
                          <span>Save Changes to Library</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* STANDARD VIEWING MODE */}
                  {!isEditingQuizInModal && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                          Teacher Question &amp; Answer Key Rubric ({(selectedItem.data.questions || []).length} Questions)
                        </h4>
                        <span className="text-xs text-slate-400">
                          Total Marks: {(selectedItem.data.questions || []).reduce((sum: number, q: any) => sum + (q.points || 10), 0)} pts
                        </span>
                      </div>

                      {(selectedItem.data.questions || []).map((q: any, idx: number) => (
                        <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-3 text-xs">
                          <div className="flex justify-between items-start gap-2">
                            <span className="font-bold text-white text-sm">Q{idx + 1}: {q.question}</span>
                            <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-mono font-bold">
                              {q.points || 10} pts
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {(q.options || []).map((opt: string, oIdx: number) => {
                              const isCorrect = oIdx === q.correctOptionIndex;
                              return (
                                <div
                                  key={oIdx}
                                  className={`p-2.5 rounded-lg border ${
                                    isCorrect
                                      ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-200 font-bold"
                                      : "bg-slate-900/60 border-white/5 text-slate-300"
                                  }`}
                                >
                                  {String.fromCharCode(65 + oIdx)}. {opt} {isCorrect && "✓ (Correct Answer)"}
                                </div>
                              );
                            })}
                          </div>

                          <div className="p-3 bg-emerald-950/30 border border-emerald-500/30 rounded-lg text-emerald-200 space-y-1">
                            <div><strong>Teacher Master Answer Key:</strong> Option {q.correctOptionLetter || String.fromCharCode(65 + q.correctOptionIndex)} — {q.correctAnswerText || q.options?.[q.correctOptionIndex]}</div>
                            <div><strong>Pedagogical Explanation:</strong> {q.explanation}</div>
                            {q.teacherHint && <div className="text-amber-200/90"><strong>Team Play Hint:</strong> {q.teacherHint}</div>}
                            {q.commonMisconception && <div className="text-rose-200/90"><strong>Common Pitfall:</strong> {q.commonMisconception}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 3-WEEK STUDY PLAN RENDER */}
              {selectedItem.type === "exam-study-plan" && (
                <div className="space-y-6" id="modal_render_exam_study_plan">
                  <div className="p-4 bg-teal-500/10 border border-teal-500/20 rounded-xl space-y-2 text-xs">
                    <h4 className="font-bold text-teal-300 text-sm">{selectedItem.data.planTitle || selectedItem.title}</h4>
                    <p className="text-slate-200 leading-relaxed">{selectedItem.data.overview}</p>
                    <div className="flex flex-wrap gap-3 pt-2 text-slate-400">
                      <span>Daily Study: <strong className="text-white">{selectedItem.data.dailyHours || 2} Hours/Day</strong></span>
                      <span>•</span>
                      <span>Weak Areas: <strong className="text-rose-300">{(selectedItem.data.weakAreas || []).join(', ')}</strong></span>
                      <span>•</span>
                      <span>Break Pattern: <strong className="text-teal-200">{selectedItem.data.dailyBreakSchedule || 'Short Pomodoro Breaks'}</strong></span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    {(selectedItem.data.weeks || []).map((week: any, wIdx: number) => (
                      <div key={wIdx} className="space-y-3 border border-white/10 rounded-2xl p-4 bg-white/5">
                        <div className="flex items-center justify-between border-b border-white/10 pb-2">
                          <h5 className="font-bold text-white text-sm">Week {week.weekNumber}: {week.weekGoal}</h5>
                          <span className="text-xs text-teal-300 font-mono">Week {week.weekNumber} of {selectedItem.data.totalWeeks || 3}</span>
                        </div>

                        <div className="space-y-3">
                          {(week.days || []).map((day: any, dIdx: number) => (
                            <div key={dIdx} className={`p-3 rounded-xl border text-xs space-y-2 ${day.isRevisionDay ? 'bg-amber-500/10 border-amber-500/30' : 'bg-slate-900/60 border-white/5'}`}>
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-white">{day.day}</span>
                                  {day.isRevisionDay && (
                                    <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 rounded font-bold text-[10px]">
                                      Dedicated Revision Day
                                    </span>
                                  )}
                                </div>
                                <span className="text-teal-300 font-mono text-[11px]">Break: {day.breakTime}</span>
                              </div>

                              <div className="space-y-1.5">
                                {(day.sessions || []).map((s: any, sIdx: number) => (
                                  <div key={sIdx} className="p-2 rounded bg-black/20 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                                    <div>
                                      <span className="font-bold text-indigo-300 mr-2">[{s.timeSlot}] {s.subject}</span>
                                      <span className="text-slate-300">{s.topic}</span>
                                      {s.isWeakAreaFocus && (
                                        <span className="ml-2 px-1.5 py-0.2 text-[10px] bg-rose-500/20 text-rose-300 rounded font-semibold">
                                          Priority Weak Spot
                                        </span>
                                      )}
                                    </div>
                                    <span className="text-slate-400 text-[11px]">{(s.activities || []).join(' • ')}</span>
                                  </div>
                                ))}
                              </div>

                              {day.dailyNotes && (
                                <p className="text-slate-400 italic text-[11px] pt-1">
                                  💡 {day.dailyNotes}
                                </p>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>

                  {selectedItem.data.tips && selectedItem.data.tips.length > 0 && (
                    <div className="p-4 bg-white/5 border border-white/10 rounded-xl space-y-2 text-xs">
                      <strong className="text-teal-300 uppercase tracking-wider block">Exam Readiness Tips:</strong>
                      <ul className="list-disc list-inside space-y-1 text-slate-300">
                        {selectedItem.data.tips.map((t: string, idx: number) => (
                          <li key={idx}>{t}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

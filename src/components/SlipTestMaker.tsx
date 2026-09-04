import React, { useState, useEffect } from "react";
import { 
  Zap, Clock, FileText, RefreshCw, Bookmark, Check, 
  Printer, Clipboard, FileDown, Eye, Sparkles
} from "lucide-react";
import { SlipTest, SavedItem } from "../types";
import { safeFetchJson } from "../utils/apiUtils";
import { compileClipboardText, handleExportToWord, handleExportToPDF } from "../utils/exportUtils";

interface SlipTestMakerProps {
  savedChapters: SavedItem[];
  customInstructions?: string;
  onSave: (type: 'slip-test', title: string, data: SlipTest, saveKey: string) => void;
  saveSuccess: Record<string, boolean>;
  prefillParams?: any;
}

export default function SlipTestMaker({
  savedChapters,
  customInstructions,
  onSave,
  saveSuccess,
  prefillParams
}: SlipTestMakerProps) {
  const [subject, setSubject] = useState("");
  const [grade, setGrade] = useState("");
  const [topic, setTopic] = useState("");
  const [duration, setDuration] = useState("15 minutes");
  const [marks, setMarks] = useState("15 Marks");
  const [questionTypes, setQuestionTypes] = useState("2 MCQs, 2 Fill-in-the-blanks, 1 Short answer question");
  const [selectedChapterId, setSelectedChapterId] = useState("custom");
  const [inlineInstructions, setInlineInstructions] = useState("");
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [slipTestResult, setSlipTestResult] = useState<SlipTest | null>(null);
  const [showAnswerKey, setShowAnswerKey] = useState(false);
  const [copied, setCopied] = useState(false);

  // Auto-prefill if invoked via AI Assistant action
  useEffect(() => {
    if (prefillParams) {
      if (prefillParams.subject) setSubject(prefillParams.subject);
      if (prefillParams.grade) setGrade(prefillParams.grade);
      if (prefillParams.topic) setTopic(prefillParams.topic);
      if (prefillParams.duration) setDuration(prefillParams.duration);
      if (prefillParams.marks) setMarks(prefillParams.marks);
    }
  }, [prefillParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !grade.trim() || !topic.trim()) return;

    setLoading(true);
    setError(null);
    setSlipTestResult(null);

    try {
      let chapterContent = "";
      if (selectedChapterId !== "custom") {
        const chapter = savedChapters.find(c => c.id === selectedChapterId);
        if (chapter && chapter.type === "scanned-chapter") {
          chapterContent = chapter.data.content;
        }
      }

      const data = await safeFetchJson<SlipTest>("/api/edu/slip-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          grade,
          topic,
          duration,
          marks,
          questionTypes,
          chapterContent,
          customInstructions: [customInstructions, inlineInstructions].filter(Boolean).join("\n\n")
        })
      });

      setSlipTestResult(data);
    } catch (err: any) {
      setError(err.message || "An error occurred generating slip test.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyText = () => {
    if (!slipTestResult) return;
    const text = compileClipboardText({ type: 'slip-test', title: slipTestResult.title, data: slipTestResult });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="panel_sliptest">
      
      {/* Form Container */}
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-5 h-5 text-amber-400" />
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            Slip Test Generator
          </h2>
        </div>
        <p className="text-sm text-slate-400 mt-1">
          Draft rapid 10–20 minute slip tests complete with concise questions, score weightage, and answer keys.
        </p>

        {error && (
          <div className="p-4 mt-4 bg-rose-500/10 text-rose-200 text-xs md:text-sm rounded-xl border border-rose-500/20 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="font-semibold text-rose-300 hover:text-white">Dismiss</button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Subject
              </label>
              <input
                id="input_slip_sub"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="e.g., Biology, Algebra, History"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Grade Level
              </label>
              <input
                id="input_slip_grade"
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g., Grade 6, Grade 9"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Topic
              </label>
              <input
                id="input_slip_topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., Photosynthesis, Cell Division"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Duration
              </label>
              <select
                id="input_slip_duration"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
              >
                <option value="10 minutes">10 Minutes</option>
                <option value="15 minutes">15 Minutes</option>
                <option value="20 minutes">20 Minutes</option>
                <option value="25 minutes">25 Minutes</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Total Marks
              </label>
              <select
                id="input_slip_marks"
                value={marks}
                onChange={(e) => setMarks(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
              >
                <option value="10 Marks">10 Marks</option>
                <option value="15 Marks">15 Marks</option>
                <option value="20 Marks">20 Marks</option>
                <option value="25 Marks">25 Marks</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Question Types
              </label>
              <input
                id="input_slip_types"
                type="text"
                value={questionTypes}
                onChange={(e) => setQuestionTypes(e.target.value)}
                placeholder="e.g., 2 MCQs, 2 Fill-in-blanks, 1 Short Answer"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Custom Instructions (Optional)
            </label>
            <textarea
              id="input_slip_custom_instructions"
              value={inlineInstructions}
              onChange={(e) => setInlineInstructions(e.target.value)}
              placeholder="e.g. Include 1 real-world application question, keep tone encouraging, provide marking rubrics"
              rows={2}
              className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500 resize-none"
            />
          </div>

          {savedChapters.length > 0 && (
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Attach Scanned Chapter Content (Optional)
              </label>
              <select
                id="select_slip_chapter"
                value={selectedChapterId}
                onChange={(e) => setSelectedChapterId(e.target.value)}
                className="w-full md:w-1/2 px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white"
              >
                <option value="custom">No Chapter attached</option>
                {savedChapters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.data.subject} - {c.data.chapterName}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex justify-end pt-2">
            <button
              id="btn_sliptest_generate"
              type="submit"
              disabled={loading || !subject.trim() || !grade.trim() || !topic.trim()}
              className="bg-amber-500 hover:bg-amber-400 disabled:bg-white/5 disabled:text-slate-500 text-slate-950 font-bold text-sm px-6 py-2.5 rounded-lg transition-all flex items-center gap-2 shadow-md"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Drafting Slip Test...</span>
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>Generate Slip Test</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Slip Test Output */}
      {slipTestResult && (
        <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-6 animate-fade-in" id="sliptest_result_box">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-white/10 pb-4 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="bg-amber-500/20 text-amber-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-amber-500/30 uppercase tracking-wider">
                  Slip Test
                </span>
              </div>
              <h3 className="font-bold text-lg text-white">{slipTestResult.title}</h3>
              <p className="text-xs text-slate-400 mt-1">
                Grade: {slipTestResult.grade} &nbsp;|&nbsp; Duration: {slipTestResult.duration} &nbsp;|&nbsp; Total Marks: {slipTestResult.totalMarks}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <button
                onClick={handleCopyText}
                className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Copy to Clipboard"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Clipboard className="w-3.5 h-3.5" />}
                <span>{copied ? "Copied!" : "Copy"}</span>
              </button>

              <button
                onClick={() => handleExportToPDF({ type: 'slip-test', title: slipTestResult.title, data: slipTestResult })}
                className="px-3 py-1.5 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Export to PDF"
                id="btn_sliptest_export_pdf"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF</span>
              </button>

              <button
                onClick={() => handleExportToWord({ type: 'slip-test', title: slipTestResult.title, data: slipTestResult })}
                className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Download Word Document"
              >
                <FileDown className="w-3.5 h-3.5" />
                <span>Word</span>
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
                title="Print or Save PDF"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Print</span>
              </button>

              <button
                id="btn_save_sliptest"
                onClick={() => onSave('slip-test', slipTestResult.title, slipTestResult, 'sliptest_save')}
                className="px-4 py-1.5 border border-indigo-400/30 text-indigo-200 bg-indigo-500/10 hover:bg-indigo-500/20 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                {saveSuccess['sliptest_save'] ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <>
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>Save to Library</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Student Instructions */}
          <div className="p-3.5 bg-amber-500/10 rounded-xl border border-amber-500/20">
            <strong className="text-xs font-bold text-amber-300 uppercase block tracking-wider mb-1">
              Candidate Instructions:
            </strong>
            <p className="text-slate-200 text-sm">{slipTestResult.instructions}</p>
          </div>

          {/* Question List */}
          <div className="space-y-4 pt-2">
            <h4 className="font-bold text-sm text-white border-b border-white/10 pb-2">
              📝 Test Questions
            </h4>
            <div className="space-y-3">
              {slipTestResult.questions?.map((q, idx) => (
                <div key={idx} className="p-4 bg-slate-900/50 border border-white/10 rounded-xl space-y-2">
                  <div className="flex justify-between items-start gap-3">
                    <div className="flex items-start gap-2">
                      <span className="font-bold text-amber-400 text-sm">{q.questionNumber || `Q${idx + 1}`}.</span>
                      <p className="text-sm font-medium text-white">{q.questionText}</p>
                    </div>
                    <span className="text-xs font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-md border border-amber-500/20 shrink-0">
                      [{q.marks}]
                    </span>
                  </div>

                  {q.options && q.options.length > 0 && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-300 pl-6 mt-2">
                      {q.options.map((opt, oIdx) => (
                        <div key={oIdx} className="bg-white/5 p-2 rounded-lg border border-white/5">
                          <strong className="text-amber-400 mr-1.5">{String.fromCharCode(65 + oIdx)}.</strong> {opt}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Toggleable Answer Key */}
          <div className="pt-4 border-t border-white/10 space-y-4">
            <button
              onClick={() => setShowAnswerKey(!showAnswerKey)}
              className="px-4 py-2 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-2 transition-all"
            >
              <Eye className="w-4 h-4" />
              <span>{showAnswerKey ? "Hide Answer Key & Solutions" : "Show Answer Key & Marking Criteria"}</span>
            </button>

            {showAnswerKey && (
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/20 rounded-xl space-y-3 animate-fade-in">
                <h4 className="font-bold text-sm text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4" /> Answer Key & Rubric
                </h4>
                <div className="space-y-3 text-xs md:text-sm">
                  {slipTestResult.answerKey?.map((key, idx) => (
                    <div key={idx} className="p-3 bg-white/5 rounded-lg border border-white/10 space-y-1">
                      <span className="font-bold text-emerald-300">{key.questionNumber}:</span>
                      <p className="text-slate-200 font-medium">{key.answerText}</p>
                      <p className="text-xs text-emerald-200/80 font-mono">Rubric: {key.markingCriteria}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      )}

    </div>
  );
}

import React, { useState, useEffect } from "react";
import { 
  Video, Sparkles, ExternalLink, Search, Copy, Check, 
  FileText, Download, Bookmark, MessageSquare, Clock, RefreshCw, 
  PlayCircle, HelpCircle, Lightbulb, BookOpen, Layers
} from "lucide-react";
import { YouTubeRecommendationResult, CuratedYouTubeVideo, SavedItem, CustomInstructions } from "../types";
import { safeFetchJson } from "../utils/apiUtils";
import { compileClipboardText, handleExportToWord, handleExportToPDF } from "../utils/exportUtils";

interface YouTubeScriptMakerProps {
  savedMaterials: SavedItem[];
  customInstructions: CustomInstructions;
  onSaveItem: (type: 'youtube-recommendation', title: string, data: YouTubeRecommendationResult) => void;
  prefillMaterialIds?: string[];
}

export default function YouTubeScriptMaker({
  savedMaterials,
  customInstructions,
  onSaveItem,
  prefillMaterialIds = []
}: YouTubeScriptMakerProps) {
  const [topic, setTopic] = useState("");
  const [grade, setGrade] = useState("Grade 7-10 Students");
  const [duration, setDuration] = useState("5-10 minutes");
  const [selectedMaterialIds, setSelectedMaterialIds] = useState<string[]>(prefillMaterialIds);
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('all');
  const [inlineInstructions, setInlineInstructions] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<YouTubeRecommendationResult | null>(null);

  const [copied, setCopied] = useState(false);
  const [savedFeedback, setSavedFeedback] = useState(false);
  const [activeVideoIdx, setActiveVideoIdx] = useState<number>(0);

  useEffect(() => {
    if (prefillMaterialIds.length > 0) {
      setSelectedMaterialIds(prefillMaterialIds);
      const firstMat = savedMaterials.find(m => prefillMaterialIds.includes(m.id));
      if (firstMat && !topic) {
        setTopic(firstMat.title);
      }
    }
  }, [prefillMaterialIds, savedMaterials]);

  const toggleMaterialSelection = (id: string) => {
    setSelectedMaterialIds(prev => 
      prev.includes(id) ? prev.filter(mId => mId !== id) : [...prev, id]
    );
  };

  const filteredSavedMaterials = savedMaterials.filter(mat => {
    if (materialCategoryFilter === 'textbook') return mat.type === 'scanned-chapter';
    if (materialCategoryFilter === 'notebook') return mat.type === 'notebook';
    if (materialCategoryFilter === 'exam') return ['worksheet', 'question-paper', 'slip-test', 'quiz'].includes(mat.type);
    if (materialCategoryFilter === 'plan') return ['lesson-plan', 'revision', 'study-plan'].includes(mat.type);
    return true;
  });

  const compileSourceContent = () => {
    if (selectedMaterialIds.length === 0) return "";
    return selectedMaterialIds
      .map(id => {
        const mat = savedMaterials.find(m => m.id === id);
        if (!mat) return "";
        return `[Material: ${mat.title} (${mat.type})]\n${compileClipboardText(mat)}`;
      })
      .filter(Boolean)
      .join("\n\n---\n\n");
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic.trim() && selectedMaterialIds.length === 0) {
      setError("Please enter a topic or select at least one material from your saved library.");
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const sourceContent = compileSourceContent();
      const combinedInstructions = [customInstructions.youtubeScript, customInstructions.generalTone, inlineInstructions].filter(Boolean).join("\n\n");

      const data = await safeFetchJson<YouTubeRecommendationResult>("/api/edu/youtube-finder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: topic.trim() || (selectedMaterialIds.length > 0 ? "Educational Topic" : "Science & Learning Concept"),
          sourceContent,
          grade,
          duration,
          customInstructions: combinedInstructions
        })
      });

      setResult(data);
      setActiveVideoIdx(0);
    } catch (err: any) {
      setError(err.message || "Something went wrong while curating YouTube videos.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!result) return;
    onSaveItem('youtube-recommendation', result.title || result.topic, result);
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 2000);
  };

  const handleCopy = () => {
    if (!result) return;
    const text = compileClipboardText({ type: 'youtube-recommendation', title: result.title, data: result });
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6" id="youtube_video_finder_workspace">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-red-900/50 via-slate-900 to-rose-900/40 backdrop-blur-md p-6 rounded-2xl border border-rose-500/30 shadow-xl">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 bg-rose-500/20 rounded-xl border border-rose-500/30 text-rose-400">
            <Video className="w-6 h-6" />
          </div>
          <div>
            <span className="bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-rose-500/30 uppercase tracking-wider">
              AI Classroom YouTube Video Finder & Lesson Curator
            </span>
            <h2 className="text-xl font-display font-bold text-white tracking-tight mt-0.5">
              Find YouTube Videos for Class
            </h2>
          </div>
        </div>
        <p className="text-xs text-slate-300 max-w-2xl mt-1">
          Search and find high-quality, age-appropriate educational YouTube videos (CrashCourse, Khan Academy, TED-Ed, Amoeba Sisters, SciShow) to present topics to your students, complete with guided timestamps, post-watching discussion questions, and classroom activities.
        </p>
      </div>

      {/* Input Configuration Form */}
      <div className="bg-slate-900/80 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg space-y-5">
        <form onSubmit={handleGenerate} className="space-y-5">
          
          {/* Topic & Grade */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Topic or Concept to Present to Students
              </label>
              <input
                id="input_yt_topic"
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis & Cellular Respiration or Pythagorean Theorem"
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-950 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Target Grade / Audience
              </label>
              <input
                id="input_yt_grade"
                type="text"
                value={grade}
                onChange={(e) => setGrade(e.target.value)}
                placeholder="e.g. Grade 7-10 Students"
                className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-950 text-white placeholder-slate-500"
              />
            </div>
          </div>

          {/* Preferred Duration */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Preferred Video Length
            </label>
            <select
              id="input_yt_duration"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-950 text-white"
            >
              <option value="Under 5 minutes (Quick Warm-up / Hook)">Under 5 minutes (Quick Warm-up / Hook)</option>
              <option value="5-10 minutes (Standard Lesson Explanation)">5-10 minutes (Standard Lesson Explanation)</option>
              <option value="10-15 minutes (In-Depth Animated Lecture)">10-15 minutes (In-Depth Animated Lecture)</option>
              <option value="15+ minutes (Full Classroom Documentary)">15+ minutes (Full Classroom Documentary)</option>
            </select>
          </div>

          {/* Select from Saved Library (Textbooks, Scanned Chapters, Notes, Worksheets) */}
          {savedMaterials.length > 0 && (
            <div className="p-4 rounded-xl bg-slate-950/80 border border-rose-500/30 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-2.5">
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-rose-400" />
                  <label className="text-xs font-bold text-rose-200 uppercase tracking-wider">
                    Select Saved Material(s) to Find Corresponding YouTube Videos
                  </label>
                </div>
                <div className="flex items-center gap-2 text-[11px]">
                  <span className="text-rose-300 font-mono font-semibold px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/30">
                    {selectedMaterialIds.length} items selected
                  </span>
                  {selectedMaterialIds.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSelectedMaterialIds([])}
                      className="text-slate-400 hover:text-rose-300 underline"
                    >
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Material Category Tabs */}
              <div className="flex flex-wrap gap-1.5 text-[11px]">
                {[
                  { id: 'all', label: 'All Saved' },
                  { id: 'textbook', label: '📖 Textbooks & Scanned Chapters' },
                  { id: 'notebook', label: '📓 Notebook Notes' },
                  { id: 'exam', label: '📝 Worksheets & Papers' },
                  { id: 'plan', label: '📚 Lesson Plans & Guides' }
                ].map(cat => {
                  const active = (cat.id === 'all' && (!materialCategoryFilter || materialCategoryFilter === 'all')) || materialCategoryFilter === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setMaterialCategoryFilter(cat.id)}
                      className={`px-2.5 py-1 rounded-lg border font-medium transition-all ${
                        active
                          ? 'bg-rose-600 border-rose-400 text-white shadow-sm'
                          : 'bg-slate-900 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {cat.label}
                    </button>
                  );
                })}
              </div>

              {/* Saved Material List */}
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {filteredSavedMaterials.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-3 text-center">
                    No saved materials match this category.
                  </p>
                ) : (
                  filteredSavedMaterials.map((mat) => {
                    const isChecked = selectedMaterialIds.includes(mat.id);
                    const textSnippet = compileClipboardText(mat).slice(0, 110);
                    return (
                      <label
                        key={mat.id}
                        className={`flex items-start justify-between p-3 rounded-xl border text-xs cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-rose-950/90 border-rose-500/70 text-white shadow-md' 
                            : 'bg-slate-900/60 border-white/10 text-slate-300 hover:bg-slate-900'
                        }`}
                      >
                        <div className="flex items-start gap-2.5 overflow-hidden">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleMaterialSelection(mat.id)}
                            className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 bg-slate-800 border-slate-700"
                          />
                          <div className="space-y-0.5 overflow-hidden">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-white truncate">{mat.title}</span>
                              <span className={`text-[10px] px-2 py-0.5 rounded font-mono uppercase border ${
                                mat.type === 'scanned-chapter' 
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' 
                                  : mat.type === 'notebook'
                                  ? 'bg-teal-500/20 text-teal-300 border-teal-500/30'
                                  : 'bg-slate-800 text-slate-300 border-white/10'
                              }`}>
                                {mat.type === 'scanned-chapter' ? '📖 Textbook Chapter' : mat.type === 'notebook' ? '📓 Notebook' : mat.type}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 line-clamp-1 italic">
                              "{textSnippet}..."
                            </p>
                          </div>
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0 ml-2">{mat.date}</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Custom Instructions */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
              Custom Instructions (Optional)
            </label>
            <textarea
              id="input_yt_custom_instructions"
              value={inlineInstructions}
              onChange={(e) => setInlineInstructions(e.target.value)}
              placeholder="e.g. Prefer highly visual animated channels like Kurzgesagt or TED-Ed, focus on real-world applications"
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 bg-slate-950 text-white placeholder-slate-500 resize-none"
            />
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 flex items-center gap-2">
              <span>⚠️ {error}</span>
            </div>
          )}

          <div className="flex justify-end pt-1">
            <button
              id="btn_yt_generate"
              type="submit"
              disabled={loading}
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 disabled:opacity-50 text-white font-semibold text-sm rounded-xl shadow-lg shadow-rose-500/20 flex items-center gap-2 transition-all"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Searching & Curating YouTube Videos...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-rose-200" />
                  <span>Find Educational Videos</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Curation Results */}
      {result && result.videos && (
        <div className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-rose-500/30 p-6 shadow-2xl space-y-6 animate-fade-in" id="youtube_video_results_viewer">
          
          {/* Header Action Bar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[10px] font-mono uppercase bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                  🎬 {result.videos.length} Videos Curated
                </span>
                <span className="text-[10px] font-mono uppercase bg-slate-800 text-slate-300 px-2.5 py-0.5 rounded-full border border-white/10">
                  🎯 {result.targetGrade}
                </span>
              </div>
              <h3 className="text-xl font-bold text-white">
                {result.title || result.topic}
              </h3>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* PDF Export */}
              <button
                id="btn_yt_export_pdf"
                onClick={() => handleExportToPDF({ type: 'youtube-recommendation', title: result.title, data: result })}
                className="px-3 py-2 border border-rose-500/30 text-rose-200 bg-rose-500/10 hover:bg-rose-500/20 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Export PDF Guide"
              >
                <FileText className="w-3.5 h-3.5 text-rose-400" />
                <span>PDF Guide</span>
              </button>

              {/* Word Export */}
              <button
                id="btn_yt_export_word"
                onClick={() => handleExportToWord({ type: 'youtube-recommendation', title: result.title, data: result })}
                className="px-3 py-2 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
                title="Export Word"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Word</span>
              </button>

              {/* Copy Recommendation Notes */}
              <button
                id="btn_yt_copy"
                onClick={handleCopy}
                className="p-2 border border-white/10 text-slate-300 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
                title="Copy Video Guide Notes"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
              </button>

              {/* Save to Library */}
              <button
                id="btn_yt_save_library"
                onClick={handleSave}
                className={`px-3 py-2 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-all ${
                  savedFeedback
                    ? 'bg-green-500/20 border border-green-500/40 text-green-300'
                    : 'bg-rose-600 hover:bg-rose-500 text-white shadow-md'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                <span>{savedFeedback ? "Saved to Library!" : "Save to Library"}</span>
              </button>
            </div>
          </div>

          {/* Teacher Guidance Overview */}
          {result.overviewNote && (
            <div className="p-4 rounded-xl bg-gradient-to-r from-rose-950/60 to-slate-950 border border-rose-500/30 text-xs text-rose-200 space-y-1">
              <span className="font-bold uppercase tracking-wider text-[10px] text-rose-400 flex items-center gap-1.5">
                <Lightbulb className="w-3.5 h-3.5" />
                <span>Teacher Integration Strategy & Lesson Tips</span>
              </span>
              <p className="leading-relaxed">
                {result.overviewNote}
              </p>
            </div>
          )}

          {/* Video Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {result.videos.map((vid, idx) => (
              <button
                key={idx}
                onClick={() => setActiveVideoIdx(idx)}
                className={`px-4 py-2.5 rounded-xl border text-xs font-semibold shrink-0 transition-all flex items-center gap-2 ${
                  activeVideoIdx === idx 
                    ? 'bg-rose-600 border-rose-400 text-white shadow-lg shadow-rose-500/20' 
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                <PlayCircle className="w-4 h-4" />
                <span>Video {idx + 1}: {vid.channelName}</span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-black/30 font-mono">
                  {vid.duration}
                </span>
              </button>
            ))}
          </div>

          {/* Active Video Card Details */}
          {result.videos[activeVideoIdx] && (
            <div className="space-y-6 bg-slate-950/80 p-6 rounded-2xl border border-white/10">
              
              {/* Video Title & Primary Direct Watch Link */}
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-mono font-bold uppercase bg-rose-500/20 text-rose-300 px-2.5 py-0.5 rounded-full border border-rose-500/30">
                      📺 {result.videos[activeVideoIdx].channelName}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded flex items-center gap-1">
                      <Clock className="w-3 h-3 text-rose-400" />
                      {result.videos[activeVideoIdx].duration}
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      🎓 {result.videos[activeVideoIdx].targetGrade}
                    </span>
                  </div>
                  <h4 className="text-lg font-extrabold text-white">
                    {result.videos[activeVideoIdx].videoTitle}
                  </h4>
                </div>

                {/* Direct Link to YouTube */}
                <a
                  href={
                    result.videos[activeVideoIdx].youtubeUrl && result.videos[activeVideoIdx].youtubeUrl.startsWith('http')
                      ? result.videos[activeVideoIdx].youtubeUrl
                      : `https://www.youtube.com/results?search_query=${encodeURIComponent(`${result.videos[activeVideoIdx].videoTitle} ${result.videos[activeVideoIdx].channelName}`)}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-extrabold rounded-xl shadow-lg shadow-red-600/40 flex items-center gap-2 shrink-0 transition-all transform hover:scale-[1.02]"
                >
                  <PlayCircle className="w-4 h-4 fill-white text-red-600" />
                  <span>▶ Watch Video on YouTube</span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-80" />
                </a>
              </div>

              {/* Video Summary & Rationale */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div className="p-4 rounded-xl bg-slate-900 border border-white/10 space-y-1">
                  <span className="font-bold text-slate-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-rose-400" />
                    <span>Video Content Overview & Summary</span>
                  </span>
                  <p className="text-slate-300 leading-relaxed">
                    {result.videos[activeVideoIdx].summary}
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/20 text-emerald-100 space-y-1">
                  <span className="font-bold text-emerald-300 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Why Recommended for Students</span>
                  </span>
                  <p className="leading-relaxed italic">
                    "{result.videos[activeVideoIdx].whyRecommended}"
                  </p>
                </div>
              </div>

              {/* Key Timestamps & Chapters */}
              {result.videos[activeVideoIdx].keyTimestamps && result.videos[activeVideoIdx].keyTimestamps.length > 0 && (
                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-rose-400" />
                    <span>Guided Teaching Timestamps & Chapters</span>
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    {result.videos[activeVideoIdx].keyTimestamps.map((ts, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded-xl border border-white/5 flex items-start gap-2.5">
                        <span className="text-xs font-mono font-bold bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30 shrink-0">
                          {ts.time}
                        </span>
                        <span className="text-xs text-slate-300 font-medium leading-snug">
                          {ts.topic}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Discussion Questions */}
              {result.videos[activeVideoIdx].discussionQuestions && result.videos[activeVideoIdx].discussionQuestions.length > 0 && (
                <div className="space-y-2 bg-amber-950/20 border border-amber-500/30 p-4 rounded-xl">
                  <h5 className="text-xs font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <HelpCircle className="w-4 h-4 text-amber-400" />
                    <span>Post-Watching Classroom Discussion Questions</span>
                  </h5>
                  <ul className="space-y-2 text-xs text-amber-100">
                    {result.videos[activeVideoIdx].discussionQuestions.map((q, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="font-bold text-amber-400 shrink-0">Q{idx + 1}.</span>
                        <span className="leading-relaxed">{q}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Follow-up Student Activity */}
              {result.videos[activeVideoIdx].recommendedActivity && (
                <div className="p-4 rounded-xl bg-purple-950/30 border border-purple-500/30 text-xs text-purple-200 space-y-1">
                  <span className="font-bold uppercase tracking-wider text-[10px] text-purple-300 flex items-center gap-1.5">
                    <Lightbulb className="w-3.5 h-3.5 text-purple-400" />
                    <span>5-Minute Post-Video Student Activity</span>
                  </span>
                  <p className="leading-relaxed">
                    {result.videos[activeVideoIdx].recommendedActivity}
                  </p>
                </div>
              )}

            </div>
          )}

        </div>
      )}

    </div>
  );
}

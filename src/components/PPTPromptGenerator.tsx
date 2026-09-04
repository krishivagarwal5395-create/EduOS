import React, { useState } from "react";
import { 
  Sparkles, Copy, Check, ExternalLink, Download, Bookmark, 
  Layers, Presentation as PresentationIcon, RefreshCw, Eye,
  BookOpen, Lightbulb, MessageSquare, ArrowRight, Zap,
  MonitorPlay, CheckCircle2, ChevronRight, FileText
} from "lucide-react";
import { PPTPromptResult, SavedItem, CustomInstructions } from "../types";
import { safeFetchJson } from "../utils/apiUtils";

interface PPTPromptGeneratorProps {
  savedMaterials: SavedItem[];
  customInstructions: CustomInstructions;
  onSaveItem: (type: 'ppt-prompt', title: string, data: PPTPromptResult) => void;
  prefillTopic?: string;
  prefillGrade?: string;
  prefillSubject?: string;
}

const TARGET_AI_TOOLS = [
  { id: "Gamma AI", name: "Gamma App", badge: "Most Popular", url: "https://gamma.app/new", desc: "Best for fluid bento cards and AI-generated presentations" },
  { id: "Canva Magic Design", name: "Canva Magic Design", badge: "Creative Visuals", url: "https://www.canva.com/design?create=presentation", desc: "Creates Canva AI presentation decks and styled templates" },
  { id: "SlidesAI", name: "SlidesAI / Google Slides", badge: "Slides Add-on", url: "https://www.slidesai.io", desc: "Converts text outlines directly into Google Slides" },
  { id: "Tome AI", name: "Tome / Beautiful.ai", badge: "Modern Layouts", url: "https://tome.app", desc: "Generative storytelling with automated layouts" },
  { id: "ChatGPT / Claude", name: "ChatGPT / Claude Slide Master", badge: "Prompt Master", url: "https://chatgpt.com", desc: "Generates VBA code, PowerPoint markdown, or slide outlines" }
];

const VISUAL_ARCHETYPES = [
  "Modern Bento & Infographic",
  "Vibrant Classroom & Gamified",
  "Minimalist Academic & Crisp",
  "High-Tech Dark Mode & Neon Accents",
  "Pastel Storyboard & Clean Hand-drawn",
  "Corporate & Professional Clean"
];

const SUBJECT_OPTIONS = [
  "Science (Biology, Chemistry, Physics)",
  "Mathematics (Algebra, Geometry, Calculus)",
  "History & Social Studies",
  "English & Literature",
  "Computer Science & Technology",
  "Geography & Environmental Studies",
  "Economics & Business"
];

export default function PPTPromptGenerator({
  savedMaterials,
  customInstructions,
  onSaveItem,
  prefillTopic = "",
  prefillGrade = "Grade 8",
  prefillSubject = "Science (Biology, Chemistry, Physics)"
}: PPTPromptGeneratorProps) {
  const [topic, setTopic] = useState(prefillTopic);
  const [subject, setSubject] = useState(prefillSubject);
  const [grade, setGrade] = useState(prefillGrade);
  const [slideCount, setSlideCount] = useState<number>(8);
  const [targetAi, setTargetAi] = useState<string>("Gamma AI");
  const [visualStyle, setVisualStyle] = useState<string>("Modern Bento & Infographic");
  const [lessonObjectives, setLessonObjectives] = useState<string>("");
  const [keyTerminology, setKeyTerminology] = useState<string>("");
  const [specialInstructions, setSpecialInstructions] = useState<string>("");
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>("none");

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<PPTPromptResult | null>(null);
  const [copied, setCopied] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [activeSlideTab, setActiveSlideTab] = useState<number>(0);

  const handleGeneratePrompt = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!topic.trim() && selectedMaterialId === "none") {
      setError("Please enter a specific lesson topic or choose a saved chapter/material.");
      return;
    }

    setLoading(true);
    setError(null);

    let sourceContent = "";
    if (selectedMaterialId !== "none") {
      const found = savedMaterials.find(m => m.id === selectedMaterialId);
      if (found) {
        if (found.type === 'scanned-chapter' || found.type === 'chapter' || found.type === 'revision') {
          sourceContent = found.data?.content || found.data?.text || found.data?.chapterContent || (typeof found.data === 'string' ? found.data : JSON.stringify(found.data));
        } else if (found.type === 'notebook') {
          sourceContent = `${found.data?.summary || ""}\n${(found.data?.sections || []).map((s: any) => `${s.heading}:\n${s.points?.join("\n")}`).join("\n\n")}`;
        } else {
          sourceContent = JSON.stringify(found.data);
        }
      }
    }

    try {
      const data = await safeFetchJson<PPTPromptResult>("/api/edu/generate-ppt-prompt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lessonTopic: topic.trim(),
          subject,
          grade,
          slideCount,
          targetAi,
          visualStyle,
          lessonObjectives,
          keyTerminology,
          specialInstructions: `${customInstructions?.generalTone ? `General Tone: ${customInstructions.generalTone}\n` : ''}${specialInstructions}`.trim(),
          sourceContent
        })
      });

      setResult(data);
      setActiveSlideTab(0);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to connect to AI engine");
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    if (!result?.dropInPrompt) return;
    navigator.clipboard.writeText(result.dropInPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSave = () => {
    if (!result) return;
    onSaveItem('ppt-prompt', `${result.lessonTitle} - ${result.targetAi} Prompt`, result);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleDownloadMarkdown = () => {
    if (!result) return;
    const blob = new Blob([result.dropInPrompt], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${result.lessonTitle.replace(/\s+/g, "_")}_PPT_AI_Prompt.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const selectedAiMeta = TARGET_AI_TOOLS.find(t => t.id === targetAi) || TARGET_AI_TOOLS[0];

  return (
    <div className="flex flex-col gap-6" id="ppt_prompt_generator_view">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-slate-900/50 border border-indigo-500/20 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-indigo-400 font-mono text-xs uppercase tracking-wider mb-1">
            <PresentationIcon className="w-4 h-4 text-indigo-400" />
            <span>AI Slide Prompt Studio</span>
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] px-2 py-0.5 rounded-full border border-indigo-500/30">Drop-in Ready</span>
          </div>
          <h2 className="text-xl md:text-2xl font-display font-bold text-white tracking-tight">
            Lesson-to-PPT Prompt Generator
          </h2>
          <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
            Specify any lesson, topic, or chapter to automatically generate an expertly structured prompt engineered to be dropped directly into <strong>Gamma AI</strong>, <strong>Canva Magic Design</strong>, <strong>SlidesAI</strong>, or <strong>Tome</strong>.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-indigo-500/10 border border-indigo-400/20 px-3.5 py-2 rounded-xl shrink-0">
          <Sparkles className="w-4 h-4 text-indigo-400 animate-pulse" />
          <div className="text-xs font-semibold text-indigo-200">
            One-Click Drop-in AI Prompt
          </div>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs rounded-xl flex items-center justify-between shadow-lg">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Main Grid: Config Form & Prompt Output */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Lesson & Presentation Configuration (5 cols) */}
        <div className="lg:col-span-5 bg-white/5 border border-white/10 rounded-2xl p-5 backdrop-blur-md shadow-lg space-y-4">
          <div className="border-b border-white/10 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <span>1. Lesson Details & Target AI</span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">Customize the lesson curriculum and target slide engine</p>
          </div>

          <form onSubmit={handleGeneratePrompt} className="space-y-4">
            
            {/* Target AI Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Target PPT Generator AI
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {TARGET_AI_TOOLS.map((tool) => (
                  <button
                    key={tool.id}
                    type="button"
                    onClick={() => setTargetAi(tool.id)}
                    className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      targetAi === tool.id
                        ? "bg-indigo-600/30 border-indigo-400 text-white shadow-md shadow-indigo-600/20 ring-1 ring-indigo-400/50"
                        : "bg-slate-900/40 border-white/10 text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold">{tool.name}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-white/10 text-indigo-300 font-mono">{tool.badge}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 line-clamp-1">{tool.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Lesson Topic */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Specific Lesson Topic / Title <span className="text-indigo-400">*</span>
              </label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. Photosynthesis: Light & Dark Reactions, Solving Linear Equations..."
                className="w-full px-3.5 py-2.5 bg-slate-900/80 border border-white/15 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
                required
              />
            </div>

            {/* Subject & Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Subject</label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  {SUBJECT_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Grade</label>
                <select
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value="Grade 5-6 (Elementary)">Grade 5-6 (Elementary)</option>
                  <option value="Grade 7-8 (Middle School)">Grade 7-8 (Middle School)</option>
                  <option value="Grade 9-10 (High School)">Grade 9-10 (High School)</option>
                  <option value="Grade 11-12 (Advanced AP/IB)">Grade 11-12 (Advanced AP/IB)</option>
                  <option value="Undergraduate / College">Undergraduate / College</option>
                </select>
              </div>
            </div>

            {/* Slide Count & Visual Style */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Slide Count</label>
                <select
                  value={slideCount}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  <option value={5}>5 Slides (Fast Flash Pitch)</option>
                  <option value={8}>8 Slides (Standard Single Lesson)</option>
                  <option value={10}>10 Slides (Comprehensive Module)</option>
                  <option value={12}>12 Slides (Deep Dive & Examples)</option>
                  <option value={15}>15 Slides (Full Unit Overview)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Visual Style</label>
                <select
                  value={visualStyle}
                  onChange={(e) => setVisualStyle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
                >
                  {VISUAL_ARCHETYPES.map(arch => <option key={arch} value={arch}>{arch}</option>)}
                </select>
              </div>
            </div>

            {/* Source Material from Library */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Source Material from Saved Library (Optional)
              </label>
              <select
                value={selectedMaterialId}
                onChange={(e) => setSelectedMaterialId(e.target.value)}
                className="w-full px-3 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white focus:outline-none focus:border-indigo-400"
              >
                <option value="none">-- None (AI Synthesizes from Topic) --</option>
                {savedMaterials.map(m => (
                  <option key={m.id} value={m.id}>
                    [{m.type}] {m.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Lesson Objectives */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Key Lesson Objectives / Learning Outcomes
              </label>
              <textarea
                value={lessonObjectives}
                onChange={(e) => setLessonObjectives(e.target.value)}
                rows={2}
                placeholder="e.g. Understand chlorophyll function; compare light-dependent vs Calvin cycle..."
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Special Instructions */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Special Directives for the PPT AI
              </label>
              <input
                type="text"
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="e.g. Include real-world analogies, step-by-step flowchart descriptions, quiz questions..."
                className="w-full px-3.5 py-2 bg-slate-900/80 border border-white/15 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-400"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Engineering Drop-in PPT Prompt...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-indigo-300" />
                  <span>Generate PPT AI Prompt</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Right Column: Prompt Preview, Direct Copy & Drop-in Actions (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {result ? (
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 md:p-6 backdrop-blur-md shadow-xl space-y-5 animate-fade-in">
              
              {/* Header with Title and Quick Launch Bar */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Ready to Drop-in
                    </span>
                    <span className="text-xs text-slate-400 font-mono">{result.targetAi}</span>
                    <span className="text-xs text-slate-400 font-mono">• {result.slideCount} Slides</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mt-1">{result.lessonTitle}</h3>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSave}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all ${
                      savedSuccess 
                        ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200' 
                        : 'bg-white/5 border-white/10 text-slate-300 hover:bg-white/10'
                    }`}
                    title="Save to Library"
                  >
                    <Bookmark className="w-3.5 h-3.5" />
                    <span>{savedSuccess ? "Saved!" : "Save Prompt"}</span>
                  </button>

                  <button
                    onClick={handleDownloadMarkdown}
                    className="px-3 py-1.5 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-1.5"
                    title="Download Markdown Prompt"
                  >
                    <Download className="w-3.5 h-3.5 text-indigo-300" />
                    <span>Download</span>
                  </button>
                </div>
              </div>

              {/* PRIMARY ACTION: DROP-IN PROMPT BOX */}
              <div className="bg-slate-950/90 border border-indigo-500/40 rounded-2xl p-4 shadow-inner space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                    <span>Drop-in AI Prompt (Copy &amp; Paste into {result.targetAi})</span>
                  </div>

                  <button
                    onClick={handleCopyPrompt}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-md ${
                      copied 
                        ? 'bg-emerald-500 text-slate-950' 
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                    }`}
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-950" />
                        <span>Copied to Clipboard!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Drop-In Prompt</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="relative">
                  <textarea
                    readOnly
                    value={result.dropInPrompt}
                    rows={8}
                    className="w-full p-3 bg-slate-900/90 border border-white/10 rounded-xl text-slate-200 font-mono text-xs focus:outline-none select-all resize-y leading-relaxed"
                  />
                </div>

                {/* Direct 1-Click Launch Buttons to AI Presentation Generators */}
                <div className="pt-2 border-t border-white/10 flex flex-wrap items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Direct Drop-in Targets:</span>
                  
                  <a
                    href="https://gamma.app/new"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText(result.dropInPrompt);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Copy &amp; Open Gamma App</span>
                    <ExternalLink className="w-3 h-3 text-purple-200" />
                  </a>

                  <a
                    href="https://www.canva.com/design?create=presentation"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText(result.dropInPrompt);
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-teal-500 to-indigo-600 hover:from-teal-400 hover:to-indigo-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Copy &amp; Open Canva AI</span>
                    <ExternalLink className="w-3 h-3 text-teal-200" />
                  </a>

                  <a
                    href="https://chatgpt.com"
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => {
                      navigator.clipboard.writeText(result.dropInPrompt);
                    }}
                    className="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 border border-emerald-500/40 text-emerald-200 text-xs font-semibold rounded-lg flex items-center gap-1.5"
                  >
                    <span>Open in ChatGPT</span>
                    <ExternalLink className="w-3 h-3 text-emerald-300" />
                  </a>
                </div>
              </div>

              {/* Slide by Slide Architectural Blueprint */}
              {result.slides && result.slides.length > 0 && (
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Layers className="w-4 h-4 text-indigo-400" />
                      <span>Slide-by-Slide Outline &amp; Directives ({result.slides.length})</span>
                    </h4>
                  </div>

                  {/* Horizontal Slide Selector Bar */}
                  <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                    {result.slides.map((s, idx) => (
                      <button
                        key={idx}
                        onClick={() => setActiveSlideTab(idx)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                          activeSlideTab === idx
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white/5 border border-white/10 text-slate-400 hover:text-white'
                        }`}
                      >
                        <span className="font-mono text-[10px] text-indigo-300">#{s.slideNumber || idx + 1}</span>
                        <span className="max-w-[120px] truncate">{s.title}</span>
                      </button>
                    ))}
                  </div>

                  {/* Active Slide Card Detail */}
                  {result.slides[activeSlideTab] && (
                    <div className="bg-slate-900/60 border border-white/10 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                        <div>
                          <span className="text-[10px] uppercase font-mono text-indigo-400 font-bold">
                            Slide {result.slides[activeSlideTab].slideNumber || activeSlideTab + 1} • {result.slides[activeSlideTab].layout || "Standard"}
                          </span>
                          <h5 className="text-sm font-bold text-white mt-0.5">{result.slides[activeSlideTab].title}</h5>
                        </div>
                      </div>

                      {/* Bullet points */}
                      <div>
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block mb-1">Key Slide Content:</span>
                        <ul className="space-y-1 text-xs text-slate-300 pl-4 list-disc">
                          {result.slides[activeSlideTab].bulletPoints?.map((bp, bpIdx) => (
                            <li key={bpIdx}>{bp}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Visual Description */}
                      {result.slides[activeSlideTab].visualDescription && (
                        <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-lg p-2.5 text-xs text-indigo-200">
                          <span className="font-bold block text-[10px] uppercase text-indigo-300 mb-0.5">🎨 Visual &amp; Image Directive:</span>
                          {result.slides[activeSlideTab].visualDescription}
                        </div>
                      )}

                      {/* Speaker Notes */}
                      {result.slides[activeSlideTab].speakerNotes && (
                        <div className="bg-white/5 rounded-lg p-2.5 text-xs text-slate-300">
                          <span className="font-bold block text-[10px] uppercase text-slate-400 mb-0.5">🎙️ Presenter Script:</span>
                          {result.slides[activeSlideTab].speakerNotes}
                        </div>
                      )}

                      {/* Interactive check question */}
                      {result.slides[activeSlideTab].checkQuestion && (
                        <div className="bg-amber-950/40 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-200">
                          <span className="font-bold block text-[10px] uppercase text-amber-300 mb-0.5">💡 Check for Understanding:</span>
                          {result.slides[activeSlideTab].checkQuestion}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

            </div>
          ) : (
            /* Empty State Guide */
            <div className="bg-white/5 border border-white/10 rounded-2xl p-8 text-center backdrop-blur-md shadow-lg flex flex-col items-center justify-center min-h-[440px] space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-7 h-7" />
              </div>
              <div className="max-w-md">
                <h4 className="text-base font-bold text-white">Generate a Drop-In PPT AI Prompt</h4>
                <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">
                  Enter your lesson topic on the left. EduOS will engineer a master prompt with tailored slide structures, visual cues, and speaker notes ready to paste into <strong>Gamma AI</strong>, <strong>Canva Magic Design</strong>, or <strong>SlidesAI</strong>.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-left w-full max-w-lg mt-4">
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                  <span className="font-bold text-indigo-300 block mb-1">1. Specify Topic</span>
                  <p className="text-[11px] text-slate-400">Choose your subject, grade, and specific lesson theme.</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                  <span className="font-bold text-purple-300 block mb-1">2. Click Generate</span>
                  <p className="text-[11px] text-slate-400">AI crafts the complete drop-in prompt structure.</p>
                </div>
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs">
                  <span className="font-bold text-emerald-300 block mb-1">3. Drop into AI</span>
                  <p className="text-[11px] text-slate-400">Copy with 1 click &amp; launch Gamma or Canva instantly.</p>
                </div>
              </div>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}

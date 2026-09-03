import React, { useState } from "react";
import Markdown from "react-markdown";
import { 
  Sparkles, Send, Bot, User, Settings, Check, 
  ArrowRight, BookOpen, Bookmark, FileText, Zap, RefreshCw, X, HelpCircle
} from "lucide-react";
import { SavedItem, CustomInstructions } from "../types";

interface AICoPilotProps {
  savedItems: SavedItem[];
  customInstructions: CustomInstructions;
  onUpdateCustomInstructions: (instructions: CustomInstructions) => void;
  onExecuteAgenticAction: (actionType: string, params: any) => void;
  onSaveItem: (type: any, title: string, data: any) => void;
}

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  action?: {
    type: string;
    title?: string;
    params?: any;
  };
}

export default function AICoPilot({
  savedItems,
  customInstructions,
  onUpdateCustomInstructions,
  onExecuteAgenticAction,
  onSaveItem
}: AICoPilotProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content: `Hello! I am your **EduOS Teacher AI Co-Pilot**.

I can assist you with:
- **Pedagogical Strategies & Teaching Methods** (e.g., differentiated instruction, classroom management, lesson hooks)
- **Analyzing your Saved Materials in Library** (ask me about your saved chapters, exam papers, lesson plans, or worksheets!)
- **Agentic Task Execution**: Ask me to generate resources like *"Create a 15-minute slip test on Photosynthesis"*, *"Draft a lesson plan for Fractions"*, or *"Build a worksheet on Quadratic Equations"*.

How can I support your teaching today?`
    }
  ]);

  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  // Custom instructions temporary form states
  const [ciLesson, setCiLesson] = useState(customInstructions.lessonPlan || "");
  const [ciWorksheet, setCiWorksheet] = useState(customInstructions.worksheet || "");
  const [ciExam, setCiExam] = useState(customInstructions.exam || "");
  const [ciSlipTest, setCiSlipTest] = useState(customInstructions.slipTest || "");
  const [ciTone, setCiTone] = useState(customInstructions.generalTone || "");
  const [ciSavedFeedback, setCiSavedFeedback] = useState(false);

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: CustomInstructions = {
      lessonPlan: ciLesson,
      worksheet: ciWorksheet,
      exam: ciExam,
      slipTest: ciSlipTest,
      generalTone: ciTone
    };
    onUpdateCustomInstructions(updated);
    setCiSavedFeedback(true);
    setTimeout(() => {
      setCiSavedFeedback(false);
      setShowSettings(false);
    }, 1200);
  };

  const handleSendMessage = async (queryText?: string) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: textToSend.trim()
    };

    setMessages(prev => [...prev, userMsg]);
    if (!queryText) setInputQuery("");
    setLoading(true);

    try {
      const chatHistory = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({
          role: m.role === "user" ? "user" : "model",
          content: m.content
        }));

      const res = await fetch("/api/edu/ai-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: textToSend.trim(),
          customInstructions,
          savedMaterials: savedItems,
          chatHistory
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to receive AI response");

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: data.text || "I have analyzed your request.",
        action: data.action && data.action.type !== "none" ? data.action : undefined
      };

      setMessages(prev => [...prev, botMsg]);
    } catch (err: any) {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: `⚠️ Error: ${err.message || "Failed to connect to AI assistant. Please try again."}`
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const quickPrompts = [
    "How should I introduce Newton's laws to Grade 7 students?",
    "Create a 10-slide presentation deck on Photosynthesis",
    "Generate a YouTube video script on Black Holes",
    "Create a 15-minute slip test on Electricity for Grade 8",
    "What topics are covered in my saved library materials?"
  ];

  return (
    <div className="space-y-6" id="ai_copilot_workspace">
      
      {/* Header Banner */}
      <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4" id="ai_copilot_header">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border border-indigo-500/30 uppercase tracking-wider flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              Teacher Co-Pilot & Agentic Assistant
            </span>
          </div>
          <h2 className="text-xl font-display font-bold text-white tracking-tight">
            Ask Pedagogy Questions or Execute Agentic Tasks
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Get instant teaching advice, query your saved materials library, or command the AI to generate curriculum resources using your custom preferences.
          </p>
        </div>

        <button
          id="btn_open_custom_instructions"
          onClick={() => setShowSettings(!showSettings)}
          className="px-4 py-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 text-indigo-200 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shrink-0 self-start md:self-center"
        >
          <Settings className="w-4 h-4 text-indigo-400" />
          <span>Custom Instructions</span>
        </button>
      </div>

      {/* Custom Instructions Panel */}
      {showSettings && (
        <div className="bg-slate-900/90 backdrop-blur-md p-6 rounded-2xl border border-indigo-500/30 shadow-2xl space-y-4 animate-fade-in" id="custom_instructions_panel">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5 text-indigo-400" />
              <h3 className="font-semibold text-white text-md">Set Custom Instructions for AI Generators</h3>
            </div>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Define default prompt guidelines and custom formatting rules for all generation tools. These instructions will automatically apply whenever you generate lesson plans, worksheets, exams, slip tests, or ask the AI Co-Pilot.
          </p>

          <form onSubmit={handleSaveSettings} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                  Lesson Plan Custom Instructions
                </label>
                <textarea
                  id="textarea_ci_lesson"
                  rows={2}
                  value={ciLesson}
                  onChange={(e) => setCiLesson(e.target.value)}
                  placeholder="e.g., Include 1 group activity, use 5E instructional model, focus on inquiry-based questions"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                  Worksheet Custom Instructions
                </label>
                <textarea
                  id="textarea_ci_worksheet"
                  rows={2}
                  value={ciWorksheet}
                  onChange={(e) => setCiWorksheet(e.target.value)}
                  placeholder="e.g., Include 2 real-world problem solving questions, ensure progressive difficulty"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                  Exam Question Paper Custom Instructions
                </label>
                <textarea
                  id="textarea_ci_exam"
                  rows={2}
                  value={ciExam}
                  onChange={(e) => setCiExam(e.target.value)}
                  placeholder="e.g., Follow Bloom's taxonomy with 30% HOTS, include complete step-by-step marking rubrics"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                  Slip Test Custom Instructions
                </label>
                <textarea
                  id="textarea_ci_sliptest"
                  rows={2}
                  value={ciSlipTest}
                  onChange={(e) => setCiSlipTest(e.target.value)}
                  placeholder="e.g., Keep test length strictly under 15 minutes, focus on core formula recall"
                  className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider mb-1">
                General Pedagogy Tone & Persona
              </label>
              <input
                id="input_ci_tone"
                type="text"
                value={ciTone}
                onChange={(e) => setCiTone(e.target.value)}
                placeholder="e.g., Supportive, encouraging, structured, STEM-focused"
                className="w-full px-3 py-2 rounded-lg border border-white/10 text-xs bg-slate-950 text-white placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                id="btn_save_custom_instructions"
                type="submit"
                className="px-5 py-2 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-md transition-all"
              >
                {ciSavedFeedback ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Saved Preferences!</span>
                  </>
                ) : (
                  <span>Save Custom Instructions</span>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Quick Prompt Chips */}
      <div className="flex flex-wrap items-center gap-2" id="ai_quick_prompts_row">
        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">Try Asking:</span>
        {quickPrompts.map((prompt, idx) => (
          <button
            key={idx}
            onClick={() => handleSendMessage(prompt)}
            disabled={loading}
            className="px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-xs text-slate-300 hover:text-white transition-all text-left truncate max-w-xs disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>

      {/* Chat Messages Feed */}
      <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 shadow-lg p-4 md:p-6 flex flex-col h-[520px]" id="ai_chat_container">
        
        <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar" id="ai_chat_feed">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex gap-3 text-sm ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] md:max-w-[75%] rounded-2xl p-4 text-xs md:text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-indigo-600 text-white rounded-br-none shadow-md"
                    : "bg-slate-900/80 border border-white/10 text-slate-200 rounded-bl-none shadow-md"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="markdown-body text-slate-200 space-y-2">
                    <Markdown>{msg.content}</Markdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}

                {/* Agentic Task Action Card */}
                {msg.action && (
                  <div className="mt-3 p-3.5 bg-indigo-500/15 border border-indigo-500/30 rounded-xl space-y-2">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                      <Zap className="w-4 h-4 text-amber-400" />
                      <span>Agentic Task Action Available</span>
                    </div>
                    <p className="text-xs text-slate-200">
                      <strong>Task:</strong> {msg.action.title || "Execute Requested Resource Generation"}
                    </p>
                    {msg.action.params && (
                      <p className="text-[11px] font-mono text-slate-400">
                        Params: {JSON.stringify(msg.action.params)}
                      </p>
                    )}
                    <button
                      onClick={() => onExecuteAgenticAction(msg.action!.type, msg.action!.params)}
                      className="mt-1 px-4 py-1.5 bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold rounded-lg flex items-center gap-2 shadow-md transition-all"
                    >
                      <span>Execute & Open Generator Tool</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {msg.role === "user" && (
                <div className="w-8 h-8 rounded-xl bg-slate-700 flex items-center justify-center text-slate-200 shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-3 text-xs text-indigo-300 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 w-fit animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>EduOS Co-Pilot is thinking and formulating response...</span>
            </div>
          )}
        </div>

        {/* Chat Input Bar */}
        <div className="pt-4 border-t border-white/10 mt-2" id="ai_chat_input_bar">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              id="input_ai_query"
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask pedagogy questions or command task e.g. 'Create a 15 min slip test on Electricity'..."
              disabled={loading}
              className="flex-1 px-4 py-3 rounded-xl border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900 text-white placeholder-slate-500 disabled:opacity-50"
            />
            <button
              id="btn_ai_send"
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-5 py-3 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-600 text-white rounded-xl font-medium text-sm transition-all flex items-center gap-2 shrink-0 shadow-md"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Ask AI</span>
            </button>
          </form>
        </div>

      </div>

    </div>
  );
}

import React, { useState } from "react";
import { 
  Heart, Sparkles, Send, RefreshCw, Clipboard, Check, HelpCircle 
} from "lucide-react";
import { safeFetchJson } from "../utils/apiUtils";

export default function ParentView() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Performance Report inputs
  const [studentSubjects, setStudentSubjects] = useState<string>("");
  const [recentMilestones, setRecentMilestones] = useState<string>("");
  const [strengthsOrInterests, setStrengthsOrInterests] = useState<string>("");
  const [progressSummary, setProgressSummary] = useState<string>("");

  // Parenting Advisor chat
  const [parentQuery, setParentQuery] = useState<string>("");
  const [chatLog, setChatLog] = useState<Array<{ role: 'user' | 'assistant', text: string }>>([
    { role: 'assistant', text: "Hello! I'm your Parent Advisor. Share your child's recent progress or ask any question about supportive study habits, managing exam stress, or encouragement methods." }
  ]);

  // Submit report to generate encouraging progress summary and advice
  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentSubjects.trim()) return;
    setLoading(true);
    setError(null);
    setProgressSummary("");
    try {
      const prompt = `Subjects: "${studentSubjects}". Recent results/grades: "${recentMilestones || "No specific grades provided"}". Strengths & Interests: "${strengthsOrInterests || "None specified"}". Generate an encouraging parent progress summary, positive study recommendations, constructive learning tips, and supportive feedback. Never compare children negatively. Ensure a warm, motivational, and helpful tone.`;

      const data = await safeFetchJson<{ text: string }>("/api/edu/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "parent",
          query: prompt,
          context: "Parent looking for supportive advice and academic recommendation guidelines."
        }),
      });
      setProgressSummary(data.text);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  // Submit advice query
  const handleChatSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!parentQuery.trim() || loading) return;

    const queryText = parentQuery;
    setParentQuery("");
    setLoading(true);
    setError(null);

    const updatedLog = [...chatLog, { role: 'user' as const, text: queryText }];
    setChatLog(updatedLog);

    try {
      const mappedHistory = updatedLog.slice(0, -1).map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        content: m.text
      }));

      const data = await safeFetchJson<{ text: string }>("/api/edu/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "parent",
          query: queryText,
          chatHistory: mappedHistory
        }),
      });
      setChatLog(prev => [...prev, { role: 'assistant', text: data.text }]);
    } catch (err: any) {
      setError(err.message || "Failed to get advice");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto px-4 py-2" id="parent_workspace">
      {/* Form Input Sidebar */}
      <div className="lg:w-1/2 space-y-6" id="parent_inputs_column">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-indigo-400 fill-indigo-400/10" id="icon_parent_heart" /> Parent Support & Learning Advisor
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Input your child's recent learning milestones, scores, or struggles. EduOS AI will generate constructive, highly positive feedback, custom study tips, and parenting advice.
          </p>

          <form onSubmit={handleReportSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Subjects child is studying</label>
              <input
                id="parent_input_subjects"
                type="text"
                value={studentSubjects}
                onChange={(e) => setStudentSubjects(e.target.value)}
                placeholder="e.g. Science, Grade 6 Maths, Literature"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Recent grades / Milestones / Struggles</label>
              <textarea
                id="parent_input_milestones"
                rows={2}
                value={recentMilestones}
                onChange={(e) => setRecentMilestones(e.target.value)}
                placeholder="e.g. Scored 85% in History, but struggling slightly with geometry shapes"
                className="w-full px-4 py-2 text-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Strengths / Unique Interests</label>
              <input
                id="parent_input_strengths"
                type="text"
                value={strengthsOrInterests}
                onChange={(e) => setStrengthsOrInterests(e.target.value)}
                placeholder="e.g. Loves drawing diagrams, highly curious about nature"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <button
              id="parent_btn_generate"
              type="submit"
              disabled={loading || !studentSubjects.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Generate Positive Progress Plan"}
            </button>
          </form>
        </div>

        {/* Progress Report Outcome */}
        {progressSummary && (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-4 animate-fade-in" id="parent_report_result">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <h3 className="font-semibold text-white text-base">Generated Progress Advice</h3>
            </div>
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap space-y-3 prose">
              {progressSummary}
            </div>
            <p className="text-xs text-slate-400 italic pt-2 border-t border-white/10">
              *All generated advice is supportive and avoids direct comparison with peers.
            </p>
          </div>
        )}
      </div>

      {/* Advisor Chat Sidebar */}
      <div className="flex-1 flex flex-col h-[520px] bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl shadow-lg" id="parent_chat_column">
        <div className="p-4 border-b border-white/10 bg-white/5 rounded-t-2xl">
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-400" /> Parenting & Study Coach Chat
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">Ask general questions about coaching techniques, positive study environments, or learning plans.</p>
        </div>

        {/* Chat log */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4" id="parent_chat_box">
          {chatLog.map((chat, idx) => (
            <div key={idx} className={`flex ${chat.role === 'user' ? 'justify-end' : 'justify-start'}`} id={`parent_chat_bubble_${idx}`}>
              <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed border ${chat.role === 'user' ? 'bg-indigo-600/80 text-white rounded-br-none border-indigo-500/30' : 'bg-white/10 text-slate-100 rounded-bl-none border-white/10'}`}>
                <p className="whitespace-pre-wrap">{chat.text}</p>
              </div>
            </div>
          ))}
          {loading && !progressSummary && (
            <div className="flex justify-start" id="parent_chat_loading">
              <div className="bg-white/10 text-slate-400 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 border border-white/10">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                <span>Coach is thinking...</span>
              </div>
            </div>
          )}
        </div>

        {/* Form Submission */}
        <form onSubmit={handleChatSubmit} className="p-3 border-t border-white/10 flex gap-2" id="parent_chat_form">
          <input
            id="parent_chat_input"
            type="text"
            value={parentQuery}
            onChange={(e) => setParentQuery(e.target.value)}
            placeholder="Ask anything (e.g. 'How can I encourage my child to study science?')"
            className="flex-1 px-4 py-2 text-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
          />
          <button
            id="parent_chat_send"
            type="submit"
            disabled={loading || !parentQuery.trim()}
            className="p-2 bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white rounded-lg transition-colors flex items-center justify-center shrink-0 shadow-md shadow-indigo-500/10"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}

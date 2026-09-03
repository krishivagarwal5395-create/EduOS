import React, { useState } from "react";
import { 
  BarChart2, Shield, RefreshCw, Send, Sparkles 
} from "lucide-react";

export default function AdminView() {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Admin insights inputs
  const [performanceMetrics, setPerformanceMetrics] = useState<string>("");
  const [difficultTopicsList, setDifficultTopicsList] = useState<string>("");
  const [teacherWorkloadMetrics, setTeacherWorkloadMetrics] = useState<string>("");
  const [insightsResult, setInsightsResult] = useState<string>("");

  // School Policy Inputs
  const [policyTopic, setPolicyTopic] = useState<string>("");
  const [policyDraft, setPolicyDraft] = useState<string>("");

  const handleInsightsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!performanceMetrics.trim()) return;
    setLoading(true);
    setError(null);
    setInsightsResult("");
    try {
      const prompt = `Student Performance Metrics: "${performanceMetrics}". Known difficult topics identified: "${difficultTopicsList || "None specified"}". Teacher workload metrics: "${teacherWorkloadMetrics || "None specified"}". Analyze this institutional data and provide structural insights: 1. Student Performance Trends, 2. Subject/Topic Specific Bottlenecks, 3. Suggested Improvements (curriculum adjustments, active recall practices), 4. Teacher Workload Balancing Recommendations. Provide a clean, highly professional, data-driven report layout.`;

      const res = await fetch("/api/edu/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "admin",
          query: prompt,
          context: "School Administrator seeking educational insights, curriculum analysis, and structural suggestions."
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate report");
      setInsightsResult(data.text);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handlePolicySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!policyTopic.trim()) return;
    setLoading(true);
    setError(null);
    setPolicyDraft("");
    try {
      const prompt = `Draft a high-quality, comprehensive school policy guide or parent newsletter draft about the following topic: "${policyTopic}". Deliver a structured policy outline, clear objectives, actionable implementation steps for teachers and students, and communication bullet-points for parents. Use formal and professional language.`;

      const res = await fetch("/api/edu/advisor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: "admin",
          query: prompt,
          context: "Administrator drafting school guidelines and official announcements."
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate policy");
      setPolicyDraft(data.text);
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-full max-w-7xl mx-auto px-4 py-2" id="admin_workspace">
      
      {/* Tab 1: Institutional Trends & Metrics */}
      <div className="lg:w-1/2 space-y-6" id="admin_insights_column">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-indigo-400" /> Institutional Metrics & Auditing
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Input student metrics or teacher workloads. EduOS AI will generate detailed performance trends, curriculum bottleneck analysis, and workload balancing guidelines.
          </p>

          <form onSubmit={handleInsightsSubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Student Performance / Scores Overview</label>
              <textarea
                id="admin_input_performance"
                rows={2}
                value={performanceMetrics}
                onChange={(e) => setPerformanceMetrics(e.target.value)}
                placeholder="e.g. Grade 9 Science averages dropped to 62%, Grade 10 Algebra exams show 35% of students failed trigonometry."
                className="w-full px-4 py-2 text-sm border border-white/10 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Difficult Topics Identified</label>
                <input
                  id="admin_input_difficult"
                  type="text"
                  value={difficultTopicsList}
                  onChange={(e) => setDifficultTopicsList(e.target.value)}
                  placeholder="e.g. Trigonometry, chemical bonding"
                  className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Teacher Workloads</label>
                <input
                  id="admin_input_workload"
                  type="text"
                  value={teacherWorkloadMetrics}
                  onChange={(e) => setTeacherWorkloadMetrics(e.target.value)}
                  placeholder="e.g. Core staff averaging 28 hours class time"
                  className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
                />
              </div>
            </div>

            <button
              id="admin_btn_generate_insights"
              type="submit"
              disabled={loading || !performanceMetrics.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Analyze Trends & Workload"}
            </button>
          </form>
        </div>

        {/* Insights Results */}
        {insightsResult && (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-4 animate-fade-in" id="admin_insights_report">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Institutional Performance Audit</h3>
            </div>
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap space-y-3 prose">
              {insightsResult}
            </div>
          </div>
        )}
      </div>

      {/* Tab 2: School Policy & Newsletter draft generator */}
      <div className="flex-1 space-y-6" id="admin_policy_column">
        <div className="bg-white/5 backdrop-blur-md p-6 rounded-2xl border border-white/10 shadow-lg space-y-4">
          <h2 className="text-xl font-semibold text-white tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-400" /> School Guideline & Announcement Writer
          </h2>
          <p className="text-sm text-slate-400 leading-relaxed">
            Generate formal administrative drafts for student-conduct codes, health/safety policies, teacher timetables, or parent informational letters.
          </p>

          <form onSubmit={handlePolicySubmit} className="space-y-4 pt-2">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">Policy / Newsletter Topic</label>
              <input
                id="admin_input_policy_topic"
                type="text"
                value={policyTopic}
                onChange={(e) => setPolicyTopic(e.target.value)}
                placeholder="e.g. Smart Device Usage Code, Safety Guidelines, Term 1 Wrap-up Newsletter"
                className="w-full px-4 py-2.5 rounded-lg border border-white/10 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-900/40 text-white placeholder-slate-500"
              />
            </div>

            <button
              id="admin_btn_generate_policy"
              type="submit"
              disabled={loading || !policyTopic.trim()}
              className="w-full bg-indigo-500 hover:bg-indigo-400 disabled:bg-white/5 disabled:text-slate-500 border border-white/5 text-white font-medium text-sm px-5 py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2 shadow-md shadow-indigo-500/10"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : "Draft Document"}
            </button>
          </form>
        </div>

        {policyDraft && (
          <div className="bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 p-6 shadow-lg space-y-4 animate-fade-in" id="admin_policy_result">
            <div className="flex items-center gap-2 border-b border-white/10 pb-3">
              <span className="inline-flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-pulse"></span>
              <h3 className="font-semibold text-white text-sm uppercase tracking-wider">Policy & Newsletter Draft</h3>
            </div>
            <div className="text-slate-200 text-sm leading-relaxed whitespace-pre-wrap space-y-3 prose">
              {policyDraft}
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

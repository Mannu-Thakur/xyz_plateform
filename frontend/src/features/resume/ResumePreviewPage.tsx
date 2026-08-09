import { useState, useRef, useMemo } from 'react';
import { useAuth } from '../auth/useAuth';
import { FEATURES } from '../../shared/config/features';
import { Button } from '../../shared/ui/button/Button';
import { useResumeData } from './hooks/useResumeData';
import { ResumeSection } from './components/ResumeSection';
import { DifficultyBar } from './components/DifficultyBar';
import { LanguageDonut, getLanguageColor } from './components/LanguageDonut';
import { request } from '../../shared/lib/api';
import { Upload, Sparkles, FileText, CheckCircle2, AlertTriangle, RefreshCw } from 'lucide-react';

/* ─── Icons (inline SVG) ────────────────────────────────── */

const IconChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6m6 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0h6m4 0v-4a2 2 0 00-2-2h-2a2 2 0 00-2 2v4m0 0h6" />
  </svg>
);
const IconCode = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
  </svg>
);
const IconTrophy = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 3h14l-1.405 8.431A5 5 0 0112.69 16H11.31a5 5 0 01-4.905-4.569L5 3zm3 18h8m-4-4v4" />
  </svg>
);
const IconFire = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
  </svg>
);
const IconPrint = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
  </svg>
);
const IconStar = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
  </svg>
);

interface AnalysisResult {
  ats_score: number;
  formatting_score: number;
  impact_score: number;
  skills_score: number;
  detected_role: string;
  summary: string;
  identified_skills: string[];
  missing_keywords: string[];
  strengths: string[];
  weaknesses: string[];
  actionable_recommendations: string[];
  bullet_improvements: Array<{ original: string; improved: string; reason: string }>;
}

/* ─── Loading shimmer ────────────────────────────────────── */

function LoadingShimmer() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-white/[0.04] rounded-lg" />
      <div className="bg-white/[0.02] rounded-2xl border border-white/[0.06] p-8 space-y-6">
        <div className="flex items-start gap-5">
          <div className="w-20 h-20 rounded-full bg-white/[0.04]" />
          <div className="flex-1 space-y-3">
            <div className="h-6 w-40 bg-white/[0.04] rounded" />
            <div className="h-4 w-24 bg-white/[0.04] rounded" />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <div key={i} className="h-16 bg-white/[0.04] rounded-lg" />)}
        </div>
        <div className="h-32 bg-white/[0.04] rounded-lg" />
      </div>
    </div>
  );
}

/* ─── Main Page ──────────────────────────────────────────── */

export function ResumePreviewPage() {
  const { user } = useAuth();
  const { stats, submissions, isLoading, isError } = useResumeData();
  const resumeRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI Resume Analyzer State
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [targetRole, setTargetRole] = useState('Software Engineer');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);

  // Derive language breakdown from submissions
  const languageBreakdown = useMemo(() => {
    if (!submissions?.length) return [];
    const counts: Record<string, number> = {};
    for (const sub of submissions) {
      if (sub.language) {
        counts[sub.language] = (counts[sub.language] || 0) + 1;
      }
    }
    return Object.entries(counts)
      .map(([name, count]) => ({ name, count, color: getLanguageColor(name) }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [submissions]);

  // Acceptance rate
  const acceptanceRate = useMemo(() => {
    if (!submissions?.length) return 0;
    const accepted = submissions.filter((s) => s.status === 'accepted').length;
    return Math.round((accepted / submissions.length) * 100);
  }, [submissions]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setAnalysisError(null);
    }
  };

  const handleAnalyzeResume = async () => {
    if (!selectedFile) {
      setAnalysisError('Please select a PDF or text resume file first.');
      return;
    }

    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('target_role', targetRole);

      const data = await request<AnalysisResult>('/resume/analyze', {
        method: 'POST',
        body: formData,
      });
      setAnalysisResult(data);
    } catch (err: any) {
      console.error('Resume Analysis Error:', err);
      setAnalysisError(err.response?.data?.detail || 'Failed to analyze resume. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  /* Guard: feature flag */
  if (!FEATURES.RESUME_EXPORT) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-gray-500">Resume export is currently disabled.</p>
      </div>
    );
  }

  if (!user) return null;

  if (isLoading) return <LoadingShimmer />;

  if (isError) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <p className="text-red-400">Failed to load resume data. Please try again.</p>
      </div>
    );
  }

  const displayName = user.fullName || user.username;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 animate-fade-in space-y-8">
      {/* Toolbar — hidden when printing */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-100 flex items-center gap-2.5">
            <FileText className="w-6 h-6 text-[#4F7DFF]" />
            AI Resume Analyzer & Profile
          </h1>
          <p className="text-sm text-gray-500 mt-1">Upload your resume for real AI ATS optimization + export your bugX coding profile</p>
        </div>
        <Button variant="primary" size="md" onClick={handlePrint}>
          <span className="flex items-center gap-2">
            <IconPrint />
            Print / Save Profile PDF
          </span>
        </Button>
      </div>

      {/* ─── Real AI Resume Upload & ATS Scanner Section ──────── */}
      <div className="rounded-2xl border border-[#4F7DFF]/20 bg-dark-panel p-6 space-y-6 shadow-xl relative overflow-hidden print:hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#4F7DFF]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between border-b border-dark-border pb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#4F7DFF]" />
            <h2 className="text-lg font-bold text-gray-100">Upload Resume for AI ATS Analysis</h2>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-[#4F7DFF]/10 text-[#4F7DFF] font-semibold border border-[#4F7DFF]/20">
            Powered by bugX AI Engine
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Target Role Selector */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-400">Target Role Category</label>
            <select
              value={targetRole}
              onChange={(e) => setTargetRole(e.target.value)}
              className="w-full px-3 py-2 bg-dark-bg border border-dark-border rounded-xl text-xs text-gray-200 focus:outline-none focus:border-[#4F7DFF]"
            >
              <option value="Software Engineer">Software Engineer (General)</option>
              <option value="Full Stack Developer">Full Stack Developer</option>
              <option value="Backend Engineer">Backend Engineer</option>
              <option value="Frontend Engineer">Frontend Engineer</option>
              <option value="DevOps / Infrastructure">DevOps / Cloud Engineer</option>
              <option value="Data Engineer / AI">Data Engineer / AI</option>
            </select>
          </div>

          {/* File Picker */}
          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-semibold text-gray-400">Upload PDF or Text Resume</label>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.txt,.md"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 px-4 py-2 bg-dark-bg border border-dashed border-dark-border hover:border-[#4F7DFF]/50 rounded-xl text-xs text-gray-300 flex items-center justify-center gap-2 transition-colors"
              >
                <Upload className="w-4 h-4 text-[#4F7DFF]" />
                <span className="truncate">{selectedFile ? selectedFile.name : 'Choose Resume (.pdf, .txt)'}</span>
              </button>

              <button
                type="button"
                onClick={handleAnalyzeResume}
                disabled={isAnalyzing || !selectedFile}
                className="px-5 py-2 bg-[#4F7DFF] hover:bg-[#3D6CE5] disabled:opacity-50 text-white rounded-xl text-xs font-bold flex items-center gap-2 shrink-0 transition-colors shadow-lg shadow-[#4F7DFF]/20"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Run AI Analysis
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {analysisError && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-center gap-2 text-xs text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{analysisError}</span>
          </div>
        )}

        {/* AI Analysis Result Output */}
        {analysisResult && (
          <div className="space-y-6 pt-4 border-t border-dark-border animate-fade-in">
            {/* Score Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-dark-bg border border-dark-border text-center">
                <p className="text-[10px] uppercase font-bold text-gray-500">Overall ATS Score</p>
                <p className={`text-2xl font-black font-mono mt-1 ${analysisResult.ats_score >= 75 ? 'text-emerald-400' : 'text-amber-400'}`}>
                  {analysisResult.ats_score}/100
                </p>
              </div>
              <div className="p-4 rounded-xl bg-dark-bg border border-dark-border text-center">
                <p className="text-[10px] uppercase font-bold text-gray-500">Skills Match</p>
                <p className="text-2xl font-black font-mono text-[#4F7DFF] mt-1">{analysisResult.skills_score}/100</p>
              </div>
              <div className="p-4 rounded-xl bg-dark-bg border border-dark-border text-center">
                <p className="text-[10px] uppercase font-bold text-gray-500">Impact Metrics</p>
                <p className="text-2xl font-black font-mono text-purple-400 mt-1">{analysisResult.impact_score}/100</p>
              </div>
              <div className="p-4 rounded-xl bg-dark-bg border border-dark-border text-center">
                <p className="text-[10px] uppercase font-bold text-gray-500">Formatting</p>
                <p className="text-2xl font-black font-mono text-teal-400 mt-1">{analysisResult.formatting_score}/100</p>
              </div>
            </div>

            {/* Summary */}
            <div className="p-4 rounded-xl bg-dark-bg/60 border border-dark-border space-y-1">
              <p className="text-xs font-bold text-gray-300">AI Profile Summary</p>
              <p className="text-xs text-gray-400 leading-relaxed">{analysisResult.summary}</p>
            </div>

            {/* Skills & Keyword Gaps */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2 p-4 rounded-xl bg-dark-bg/40 border border-dark-border">
                <p className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" /> Detected Technical Skills ({analysisResult.identified_skills.length})
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysisResult.identified_skills.map((skill, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-emerald-500/10 text-emerald-300 rounded-md text-[11px] font-mono border border-emerald-500/20">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              <div className="space-y-2 p-4 rounded-xl bg-dark-bg/40 border border-dark-border">
                <p className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" /> Recommended Keywords to Add
                </p>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {analysisResult.missing_keywords.map((keyword, idx) => (
                    <span key={idx} className="px-2.5 py-1 bg-amber-500/10 text-amber-300 rounded-md text-[11px] font-mono border border-amber-500/20">
                      + {keyword}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Bullet Point Improvement Suggestion */}
            {analysisResult.bullet_improvements?.length > 0 && (
              <div className="space-y-3 p-4 rounded-xl bg-dark-bg/40 border border-dark-border">
                <p className="text-xs font-bold text-[#4F7DFF] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" /> AI Quantifiable Bullet Rewrites
                </p>
                {analysisResult.bullet_improvements.map((bullet, idx) => (
                  <div key={idx} className="p-3 bg-dark-panel rounded-lg space-y-2 text-xs border border-dark-border">
                    <div className="flex items-start gap-2 text-red-400/80">
                      <span className="font-bold shrink-0">Before:</span>
                      <span className="line-through">{bullet.original}</span>
                    </div>
                    <div className="flex items-start gap-2 text-emerald-400 font-medium">
                      <span className="font-bold shrink-0">AI Improved:</span>
                      <span>{bullet.improved}</span>
                    </div>
                    <p className="text-[11px] text-gray-500 italic pl-16">Reason: {bullet.reason}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── Resume Coding Profile Card ────────────────────────── */}
      <div
        ref={resumeRef}
        id="resume-preview"
        className="relative rounded-2xl border border-white/[0.06] bg-white/[0.02] p-8 space-y-8 overflow-hidden print:bg-white print:text-black print:rounded-none print:border-gray-300 shadow-2xl"
      >
        {/* Accent bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#4F7DFF] via-[#7A5FFF] to-[#4F7DFF] opacity-60 rounded-t-2xl print:hidden" />

        {/* Header */}
        <div className="flex items-start gap-5 pb-6 border-b border-white/[0.06] print:border-gray-300">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#4F7DFF] to-[#7A5FFF] flex items-center justify-center text-white text-2xl font-bold shrink-0 ring-1 ring-white/[0.06] shadow-lg shadow-black/20 print:shadow-none">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={displayName} className="w-full h-full rounded-2xl object-cover" />
            ) : (
              user.username.charAt(0).toUpperCase()
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-2xl font-bold text-gray-100 print:text-black">
              {displayName}
            </h1>
            <p className="text-gray-500 text-sm font-mono print:text-gray-600">@{user.username}</p>
            {user.bio && (
              <p className="text-gray-400 text-sm mt-2 leading-relaxed print:text-gray-700">{user.bio}</p>
            )}
            <div className="flex flex-wrap items-center gap-3 mt-3">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#4F7DFF]/10 text-[#4F7DFF] rounded-full text-xs font-medium print:bg-blue-50 print:text-blue-700">
                <IconChart />
                Score: {stats?.total_score ?? 0}
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-xs font-medium print:bg-emerald-50 print:text-emerald-700">
                <IconFire />
                Streak: {stats?.current_streak ?? 0}d (best: {stats?.best_streak ?? 0}d)
              </span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <ResumeSection title="Problem Solving Stats" icon={<IconChart />}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-5">
            {[
              { label: 'Total Solved', value: stats?.total_solved ?? 0, accent: 'text-[#4F7DFF] print:text-blue-700' },
              { label: 'Easy', value: stats?.easy_solved ?? 0, accent: 'text-emerald-400 print:text-emerald-700' },
              { label: 'Medium', value: stats?.medium_solved ?? 0, accent: 'text-amber-400 print:text-yellow-700' },
              { label: 'Hard', value: stats?.hard_solved ?? 0, accent: 'text-rose-400 print:text-red-700' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-white/[0.04] bg-white/[0.015] p-3 text-center print:bg-gray-50 print:border-gray-200">
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold print:text-gray-500">{s.label}</p>
                <p className={`text-xl font-bold mt-0.5 font-mono ${s.accent}`}>{s.value}</p>
              </div>
            ))}
          </div>
          <DifficultyBar
            easy={stats?.easy_solved ?? 0}
            medium={stats?.medium_solved ?? 0}
            hard={stats?.hard_solved ?? 0}
            total={stats?.total_solved ?? 0}
          />
        </ResumeSection>

        {/* Acceptance Rate */}
        <ResumeSection title="Performance" icon={<IconTrophy />}>
          <div className="flex items-center gap-6">
            <div className="relative w-20 h-20 shrink-0">
              <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.04)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="none"
                  stroke={acceptanceRate >= 70 ? '#10b981' : acceptanceRate >= 40 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeDasharray={`${(acceptanceRate / 100) * 263.89} 263.89`}
                  strokeLinecap="round"
                  className="transition-all duration-1000"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-sm font-bold text-gray-100 print:text-black">{acceptanceRate}%</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-300 print:text-gray-700">Acceptance Rate</p>
              <p className="text-xs text-gray-500 mt-1">
                {submissions?.filter((s) => s.status === 'accepted').length ?? 0} accepted out of {submissions?.length ?? 0} submissions
              </p>
            </div>
          </div>
        </ResumeSection>

        {/* Languages */}
        <ResumeSection title="Languages Used" icon={<IconCode />}>
          {languageBreakdown.length > 0 ? (
            <LanguageDonut languages={languageBreakdown} />
          ) : (
            <p className="text-gray-500 text-sm">No submissions yet</p>
          )}
        </ResumeSection>

        {/* Top Submissions */}
        <ResumeSection title="Notable Submissions" icon={<IconStar />}>
          {submissions.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {submissions
                .filter((s) => s.status === 'accepted')
                .slice(0, 10)
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-2 rounded-xl border border-white/[0.04] bg-white/[0.015] text-sm print:bg-gray-50 print:border-gray-200"
                  >
                    <span className="text-gray-300 truncate print:text-gray-700">{s.problem_title || 'Problem'}</span>
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full capitalize shrink-0 ml-2 bg-white/[0.04] text-gray-400 font-mono print:bg-gray-100 print:text-gray-600">
                      {s.language}
                    </span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">No accepted submissions yet</p>
          )}
        </ResumeSection>

        {/* Footer */}
        <div className="pt-4 border-t border-white/[0.06] text-center print:border-gray-300">
          <p className="text-xs text-gray-600 print:text-gray-400">
            Generated from bugX · {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
      </div>
    </div>
  );
}

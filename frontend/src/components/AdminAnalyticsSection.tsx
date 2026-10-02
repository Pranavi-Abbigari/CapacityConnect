import React, { useEffect, useState } from 'react';
import type { InstitutionalAnalytics } from '../types';
import { analyticsApi } from '../api/client';
import { AdminReportExportModal } from './AdminReportExportModal';

export const AdminAnalyticsSection: React.FC = () => {
  const [analytics, setAnalytics] = useState<InstitutionalAnalytics | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await analyticsApi.getInstitutionalAnalytics();
      setAnalytics(data);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to load analytics';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center bg-slate-900/60 border border-slate-800 rounded-3xl animate-pulse">
        <div className="inline-block w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm text-slate-400">Loading institutional analytics & metrics...</p>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="p-8 text-center bg-rose-500/10 border border-rose-500/30 rounded-3xl">
        <p className="text-sm text-rose-400 mb-4">{error || 'Unable to display analytics'}</p>
        <button
          onClick={fetchAnalytics}
          className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer"
        >
          Try Again
        </button>
      </div>
    );
  }

  const { kpis, completion_metrics, grade_distribution, skill_intelligence, trainer_performance } =
    analytics;

  const totalGrades = Object.values(grade_distribution).reduce((acc, val) => acc + val, 0);

  return (
    <div className="space-y-8 animate-fade-in" id="admin-analytics-section">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              Institutional Intelligence
            </span>
            <span className="text-xs text-slate-400">• Live Database Telemetry</span>
          </div>
          <h2 className="text-2xl font-bold text-white tracking-tight mt-1">
            Platform Analytics & Performance
          </h2>
          <p className="text-xs text-slate-400">
            Real-time assessment results, completion ratios, skill gaps, and trainer metrics.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchAnalytics}
            title="Refresh Metrics"
            className="p-2.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 rounded-xl transition-colors cursor-pointer"
          >
            ↻ Refresh
          </button>
          <button
            id="open-report-export-modal-btn"
            onClick={() => setIsExportModalOpen(true)}
            className="px-4 py-2.5 text-xs font-semibold text-white bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>📥</span> Export CSV Reports
          </button>
        </div>
      </div>

      {/* 1. KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Total Learners */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Total Learners
          </div>
          <div className="mt-2 text-3xl font-extrabold text-white tracking-tight">
            {kpis.total_trainees}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-blue-400 font-medium">{kpis.total_users}</span> total platform users
          </div>
        </div>

        {/* Active Enrollments */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Active Enrollments
          </div>
          <div className="mt-2 text-3xl font-extrabold text-indigo-300 tracking-tight">
            {Math.max(0, kpis.total_enrollments - kpis.completed_enrollments)}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-indigo-400 font-medium">{kpis.total_enrollments}</span> all-time enrollments
          </div>
        </div>

        {/* Global Completion Rate */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Global Completion Rate
          </div>
          <div className="mt-2 text-3xl font-extrabold text-emerald-400 tracking-tight">
            {kpis.overall_completion_rate}%
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-medium">{kpis.completed_enrollments}</span> completed
          </div>
        </div>

        {/* Platform Quiz Average */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Platform Quiz Average
          </div>
          <div className="mt-2 text-3xl font-extrabold text-amber-300 tracking-tight">
            {kpis.platform_average_quiz_score}%
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-amber-400 font-medium">{kpis.total_attempts}</span> test attempts taken
          </div>
        </div>

        {/* Certificates Issued */}
        <div className="p-5 bg-slate-900/80 border border-slate-800 rounded-2xl shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-violet-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Certificates Issued
          </div>
          <div className="mt-2 text-3xl font-extrabold text-violet-300 tracking-tight">
            {kpis.total_certificates_issued}
          </div>
          <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
            <span className="text-emerald-400 font-medium">{kpis.active_certificates}</span> active
            {kpis.revoked_certificates > 0 && (
              <> • <span className="text-rose-400 font-medium">{kpis.revoked_certificates}</span> revoked</>
            )}
          </div>
        </div>
      </div>

      {/* 2. Course Completion Section & 3. Grade Distribution Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Course Completion Section (2 Cols) */}
        <div className="lg:col-span-2 bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Course Completion Performance
              </h3>
              <p className="text-xs text-slate-400">
                Enrollment counts, completion throughput, and average assessment scores per course.
              </p>
            </div>
            <span className="text-xs text-indigo-400 font-medium bg-indigo-500/10 px-3 py-1 rounded-full border border-indigo-500/20">
              {completion_metrics.length} Courses Tracked
            </span>
          </div>

          {completion_metrics.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No courses or enrollments recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Course Title</th>
                    <th className="pb-3 font-semibold">Trainer</th>
                    <th className="pb-3 font-semibold text-center">Enrolled</th>
                    <th className="pb-3 font-semibold text-center">Completed</th>
                    <th className="pb-3 font-semibold">Completion %</th>
                    <th className="pb-3 font-semibold text-right">Avg Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {completion_metrics.map((cm) => (
                    <tr key={cm.course_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-slate-200 pr-2">
                        {cm.course_title}
                      </td>
                      <td className="py-3 text-slate-400 pr-2">
                        {cm.trainer_name}
                      </td>
                      <td className="py-3 text-center text-slate-300 font-semibold">
                        {cm.total_enrolled}
                      </td>
                      <td className="py-3 text-center text-emerald-400 font-semibold">
                        {cm.completed_count}
                      </td>
                      <td className="py-3">
                        <div className="w-28 flex items-center gap-2">
                          <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-linear-to-r from-indigo-500 to-emerald-400 rounded-full transition-all duration-500"
                              style={{ width: `${Math.min(100, cm.completion_rate)}%` }}
                            />
                          </div>
                          <span className="text-[11px] font-semibold text-slate-300 w-10 text-right">
                            {cm.completion_rate}%
                          </span>
                        </div>
                      </td>
                      <td className="py-3 text-right font-bold text-indigo-300">
                        {cm.average_quiz_score > 0 ? `${cm.average_quiz_score}%` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* 3. Grade Distribution Card (1 Col) */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-white tracking-tight">
                Grade Distribution
              </h3>
              <span className="text-xs text-slate-400">
                {totalGrades} Recorded
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-6">
              Official assessment achievement tiers earned across all verified credentials and attempts.
            </p>

            <div className="space-y-3">
              {[
                { label: 'A+ (90-100%)', key: 'A+', color: 'bg-emerald-400', textColor: 'text-emerald-400' },
                { label: 'A (80-89%)', key: 'A', color: 'bg-teal-400', textColor: 'text-teal-400' },
                { label: 'B (70-79%)', key: 'B', color: 'bg-blue-400', textColor: 'text-blue-400' },
                { label: 'C (60-69%)', key: 'C', color: 'bg-amber-400', textColor: 'text-amber-400' },
                { label: 'Pass (50-59%)', key: 'Pass', color: 'bg-indigo-400', textColor: 'text-indigo-400' },
                { label: 'Fail (<50%)', key: 'Fail', color: 'bg-rose-500', textColor: 'text-rose-400' },
              ].map(({ label, key, color, textColor }) => {
                const count = grade_distribution[key] || 0;
                const percentage = totalGrades > 0 ? Math.round((count / totalGrades) * 100) : 0;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-semibold text-slate-300">{label}</span>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${textColor}`}>{count}</span>
                        <span className="text-[10px] text-slate-500">({percentage}%)</span>
                      </div>
                    </div>
                    <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full ${color} rounded-full transition-all duration-500`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Pass Threshold:</span>
            <span className="font-semibold text-slate-300">50.0% Minimum</span>
          </div>
        </div>
      </div>

      {/* 4. Skill Intelligence & 5. Trainer Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Skill Intelligence */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Skill Intelligence & Gaps
              </h3>
              <p className="text-xs text-slate-400">
                Most acquired proficiencies vs. top prerequisite competency gaps across enrolled learners.
              </p>
            </div>
            <span className="text-xl">🎯</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            {/* Most Acquired Skills */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-400 mb-3 flex items-center gap-1.5">
                <span>✦</span> Most Acquired Skills
              </h4>
              {skill_intelligence.most_acquired_skills.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No user skills registered yet.</p>
              ) : (
                <div className="space-y-2">
                  {skill_intelligence.most_acquired_skills.map((sk) => (
                    <div
                      key={sk.skill_id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-800/60 border border-slate-700/50"
                    >
                      <span className="text-slate-200 font-medium truncate max-w-[140px]" title={sk.skill_name}>
                        {sk.skill_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                        {sk.learner_count} {sk.learner_count === 1 ? 'learner' : 'learners'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Top Skill Gaps */}
            <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-400 mb-3 flex items-center gap-1.5">
                <span>⚠️</span> Top Competency Gaps
              </h4>
              {skill_intelligence.top_skill_gaps.length === 0 ? (
                <p className="text-xs text-slate-500 italic">No competency deficiencies detected.</p>
              ) : (
                <div className="space-y-2">
                  {skill_intelligence.top_skill_gaps.map((gap) => (
                    <div
                      key={gap.skill_id}
                      className="flex items-center justify-between text-xs p-2 rounded-xl bg-slate-800/60 border border-slate-700/50"
                    >
                      <span className="text-slate-200 font-medium truncate max-w-[140px]" title={gap.skill_name}>
                        {gap.skill_name}
                      </span>
                      <span className="px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-400 text-[11px] font-bold border border-rose-500/20">
                        {gap.gap_count} {gap.gap_count === 1 ? 'gap' : 'gaps'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 5. Trainer Performance */}
        <div className="bg-slate-900/80 border border-slate-800 p-6 rounded-3xl shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-white tracking-tight">
                Trainer Performance
              </h3>
              <p className="text-xs text-slate-400">
                Instructional throughput, student enrollment volume, and completion efficacy.
              </p>
            </div>
            <span className="text-xl">👨‍🏫</span>
          </div>

          {trainer_performance.length === 0 ? (
            <div className="p-8 text-center text-slate-500 text-xs">
              No registered trainers with authored courses.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="pb-3 font-semibold">Trainer Name</th>
                    <th className="pb-3 font-semibold text-center">Courses</th>
                    <th className="pb-3 font-semibold text-center">Students</th>
                    <th className="pb-3 font-semibold text-center">Avg Score</th>
                    <th className="pb-3 font-semibold text-right">Completion %</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {trainer_performance.map((tp) => (
                    <tr key={tp.trainer_id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-slate-200">
                        {tp.trainer_name}
                      </td>
                      <td className="py-3 text-center text-indigo-300 font-semibold">
                        {tp.total_courses}
                      </td>
                      <td className="py-3 text-center text-slate-300 font-semibold">
                        {tp.total_students}
                      </td>
                      <td className="py-3 text-center font-bold text-amber-300">
                        {tp.average_student_score > 0 ? `${tp.average_student_score}%` : '—'}
                      </td>
                      <td className="py-3 text-right">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                            tp.completion_rate >= 70
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : tp.completion_rate >= 40
                              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {tp.completion_rate}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 6. Report Export Modal */}
      <AdminReportExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
      />
    </div>
  );
};

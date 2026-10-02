import React, { useState, useEffect } from 'react';
import { competenciesApi, coursesApi } from '../api/client';
import type {
  TraineeCourseSkillGap,
  TraineeOverallSkillGap,
  Course,
  CourseEnrollment,
  ProficiencyLevel,
} from '../types';

interface TraineeSkillGapSectionProps {
  onEnrollSuccess?: () => void;
}

export const TraineeSkillGapSection: React.FC<TraineeSkillGapSectionProps> = ({ onEnrollSuccess }) => {
  const [overallGap, setOverallGap] = useState<TraineeOverallSkillGap | null>(null);
  const [availableCourses, setAvailableCourses] = useState<Course[]>([]);
  const [enrolledCourses, setEnrolledCourses] = useState<CourseEnrollment[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null);
  const [selectedCourseGap, setSelectedCourseGap] = useState<TraineeCourseSkillGap | null>(null);

  const [loading, setLoading] = useState(true);
  const [analyzingCourse, setAnalyzingCourse] = useState(false);
  const [enrollingId, setEnrollingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [gapData, allCourses, enrollments] = await Promise.all([
        competenciesApi.getTraineeOverallSkillGap().catch(() => null),
        coursesApi.getCourses().catch(() => []),
        coursesApi.getMyEnrolledCourses().catch(() => []),
      ]);

      setOverallGap(gapData);
      setAvailableCourses(allCourses);
      setEnrolledCourses(enrollments);

      // Default to first enrolled course or first available course
      const firstId =
        (enrollments.length > 0 && enrollments[0].course_id) ||
        (allCourses.length > 0 ? allCourses[0].id : null);

      if (firstId) {
        setSelectedCourseId(firstId);
        const courseGap = await competenciesApi.getTraineeCourseSkillGap(firstId).catch(() => null);
        setSelectedCourseGap(courseGap);
      }
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to load skill-gap analysis', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectCourse = async (courseId: number) => {
    setSelectedCourseId(courseId);
    setAnalyzingCourse(true);
    setFeedback(null);
    try {
      const gap = await competenciesApi.getTraineeCourseSkillGap(courseId);
      setSelectedCourseGap(gap);
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to analyze course skill gap', type: 'error' });
    } finally {
      setAnalyzingCourse(false);
    }
  };

  const handleEnrollInRecommendation = async (courseId: number) => {
    setEnrollingId(courseId);
    setFeedback(null);
    try {
      await coursesApi.enrollCourse(courseId);
      setFeedback({ text: 'Successfully enrolled in recommendation bridge module!', type: 'success' });
      await loadData();
      if (onEnrollSuccess) onEnrollSuccess();
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Enrollment failed', type: 'error' });
    } finally {
      setEnrollingId(null);
    }
  };

  const getProficiencyColor = (level: ProficiencyLevel) => {
    switch (level) {
      case 'Expert':
        return 'text-amber-300 bg-amber-950 border-amber-800';
      case 'Advanced':
        return 'text-indigo-300 bg-indigo-950 border-indigo-800';
      case 'Intermediate':
        return 'text-cyan-300 bg-cyan-950 border-cyan-800';
      case 'Beginner':
      default:
        return 'text-emerald-300 bg-emerald-950 border-emerald-800';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
        <p className="text-slate-400 text-sm">Evaluating competency mapping &amp; skill gaps...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {feedback && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium border ${
            feedback.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {feedback.text}
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
              Curriculum Match
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-emerald-400">
                {overallGap ? `${overallGap.average_match_percentage}%` : 'N/A'}
              </span>
              <span className="text-xs text-slate-400">baseline score</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
            ✓
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
              Identified Skill Gaps
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-amber-400">
                {overallGap ? overallGap.all_gap_skills.length : 0}
              </span>
              <span className="text-xs text-slate-400">skills to develop</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-600/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-lg">
            ⚡
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-bold text-slate-400 block tracking-wider">
              Bridge Recommendations
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-indigo-400">
                {overallGap ? overallGap.curated_recommendations.length : 0}
              </span>
              <span className="text-xs text-slate-400">relevant modules</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-bold text-lg">
            ★
          </div>
        </div>
      </div>

      {/* Target Course Selector & Detailed Analysis */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-800 pb-5">
          <div>
            <h3 className="text-lg font-bold text-white">Course Competency Alignment</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Select any program to benchmark your existing skills against required course prerequisites.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-slate-400">Target Module:</span>
            <select
              value={selectedCourseId || ''}
              onChange={(e) => handleSelectCourse(Number(e.target.value))}
              className="bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
            >
              {availableCourses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {analyzingCourse ? (
          <div className="py-12 text-center text-slate-400 text-xs">Computing competency match...</div>
        ) : selectedCourseGap ? (
          <div className="space-y-6">
            {/* Match Header Banner */}
            <div className="bg-slate-850 border border-slate-750 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800">
                  Target Course Analysis
                </span>
                <h4 className="text-xl font-bold text-white mt-1">{selectedCourseGap.course_title}</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Total Prerequisites: {selectedCourseGap.total_competencies} skills evaluated
                </p>
              </div>

              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Readiness Score
                  </span>
                  <span
                    className={`text-2xl font-black ${
                      selectedCourseGap.match_percentage >= 70
                        ? 'text-emerald-400'
                        : selectedCourseGap.match_percentage >= 40
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {selectedCourseGap.match_percentage}%
                  </span>
                </div>
                <div
                  className={`w-14 h-14 rounded-2xl flex items-center justify-center font-black text-sm border ${
                    selectedCourseGap.match_percentage >= 70
                      ? 'bg-emerald-950/80 border-emerald-600 text-emerald-400'
                      : selectedCourseGap.match_percentage >= 40
                      ? 'bg-amber-950/80 border-amber-600 text-amber-400'
                      : 'bg-rose-950/80 border-rose-600 text-rose-400'
                  }`}
                >
                  {selectedCourseGap.match_percentage >= 70
                    ? 'READY'
                    : selectedCourseGap.match_percentage >= 40
                    ? 'PARTIAL'
                    : 'GAPS'}
                </div>
              </div>
            </div>

            {/* Competency Breakdown Columns */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Column 1: Matched Skills */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">
                    Matched Skills ({selectedCourseGap.matched_count})
                  </span>
                  <span className="text-xs font-bold text-emerald-400">✓</span>
                </div>
                {selectedCourseGap.matched_skills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No fully matched competencies yet.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCourseGap.matched_skills.map((item) => (
                      <div key={item.skill_id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-white">{item.skill_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getProficiencyColor(
                              item.trainee_proficiency || 'Beginner'
                            )}`}
                          >
                            {item.trainee_proficiency}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">Req: {item.required_proficiency}</p>
                        <p className="text-[10px] text-emerald-400/90 font-medium mt-1">{item.gap_message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 2: Insufficient Skills */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                  <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                    Needs Improvement ({selectedCourseGap.insufficient_count})
                  </span>
                  <span className="text-xs font-bold text-amber-400">▲</span>
                </div>
                {selectedCourseGap.insufficient_skills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No partial proficiencies found.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCourseGap.insufficient_skills.map((item) => (
                      <div key={item.skill_id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-white">{item.skill_name}</span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getProficiencyColor(
                              item.trainee_proficiency || 'Beginner'
                            )}`}
                          >
                            You: {item.trainee_proficiency}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Target Required: <span className="font-bold text-amber-300">{item.required_proficiency}</span>
                        </p>
                        <p className="text-[10px] text-amber-400/90 font-medium mt-1">{item.gap_message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Column 3: Missing Skills */}
              <div className="bg-slate-800/40 border border-slate-700/60 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-slate-700/50">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">
                    Missing Skills ({selectedCourseGap.missing_count})
                  </span>
                  <span className="text-xs font-bold text-rose-400">✕</span>
                </div>
                {selectedCourseGap.missing_skills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-4 text-center">No missing prerequisites.</p>
                ) : (
                  <div className="space-y-2.5">
                    {selectedCourseGap.missing_skills.map((item) => (
                      <div key={item.skill_id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-3 text-xs">
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span className="font-bold text-white">{item.skill_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                            Missing
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300">
                          Prerequisite: <span className="font-bold text-rose-300">{item.required_proficiency}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 mt-1">{item.gap_message}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Bridge Modules */}
            <div className="pt-4 border-t border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span>Targeted Course Recommendations</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-950 text-indigo-300 border border-indigo-800">
                      {selectedCourseGap.recommendations.length} available
                    </span>
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Platform curriculum tailored directly to bridge your diagnosed prerequisite gaps.
                  </p>
                </div>
              </div>

              {selectedCourseGap.recommendations.length === 0 ? (
                <div className="bg-slate-950/40 border border-slate-800/80 rounded-2xl p-8 text-center">
                  <p className="text-xs text-slate-400">
                    {selectedCourseGap.missing_count === 0 && selectedCourseGap.insufficient_count === 0
                      ? 'You meet all prerequisites for this course. No bridge modules needed!'
                      : 'No other platform courses currently map to these specific gap competencies.'}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedCourseGap.recommendations.map((rec) => {
                    const isAlreadyEnrolled = enrolledCourses.some((e) => e.course_id === rec.course_id);
                    return (
                      <div
                        key={rec.course_id}
                        className="bg-slate-800/60 border border-slate-700 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <h5 className="text-sm font-bold text-white leading-snug">{rec.title}</h5>
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-950 text-indigo-300 border border-indigo-800 shrink-0">
                              Bridge Module
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 line-clamp-2 mb-3">
                            {rec.description || 'Comprehensive learning content designed to build prerequisite capacities.'}
                          </p>
                          <div className="flex flex-wrap gap-1.5 mb-3">
                            {rec.skills_covered.map((s, idx) => (
                              <span
                                key={idx}
                                className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-slate-900 text-slate-300 border border-slate-700"
                              >
                                {s}
                              </span>
                            ))}
                          </div>
                          <p className="text-[11px] text-slate-400 italic bg-slate-900/60 rounded-xl p-2 border border-slate-800">
                            {rec.reason}
                          </p>
                        </div>

                        <div className="mt-4 pt-3 border-t border-slate-700/50 flex justify-end">
                          {isAlreadyEnrolled ? (
                            <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                              ✓ Enrolled
                            </span>
                          ) : (
                            <button
                              onClick={() => handleEnrollInRecommendation(rec.course_id)}
                              disabled={enrollingId === rec.course_id}
                              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/20 cursor-pointer"
                            >
                              {enrollingId === rec.course_id ? 'Enrolling...' : 'Enroll to Bridge Gap →'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="py-12 text-center text-slate-500 text-xs">
            No course selected for skill-gap evaluation.
          </div>
        )}
      </div>
    </div>
  );
};

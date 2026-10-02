import React, { useState, useEffect } from 'react';
import { competenciesApi } from '../api/client';
import type { Course, CourseTrainerMatchingResponse, ProficiencyLevel } from '../types';

interface TrainerMatchingModalProps {
  course: Course;
  onClose: () => void;
  isAdmin?: boolean;
}

export const TrainerMatchingModal: React.FC<TrainerMatchingModalProps> = ({
  course,
  onClose,
  isAdmin = false,
}) => {
  const [data, setData] = useState<CourseTrainerMatchingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedTrainerId, setExpandedTrainerId] = useState<number | null>(null);

  useEffect(() => {
    const fetchMatches = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = isAdmin
          ? await competenciesApi.getAdminTrainerMatching(course.id)
          : await competenciesApi.getCourseTrainerMatches(course.id);
        setData(res);
        if (res.ranked_trainers.length > 0) {
          setExpandedTrainerId(res.ranked_trainers[0].trainer_id);
        }
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Failed to evaluate trainer matching');
      } finally {
        setLoading(false);
      }
    };

    fetchMatches();
  }, [course.id, isAdmin]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-3xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
              Trainer Matching Algorithm
            </span>
            <h3 className="text-lg font-bold text-white mt-1">Instructor Fit: {course.title}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto py-5 space-y-6">
          {loading ? (
            <div className="text-center py-16 text-slate-400 text-sm">
              Calculating instructor competency alignment...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs">
              {error}
            </div>
          ) : data ? (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Required Competencies
                  </span>
                  <span className="text-xl font-black text-white">{data.required_competencies_count}</span>
                </div>
                <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Trainers Evaluated
                  </span>
                  <span className="text-xl font-black text-indigo-400">{data.total_trainers_evaluated}</span>
                </div>
                <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">
                    Top Match Score
                  </span>
                  <span className="text-xl font-black text-emerald-400">
                    {data.ranked_trainers.length > 0 ? `${data.ranked_trainers[0].match_percentage}%` : 'N/A'}
                  </span>
                </div>
              </div>

              {/* Requirements Bar */}
              {data.required_competencies.length > 0 && (
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-3.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                    Course Target Competency Profile
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {data.required_competencies.map((c) => (
                      <span
                        key={c.id}
                        className="px-2.5 py-1 rounded-xl text-xs bg-slate-900 border border-slate-700 text-slate-200 flex items-center gap-1.5"
                      >
                        <span className="font-semibold">{c.skill?.name || 'Skill'}</span>
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md border font-bold ${getProficiencyColor(c.min_proficiency)}`}>
                          {c.min_proficiency}
                        </span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranked Trainers List */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                  Ranked Matching Trainers
                </h4>

                {data.ranked_trainers.length === 0 ? (
                  <div className="text-center py-8 text-slate-500 text-xs bg-slate-950/40 rounded-2xl border border-slate-800">
                    No approved trainers available for evaluation.
                  </div>
                ) : (
                  data.ranked_trainers.map((t, idx) => {
                    const isExpanded = expandedTrainerId === t.trainer_id;
                    return (
                      <div
                        key={t.trainer_id}
                        className="bg-slate-850 border border-slate-750 rounded-2xl p-4 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="w-7 h-7 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                              #{idx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <h5 className="text-sm font-bold text-white">{t.trainer_name}</h5>
                                {t.specialization && (
                                  <span className="text-[10px] px-2 py-0.2 bg-indigo-950 text-indigo-300 border border-indigo-800 rounded-md font-semibold">
                                    {t.specialization}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-400">
                                {t.trainer_email} {t.qualification ? `• ${t.qualification}` : ''}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-lg font-black text-emerald-400">
                                {t.match_percentage}%
                              </span>
                              <span className="text-[10px] text-slate-400 block font-medium">
                                {t.matched_skills_count}/{t.total_skills_count} matched
                              </span>
                            </div>
                            <button
                              onClick={() => setExpandedTrainerId(isExpanded ? null : t.trainer_id)}
                              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-semibold border border-slate-700 cursor-pointer"
                            >
                              {isExpanded ? 'Hide Details' : 'View Fit'}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Competency Alignment Details */}
                        {isExpanded && (
                          <div className="mt-4 pt-4 border-t border-slate-750 space-y-3 text-xs">
                            {/* Matched */}
                            {t.matched_competencies.length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-emerald-400 block mb-1.5">
                                  ✓ Matched Expertise ({t.matched_competencies.length}):
                                </span>
                                <div className="space-y-1.5">
                                  {t.matched_competencies.map((c) => (
                                    <div
                                      key={c.skill_id}
                                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                                    >
                                      <span className="font-semibold text-white">{c.skill_name}</span>
                                      <span className="text-emerald-400 font-medium">
                                        Trainer has {c.trainer_proficiency} (Required: {c.required_proficiency})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Insufficient */}
                            {t.insufficient_competencies.length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-amber-400 block mb-1.5">
                                  ▲ Insufficient Mastery ({t.insufficient_competencies.length}):
                                </span>
                                <div className="space-y-1.5">
                                  {t.insufficient_competencies.map((c) => (
                                    <div
                                      key={c.skill_id}
                                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                                    >
                                      <span className="font-semibold text-white">{c.skill_name}</span>
                                      <span className="text-amber-400 font-medium">
                                        Trainer has {c.trainer_proficiency} &lt; Required: {c.required_proficiency}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Missing */}
                            {t.missing_competencies.length > 0 && (
                              <div>
                                <span className="text-[11px] font-bold text-rose-400 block mb-1.5">
                                  ✕ Missing Skill Declaration ({t.missing_competencies.length}):
                                </span>
                                <div className="space-y-1.5">
                                  {t.missing_competencies.map((c) => (
                                    <div
                                      key={c.skill_id}
                                      className="p-2 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between"
                                    >
                                      <span className="font-semibold text-slate-300">{c.skill_name}</span>
                                      <span className="text-rose-400 font-medium">
                                        Not listed in trainer profile (Required: {c.required_proficiency})
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </>
          ) : null}
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close Matching View
          </button>
        </div>
      </div>
    </div>
  );
};

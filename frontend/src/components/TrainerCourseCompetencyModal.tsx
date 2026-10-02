import React, { useState, useEffect } from 'react';
import { competenciesApi, profilesApi } from '../api/client';
import type { Course, CourseCompetency, Skill, ProficiencyLevel } from '../types';

interface TrainerCourseCompetencyModalProps {
  course: Course;
  onClose: () => void;
  onOpenMatching?: (course: Course) => void;
}

export const TrainerCourseCompetencyModal: React.FC<TrainerCourseCompetencyModalProps> = ({
  course,
  onClose,
  onOpenMatching,
}) => {
  const [competencies, setCompetencies] = useState<CourseCompetency[]>([]);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Add requirement form
  const [selectedSkillId, setSelectedSkillId] = useState<number | ''>('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [category, setCategory] = useState('');
  const [minProficiency, setMinProficiency] = useState<ProficiencyLevel>('Intermediate');
  const [weight, setWeight] = useState<number>(1);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadData = async () => {
    setLoading(true);
    try {
      const [compList, skillList] = await Promise.all([
        competenciesApi.getCourseCompetencies(course.id),
        profilesApi.getSkills(),
      ]);
      setCompetencies(compList);
      setCatalog(skillList);
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to load competencies', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [course.id]);

  const handleAddCompetency = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setFeedback(null);
    try {
      if (selectedSkillId) {
        await competenciesApi.addCourseCompetency(course.id, {
          skill_id: Number(selectedSkillId),
          min_proficiency: minProficiency,
          weight: Number(weight),
        });
      } else if (customSkillName.trim()) {
        await competenciesApi.addCourseCompetency(course.id, {
          skill_name: customSkillName.trim(),
          category: category.trim() || 'General',
          min_proficiency: minProficiency,
          weight: Number(weight),
        });
      } else {
        throw new Error('Please select a skill or specify a custom skill name.');
      }

      setFeedback({ text: 'Prerequisite competency requirement added to course!', type: 'success' });
      setSelectedSkillId('');
      setCustomSkillName('');
      setCategory('');
      setWeight(1);
      setMinProficiency('Intermediate');
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to add competency requirement', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteCompetency = async (competencyId: number) => {
    if (!confirm('Remove this competency requirement from the course?')) return;
    setDeletingId(competencyId);
    setFeedback(null);
    try {
      await competenciesApi.deleteCourseCompetency(course.id, competencyId);
      setFeedback({ text: 'Competency requirement removed.', type: 'success' });
      await loadData();
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to remove requirement', type: 'error' });
    } finally {
      setDeletingId(null);
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-950 px-2.5 py-0.5 rounded-full border border-indigo-800">
              Competency Requirements
            </span>
            <h3 className="text-lg font-bold text-white mt-1">{course.title}</h3>
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
          {feedback && (
            <div
              className={`p-3.5 rounded-xl text-xs font-medium border ${
                feedback.type === 'success'
                  ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border-rose-800 text-rose-300'
              }`}
            >
              {feedback.text}
            </div>
          )}

          {/* Form to Add Required Competency */}
          <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              Add Prerequisite Competency Requirement
            </h4>

            <form onSubmit={handleAddCompetency} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  Choose from Platform Catalog
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSkillId(val ? Number(val) : '');
                    if (val) setCustomSkillName('');
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Or enter custom skill below --</option>
                  {catalog.map((catSkill) => (
                    <option key={catSkill.id} value={catSkill.id}>
                      {catSkill.name} {catSkill.category ? `(${catSkill.category})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              {!selectedSkillId && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Custom Skill Name
                    </label>
                    <input
                      type="text"
                      value={customSkillName}
                      onChange={(e) => setCustomSkillName(e.target.value)}
                      placeholder="e.g. Docker, GraphQL"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Skill Category
                    </label>
                    <input
                      type="text"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      placeholder="e.g. DevOps, Infrastructure"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Minimum Required Proficiency
                  </label>
                  <select
                    value={minProficiency}
                    onChange={(e) => setMinProficiency(e.target.value as ProficiencyLevel)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="Beginner">Beginner (Foundational)</option>
                    <option value="Intermediate">Intermediate (Practitioner)</option>
                    <option value="Advanced">Advanced (Senior)</option>
                    <option value="Expert">Expert (Master / Lead)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                    Weight / Priority (1 - 5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={weight}
                    onChange={(e) => setWeight(Math.max(1, Number(e.target.value)))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-1 flex justify-end">
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {submitting ? 'Adding...' : '+ Add Competency'}
                </button>
              </div>
            </form>
          </div>

          {/* List of Configured Requirements */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Current Course Prerequisites ({competencies.length})
              </h4>
              {onOpenMatching && competencies.length > 0 && (
                <button
                  onClick={() => onOpenMatching(course)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  <span>Evaluate Trainer Matches →</span>
                </button>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8 text-slate-500 text-xs">Loading course competencies...</div>
            ) : competencies.length === 0 ? (
              <div className="text-center py-8 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
                <p className="text-xs text-slate-400">No prerequisites defined yet for this course.</p>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Add competency requirements above to enable trainee skill-gap analysis and instructor matching.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {competencies.map((comp) => (
                  <div
                    key={comp.id}
                    className="bg-slate-800/60 border border-slate-700/80 rounded-xl p-3 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white">{comp.skill?.name || 'Skill'}</span>
                        {comp.skill?.category && (
                          <span className="text-[10px] text-slate-400">({comp.skill.category})</span>
                        )}
                        <span className="text-[10px] text-slate-400 font-mono">Weight: {comp.weight}</span>
                      </div>
                      <span className="text-[11px] text-slate-400 block mt-0.5">
                        Minimum Requirement:
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getProficiencyColor(
                          comp.min_proficiency
                        )}`}
                      >
                        {comp.min_proficiency}
                      </span>
                      <button
                        onClick={() => handleDeleteCompetency(comp.id)}
                        disabled={deletingId === comp.id}
                        className="text-xs font-semibold text-rose-400 hover:text-rose-300 disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {deletingId === comp.id ? '...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono">
            {competencies.length} Competencies Active
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

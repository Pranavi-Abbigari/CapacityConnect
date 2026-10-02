import React, { useState, useEffect } from 'react';
import { profilesApi } from '../api/client';
import type { TrainerProfile, Skill, UserSkill, ProficiencyLevel } from '../types';

interface TrainerProfileSectionProps {
  onProfileUpdated?: () => void;
}

export const TrainerProfileSection: React.FC<TrainerProfileSectionProps> = ({ onProfileUpdated }) => {
  const [profile, setProfile] = useState<TrainerProfile | null>(null);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile form state
  const [qualification, setQualification] = useState('');
  const [specialization, setSpecialization] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [expertiseSummary, setExpertiseSummary] = useState('');

  // Skill addition state
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<number | ''>('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('Expert');
  const [evidence, setEvidence] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillActionLoading, setSkillActionLoading] = useState<number | null>(null);

  // Edit skill proficiency modal
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [editProficiency, setEditProficiency] = useState<ProficiencyLevel>('Expert');
  const [editEvidence, setEditEvidence] = useState('');
  const [updatingSkill, setUpdatingSkill] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profData, catalogData] = await Promise.all([
        profilesApi.getTrainerProfile(),
        profilesApi.getSkills(),
      ]);
      setProfile(profData);
      setCatalog(catalogData);
      setQualification(profData.qualification || '');
      setSpecialization(profData.specialization || '');
      setWorkExperience(profData.work_experience || '');
      setExpertiseSummary(profData.expertise_summary || '');
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to load trainer profile data', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMessage(null);
    try {
      const updated = await profilesApi.updateTrainerProfile({
        qualification: qualification.trim() || undefined,
        specialization: specialization.trim() || undefined,
        work_experience: workExperience.trim() || undefined,
        expertise_summary: expertiseSummary.trim() || undefined,
      });
      setProfile(updated);
      setProfileMessage({ text: 'Trainer expertise profile successfully updated!', type: 'success' });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to save trainer profile', type: 'error' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleAddSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddingSkill(true);
    setProfileMessage(null);
    try {
      if (selectedSkillId) {
        await profilesApi.addTrainerSkill({
          skill_id: Number(selectedSkillId),
          proficiency,
          evidence: evidence.trim() || undefined,
        });
      } else if (customSkillName.trim()) {
        await profilesApi.addTrainerSkill({
          skill_name: customSkillName.trim(),
          category: skillCategory.trim() || 'General',
          proficiency,
          evidence: evidence.trim() || undefined,
        });
      } else {
        throw new Error('Please select a skill from the catalog or specify a custom skill name.');
      }

      setProfileMessage({ text: 'Expertise skill added to your profile!', type: 'success' });
      setIsAddSkillOpen(false);
      setSelectedSkillId('');
      setCustomSkillName('');
      setSkillCategory('');
      setEvidence('');
      setProficiency('Expert');
      await loadData();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to add skill', type: 'error' });
    } finally {
      setAddingSkill(false);
    }
  };

  const handleUpdateSkill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSkill) return;
    setUpdatingSkill(true);
    try {
      await profilesApi.updateTrainerSkill(editingSkill.id, {
        proficiency: editProficiency,
        evidence: editEvidence.trim() || undefined,
      });
      setProfileMessage({ text: 'Expertise proficiency updated!', type: 'success' });
      setEditingSkill(null);
      await loadData();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to update skill', type: 'error' });
    } finally {
      setUpdatingSkill(false);
    }
  };

  const handleDeleteSkill = async (userSkillId: number, skillName?: string) => {
    if (!confirm(`Are you sure you want to remove "${skillName || 'this skill'}" from your expertise?`)) {
      return;
    }
    setSkillActionLoading(userSkillId);
    setProfileMessage(null);
    try {
      await profilesApi.deleteTrainerSkill(userSkillId);
      setProfileMessage({ text: 'Expertise skill removed.', type: 'success' });
      await loadData();
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to remove skill', type: 'error' });
    } finally {
      setSkillActionLoading(null);
    }
  };

  const getProficiencyBadge = (level: ProficiencyLevel) => {
    switch (level) {
      case 'Expert':
        return 'bg-amber-950 text-amber-300 border-amber-700/60';
      case 'Advanced':
        return 'bg-indigo-950 text-indigo-300 border-indigo-700/60';
      case 'Intermediate':
        return 'bg-cyan-950 text-cyan-300 border-cyan-700/60';
      case 'Beginner':
      default:
        return 'bg-emerald-950 text-emerald-300 border-emerald-700/60';
    }
  };

  if (loading) {
    return (
      <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl">
        <p className="text-slate-400 text-sm">Loading trainer expertise profile...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {profileMessage && (
        <div
          className={`p-4 rounded-2xl text-sm font-medium border ${
            profileMessage.type === 'success'
              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
              : 'bg-rose-950/60 border-rose-800 text-rose-300'
          }`}
        >
          {profileMessage.text}
        </div>
      )}

      {/* Profile Overview & Edit Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Trainer Bio & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-black text-xl">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{profile?.name}</h3>
                <p className="text-xs text-slate-400">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800">
                  {profile?.role || 'TRAINER'}
                </span>
              </div>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Academic Qualification:</span>
                <span className="text-slate-200 font-semibold">{profile?.qualification || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Domain Specialization:</span>
                <span className="text-indigo-300 font-semibold">{profile?.specialization || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Professional Experience:</span>
                <span className="text-slate-200">{profile?.work_experience || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Expertise Summary:</span>
                <p className="text-slate-300 italic mt-0.5 leading-relaxed">
                  {profile?.expertise_summary || 'No expertise summary entered yet.'}
                </p>
              </div>
            </div>
          </div>

          {/* Foundation Ready Metric Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Domain Skills Mapped</span>
              <p className="text-2xl font-black text-indigo-400">{profile?.skills?.length || 0}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Foundation Ready</span>
              <p className="text-xs text-indigo-300 font-semibold mt-1">Trainer Matching</p>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2">Edit Trainer Expertise Profile</h3>
            <p className="text-xs text-slate-400 mb-6">
              Detail your credentials, core domain specializations, and professional trajectory for course authoring and trainee matching.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Academic Qualification
                  </label>
                  <input
                    type="text"
                    value={qualification}
                    onChange={(e) => setQualification(e.target.value)}
                    placeholder="e.g. M.Tech in CS, Ph.D. in AI, Senior Fellow"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Domain Specialization
                  </label>
                  <input
                    type="text"
                    value={specialization}
                    onChange={(e) => setSpecialization(e.target.value)}
                    placeholder="e.g. Cloud Native, Deep Learning, Cybersecurity"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Professional / Industry Experience
                </label>
                <textarea
                  value={workExperience}
                  onChange={(e) => setWorkExperience(e.target.value)}
                  rows={2}
                  placeholder="e.g. 10 years enterprise architecture, technical lead at Fortune 500, university faculty..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Expertise Summary & Pedagogical Approach
                </label>
                <textarea
                  value={expertiseSummary}
                  onChange={(e) => setExpertiseSummary(e.target.value)}
                  rows={3}
                  placeholder="Highlight your pedagogical philosophy, specialized tools, and key institutional milestones..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Expertise Skills Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Domain Expertise & Skill Attributes</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {profile?.skills?.length || 0}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Add the key technical competencies you can teach and evaluate.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddSkillOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-600/20 transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>+ Add Expertise Skill</span>
          </button>
        </div>

        {/* User Skills List */}
        {!profile?.skills || profile.skills.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <p className="text-xs text-slate-400">No domain expertise mapped yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;+ Add Expertise Skill&quot; to associate your subject competencies from the platform catalog.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.skills.map((us) => (
              <div
                key={us.id}
                className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-4 flex flex-col justify-between hover:border-slate-600 transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div>
                      <h4 className="text-sm font-bold text-white">{us.skill?.name || 'Skill'}</h4>
                      {us.skill?.category && (
                        <span className="text-[10px] text-slate-400 font-medium">
                          {us.skill.category}
                        </span>
                      )}
                    </div>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getProficiencyBadge(
                        us.proficiency
                      )}`}
                    >
                      {us.proficiency}
                    </span>
                  </div>

                  {us.evidence && (
                    <p className="text-xs text-slate-300 mt-2 bg-slate-900/60 border border-slate-800/80 rounded-xl p-2.5 italic">
                      &quot;{us.evidence}&quot;
                    </p>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingSkill(us);
                      setEditProficiency(us.proficiency);
                      setEditEvidence(us.evidence || '');
                    }}
                    className="text-xs font-semibold text-slate-400 hover:text-indigo-400 transition-colors cursor-pointer"
                  >
                    Edit Level
                  </button>
                  <button
                    type="button"
                    disabled={skillActionLoading === us.id}
                    onClick={() => handleDeleteSkill(us.id, us.skill?.name)}
                    className="text-xs font-semibold text-rose-400/80 hover:text-rose-300 disabled:opacity-50 transition-colors cursor-pointer"
                  >
                    {skillActionLoading === us.id ? 'Removing...' : 'Remove'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Skill Modal */}
      {isAddSkillOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">Add Domain Expertise</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select an established platform skill or add a custom specialization.
            </p>

            <form onSubmit={handleAddSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Choose from Platform Skill Catalog
                </label>
                <select
                  value={selectedSkillId}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedSkillId(val ? Number(val) : '');
                    if (val) {
                      setCustomSkillName('');
                    }
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
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
                <>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Custom Skill Name
                    </label>
                    <input
                      type="text"
                      value={customSkillName}
                      onChange={(e) => setCustomSkillName(e.target.value)}
                      placeholder="e.g. Terraform, GraphQL, DevOps"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Skill Category
                    </label>
                    <input
                      type="text"
                      value={skillCategory}
                      onChange={(e) => setSkillCategory(e.target.value)}
                      placeholder="e.g. Cloud Infrastructure, System Design"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proficiency / Mastery Level
                </label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Advanced">Advanced (Extensive delivery experience)</option>
                  <option value="Expert">Expert (Principal architect / Master instructor)</option>
                  <option value="Intermediate">Intermediate (Practitioner instructor)</option>
                  <option value="Beginner">Beginner (Foundational)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Credentials / Evidence (Optional)
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={2}
                  placeholder="e.g. 5+ corporate training cohorts, AWS Solutions Architect certification, author of textbook..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddSkillOpen(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addingSkill}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {addingSkill ? 'Adding...' : 'Add Expertise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Skill Modal */}
      {editingSkill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-1">
              Edit Expertise: {editingSkill.skill?.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update your declared mastery level and credentials.
            </p>

            <form onSubmit={handleUpdateSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proficiency / Mastery Level
                </label>
                <select
                  value={editProficiency}
                  onChange={(e) => setEditProficiency(e.target.value as ProficiencyLevel)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="Advanced">Advanced (Extensive delivery experience)</option>
                  <option value="Expert">Expert (Principal architect / Master instructor)</option>
                  <option value="Intermediate">Intermediate (Practitioner instructor)</option>
                  <option value="Beginner">Beginner (Foundational)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Credentials / Evidence
                </label>
                <textarea
                  value={editEvidence}
                  onChange={(e) => setEditEvidence(e.target.value)}
                  rows={2}
                  placeholder="e.g. Updated credentials or institutional certifications"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setEditingSkill(null)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updatingSkill}
                  className="flex-1 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-indigo-600/30 cursor-pointer"
                >
                  {updatingSkill ? 'Updating...' : 'Update Expertise'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

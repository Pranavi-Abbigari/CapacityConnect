import React, { useState, useEffect } from 'react';
import { profilesApi } from '../api/client';
import type { TraineeProfile, Skill, UserSkill, ProficiencyLevel } from '../types';

interface TraineeProfileSectionProps {
  onProfileUpdated?: () => void;
}

export const TraineeProfileSection: React.FC<TraineeProfileSectionProps> = ({ onProfileUpdated }) => {
  const [profile, setProfile] = useState<TraineeProfile | null>(null);
  const [catalog, setCatalog] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Profile form state
  const [qualification, setQualification] = useState('');
  const [workExperience, setWorkExperience] = useState('');
  const [interests, setInterests] = useState('');
  const [profileSummary, setProfileSummary] = useState('');

  // Skill addition state
  const [isAddSkillOpen, setIsAddSkillOpen] = useState(false);
  const [selectedSkillId, setSelectedSkillId] = useState<number | ''>('');
  const [customSkillName, setCustomSkillName] = useState('');
  const [skillCategory, setSkillCategory] = useState('');
  const [proficiency, setProficiency] = useState<ProficiencyLevel>('Beginner');
  const [evidence, setEvidence] = useState('');
  const [addingSkill, setAddingSkill] = useState(false);
  const [skillActionLoading, setSkillActionLoading] = useState<number | null>(null);

  // Edit skill proficiency modal
  const [editingSkill, setEditingSkill] = useState<UserSkill | null>(null);
  const [editProficiency, setEditProficiency] = useState<ProficiencyLevel>('Beginner');
  const [editEvidence, setEditEvidence] = useState('');
  const [updatingSkill, setUpdatingSkill] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [profData, catalogData] = await Promise.all([
        profilesApi.getTraineeProfile(),
        profilesApi.getSkills(),
      ]);
      setProfile(profData);
      setCatalog(catalogData);
      setQualification(profData.qualification || '');
      setWorkExperience(profData.work_experience || '');
      setInterests(profData.interests || '');
      setProfileSummary(profData.profile_summary || '');
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to load profile data', type: 'error' });
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
      const updated = await profilesApi.updateTraineeProfile({
        qualification: qualification.trim() || undefined,
        work_experience: workExperience.trim() || undefined,
        interests: interests.trim() || undefined,
        profile_summary: profileSummary.trim() || undefined,
      });
      setProfile(updated);
      setProfileMessage({ text: 'Trainee profile successfully updated!', type: 'success' });
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: unknown) {
      const error = err as Error;
      setProfileMessage({ text: error.message || 'Failed to save profile', type: 'error' });
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
        await profilesApi.addTraineeSkill({
          skill_id: Number(selectedSkillId),
          proficiency,
          evidence: evidence.trim() || undefined,
        });
      } else if (customSkillName.trim()) {
        await profilesApi.addTraineeSkill({
          skill_name: customSkillName.trim(),
          category: skillCategory.trim() || 'General',
          proficiency,
          evidence: evidence.trim() || undefined,
        });
      } else {
        throw new Error('Please select a skill from the catalog or specify a custom skill name.');
      }

      setProfileMessage({ text: 'Skill successfully mapped to your profile!', type: 'success' });
      setIsAddSkillOpen(false);
      setSelectedSkillId('');
      setCustomSkillName('');
      setSkillCategory('');
      setEvidence('');
      setProficiency('Beginner');
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
      await profilesApi.updateTraineeSkill(editingSkill.id, {
        proficiency: editProficiency,
        evidence: editEvidence.trim() || undefined,
      });
      setProfileMessage({ text: 'Skill proficiency updated!', type: 'success' });
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
    if (!confirm(`Are you sure you want to remove "${skillName || 'this skill'}" from your profile?`)) {
      return;
    }
    setSkillActionLoading(userSkillId);
    setProfileMessage(null);
    try {
      await profilesApi.deleteTraineeSkill(userSkillId);
      setProfileMessage({ text: 'Skill removed from profile.', type: 'success' });
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
        <p className="text-slate-400 text-sm">Loading trainee competency profile...</p>
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
        {/* Left Column: Trainee Bio & Details */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-black text-xl">
                {profile?.name ? profile.name.charAt(0).toUpperCase() : 'T'}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">{profile?.name}</h3>
                <p className="text-xs text-slate-400">{profile?.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950 text-emerald-400 border border-emerald-800">
                  {profile?.role || 'TRAINEE'}
                </span>
              </div>
            </div>

            <hr className="border-slate-800" />

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400 block font-medium">Highest Qualification:</span>
                <span className="text-slate-200 font-semibold">{profile?.qualification || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Work / Academic Experience:</span>
                <span className="text-slate-200">{profile?.work_experience || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Learning Interests:</span>
                <span className="text-slate-200">{profile?.interests || 'Not provided'}</span>
              </div>
              <div>
                <span className="text-slate-400 block font-medium">Profile Summary:</span>
                <p className="text-slate-300 italic mt-0.5 leading-relaxed">
                  {profile?.profile_summary || 'No summary entered yet. Update your profile below.'}
                </p>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-3xl p-5 flex items-center justify-between">
            <div>
              <span className="text-xs text-slate-400 font-medium">Competencies Mapped</span>
              <p className="text-2xl font-black text-emerald-400">{profile?.skills?.length || 0}</p>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 font-medium">Foundation Ready</span>
              <p className="text-xs text-emerald-300 font-semibold mt-1">Skill Gap Analysis</p>
            </div>
          </div>
        </div>

        {/* Right Column: Edit Profile Form */}
        <div className="lg:col-span-2">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-2">Edit Trainee Profile</h3>
            <p className="text-xs text-slate-400 mb-6">
              Keep your educational qualifications, background, and career interests up-to-date for competency-based training recommendations.
            </p>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Highest Qualification
                </label>
                <input
                  type="text"
                  value={qualification}
                  onChange={(e) => setQualification(e.target.value)}
                  placeholder="e.g. B.Tech Computer Science, Diploma in IT, B.Sc"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Work / Internship Experience
                </label>
                <textarea
                  value={workExperience}
                  onChange={(e) => setWorkExperience(e.target.value)}
                  rows={2}
                  placeholder="e.g. 6 months internship in web application development, 1 year IT support..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Learning Interests & Focus Areas
                </label>
                <input
                  type="text"
                  value={interests}
                  onChange={(e) => setInterests(e.target.value)}
                  placeholder="e.g. Cloud Architecture, Data Analytics, Python Backend, Machine Learning"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Profile Summary
                </label>
                <textarea
                  value={profileSummary}
                  onChange={(e) => setProfileSummary(e.target.value)}
                  rows={3}
                  placeholder="Briefly describe your background, career aspirations, and what you aim to achieve on LearnBridge..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  {savingProfile ? 'Saving Profile...' : 'Save Profile Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Skills & Competencies Management Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <span>Competencies & Skills Inventory</span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-800 text-slate-300 border border-slate-700">
                {profile?.skills?.length || 0}
              </span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Declare your existing capabilities and proficiencies to form your competency baseline.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddSkillOpen(true)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-md shadow-emerald-600/20 transition-all cursor-pointer self-start sm:self-auto flex items-center gap-1.5"
          >
            <span>+ Add Skill</span>
          </button>
        </div>

        {/* User Skills List */}
        {!profile?.skills || profile.skills.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-slate-800 rounded-2xl bg-slate-950/40">
            <p className="text-xs text-slate-400">No competencies mapped yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Click &quot;+ Add Skill&quot; to select from the platform catalog or declare your technical skills.
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
                    className="text-xs font-semibold text-slate-400 hover:text-emerald-400 transition-colors cursor-pointer"
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
            <h3 className="text-lg font-bold text-white mb-1">Add Competency to Profile</h3>
            <p className="text-xs text-slate-400 mb-4">
              Select an established platform skill or add a custom capability.
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
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
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
                      placeholder="e.g. Kotlin, GraphQL, Kubernetes"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                      placeholder="e.g. Programming, Cloud, Soft Skills"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proficiency Level
                </label>
                <select
                  value={proficiency}
                  onChange={(e) => setProficiency(e.target.value as ProficiencyLevel)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Beginner">Beginner (Foundational awareness)</option>
                  <option value="Intermediate">Intermediate (Hands-on practitioner)</option>
                  <option value="Advanced">Advanced (Extensive project expertise)</option>
                  <option value="Expert">Expert (Subject authority / Lead)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evidence / Notes (Optional)
                </label>
                <textarea
                  value={evidence}
                  onChange={(e) => setEvidence(e.target.value)}
                  rows={2}
                  placeholder="e.g. 2 course projects completed, internship task, certifications..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  {addingSkill ? 'Adding...' : 'Add Skill'}
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
              Edit Competency: {editingSkill.skill?.name}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Update your verified level of proficiency and evidence.
            </p>

            <form onSubmit={handleUpdateSkill} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Proficiency Level
                </label>
                <select
                  value={editProficiency}
                  onChange={(e) => setEditProficiency(e.target.value as ProficiencyLevel)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500"
                >
                  <option value="Beginner">Beginner (Foundational awareness)</option>
                  <option value="Intermediate">Intermediate (Hands-on practitioner)</option>
                  <option value="Advanced">Advanced (Extensive project expertise)</option>
                  <option value="Expert">Expert (Subject authority / Lead)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Evidence / Notes
                </label>
                <textarea
                  value={editEvidence}
                  onChange={(e) => setEditEvidence(e.target.value)}
                  rows={2}
                  placeholder="e.g. Completed advanced modules and capstone project"
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
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
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-emerald-600/30 cursor-pointer"
                >
                  {updatingSkill ? 'Updating...' : 'Update Proficiency'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

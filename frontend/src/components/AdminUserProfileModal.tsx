import React, { useState, useEffect } from 'react';
import { adminApi } from '../api/client';
import type { AdminUserProfile, ProficiencyLevel } from '../types';

interface AdminUserProfileModalProps {
  userId: number;
  onClose: () => void;
}

export const AdminUserProfileModal: React.FC<AdminUserProfileModalProps> = ({ userId, onClose }) => {
  const [profileData, setProfileData] = useState<AdminUserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminApi.getUserProfile(userId);
        setProfileData(data);
      } catch (err: unknown) {
        const e = err as Error;
        setError(e.message || 'Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 bg-purple-950 px-2.5 py-0.5 rounded-full border border-purple-800">
              Institutional Competency Audit
            </span>
            <h3 className="text-lg font-bold text-white mt-1">
              User Profile &amp; Competencies
            </h3>
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
            <div className="text-center py-12 text-slate-400 text-sm">
              Loading user profile &amp; skills...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-950/60 border border-rose-800 text-rose-300 rounded-2xl text-xs">
              {error}
            </div>
          ) : profileData ? (
            <>
              {/* User Overview */}
              <div className="bg-slate-850 border border-slate-750 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <h4 className="text-base font-bold text-white">{profileData.name}</h4>
                  <p className="text-xs text-slate-400">{profileData.email}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                    Role: {profileData.role}
                  </span>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${
                      profileData.status === 'APPROVED'
                        ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                        : 'bg-amber-950 text-amber-300 border-amber-800'
                    }`}
                  >
                    {profileData.status}
                  </span>
                </div>
              </div>

              {/* Role-Specific Profile Information */}
              {profileData.role === 'TRAINEE' && profileData.trainee_profile && (
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <h5 className="font-bold text-emerald-400 uppercase tracking-wider text-[11px]">
                    Trainee Background Profile
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Qualification:</span>
                      <span className="text-slate-200">
                        {profileData.trainee_profile.qualification || 'None provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Learning Interests:</span>
                      <span className="text-slate-200">
                        {profileData.trainee_profile.interests || 'None provided'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Experience:</span>
                    <span className="text-slate-200">
                      {profileData.trainee_profile.work_experience || 'None provided'}
                    </span>
                  </div>
                  {profileData.trainee_profile.profile_summary && (
                    <div>
                      <span className="text-slate-400 block font-medium">Summary:</span>
                      <p className="text-slate-300 italic mt-0.5">
                        &quot;{profileData.trainee_profile.profile_summary}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {profileData.role === 'TRAINER' && profileData.trainer_profile && (
                <div className="bg-slate-800/40 border border-slate-800 rounded-2xl p-4 space-y-3 text-xs">
                  <h5 className="font-bold text-indigo-400 uppercase tracking-wider text-[11px]">
                    Trainer Expertise Profile
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <span className="text-slate-400 block font-medium">Qualification:</span>
                      <span className="text-slate-200">
                        {profileData.trainer_profile.qualification || 'None provided'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 block font-medium">Specialization:</span>
                      <span className="text-indigo-300 font-semibold">
                        {profileData.trainer_profile.specialization || 'None provided'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-slate-400 block font-medium">Industry Experience:</span>
                    <span className="text-slate-200">
                      {profileData.trainer_profile.work_experience || 'None provided'}
                    </span>
                  </div>
                  {profileData.trainer_profile.expertise_summary && (
                    <div>
                      <span className="text-slate-400 block font-medium">Expertise Summary:</span>
                      <p className="text-slate-300 italic mt-0.5">
                        &quot;{profileData.trainer_profile.expertise_summary}&quot;
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Inventory */}
              <div>
                <h5 className="font-bold text-white text-xs uppercase tracking-wider mb-3 flex items-center justify-between">
                  <span>Mapped Competencies &amp; Skills</span>
                  <span className="text-purple-400 font-mono">
                    Total: {profileData.skills.length}
                  </span>
                </h5>

                {profileData.skills.length === 0 ? (
                  <p className="text-xs text-slate-500 italic p-4 bg-slate-950/40 rounded-xl border border-slate-800 text-center">
                    User has not declared any competency skills yet.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {profileData.skills.map((s) => (
                      <div
                        key={s.id}
                        className="bg-slate-800/60 border border-slate-700/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{s.skill?.name || 'Skill'}</span>
                            {s.skill?.category && (
                              <span className="text-[10px] text-slate-400">({s.skill.category})</span>
                            )}
                          </div>
                          {s.evidence && (
                            <p className="text-[11px] text-slate-300 italic mt-0.5">
                              Evidence: {s.evidence}
                            </p>
                          )}
                        </div>
                        <span
                          className={`self-start sm:self-auto px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${getProficiencyBadge(
                            s.proficiency
                          )}`}
                        >
                          {s.proficiency}
                        </span>
                      </div>
                    ))}
                  </div>
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
            Close Audit
          </button>
        </div>
      </div>
    </div>
  );
};

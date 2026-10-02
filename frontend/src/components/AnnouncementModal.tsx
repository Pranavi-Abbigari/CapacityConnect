import React, { useState } from 'react';
import { announcementsApi } from '../api/client';
import type { Course } from '../types';

interface AnnouncementModalProps {
  userRole: 'ADMIN' | 'TRAINER' | 'TRAINEE';
  availableCourses?: Course[];
  defaultCourseId?: number;
  onClose: () => void;
  onSuccess?: () => void;
}

export const AnnouncementModal: React.FC<AnnouncementModalProps> = ({
  userRole,
  availableCourses = [],
  defaultCourseId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [selectedCourseId, setSelectedCourseId] = useState<string>(
    defaultCourseId ? String(defaultCourseId) : ''
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Title and content are required');
      return;
    }

    if (userRole === 'TRAINER' && !selectedCourseId) {
      setError('Trainers must select a course for the announcement');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await announcementsApi.createAnnouncement({
        title: title.trim(),
        content: content.trim(),
        course_id: selectedCourseId ? Number(selectedCourseId) : null,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to publish announcement');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
              Campus & Course Broadcast
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5">
              Publish New Announcement
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Target Audience / Course Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Target Audience
            </label>
            {userRole === 'ADMIN' ? (
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="">🌐 Global (All Trainees & Trainers)</option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 Course: {c.title}
                  </option>
                ))}
              </select>
            ) : (
              <select
                value={selectedCourseId}
                required
                onChange={(e) => setSelectedCourseId(e.target.value)}
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="" disabled>
                  -- Select one of your courses --
                </option>
                {availableCourses.map((c) => (
                  <option key={c.id} value={c.id}>
                    📚 {c.title}
                  </option>
                ))}
              </select>
            )}
            <p className="text-[11px] text-slate-500 mt-1">
              Enrolled students will receive instant push notifications.
            </p>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Announcement Title
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Schedule Update, New Resources Available"
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Content */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Announcement Message
            </label>
            <textarea
              rows={4}
              required
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write the full announcement details here..."
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Footer buttons */}
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-rose-600/30 transition-all disabled:opacity-50"
            >
              {loading ? 'Publishing...' : '📢 Broadcast Announcement'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

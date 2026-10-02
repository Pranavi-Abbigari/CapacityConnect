import React, { useEffect, useState } from 'react';
import { announcementsApi } from '../api/client';
import type { Announcement } from '../types';

interface AnnouncementFeedProps {
  onNewAnnouncementClick?: () => void;
  canCreate?: boolean;
}

export const AnnouncementFeed: React.FC<AnnouncementFeedProps> = ({
  onNewAnnouncementClick,
  canCreate = false,
}) => {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filter, setFilter] = useState<'ALL' | 'CAMPUS' | 'COURSE'>('ALL');

  const fetchAnnouncements = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await announcementsApi.getAnnouncements();
      setAnnouncements(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load announcements');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const filteredAnnouncements = announcements.filter((ann) => {
    if (filter === 'CAMPUS') return !ann.course_id;
    if (filter === 'COURSE') return !!ann.course_id;
    return true;
  });

  const campusCount = announcements.filter((a) => !a.course_id).length;
  const courseCount = announcements.filter((a) => !!a.course_id).length;

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <span>📢</span> Campus & Course Announcements
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Official broadcasts, schedule updates, and notifications from instructors and administration
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchAnnouncements}
            disabled={loading}
            title="Refresh announcements"
            className="p-2 text-xs font-semibold text-slate-400 hover:text-white bg-slate-800/80 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            🔄
          </button>
          {canCreate && onNewAnnouncementClick && (
            <button
              onClick={onNewAnnouncementClick}
              className="px-3.5 py-1.5 text-xs font-bold text-white bg-linear-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 rounded-xl shadow-md transition-all cursor-pointer"
            >
              + Post Announcement
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 pb-1 border-b border-slate-800/60 overflow-x-auto">
        <button
          onClick={() => setFilter('ALL')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          All Announcements ({announcements.length})
        </button>
        <button
          onClick={() => setFilter('CAMPUS')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'CAMPUS'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          🌐 Campus Global ({campusCount})
        </button>
        <button
          onClick={() => setFilter('COURSE')}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
            filter === 'COURSE'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          📚 Course Specific ({courseCount})
        </button>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300">
          {error}
        </div>
      )}

      {loading && announcements.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <span className="inline-block animate-spin text-xl mb-2">⏳</span>
          <p>Loading announcements...</p>
        </div>
      )}

      {!loading && announcements.length === 0 && (
        <div className="py-12 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <span className="text-3xl block mb-2">📭</span>
          <p className="font-semibold text-slate-400">No announcements posted yet</p>
          <p className="text-[11px] text-slate-500 mt-1">
            Check back later for updates regarding your courses and campus activities.
          </p>
        </div>
      )}

      {!loading && announcements.length > 0 && filteredAnnouncements.length === 0 && (
        <div className="py-10 text-center text-xs text-slate-500 bg-slate-900/40 rounded-2xl border border-slate-800/60">
          <span className="text-2xl block mb-2">🔍</span>
          <p className="font-semibold text-slate-400">
            No {filter === 'CAMPUS' ? 'campus-wide' : 'course-specific'} announcements found
          </p>
          <button
            onClick={() => setFilter('ALL')}
            className="mt-2 text-xs text-indigo-400 hover:underline cursor-pointer"
          >
            Show all announcements
          </button>
        </div>
      )}

      {/* Announcements List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAnnouncements.map((ann) => (
          <div
            key={ann.id}
            id={`announcement_${ann.id}`}
            className="p-5 rounded-2xl bg-slate-900/70 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between space-y-3"
          >
            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-2">
                {ann.course_title ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 truncate max-w-[200px]">
                    📚 {ann.course_title}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    🌐 Campus Global
                  </span>
                )}
                <span className="text-[10px] text-slate-500 shrink-0">
                  {new Date(ann.created_at).toLocaleDateString(undefined, {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>

              {/* Title */}
              <h4 className="text-sm font-bold text-white line-clamp-1">
                {ann.title}
              </h4>

              {/* Body */}
              <p className="text-xs text-slate-300 mt-1.5 whitespace-pre-line leading-relaxed">
                {ann.content}
              </p>
            </div>

            {/* Author Footer */}
            <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-slate-800 flex items-center justify-center text-[10px]">
                  👤
                </span>
                <span className="font-medium text-slate-300">
                  {ann.author_name || 'Staff'}
                </span>
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-400 uppercase">
                {ann.author_role || 'STAFF'}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

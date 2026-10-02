import React, { useEffect, useState } from 'react';
import { feedbackApi } from '../api/client';
import type { CourseFeedbackSummary } from '../types';

interface CourseFeedbackListModalProps {
  courseId: number;
  courseTitle: string;
  onClose: () => void;
}

export const CourseFeedbackListModal: React.FC<CourseFeedbackListModalProps> = ({
  courseId,
  courseTitle,
  onClose,
}) => {
  const [data, setData] = useState<CourseFeedbackSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFeedback = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await feedbackApi.getCourseFeedback(courseId);
        setData(res);
      } catch (err: any) {
        setError(err.message || 'Failed to load course feedback');
      } finally {
        setLoading(false);
      }
    };
    fetchFeedback();
  }, [courseId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl max-h-[85vh] flex flex-col bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Student Reviews & Rating Breakdown
            </span>
            <h3 className="text-lg font-bold text-white mt-0.5 line-clamp-1">
              {courseTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto mt-4 space-y-4 pr-1">
          {loading && (
            <div className="py-12 text-center text-xs text-slate-400">
              <span className="inline-block animate-spin text-xl mb-2">⏳</span>
              <p>Loading course reviews...</p>
            </div>
          )}

          {error && (
            <div className="p-3.5 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300">
              {error}
            </div>
          )}

          {!loading && !error && data && (
            <>
              {/* Aggregation Summary Banner */}
              <div className="p-4 rounded-2xl bg-linear-to-r from-amber-500/10 via-indigo-500/10 to-transparent border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Average Trainee Rating
                  </span>
                  <div className="flex items-baseline gap-2 mt-0.5">
                    <span className="text-3xl font-black text-amber-400">
                      {data.average_rating > 0 ? data.average_rating.toFixed(1) : '—'}
                    </span>
                    <span className="text-xs text-slate-400">/ 5.0</span>
                    <div className="text-amber-400 text-sm ml-1">
                      {'★'.repeat(Math.round(data.average_rating)) +
                        '☆'.repeat(5 - Math.round(data.average_rating))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Total Reviews
                  </span>
                  <p className="text-xl font-bold text-white mt-0.5">
                    {data.total_reviews}
                  </p>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Individual Feedback ({data.reviews.length})
                </h4>

                {data.reviews.length === 0 ? (
                  <div className="py-8 text-center text-xs text-slate-500 bg-slate-950/40 rounded-xl border border-slate-800/60">
                    <span className="text-2xl block mb-1">💬</span>
                    No trainee reviews submitted for this course yet.
                  </div>
                ) : (
                  data.reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="p-3.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-white">
                            {rev.trainee_name || 'Trainee'}
                          </span>
                          <span className="text-xs font-bold text-amber-400">
                            {'★'.repeat(rev.rating)}
                            <span className="text-slate-600">
                              {'★'.repeat(5 - rev.rating)}
                            </span>
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-500">
                          {new Date(rev.created_at).toLocaleDateString(undefined, {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </div>
                      {rev.comment ? (
                        <p className="text-xs text-slate-300 italic bg-slate-900/60 p-2.5 rounded-xl border border-slate-800/40">
                          "{rev.comment}"
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 italic">
                          (No written comments provided)
                        </p>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end pt-4 border-t border-slate-800 mt-2">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

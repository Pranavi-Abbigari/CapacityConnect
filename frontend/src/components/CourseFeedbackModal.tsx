import React, { useState } from 'react';
import { feedbackApi } from '../api/client';

interface CourseFeedbackModalProps {
  courseId: number;
  courseTitle: string;
  trainerId?: number;
  trainerName?: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CourseFeedbackModal: React.FC<CourseFeedbackModalProps> = ({
  courseId,
  courseTitle,
  trainerId,
  trainerName,
  onClose,
  onSuccess,
}) => {
  const [activeTab, setActiveTab] = useState<'course' | 'trainer'>('course');

  // Course feedback state
  const [courseRating, setCourseRating] = useState<number>(5);
  const [courseHoverRating, setCourseHoverRating] = useState<number>(0);
  const [courseComment, setCourseComment] = useState<string>('');
  const [courseSubmitted, setCourseSubmitted] = useState<boolean>(false);

  // Trainer feedback state
  const [trainerRating, setTrainerRating] = useState<number>(5);
  const [trainerHoverRating, setTrainerHoverRating] = useState<number>(0);
  const [trainerComment, setTrainerComment] = useState<string>('');
  const [trainerSubmitted, setTrainerSubmitted] = useState<boolean>(false);

  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await feedbackApi.submitCourseFeedback({
        course_id: courseId,
        rating: courseRating,
        comment: courseComment.trim() ? courseComment.trim() : undefined,
      });
      setCourseSubmitted(true);
      setSuccessMsg('Course feedback submitted successfully! Thank you for your review.');
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit course feedback');
    } finally {
      setLoading(false);
    }
  };

  const handleTrainerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trainerId) return;
    setLoading(true);
    setError(null);
    try {
      await feedbackApi.submitTrainerFeedback({
        trainer_id: trainerId,
        course_id: courseId,
        rating: trainerRating,
        comment: trainerComment.trim() ? trainerComment.trim() : undefined,
      });
      setTrainerSubmitted(true);
      setSuccessMsg(`Feedback for ${trainerName || 'Trainer'} submitted successfully!`);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to submit trainer feedback');
    } finally {
      setLoading(false);
    }
  };

  const renderStarRating = (
    currentRating: number,
    hoverRating: number,
    setRating: (r: number) => void,
    setHover: (r: number) => void,
    disabled: boolean
  ) => {
    return (
      <div className="flex items-center gap-1.5 py-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={disabled}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            className={`text-2xl transition-transform hover:scale-125 focus:outline-none ${
              disabled ? 'cursor-default' : 'cursor-pointer'
            } ${
              (hoverRating || currentRating) >= star ? 'text-amber-400' : 'text-slate-600'
            }`}
          >
            ★
          </button>
        ))}
        <span className="ml-3 text-sm font-bold text-amber-300">
          {(hoverRating || currentRating)} / 5
        </span>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 sm:p-8">
        {/* Header */}
        <div className="flex items-start justify-between pb-4 border-b border-slate-800/80">
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
              Course Evaluation & Feedback
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

        {/* Tab Toggle if Trainer exists */}
        {trainerId && (
          <div className="flex mt-4 p-1 bg-slate-800/60 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('course');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'course'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📚 Rate Course
            </button>
            <button
              onClick={() => {
                setActiveTab('trainer');
                setError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeTab === 'trainer'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              👨‍🏫 Rate Instructor ({trainerName || 'Trainer'})
            </button>
          </div>
        )}

        {/* Alert Feedback */}
        {error && (
          <div className="mt-4 p-3 rounded-xl text-xs bg-rose-500/10 border border-rose-500/20 text-rose-300">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mt-4 p-3 rounded-xl text-xs bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">
            {successMsg}
          </div>
        )}

        {/* Course Form */}
        {activeTab === 'course' && (
          <form onSubmit={handleCourseSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Course Rating (1 to 5 Stars)
              </label>
              {renderStarRating(
                courseRating,
                courseHoverRating,
                setCourseRating,
                setCourseHoverRating,
                courseSubmitted || loading
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Review & Constructive Feedback (Optional)
              </label>
              <textarea
                rows={3}
                disabled={courseSubmitted || loading}
                value={courseComment}
                onChange={(e) => setCourseComment(e.target.value)}
                placeholder="What did you learn? How can this course curriculum be improved?"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              {!courseSubmitted && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Course Review'}
                </button>
              )}
            </div>
          </form>
        )}

        {/* Trainer Form */}
        {activeTab === 'trainer' && (
          <form onSubmit={handleTrainerSubmit} className="mt-5 space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructor Rating for {trainerName || 'Trainer'}
              </label>
              {renderStarRating(
                trainerRating,
                trainerHoverRating,
                setTrainerRating,
                setTrainerHoverRating,
                trainerSubmitted || loading
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Instructor Feedback & Comments (Optional)
              </label>
              <textarea
                rows={3}
                disabled={trainerSubmitted || loading}
                value={trainerComment}
                onChange={(e) => setTrainerComment(e.target.value)}
                placeholder="How was the instructor's delivery, clarity, and support?"
                className="w-full bg-slate-950/60 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 disabled:opacity-50"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              {!trainerSubmitted && (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2 text-xs font-bold text-white bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {loading ? 'Submitting...' : 'Submit Instructor Review'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

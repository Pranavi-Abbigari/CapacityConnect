import React, { useState, useEffect } from 'react';
import { coursesApi, certificatesApi } from '../api/client';
import type { Course, TraineeCompletionSummary, Certificate } from '../types';

interface TrainerCompletionModalProps {
  course: Course | null;
  onClose: () => void;
  onViewCertificate?: (cert: Certificate) => void;
}

export const TrainerCompletionModal: React.FC<TrainerCompletionModalProps> = ({
  course,
  onClose,
  onViewCertificate,
}) => {
  const [trainees, setTrainees] = useState<TraineeCompletionSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [issuingId, setIssuingId] = useState<number | null>(null);
  const [customGrades, setCustomGrades] = useState<Record<number, string>>({});
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const loadCompletionData = async () => {
    if (!course) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const data = await coursesApi.getTrainerCourseTraineesCompletion(course.id);
      setTrainees(data);
      // Pre-fill suggested grades
      const initialGrades: Record<number, string> = {};
      data.forEach((t) => {
        if (t.suggested_grade) {
          initialGrades[t.trainee_id] = t.suggested_grade;
        }
      });
      setCustomGrades(initialGrades);
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMsg(errObj.message || 'Failed to load enrollment completion data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (course) {
      loadCompletionData();
    }
  }, [course]);

  if (!course) return null;

  const handleIssueCertificate = async (traineeId: number) => {
    setIssuingId(traineeId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const gradeToIssue = customGrades[traineeId] || 'Pass';

    try {
      const newCert = await certificatesApi.issueCertificate({
        course_id: course.id,
        trainee_id: traineeId,
        grade: gradeToIssue,
      });

      setSuccessMsg(`Certificate successfully issued! Code: ${newCert.certificate_code}`);
      await loadCompletionData();
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMsg(errObj.message || 'Failed to issue certificate');
    } finally {
      setIssuingId(null);
    }
  };

  const handleViewCert = async (certCode: string) => {
    if (!onViewCertificate) return;
    try {
      const certs = await certificatesApi.getTrainerCourseCertificates(course.id);
      const found = certs.find((c) => c.certificate_code === certCode);
      if (found) {
        onViewCertificate(found);
      }
    } catch {
      // ignore
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          ✕
        </button>

        <div className="mb-6">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-950 text-indigo-400 border border-indigo-800">
              Course Completion & Certification
            </span>
            <span className="text-xs text-slate-400">Trainer Authority</span>
          </div>
          <h3 className="text-xl font-bold text-white mt-1">{course.title}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Monitor trainee completion requirements and issue official cryptographic credentials.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-rose-950/60 border border-rose-800 rounded-xl text-xs text-rose-300">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/60 border border-emerald-800 rounded-xl text-xs text-emerald-300">
            {successMsg}
          </div>
        )}

        {loading ? (
          <div className="py-16 text-center text-slate-500 text-xs">
            Evaluating trainee course completion records...
          </div>
        ) : trainees.length === 0 ? (
          <div className="py-12 bg-slate-850 border border-slate-800 rounded-2xl text-center">
            <p className="text-sm font-semibold text-slate-300">No Enrolled Trainees Yet</p>
            <p className="text-xs text-slate-500 mt-1">
              Once trainees enroll and take your course quizzes, their completion status will appear here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto border border-slate-800 rounded-2xl">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                <tr>
                  <th className="px-4 py-3">Trainee</th>
                  <th className="px-4 py-3">Enrollment</th>
                  <th className="px-4 py-3">Completion Status</th>
                  <th className="px-4 py-3">Avg Score</th>
                  <th className="px-4 py-3">Grade</th>
                  <th className="px-4 py-3 text-right">Certificate Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {trainees.map((t) => (
                  <tr key={t.trainee_id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{t.trainee_name}</p>
                      <p className="text-[10px] text-slate-500">{t.trainee_email}</p>
                    </td>
                    <td className="px-4 py-3 text-[11px] text-slate-400">
                      {new Date(t.enrolled_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {t.is_completed ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-400 border border-emerald-800 inline-flex items-center gap-1">
                          <span>✓ Satisfied</span>
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/60 text-amber-300 border border-amber-800/80">
                          In Progress
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-[11px]">
                      {t.average_score !== null && t.average_score !== undefined
                        ? `${t.average_score}%`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      {t.has_certificate ? (
                        <span className="font-bold text-emerald-400">{t.suggested_grade || 'Pass'}</span>
                      ) : t.is_completed ? (
                        <input
                          type="text"
                          value={customGrades[t.trainee_id] || ''}
                          onChange={(e) =>
                            setCustomGrades({ ...customGrades, [t.trainee_id]: e.target.value })
                          }
                          placeholder="Grade"
                          className="w-16 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs font-bold text-emerald-300 focus:outline-none focus:border-indigo-500"
                        />
                      ) : (
                        <span className="text-slate-600">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.has_certificate ? (
                        <div className="flex items-center justify-end gap-1.5">
                          <span className="text-[10px] font-mono text-indigo-400 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                            {t.certificate_code}
                          </span>
                          {t.certificate_code && (
                            <button
                              onClick={() => handleViewCert(t.certificate_code!)}
                              className="text-[11px] text-emerald-400 hover:text-emerald-300 underline font-medium cursor-pointer"
                            >
                              View
                            </button>
                          )}
                        </div>
                      ) : t.is_completed ? (
                        <button
                          onClick={() => handleIssueCertificate(t.trainee_id)}
                          disabled={issuingId === t.trainee_id}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold shadow-sm transition-all cursor-pointer"
                        >
                          {issuingId === t.trainee_id ? 'Issuing...' : 'Issue Certificate 🏆'}
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">
                          Awaiting quiz pass
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

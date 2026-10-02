import React, { useState } from 'react';
import { analyticsApi } from '../api/client';

interface AdminReportExportModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminReportExportModal: React.FC<AdminReportExportModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [downloading, setDownloading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleDownload = async (
    type: 'enrollments' | 'certificates' | 'courses',
    fn: () => Promise<Blob>,
    label: string
  ) => {
    try {
      setDownloading(type);
      setError(null);
      setSuccessMsg(null);
      await fn();
      setSuccessMsg(`Successfully downloaded ${label}!`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Download failed';
      setError(message);
    } finally {
      setDownloading(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          id="close-export-modal-btn"
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors"
        >
          ✕
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xl font-bold">
            📊
          </div>
          <div>
            <h3 className="text-xl font-bold text-white tracking-tight">
              Export Institutional Reports
            </h3>
            <p className="text-xs text-slate-400">
              Download live platform metrics in CSV format for analysis & auditing
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-400">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400">
            ✓ {successMsg}
          </div>
        )}

        <div className="space-y-4">
          {/* Enrollments Report */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-600 transition-colors">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Enrollments & Progress Report
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Trainee enrollments, completion timestamps, status, and average quiz scores.
              </p>
            </div>
            <button
              id="download-enrollments-csv-btn"
              disabled={downloading !== null}
              onClick={() =>
                handleDownload(
                  'enrollments',
                  analyticsApi.downloadEnrollmentsCsv,
                  'Enrollments Report'
                )
              }
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {downloading === 'enrollments' ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Certificates Report */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-600 transition-colors">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Certificates & Verification Report
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                All issued credentials, certificate codes, grades, statuses, and SHA-256 hashes.
              </p>
            </div>
            <button
              id="download-certificates-csv-btn"
              disabled={downloading !== null}
              onClick={() =>
                handleDownload(
                  'certificates',
                  analyticsApi.downloadCertificatesCsv,
                  'Certificates Report'
                )
              }
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-600/30 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {downloading === 'certificates' ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>

          {/* Courses Performance Report */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/60 rounded-2xl flex items-center justify-between gap-4 hover:border-slate-600 transition-colors">
            <div>
              <h4 className="text-sm font-semibold text-slate-200">
                Courses Performance Report
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                Course metrics, trainer attribution, enrollment volume, completion rates, and average scores.
              </p>
            </div>
            <button
              id="download-courses-csv-btn"
              disabled={downloading !== null}
              onClick={() =>
                handleDownload(
                  'courses',
                  analyticsApi.downloadCoursesCsv,
                  'Course Performance Report'
                )
              }
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-teal-600 hover:bg-teal-500 text-white shadow-lg shadow-teal-600/30 transition-all disabled:opacity-50 whitespace-nowrap cursor-pointer"
            >
              {downloading === 'courses' ? 'Exporting...' : 'Export CSV'}
            </button>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

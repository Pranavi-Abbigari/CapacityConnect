import React from 'react';
import type { Certificate } from '../types';
import { QRCodeDisplay } from './QRCodeDisplay';

interface CertificateModalProps {
  certificate: Certificate | null;
  onClose: () => void;
}

export const CertificateModal: React.FC<CertificateModalProps> = ({ certificate, onClose }) => {
  if (!certificate) return null;

  const verificationUrl = `${window.location.origin}/verify-certificate?code=${certificate.certificate_code}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-700/80 rounded-3xl p-5 sm:p-8 shadow-2xl max-h-[92vh] overflow-y-auto my-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 transition-colors cursor-pointer z-10"
        >
          ✕
        </button>

        {/* Certificate Printable Canvas / Diploma Frame */}
        <div className="p-6 sm:p-8 bg-linear-to-b from-slate-950 via-slate-900 to-indigo-950/40 border-4 border-double border-indigo-500/40 rounded-2xl relative overflow-hidden text-center">
          {/* Subtle Watermark Accent */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-9xl font-black tracking-widest text-indigo-400">LB</span>
          </div>

          {/* Header */}
          <div className="flex items-center justify-center gap-3 mb-4">
            <img
              src="/learnbridge-logo.png"
              alt="LearnBridge Logo"
              className="w-10 h-10 object-contain rounded-xl"
            />
            <div className="text-left">
              <h2 className="text-lg font-black tracking-wider uppercase text-indigo-300">
                LearnBridge
              </h2>
              <p className="text-[10px] text-slate-400 uppercase tracking-widest">
                Certificate of Competence & Completion
              </p>
            </div>
          </div>

          <div className="my-6">
            <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold mb-2">
              This is officially awarded to
            </p>
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight text-transparent bg-clip-text bg-linear-to-r from-indigo-200 via-white to-violet-200">
              {certificate.trainee_name || 'Accomplished Trainee'}
            </h3>
            <p className="text-xs text-slate-400 mt-2 max-w-lg mx-auto">
              for successfully fulfilling all assessment requirements, demonstrating competency, and mastering the curriculum for:
            </p>
            <h4 className="text-lg sm:text-xl font-bold text-indigo-400 mt-3 px-4 py-2 bg-indigo-950/40 border border-indigo-800/60 rounded-xl inline-block">
              {certificate.course_title || 'Certified Course'}
            </h4>
          </div>

          {/* Details Row: Grade & Dates */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 my-6 max-w-xl mx-auto text-left text-xs">
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[10px] text-slate-400">Grade / Standing</p>
              <p className="font-bold text-emerald-400 text-sm mt-0.5">{certificate.grade || 'Passed'}</p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[10px] text-slate-400">Date Issued</p>
              <p className="font-medium text-slate-200 mt-0.5">
                {new Date(certificate.issue_date).toLocaleDateString()}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[10px] text-slate-400">Certified By</p>
              <p className="font-medium text-slate-200 truncate mt-0.5">
                {certificate.issuer_name || 'Faculty Lead'}
              </p>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-800/50 border border-slate-700/60">
              <p className="text-[10px] text-slate-400">Status</p>
              <p
                className={`font-bold mt-0.5 ${
                  certificate.status === 'ACTIVE' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {certificate.status}
              </p>
            </div>
          </div>

          {/* Verification Section with QR Code */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/60 border border-slate-800 rounded-xl mt-6">
            <div className="text-left space-y-1">
              <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                Public Verification Credential
              </p>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Code:</span>
                <span className="font-mono text-xs font-bold text-indigo-300 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
                  {certificate.certificate_code}
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-mono truncate max-w-sm">
                Hash: {certificate.verification_hash}
              </p>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-[10px] text-slate-400">Scan to Verify</p>
                <p className="text-[9px] text-slate-500">Tamper-Proof Ledger</p>
              </div>
              <QRCodeDisplay value={verificationUrl} size={84} />
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 mt-6 pt-4 border-t border-slate-800">
          <a
            href={verificationUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-indigo-400 hover:text-indigo-300 underline font-medium text-center sm:text-left"
          >
            Open Public Verification Page ↗
          </a>
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <button
              onClick={() => window.print()}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-xl transition-all cursor-pointer"
            >
              Print / Save PDF
            </button>
            <button
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

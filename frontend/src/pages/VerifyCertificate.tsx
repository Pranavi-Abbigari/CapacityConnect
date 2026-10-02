import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { certificatesApi } from '../api/client';
import type { CertificateVerification } from '../types';
import { QRCodeDisplay } from '../components/QRCodeDisplay';

export const VerifyCertificatePage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const codeParam = searchParams.get('code') || '';
  const [inputCode, setInputCode] = useState(codeParam);
  const [verification, setVerification] = useState<CertificateVerification | null>(null);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async (codeToVerify: string) => {
    const trimmed = codeToVerify.trim();
    if (!trimmed) {
      setErrorMsg('Please enter a certificate code');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setVerification(null);

    try {
      const result = await certificatesApi.verifyCertificate(trimmed);
      setVerification(result);
      setSearchParams({ code: trimmed });
    } catch (err: unknown) {
      const errObj = err as Error;
      setErrorMsg(errObj.message || 'Certificate verification failed');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (codeParam) {
      handleVerify(codeParam);
    }
  }, [codeParam]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleVerify(inputCode);
  };

  const currentUrl = typeof window !== 'undefined' ? window.location.href : '';

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between p-4 sm:p-6">
      {/* Background glowing orb accents */}
      <div className="fixed top-10 left-1/2 -translate-x-1/2 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

      {/* Top Bar */}
      <header className="max-w-4xl mx-auto w-full flex items-center justify-between py-4 border-b border-slate-800 relative z-10">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/learnbridge-logo.png"
            alt="LearnBridge Logo"
            className="w-10 h-10 object-contain rounded-xl"
          />
          <div>
            <h1 className="text-base font-bold text-white tracking-tight">LearnBridge</h1>
            <p className="text-[10px] text-slate-400">Public Credential Verification Registry</p>
          </div>
        </Link>
        <Link
          to="/login"
          className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors"
        >
          Portal Login →
        </Link>
      </header>

      {/* Main Container */}
      <main className="max-w-2xl mx-auto w-full my-8 relative z-10 space-y-8">
        <div className="text-center space-y-2">
          <div className="inline-block px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-800 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            Official Credential Verification
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Verify LearnBridge Certificate
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            Validate the cryptographic authenticity and standing of any LearnBridge course certificate.
          </p>
        </div>

        {/* Search Bar Form */}
        <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Enter Certificate Code (e.g. CERT-XXXX-XXXX)"
            value={inputCode}
            onChange={(e) => setInputCode(e.target.value)}
            className="flex-1 px-4 py-3 bg-slate-900 border border-slate-800 rounded-xl text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-semibold rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            {loading ? 'Verifying...' : 'Verify Credential'}
          </button>
        </form>

        {/* Error State */}
        {errorMsg && (
          <div className="p-6 bg-rose-950/40 border border-rose-800/80 rounded-2xl text-center space-y-2">
            <div className="w-12 h-12 mx-auto rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center text-xl font-bold">
              ✕
            </div>
            <h3 className="text-base font-bold text-white">Certificate Not Found</h3>
            <p className="text-xs text-rose-300">{errorMsg}</p>
            <p className="text-[11px] text-slate-400">
              Please check the code carefully. Ensure all hyphens and characters are typed accurately.
            </p>
          </div>
        )}

        {/* Successful Verification Result */}
        {verification && (
          <div
            className={`p-6 sm:p-8 rounded-3xl border shadow-2xl relative overflow-hidden ${
              verification.is_valid
                ? 'bg-slate-900 border-emerald-500/40 shadow-emerald-950/20'
                : 'bg-slate-900 border-amber-500/40 shadow-amber-950/20'
            }`}
          >
            {/* Status Header Badge */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-6 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl font-black ${
                    verification.is_valid
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {verification.is_valid ? '✓' : '!'}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    {verification.is_valid ? 'Authentic Certificate' : 'Certificate Revoked'}
                  </h3>
                  <p className="text-xs text-slate-400">
                    {verification.is_valid
                      ? 'Official, tamper-proof credential verified on LearnBridge platform'
                      : 'This credential was revoked and is no longer valid'}
                  </p>
                </div>
              </div>

              <div
                className={`px-3 py-1 rounded-full text-xs font-bold border ${
                  verification.is_valid
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950/60 text-rose-300 border-rose-700'
                }`}
              >
                {verification.status}
              </div>
            </div>

            {/* Credential Details Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 my-6 text-xs">
              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Course Title</p>
                <p className="font-bold text-white text-sm mt-0.5">{verification.course_title}</p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Awarded To</p>
                <p className="font-bold text-indigo-300 text-sm mt-0.5">{verification.trainee_name}</p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Certified By</p>
                <p className="font-medium text-slate-200 mt-0.5">{verification.issuer_name}</p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Date of Issuance</p>
                <p className="font-medium text-slate-200 mt-0.5">
                  {new Date(verification.issue_date).toLocaleDateString(undefined, {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Standing / Grade</p>
                <p className="font-bold text-emerald-400 mt-0.5">{verification.grade || 'Satisfactory'}</p>
              </div>

              <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Certificate Code</p>
                <p className="font-mono font-bold text-indigo-400 mt-0.5">{verification.certificate_code}</p>
              </div>
            </div>

            {/* Cryptographic Ledger & QR Scan */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 bg-slate-950/70 border border-slate-800 rounded-2xl">
              <div className="space-y-1 text-left">
                <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Tamper-Proof Verification Hash
                </p>
                <p className="font-mono text-[10px] text-slate-400 break-all select-all">
                  {verification.verification_hash}
                </p>
                <p className="text-[10px] text-emerald-400/80">
                  ✓ Cryptographic signature matches issuance records
                </p>
              </div>

              <div className="shrink-0">
                <QRCodeDisplay value={currentUrl} size={90} />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto w-full text-center text-[11px] text-slate-500 py-4 border-t border-slate-900 relative z-10">
        LearnBridge Credential Registry • Secure Public Verification
      </footer>
    </div>
  );
};

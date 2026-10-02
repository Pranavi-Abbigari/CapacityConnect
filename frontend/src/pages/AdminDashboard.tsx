import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { adminApi, coursesApi, certificatesApi } from '../api/client';
import { AdminUserProfileModal } from '../components/AdminUserProfileModal';
import { CertificateModal } from '../components/CertificateModal';
import { AdminAnalyticsSection } from '../components/AdminAnalyticsSection';
import { AnnouncementModal } from '../components/AnnouncementModal';
import { AnnouncementFeed } from '../components/AnnouncementFeed';
import { CourseFeedbackListModal } from '../components/CourseFeedbackListModal';
import type { User, Course, Certificate } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'courses' | 'certificates' | 'announcements'>('overview');
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [selectedCertForModal, setSelectedCertForModal] = useState<Certificate | null>(null);
  const [selectedCourseForReviews, setSelectedCourseForReviews] = useState<Course | null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState<boolean>(false);
  const [revokingId, setRevokingId] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [inspectingUserId, setInspectingUserId] = useState<number | null>(null);

  // Search & Filter states
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<'ALL' | 'ADMIN' | 'TRAINER' | 'TRAINEE'>('ALL');
  const [userStatusFilter, setUserStatusFilter] = useState<'ALL' | 'APPROVED' | 'PENDING'>('ALL');

  const [courseSearchQuery, setCourseSearchQuery] = useState<string>('');
  const [courseStatusFilter, setCourseStatusFilter] = useState<'ALL' | 'PUBLISHED' | 'DRAFT'>('ALL');

  const [certSearchQuery, setCertSearchQuery] = useState<string>('');
  const [certStatusFilter, setCertStatusFilter] = useState<'ALL' | 'ACTIVE' | 'REVOKED'>('ALL');

  const fetchDashboardData = async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [pending, users, courseList, certList] = await Promise.all([
        adminApi.getPendingUsers(),
        adminApi.getAllUsers(),
        coursesApi.getCourses(),
        certificatesApi.getAdminCertificates(),
      ]);

      setPendingUsers(pending);
      setAllUsers(users);
      setCourses(courseList);
      setCertificates(certList);
    } catch (err: unknown) {
      console.error('Failed to load admin dashboard data', err);
      setLoadError('Unable to load your dashboard data. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleApproveUser = async (userId: number) => {
    setActionLoading(userId);
    setFeedback(null);
    try {
      await adminApi.approveUser(userId);
      setFeedback({ text: `User #${userId} has been approved successfully!`, type: 'success' });
      // Refresh user lists and stats
      await fetchDashboardData();
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to approve user', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRevokeCertificate = async (certId: number) => {
    if (!window.confirm('Are you sure you want to revoke this certificate? This action will invalidate its public verification.')) {
      return;
    }
    setRevokingId(certId);
    setFeedback(null);
    try {
      const updated = await certificatesApi.revokeCertificate(certId);
      setCertificates((prev) =>
        prev.map((c) => (c.id === certId ? { ...c, status: updated.status } : c))
      );
      setFeedback({ text: `Certificate #${certId} has been revoked.`, type: 'success' });
    } catch (err: unknown) {
      const error = err as Error;
      setFeedback({ text: error.message || 'Failed to revoke certificate', type: 'error' });
    } finally {
      setRevokingId(null);
    }
  };

  // Filtered User Directory
  const filteredUsers = allUsers.filter((u) => {
    const matchesSearch =
      !userSearchQuery.trim() ||
      u.name.toLowerCase().includes(userSearchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchQuery.toLowerCase());
    const matchesRole = userRoleFilter === 'ALL' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'ALL' || u.status === userStatusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  // Filtered Courses
  const filteredCourses = courses.filter((c) => {
    const matchesSearch =
      !courseSearchQuery.trim() ||
      c.title.toLowerCase().includes(courseSearchQuery.toLowerCase()) ||
      (c.description && c.description.toLowerCase().includes(courseSearchQuery.toLowerCase()));
    const matchesStatus = courseStatusFilter === 'ALL' || c.status === courseStatusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filtered Certificates
  const filteredCertificates = certificates.filter((cert) => {
    const q = certSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      cert.certificate_code.toLowerCase().includes(q) ||
      (cert.course_title && cert.course_title.toLowerCase().includes(q)) ||
      (cert.trainee_name && cert.trainee_name.toLowerCase().includes(q));
    const matchesStatus = certStatusFilter === 'ALL' || cert.status === certStatusFilter;
    return matchesSearch && matchesStatus;
  });

  const navTabs = [
    { id: 'overview', label: 'Overview & Analytics' },
    { id: 'approvals', label: `Pending Approvals (${pendingUsers.length})` },
    { id: 'users', label: `User Directory (${allUsers.length})` },
    { id: 'courses', label: `Course Catalog (${courses.length})` },
    { id: 'certificates', label: `Certificates (${certificates.length})` },
    { id: 'announcements', label: '📢 Announcements' },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <Navbar
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any);
          setFeedback(null);
        }}
        tabs={navTabs}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Banner */}
        <div className="mb-8 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-purple-950 text-purple-400 border border-purple-800">
                Administrator Control Center
              </span>
              <span className="text-xs text-slate-400">Live Production Mode</span>
            </div>
            <h2 className="text-2xl font-black text-white mt-2">LearnBridge Administration Control Center</h2>
            <p className="text-xs text-slate-400 mt-1">
              Oversee institutional capacity building metrics, manage user approval pipelines, and govern courses.
            </p>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={() => setIsAnnouncementModalOpen(true)}
              className="px-4 py-2 bg-linear-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
            >
              📢 Broadcast
            </button>
            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-700 cursor-pointer"
            >
              {loading ? 'Refreshing...' : '↻ Refresh'}
            </button>
          </div>
        </div>

        {loadError && (
          <div className="mb-6 p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-3">
            <p className="text-sm font-semibold text-rose-400">{loadError}</p>
            <p className="text-xs text-slate-400">Unable to load dashboard data. Please check connection and try again.</p>
            <button
              onClick={fetchDashboardData}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer border border-slate-700"
            >
              ↻ Try Again
            </button>
          </div>
        )}

        {feedback && (
          <div
            className={`mb-6 p-4 rounded-2xl text-sm font-medium border ${
              feedback.type === 'success'
                ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                : 'bg-rose-950/60 border-rose-800 text-rose-300'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'overview' && (
          <div className="space-y-8">
            {/* Phase 5: Institutional Analytics & Reports */}
            <AdminAnalyticsSection />

            {/* Quick Action Panels */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Pending Approvals Summary */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Pending Approval Queue</h3>
                  <button
                    onClick={() => setActiveTab('approvals')}
                    className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                  >
                    View All →
                  </button>
                </div>
                {pendingUsers.length === 0 ? (
                  <div className="py-8 text-center text-slate-500 text-xs">
                    ✓ All registered users have been reviewed. Queue is empty.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {pendingUsers.slice(0, 3).map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center justify-between p-3.5 bg-slate-800/60 border border-slate-700/60 rounded-xl"
                      >
                        <div>
                          <p className="text-xs font-semibold text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400">{u.email}</p>
                          <span className="text-[10px] font-bold text-indigo-300 uppercase mt-0.5 inline-block">
                            {u.role}
                          </span>
                        </div>
                        <button
                          onClick={() => handleApproveUser(u.id)}
                          disabled={actionLoading === u.id}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-lg text-xs font-semibold transition-all cursor-pointer"
                        >
                          {actionLoading === u.id ? 'Approving...' : 'Approve'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Portal System Status */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
                <h3 className="text-lg font-bold text-white mb-4">System Governance</h3>
                <div className="space-y-3 text-xs text-slate-300">
                  <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                    <span>Database Engine</span>
                    <span className="font-mono text-emerald-400">SQLite (capacity_connect_v6.db)</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                    <span>Security Model</span>
                    <span className="font-mono text-indigo-400">HS256 JWT + Role-based Access</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-slate-800/40 rounded-xl border border-slate-800">
                    <span>Platform</span>
                    <span className="font-mono text-purple-400">LearnBridge</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab: Pending Approvals */}
        {activeTab === 'approvals' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="mb-6">
              <h3 className="text-xl font-bold text-white">Pending Registrations</h3>
              <p className="text-xs text-slate-400 mt-1">
                Institutional security review: verify trainer and trainee credentials before granting portal access.
              </p>
            </div>

            {pendingUsers.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <div className="text-4xl mb-3">✓</div>
                <p className="text-sm font-semibold text-slate-300">No Pending Approvals</p>
                <p className="text-xs text-slate-500 mt-1">All registered accounts are currently approved.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">User ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Requested Role</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {pendingUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono text-slate-400">#{user.id}</td>
                        <td className="py-3.5 px-4 font-semibold text-white">{user.name}</td>
                        <td className="py-3.5 px-4 text-slate-300">{user.email}</td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-800">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-amber-950 text-amber-300 border border-amber-800">
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            disabled={actionLoading === user.id}
                            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm transition-all cursor-pointer"
                          >
                            {actionLoading === user.id ? 'Approving...' : 'Approve User'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: User Directory */}
        {activeTab === 'users' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-white">All Platform Users</h3>
                <p className="text-xs text-slate-400 mt-1">Complete directory of system users and their roles.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredUsers.length} of {allUsers.length} users
              </span>
            </div>

            {/* Search and Filters */}
            <div className="mb-6 p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={userSearchQuery}
                  onChange={(e) => setUserSearchQuery(e.target.value)}
                  placeholder="Search users by name or email..."
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                {userSearchQuery && (
                  <button
                    onClick={() => setUserSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['ALL', 'ADMIN', 'TRAINER', 'TRAINEE'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        userRoleFilter === r
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {r}
                    </button>
                  ))}
                </div>

                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['ALL', 'APPROVED', 'PENDING'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setUserStatusFilter(s)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        userStatusFilter === s
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {(userSearchQuery || userRoleFilter !== 'ALL' || userStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setUserSearchQuery('');
                      setUserRoleFilter('ALL');
                      setUserStatusFilter('ALL');
                    }}
                    className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="py-12 bg-slate-850 border border-slate-800 rounded-2xl text-center">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-sm font-semibold text-slate-300">No users match your criteria</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Try adjusting your search query, role filter, or approval status.
                </p>
                <button
                  onClick={() => {
                    setUserSearchQuery('');
                    setUserRoleFilter('ALL');
                    setUserStatusFilter('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 uppercase tracking-wider text-[10px]">
                      <th className="py-3 px-4">ID</th>
                      <th className="py-3 px-4">Name</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Role</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Competency Profile</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3 px-4 font-mono text-slate-500">#{user.id}</td>
                        <td className="py-3 px-4 font-semibold text-white">{user.name}</td>
                        <td className="py-3 px-4 text-slate-300">{user.email}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 rounded-md font-semibold text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-md font-semibold text-[10px] border ${
                              user.status === 'APPROVED'
                                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                                : 'bg-amber-950/60 text-amber-300 border-amber-800'
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            onClick={() => setInspectingUserId(user.id)}
                            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-purple-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all border border-slate-700 cursor-pointer"
                          >
                            Audit Profile →
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab: Courses */}
        {activeTab === 'courses' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <h3 className="text-xl font-bold text-white">Course Catalog Directory</h3>
                <p className="text-xs text-slate-400 mt-1">All capacity training modules published on LearnBridge.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                Showing {filteredCourses.length} of {courses.length} courses
              </span>
            </div>

            {/* Course Search & Filter Controls */}
            <div className="mb-6 p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={courseSearchQuery}
                  onChange={(e) => setCourseSearchQuery(e.target.value)}
                  placeholder="Search courses by title or syllabus keywords..."
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                {courseSearchQuery && (
                  <button
                    onClick={() => setCourseSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['ALL', 'PUBLISHED', 'DRAFT'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setCourseStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        courseStatusFilter === st
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {(courseSearchQuery || courseStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setCourseSearchQuery('');
                      setCourseStatusFilter('ALL');
                    }}
                    className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {filteredCourses.length === 0 ? (
              <div className="py-12 bg-slate-850 border border-slate-800 rounded-2xl text-center">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-sm font-semibold text-slate-300">No courses match your criteria</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  Try adjusting your search terms or status filter.
                </p>
                <button
                  onClick={() => {
                    setCourseSearchQuery('');
                    setCourseStatusFilter('ALL');
                  }}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredCourses.map((course) => (
                  <div
                    key={course.id}
                    className="p-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mb-2">
                        <span className="font-mono">Course #{course.id}</span>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950 text-emerald-400 border border-emerald-800">
                          {course.status}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-white">{course.title}</h4>
                      <p className="text-xs text-slate-300 mt-2 line-clamp-3">
                        {course.description || 'No description provided.'}
                      </p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-700/40 flex items-center justify-between text-[11px] text-slate-400">
                      <span>Trainer ID: <span className="font-mono text-slate-200">#{course.trainer_id}</span></span>
                      <button
                        onClick={() => setSelectedCourseForReviews(course)}
                        className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer"
                      >
                        ⭐ Reviews
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 5: Certificates Management */}
        {activeTab === 'certificates' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-white">Certificate Governance & Revocation</h3>
                <p className="text-xs text-slate-400 mt-1">
                  Global credential ledger. Audit certificates, preview cryptographic seals, and execute revocations.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-mono">
                  Showing {filteredCertificates.length} of {certificates.length}
                </span>
                <a
                  href="/verify-certificate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold px-4 py-2 bg-slate-800 text-indigo-400 hover:text-indigo-300 rounded-xl border border-slate-700 hover:bg-slate-700 transition-colors inline-flex items-center gap-1.5 self-start sm:self-auto"
                >
                  <span>Public Verification Registry ↗</span>
                </a>
              </div>
            </div>

            {/* Certificate Search & Filter */}
            <div className="p-4 bg-slate-800/40 border border-slate-800 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex-1 relative">
                <input
                  type="text"
                  value={certSearchQuery}
                  onChange={(e) => setCertSearchQuery(e.target.value)}
                  placeholder="Search certificates by code, course title, or recipient name..."
                  className="w-full px-4 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-xs"
                />
                {certSearchQuery && (
                  <button
                    onClick={() => setCertSearchQuery('')}
                    className="absolute right-3 top-2.5 text-slate-400 hover:text-white text-xs cursor-pointer"
                  >
                    ✕
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center space-x-1 bg-slate-800 p-1 rounded-xl border border-slate-700">
                  {(['ALL', 'ACTIVE', 'REVOKED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setCertStatusFilter(st)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                        certStatusFilter === st
                          ? 'bg-indigo-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>

                {(certSearchQuery || certStatusFilter !== 'ALL') && (
                  <button
                    onClick={() => {
                      setCertSearchQuery('');
                      setCertStatusFilter('ALL');
                    }}
                    className="px-2.5 py-1 text-[11px] text-rose-400 hover:text-rose-300 font-semibold cursor-pointer underline"
                  >
                    Reset
                  </button>
                )}
              </div>
            </div>

            {loading ? (
              <div className="py-12 text-center text-slate-500 text-xs">Loading certificate records...</div>
            ) : filteredCertificates.length === 0 ? (
              <div className="py-12 bg-slate-850 border border-slate-800 rounded-2xl text-center">
                <span className="text-3xl block mb-2">🔍</span>
                <p className="text-sm font-semibold text-slate-300">No Certificates Found</p>
                <p className="text-xs text-slate-500 mt-1 mb-3">
                  {certificates.length === 0
                    ? 'Certificates issued by trainers or admins will be archived and auditable here.'
                    : 'No certificates match your search and filter criteria.'}
                </p>
                {certificates.length > 0 && (
                  <button
                    onClick={() => {
                      setCertSearchQuery('');
                      setCertStatusFilter('ALL');
                    }}
                    className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl cursor-pointer"
                  >
                    Clear Filters
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Course</th>
                      <th className="px-4 py-3">Recipient</th>
                      <th className="px-4 py-3">Issuer</th>
                      <th className="px-4 py-3">Issue Date</th>
                      <th className="px-4 py-3">Grade</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {filteredCertificates.map((cert) => (
                      <tr key={cert.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-indigo-300">
                          {cert.certificate_code}
                        </td>
                        <td className="px-4 py-3 font-semibold text-white max-w-xs truncate">
                          {cert.course_title || `Course #${cert.course_id}`}
                        </td>
                        <td className="px-4 py-3 text-slate-200">
                          {cert.trainee_name || `User #${cert.trainee_id}`}
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {cert.issuer_name || `User #${cert.issuer_id}`}
                        </td>
                        <td className="px-4 py-3 text-[11px] text-slate-400">
                          {new Date(cert.issue_date).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 font-bold text-emerald-400">
                          {cert.grade || 'Pass'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              cert.status === 'ACTIVE'
                                ? 'bg-emerald-950 text-emerald-300 border-emerald-800'
                                : 'bg-rose-950 text-rose-300 border-rose-800'
                            }`}
                          >
                            ● {cert.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right space-x-2 whitespace-nowrap">
                          <button
                            onClick={() => setSelectedCertForModal(cert)}
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-indigo-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer"
                          >
                            Diploma & QR
                          </button>
                          <a
                            href={`/verify-certificate?code=${cert.certificate_code}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg text-[11px] font-semibold transition-all inline-block"
                          >
                            Verify ↗
                          </a>
                          {cert.status === 'ACTIVE' ? (
                            <button
                              onClick={() => handleRevokeCertificate(cert.id)}
                              disabled={revokingId === cert.id}
                              className="px-2.5 py-1 bg-rose-950 hover:bg-rose-900 border border-rose-800 text-rose-300 rounded-lg text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                            >
                              {revokingId === cert.id ? 'Revoking...' : 'Revoke'}
                            </button>
                          ) : (
                            <span className="text-[11px] text-slate-500 italic">
                              Revoked
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 6: Announcements Broadcast Center */}
        {activeTab === 'announcements' && (
          <div className="space-y-6">
            <AnnouncementFeed
              canCreate={true}
              onNewAnnouncementClick={() => setIsAnnouncementModalOpen(true)}
            />
          </div>
        )}

        {/* Modal: Admin User Profile & Competencies Audit */}
        {inspectingUserId && (
          <AdminUserProfileModal
            userId={inspectingUserId}
            onClose={() => setInspectingUserId(null)}
          />
        )}

        {/* Modal: Certificate Diploma Preview */}
        <CertificateModal
          certificate={selectedCertForModal}
          onClose={() => setSelectedCertForModal(null)}
        />

        {/* Modal: Course Reviews Audit */}
        {selectedCourseForReviews && (
          <CourseFeedbackListModal
            courseId={selectedCourseForReviews.id}
            courseTitle={selectedCourseForReviews.title}
            onClose={() => setSelectedCourseForReviews(null)}
          />
        )}

        {/* Modal: Broadcast Announcement */}
        {isAnnouncementModalOpen && (
          <AnnouncementModal
            userRole="ADMIN"
            availableCourses={courses}
            onClose={() => setIsAnnouncementModalOpen(false)}
            onSuccess={() => {
              setFeedback({ text: 'Institutional announcement broadcasted successfully!', type: 'success' });
            }}
          />
        )}
      </main>
    </div>
  );
};


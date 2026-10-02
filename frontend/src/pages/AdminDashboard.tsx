import React, { useState, useEffect } from 'react';
import { Navbar } from '../components/Navbar';
import { adminApi, coursesApi } from '../api/client';
import { AdminUserProfileModal } from '../components/AdminUserProfileModal';
import type { AdminDashboardData, User, Course } from '../types';

export const AdminDashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'approvals' | 'users' | 'courses'>('overview');
  const [stats, setStats] = useState<AdminDashboardData | null>(null);
  const [pendingUsers, setPendingUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [inspectingUserId, setInspectingUserId] = useState<number | null>(null);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const [dashStats, pending, users, courseList] = await Promise.all([
        adminApi.getDashboard().catch(() => null),
        adminApi.getPendingUsers().catch(() => []),
        adminApi.getAllUsers().catch(() => []),
        coursesApi.getCourses().catch(() => []),
      ]);

      if (dashStats) setStats(dashStats);
      setPendingUsers(pending);
      setAllUsers(users);
      setCourses(courseList);
    } catch (err: unknown) {
      console.error('Failed to load admin dashboard data', err);
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

  const navTabs = [
    { id: 'overview', label: 'Overview & Analytics' },
    { id: 'approvals', label: `Pending Approvals (${pendingUsers.length})` },
    { id: 'users', label: 'User Directory' },
    { id: 'courses', label: 'Course Catalog' },
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
            <h2 className="text-2xl font-black text-white mt-2">Capacity Portal Administration</h2>
            <p className="text-xs text-slate-400 mt-1">
              Oversee capacity building metrics, manage user approval pipelines, and govern courses.
            </p>
          </div>
          <button
            onClick={fetchDashboardData}
            disabled={loading}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-all border border-slate-700 cursor-pointer self-start md:self-auto"
          >
            {loading ? 'Refreshing...' : '↻ Refresh Data'}
          </button>
        </div>

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
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Users</span>
                <p className="text-3xl font-black text-white mt-2">{stats ? stats.total_users : '—'}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Registered in DB</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">Trainees</span>
                <p className="text-3xl font-black text-white mt-2">{stats ? stats.total_trainees : '—'}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Learners enrolled</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-blue-400">Trainers</span>
                <p className="text-3xl font-black text-white mt-2">{stats ? stats.total_trainers : '—'}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Instructors on-board</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Courses</span>
                <p className="text-3xl font-black text-white mt-2">{stats ? stats.total_courses : '—'}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Active curriculum</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">Enrollments</span>
                <p className="text-3xl font-black text-white mt-2">{stats ? stats.total_enrollments : '—'}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Course connections</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
                <span className="text-xs font-semibold uppercase tracking-wider text-purple-400">Quiz Attempts</span>
                <p className="text-3xl font-black text-white mt-2">{stats ? stats.total_attempts : '—'}</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Assessments taken</span>
              </div>
            </div>

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
                    <span>Problem Statement</span>
                    <span className="font-mono text-purple-400">SIH26075 – Capacity Connect</span>
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
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">All Platform Users</h3>
                <p className="text-xs text-slate-400 mt-1">Complete directory of system users and their roles.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Total: {allUsers.length}</span>
            </div>

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
                  {allUsers.map((user) => (
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
          </div>
        )}

        {/* Tab: Courses */}
        {activeTab === 'courses' && (
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <div className="mb-6 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">Course Catalog Directory</h3>
                <p className="text-xs text-slate-400 mt-1">All capacity training modules published on LearnBridge.</p>
              </div>
              <span className="text-xs text-slate-400 font-mono">Total: {courses.length}</span>
            </div>

            {courses.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No courses published yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {courses.map((course) => (
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
                    <div className="mt-4 pt-3 border-t border-slate-700/40 text-[11px] text-slate-400">
                      Trainer ID: <span className="font-mono text-slate-200">#{course.trainer_id}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Modal: Admin User Profile & Competencies Audit */}
        {inspectingUserId && (
          <AdminUserProfileModal
            userId={inspectingUserId}
            onClose={() => setInspectingUserId(null)}
          />
        )}
      </main>
    </div>
  );
};

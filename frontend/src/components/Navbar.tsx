import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ChangePasswordModal } from './ChangePasswordModal';
import { NotificationBell } from './NotificationBell';

interface NavbarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  tabs?: { id: string; label: string }[];
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onTabChange,
  tabs = [],
}) => {
  const { currentUser, logout } = useAuth();
  const navigate = useNavigate();
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = () => {
    switch (currentUser?.role) {
      case 'ADMIN':
        return 'bg-purple-950/70 text-purple-300 border-purple-800';
      case 'TRAINER':
        return 'bg-blue-950/70 text-blue-300 border-blue-800';
      case 'TRAINEE':
        return 'bg-emerald-950/70 text-emerald-300 border-emerald-800';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Brand Logo & Title */}
            <div className="flex items-center gap-3">
              <img
                src="/learnbridge-logo.png"
                alt="LearnBridge Logo"
                className="w-10 h-10 object-contain rounded-xl"
              />
              <div>
                <h1 className="text-lg font-bold text-white tracking-tight">
                  LearnBridge
                </h1>
                <p className="text-xs text-slate-400">Capacity Building & Learning Portal</p>
              </div>
            </div>

            {/* Navigation Tabs if provided */}
            {tabs.length > 0 && onTabChange && (
              <nav className="hidden md:flex space-x-1 bg-slate-800/60 p-1 rounded-xl border border-slate-800">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => onTabChange(tab.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      activeTab === tab.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            )}

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {currentUser && <NotificationBell />}

              {currentUser && (
                <div className="hidden sm:flex flex-col text-right">
                  <span className="text-sm font-semibold text-white">{currentUser.name}</span>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${getRoleBadgeColor()}`}>
                      {currentUser.role}
                    </span>
                    <span className="text-[10px] font-medium text-emerald-400">
                      ● {currentUser.status}
                    </span>
                  </div>
                </div>
              )}

              <button
                onClick={() => setIsPasswordModalOpen(true)}
                title="Change Password"
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer text-xs font-medium border border-slate-800 hidden sm:block"
              >
                Password
              </button>

              <button
                onClick={handleLogout}
                className="px-3.5 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-all shadow-sm shadow-rose-600/20 cursor-pointer"
              >
                Logout
              </button>
            </div>
          </div>

          {/* Mobile Navigation Tabs */}
          {tabs.length > 0 && onTabChange && (
            <div className="flex md:hidden overflow-x-auto py-2.5 px-0.5 space-x-1.5 border-t border-slate-800 scroll-smooth">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => onTabChange(tab.id)}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap shrink-0 transition-all cursor-pointer ${
                    activeTab === tab.id
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                      : 'text-slate-400 hover:text-white bg-slate-800/40 hover:bg-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
};

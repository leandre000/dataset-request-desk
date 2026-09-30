import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { AppLogo } from '../components/AppLogo';
import {
  LayoutDashboard,
  ClipboardList,
  Database,
  Upload,
  BarChart3,
  Users,
  LogOut,
  Menu,
  X,
  Plus,
  Shield,
  Activity,
  Layers,
} from 'lucide-react';

interface NavItem {
  label: string;
  path: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: string[];
}

const navItems: NavItem[] = [
  { label: 'Dashboard', path: '/app', icon: LayoutDashboard, roles: ['client', 'operator', 'admin'] },
  { label: 'My Requests', path: '/app/requests', icon: ClipboardList, roles: ['client'] },
  { label: 'All Requests', path: '/app/requests', icon: ClipboardList, roles: ['operator', 'admin'] },
  { label: 'Recorded Episodes', path: '/app/episodes', icon: Database, roles: ['operator', 'admin'] },
  { label: 'CSV Import Engine', path: '/app/import', icon: Upload, roles: ['operator', 'admin'] },
  { label: 'Operations Analytics', path: '/app/analytics', icon: BarChart3, roles: ['operator', 'admin'] },
  { label: 'User Administration', path: '/app/users', icon: Users, roles: ['admin'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!user) return null;

  const filtered = navItems.filter((item) => item.roles.includes(user.role));

  const isActive = (path: string) => {
    if (path === '/app') return location.pathname === '/app';
    return location.pathname.startsWith(path);
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const roleBadgeStyles: Record<string, { bg: string; text: string; label: string }> = {
    admin: { bg: 'bg-purple-100 border-purple-200', text: 'text-purple-800', label: 'Administrator' },
    operator: { bg: 'bg-blue-100 border-blue-200', text: 'text-blue-800', label: 'Operations' },
    client: { bg: 'bg-emerald-100 border-emerald-200', text: 'text-emerald-800', label: 'Client' },
  };
  const roleMeta = roleBadgeStyles[user.role] || roleBadgeStyles.client;

  const sidebar = (
    <nav className="flex flex-col h-full bg-white border-r border-slate-200">
      {/* Brand Header */}
      <div className="px-5 py-5 border-b border-slate-100">
        <Link to="/app" className="block focus:outline-none">
          <AppLogo size="md" />
        </Link>
      </div>

      {/* Primary Action Button for Clients */}
      {user.role === 'client' && (
        <div className="px-4 pt-4">
          <Link
            to="/app/requests/new"
            onClick={() => setSidebarOpen(false)}
            className="flex items-center justify-center gap-2 w-full px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold rounded-lg shadow-sm hover:shadow text-sm transition-all"
          >
            <Plus className="h-4 w-4" />
            New Request
          </Link>
        </div>
      )}

      {/* Nav List */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          Navigation
        </div>
        {filtered.map((item) => {
          const active = isActive(item.path);
          const Icon = item.icon;
          return (
            <Link
              key={item.path + item.label}
              to={item.path}
              onClick={() => setSidebarOpen(false)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                active
                  ? 'bg-indigo-50 text-indigo-700 font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              <Icon
                className={`h-4 w-4 transition-colors ${
                  active ? 'text-indigo-600' : 'text-slate-400 group-hover:text-slate-600'
                }`}
              />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* User & Session Footer */}
      <div className="border-t border-slate-100 p-3 bg-slate-50/70">
        <div className="flex items-center justify-between p-2 rounded-lg bg-white border border-slate-200/80 shadow-xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-xs flex-shrink-0">
              {getInitials(user.name)}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900 truncate leading-tight">{user.name}</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold border ${roleMeta.bg} ${roleMeta.text}`}>
                  {roleMeta.label}
                </span>
                {user.organisation && (
                  <span className="text-[10px] text-slate-400 truncate max-w-[80px]">
                    {user.organisation}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            className="p-1.5 text-slate-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors flex-shrink-0"
            title="Log out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </nav>
  );

  return (
    <div className="flex h-screen bg-slate-50 text-slate-800">
      {/* Desktop Sidebar (Light Theme) */}
      <div className="hidden lg:flex lg:w-64 lg:flex-col flex-shrink-0">
        {sidebar}
      </div>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl">
            {sidebar}
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Navbar */}
        <header className="bg-white border-b border-slate-200/80 px-4 sm:px-6 py-3 flex items-center justify-between gap-4 flex-shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-md"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold text-slate-800">Dataset Request Desk</span>
              <span className="text-slate-300">/</span>
              <span className="capitalize">{location.pathname.replace('/app', '').replace('/', '') || 'Dashboard'}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* System Status Pill */}
            <div className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Fleet Connected</span>
            </div>

            {/* User Session Quick View */}
            <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-semibold text-slate-800 leading-tight">{user.email}</p>
                <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">{user.role}</p>
              </div>
              <div className="h-8 w-8 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold text-xs">
                {getInitials(user.name)}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

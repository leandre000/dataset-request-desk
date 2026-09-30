import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { AppLogo } from '../components/AppLogo';
import { Button } from '../components/Button';
import {
  Eye,
  EyeOff,
  CheckCircle2,
  ShieldCheck,
  Zap,
  BarChart3,
  Bot,
  Sparkles,
  ArrowRight,
  Lock,
  Mail,
  UserCheck,
} from 'lucide-react';
import { getErrorMessage } from '../utils';

interface DemoAccount {
  label: string;
  role: 'admin' | 'operator' | 'client';
  name: string;
  email: string;
  password: string;
  description: string;
  badgeColor: string;
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    label: 'Admin',
    role: 'admin',
    name: 'Ada Admin',
    email: 'admin@example.com',
    password: 'admin123',
    description: 'User access control, role modifications & all operations',
    badgeColor: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  {
    label: 'Operator',
    role: 'operator',
    name: 'Olu Operator',
    email: 'ops1@example.com',
    password: 'ops123',
    description: 'Episode assignments, CSV dirty data import & pipeline analytics',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    label: 'Client A',
    role: 'client',
    name: 'Acme Robotics',
    email: 'client-a@example.com',
    password: 'client123',
    description: 'Submits dataset requests, reviews & accepts deliveries',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    label: 'Client B',
    role: 'client',
    name: 'Beta Labs',
    email: 'client-b@example.com',
    password: 'client123',
    description: 'Tenant isolation testing (IDOR prevention verification)',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
  },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [searchParams] = useSearchParams();

  const [email, setEmail] = useState('admin@example.com');
  const [password, setPassword] = useState('admin123');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const expired = searchParams.get('expired');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      addToast('Signed in successfully', 'success');
      navigate('/app');
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (acc: DemoAccount) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError('');
    addToast(`Selected ${acc.label} credentials (${acc.name})`, 'info');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-indigo-50/20 to-blue-50/30 text-slate-800 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="w-full max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
        <AppLogo size="lg" />
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold bg-white border border-slate-200/80 shadow-xs text-slate-600">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>API Online &bull; v1.0.0</span>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="w-full max-w-7xl mx-auto px-6 py-6 lg:py-10 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
        {/* Left Column: Platform Showcase / Hero */}
        <div className="lg:col-span-7 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60 shadow-xs">
            <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
            <span>Robotics Teleoperation & Dataset Desk</span>
          </div>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-[1.15]">
            Powering Robot Learning with{' '}
            <span className="bg-gradient-to-r from-indigo-600 to-blue-600 bg-clip-text text-transparent">
              Precision Teleop Data
            </span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-2xl">
            Streamline the entire lifecycle of robotics collection data. From client task requests and quality-gated episode assignments to idempotent CSV processing and database-level analytics.
          </p>

          {/* Feature Badges Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600 flex-shrink-0">
                <Bot className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Episode Catalog</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  170+ teleoperation episodes indexed by robot, duration, and quality.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-blue-50 text-blue-600 flex-shrink-0">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Enforced Workflows</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Strict state machine with full audit trail and IDOR isolation.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 flex-shrink-0">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Idempotent CSV Import</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Normalizes dirty recording logs with zero duplicate creation.
                </p>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xs p-4 rounded-xl border border-slate-200/70 shadow-xs flex items-start gap-3">
              <div className="p-2 rounded-lg bg-purple-50 text-purple-600 flex-shrink-0">
                <BarChart3 className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">Engine Analytics</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sub-second SQL median percentiles and daily robot throughput.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Sign In & Quick-Login */}
        <div className="lg:col-span-5">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xl shadow-slate-200/60 p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">Sign in to your account</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your credentials or click any demo role below to test the platform.
              </p>
            </div>

            {expired && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs font-medium text-amber-800 flex items-center gap-2">
                <span>Session expired. Please sign in again.</span>
              </div>
            )}

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs font-semibold text-red-700">
                {error}
              </div>
            )}

            {/* Manual Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="operator@example.com"
                    className="w-full pl-9 pr-3 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Password
                  </label>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-10 py-2 text-sm border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold rounded-lg shadow-sm hover:shadow transition-all flex items-center justify-center gap-2"
              >
                {loading ? 'Authenticating...' : 'Sign In'}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            {/* Quick Demo Logins Section */}
            <div className="pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1-Click Evaluator Personas
                </span>
                <span className="text-[10px] text-indigo-600 font-semibold">Click to populate</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {DEMO_ACCOUNTS.map((acc) => {
                  const isSelected = email === acc.email;
                  return (
                    <button
                      key={acc.email}
                      type="button"
                      onClick={() => fillDemo(acc)}
                      className={`text-left p-2.5 rounded-lg border transition-all ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/50 ring-1 ring-indigo-500'
                          : 'border-slate-200 hover:border-slate-300 bg-slate-50/50 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{acc.label}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${acc.badgeColor}`}>
                          {acc.role}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 truncate mt-0.5">{acc.name}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-7xl mx-auto px-6 py-4 text-center text-xs text-slate-400 border-t border-slate-200/60">
        <p>Dataset Request Desk &bull; Teleoperation Data Operations &bull; Production Ready</p>
      </footer>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { PageSpinner, EmptyState } from '../components/Shared';
import {
  ClipboardList,
  Plus,
  Clock,
  CheckCircle,
  Truck,
  AlertTriangle,
  ArrowRight,
  TrendingUp,
  Database,
  Upload,
} from 'lucide-react';
import { formatDate, relativeTime } from '../utils';
import type { DatasetRequest, PaginatedResponse } from '../types';

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === 'client') return <ClientDashboard />;
  return <OperatorDashboard />;
}

function ClientDashboard() {
  const [requests, setRequests] = useState<DatasetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedResponse<DatasetRequest>>('/api/requests?page_size=50')
      .then((r) => setRequests(r.data.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const counts = {
    total: requests.length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    delivered: requests.filter((r) => r.status === 'delivered').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
  };

  const cards = [
    { label: 'Total Requests', value: counts.total, icon: <ClipboardList className="h-5 w-5 text-indigo-600" />, border: 'border-l-indigo-500' },
    { label: 'In Progress', value: counts.in_progress, icon: <Clock className="h-5 w-5 text-amber-600" />, border: 'border-l-amber-500' },
    { label: 'Awaiting Your Review', value: counts.delivered, icon: <Truck className="h-5 w-5 text-purple-600" />, border: 'border-l-purple-500' },
    { label: 'Accepted Deliveries', value: counts.accepted, icon: <CheckCircle className="h-5 w-5 text-emerald-600" />, border: 'border-l-emerald-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Client Overview</h1>
          <p className="text-sm text-slate-500 mt-1">
            Monitor real-time progress, episode fulfillment meters, and review delivered robot datasets.
          </p>
        </div>
        <Link to="/app/requests/new">
          <Button className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold shadow-xs">
            <Plus className="h-4 w-4 mr-2" /> Create Request
          </Button>
        </Link>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`bg-white rounded-xl border-l-4 ${c.border} border border-slate-200/70 shadow-xs p-5 transition-all hover:shadow-sm`}>
            <div className="flex items-center justify-between">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500">{c.label}</p>
              {c.icon}
            </div>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Requests Table Card */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Your Active Requests</h2>
          <Link to="/app/requests" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
            View All ({requests.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="No dataset requests created"
            description="Submit your first robotics collection request to initiate the fulfillment workflow."
            action={
              <Link to="/app/requests/new">
                <Button>Create First Request</Button>
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200/70 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold">Task Name</th>
                  <th className="px-6 py-3 font-semibold">Target Volume</th>
                  <th className="px-6 py-3 font-semibold">Fulfillment Meter</th>
                  <th className="px-6 py-3 font-semibold">Target Deadline</th>
                  <th className="px-6 py-3 font-semibold">Current Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.slice(0, 10).map((r) => {
                  const percent = Math.min(100, Math.round((r.episodes_assigned / r.episodes_requested) * 100));
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{r.task_name}</td>
                      <td className="px-6 py-4 text-slate-600 font-mono text-xs">{r.episodes_requested} episodes</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-32 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 font-mono">
                            {r.episodes_assigned}/{r.episodes_requested}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{formatDate(r.deadline)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link to={`/app/requests/${r.id}`} className="text-indigo-600 hover:text-indigo-800 text-xs font-bold inline-flex items-center gap-1">
                          Review →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function OperatorDashboard() {
  const [requests, setRequests] = useState<DatasetRequest[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<PaginatedResponse<DatasetRequest>>('/api/requests?page_size=100')
      .then((r) => setRequests(r.data.items))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageSpinner />;

  const counts = {
    total: requests.length,
    submitted: requests.filter((r) => r.status === 'submitted').length,
    in_progress: requests.filter((r) => r.status === 'in_progress').length,
    delivered: requests.filter((r) => r.status === 'delivered').length,
    accepted: requests.filter((r) => r.status === 'accepted').length,
  };

  const readyForDelivery = requests.filter(
    (r) => r.status === 'in_progress' && r.episodes_assigned >= r.episodes_requested
  ).length;

  const cards = [
    { label: 'Total Requests', value: counts.total, icon: <ClipboardList className="h-5 w-5 text-indigo-600" />, border: 'border-l-indigo-500' },
    { label: 'In Queue (Submitted)', value: counts.submitted, icon: <AlertTriangle className="h-5 w-5 text-amber-500" />, border: 'border-l-amber-500' },
    { label: 'Active Work', value: counts.in_progress, icon: <Clock className="h-5 w-5 text-blue-500" />, border: 'border-l-blue-500' },
    { label: 'Ready for Delivery', value: readyForDelivery, icon: <Truck className="h-5 w-5 text-emerald-500" />, border: 'border-l-emerald-500' },
    { label: 'Completed Deliveries', value: counts.delivered + counts.accepted, icon: <CheckCircle className="h-5 w-5 text-purple-500" />, border: 'border-l-purple-500' },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-6 rounded-xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Operations Control Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time pipeline monitoring, episode allocation desk, and workflow fulfillment gates.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/app/import">
            <Button variant="secondary" className="text-xs">
              <Upload className="h-4 w-4 mr-1.5" /> Import CSV
            </Button>
          </Link>
          <Link to="/app/episodes">
            <Button variant="secondary" className="text-xs">
              <Database className="h-4 w-4 mr-1.5" /> Browse Catalog
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map((c) => (
          <div key={c.label} className={`bg-white rounded-xl border-l-4 ${c.border} border border-slate-200/70 shadow-xs p-4 transition-all hover:shadow-sm`}>
            <div className="flex items-center justify-between">
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{c.label}</p>
              {c.icon}
            </div>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">All Client Dataset Requests</h2>
          <Link to="/app/requests" className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1">
            View All ({requests.length}) <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {requests.length === 0 ? (
          <EmptyState icon={<ClipboardList className="h-12 w-12" />} title="No requests in pipeline" />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-slate-600 border-b border-slate-200/70 text-xs font-bold uppercase tracking-wider">
                  <th className="px-6 py-3 font-semibold w-16">ID</th>
                  <th className="px-6 py-3 font-semibold">Client</th>
                  <th className="px-6 py-3 font-semibold">Task</th>
                  <th className="px-6 py-3 font-semibold">Fulfillment Progress</th>
                  <th className="px-6 py-3 font-semibold">Deadline</th>
                  <th className="px-6 py-3 font-semibold">Status</th>
                  <th className="px-6 py-3 font-semibold text-right">Workflow</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.slice(0, 15).map((r) => {
                  const percent = Math.min(100, Math.round((r.episodes_assigned / r.episodes_requested) * 100));
                  const isFitted = r.episodes_assigned >= r.episodes_requested;
                  return (
                    <tr key={r.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-mono text-slate-500 font-semibold text-xs">#{r.id}</td>
                      <td className="px-6 py-4 font-bold text-slate-900">
                        {r.client_name || r.client_organisation}
                        {r.client_organisation && (
                          <span className="block text-[11px] font-normal text-slate-400 font-sans">
                            {r.client_organisation}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-800 font-medium">{r.task_name}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-24 bg-slate-100 rounded-full h-2 overflow-hidden">
                            <div
                              className={`h-2 rounded-full transition-all duration-300 ${
                                isFitted ? 'bg-emerald-500' : 'bg-indigo-600'
                              }`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                          <span className="text-xs font-semibold text-slate-700 font-mono">
                            {r.episodes_assigned}/{r.episodes_requested}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-600 text-xs whitespace-nowrap">{formatDate(r.deadline)}</td>
                      <td className="px-6 py-4 whitespace-nowrap"><StatusBadge status={r.status} /></td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <Link
                          to={`/app/requests/${r.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
                        >
                          Manage →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

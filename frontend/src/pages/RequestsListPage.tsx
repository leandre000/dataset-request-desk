import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { StatusBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { PageSpinner, EmptyState } from '../components/Shared';
import { ClipboardList, Plus, Search, Filter } from 'lucide-react';
import { formatDate, relativeTime } from '../utils';
import type { DatasetRequest, PaginatedResponse } from '../types';

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'submitted', label: 'Submitted' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'delivered', label: 'Delivered' },
  { value: 'accepted', label: 'Accepted' },
  { value: 'rejected', label: 'Rejected' },
];

export default function RequestsListPage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<DatasetRequest[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', '15');
      if (statusFilter) params.append('status', statusFilter);
      if (search) params.append('search', search);

      const res = await api.get<PaginatedResponse<DatasetRequest>>(`/api/requests?${params.toString()}`);
      setRequests(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, search]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleStatusChange = (val: string) => {
    setPage(1);
    setStatusFilter(val);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {user?.role === 'client' ? 'My Dataset Requests' : 'All Dataset Requests'}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === 'client'
              ? 'Track, monitor, and review your dataset collection requests'
              : 'Manage client requests, assign episodes, and monitor delivery workflows'}
          </p>
        </div>

        {user?.role === 'client' && (
          <Link to="/app/requests/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </Link>
        )}
      </div>

      {/* Filters & Search */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by task name, client, or notes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
          {search && (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2"
            >
              Clear
            </button>
          )}
        </form>

        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="border border-gray-300 rounded-md text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Table & Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12">
            <PageSpinner />
          </div>
        ) : requests.length === 0 ? (
          <EmptyState
            icon={<ClipboardList className="h-12 w-12" />}
            title="No requests found"
            description={
              search || statusFilter
                ? 'Try adjusting your search criteria or status filter.'
                : 'There are currently no dataset requests.'
            }
            action={
              user?.role === 'client' && !search && !statusFilter ? (
                <Link to="/app/requests/new">
                  <Button>Create Request</Button>
                </Link>
              ) : undefined
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                    <th className="px-6 py-3 font-medium">ID</th>
                    {user?.role !== 'client' && <th className="px-6 py-3 font-medium">Client</th>}
                    <th className="px-6 py-3 font-medium">Task Name</th>
                    <th className="px-6 py-3 font-medium">Fulfillment Progress</th>
                    <th className="px-6 py-3 font-medium">Deadline</th>
                    <th className="px-6 py-3 font-medium">Status</th>
                    <th className="px-6 py-3 font-medium">Created</th>
                    <th className="px-6 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {requests.map((r) => {
                    const percent = Math.min(100, Math.round((r.episodes_assigned / r.episodes_requested) * 100));
                    const isComplete = r.episodes_assigned >= r.episodes_requested;
                    return (
                      <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 font-mono text-gray-500">#{r.id}</td>
                        {user?.role !== 'client' && (
                          <td className="px-6 py-4">
                            <div className="font-medium text-gray-900">{r.client_name || 'Client'}</div>
                            {r.client_organisation && (
                              <div className="text-xs text-gray-500">{r.client_organisation}</div>
                            )}
                          </td>
                        )}
                        <td className="px-6 py-4 font-medium text-gray-900">{r.task_name}</td>
                        <td className="px-6 py-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-xs text-gray-600">
                              <span>
                                {r.episodes_assigned} / {r.episodes_requested} episodes
                              </span>
                              <span className="font-semibold">{percent}%</span>
                            </div>
                            <div className="w-36 bg-gray-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full transition-all duration-300 ${
                                  isComplete ? 'bg-green-500' : 'bg-blue-600'
                                }`}
                                style={{ width: `${percent}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 whitespace-nowrap">
                          {formatDate(r.deadline)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                        </td>
                        <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                          {relativeTime(r.created_at)}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <Link
                            to={`/app/requests/${r.id}`}
                            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm"
                          >
                            Details →
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <Pagination page={page} pages={pages} onPageChange={setPage} />
          </>
        )}
      </div>
    </div>
  );
}

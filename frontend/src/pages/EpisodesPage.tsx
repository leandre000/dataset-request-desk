import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { QualityBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { Pagination } from '../components/Pagination';
import { PageSpinner, EmptyState } from '../components/Shared';
import { Database, Search, Filter, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatDateTime, formatDuration } from '../utils';
import type { Episode, PaginatedResponse } from '../types';

export default function EpisodesPage() {
  const [episodes, setEpisodes] = useState<Episode[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [qualityFilter, setQualityFilter] = useState('');
  const [assignedFilter, setAssignedFilter] = useState('');

  const fetchEpisodes = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', String(page));
      params.append('page_size', '20');
      if (search) params.append('search', search);
      if (qualityFilter) params.append('quality', qualityFilter);
      if (assignedFilter !== '') {
        params.append('assigned', assignedFilter);
      }

      const res = await api.get<PaginatedResponse<Episode>>(`/api/episodes?${params.toString()}`);
      setEpisodes(res.data.items);
      setTotal(res.data.total);
      setPages(res.data.pages);
    } catch (err) {
      console.error('Failed to load episodes', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEpisodes();
  }, [page, search, qualityFilter, assignedFilter]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const handleResetFilters = () => {
    setSearchInput('');
    setSearch('');
    setQualityFilter('');
    setAssignedFilter('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recorded Episodes</h1>
          <p className="text-sm text-gray-500 mt-1">
            Browse and inspect teleoperation episode metadata imported from data collection
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link to="/app/import">
            <Button variant="secondary">
              Import CSV
            </Button>
          </Link>
          <Button variant="ghost" onClick={fetchEpisodes} title="Refresh">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row items-stretch md:items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search episode ID, task name, or operator..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <Button type="submit" variant="secondary">
            Search
          </Button>
        </form>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={qualityFilter}
              onChange={(e) => {
                setPage(1);
                setQualityFilter(e.target.value);
              }}
              className="border border-gray-300 rounded-md text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Qualities</option>
              <option value="good">Good</option>
              <option value="usable">Usable</option>
              <option value="bad">Bad</option>
            </select>
          </div>

          <select
            value={assignedFilter}
            onChange={(e) => {
              setPage(1);
              setAssignedFilter(e.target.value);
            }}
            className="border border-gray-300 rounded-md text-sm py-2 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Assignments</option>
            <option value="false">Unassigned Only</option>
            <option value="true">Assigned Only</option>
          </select>

          {(search || qualityFilter || assignedFilter !== '') && (
            <button
              onClick={handleResetFilters}
              className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Episodes Table */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between text-xs text-gray-500">
          <span>Showing {episodes.length} of {total.toLocaleString()} total episodes</span>
        </div>

        {loading ? (
          <div className="p-12">
            <PageSpinner />
          </div>
        ) : episodes.length === 0 ? (
          <EmptyState
            icon={<Database className="h-12 w-12" />}
            title="No episodes found"
            description="No episodes match your search or filter criteria. Try importing CSV data or adjusting filters."
            action={
              <Link to="/app/import">
                <Button>Go to Import</Button>
              </Link>
            }
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-gray-600 border-b border-gray-200">
                    <th className="px-6 py-3 font-medium">Episode Code</th>
                    <th className="px-6 py-3 font-medium">Task</th>
                    <th className="px-6 py-3 font-medium">Robot ID</th>
                    <th className="px-6 py-3 font-medium">Duration</th>
                    <th className="px-6 py-3 font-medium">Operator</th>
                    <th className="px-6 py-3 font-medium">Recorded At</th>
                    <th className="px-6 py-3 font-medium">Quality</th>
                    <th className="px-6 py-3 font-medium">Assignment</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {episodes.map((ep) => (
                    <tr key={ep.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 font-mono font-medium text-blue-600">
                        {ep.episode_id}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">{ep.task_name}</td>
                      <td className="px-6 py-4 font-mono text-xs text-gray-600">{ep.robot_id}</td>
                      <td className="px-6 py-4 text-gray-600">{formatDuration(ep.duration_seconds)}</td>
                      <td className="px-6 py-4 text-gray-700">{ep.operator_name}</td>
                      <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                        {formatDateTime(ep.recorded_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <QualityBadge quality={ep.quality} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {ep.assigned_to_request_id ? (
                          <Link
                            to={`/app/requests/${ep.assigned_to_request_id}`}
                            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-700 bg-purple-50 px-2 py-1 rounded hover:bg-purple-100"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Request #{ep.assigned_to_request_id}
                          </Link>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                            Available
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
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

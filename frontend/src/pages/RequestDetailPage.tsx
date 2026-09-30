import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { StatusBadge, QualityBadge } from '../components/Badges';
import { Button } from '../components/Button';
import { ConfirmModal } from '../components/ConfirmModal';
import { Pagination } from '../components/Pagination';
import { PageSpinner, EmptyState } from '../components/Shared';
import { CheckCircle, XCircle, Truck, ArrowLeft, Search, Clock } from 'lucide-react';
import { formatDate, formatDateTime, getErrorMessage } from '../utils';
import type { DatasetRequest, Episode, PaginatedResponse } from '../types';

export default function RequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { addToast } = useToast();

  const [request, setRequest] = useState<DatasetRequest | null>(null);
  const [loading, setLoading] = useState(true);

  // Assignment panel state (operator/admin only)
  const [compatEpisodes, setCompatEpisodes] = useState<Episode[]>([]);
  const [compatTotal, setCompatTotal] = useState(0);
  const [compatPage, setCompatPage] = useState(1);
  const [compatPages, setCompatPages] = useState(0);
  const [compatSearch, setCompatSearch] = useState('');
  const [compatRobot, setCompatRobot] = useState('');
  const [compatQuality, setCompatQuality] = useState('');
  const [compatLoading, setCompatLoading] = useState(false);

  const [assigningId, setAssigningId] = useState<string | null>(null);

  // Modals
  const [confirmAction, setConfirmAction] = useState<{
    type: 'accept' | 'reject' | 'deliver' | 'start';
    loading: boolean;
  } | null>(null);

  const fetchRequest = useCallback(async () => {
    try {
      const resp = await api.get<DatasetRequest>(`/api/requests/${id}`);
      setRequest(resp.data);
    } catch {
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchCompatible = useCallback(async () => {
    if (!user || !['operator', 'admin'].includes(user.role)) return;
    setCompatLoading(true);
    try {
      const params = new URLSearchParams({ page: String(compatPage), page_size: '10' });
      if (compatSearch) params.set('search', compatSearch);
      if (compatRobot) params.set('robot_id', compatRobot);
      if (compatQuality) params.set('quality', compatQuality);
      const resp = await api.get<PaginatedResponse<Episode>>(`/api/episodes/compatible/${id}?${params}`);
      setCompatEpisodes(resp.data.items);
      setCompatTotal(resp.data.total);
      setCompatPages(resp.data.pages);
    } catch {
      setCompatEpisodes([]);
    } finally {
      setCompatLoading(false);
    }
  }, [id, compatPage, compatSearch, compatRobot, compatQuality, user]);

  useEffect(() => { fetchRequest(); }, [fetchRequest]);
  useEffect(() => { fetchCompatible(); }, [fetchCompatible]);

  const handleAssign = async (episodeId: string) => {
    setAssigningId(episodeId);
    try {
      await api.post(`/api/requests/${id}/assign`, { episode_id: episodeId });
      addToast(`Assigned ${episodeId}`, 'success');
      await fetchRequest();
      await fetchCompatible();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setAssigningId(null);
    }
  };

  const handleStatusAction = async (action: 'accept' | 'reject' | 'deliver' | 'start') => {
    setConfirmAction({ type: action, loading: true });
    try {
      const endpoint =
        action === 'accept' ? `/api/requests/${id}/accept` :
        action === 'reject' ? `/api/requests/${id}/reject` :
        action === 'deliver' ? `/api/requests/${id}/deliver` :
        `/api/requests/${id}/status`;

      const body = action === 'start' ? { status: 'in_progress' } : undefined;
      await api.post(endpoint, body);
      addToast(
        action === 'accept' ? 'Request accepted' :
        action === 'reject' ? 'Request rejected' :
        action === 'deliver' ? 'Request delivered' :
        'Request started',
        'success'
      );
      await fetchRequest();
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setConfirmAction(null);
    }
  };

  if (loading) return <PageSpinner />;
  if (!request) return <EmptyState title="Request not found" />;

  const isOperator = user && ['operator', 'admin'].includes(user.role);
  const isClient = user && user.role === 'client';
  const isOwner = user && request.client_id === user.id;
  const progress = request.episodes_requested > 0
    ? Math.min(100, (request.episodes_assigned / request.episodes_requested) * 100)
    : 0;
  const isReadyForDelivery = request.episodes_assigned >= request.episodes_requested;

  const confirmMessages = {
    accept: { title: 'Accept Delivery', message: 'Are you sure you want to accept this dataset delivery? This action cannot be undone.', label: 'Accept', variant: 'success' as const },
    reject: { title: 'Reject Delivery', message: 'Are you sure you want to reject this dataset delivery? The request will be sent back for rework.', label: 'Reject', variant: 'danger' as const },
    deliver: { title: 'Deliver Request', message: `This request has ${request.episodes_assigned}/${request.episodes_requested} episodes assigned. Mark it as delivered?`, label: 'Deliver', variant: 'primary' as const },
    start: { title: 'Start Working', message: 'Move this request to "In Progress"?', label: 'Start', variant: 'primary' as const },
  };

  // Workflow timeline steps
  const statusOrder = ['submitted', 'in_progress', 'delivered', 'accepted'];
  const hasRejection = request.status_history?.some((h) => h.new_status === 'rejected');
  const currentIdx = statusOrder.indexOf(request.status);

  return (
    <div>
      <Link to={isClient ? '/app/requests' : '/app/requests'} className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back to requests
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Header card */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Request #{request.id}</h1>
                <p className="text-lg text-gray-600 mt-1 capitalize">{request.task_name}</p>
              </div>
              <StatusBadge status={request.status} />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Client</p>
                <p className="font-medium text-gray-900">{request.client_name}</p>
                {request.client_organisation && <p className="text-xs text-gray-500">{request.client_organisation}</p>}
              </div>
              <div>
                <p className="text-gray-500">Deadline</p>
                <p className="font-medium text-gray-900">{formatDate(request.deadline)}</p>
              </div>
              <div>
                <p className="text-gray-500">Created</p>
                <p className="font-medium text-gray-900">{formatDate(request.created_at)}</p>
              </div>
              <div>
                <p className="text-gray-500">Episodes</p>
                <p className="font-medium text-gray-900">{request.episodes_assigned} / {request.episodes_requested}</p>
              </div>
            </div>

            {request.notes && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{request.notes}</p>
              </div>
            )}

            {/* Progress bar */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium text-gray-700">Assignment Progress</p>
                <p className="text-sm text-gray-500">
                  {isReadyForDelivery ? (
                    <span className="text-green-600 font-medium">✓ Ready for delivery</span>
                  ) : (
                    <span>{request.episodes_requested - request.episodes_assigned} more episode{request.episodes_requested - request.episodes_assigned !== 1 ? 's' : ''} required</span>
                  )}
                </p>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${isReadyForDelivery ? 'bg-green-500' : 'bg-blue-600'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>

            {/* Actions */}
            <div className="mt-6 flex flex-wrap gap-3">
              {isOperator && request.status === 'submitted' && (
                <Button onClick={() => setConfirmAction({ type: 'start', loading: false })}>Start Working</Button>
              )}
              {isOperator && request.status === 'in_progress' && isReadyForDelivery && (
                <Button onClick={() => setConfirmAction({ type: 'deliver', loading: false })} variant="success">
                  <Truck className="h-4 w-4 mr-2" /> Deliver Request
                </Button>
              )}
              {isClient && isOwner && request.status === 'delivered' && (
                <>
                  <Button onClick={() => setConfirmAction({ type: 'accept', loading: false })} variant="success">
                    <CheckCircle className="h-4 w-4 mr-2" /> Accept Delivery
                  </Button>
                  <Button onClick={() => setConfirmAction({ type: 'reject', loading: false })} variant="danger">
                    <XCircle className="h-4 w-4 mr-2" /> Reject Delivery
                  </Button>
                </>
              )}
              {isOperator && request.status === 'rejected' && (
                <Button onClick={() => setConfirmAction({ type: 'start', loading: false })}>Resume Working</Button>
              )}
            </div>
          </div>

          {/* Assigned episodes */}
          {request.assignments && request.assignments.length > 0 && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Assigned Episodes ({request.assignments.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left text-gray-600">
                      <th className="px-6 py-3 font-medium">Episode</th>
                      <th className="px-6 py-3 font-medium">Assigned By</th>
                      <th className="px-6 py-3 font-medium">Assigned At</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {request.assignments.map((a) => (
                      <tr key={a.id}>
                        <td className="px-6 py-3 font-mono text-gray-900">{a.episode_code}</td>
                        <td className="px-6 py-3 text-gray-600">{a.assigned_by_name}</td>
                        <td className="px-6 py-3 text-gray-500">{formatDateTime(a.assigned_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Compatible episodes for assignment (operator/admin) */}
          {isOperator && ['submitted', 'in_progress'].includes(request.status) && (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">Available Episodes</h2>
                <p className="text-sm text-gray-500 mt-1">Compatible episodes for "{request.task_name}" (good/usable quality, unassigned)</p>
              </div>

              <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search episode ID..."
                    value={compatSearch}
                    onChange={(e) => { setCompatSearch(e.target.value); setCompatPage(1); }}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-500"
                  />
                </div>
                <select
                  value={compatRobot}
                  onChange={(e) => { setCompatRobot(e.target.value); setCompatPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Robots</option>
                  {['arm-01', 'arm-02', 'arm-03', 'mobile-01', 'humanoid-01'].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
                <select
                  value={compatQuality}
                  onChange={(e) => { setCompatQuality(e.target.value); setCompatPage(1); }}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm"
                >
                  <option value="">All Qualities</option>
                  <option value="good">Good</option>
                  <option value="usable">Usable</option>
                </select>
              </div>

              {compatLoading ? (
                <div className="py-8 text-center text-gray-400">Loading episodes...</div>
              ) : compatEpisodes.length === 0 ? (
                <EmptyState title="No compatible episodes found" description="Try adjusting your filters or import more episodes." />
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-gray-50 text-left text-gray-600">
                          <th className="px-6 py-3 font-medium">Episode ID</th>
                          <th className="px-6 py-3 font-medium">Robot</th>
                          <th className="px-6 py-3 font-medium">Quality</th>
                          <th className="px-6 py-3 font-medium">Duration</th>
                          <th className="px-6 py-3 font-medium">Operator</th>
                          <th className="px-6 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200">
                        {compatEpisodes.map((ep) => (
                          <tr key={ep.id} className="hover:bg-gray-50">
                            <td className="px-6 py-3 font-mono text-gray-900">{ep.episode_id}</td>
                            <td className="px-6 py-3 text-gray-600">{ep.robot_id}</td>
                            <td className="px-6 py-3"><QualityBadge quality={ep.quality} /></td>
                            <td className="px-6 py-3 text-gray-600">{ep.duration_seconds}s</td>
                            <td className="px-6 py-3 text-gray-600">{ep.operator_name}</td>
                            <td className="px-6 py-3">
                              <Button
                                size="sm"
                                onClick={() => handleAssign(ep.episode_id)}
                                loading={assigningId === ep.episode_id}
                                disabled={!!assigningId}
                              >
                                Assign
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Pagination page={compatPage} pages={compatPages} onPageChange={setCompatPage} />
                </>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Workflow timeline */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">Workflow</h3>
            <div className="space-y-0">
              {statusOrder.map((s, i) => {
                const reached = i <= currentIdx || request.status === 'rejected';
                const isCurrent = s === request.status;
                return (
                  <div key={s} className="flex items-start gap-3">
                    <div className="flex flex-col items-center">
                      <div className={`w-3 h-3 rounded-full border-2 mt-1 ${isCurrent ? 'border-blue-600 bg-blue-600' : reached ? 'border-green-500 bg-green-500' : 'border-gray-300 bg-white'}`} />
                      {i < statusOrder.length - 1 && <div className={`w-0.5 h-6 ${reached ? 'bg-green-500' : 'bg-gray-200'}`} />}
                    </div>
                    <div className="pb-4">
                      <p className={`text-sm font-medium capitalize ${isCurrent ? 'text-gray-900' : reached ? 'text-green-700' : 'text-gray-400'}`}>
                        {s.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                );
              })}
              {request.status === 'rejected' && (
                <div className="flex items-start gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 rounded-full border-2 border-red-500 bg-red-500 mt-1" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-700">Rejected</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status history */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wide">History</h3>
            {request.status_history && request.status_history.length > 0 ? (
              <div className="space-y-4">
                {request.status_history.map((h) => (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <Clock className="h-4 w-4 text-gray-400 mt-0.5" />
                    </div>
                    <div>
                      <p className="text-sm text-gray-900">
                        {h.previous_status ? (
                          <>{h.previous_status.replace('_', ' ')} → <span className="font-medium capitalize">{h.new_status.replace('_', ' ')}</span></>
                        ) : (
                          <span className="font-medium capitalize">{h.new_status.replace('_', ' ')}</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500">
                        by {h.changed_by_name} · {formatDateTime(h.changed_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">No history</p>
            )}
          </div>
        </div>
      </div>

      {/* Confirm modal */}
      {confirmAction && (
        <ConfirmModal
          open
          title={confirmMessages[confirmAction.type].title}
          message={confirmMessages[confirmAction.type].message}
          confirmLabel={confirmMessages[confirmAction.type].label}
          confirmVariant={confirmMessages[confirmAction.type].variant}
          loading={confirmAction.loading}
          onConfirm={() => handleStatusAction(confirmAction.type)}
          onCancel={() => setConfirmAction(null)}
        />
      )}
    </div>
  );
}

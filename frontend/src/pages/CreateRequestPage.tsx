import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { getErrorMessage } from '../utils';
import {
  ClipboardPlus,
  Calendar,
  Layers,
  FileText,
  ArrowLeft,
  CheckCircle2,
  Info,
} from 'lucide-react';

export default function CreateRequestPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [taskName, setTaskName] = useState('');
  const [episodesRequested, setEpisodesRequested] = useState('');
  const [deadline, setDeadline] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!taskName.trim()) errs.task_name = 'Task name is required';
    const ep = parseInt(episodesRequested);
    if (!episodesRequested || isNaN(ep) || ep <= 0) {
      errs.episodes_requested = 'Must be a positive number';
    } else if (ep > 10000) {
      errs.episodes_requested = 'Maximum 10,000 episodes per request';
    }
    if (!deadline) errs.deadline = 'Deadline date is required';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const resp = await api.post('/api/requests', {
        task_name: taskName.trim(),
        episodes_requested: parseInt(episodesRequested),
        deadline: new Date(deadline).toISOString(),
        notes: notes.trim() || null,
      });
      addToast('Dataset request submitted successfully', 'success');
      navigate(`/app/requests/${resp.data.id}`);
    } catch (err) {
      addToast(getErrorMessage(err), 'error');
    } finally {
      setLoading(false);
    }
  };

  const SUGGESTED_TASKS = [
    'pick cup',
    'fold towel',
    'open drawer',
    'wipe table',
    'stack blocks',
    'sort objects',
  ];

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Breadcrumb / Back button */}
      <div className="flex items-center gap-2">
        <Link
          to="/app/requests"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Requests
        </Link>
      </div>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
          <ClipboardPlus className="h-6 w-6 text-indigo-600" />
          Create New Dataset Request
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Specify robot task requirements, target episode volume, and fulfillment deadlines.
        </p>
      </div>

      {/* Form Card (Light Theme) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200 p-6 sm:p-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Task Name */}
          <div>
            <label htmlFor="task_name" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Task Name <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                id="task_name"
                type="text"
                value={taskName}
                onChange={(e) => setTaskName(e.target.value)}
                placeholder="e.g., pick cup, fold towel, open drawer"
                className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                  errors.task_name ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300 hover:border-slate-400'
                }`}
              />
            </div>
            {errors.task_name && <p className="text-xs text-red-600 mt-1">{errors.task_name}</p>}

            {/* Quick Suggestions Chips */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5">
              <span className="text-xs text-slate-400">Suggestions:</span>
              {SUGGESTED_TASKS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTaskName(t)}
                  className="text-xs px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-md font-medium transition-colors"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Grid: Episodes Requested & Deadline */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div>
              <label htmlFor="episodes_requested" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Episodes Requested <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="episodes_requested"
                  type="number"
                  min="1"
                  max="10000"
                  value={episodesRequested}
                  onChange={(e) => setEpisodesRequested(e.target.value)}
                  placeholder="e.g., 20"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.episodes_requested ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300 hover:border-slate-400'
                  }`}
                />
              </div>
              {errors.episodes_requested ? (
                <p className="text-xs text-red-600 mt-1">{errors.episodes_requested}</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Number of qualified teleoperation episodes required</p>
              )}
            </div>

            <div>
              <label htmlFor="deadline" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Target Deadline <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="deadline"
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                    errors.deadline ? 'border-red-300 ring-1 ring-red-300' : 'border-slate-300 hover:border-slate-400'
                  }`}
                />
              </div>
              {errors.deadline ? (
                <p className="text-xs text-red-600 mt-1">{errors.deadline}</p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">Target fulfillment date</p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label htmlFor="notes" className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
              Specification Notes (Optional)
            </label>
            <textarea
              id="notes"
              rows={3}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Provide lighting requirements, robot gripper configurations, or specific object variations..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 rounded-lg text-sm transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Information Notice */}
          <div className="p-4 rounded-lg bg-blue-50/60 border border-blue-200/60 flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-blue-900 space-y-1">
              <p className="font-bold">Workflow Lifecycle Guarantee:</p>
              <p className="text-blue-800 leading-relaxed">
                Requests are submitted into the operations queue. Operators match and assign only qualified (<code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono">good</code> or <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono">usable</code>) episodes. Delivery cannot proceed until the full episode volume is fulfilled.
              </p>
            </div>
          </div>

          {/* Submit Action */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
            <Link to="/app/requests">
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold"
            >
              {loading ? 'Submitting...' : 'Submit Dataset Request'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

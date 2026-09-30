import React, { useState } from 'react';
import api from '../api/client';
import { useToast } from '../context/ToastContext';
import { Button } from '../components/Button';
import { PageSpinner } from '../components/Shared';
import { UploadCloud, CheckCircle2, AlertTriangle, FileText, RefreshCw, Info, ChevronDown } from 'lucide-react';
import type { ImportReport } from '../types';

export default function ImportPage() {
  const { addToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [report, setReport] = useState<ImportReport | null>(null);
  const [filterReason, setFilterReason] = useState<string>('');
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.name.endsWith('.csv')) {
        setFile(selected);
      } else {
        addToast('Please select a valid .csv file', 'error');
      }
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setReport(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await api.post<ImportReport>('/api/episodes/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setReport(res.data);
      addToast(
        `Import completed: ${res.data.imported} imported, ${res.data.skipped} skipped`,
        'success'
      );
    } catch (err: any) {
      const detail = err.response?.data?.detail || 'Import failed. Please verify CSV formatting.';
      addToast(detail, 'error');
    } finally {
      setUploading(false);
    }
  };

  const filteredErrors = report
    ? report.errors.filter((e) =>
        filterReason ? e.reason.toLowerCase().includes(filterReason.toLowerCase()) : true
      )
    : [];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Title */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Import Episode Metadata</h1>
        <p className="text-sm text-gray-500 mt-1">
          Upload teleoperation recording logs (CSV format). The import engine validates records, handles dirty data, and is strictly idempotent.
        </p>
      </div>

      {/* Upload Box */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 space-y-6">
        <div
          onDragEnter={handleDrag}
          onDragOver={handleDrag}
          onDragLeave={handleDrag}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50/50'
              : file
              ? 'border-green-400 bg-green-50/20'
              : 'border-gray-300 hover:border-gray-400 bg-gray-50/50'
          }`}
        >
          <UploadCloud
            className={`mx-auto h-12 w-12 ${
              file ? 'text-green-600' : 'text-gray-400'
            }`}
          />
          <div className="mt-4">
            {file ? (
              <div>
                <p className="text-base font-semibold text-gray-800">{file.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(file.size / 1024).toFixed(1)} KB &bull; Ready to process
                </p>
              </div>
            ) : (
              <div>
                <label className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium">
                  <span>Click to select file</span>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </label>
                <span className="text-gray-500 text-sm"> or drag and drop your CSV here</span>
                <p className="text-xs text-gray-400 mt-1">Supports standard CSV exports from teleoperation stations</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Info className="h-4 w-4 text-blue-500 flex-shrink-0" />
            <span>
              Safe to re-run against identical or overlapping files without generating duplicate records.
            </span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            {file && (
              <Button
                variant="secondary"
                onClick={() => {
                  setFile(null);
                  setReport(null);
                }}
                disabled={uploading}
              >
                Clear
              </Button>
            )}
            <Button
              onClick={handleUpload}
              disabled={!file || uploading}
              className="w-full sm:w-auto"
            >
              {uploading ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Processing CSV...
                </>
              ) : (
                'Run Import'
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Import Report Section */}
      {report && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden space-y-6 p-6">
          <div className="border-b border-gray-200 pb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
              Import Execution Summary
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Detailed breakdown of records imported into database versus rows skipped.
            </p>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-green-700">
                Successfully Imported
              </span>
              <p className="text-3xl font-extrabold text-green-900 mt-1">{report.imported}</p>
              <p className="text-xs text-green-600 mt-1">New episodes added to catalog</p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Skipped Rows
              </span>
              <p className="text-3xl font-extrabold text-amber-900 mt-1">{report.skipped}</p>
              <p className="text-xs text-amber-600 mt-1">Duplicates or invalid rows</p>
            </div>

            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-gray-700">
                Total Processed
              </span>
              <p className="text-3xl font-extrabold text-gray-900 mt-1">
                {report.imported + report.skipped}
              </p>
              <p className="text-xs text-gray-500 mt-1">Total lines evaluated in CSV</p>
            </div>
          </div>

          {/* Skipped Details Table */}
          {report.errors.length > 0 && (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  Skipped Records Breakdown ({report.errors.length})
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Filter reason:</span>
                  <select
                    value={filterReason}
                    onChange={(e) => setFilterReason(e.target.value)}
                    className="text-xs border border-gray-300 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">All reasons</option>
                    <option value="already exists">Already exists (Duplicate)</option>
                    <option value="missing">Missing fields</option>
                    <option value="invalid">Invalid values</option>
                  </select>
                </div>
              </div>

              <div className="border border-gray-200 rounded-md overflow-hidden max-h-96 overflow-y-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-gray-50 border-b border-gray-200 sticky top-0">
                    <tr className="text-gray-600">
                      <th className="px-4 py-2 font-medium w-16">Row #</th>
                      <th className="px-4 py-2 font-medium w-36">Episode ID</th>
                      <th className="px-4 py-2 font-medium">Rejection / Skip Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredErrors.map((err, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="px-4 py-2 font-mono text-gray-500">{err.row}</td>
                        <td className="px-4 py-2 font-mono text-gray-800">
                          {err.episode_id || <span className="text-gray-400 italic">None</span>}
                        </td>
                        <td className="px-4 py-2 text-gray-700">{err.reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

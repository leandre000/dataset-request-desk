import React from 'react';

const statusConfig: Record<string, { bg: string; text: string; dot: string; label: string }> = {
  submitted: { bg: 'bg-blue-50 border-blue-200/80', text: 'text-blue-700', dot: 'bg-blue-500', label: 'SUBMITTED' },
  in_progress: { bg: 'bg-amber-50 border-amber-200/80', text: 'text-amber-700', dot: 'bg-amber-500', label: 'IN PROGRESS' },
  delivered: { bg: 'bg-purple-50 border-purple-200/80', text: 'text-purple-700', dot: 'bg-purple-500', label: 'DELIVERED' },
  accepted: { bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700', dot: 'bg-emerald-500', label: 'ACCEPTED' },
  rejected: { bg: 'bg-rose-50 border-rose-200/80', text: 'text-rose-700', dot: 'bg-rose-500', label: 'REJECTED' },
};

const qualityConfig: Record<string, { bg: string; text: string; dot: string }> = {
  good: { bg: 'bg-emerald-50 border-emerald-200/80', text: 'text-emerald-700', dot: 'bg-emerald-500' },
  usable: { bg: 'bg-amber-50 border-amber-200/80', text: 'text-amber-700', dot: 'bg-amber-500' },
  bad: { bg: 'bg-rose-50 border-rose-200/80', text: 'text-rose-700', dot: 'bg-rose-500' },
};

export function StatusBadge({ status }: { status: string }) {
  const config = statusConfig[status] || {
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
    label: status.toUpperCase(),
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide border ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {config.label}
    </span>
  );
}

export function QualityBadge({ quality }: { quality: string }) {
  const config = qualityConfig[quality] || {
    bg: 'bg-slate-50 border-slate-200',
    text: 'text-slate-700',
    dot: 'bg-slate-400',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase border ${config.bg} ${config.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      {quality}
    </span>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const configs: Record<string, { bg: string; text: string }> = {
    admin: { bg: 'bg-purple-50 border-purple-200', text: 'text-purple-700' },
    operator: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-700' },
    client: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-700' },
  };
  const config = configs[role] || configs.client;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wider uppercase border ${config.bg} ${config.text}`}>
      {role}
    </span>
  );
}

export function ActiveBadge({ active }: { active: boolean }) {
  return active ? (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-50 border-emerald-200 text-emerald-700">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
      ACTIVE
    </span>
  ) : (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-rose-50 border-rose-200 text-rose-700">
      <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
      INACTIVE
    </span>
  );
}

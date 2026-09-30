import React from 'react';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'success' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  loading?: boolean;
}

const variants = {
  primary: 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs focus:ring-indigo-500 font-semibold active:bg-indigo-800',
  secondary: 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-900 focus:ring-indigo-500 font-medium shadow-xs',
  danger: 'bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 font-semibold shadow-xs',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 font-semibold shadow-xs',
  ghost: 'text-slate-600 hover:text-slate-900 hover:bg-slate-100 focus:ring-indigo-500 font-medium',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs',
  md: 'px-4 py-2 text-sm',
  lg: 'px-5 py-2.5 text-base',
};

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  children,
  disabled,
  className = '',
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading && <Loader2 className="animate-spin -ml-1 mr-2 h-4 w-4" />}
      {children}
    </button>
  );
}

/**
 * Komponen UI shared sederhana untuk Sprint 1.
 * Sprint 2+ akan migrasi ke shadcn/ui bila diperlukan.
 */

import { type ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`card p-5 ${className}`}>{children}</div>;
}

export function CardHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="mb-4">
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
    </div>
  );
}

export function Button({
  children,
  variant = "primary",
  type = "button",
  disabled = false,
  onClick,
  className = "",
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "danger";
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  const cls = {
    primary: "btn-primary",
    secondary: "btn-secondary",
    danger: "btn-danger",
  }[variant];
  return (
    <button type={type} disabled={disabled} onClick={onClick} className={`${cls} ${className}`}>
      {children}
    </button>
  );
}

export function Input({
  label,
  id,
  value,
  onChange,
  type = "text",
  placeholder,
  required,
  error,
  hint,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
  error?: string;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="input"
      />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  id,
  value,
  onChange,
  options,
  required,
  hint,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  required?: boolean;
  hint?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {hint && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
    </div>
  );
}

export function Textarea({
  label,
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
  required,
  hint,
  error,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
  placeholder?: string;
  required?: boolean;
  hint?: string;
  error?: string;
}) {
  return (
    <div>
      <label htmlFor={id} className="label">
        {label} {required && <span className="text-rose-600">*</span>}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        placeholder={placeholder}
        required={required}
        className="input"
      />
      {hint && !error && <p className="text-xs text-slate-500 mt-1">{hint}</p>}
      {error && <p className="text-xs text-rose-600 mt-1">{error}</p>}
    </div>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="text-center py-12 px-4">
      <h3 className="text-base font-semibold text-slate-900">{title}</h3>
      {description && <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Badge({
  children,
  variant = "neutral",
}: {
  children: ReactNode;
  variant?: "success" | "warning" | "error" | "neutral";
}) {
  const cls = {
    success: "badge-success",
    warning: "badge-warning",
    error: "badge-error",
    neutral: "badge-neutral",
  }[variant];
  return <span className={cls}>{children}</span>;
}

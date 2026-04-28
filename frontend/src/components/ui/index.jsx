import { clsx } from 'clsx'
import { Loader2 } from 'lucide-react'

// ── Spinner ───────────────────────────────────────────────────────────────
export function Spinner({ size = 16, className }) {
  return <Loader2 size={size} className={clsx('animate-spin', className)} />
}

// ── Button ────────────────────────────────────────────────────────────────
export function Button({
  children, variant = 'primary', size = 'md',
  loading, disabled, className, ...props
}) {
  const variants = {
    primary  : 'btn-primary',
    secondary: 'btn-secondary',
    danger   : 'btn-danger',
    success  : 'btn-success',
    ghost    : 'btn-ghost',
  }
  const sizes = { sm: 'btn-sm', md: '', lg: 'btn-lg' }

  return (
    <button
      className={clsx(variants[variant], sizes[size], className)}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Spinner size={14} /> : null}
      {children}
    </button>
  )
}

// ── Input ─────────────────────────────────────────────────────────────────
export function Input({ label, error, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <input className={clsx('input', error && 'border-red-300 focus:border-red-400 focus:ring-red-500/20', className)} {...props} />
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Select ────────────────────────────────────────────────────────────────
export function Select({ label, error, children, className, ...props }) {
  return (
    <div className="space-y-1.5">
      {label && <label className="label">{label}</label>}
      <select className={clsx('input', className)} {...props}>
        {children}
      </select>
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  )
}

// ── Card ──────────────────────────────────────────────────────────────────
export function Card({ children, className, padding = true, ...props }) {
  return (
    <div className={clsx('card', padding && 'p-6', className)} {...props}>
      {children}
    </div>
  )
}

// ── Badge ─────────────────────────────────────────────────────────────────
export function Badge({ children, variant = 'gray' }) {
  const variants = {
    green: 'badge-green', amber: 'badge-amber',
    red  : 'badge-red',   blue : 'badge-blue', gray: 'badge-gray',
  }
  return <span className={variants[variant]}>{children}</span>
}

// ── Stat Card ─────────────────────────────────────────────────────────────
export function StatCard({ icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue  : 'bg-blue-50   text-blue-600',
    green : 'bg-emerald-50 text-emerald-600',
    amber : 'bg-amber-50  text-amber-600',
    red   : 'bg-red-50    text-red-600',
    purple: 'bg-purple-50 text-purple-600',
    gray  : 'bg-gray-100  text-gray-600',
  }
  return (
    <div className="stat-card">
      <div className={clsx('stat-icon', colors[color])}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-gray-900 tracking-tight">{value}</p>
        <p className="text-sm font-medium text-gray-500">{label}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

// ── Empty state ───────────────────────────────────────────────────────────
export function Empty({ icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="w-14 h-14 bg-gray-100 rounded-2xl flex items-center justify-center mb-4 text-gray-400">
        {icon}
      </div>
      <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
      {description && <p className="text-xs text-gray-400 mt-1 max-w-xs">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}

// ── Modal ─────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-md' }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />
      <div className={clsx(
        'relative w-full bg-white rounded-3xl shadow-modal animate-scale-in overflow-hidden',
        width
      )}>
        <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
          <h2 className="text-base font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-400"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ── Page wrapper ──────────────────────────────────────────────────────────
export function Page({ title, subtitle, actions, children }) {
  return (
    <div className="animate-fade-in">
      {(title || actions) && (
        <div className="flex items-start justify-between mb-8">
          <div>
            {title && <h1 className="page-title">{title}</h1>}
            {subtitle && <p className="page-sub">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2 flex-shrink-0">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}

// ── Table ─────────────────────────────────────────────────────────────────
export function Table({ columns, data, onRow }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            {columns.map((col) => (
              <th
                key={col.key}
                className="px-4 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide"
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {data.map((row, i) => (
            <tr
              key={i}
              onClick={() => onRow?.(row)}
              className={clsx(
                'transition-colors',
                onRow && 'cursor-pointer hover:bg-gray-50'
              )}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3.5 text-gray-700">
                  {col.render ? col.render(row[col.key], row) : row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Pagination ─────────────────────────────────────────────────────────────
export function Pagination({ page, pageSize, total, onPageChange }) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
      <p className="text-sm text-gray-500">
        Showing <span className="font-medium text-gray-700">{from}</span>–<span className="font-medium text-gray-700">{to}</span> of <span className="font-medium text-gray-700">{total}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          type="button"
          onClick={() => onPageChange(page - 1)}
          disabled={page <= 1}
          className="btn-ghost btn-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          Previous
        </button>
        <span className="px-3 py-1 text-sm text-gray-600">
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          onClick={() => onPageChange(page + 1)}
          disabled={page >= totalPages}
          className="btn-ghost btn-sm disabled:opacity-50 disabled:pointer-events-none"
        >
          Next
        </button>
      </div>
    </div>
  )
}
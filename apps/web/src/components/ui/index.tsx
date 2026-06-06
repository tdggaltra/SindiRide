import React from 'react'
import { Loader2 } from 'lucide-react'

// ── Button ─────────────────────────────────────────────────────────────────
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  children,
  className = '',
  disabled,
  ...props
}: ButtonProps) {
  const base = 'inline-flex items-center justify-center gap-2 font-medium rounded-lg transition-all duration-150 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed'

  const variants = {
    primary:   'bg-brand-600 text-white hover:bg-brand-800',
    secondary: 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50',
    danger:    'bg-white text-red-600 border border-red-200 hover:bg-red-50',
    ghost:     'text-gray-600 hover:bg-gray-100',
  }

  const sizes = {
    sm: 'h-8 px-3 text-sm',
    md: 'h-11 px-4 text-sm',
    lg: 'h-12 px-6 text-base',
  }

  return (
    <button
      className={`${base} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : icon}
      {children}
    </button>
  )
}

// ── Input ──────────────────────────────────────────────────────────────────
interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  icon?: React.ReactNode
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, icon, className = '', ...props }, ref) => (
    <div className="flex flex-col gap-1">
      {label && (
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        <input
          ref={ref}
          className={`input-field ${icon ? 'pl-9' : ''} ${error ? 'border-red-400 focus:border-red-400' : ''} ${className}`}
          {...props}
        />
      </div>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </div>
  ),
)
Input.displayName = 'Input'

// ── Badge ──────────────────────────────────────────────────────────────────
type BadgeVariant = 'success' | 'info' | 'warning' | 'danger' | 'gray'

export function Badge({ variant = 'gray', children }: { variant?: BadgeVariant; children: React.ReactNode }) {
  return <span className={`badge-${variant}`}>{children}</span>
}

// ── Spinner ────────────────────────────────────────────────────────────────
export function Spinner({ className = 'w-6 h-6' }: { className?: string }) {
  return <Loader2 className={`animate-spin text-brand-600 ${className}`} />
}

// ── Card ───────────────────────────────────────────────────────────────────
export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`card ${className}`}>{children}</div>
}

// ── RideBadge — badge específico para status de corrida ───────────────────
import { RideStatus } from '@/types'

const rideStatusMap: Record<RideStatus, { label: string; variant: BadgeVariant }> = {
  AGENDADA:     { label: 'Agendada',      variant: 'info' },
  ACEITA:       { label: 'Aceita',        variant: 'info' },
  EM_ANDAMENTO: { label: 'Em andamento',  variant: 'warning' },
  CONCLUIDA:    { label: 'Concluída',     variant: 'success' },
  CANCELADA:    { label: 'Cancelada',     variant: 'danger' },
}

export function RideStatusBadge({ status }: { status: RideStatus }) {
  const { label, variant } = rideStatusMap[status]
  return <Badge variant={variant}>{label}</Badge>
}

export { ErrorBoundary } from './ErrorBoundary'

// ── Pagination ─────────────────────────────────────────────────────────────
export function Pagination({
  page,
  totalPages,
  onPrev,
  onNext,
}: {
  page: number
  totalPages: number
  onPrev: () => void
  onNext: () => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex items-center justify-end gap-2 mt-4">
      <span className="text-xs text-gray-400">
        Página {page} de {totalPages}
      </span>
      <button
        onClick={onPrev}
        disabled={page === 1}
        className="h-7 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Anterior
      </button>
      <button
        onClick={onNext}
        disabled={page === totalPages}
        className="h-7 px-3 rounded-lg border border-gray-200 text-xs text-gray-500 hover:border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        Próxima
      </button>
    </div>
  )
}

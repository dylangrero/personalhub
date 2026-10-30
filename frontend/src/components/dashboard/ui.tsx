import type { ReactNode } from 'react'
import {
  House,
  CircleCheck,
  Layers,
  CalendarDays,
  Plus,
  ArrowRight,
  Search,
  Zap,
  ChevronRight,
  Menu,
  X,
  RefreshCw,
  Clock3,
  Target,
  ExternalLink,
} from 'lucide-react'

const icons = {
  home: House,
  check: CircleCheck,
  layers: Layers,
  calendar: CalendarDays,
  plus: Plus,
  arrow: ArrowRight,
  search: Search,
  bolt: Zap,
  chevron: ChevronRight,
  menu: Menu,
  close: X,
  refresh: RefreshCw,
  clock: Clock3,
  target: Target,
  external: ExternalLink,
}

export type IconName = keyof typeof icons

export function Icon({
  name,
  size = 19,
  className = '',
}: {
  name: IconName
  size?: number
  className?: string
}) {
  const Component = icons[name]
  return (
    <Component
      size={size}
      strokeWidth={1.6}
      aria-hidden="true"
      className={className}
    />
  )
}

export function PanelHeading({
  title,
  icon,
  meta,
  action,
}: {
  title: string
  icon: IconName
  meta?: string
  action?: ReactNode
}) {
  return (
    <div className="panel-heading">
      <div className="heading-title">
        <Icon name={icon} />
        <h2>{title}</h2>
        {meta && <span className="count-label">{meta}</span>}
      </div>
      {action}
    </div>
  )
}

export function SectionState({
  loading,
  error,
  empty,
  children,
}: {
  loading: boolean
  error: string | null
  empty: boolean
  children: ReactNode
}) {
  if (loading)
    return (
      <div role="status" className="skeleton-stack" aria-label="Loading">
        <span />
        <span />
        <span />
        <span className="sr-only">Loading…</span>
      </div>
    )
  if (error && empty)
    return (
      <p role="alert" className="section-message error-message">
        {error}
      </p>
    )
  if (empty) return <div className="section-message">{children}</div>
  return error ? (
    <p role="alert" className="inline-message error-message">
      {error}
    </p>
  ) : null
}

export type DashboardAction = {
  kind: 'task' | 'project' | 'event'
  id?: number
  sequence: number
} | null
export type RefreshToday = () => Promise<boolean>

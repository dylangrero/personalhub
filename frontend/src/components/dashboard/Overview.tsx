import type { Today } from '../../types/today'
import { Icon, PanelHeading, SectionState } from './ui'
import { priorityTasks } from './utils'

type OpenAction = (kind: 'task' | 'project' | 'event', id?: number) => void

export function Welcome({ now }: { now: Date }) {
  const greeting =
    now.getHours() < 12
      ? 'Good morning'
      : now.getHours() < 18
        ? 'Good afternoon'
        : 'Good evening'
  return (
    <section id="today" className="welcome">
      <div>
        <p className="eyebrow">{greeting}</p>
        <h1>
          Hello Dylan<span>,</span>
        </h1>
        <p className="welcome-subtitle">Here’s your day at a glance.</p>
      </div>
      <div className="welcome-note">
        <p>
          A more intentional today
          <br />
          builds a better tomorrow.
        </p>
        <span className="accent-rule" />
      </div>
    </section>
  )
}

export function DailyFocus({
  today,
  loading,
  error,
  onOpen,
}: {
  today: Today | null
  loading: boolean
  error: string | null
  onOpen: OpenAction
}) {
  const task = today
    ? priorityTasks(
        today.overdueTasks,
        today.dueTasks,
        today.highPriorityTasks
      )[0]?.task
    : undefined
  return (
    <section className="panel focus-panel" aria-busy={loading}>
      <div className="focus-eyebrow">
        <Icon name="target" size={14} />
        <span>DAILY FOCUS</span>
        <span className="focus-rule" />
      </div>
      {loading ? (
        <SectionState loading error={null} empty={false}>
          Loading focus
        </SectionState>
      ) : error && !today ? (
        <p role="alert" className="focus-unavailable">
          Your focus will be here when Today is back online.
        </p>
      ) : task ? (
        <>
          <div className="focus-title-row">
            <h2>{task.title}</h2>
            <button
              className="focus-open"
              aria-label={`Manage focus task: ${task.title}`}
              onClick={() => onOpen('task', task.id)}
            >
              <Icon name="arrow" size={21} />
            </button>
          </div>
          <p className="focus-description">
            One clear next step. Give it your attention.
          </p>
          <div className="focus-tags">
            <span className="category-tag">{task.category}</span>
            <span
              className={`priority-badge priority-${task.priority.toLowerCase()}`}
            >
              {task.priority} priority
            </span>
            {task.dueDate && (
              <span className="focus-due">Due {task.dueDate}</span>
            )}
          </div>
        </>
      ) : (
        <>
          <div className="focus-title-row">
            <h2>Choose your next meaningful step.</h2>
            <button
              className="focus-open"
              aria-label="Add a focus task"
              onClick={() => onOpen('task')}
            >
              <Icon name="plus" size={21} />
            </button>
          </div>
          <p className="focus-description">
            A clear day starts with a little intention.
          </p>
          <button className="text-button accent" onClick={() => onOpen('task')}>
            Add your first priority <Icon name="arrow" size={14} />
          </button>
        </>
      )}
      <div className="focus-footer">
        <span className="connection-dot connected" />
        {task ? 'Your next meaningful step' : 'Room for what matters'}
      </div>
    </section>
  )
}

export function Workload({
  today,
  loading,
  error,
}: {
  today: Today | null
  loading: boolean
  error: string | null
}) {
  const counts = [
    today?.summary.overdueTaskCount ?? 0,
    today?.summary.dueTaskCount ?? 0,
    today?.summary.highPriorityTaskCount ?? 0,
  ]
  const total = counts.reduce((sum, count) => sum + count, 0)
  const progress = today?.activeProjects.length
    ? Math.round(
        today.activeProjects.reduce(
          (sum, project) => sum + project.progress,
          0
        ) / today.activeProjects.length
      )
    : 0
  return (
    <section className="panel workload-panel" aria-busy={loading}>
      <p className="tiny-label">
        YOUR MOMENTUM <span>LIVE SNAPSHOT</span>
      </p>
      {loading ? (
        <SectionState loading error={null} empty={false}>
          Loading workload
        </SectionState>
      ) : error && !today ? (
        <p className="section-message">
          Your workload will return when the backend is available.
        </p>
      ) : (
        <>
          <div className="workload-body">
            <div className="workload-visual">
              <div className="workload-number">
                {total}
                <span>priority tasks</span>
              </div>
              <div className="workload-meter" aria-hidden="true">
                {counts.map((count, index) => (
                  <span
                    key={index}
                    className={`meter-segment segment-${index}`}
                    style={{ flex: count }}
                  />
                ))}
              </div>
              <div className="meter-legend">
                <span>
                  <i className="segment-0" />
                  Overdue {counts[0]}
                </span>
                <span>
                  <i className="segment-1" />
                  Today {counts[1]}
                </span>
                <span>
                  <i className="segment-2" />
                  High {counts[2]}
                </span>
              </div>
            </div>
            <div className="workload-stats">
              <div>
                <strong>{today?.summary.eventCount ?? 0}</strong>
                <span>Events today</span>
              </div>
              <div>
                <strong>{today?.summary.activeProjectCount ?? 0}</strong>
                <span>Projects in motion</span>
              </div>
              <div>
                <strong>{progress}%</strong>
                <span>Avg. project progress</span>
              </div>
            </div>
          </div>
        </>
      )}
    </section>
  )
}

export function QuickActions({ onOpen }: { onOpen: OpenAction }) {
  return (
    <section className="panel quick-panel">
      <PanelHeading title="Quick actions" icon="bolt" />
      <div className="quick-grid">
        <button onClick={() => onOpen('task')}>
          <Icon name="plus" size={23} />
          <span>New task</span>
        </button>
        <button onClick={() => onOpen('project')}>
          <Icon name="layers" size={23} />
          <span>New project</span>
        </button>
        <button onClick={() => onOpen('event')}>
          <Icon name="calendar" size={23} />
          <span>Add event</span>
        </button>
        <a
          href="https://calendar.google.com/calendar/u/0/r"
          target="_blank"
          rel="noreferrer"
        >
          <Icon name="external" size={23} />
          <span>Open calendar</span>
        </a>
      </div>
    </section>
  )
}

export function IntentionCard({ small = false }: { small?: boolean }) {
  return (
    <aside className={`panel intention-card ${small ? 'intention-small' : ''}`}>
      {!small && <span className="tiny-label">THE LONG GAME</span>}
      <p>
        {small ? (
          'Progress, not perfection.'
        ) : (
          <>
            Small steps
            <br />
            compound.
          </>
        )}
      </p>
      <span className="accent-rule" />
      {!small && (
        <div className="intention-lines" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
      )}
    </aside>
  )
}

import type { Today } from '../../types/today'
import type { ScheduleEvent } from '../../types/event'
import { Icon, PanelHeading, SectionState } from './ui'
import { eventClock, formatDuration, priorityTasks } from './utils'
import { displayName } from '../../config/profile'

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
          {displayName ? `Hello ${displayName}` : 'Hello'}
          {displayName && <span>,</span>}
        </h1>
        <p className="welcome-subtitle">Here’s your day at a glance.</p>
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
            <h2>No priority task</h2>
            <button
              className="focus-open"
              aria-label="Add a focus task"
              onClick={() => onOpen('task')}
            >
              <Icon name="plus" size={21} />
            </button>
          </div>
          <p className="focus-description">
            Add a task due today or mark one as high priority.
          </p>
          <button className="text-button accent" onClick={() => onOpen('task')}>
            Add a task <Icon name="arrow" size={14} />
          </button>
        </>
      )}
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
        CURRENT WORKLOAD <span>LIVE SNAPSHOT</span>
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

export function NextEvent({
  events,
  now,
  loading,
  error,
}: {
  events: ScheduleEvent[]
  now: Date
  loading: boolean
  error: string | null
}) {
  const nextEvent = events
    .filter(
      (event) =>
        !event.isAllDay && new Date(event.startTime).getTime() > now.getTime()
    )
    .sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    )[0]
  const minutesUntilStart = nextEvent
    ? Math.max(
        1,
        Math.ceil(
          (new Date(nextEvent.startTime).getTime() - now.getTime()) / 60_000
        )
      )
    : 0

  return (
    <aside className="panel next-event-panel" aria-busy={loading}>
      <div className="next-event-heading">
        <Icon name="clock" size={15} />
        <h2 className="tiny-label">UP NEXT</h2>
      </div>
      {loading ? (
        <p role="status" className="next-event-state">
          Loading schedule…
        </p>
      ) : error ? (
        <p className="next-event-state">Schedule unavailable.</p>
      ) : nextEvent ? (
        <>
          <p className="next-event-countdown">
            Starts in {formatDuration(minutesUntilStart)}
          </p>
          <h3>{nextEvent.title}</h3>
          <p className="next-event-time">
            <time dateTime={nextEvent.startTime}>
              {eventClock(nextEvent, 'start')}
            </time>
            –
            <time dateTime={nextEvent.endTime}>
              {eventClock(nextEvent, 'end')}
            </time>
          </p>
          {nextEvent.location && (
            <p className="next-event-location">{nextEvent.location}</p>
          )}
          <span className="source-label">
            {nextEvent.source === 'google' ? 'Google Calendar' : 'Personal Hub'}
          </span>
        </>
      ) : (
        <p className="next-event-state">No more timed events today.</p>
      )}
      <a href="#schedule" className="text-button next-event-link">
        View schedule <Icon name="arrow" size={13} />
      </a>
    </aside>
  )
}

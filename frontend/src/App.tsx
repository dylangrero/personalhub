import { useCallback, useEffect, useState } from 'react'
import { AppShell } from './components/AppShell'
import { Schedule } from './components/dashboard/Schedule'
import { PriorityTasks } from './components/dashboard/PriorityTasks'
import { ActiveProjects } from './components/dashboard/ActiveProjects'
import {
  DailyFocus,
  IntentionCard,
  QuickActions,
  Welcome,
  Workload,
} from './components/dashboard/Overview'
import { Icon, type DashboardAction } from './components/dashboard/ui'
import { localDateKey } from './components/dashboard/utils'
import { fetchToday } from './services/today'
import type { Today } from './types/today'

function App() {
  const [now, setNow] = useState(() => new Date())
  const todayDate = localDateKey(now)
  const [today, setToday] = useState<Today | null>(null)
  const [isTodayLoading, setIsTodayLoading] = useState(true)
  const [todayError, setTodayError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [action, setAction] = useState<DashboardAction>(null)

  // A local clock only: no polling or automatic Google sync.
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60_000)
    return () => window.clearInterval(timer)
  }, [])

  const requestToday = useCallback(() => fetchToday(todayDate), [todayDate])
  const refreshToday = useCallback(async () => {
    try {
      setToday(await requestToday())
      setTodayError(null)
      return true
    } catch {
      setTodayError(
        'Today could not be refreshed. Your last loaded data is still shown.'
      )
      return false
    }
  }, [requestToday])

  useEffect(() => {
    let isCurrent = true
    setIsTodayLoading(true)
    requestToday()
      .then((loaded) => {
        if (isCurrent) {
          setToday(loaded)
          setTodayError(null)
        }
      })
      .catch(() => {
        if (isCurrent)
          setTodayError(
            'Today is unavailable. Check that the backend is running.'
          )
      })
      .finally(() => {
        if (isCurrent) setIsTodayLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [requestToday])

  function openAction(kind: 'task' | 'project' | 'event', id?: number) {
    setSearch('')
    setAction((previous) => ({
      kind,
      id,
      sequence: (previous?.sequence ?? 0) + 1,
    }))
    const section =
      kind === 'task' ? 'tasks' : kind === 'project' ? 'projects' : 'schedule'
    window.location.hash = section
    requestAnimationFrame(() =>
      document.getElementById(section)?.scrollIntoView({ block: 'start' })
    )
  }

  return (
    <AppShell now={now} search={search} onSearch={setSearch}>
      <Welcome now={now} />
      {todayError && (
        <div className="connection-banner" role="alert">
          <Icon name="refresh" size={17} />
          <span>{todayError}</span>
          <button
            className="text-button accent"
            onClick={() => void refreshToday()}
          >
            Try again
          </button>
        </div>
      )}
      {search && (
        <div className="search-summary" role="status">
          Filtering today’s tasks, schedule, and active projects for “{search}”
          <button className="text-button" onClick={() => setSearch('')}>
            Clear
          </button>
        </div>
      )}
      <div className="dashboard-overview">
        <DailyFocus
          today={today}
          loading={isTodayLoading}
          error={todayError}
          onOpen={openAction}
        />
        <Workload today={today} loading={isTodayLoading} error={todayError} />
        <IntentionCard />
      </div>
      <div className="dashboard-main-grid">
        <Schedule
          events={today?.events ?? []}
          todayDate={todayDate}
          isLoading={isTodayLoading}
          loadError={
            todayError
              ? 'The schedule is unavailable. Your saved events are safe; try refreshing Today.'
              : null
          }
          refreshToday={refreshToday}
          action={action}
          now={now}
          search={search}
        />
        <PriorityTasks
          overdueTasks={today?.overdueTasks ?? []}
          dueTasks={today?.dueTasks ?? []}
          highPriorityTasks={today?.highPriorityTasks ?? []}
          todayDate={todayDate}
          isLoading={isTodayLoading}
          loadError={
            todayError
              ? 'Tasks could not be loaded. Try refreshing Today.'
              : null
          }
          refreshToday={refreshToday}
          action={action}
          search={search}
        />
        <div className="dashboard-rail">
          <QuickActions onOpen={openAction} />
          <IntentionCard small />
        </div>
      </div>
      <ActiveProjects
        projects={today?.activeProjects ?? []}
        isLoading={isTodayLoading}
        loadError={
          todayError
            ? 'Projects could not be loaded. Try refreshing Today.'
            : null
        }
        refreshToday={refreshToday}
        action={action}
        search={search}
      />
    </AppShell>
  )
}

export default App

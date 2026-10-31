import { useEffect, useState } from 'react'
import {
  fetchGoogleCalendarStatus,
  googleCalendarConnectUrl,
  syncGoogleCalendar,
  type GoogleCalendarStatus,
} from '../services/googleCalendar'
import { Icon, type RefreshToday } from './dashboard/ui'

export function CalendarConnection({
  refreshToday,
}: {
  refreshToday: RefreshToday
}) {
  const [status, setStatus] = useState<GoogleCalendarStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [feedback, setFeedback] = useState<string | null>(null)

  useEffect(() => {
    let isCurrent = true
    fetchGoogleCalendarStatus()
      .then((loaded) => {
        if (isCurrent) setStatus(loaded)
      })
      .catch(() => {
        if (isCurrent) setError('Calendar status is unavailable.')
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })
    return () => {
      isCurrent = false
    }
  }, [])

  async function syncCalendar() {
    if (isSyncing) return
    setIsSyncing(true)
    setError(null)
    setFeedback(null)
    try {
      const result = await syncGoogleCalendar()
      const refreshed = await refreshToday()
      setFeedback(
        refreshed
          ? `${result.fetched} ${result.fetched === 1 ? 'event' : 'events'} synced`
          : 'Calendar synced. Reload to refresh Today.'
      )
    } catch {
      setError('Calendar could not be synced. Please try again.')
    } finally {
      setIsSyncing(false)
    }
  }

  const connectionLabel = isLoading
    ? 'Checking…'
    : status?.connected
      ? 'Connected'
      : error
        ? 'Unavailable'
        : status?.configured
          ? 'Disconnected'
          : 'Not configured'

  return (
    <section
      className={`sidebar-calendar ${error ? 'calendar-has-error' : ''}`}
      aria-label="Google Calendar connection"
      title={`Google Calendar: ${connectionLabel}`}
      aria-busy={isLoading || isSyncing}
    >
      <div className="calendar-summary">
        <Icon name="calendar" size={17} />
        <div className="calendar-copy">
          <h2>Google Calendar</h2>
          <p>
            <span
              className={
                status?.connected
                  ? 'connection-dot connected'
                  : 'connection-dot'
              }
            />
            {connectionLabel}
          </p>
        </div>
      </div>
      {status?.connected ? (
        <button
          className="button button-small calendar-action"
          aria-label="Sync Google Calendar"
          title={error ?? feedback ?? 'Sync Google Calendar'}
          disabled={isSyncing}
          onClick={() => void syncCalendar()}
        >
          <Icon
            name="refresh"
            size={13}
            className={isSyncing ? 'is-spinning' : ''}
          />
          <span>{isSyncing ? 'Syncing…' : 'Sync calendar'}</span>
        </button>
      ) : status?.configured ? (
        <a
          href={googleCalendarConnectUrl()}
          className="button button-small calendar-action"
          aria-label="Connect Google Calendar"
          title="Connect Google Calendar"
        >
          <Icon name="plus" size={13} />
          <span>Connect</span>
        </a>
      ) : null}
      {feedback && (
        <p role="status" className="calendar-message success-message">
          {feedback}
        </p>
      )}
      {error && (
        <p role="alert" className="calendar-message error-message">
          {error}
        </p>
      )}
    </section>
  )
}

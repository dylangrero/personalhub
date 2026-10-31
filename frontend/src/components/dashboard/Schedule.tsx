import { useEffect, useState } from 'react'
import { EventForm, type EventFormValues } from '../EventForm'
import { createEvent, deleteEvent, updateEvent } from '../../services/events'
import type { LocalScheduleEvent, ScheduleEvent } from '../../types/event'
import {
  Icon,
  PanelHeading,
  SectionState,
  type DashboardAction,
  type RefreshToday,
} from './ui'
import {
  eventClock,
  eventDescriptionText,
  eventDurationMinutes,
  eventTimeInputValue,
  formatDuration,
  localDateKey,
  localDateTime,
} from './utils'

type ScheduleProps = {
  events: ScheduleEvent[]
  todayDate: string
  isLoading: boolean
  loadError: string | null
  refreshToday: RefreshToday
  action: DashboardAction
  now: Date
  search: string
}

export function Schedule({
  events,
  todayDate,
  isLoading,
  loadError,
  refreshToday,
  action,
  now,
  search,
}: ScheduleProps) {
  const [error, setError] = useState<string | null>(null)
  const [editingEventId, setEditingEventId] = useState<number | null>(null)
  const [confirmingDeleteEventId, setConfirmingDeleteEventId] = useState<
    number | null
  >(null)
  const [deletingEventId, setDeletingEventId] = useState<number | null>(null)
  const [isAddingEvent, setIsAddingEvent] = useState(false)

  useEffect(() => {
    if (action?.kind === 'event') {
      setIsAddingEvent(true)
      setEditingEventId(null)
      setConfirmingDeleteEventId(null)
    }
  }, [action])

  const visibleEvents = events.filter((event) =>
    [event.title, event.location, eventDescriptionText(event)]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
      .includes(search.toLowerCase())
  )
  const sectionError = error ?? loadError
  const scheduledMinutes = events.reduce(
    (total, event) => total + eventDurationMinutes(event),
    0
  )

  async function addEvent(values: EventFormValues) {
    setError(null)

    try {
      await createEvent({
        title: values.title,
        description: values.description || null,
        startTime: localDateTime(todayDate, values.startTime),
        endTime: localDateTime(todayDate, values.endTime),
        location: values.location || null,
      })
      setIsAddingEvent(false)
    } catch (requestError) {
      setError(
        'The event could not be created. Check the details and try again.'
      )
      throw requestError
    }

    if (!(await refreshToday())) {
      setError(
        'The event was created, but Today could not be refreshed. Please reload.'
      )
    }
  }

  async function editEvent(event: LocalScheduleEvent, values: EventFormValues) {
    setError(null)
    const eventDate = localDateKey(new Date(event.startTime))

    try {
      await updateEvent(event.id, {
        title: values.title,
        description: values.description || null,
        startTime: localDateTime(eventDate, values.startTime),
        endTime: localDateTime(eventDate, values.endTime),
        location: values.location || null,
      })
      setEditingEventId(null)
    } catch (requestError) {
      setError('The event could not be saved. Check the details and try again.')
      throw requestError
    }

    if (!(await refreshToday())) {
      setError(
        'The event was saved, but Today could not be refreshed. Please reload.'
      )
    }
  }

  async function removeEvent(eventId: number) {
    setDeletingEventId(eventId)
    setError(null)

    try {
      await deleteEvent(eventId)
      setConfirmingDeleteEventId(null)
      if (!(await refreshToday())) {
        setError(
          'The event was deleted, but Today could not be refreshed. Please reload.'
        )
      }
    } catch {
      setError('The event could not be deleted. Please try again.')
    } finally {
      setDeletingEventId(null)
    }
  }

  const nowLabel = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  })
  const timedEvents = visibleEvents.filter((event) => !event.isAllDay)
  // Position the marker between event rows by the same displayed clock times as the timeline.
  const markerIndex = timedEvents.findIndex(
    (event) => eventClock(event, 'start') > nowLabel
  )
  const markerBefore = markerIndex < 0 ? null : timedEvents[markerIndex]
  const showNow =
    todayDate === localDateKey(now) &&
    timedEvents.length > 0 &&
    nowLabel >= eventClock(timedEvents[0], 'start') &&
    timedEvents.some((event) => nowLabel <= eventClock(event, 'end')) &&
    timedEvents.every(
      (event) =>
        eventClock({ ...event, startTime: now.toISOString() }, 'start') ===
        nowLabel
    )

  return (
    <section
      id="schedule"
      aria-busy={isLoading}
      className="panel schedule-panel"
    >
      <PanelHeading
        title="Today’s schedule"
        icon="calendar"
        meta={isLoading ? undefined : String(events.length)}
        action={
          <button
            className="button button-small"
            onClick={() => {
              setIsAddingEvent(!isAddingEvent)
              setEditingEventId(null)
              setConfirmingDeleteEventId(null)
            }}
          >
            <Icon name={isAddingEvent ? 'close' : 'plus'} size={14} />
            {isAddingEvent ? 'Close' : 'Add event'}
          </button>
        }
      />
      {isAddingEvent && (
        <div className="form-surface">
          <EventForm
            submitLabel="Add event"
            onSubmit={addEvent}
            onCancel={() => setIsAddingEvent(false)}
          />
        </div>
      )}
      <SectionState
        loading={isLoading}
        error={sectionError}
        empty={events.length === 0}
      >
        <Icon name="calendar" size={28} />
        <strong>No events today</strong>
        <span>Add an event to today’s schedule.</span>
        <button
          className="text-button accent"
          onClick={() => setIsAddingEvent(true)}
        >
          Add an event <Icon name="arrow" size={14} />
        </button>
      </SectionState>
      {!isLoading && events.length > 0 && visibleEvents.length === 0 && (
        <p className="section-message">No events match your search.</p>
      )}
      {!isLoading && (
        <div className="timeline">
          {visibleEvents.map((event) => {
            const overlaps =
              !event.isAllDay &&
              timedEvents
                .slice(0, timedEvents.indexOf(event))
                .some(
                  (previous) =>
                    eventClock(previous, 'end') > eventClock(event, 'start')
                )
            const isCurrent =
              !event.isAllDay &&
              eventClock(event, 'start') <= nowLabel &&
              eventClock(event, 'end') > nowLabel
            return (
              <div key={`${event.source}:${event.id}`}>
                {showNow && markerBefore === event && (
                  <div className="now-marker">
                    <span />
                    {nowLabel}
                    <small>NOW</small>
                  </div>
                )}
                <article
                  className={`timeline-row ${event.source} ${isCurrent ? 'current-event' : ''}`}
                >
                  <div className="timeline-time">
                    {event.isAllDay ? (
                      <span>All day</span>
                    ) : (
                      <>
                        <time dateTime={event.startTime}>
                          {eventClock(event, 'start')}
                        </time>
                        <time dateTime={event.endTime}>
                          {eventClock(event, 'end')}
                        </time>
                      </>
                    )}
                  </div>
                  <div className="timeline-event">
                    {event.source === 'local' && editingEventId === event.id ? (
                      <EventForm
                        initialValues={{
                          title: event.title,
                          startTime: eventTimeInputValue(event.startTime),
                          endTime: eventTimeInputValue(event.endTime),
                          location: event.location ?? '',
                          description: event.description ?? '',
                        }}
                        submitLabel="Save changes"
                        onSubmit={(values) => editEvent(event, values)}
                        onCancel={() => setEditingEventId(null)}
                      />
                    ) : (
                      <>
                        <div className="event-title-row">
                          <h3>{event.title}</h3>
                          {!event.isAllDay && (
                            <span className="event-duration">
                              {formatDuration(eventDurationMinutes(event))}
                            </span>
                          )}
                        </div>
                        {(event.location || eventDescriptionText(event)) && (
                          <p className="event-description">
                            {[event.location, eventDescriptionText(event)]
                              .filter(Boolean)
                              .join(' · ')}
                          </p>
                        )}
                        <div className="event-bottom">
                          <span className="source-label">
                            {event.source === 'google'
                              ? 'Google · Read only'
                              : 'Personal Hub'}
                            {overlaps ? ' · Overlaps previous event' : ''}
                          </span>
                          {event.source === 'local' && (
                            <div className="row-actions">
                              <button
                                className="text-button"
                                aria-label={`Edit ${event.title}`}
                                onClick={() => {
                                  setIsAddingEvent(false)
                                  setConfirmingDeleteEventId(null)
                                  setEditingEventId(event.id)
                                }}
                              >
                                Edit
                              </button>
                              <button
                                className="text-button danger-hover"
                                aria-label={`Delete ${event.title}`}
                                onClick={() =>
                                  setConfirmingDeleteEventId(event.id)
                                }
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    {event.source === 'local' &&
                      confirmingDeleteEventId === event.id && (
                        <div className="delete-confirmation">
                          <span>Delete this event?</span>
                          <button
                            className="text-button"
                            disabled={deletingEventId === event.id}
                            onClick={() => setConfirmingDeleteEventId(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="text-button danger"
                            disabled={deletingEventId === event.id}
                            onClick={() => void removeEvent(event.id)}
                          >
                            {deletingEventId === event.id
                              ? 'Deleting…'
                              : 'Confirm delete'}
                          </button>
                        </div>
                      )}
                  </div>
                </article>
              </div>
            )
          })}
          {showNow && !markerBefore && (
            <div className="now-marker">
              <span />
              {nowLabel}
              <small>NOW</small>
            </div>
          )}
        </div>
      )}
      {!isLoading && events.length > 0 && (
        <div className="panel-footer">
          <Icon name="clock" size={13} />
          {scheduledMinutes > 0
            ? `${formatDuration(scheduledMinutes)} on the schedule`
            : 'An all-day schedule'}
          <span>Event time zones</span>
        </div>
      )}
    </section>
  )
}

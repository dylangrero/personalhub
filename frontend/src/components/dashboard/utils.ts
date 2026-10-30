import type { ScheduleEvent } from '../../types/event'
import type { Task } from '../../types/task'

export function localDateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function eventClock(event: ScheduleEvent, boundary: 'start' | 'end') {
  const value = new Date(boundary === 'start' ? event.startTime : event.endTime)
  const options: Intl.DateTimeFormatOptions = {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }
  if (event.source === 'google' && event.sourceTimezone)
    options.timeZone = event.sourceTimezone
  try {
    return new Intl.DateTimeFormat('en-GB', options).format(value)
  } catch {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(value)
  }
}

export function eventDescriptionText(event: ScheduleEvent) {
  if (!event.description || event.source === 'local') return event.description
  return (
    new DOMParser()
      .parseFromString(event.description, 'text/html')
      .body.textContent?.trim() || null
  )
}

export function eventDurationMinutes(event: ScheduleEvent) {
  return event.isAllDay
    ? 0
    : Math.max(
        0,
        Math.round(
          (new Date(event.endTime).getTime() -
            new Date(event.startTime).getTime()) /
            60_000
        )
      )
}

export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours === 0
    ? `${rest} min`
    : rest === 0
      ? `${hours}h`
      : `${hours}h ${rest}m`
}

export function eventTimeInputValue(dateTime: string) {
  const date = new Date(dateTime)
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

export function localDateTime(date: string, time: string) {
  return `${date}T${time}:00`
}

export function priorityTasks(overdue: Task[], due: Task[], high: Task[]) {
  const rank = { High: 0, Medium: 1, Low: 2 }
  const compare = (a: Task, b: Task) =>
    (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') ||
    rank[a.priority] - rank[b.priority] ||
    a.id - b.id
  return [
    ...[...overdue].sort(compare).map((task) => ({ task, context: 'Overdue' })),
    ...[...due]
      .sort((a, b) => rank[a.priority] - rank[b.priority] || a.id - b.id)
      .map((task) => ({ task, context: 'Due today' })),
    ...[...high]
      .sort(compare)
      .map((task) => ({ task, context: 'High priority' })),
  ]
}

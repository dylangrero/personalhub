import type { EventApiResponse } from './events'
import { fromApiProject, type ProjectApiResponse } from './projects'
import { fromApiTask, type TaskApiResponse } from './tasks'
import { apiRequest } from './api'
import type { Today } from '../types/today'
import type { ScheduleEvent } from '../types/event'

type TodayLocalEventApiResponse = EventApiResponse & {
  source: 'local'
  is_all_day: false
  source_timezone: null
}

type TodayGoogleEventApiResponse = {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  source: 'google'
  is_all_day: boolean
  source_timezone: string | null
  created_at: null
}

type TodayEventApiResponse = TodayLocalEventApiResponse | TodayGoogleEventApiResponse

type TodayApiResponse = {
  date: string
  events: TodayEventApiResponse[]
  due_tasks: TaskApiResponse[]
  overdue_tasks: TaskApiResponse[]
  high_priority_tasks: TaskApiResponse[]
  active_projects: ProjectApiResponse[]
  summary: {
    event_count: number
    due_task_count: number
    overdue_task_count: number
    high_priority_task_count: number
    active_project_count: number
  }
}

function fromApiTodayEvent(event: TodayEventApiResponse): ScheduleEvent {
  if (event.source === 'google') {
    return {
      id: event.id,
      title: event.title,
      description: event.description,
      startTime: event.start_time,
      endTime: event.end_time,
      location: event.location,
      source: 'google',
      isAllDay: event.is_all_day,
      sourceTimezone: event.source_timezone,
      createdAt: null,
    }
  }

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    source: 'local',
    isAllDay: false,
    sourceTimezone: null,
    createdAt: event.created_at,
  }
}

function fromApiToday(today: TodayApiResponse): Today {
  return {
    date: today.date,
    events: today.events.map(fromApiTodayEvent),
    dueTasks: today.due_tasks.map(fromApiTask),
    overdueTasks: today.overdue_tasks.map(fromApiTask),
    highPriorityTasks: today.high_priority_tasks.map(fromApiTask),
    activeProjects: today.active_projects.map(fromApiProject),
    summary: {
      eventCount: today.summary.event_count,
      dueTaskCount: today.summary.due_task_count,
      overdueTaskCount: today.summary.overdue_task_count,
      highPriorityTaskCount: today.summary.high_priority_task_count,
      activeProjectCount: today.summary.active_project_count,
    },
  }
}

export async function fetchToday(date: string): Promise<Today> {
  const today = await apiRequest<TodayApiResponse>(`/today?date=${encodeURIComponent(date)}`)
  return fromApiToday(today)
}

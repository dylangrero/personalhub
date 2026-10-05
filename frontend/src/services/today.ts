import { fromApiEvent, type EventApiResponse } from './events'
import { fromApiProject, type ProjectApiResponse } from './projects'
import { fromApiTask, type TaskApiResponse } from './tasks'
import { apiRequest } from './api'
import type { Today } from '../types/today'

type TodayApiResponse = {
  date: string
  events: EventApiResponse[]
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

function fromApiToday(today: TodayApiResponse): Today {
  return {
    date: today.date,
    events: today.events.map(fromApiEvent),
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

import type { ScheduleEvent } from './event'
import type { Project } from './project'
import type { Task } from './task'

export interface TodaySummary {
  eventCount: number
  dueTaskCount: number
  overdueTaskCount: number
  highPriorityTaskCount: number
  activeProjectCount: number
}

export interface Today {
  date: string
  events: ScheduleEvent[]
  dueTasks: Task[]
  overdueTasks: Task[]
  highPriorityTasks: Task[]
  activeProjects: Project[]
  summary: TodaySummary
}

export interface Event {
  id: number
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
  createdAt: string
}

export type EventCreate = Omit<Event, 'id' | 'createdAt'>

export type EventUpdate = Partial<EventCreate>

interface ScheduleEventBase {
  title: string
  description: string | null
  startTime: string
  endTime: string
  location: string | null
}

export interface LocalScheduleEvent extends ScheduleEventBase {
  id: number
  source: 'local'
  isAllDay: false
  sourceTimezone: null
  createdAt: string
}

export interface GoogleScheduleEvent extends ScheduleEventBase {
  id: string
  source: 'google'
  isAllDay: boolean
  sourceTimezone: string | null
  createdAt: null
}

export type ScheduleEvent = LocalScheduleEvent | GoogleScheduleEvent

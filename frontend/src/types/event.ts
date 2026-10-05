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

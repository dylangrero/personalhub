import type { Event, EventCreate, EventUpdate } from '../types/event'
import { apiRequest } from './api'

export type EventApiResponse = {
  id: number
  title: string
  description: string | null
  start_time: string
  end_time: string
  location: string | null
  created_at: string
}

type EventApiPayload = {
  title?: string
  description?: string | null
  start_time?: string
  end_time?: string
  location?: string | null
}

export function fromApiEvent(event: EventApiResponse): Event {
  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startTime: event.start_time,
    endTime: event.end_time,
    location: event.location,
    createdAt: event.created_at,
  }
}

function toApiPayload(event: EventCreate | EventUpdate): EventApiPayload {
  return {
    ...(event.title !== undefined && { title: event.title }),
    ...(event.description !== undefined && { description: event.description }),
    ...(event.startTime !== undefined && { start_time: event.startTime }),
    ...(event.endTime !== undefined && { end_time: event.endTime }),
    ...(event.location !== undefined && { location: event.location }),
  }
}

export async function fetchEvents(): Promise<Event[]> {
  const events = await apiRequest<EventApiResponse[]>('/events')
  return events.map(fromApiEvent)
}

export async function createEvent(event: EventCreate): Promise<Event> {
  const createdEvent = await apiRequest<EventApiResponse>('/events', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(event)),
  })

  return fromApiEvent(createdEvent)
}

export async function updateEvent(id: number, updates: EventUpdate): Promise<Event> {
  const updatedEvent = await apiRequest<EventApiResponse>(`/events/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toApiPayload(updates)),
  })

  return fromApiEvent(updatedEvent)
}

export async function deleteEvent(id: number): Promise<void> {
  await apiRequest<{ status: string }>(`/events/${id}`, { method: 'DELETE' })
}

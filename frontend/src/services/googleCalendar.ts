import { apiRequest, apiUrl } from './api'

export interface GoogleCalendarStatus {
  configured: boolean
  connected: boolean
}

export interface GoogleCalendarSyncResult {
  fetched: number
  created: number
  updated: number
  removed: number
  unchanged: number
}

export function fetchGoogleCalendarStatus(): Promise<GoogleCalendarStatus> {
  return apiRequest<GoogleCalendarStatus>('/integrations/google-calendar/status')
}

export function syncGoogleCalendar(): Promise<GoogleCalendarSyncResult> {
  return apiRequest<GoogleCalendarSyncResult>('/integrations/google-calendar/sync', {
    method: 'POST',
  })
}

export function googleCalendarConnectUrl(): string {
  return apiUrl('/integrations/google-calendar/connect')
}

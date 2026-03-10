/**
 * Google Calendar OAuth Integration
 * 
 * This module provides OAuth functionality to connect users' Google Calendar
 * accounts to Trackly, allowing events to be exported to their personal
 * Google Calendar.
 * 
 * SETUP INSTRUCTIONS:
 * 1. Go to Google Cloud Console (https://console.cloud.google.com)
 * 2. Enable Google Calendar API
 * 3. Create OAuth 2.0 credentials
 * 4. Add scope: https://www.googleapis.com/auth/calendar.events
 * 5. Add authorized redirect URI: http://localhost:8080/auth/google/callback
 *    (and later: https://trackly.vercel.app/auth/google/callback)
 * 6. Copy Client ID to VITE_GOOGLE_CLIENT_ID in .env
 */

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID
const SCOPES = 'https://www.googleapis.com/auth/calendar.events'
const REDIRECT_URI = window.location.origin + '/auth/google/callback'

/**
 * Start the Google OAuth flow to connect Google Calendar
 * Uses implicit flow (token in URL hash) - no backend needed
 */
export function connectGoogleCalendar() {
  if (!GOOGLE_CLIENT_ID) {
    console.error('Google Client ID not configured. Add VITE_GOOGLE_CLIENT_ID to .env')
    throw new Error('Google Calendar integration not configured')
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'token',  // implicit flow — no backend needed
    scope: SCOPES,
    prompt: 'consent',
  })
  
  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`
}

/**
 * Handle OAuth callback - extract token from URL hash
 * Call this on /auth/google/callback route
 * @returns access token if successful, null otherwise
 */
export function handleGoogleCallback(): string | null {
  const hash = window.location.hash.substring(1)
  const params = new URLSearchParams(hash)
  const token = params.get('access_token')
  
  if (token) {
    localStorage.setItem('google_calendar_token', token)
    // Save expiry
    const expiresIn = params.get('expires_in')
    const expiry = Date.now() + (parseInt(expiresIn || '3600') * 1000)
    localStorage.setItem('google_calendar_token_expiry', expiry.toString())
  }
  
  return token
}

/**
 * Check if user has connected Google Calendar
 */
export function isGoogleCalendarConnected(): boolean {
  const token = localStorage.getItem('google_calendar_token')
  const expiry = localStorage.getItem('google_calendar_token_expiry')
  if (!token || !expiry) return false
  return Date.now() < parseInt(expiry)
}

/**
 * Disconnect Google Calendar - remove stored tokens
 */
export function disconnectGoogleCalendar() {
  localStorage.removeItem('google_calendar_token')
  localStorage.removeItem('google_calendar_token_expiry')
}

/**
 * Get stored Google Calendar access token
 */
export function getGoogleCalendarToken(): string | null {
  if (!isGoogleCalendarConnected()) return null
  return localStorage.getItem('google_calendar_token')
}

/**
 * Get last sync time from localStorage
 */
export function getLastSyncTime(): Date | null {
  const time = localStorage.getItem('google_calendar_last_sync')
  return time ? new Date(parseInt(time)) : null
}

/**
 * Update last sync time
 */
export function updateLastSyncTime() {
  localStorage.setItem('google_calendar_last_sync', Date.now().toString())
}

/**
 * Create event in user's Google Calendar
 */
export async function createGoogleCalendarEvent(event: {
  title: string
  description: string
  location: string
  startDate: Date
  endDate: Date
}) {
  const token = getGoogleCalendarToken()
  if (!token) throw new Error('Google Calendar not connected')

  const body = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: {
      dateTime: event.startDate.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
    end: {
      dateTime: event.endDate.toISOString(),
      timeZone: 'Asia/Kolkata',
    },
  }

  const response = await fetch(
    'https://www.googleapis.com/calendar/v3/calendars/primary/events',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error?.message || 'Failed to create calendar event')
  }

  // Update last sync time
  updateLastSyncTime()

  return response.json() // returns created event with id
}

/**
 * Update existing Google Calendar event
 */
export async function updateGoogleCalendarEvent(googleEventId: string, event: {
  title: string
  description: string
  location: string
  startDate: Date
  endDate: Date
}) {
  const token = getGoogleCalendarToken()
  if (!token) throw new Error('Google Calendar not connected')

  const body = {
    summary: event.title,
    description: event.description,
    location: event.location,
    start: { dateTime: event.startDate.toISOString(), timeZone: 'Asia/Kolkata' },
    end: { dateTime: event.endDate.toISOString(), timeZone: 'Asia/Kolkata' },
  }

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) throw new Error('Failed to update calendar event')
  
  // Update last sync time
  updateLastSyncTime()
  
  return response.json()
}

/**
 * Delete event from Google Calendar
 */
export async function deleteGoogleCalendarEvent(googleEventId: string) {
  const token = getGoogleCalendarToken()
  if (!token) return

  await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }
  )
}


# Trackly UI Redesign + Google Calendar Integration

## Summary of Changes

### ✅ Part 1: Design System Implementation

#### 1. Created `src/lib/theme.ts`
- Design tokens matching reference UI exactly
- COLORS object with all colors (teal, amber, blue, green, red, grey, purple, orange, pink, etc.)
- CATEGORY_COLORS for event categories
- STATUS_COLORS for event status badges
- ROLE_COLORS for user roles

#### 2. Created Shared UI Components

- **`src/components/ui/CategoryTag.tsx`** - Colored pill using CATEGORY_COLORS
- **`src/components/ui/Avatar.tsx`** - Circular avatar with first letter of name
- **`src/components/StatusBadge.tsx`** - Updated to use theme colors with dot indicator

#### 3. Updated Components

- **`src/components/EventCard.tsx`** - Updated card styling to match reference UI with:
  - Title, StatusBadge, CategoryTag
  - Date, location, assignee count, photo count
  - Description truncation (100 chars)
  - onClick navigates to event detail

- **`src/components/layout/Layout.tsx`** - Fully responsive:
  - Desktop: Fixed sidebar 230px, margin-left, proper padding
  - Mobile: Hidden sidebar, sticky top bar, fixed bottom nav
  - Uses Tailwind md: breakpoint classes

- **`src/components/layout/BottomNav.tsx`** - Updated:
  - 5 tabs: Home, Calendar, Events, Profile, More
  - Active tab: teal color + dot indicator below icon

- **`src/components/GoogleCalendarCard.tsx`** - New component for Dashboard:
  - Connected state: green border, "events sync automatically"
  - Disconnected state: "Connect Google Calendar" blue button

#### 4. Updated Pages

- **`src/pages/Dashboard.tsx`** - Added Google Calendar card
- **`src/index.css`** - Added safe area CSS for Capacitor:
  - `.safe-top` and `.safe-bottom` classes
  - `.touch-scroll` for mobile scrolling

### ✅ Part 2: Google Calendar OAuth Integration

#### 1. Created `src/lib/googleCalendar.ts`
- `connectGoogleCalendar()` - Starts OAuth flow
- `handleGoogleCallback()` - Handles OAuth callback
- `isGoogleCalendarConnected()` - Checks connection status
- `disconnectGoogleCalendar()` - Removes tokens
- `createGoogleCalendarEvent()` - Creates event in Google Calendar
- `updateGoogleCalendarEvent()` - Updates existing event
- `deleteGoogleCalendarEvent()` - Deletes event

#### 2. Created Callback Page

- **`src/pages/GoogleCalendarCallback.tsx`** - OAuth callback handler

#### 3. Updated Routes

- **`src/App.tsx`** - Added `/auth/google/callback` route

#### 4. Environment Configuration

- **`src/.env.example`** - Added Google Client ID configuration template

### ✅ Part 3: Date Handling

The `src/lib/utils.ts` already has the `toDate()` helper that handles:
- Firestore Timestamp
- Unix timestamp (ms)
- Date object
- ISO string

### ✅ Part 4: Capacitor Readiness

- No `window.innerWidth` usage - all responsive via Tailwind CSS breakpoints
- Click handlers use `onClick` not `onMouseOver`
- Touch targets minimum 44px height
- Added `-webkit-overflow-scrolling: touch` via `.touch-scroll` class
- Added safe area CSS for iOS

---

## Files Created

1. `src/lib/theme.ts` - Design tokens
2. `src/lib/googleCalendar.ts` - Google Calendar OAuth
3. `src/components/ui/CategoryTag.tsx` - Category tag component
4. `src/components/ui/Avatar.tsx` - Avatar component
5. `src/components/GoogleCalendarCard.tsx` - Google Calendar connect card
6. `src/pages/GoogleCalendarCallback.tsx` - OAuth callback page
7. `src/.env.example` - Environment template

## Files Modified

1. `src/components/StatusBadge.tsx` - Using theme colors
2. `src/components/EventCard.tsx` - Updated styling
3. `src/components/layout/Layout.tsx` - Responsive layout
4. `src/components/layout/BottomNav.tsx` - 5-tab navigation
5. `src/pages/Dashboard.tsx` - Added Google Calendar card
6. `src/pages/EventDetail.tsx` - Uses client-side Google Calendar export
7. `src/App.tsx` - Added callback route
8. `src/index.css` - Safe area CSS

---

## To Complete Setup

### 1. Google Calendar OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Calendar API**
4. Go to **APIs & Services > Credentials**
5. Create **OAuth 2.0 Client IDs**
6. Add authorized redirect URI:
   - `http://localhost:8080/auth/google/callback`
   - `https://trackly.vercel.app/auth/google/callback` (for production)
7. Add scope: `https://www.googleapis.com/auth/calendar.events`
8. Copy the **Client ID**

### 2. Add to .env

```bash
VITE_GOOGLE_CLIENT_ID=your_client_id_here
```

### 3. Run the app

```bash
npm run dev
```

---

## Usage

### Connect Google Calendar
1. Go to Dashboard
2. Click "Connect" on Google Calendar card
3. Sign in with Google
4. Grant calendar access
5. Events will sync automatically

### Export Event to Google Calendar
1. Go to Event Detail
2. Click "Export to Google Calendar" button
3. Event will appear in your Google Calendar


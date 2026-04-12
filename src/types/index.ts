// Shared TypeScript types for the application

export type UserRole = "admin" | "staff" | "volunteer" | "viewer";

export type EventStatus = "Planned" | "Ongoing" | "Completed" | "Cancelled";

export interface EventPhoto {
  url: string;
  uploadedBy: string;
  uploadedByName?: string;
  caption?: string;
  timestamp: number;
  /** Storage path for deletion from Supabase */
  storagePath?: string;
}

export interface NotificationPrefs {
  email?: boolean;
  push?: boolean;
  onAssignment?: boolean;
  onStatusChange?: boolean;
  reminder24hr?: boolean;
  reminder6hr?: boolean;
  reminder3hr?: boolean;
}

export type EnrollmentType = 'assigned' | 'open' | 'both';
export type JoinRequestStatus = 'pending' | 'approved' | 'rejected';
export type JoinType = 'assigned' | 'enrolled';

export interface JoinRequest {
  uid: string;
  displayName: string;
  photoURL: string;
  requestedAt: number; // Unix timestamp
  status: JoinRequestStatus;
  reviewedBy?: string;
  reviewedAt?: number;
  note?: string;
}

export interface Committee {
  id: string;
  name: string;
  description?: string;
  color: string;
  leadUid?: string;
  memberUids: string[];
  createdAt: number;
}

export interface Attendee {
  uid: string;
  displayName: string;
  photoURL?: string;
  joinedAt: number; // Unix timestamp
  joinType: JoinType;
  committeeId?: string;
  committeeName?: string;
}

export interface FirestoreEvent {
  id: string;
  title: string;
  description: string;
  location: string;
  startDate: number; // Unix timestamp
  endDate: number;
  status: EventStatus;
  createdBy: string;
  assignedTo: string[];
  photos: EventPhoto[];
  category: string;
  tags: string[];
  googleCalendarEventId?: string;
  coverPhotoUrl?: string;
  coverPosition?: string;
  coverZoom?: number;
  committees?: string[]; // committee IDs associated with this event
  // Enrollment fields
  enrollmentType?: EnrollmentType;
  capacity?: number;
  joinRequests?: JoinRequest[];
  attendees?: Attendee[];
  createdAt: number;
  updatedAt: number;
}

export interface FirestoreUser {
  uid: string;
  displayName: string;
  email: string;
  role?: UserRole; // Optional - new users have no role until admin assigns one
  fcmToken?: string;
  fcmTokens?: string[];
  photoURL?: string;
  phone?: string;
  department?: string;
  bio?: string;
  notificationPrefs?: NotificationPrefs;
  lastLoginAt?: number;
  createdAt: number;
  updatedAt?: number;
}

export interface Notification {
  id: string;
  userId: string;
  title: string;
  body: string;
  eventId?: string;
  read: boolean;
  createdAt: number;
}

export const EVENT_CATEGORIES = [
  "Workshop",
  "Seminar",
  "Training",
  "Community Outreach",
  "Fundraiser",
  "Meeting",
  "Field Trip",
  "Cultural",
  "Sports",
  "Other",
] as const;

// ─────────────────────────────────────────────────────────────
// Telemedicine Portal — Domain Model
//
// Conventions
//   ISODateString : ISO 8601 UTC, e.g. "2025-03-14T09:30:00.000Z"
//   IDs           : opaque strings in transit; branded at the edge if needed
//   Enums         : string unions, never TS `enum`
//   Optionality   : use `field?: T` only when the server may omit it entirely;
//                   use `field: T | null` when the server returns null explicitly
// ─────────────────────────────────────────────────────────────

export type ISODateString = string;
export type UUID = string;

// ── Envelopes ────────────────────────────────────────────────

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  hasNext: boolean;
}

export interface ApiErrorBody {
  code: string;                        // "NOT_FOUND" | "VALIDATION" | "UNAUTHORIZED" | ...
  message: string;
  fieldErrors?: Record<string, string[]>;
}

// ── Patient ──────────────────────────────────────────────────

export interface Patient {
  id: UUID;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: ISODateString;
  avatarUrl?: string;
  insuranceProvider?: string;
  insuranceMemberId?: string;
}

// ── Provider ─────────────────────────────────────────────────

export interface Specialty {
  id: UUID;
  name: string;                        // "Cardiology"
  slug: string;                        // "cardiology"
  icon: string;                        // lucide icon name, e.g. "HeartPulse"
}

export type ConsultationType = 'video' | 'phone' | 'async';

export interface Provider {
  id: UUID;
  firstName: string;
  lastName: string;
  title: string;                       // "Dr."
  specialtyIds: UUID[];
  bio: string;
  avatarUrl: string;
  yearsExperience: number;
  rating: number;                      // 0–5
  reviewCount: number;
  languages: string[];                 // ["English", "Spanish"]
  consultationTypes: ConsultationType[];
  nextAvailableAt: ISODateString | null; // null = no availability in the next N days
}

// ── Availability ─────────────────────────────────────────────

export type SlotStatus = 'available' | 'booked' | 'blocked';

export interface AvailabilitySlot {
  id: UUID;
  providerId: UUID;
  start: ISODateString;
  end: ISODateString;
  status: SlotStatus;
}

// ── Appointment ──────────────────────────────────────────────
//
// Lifecycle:
//     scheduled ──► completed
//          │
//          ├──► cancelled   (cancelledAt, cancelReason set)
//          └──► no_show
//
export type AppointmentStatus =
  | 'scheduled'
  | 'completed'
  | 'cancelled'
  | 'no_show';

export interface Appointment {
  id: UUID;
  patientId: UUID;
  providerId: UUID;
  slotId: UUID;
  consultationType: ConsultationType;
  status: AppointmentStatus;
  reason: string;                      // patient-stated reason
  notes?: string;                      // provider notes, post-visit
  scheduledAt: ISODateString;          // denormalized from slot.start
  durationMinutes: number;
  createdAt: ISODateString;
  cancelledAt?: ISODateString;
  cancelReason?: string;
}

// ── Documents ────────────────────────────────────────────────

export type DocumentStatus = 'queued' | 'uploading' | 'uploaded' | 'failed';

export interface Document {
  id: UUID;
  patientId: UUID;
  appointmentId?: UUID;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  status: DocumentStatus;
  uploadedAt: ISODateString | null;
  failureReason?: string;
}

/**
 * Client-only. Tracks a file through the upload queue.
 * Lives in Context + Reducer — never in TanStack Query.
 * Holds the File reference so retry can re-attempt without re-selection.
 */
export interface UploadTask {
  id: UUID;                            // locally generated
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  progress: number;                    // 0–100
  status: DocumentStatus;
  documentId?: UUID;                   // set on success
  failureReason?: string;
  file: File;
}

// ── Chat ─────────────────────────────────────────────────────
//
// Message lifecycle:
//     sending ──► sent ──► delivered ──► read
//                    │
//                    └──► failed   (retryable)
//
export type MessageStatus =
  | 'sending'
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed';

export interface Conversation {
  id: UUID;
  patientId: UUID;
  providerId: UUID;
  lastMessageAt: ISODateString;
  lastMessagePreview: string;
  unreadCount: number;
}

export interface ChatMessage {
  id: UUID;
  conversationId: UUID;
  senderId: UUID;                      // patientId or providerId
  senderRole: 'patient' | 'provider';
  body: string;
  sentAt: ISODateString;
  status: MessageStatus;
}

// ── Auth ─────────────────────────────────────────────────────

export interface JwtPayload {
  sub: UUID;                           // patient id
  role: 'patient';
  iat: number;                         // issued-at, seconds
  exp: number;                         // expiry, seconds
}

export interface AuthSession {
  token: string;                       // mock JWT
  expiresAt: ISODateString;
  patient: Patient;
}

// ── Query / Filter Types ─────────────────────────────────────

export interface ProviderFilters {
  q?: string;
  specialty?: string[];                // specialty slugs
  availability?: 'now' | 'today' | 'week' | null;
  consultationType?: ConsultationType | null;
  page?: number;
  pageSize?: number;
}

export interface SlotQuery {
  from: ISODateString;
  to: ISODateString;
}
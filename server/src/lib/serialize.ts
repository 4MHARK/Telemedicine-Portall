// Wire shapes. These mirror src/types/*.ts in the frontend exactly: no extra
// fields, enum values lowercased, every timestamp an ISO 8601 UTC string.

export type ConsultationTypeWire = 'video' | 'phone' | 'async'
export type SlotStatusWire = 'available' | 'booked' | 'blocked'
export type AppointmentStatusWire = 'scheduled' | 'completed' | 'cancelled' | 'no_show'
export type DocumentStatusWire = 'queued' | 'uploading' | 'uploaded' | 'failed'
export type MessageStatusWire = 'sending' | 'sent' | 'delivered' | 'read' | 'failed'
export type SenderRoleWire = 'patient' | 'provider'

interface PatientRow {
  id: string
  email: string
  firstName: string
  lastName: string
  phone: string
  dateOfBirth: Date
  avatarUrl: string | null
  insuranceProvider: string | null
  insuranceMemberId: string | null
}

export interface PatientResponse {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  dateOfBirth: string
  avatarUrl?: string
  insuranceProvider?: string
  insuranceMemberId?: string
}

export function serializePatient(patient: PatientRow): PatientResponse {
  return {
    id: patient.id,
    firstName: patient.firstName,
    lastName: patient.lastName,
    email: patient.email,
    phone: patient.phone,
    dateOfBirth: patient.dateOfBirth.toISOString(),
    ...(patient.avatarUrl ? { avatarUrl: patient.avatarUrl } : {}),
    ...(patient.insuranceProvider ? { insuranceProvider: patient.insuranceProvider } : {}),
    ...(patient.insuranceMemberId ? { insuranceMemberId: patient.insuranceMemberId } : {}),
  }
}

interface SpecialtyRow {
  id: string
  name: string
  slug: string
  icon: string
}

export interface SpecialtyResponse {
  id: string
  name: string
  slug: string
  icon: string
}

export function serializeSpecialty(specialty: SpecialtyRow): SpecialtyResponse {
  return {
    id: specialty.id,
    name: specialty.name,
    slug: specialty.slug,
    icon: specialty.icon,
  }
}

interface ProviderRow {
  id: string
  firstName: string
  lastName: string
  title: string
  bio: string
  avatarUrl: string
  yearsExperience: number
  rating: number
  reviewCount: number
  languages: readonly string[]
  consultationTypes: readonly string[]
}

export interface ProviderResponse {
  id: string
  firstName: string
  lastName: string
  title: string
  specialtyIds: string[]
  bio: string
  avatarUrl: string
  yearsExperience: number
  rating: number
  reviewCount: number
  languages: string[]
  consultationTypes: ConsultationTypeWire[]
  nextAvailableAt: string | null
}

export function serializeProvider(
  provider: ProviderRow,
  specialtyIds: string[],
  nextAvailableAt: Date | null,
): ProviderResponse {
  return {
    id: provider.id,
    firstName: provider.firstName,
    lastName: provider.lastName,
    title: provider.title,
    specialtyIds,
    bio: provider.bio,
    avatarUrl: provider.avatarUrl,
    yearsExperience: provider.yearsExperience,
    rating: provider.rating,
    reviewCount: provider.reviewCount,
    languages: [...provider.languages],
    consultationTypes: provider.consultationTypes.map(
      (type) => type.toLowerCase() as ConsultationTypeWire,
    ),
    nextAvailableAt: nextAvailableAt ? nextAvailableAt.toISOString() : null,
  }
}

interface SlotRow {
  id: string
  providerId: string
  start: Date
  end: Date
  status: string
}

export interface SlotResponse {
  id: string
  providerId: string
  start: string
  end: string
  status: SlotStatusWire
}

export function serializeSlot(slot: SlotRow): SlotResponse {
  return {
    id: slot.id,
    providerId: slot.providerId,
    start: slot.start.toISOString(),
    end: slot.end.toISOString(),
    status: slot.status.toLowerCase() as SlotStatusWire,
  }
}

interface AppointmentRow {
  id: string
  patientId: string
  providerId: string
  slotId: string
  consultationType: string
  status: string
  reason: string
  notes: string | null
  scheduledAt: Date
  durationMinutes: number
  createdAt: Date
  cancelledAt: Date | null
  cancelReason: string | null
}

export interface AppointmentResponse {
  id: string
  patientId: string
  providerId: string
  slotId: string
  consultationType: ConsultationTypeWire
  status: AppointmentStatusWire
  reason: string
  notes?: string
  scheduledAt: string
  durationMinutes: number
  createdAt: string
  cancelledAt?: string
  cancelReason?: string
}

export function serializeAppointment(appointment: AppointmentRow): AppointmentResponse {
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    providerId: appointment.providerId,
    slotId: appointment.slotId,
    consultationType: appointment.consultationType.toLowerCase() as ConsultationTypeWire,
    status: appointment.status.toLowerCase() as AppointmentStatusWire,
    reason: appointment.reason,
    ...(appointment.notes ? { notes: appointment.notes } : {}),
    scheduledAt: appointment.scheduledAt.toISOString(),
    durationMinutes: appointment.durationMinutes,
    createdAt: appointment.createdAt.toISOString(),
    ...(appointment.cancelledAt ? { cancelledAt: appointment.cancelledAt.toISOString() } : {}),
    ...(appointment.cancelReason ? { cancelReason: appointment.cancelReason } : {}),
  }
}

interface DocumentRow {
  id: string
  patientId: string
  appointmentId: string | null
  fileName: string
  mimeType: string
  sizeBytes: number
  status: string
  uploadedAt: Date | null
  failureReason: string | null
}

export interface DocumentResponse {
  id: string
  patientId: string
  appointmentId?: string
  fileName: string
  mimeType: string
  sizeBytes: number
  status: DocumentStatusWire
  uploadedAt: string | null
  failureReason?: string
}

export function serializeDocument(document: DocumentRow): DocumentResponse {
  return {
    id: document.id,
    patientId: document.patientId,
    ...(document.appointmentId ? { appointmentId: document.appointmentId } : {}),
    fileName: document.fileName,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    status: document.status.toLowerCase() as DocumentStatusWire,
    uploadedAt: document.uploadedAt ? document.uploadedAt.toISOString() : null,
    ...(document.failureReason ? { failureReason: document.failureReason } : {}),
  }
}

interface ConversationRow {
  id: string
  patientId: string
  providerId: string
  lastMessageAt: Date
  lastMessagePreview: string
  unreadCount: number
}

export interface ConversationResponse {
  id: string
  patientId: string
  providerId: string
  lastMessageAt: string
  lastMessagePreview: string
  unreadCount: number
}

export function serializeConversation(conversation: ConversationRow): ConversationResponse {
  return {
    id: conversation.id,
    patientId: conversation.patientId,
    providerId: conversation.providerId,
    lastMessageAt: conversation.lastMessageAt.toISOString(),
    lastMessagePreview: conversation.lastMessagePreview,
    unreadCount: conversation.unreadCount,
  }
}

interface ChatMessageRow {
  id: string
  conversationId: string
  senderId: string
  senderRole: string
  body: string
  sentAt: Date
  status: string
}

export interface ChatMessageResponse {
  id: string
  conversationId: string
  senderId: string
  senderRole: SenderRoleWire
  body: string
  sentAt: string
  status: MessageStatusWire
}

export function serializeChatMessage(message: ChatMessageRow): ChatMessageResponse {
  return {
    id: message.id,
    conversationId: message.conversationId,
    senderId: message.senderId,
    senderRole: message.senderRole.toLowerCase() as SenderRoleWire,
    body: message.body,
    sentAt: message.sentAt.toISOString(),
    status: message.status.toLowerCase() as MessageStatusWire,
  }
}

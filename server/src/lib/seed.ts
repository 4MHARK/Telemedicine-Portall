import type {
  AppointmentStatus,
  ConsultationType,
  DocumentStatus,
  MessageStatus,
  SenderRole,
  SlotStatus,
} from '@prisma/client'

import { hashPassword } from './password.js'
import { prisma } from './prisma.js'
import { generateSeedData } from './seed-data.js'

export const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? 'demo-password-2026'

export interface SeedSummary {
  specialties: number
  providers: number
  slots: number
  patients: number
  appointments: number
  documents: number
  conversations: number
  messages: number
}

function upper<T extends string>(value: string): T {
  return value.toUpperCase() as T
}

/**
 * Wipes and recreates the demo data in one transaction. Calling it twice is
 * safe: the second call starts from the same deterministic generator, so the
 * IDs and records are identical (only the date-relative timestamps move).
 */
export async function seedDatabase(): Promise<SeedSummary> {
  const data = generateSeedData()
  const passwordHashes = await Promise.all(data.patients.map(() => hashPassword(DEMO_PASSWORD)))

  await prisma.$transaction(
    async (tx) => {
      // Children first: the foreign keys are restrictive where history matters.
      await tx.chatMessage.deleteMany()
      await tx.conversation.deleteMany()
      await tx.document.deleteMany()
      await tx.appointment.deleteMany()
      await tx.availabilitySlot.deleteMany()
      await tx.providerSpecialty.deleteMany()
      await tx.provider.deleteMany()
      await tx.patient.deleteMany()
      await tx.specialty.deleteMany()

      await tx.specialty.createMany({ data: data.specialties })

      await tx.provider.createMany({
        data: data.providers.map((provider) => ({
          id: provider.id,
          firstName: provider.firstName,
          lastName: provider.lastName,
          title: provider.title,
          bio: provider.bio,
          avatarUrl: provider.avatarUrl,
          yearsExperience: provider.yearsExperience,
          rating: provider.rating,
          reviewCount: provider.reviewCount,
          languages: provider.languages,
          consultationTypes: provider.consultationTypes.map((type) =>
            upper<ConsultationType>(type),
          ),
        })),
      })

      await tx.providerSpecialty.createMany({
        data: data.providers.flatMap((provider) =>
          provider.specialtyIds.map((specialtyId) => ({
            providerId: provider.id,
            specialtyId,
          })),
        ),
      })

      await tx.availabilitySlot.createMany({
        data: data.slots.map((slot) => ({
          id: slot.id,
          providerId: slot.providerId,
          start: slot.start,
          end: slot.end,
          status: upper<SlotStatus>(slot.status),
        })),
      })

      await tx.patient.createMany({
        data: data.patients.map((patient, index) => ({
          id: patient.id,
          email: patient.email,
          passwordHash: passwordHashes[index] ?? '',
          firstName: patient.firstName,
          lastName: patient.lastName,
          phone: patient.phone,
          dateOfBirth: patient.dateOfBirth,
          avatarUrl: patient.avatarUrl,
          insuranceProvider: patient.insuranceProvider,
          insuranceMemberId: patient.insuranceMemberId,
        })),
      })

      await tx.appointment.createMany({
        data: data.appointments.map((appointment) => ({
          id: appointment.id,
          patientId: appointment.patientId,
          providerId: appointment.providerId,
          slotId: appointment.slotId,
          consultationType: upper<ConsultationType>(appointment.consultationType),
          status: upper<AppointmentStatus>(appointment.status),
          reason: appointment.reason,
          notes: appointment.notes ?? null,
          scheduledAt: appointment.scheduledAt,
          durationMinutes: appointment.durationMinutes,
          createdAt: appointment.createdAt,
          cancelledAt: appointment.cancelledAt ?? null,
          cancelReason: appointment.cancelReason ?? null,
        })),
      })

      await tx.document.createMany({
        data: data.documents.map((document) => ({
          id: document.id,
          patientId: document.patientId,
          appointmentId: document.appointmentId ?? null,
          fileName: document.fileName,
          mimeType: document.mimeType,
          sizeBytes: document.sizeBytes,
          status: upper<DocumentStatus>(document.status),
          uploadedAt: document.uploadedAt,
          failureReason: document.failureReason ?? null,
          data: null,
        })),
      })

      await tx.conversation.createMany({
        data: data.conversations.map((conversation) => ({
          id: conversation.id,
          patientId: conversation.patientId,
          providerId: conversation.providerId,
          lastMessageAt: conversation.lastMessageAt,
          lastMessagePreview: conversation.lastMessagePreview,
          unreadCount: conversation.unreadCount,
        })),
      })

      await tx.chatMessage.createMany({
        data: data.messages.map((message) => ({
          id: message.id,
          conversationId: message.conversationId,
          senderId: message.senderId,
          senderRole: upper<SenderRole>(message.senderRole),
          body: message.body,
          sentAt: message.sentAt,
          status: upper<MessageStatus>(message.status),
        })),
      })
    },
    { timeout: 60_000 },
  )

  return {
    specialties: data.specialties.length,
    providers: data.providers.length,
    slots: data.slots.length,
    patients: data.patients.length,
    appointments: data.appointments.length,
    documents: data.documents.length,
    conversations: data.conversations.length,
    messages: data.messages.length,
  }
}

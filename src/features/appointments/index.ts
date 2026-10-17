export { AppointmentStatusBadge } from './status-badge'
export { default as AppointmentDetailPage } from './AppointmentDetailPage'
export { default as AppointmentsPage } from './AppointmentsPage'
export { cancelAppointment, createAppointment, fetchAppointment, fetchAppointments } from './api'
export type { CreateAppointmentInput } from './api'
export {
  useAppointment,
  useAppointments,
  useCancelAppointment,
  useCreateAppointment,
} from './queries'

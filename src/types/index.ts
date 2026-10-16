// Re-exports the whole domain model. Import from '@/types'.
//
// Entity types are hand-written here rather than inferred from zod
// (docs/decisions.md row 2): entities and form shapes differ — the wizard
// carries `slotId`, the entity carries a nested `slot`.

export type * from './appointment'
export type * from './auth'
export type * from './chat'
export type * from './common'
export type * from './document'
export type * from './provider'

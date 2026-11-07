declare module '@paystack/inline-js' {
  export interface PaystackTransaction {
    reference?: string
  }

  export interface PaystackCallbacks {
    onSuccess?: (transaction: PaystackTransaction) => void
    onCancel?: () => void
    onError?: (error: unknown) => void
  }

  export default class PaystackPop {
    checkout(
      options: PaystackCallbacks & {
        accessCode?: string
        key?: string
        email?: string
        amount?: number
        reference?: string
      },
    ): void
    resumeTransaction(accessCode: string, callbacks?: PaystackCallbacks): void
  }
}

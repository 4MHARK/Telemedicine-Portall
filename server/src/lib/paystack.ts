import { createHmac, timingSafeEqual } from 'node:crypto'

import { AppError } from './http.js'

const PAYSTACK_BASE_URL = 'https://api.paystack.co'
const REQUEST_TIMEOUT_MS = 15_000

export interface InitializeInput {
  email: string
  amountMinor: number
  currency: string
  reference: string
  metadata?: Record<string, unknown>
}

export interface InitializeResult {
  accessCode: string
  authorizationUrl: string
  reference: string
}

export interface VerifyResult {
  status: string
  amountMinor: number
  currency: string
  providerReference: string
}

export interface RefundResult {
  status: string
  providerReference?: string
}

export interface PaystackProvider {
  initialize(input: InitializeInput): Promise<InitializeResult>
  verify(reference: string): Promise<VerifyResult>
  verifyWebhook(rawBody: Buffer | string, signature: string | undefined): boolean
  refund(input: { reference: string; amountMinor: number }): Promise<RefundResult>
}

interface PaystackEnvelope<T> {
  status: boolean
  message?: string
  data?: T
}

interface InitializeData {
  access_code: string
  authorization_url: string
  reference: string
}

interface VerifyData {
  status: string
  amount: number
  currency: string
  id?: number
  reference: string
}

interface RefundData {
  status: string
  id?: number
}

async function readJson<T>(response: Response): Promise<PaystackEnvelope<T>> {
  try {
    return (await response.json()) as PaystackEnvelope<T>
  } catch {
    throw new AppError(
      502,
      'PAYMENT_PROVIDER_ERROR',
      'The payment provider returned an invalid response.',
    )
  }
}

class HttpPaystackProvider implements PaystackProvider {
  constructor(
    private readonly secretKey: string,
    private readonly callbackUrl: string | undefined,
  ) {}

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.secretKey}`,
      'Content-Type': 'application/json',
    }
  }

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/transaction/initialize`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        email: input.email,
        amount: input.amountMinor,
        currency: input.currency,
        reference: input.reference,
        ...(this.callbackUrl ? { callback_url: this.callbackUrl } : {}),
        ...(input.metadata ? { metadata: input.metadata } : {}),
      }),
    })

    const body = await readJson<InitializeData>(response)
    if (!response.ok || !body.status || !body.data) {
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_ERROR',
        body.message ?? 'The payment provider could not start the transaction.',
      )
    }

    return {
      accessCode: body.data.access_code,
      authorizationUrl: body.data.authorization_url,
      reference: body.data.reference,
    }
  }

  async verify(reference: string): Promise<VerifyResult> {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: this.headers(),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      },
    )

    const body = await readJson<VerifyData>(response)
    if (!response.ok || !body.status || !body.data) {
      throw new AppError(
        502,
        'PAYMENT_PROVIDER_ERROR',
        body.message ?? 'The payment provider could not verify the transaction.',
      )
    }

    return {
      status: body.data.status,
      amountMinor: body.data.amount,
      currency: body.data.currency,
      providerReference: String(body.data.id ?? body.data.reference),
    }
  }

  verifyWebhook(rawBody: Buffer | string, signature: string | undefined): boolean {
    if (!signature) return false

    const expected = createHmac('sha512', this.secretKey).update(rawBody).digest('hex')

    const provided = Buffer.from(signature)
    const wanted = Buffer.from(expected)
    if (provided.length !== wanted.length) return false
    return timingSafeEqual(provided, wanted)
  }

  async refund(input: { reference: string; amountMinor: number }): Promise<RefundResult> {
    const response = await fetch(`${PAYSTACK_BASE_URL}/refund`, {
      method: 'POST',
      headers: this.headers(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      body: JSON.stringify({
        transaction: input.reference,
        amount: input.amountMinor,
      }),
    })

    const body = await readJson<RefundData>(response)
    if (!response.ok || !body.status || !body.data) {
      return { status: 'failed' }
    }

    return {
      status: body.data.status,
      ...(body.data.id ? { providerReference: String(body.data.id) } : {}),
    }
  }
}

/**
 * Test-only provider. It records the amount at initialize time so verify can
 * enforce the same amount/currency checks as the real API.
 */
class FakePaystackProvider implements PaystackProvider {
  private readonly transactions = new Map<string, { amountMinor: number; currency: string }>()

  async initialize(input: InitializeInput): Promise<InitializeResult> {
    this.transactions.set(input.reference, {
      amountMinor: input.amountMinor,
      currency: input.currency,
    })

    return {
      accessCode: `fake_${input.reference}`,
      authorizationUrl: `https://fake.paystack.local/${input.reference}`,
      reference: input.reference,
    }
  }

  async verify(reference: string): Promise<VerifyResult> {
    const transaction = this.transactions.get(reference)
    if (!transaction) {
      return {
        status: 'failed',
        amountMinor: 0,
        currency: 'NGN',
        providerReference: `fake_${reference}`,
      }
    }

    return {
      status: 'success',
      amountMinor: transaction.amountMinor,
      currency: transaction.currency,
      providerReference: `fake_${reference}`,
    }
  }

  verifyWebhook(_rawBody: Buffer | string, signature: string | undefined): boolean {
    return signature === 'fake-signature'
  }

  async refund(input: { reference: string; amountMinor: number }): Promise<RefundResult> {
    return { status: 'processed', providerReference: `fake_refund_${input.reference}` }
  }
}

let provider: PaystackProvider | null = null

export function createPaystackProvider(): PaystackProvider {
  if (provider) return provider

  if (process.env.PAYSTACK_FAKE === 'true') {
    provider = new FakePaystackProvider()
    return provider
  }

  const secretKey = process.env.PAYSTACK_SECRET_KEY
  if (!secretKey) {
    throw new Error('PAYSTACK_SECRET_KEY is not set. Add a Paystack test secret key.')
  }

  provider = new HttpPaystackProvider(secretKey, process.env.PAYSTACK_CALLBACK_URL)
  return provider
}

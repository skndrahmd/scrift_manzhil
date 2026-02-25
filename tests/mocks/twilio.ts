/**
 * Mock Twilio client for testing
 * Records all message sends instead of actually calling Twilio API
 */
import { vi } from 'vitest'

export interface SentMessage {
  to: string
  contentSid?: string
  contentVariables?: Record<string, string>
  body?: string
  timestamp: Date
}

const sentMessages: SentMessage[] = []

export const mockTwilioClient = {
  messages: {
    create: vi.fn().mockImplementation(async (params: any) => {
      const message: SentMessage = {
        to: params.to,
        contentSid: params.contentSid,
        contentVariables: params.contentVariables,
        body: params.body,
        timestamp: new Date(),
      }
      sentMessages.push(message)
      return { sid: `SM${Date.now()}`, status: 'queued' }
    }),
  },
}

export function getSentMessages(): SentMessage[] {
  return [...sentMessages]
}

export function clearSentMessages(): void {
  sentMessages.length = 0
}

export function getLastSentMessage(): SentMessage | undefined {
  return sentMessages[sentMessages.length - 1]
}

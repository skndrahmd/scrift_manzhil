/**
 * Tests for ServiceError class from complaint service
 */
import { describe, it, expect } from 'vitest'
import { ServiceError } from '@/lib/services/complaint'

describe('ServiceError', () => {
  it('creates error with message and status', () => {
    const error = new ServiceError('Not found', 404)
    expect(error.message).toBe('Not found')
    expect(error.status).toBe(404)
    expect(error.code).toBeUndefined()
  })

  it('creates error with optional code', () => {
    const error = new ServiceError('Conflict', 409, 'CONCURRENT_MODIFICATION')
    expect(error.message).toBe('Conflict')
    expect(error.status).toBe(409)
    expect(error.code).toBe('CONCURRENT_MODIFICATION')
  })

  it('is an instance of Error', () => {
    const error = new ServiceError('Test', 400)
    expect(error).toBeInstanceOf(Error)
  })

  it('has correct name', () => {
    const error = new ServiceError('Test', 500)
    expect(error.name).toBe('Error')
  })

  it('supports 400 bad request', () => {
    const error = new ServiceError('Invalid request payload', 400)
    expect(error.status).toBe(400)
  })

  it('supports 429 rate limit', () => {
    const error = new ServiceError('Rate limited', 429)
    expect(error.status).toBe(429)
  })
})

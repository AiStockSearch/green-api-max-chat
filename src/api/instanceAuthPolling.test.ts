import { describe, expect, it } from 'vitest'
import {
  resolveAuthPhase,
  shouldContinueStatePolling,
} from './instanceAuthPolling'

describe('resolveAuthPhase', () => {
  it('authorized', () => {
    expect(resolveAuthPhase('authorized')).toBe('authorized')
  })

  it('pendingPassword', () => {
    expect(resolveAuthPhase('pendingPassword')).toBe('pending_password')
  })

  it('notAuthorized -> qr', () => {
    expect(resolveAuthPhase('notAuthorized')).toBe('qr')
  })
})

describe('shouldContinueStatePolling', () => {
  it('продолжает для qr и pending_password', () => {
    expect(shouldContinueStatePolling('qr')).toBe(true)
    expect(shouldContinueStatePolling('pending_password')).toBe(true)
    expect(shouldContinueStatePolling('authorized')).toBe(false)
  })
})

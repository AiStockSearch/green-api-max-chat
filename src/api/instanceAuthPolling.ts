import type { StateInstanceValue } from './instanceState'
import { isInstanceAuthorized } from './instanceState'

export const STATE_POLL_MS = 3000
export const QR_REFRESH_MS = 5000

export type InstanceAuthPhase =
  | 'checking'
  | 'qr'
  | 'pending_password'
  | 'authorized'
  | 'blocked'
  | 'error'

export function resolveAuthPhase(state: StateInstanceValue | null): InstanceAuthPhase {
  if (!state) {
    return 'checking'
  }
  if (isInstanceAuthorized(state)) {
    return 'authorized'
  }
  if (state === 'pendingPassword') {
    return 'pending_password'
  }
  if (state === 'blocked') {
    return 'blocked'
  }
  if (state === 'notAuthorized' || state === 'starting') {
    return 'qr'
  }
  return 'checking'
}

export function shouldContinueStatePolling(phase: InstanceAuthPhase): boolean {
  return phase === 'checking' || phase === 'qr' || phase === 'pending_password'
}

export type StateInstanceValue =
  | 'authorized'
  | 'notAuthorized'
  | 'blocked'
  | 'starting'
  | 'suspended'
  | 'pendingPassword'
  | string

export interface StateInstanceResponse {
  stateInstance?: StateInstanceValue
}

export function parseStateInstance(data: unknown): StateInstanceValue | null {
  if (typeof data !== 'object' || data === null) {
    return null
  }
  const state = (data as StateInstanceResponse).stateInstance
  return typeof state === 'string' ? state : null
}

export function isInstanceAuthorized(state: StateInstanceValue | null): boolean {
  return state === 'authorized'
}

export function isInstanceUnauthorized(state: StateInstanceValue | null): boolean {
  if (!state) {
    return false
  }
  return state !== 'authorized'
}

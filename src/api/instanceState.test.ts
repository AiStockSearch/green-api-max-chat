import { describe, expect, it } from 'vitest'
import { isInstanceAuthorized, isInstanceUnauthorized, parseStateInstance } from './instanceState'

describe('parseStateInstance', () => {
  it('читает stateInstance', () => {
    expect(parseStateInstance({ stateInstance: 'authorized' })).toBe('authorized')
    expect(parseStateInstance({ stateInstance: 'notAuthorized' })).toBe('notAuthorized')
  })
})

describe('authorization helpers', () => {
  it('authorized только для authorized', () => {
    expect(isInstanceAuthorized('authorized')).toBe(true)
    expect(isInstanceAuthorized('notAuthorized')).toBe(false)
    expect(isInstanceUnauthorized('notAuthorized')).toBe(true)
  })
})

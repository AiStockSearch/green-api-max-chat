import { describe, expect, it } from 'vitest'
import {
  partnerCreateInstanceUrl,
  partnerDeleteInstanceAccountUrl,
  partnerGetInstancesUrl,
  partnerMethodUrl,
} from './partnerApi'

const partner = {
  partnerToken: 'gac.test-token',
  partnerApiUrl: 'https://api.green-api.com',
}

describe('partner API URLs', () => {
  it('строит базовый partnerMethodUrl', () => {
    expect(partnerMethodUrl(partner, 'getInstances')).toBe(
      'https://api.green-api.com/partner/getInstances/gac.test-token',
    )
  })

  it('строит getInstances', () => {
    expect(partnerGetInstancesUrl(partner)).toContain('/partner/getInstances/')
  })

  it('строит createInstance', () => {
    expect(partnerCreateInstanceUrl(partner)).toContain('/partner/createInstance/')
  })

  it('строит deleteInstanceAccount', () => {
    expect(partnerDeleteInstanceAccountUrl(partner)).toContain(
      '/partner/deleteInstanceAccount/',
    )
  })
})

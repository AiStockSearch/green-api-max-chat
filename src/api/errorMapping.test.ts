import { describe, expect, it } from 'vitest'
import {
  canRetryMessage,
  classifyPollError,
  isOutgoingFailed,
  isOutgoingPending,
  mapLoginError,
  pollErrorBannerText,
} from './errorMapping'
import { GreenApiError } from './types'

describe('mapLoginError', () => {
  it('мапит 401 на поля idInstance и apiTokenInstance', () => {
    const res = mapLoginError(new GreenApiError('Unauthorized', 401))
    expect(res.idInstance).toBeTruthy()
    expect(res.apiTokenInstance).toBeTruthy()
    expect(res.banner).toContain('idInstance')
  })
})

describe('classifyPollError', () => {
  it('распознаёт CORS', () => {
    expect(classifyPollError('CORS preflight request blocked')).toBe('cors')
  })

  it('распознаёт сеть', () => {
    expect(classifyPollError('Сетевая ошибка. Проверьте интернет')).toBe('network')
  })
})

describe('pollErrorBannerText', () => {
  it('добавляет таймер повтора', () => {
    expect(pollErrorBannerText('cors', 3)).toContain('3 сек')
  })
})

describe('message status helpers', () => {
  it('pending и failed для исходящих', () => {
    expect(isOutgoingPending('sending')).toBe(true)
    expect(isOutgoingFailed('failed')).toBe(true)
    expect(
      canRetryMessage({
        id: '1',
        chatId: '1',
        text: 'x',
        timestamp: 0,
        direction: 'outgoing',
        status: 'failed',
      }),
    ).toBe(true)
  })
})

import { describe, expect, it } from 'vitest'
import { phoneToChatId, resolveChatId } from './chatId'

describe('phoneToChatId', () => {
  it('нормализует номер и добавляет @c.us', () => {
    expect(phoneToChatId('+7 (900) 123-45-67')).toBe('79001234567@c.us')
  })

  it('бросает ошибку для короткого номера', () => {
    expect(() => phoneToChatId('123')).toThrow()
  })
})

describe('resolveChatId', () => {
  it('принимает готовый chatId с суффиксом', () => {
    expect(resolveChatId('79001234567@c.us')).toBe('79001234567@c.us')
  })

  it('принимает числовой MAX chatId', () => {
    expect(resolveChatId('10000000')).toBe('10000000')
  })

  it('преобразует длинный номер в @c.us', () => {
    expect(resolveChatId('79991234567')).toBe('79991234567@c.us')
  })
})

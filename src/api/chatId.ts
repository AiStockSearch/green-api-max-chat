import { PHONE_CHAT_SUFFIX } from './constants'

/** Оставляет только цифры номера. */
export function normalizePhone(raw: string): string {
  return raw.replace(/\D/g, '')
}

/**
 * Формирует chatId для отправки по номеру телефона.
 * Для MAX также допустим числовой chatId без суффикса — пользователь может ввести его напрямую.
 */
export function phoneToChatId(phoneRaw: string): string {
  const digits = normalizePhone(phoneRaw)
  if (!digits) {
    throw new Error('Укажите номер телефона')
  }
  if (digits.length < 10 || digits.length > 15) {
    throw new Error('Номер должен содержать от 10 до 15 цифр')
  }
  return `${digits}${PHONE_CHAT_SUFFIX}`
}

/** Если строка уже похожа на chatId — вернуть как есть, иначе трактовать как телефон. */
export function resolveChatId(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) {
    throw new Error('Укажите номер или chatId')
  }
  if (trimmed.includes('@') || trimmed.startsWith('-')) {
    return trimmed
  }
  if (/^\d+$/.test(trimmed) && trimmed.length >= 5 && trimmed.length <= 15) {
    // Короткий числовой ID MAX (личный чат) или телефон без кода страны
    if (trimmed.length >= 10) {
      return phoneToChatId(trimmed)
    }
    return trimmed
  }
  return phoneToChatId(trimmed)
}

export function chatTitleFromInput(input: string, chatId: string): string {
  const digits = normalizePhone(input)
  if (digits) {
    return `+${digits}`
  }
  return chatId
}

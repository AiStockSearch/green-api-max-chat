import { useNotificationPolling } from '../../hooks/useNotificationPolling'
import type { InstanceProfile, ParsedChatMessage } from '../../api/types'

interface Props {
  profile: InstanceProfile
  onMessage: (profileId: string, message: ParsedChatMessage) => void
  onError: (profileId: string, error: string | null) => void
}

/** Опрос очереди одного инстанса; по компоненту на каждый авторизованный инстанс (параллельно). */
export function InstancePoller({ profile, onMessage, onError }: Props) {
  useNotificationPolling({
    credentials: profile,
    enabled: true,
    onMessage: (m) => {
      onError(profile.id, null)
      onMessage(profile.id, m)
    },
    onError: (e) => onError(profile.id, e),
  })
  return null
}

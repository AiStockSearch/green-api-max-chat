import { Icon } from './Icon'
import sk from './ChatSkeletons.module.css'

export function ChatListSkeleton({ count = 6 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={sk.listItem}>
          <div className={`${sk.skeleton} ${sk.avatar}`} />
          <div className={sk.lines}>
            <div className={`${sk.skeleton} ${sk.lineLg}`} />
            <div className={`${sk.skeleton} ${sk.lineSm}`} />
          </div>
        </li>
      ))}
    </>
  )
}

export function MessagesSkeleton() {
  return (
    <>
      <div className={sk.msgRow}>
        <div className={`${sk.skeleton} ${sk.bubble}`} />
      </div>
      <div className={`${sk.msgRow} ${sk.msgRowOut}`}>
        <div className={`${sk.skeleton} ${sk.bubble}`} />
      </div>
      <div className={sk.msgRow}>
        <div className={`${sk.skeleton} ${sk.bubble}`} />
      </div>
    </>
  )
}

export function SyncBanner() {
  return (
    <div className={sk.syncBanner}>
      <Icon name="progress_activity" />
      Идёт синхронизация сообщений…
    </div>
  )
}

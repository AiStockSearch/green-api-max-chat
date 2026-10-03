import { useState } from 'react'
import { getMessenger, MESSENGERS, MESSENGER_LABELS, type Messenger } from '../../api/messenger'
import type { InstanceProfile } from '../../api/types'
import { instanceStateBadge } from '../../utils/instances'
import { Icon } from '../Icon'
import { SiteFooter } from '../layout/SiteFooter'
import { TopNavBar } from '../layout/TopNavBar'
import { ConfirmDialog } from './ConfirmDialog'
import { MessengerBadge, StateDot } from './MessengerBadge'
import styles from './Instances.module.css'

interface Props {
  profiles: InstanceProfile[]
  states: Record<string, string | null | undefined>
  onRefresh: () => void
  onOpen: (id: string) => void
  onOpenAll: () => void
  onAuthorize: (id: string) => void
  /** GREEN-API Logout; true — успешно */
  onLogoutInstance: (id: string) => Promise<boolean>
  onRemove: (id: string) => void
  onAdd: (messenger: Messenger) => void
}

type Pending = { kind: 'logout' | 'remove'; profile: InstanceProfile } | null

/** Главный экран: карточки инстансов (как в консоли GREEN-API) + «Добавить инстанс». */
export function InstancesDashboard({
  profiles,
  states,
  onRefresh,
  onOpen,
  onOpenAll,
  onAuthorize,
  onLogoutInstance,
  onRemove,
  onAdd,
}: Props) {
  const [pending, setPending] = useState<Pending>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<{ id: string; text: string } | null>(null)
  const authorizedCount = profiles.filter((p) => states[p.id] === 'authorized').length

  const confirm = async () => {
    if (!pending) {
      return
    }
    const { kind, profile } = pending
    if (kind === 'remove') {
      onRemove(profile.id)
      setPending(null)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const ok = await onLogoutInstance(profile.id)
      if (!ok) {
        setError('GREEN-API не подтвердил Logout (isLogout=false)')
        return
      }
      setPending(null)
      setNotice({
        id: profile.id,
        text: `Инстанс «${profile.label}» разлогинен в ${MESSENGER_LABELS[getMessenger(profile)]}. Чтобы снова работать с ним, авторизуйтесь по QR.`,
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Ошибка Logout')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.page} data-ui="instances-dashboard">
      <TopNavBar />
      <main className={styles.main}>
        <div className={styles.headRow}>
          <div>
            <h1 className={styles.title}>Инстансы</h1>
            <p className={styles.sub}>
              WhatsApp, Telegram и MAX через GREEN-API · авторизовано {authorizedCount} из{' '}
              {profiles.length}
            </p>
          </div>
          <div className={styles.headActions}>
            <button
              type="button"
              className={styles.btn}
              onClick={onRefresh}
              data-cy="instances-refresh"
            >
              <Icon name="sync" size="sm" />
              Обновить статусы
            </button>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={onOpenAll}
              disabled={authorizedCount === 0}
              data-cy="instances-open-all"
            >
              <Icon name="forum" size="sm" />
              Все чаты
            </button>
          </div>
        </div>

        {notice && (
          <div className={styles.notice} role="status" data-cy="logout-notice">
            <span>{notice.text}</span>
            <button
              type="button"
              className={styles.btnPrimary}
              onClick={() => onAuthorize(notice.id)}
            >
              <Icon name="qr_code_2" size="sm" />
              Авторизовать по QR
            </button>
          </div>
        )}

        <div className={styles.grid}>
          {profiles.map((p) => {
            const messenger = getMessenger(p)
            const state = states[p.id]
            const badge = instanceStateBadge(state)
            const authorized = state === 'authorized'
            return (
              <article key={p.id} className={styles.card} data-cy={`instance-card-${p.id}`}>
                <div className={styles.cardHead}>
                  <MessengerBadge messenger={messenger} size="lg" />
                  <div style={{ minWidth: 0 }}>
                    <h2 className={styles.cardTitle}>{p.label}</h2>
                    <div className={styles.cardMeta}>
                      {MESSENGER_LABELS[messenger]} · id {p.idInstance}
                    </div>
                  </div>
                </div>
                <span className={`${styles.stateBadge} ${styles[`state_${badge.tone}`]}`}>
                  <StateDot tone={badge.tone} />
                  {badge.label}
                </span>
                <div className={styles.cardMeta}>
                  {p.remember ? 'Запомнен (localStorage)' : 'Только эта вкладка'}
                </div>
                <div className={styles.cardActions}>
                  {authorized ? (
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => onOpen(p.id)}
                      data-cy="instance-open"
                    >
                      <Icon name="chat" size="sm" />
                      Открыть
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={styles.btnPrimary}
                      onClick={() => onAuthorize(p.id)}
                      data-cy="instance-authorize"
                    >
                      <Icon name="qr_code_2" size="sm" />
                      QR / авторизация
                    </button>
                  )}
                  {authorized && (
                    <button
                      type="button"
                      className={styles.btn}
                      onClick={() => {
                        setError(null)
                        setPending({ kind: 'logout', profile: p })
                      }}
                      data-cy="instance-logout"
                    >
                      <Icon name="logout" size="sm" />
                      Выйти из инстанса
                    </button>
                  )}
                  <button
                    type="button"
                    className={styles.btnDanger}
                    onClick={() => {
                      setError(null)
                      setPending({ kind: 'remove', profile: p })
                    }}
                    data-cy="instance-remove"
                  >
                    <Icon name="delete" size="sm" />
                    Убрать из приложения
                  </button>
                </div>
              </article>
            )
          })}

          <article className={`${styles.card} ${styles.addCard}`} data-cy="instance-add-card">
            <h2 className={styles.cardTitle}>Добавить инстанс</h2>
            <p className={styles.empty}>
              Выберите мессенджер — откроется форма с ключами инстанса.
            </p>
            <div className={styles.addChoices}>
              {MESSENGERS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className={styles.addChoice}
                  onClick={() => onAdd(m)}
                  data-cy={`instance-add-${m}`}
                >
                  <MessengerBadge messenger={m} />
                  {MESSENGER_LABELS[m]}
                </button>
              ))}
            </div>
          </article>
        </div>
      </main>
      <SiteFooter />

      <ConfirmDialog
        open={pending?.kind === 'logout'}
        title="Выйти из инстанса?"
        badge={pending ? `ID: #${pending.profile.idInstance}` : undefined}
        icon="logout"
        confirmLabel="Выйти (Logout)"
        busy={busy}
        error={error}
        onCancel={() => setPending(null)}
        onConfirm={() => void confirm()}
        cy="confirm-logout"
      >
        Будет вызван метод <code>Logout</code> GREEN-API: аккаунт{' '}
        {pending ? MESSENGER_LABELS[getMessenger(pending.profile)] : ''} отвяжется от инстанса,
        статус станет «Неавторизован». Профиль останется в приложении — для продолжения работы
        понадобится повторная авторизация по QR.
      </ConfirmDialog>

      <ConfirmDialog
        open={pending?.kind === 'remove'}
        title="Убрать инстанс из приложения?"
        badge={pending ? `ID: #${pending.profile.idInstance}` : undefined}
        icon="delete"
        confirmLabel="Убрать"
        onCancel={() => setPending(null)}
        onConfirm={() => void confirm()}
        cy="confirm-remove"
      >
        Ключи инстанса и его локальные чаты будут удалены только из этого браузера. Запрос к
        GREEN-API не отправляется — инстанс останется авторизованным в мессенджере.
      </ConfirmDialog>
    </div>
  )
}
